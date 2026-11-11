/**
 * server/scoring.js
 * Scoring and multiplier logic for QUIZK
 */

const DIFFICULTY_MULTIPLIERS = {
  Easy: 1.0,
  Medium: 1.5,
  Hard: 2.0
};

/**
 * Calculates leaderboard points for a quiz attempt.
 * Rule: Points = correct answers * multiplier (Easy 1, Medium 1.5, Hard 2)
 *
 * @param {number} correctCount
 * @param {'Easy'|'Medium'|'Hard'} difficulty
 * @returns {number}
 */
function calculatePoints(correctCount, difficulty) {
  const count = Math.max(0, Number(correctCount) || 0);
  const multiplier = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1.5;
  // Format to 1 decimal place or integer
  const total = count * multiplier;
  return Math.round(total * 10) / 10;
}

/**
 * Calculates percentage accuracy.
 *
 * @param {number} score
 * @param {number} total
 * @returns {number}
 */
function calculateAccuracy(score, total) {
  if (!total || total <= 0) return 0;
  return Math.round((Math.max(0, score) / total) * 100);
}

/**
 * Calculates user streak in days based on an array of ISO timestamp strings or Date objects.
 * Streak counts consecutive calendar days ending either today or yesterday.
 *
 * @param {Array<string|Date>} attemptDates
 * @returns {number}
 */
function calculateStreak(attemptDates) {
  if (!attemptDates || attemptDates.length === 0) return 0;

  // Extract unique sorted YYYY-MM-DD in UTC/local
  const days = new Set();
  for (const d of attemptDates) {
    if (!d) continue;
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) continue;
    const dateStr = dateObj.toISOString().slice(0, 10);
    days.add(dateStr);
  }

  if (days.size === 0) return 0;

  const sortedDays = Array.from(days).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Must have activity today or yesterday to have an active streak
  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  let currentDate = new Date(sortedDays[0]);

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i]);
    const diffMs = currentDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 1) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

module.exports = {
  DIFFICULTY_MULTIPLIERS,
  calculatePoints,
  calculateAccuracy,
  calculateStreak
};

