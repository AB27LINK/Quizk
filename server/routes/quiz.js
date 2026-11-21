/**
 * server/routes/quiz.js
 * Quiz generation endpoint with validation, adaptive difficulty resolution, and rate limiting.
 * Compatible with both local SQLite and remote persistent serverless databases.
 */

const express = require('express');
const { getDatabase } = require('../db.js');
const { optionalAuth } = require('../middleware/auth.js');
const { quizRateLimiter } = require('../middleware/rateLimit.js');
const { generateQuiz } = require('../llm.js');
const { resolveAdaptiveDifficulty } = require('../roadmap.js');

const router = express.Router();

const ALLOWED_COUNTS = new Set([5, 8, 10, 15]);
const ALLOWED_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard', 'Auto']);
const ALLOWED_LANGUAGES = new Set(['English', 'Hindi', 'Same as source']);

// POST /api/quiz
router.post('/', optionalAuth, quizRateLimiter, async (req, res) => {
  try {
    let { sourceId, source, count = 8, difficulty = 'Medium', language = 'English', title } = req.body;

    const db = getDatabase();
    let sourceText = '';
    let resolvedSourceTitle = title || 'Custom Notes';

    if (sourceId) {
      const existing = await db.get('SELECT id, title, content, user_id FROM sources WHERE id = ?', [sourceId]);
      if (!existing) {
        return res.status(404).json({ error: 'Source not found.' });
      }
      sourceText = existing.content;
      resolvedSourceTitle = existing.title;
    } else if (source && typeof source === 'string') {
      sourceText = source.trim();
    } else {
      return res.status(400).json({ error: 'Either source text or a valid sourceId is required.' });
    }

    if (sourceText.length < 200) {
      return res.status(400).json({
        error: `Your notes are too short (${sourceText.length} characters). Please provide at least 200 characters to generate quiz questions.`
      });
    }

    // Input validation & clamping
    const parsedCount = Number(count);
    const validCount = ALLOWED_COUNTS.has(parsedCount) ? parsedCount : 8;
    const validDifficulty = ALLOWED_DIFFICULTIES.has(difficulty) ? difficulty : 'Medium';
    const validLanguage = ALLOWED_LANGUAGES.has(language) ? language : 'English';

    // Resolve adaptive difficulty if "Auto"
    let effectiveDifficulty = validDifficulty;
    if (validDifficulty === 'Auto') {
      if (sourceId) {
        const recentAttempts = await db.all(
          'SELECT score, total_questions, difficulty FROM attempts WHERE source_id = ? ORDER BY created_at DESC LIMIT 2',
          [sourceId]
        );
        effectiveDifficulty = resolveAdaptiveDifficulty(recentAttempts || []);
      } else {
        effectiveDifficulty = 'Medium';
      }
    }

    // Call isolated LLM generator
    const quizResult = await generateQuiz({
      source: sourceText,
      count: validCount,
      difficulty: effectiveDifficulty,
      language: validLanguage
    });

    const now = new Date().toISOString();
    const quizId = `qiz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = req.user?.id || 'guest_user';

    // Auto-create source if user is authenticated and provided new raw text
    let targetSourceId = sourceId;
    if (!targetSourceId && req.user) {
      targetSourceId = `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      resolvedSourceTitle = title?.trim() || sourceText.slice(0, 40).replace(/[\n\r]+/g, ' ') + '...';
      await db.run(
        'INSERT INTO sources (id, user_id, title, content, char_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [targetSourceId, req.user.id, resolvedSourceTitle, sourceText, sourceText.length, now]
      );
    }

    // Save quiz record
    if (targetSourceId) {
      await db.run(
        `INSERT INTO quizzes (id, source_id, user_id, difficulty, effective_difficulty, language, question_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [quizId, targetSourceId, userId, validDifficulty, effectiveDifficulty, validLanguage, quizResult.questions.length, now]
      );

      // Save questions
      for (let idx = 0; idx < quizResult.questions.length; idx++) {
        const q = quizResult.questions[idx];
        const qId = `qst_${quizId}_${idx}`;
        await db.run(
          `INSERT INTO questions (id, quiz_id, q, options, answer, explanation, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [qId, quizId, q.q, JSON.stringify(q.options), q.answer, q.explanation, idx]
        );
        q.id = qId;
      }
    } else {
      // Guest mode ephemeral IDs
      quizResult.questions.forEach((q, idx) => {
        q.id = `guest_q_${idx}`;
      });
    }

    return res.json({
      quizId,
      sourceId: targetSourceId || null,
      sourceTitle: resolvedSourceTitle,
      sourceText,
      requestedDifficulty: validDifficulty,
      effectiveDifficulty,
      language: validLanguage,
      count: quizResult.questions.length,
      questions: quizResult.questions
    });
  } catch (err) {
    console.error('[API Quiz Error]', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'An error occurred while generating the quiz. Please try again.'
    });
  }
});

module.exports = router;
