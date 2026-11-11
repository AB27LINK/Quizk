/**
 * server/routes/sources.js
 * Notes and study sources management for QUIZK
 */

const express = require('express');
const { getDatabase } = require('../db.js');
const { optionalAuth, requireAuth } = require('../middleware/auth.js');

const router = express.Router();

// Helper to auto-suggest a title from note content
function deriveTitle(content) {
  if (!content) return 'Untitled Study Material';
  const firstLine = content.split('\n').map((l) => l.trim()).find((l) => l.length > 3);
  if (firstLine) {
    return firstLine.replace(/^[#*-]\s*/, '').slice(0, 50);
  }
  return content.slice(0, 40).trim() + '...';
}

// POST /api/sources (save notes)
router.post('/', requireAuth, (req, res) => {
  const { title, content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Source content text is required.' });
  }

  const trimmed = content.trim();
  if (trimmed.length < 200) {
    return res.status(400).json({
      error: `Your notes are too short (${trimmed.length} characters). Please provide at least 200 characters for rich quiz generation.`
    });
  }

  const safeTitle = (title && typeof title === 'string' && title.trim()) || deriveTitle(trimmed);
  const sourceId = `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const db = getDatabase();

  db.run(
    'INSERT INTO sources (id, user_id, title, content, char_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [sourceId, req.user.id, safeTitle, trimmed, trimmed.length, now]
  );

  return res.status(201).json({
    source: {
      id: sourceId,
      userId: req.user.id,
      title: safeTitle,
      charCount: trimmed.length,
      createdAt: now
    }
  });
});

// GET /api/sources (list sources with attempt stats)
router.get('/', requireAuth, (req, res) => {
  const db = getDatabase();
  const sources = db.all(
    `SELECT s.id, s.title, s.content, s.char_count, s.created_at,
            COUNT(a.id) as attempts_count,
            MAX(a.score) as best_score,
            GROUP_CONCAT(DISTINCT a.difficulty) as difficulties_attempted
     FROM sources s
     LEFT JOIN attempts a ON a.source_id = s.id
     WHERE s.user_id = ?
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [req.user.id]
  );

  const formatted = sources.map((s) => ({
    id: s.id,
    title: s.title,
    contentPreview: s.content.slice(0, 160) + '...',
    charCount: s.char_count,
    attemptsCount: s.attempts_count || 0,
    bestScore: s.best_score ?? null,
    difficultiesAttempted: s.difficulties_attempted ? s.difficulties_attempted.split(',') : [],
    createdAt: s.created_at
  }));

  return res.json({ sources: formatted });
});

// DELETE /api/sources/:id (delete source and related history)
router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  const source = db.get('SELECT id FROM sources WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!source) {
    return res.status(404).json({ error: 'Source not found or you do not have permission to delete it.' });
  }

  // Delete attempts and questions associated with this source
  db.run('DELETE FROM attempts WHERE source_id = ?', [id]);
  db.run('DELETE FROM quizzes WHERE source_id = ?', [id]);
  db.run('DELETE FROM sources WHERE id = ?', [id]);

  return res.json({ success: true, message: 'Source and its quiz history were successfully deleted.' });
});

module.exports = router;

