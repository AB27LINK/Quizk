const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculatePoints,
  calculateAccuracy,
  calculateStreak,
  DIFFICULTY_MULTIPLIERS
} = require('../server/scoring.js');

test('DIFFICULTY_MULTIPLIERS match spec values', () => {
  assert.equal(DIFFICULTY_MULTIPLIERS.Easy, 1.0);
  assert.equal(DIFFICULTY_MULTIPLIERS.Medium, 1.5);
  assert.equal(DIFFICULTY_MULTIPLIERS.Hard, 2.0);
});

test('calculatePoints correctly applies difficulty multipliers', () => {
  // 6 correct out of 8 on Medium: 6 * 1.5 = 9
  assert.equal(calculatePoints(6, 'Medium'), 9);

  // 10 correct on Easy: 10 * 1.0 = 10
  assert.equal(calculatePoints(10, 'Easy'), 10);

  // 8 correct on Hard: 8 * 2.0 = 16
  assert.equal(calculatePoints(8, 'Hard'), 16);

  // 5 correct on Medium: 5 * 1.5 = 7.5
  assert.equal(calculatePoints(5, 'Medium'), 7.5);

  // Zero or negative input
  assert.equal(calculatePoints(0, 'Hard'), 0);
  assert.equal(calculatePoints(-2, 'Easy'), 0);
});

test('calculateAccuracy calculates percentage accurately', () => {
  assert.equal(calculateAccuracy(6, 8), 75);
  assert.equal(calculateAccuracy(10, 10), 100);
  assert.equal(calculateAccuracy(0, 10), 0);
  assert.equal(calculateAccuracy(1, 3), 33);
  assert.equal(calculateAccuracy(0, 0), 0);
});

test('calculateStreak counts consecutive active days', () => {
  const today = new Date();
  const d0 = today.toISOString();
  const d1 = new Date(today.getTime() - 86400000).toISOString();
  const d2 = new Date(today.getTime() - 2 * 86400000).toISOString();
  const d4 = new Date(today.getTime() - 4 * 86400000).toISOString();

  // 3 consecutive days (today, yesterday, day before)
  assert.equal(calculateStreak([d0, d1, d2]), 3);

  // Broken streak (missing day 3)
  assert.equal(calculateStreak([d0, d1, d4]), 2);

  // No attempts
  assert.equal(calculateStreak([]), 0);
});

