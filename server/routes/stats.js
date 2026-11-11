/**
 * server/routes/stats.js
 * Aggregated statistics for Dashboard, Rules-based Roadmap, and Filterable Leaderboard.
 */

const express = require('express');
const { getDatabase } = require('../db.js');
const { optionalAuth, requireAuth } = require('../middleware/auth.js');
const { calculateStreak, calculateAccuracy } = require('../scoring.js');
const { generateRoadmap } = require('../roadmap.js');
const { buildLeaderboard } = require('../leaderboard.js');

const router = express.Router();

// GET /api/dashboard
router.get('/dashboard', optionalAuth, (req, res) => {
  const db = getDatabase();
  const userId = req.user?.id || 'usr_abhi_01'; // Default to demo user if guest checking dashboard

  const attempts = db.all('SELECT * FROM attempts WHERE user_id = ? ORDER BY created_at DESC', [userId]);

  let totalQuizzes = attempts.length;
  let totalQuestions = 0;
  let correctAnswers = 0;
  let totalPoints = 0;

  const diffCounts = {
    Easy: { total: 0, correct: 0 },
    Medium: { total: 0, correct: 0 },
    Hard: { total: 0, correct: 0 }
  };

  const dates = [];
  for (const att of attempts) {
    totalQuestions += att.total_questions;
    correctAnswers += att.score;
    totalPoints += att.points;
    dates.push(att.created_at);

    if (diffCounts[att.difficulty]) {
      diffCounts[att.difficulty].total += att.total_questions;
      diffCounts[att.difficulty].correct += att.score;
    }
  }

  const overallAccuracy = calculateAccuracy(correctAnswers, totalQuestions);
  const streak = calculateStreak(dates);

  const accuracyByDifficulty = {
    Easy: {
      accuracy: calculateAccuracy(diffCounts.Easy.correct, diffCounts.Easy.total),
      count: diffCounts.Easy.total
    },
    Medium: {
      accuracy: calculateAccuracy(diffCounts.Medium.correct, diffCounts.Medium.total),
      count: diffCounts.Medium.total
    },
    Hard: {
      accuracy: calculateAccuracy(diffCounts.Hard.correct, diffCounts.Hard.total),
      count: diffCounts.Hard.total
    }
  };

  // Strongest and weakest sources
  const sourcePerformance = db.all(
    `SELECT s.id, s.title,
            SUM(a.score) as total_score,
            SUM(a.total_questions) as total_q,
            COUNT(a.id) as count
     FROM sources s
     JOIN attempts a ON a.source_id = s.id
     WHERE s.user_id = ?
     GROUP BY s.id`,
    [userId]
  );

  let strongestSource = null;
  let weakestSource = null;

  if (sourcePerformance.length > 0) {
    const scored = sourcePerformance.map((sp) => ({
      id: sp.id,
      title: sp.title,
      accuracy: Math.round((sp.total_score / (sp.total_q || 1)) * 100),
      count: sp.count
    }));

    scored.sort((a, b) => b.accuracy - a.accuracy);
    strongestSource = scored[0];
    weakestSource = scored[scored.length - 1];
  }

  const recentActivity = attempts.slice(0, 5).map((a) => ({
    id: a.id,
    difficulty: a.difficulty,
    score: a.score,
    totalQuestions: a.total_questions,
    points: a.points,
    createdAt: a.created_at
  }));

  const user = req.user || {
    id: 'guest',
    name: 'Abhi',
    initials: 'AB',
    email: 'abhi@quizk.dev'
  };

  return res.json({
    user,
    stats: {
      quizzes: totalQuizzes,
      questions: totalQuestions,
      accuracy: overallAccuracy,
      points: Math.round(totalPoints * 10) / 10,
      streak
    },
    accuracyByDifficulty,
    strongestSource,
    weakestSource,
    recentActivity
  });
});

// GET /api/roadmap
router.get('/roadmap', optionalAuth, (req, res) => {
  const db = getDatabase();
  const userId = req.user?.id || 'usr_abhi_01';

  const sources = db.all('SELECT id, title, content FROM sources WHERE user_id = ?', [userId]);
  const attempts = db.all('SELECT * FROM attempts WHERE user_id = ? ORDER BY created_at DESC', [userId]);

  const missedAnswers = db.all(
    `SELECT aa.question_id, q.q, COUNT(aa.id) as incorrect_count
     FROM attempt_answers aa
     JOIN attempts a ON a.id = aa.attempt_id
     LEFT JOIN questions q ON q.id = aa.question_id
     WHERE a.user_id = ? AND aa.is_correct = 0 AND q.q IS NOT NULL
     GROUP BY aa.question_id
     ORDER BY incorrect_count DESC
     LIMIT 5`,
    [userId]
  );

  // If no sources exist yet, provide helpful default items
  const effectiveSources = sources.length > 0 ? sources : [
    { id: 'src_demo_os', title: 'Operating Systems notes', content: 'Sample material' }
  ];

  const roadmapData = generateRoadmap(effectiveSources, attempts, missedAnswers);
  return res.json(roadmapData);
});

// GET /api/leaderboard
router.get('/leaderboard', optionalAuth, (req, res) => {
  const { difficulty = 'All', period = 'all' } = req.query;
  const db = getDatabase();

  const users = db.all('SELECT id, name, initials, email FROM users');
  const attempts = db.all('SELECT user_id, difficulty, score, total_questions, points, created_at FROM attempts');

  const currentUserId = req.user?.id || 'usr_abhi_01';
  const leaderboard = buildLeaderboard(users, attempts, {
    difficulty,
    period,
    currentUserId
  });

  return res.json({
    difficulty,
    period,
    leaderboard
  });
});

module.exports = router;

