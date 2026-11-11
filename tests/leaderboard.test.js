const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLeaderboard } = require('../server/leaderboard.js');

test('buildLeaderboard aggregates points and ranks users correctly', () => {
  const users = [
    { id: 'u1', name: 'Riya S.', initials: 'RS' },
    { id: 'u2', name: 'Manav K.', initials: 'MK' },
    { id: 'u3', name: 'Abhi', initials: 'AB' }
  ];

  const attempts = [
    { user_id: 'u1', difficulty: 'Medium', score: 8, total_questions: 10, points: 12, created_at: new Date().toISOString() },
    { user_id: 'u2', difficulty: 'Hard', score: 5, total_questions: 10, points: 10, created_at: new Date().toISOString() },
    { user_id: 'u3', difficulty: 'Easy', score: 10, total_questions: 10, points: 10, created_at: new Date().toISOString() }
  ];

  const rows = buildLeaderboard(users, attempts, { currentUserId: 'u3' });

  assert.equal(rows.length, 3);
  assert.equal(rows[0].id, 'u1');
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[0].points, 12);
  assert.equal(rows[0].avgAccuracy, 80);

  // u3 has 10 points and 100% accuracy, u2 has 10 points and 50% accuracy -> u3 ranks above u2
  assert.equal(rows[1].id, 'u3');
  assert.equal(rows[1].rank, 2);
  assert.equal(rows[1].isCurrent, true);

  assert.equal(rows[2].id, 'u2');
  assert.equal(rows[2].rank, 3);
  assert.equal(rows[2].isCurrent, false);
});

test('buildLeaderboard filters by difficulty', () => {
  const users = [
    { id: 'u1', name: 'Alice', initials: 'A' },
    { id: 'u2', name: 'Bob', initials: 'B' }
  ];

  const attempts = [
    { user_id: 'u1', difficulty: 'Hard', score: 8, total_questions: 10, points: 16, created_at: new Date().toISOString() },
    { user_id: 'u2', difficulty: 'Easy', score: 8, total_questions: 10, points: 8, created_at: new Date().toISOString() }
  ];

  const rows = buildLeaderboard(users, attempts, { difficulty: 'Hard' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'u1');
  assert.equal(rows[0].points, 16);
});

test('buildLeaderboard filters by week period', () => {
  const users = [{ id: 'u1', name: 'Alice', initials: 'A' }];
  const oldDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days ago
  const newDate = new Date().toISOString();

  const attempts = [
    { user_id: 'u1', difficulty: 'Medium', score: 5, total_questions: 5, points: 7.5, created_at: oldDate },
    { user_id: 'u1', difficulty: 'Medium', score: 4, total_questions: 5, points: 6.0, created_at: newDate }
  ];

  // All time
  const allRows = buildLeaderboard(users, attempts, { period: 'all' });
  assert.equal(allRows[0].points, 13.5);
  assert.equal(allRows[0].quizzes, 2);

  // This week
  const weekRows = buildLeaderboard(users, attempts, { period: 'week' });
  assert.equal(weekRows[0].points, 6.0);
  assert.equal(weekRows[0].quizzes, 1);
});

