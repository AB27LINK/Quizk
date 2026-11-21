/**
 * server/routes/attempts.js
 * Quiz attempts logging, score calculation, points attribution, and review history.
 * Compatible with both local SQLite and remote persistent serverless databases.
 */

const express = require('express');
const { getDatabase } = require('../db.js');
const { optionalAuth, requireAuth } = require('../middleware/auth.js');
const { calculatePoints, calculateAccuracy } = require('../scoring.js');

const router = express.Router();

// POST /api/attempts (Submit completed quiz attempt)
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { quizId, sourceId, difficulty = 'Medium', answers = [], timeTakenSeconds = 0 } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Answers array cannot be empty.' });
    }

    const totalQuestions = answers.length;
    let correctCount = 0;
    for (const ans of answers) {
      if (ans.isCorrect) correctCount++;
    }

    const safeDiff = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';
    const points = calculatePoints(correctCount, safeDiff);
    const accuracy = calculateAccuracy(correctCount, totalQuestions);
    const now = new Date().toISOString();
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (req.user) {
      const db = getDatabase();
      await db.run(
        `INSERT INTO attempts (id, quiz_id, source_id, user_id, difficulty, score, total_questions, time_taken_seconds, points, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [attemptId, quizId || null, sourceId || null, req.user.id, safeDiff, correctCount, totalQuestions, Number(timeTakenSeconds) || 0, points, now]
      );

      for (const ans of answers) {
        await db.run(
          `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option, is_correct)
           VALUES (?, ?, ?, ?, ?)`,
          [`ans_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, attemptId, ans.questionId || null, ans.selectedOption ?? null, ans.isCorrect ? 1 : 0]
        );
      }
    }

    return res.status(201).json({
      attemptId,
      score: correctCount,
      totalQuestions,
      accuracy,
      points,
      difficulty: safeDiff,
      timeTakenSeconds,
      createdAt: now,
      isGuest: !req.user
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/attempts (Filtered attempt history)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { sourceId, difficulty } = req.query;
    const db = getDatabase();

    let query = `
      SELECT a.id, a.quiz_id, a.source_id, a.difficulty, a.score, a.total_questions,
             a.time_taken_seconds, a.points, a.created_at,
             s.title as source_title
      FROM attempts a
      LEFT JOIN sources s ON s.id = a.source_id
      WHERE a.user_id = ?
    `;
    const params = [req.user.id];

    if (sourceId) {
      query += ' AND a.source_id = ?';
      params.push(sourceId);
    }

    if (difficulty && difficulty !== 'All') {
      query += ' AND a.difficulty = ?';
      params.push(difficulty);
    }

    query += ' ORDER BY a.created_at DESC';

    const attempts = await db.all(query, params);
    const formatted = (attempts || []).map((a) => ({
      id: a.id,
      quizId: a.quiz_id,
      sourceId: a.source_id,
      sourceTitle: a.source_title || 'General Notes',
      difficulty: a.difficulty,
      score: a.score,
      totalQuestions: a.total_questions,
      accuracy: calculateAccuracy(a.score, a.total_questions),
      points: a.points,
      timeTakenSeconds: a.time_taken_seconds,
      createdAt: a.created_at
    }));

    return res.json({ attempts: formatted });
  } catch (err) {
    next(err);
  }
});

// GET /api/attempts/:id (Review single attempt with questions)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const attempt = await db.get(
      `SELECT a.*, s.title as source_title
       FROM attempts a
       LEFT JOIN sources s ON s.id = a.source_id
       WHERE a.id = ? AND a.user_id = ?`,
      [id, req.user.id]
    );

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found.' });
    }

    const answers = await db.all(
      `SELECT aa.selected_option, aa.is_correct, q.q, q.options, q.answer, q.explanation
       FROM attempt_answers aa
       LEFT JOIN questions q ON q.id = aa.question_id
       WHERE aa.attempt_id = ?`,
      [id]
    );

    const formattedAnswers = (answers || []).map((ans) => ({
      q: ans.q || 'Question',
      options: ans.options ? (typeof ans.options === 'string' ? JSON.parse(ans.options) : ans.options) : [],
      answer: ans.answer,
      explanation: ans.explanation,
      selectedOption: ans.selected_option,
      isCorrect: Boolean(ans.is_correct)
    }));

    return res.json({
      attempt: {
        id: attempt.id,
        sourceTitle: attempt.source_title || 'General Notes',
        difficulty: attempt.difficulty,
        score: attempt.score,
        totalQuestions: attempt.total_questions,
        accuracy: calculateAccuracy(attempt.score, attempt.total_questions),
        points: attempt.points,
        timeTakenSeconds: attempt.time_taken_seconds,
        createdAt: attempt.created_at,
        answers: formattedAnswers
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
