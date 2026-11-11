/**
 * server/leaderboard.js
 * Leaderboard ranking, filtering, and aggregation logic for QUIZK
 */

/**
 * Aggregates attempts by user, applies difficulty and time filters,
 * and returns ranked leaderboard entries.
 *
 * @param {Array<object>} users - list of all user records [{ id, name, initials }]
 * @param {Array<object>} attempts - list of all attempts [{ user_id, difficulty, score, total_questions, points, created_at }]
 * @param {object} options - { difficulty: 'All'|'Easy'|'Medium'|'Hard', period: 'all'|'week', currentUserId: string }
 * @returns {Array<object>} ranked leaderboard rows
 */
function buildLeaderboard(users = [], attempts = [], options = {}) {
  const { difficulty = 'All', period = 'all', currentUserId = null } = options;

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Filter attempts based on criteria
  const filteredAttempts = attempts.filter((att) => {
    // Difficulty filter
    if (difficulty && difficulty !== 'All' && att.difficulty !== difficulty) {
      return false;
    }

    // Period filter ('week' vs 'all')
    if (period === 'week') {
      const attTime = new Date(att.created_at).getTime();
      if (isNaN(attTime) || attTime < oneWeekAgo) {
        return false;
      }
    }

    return true;
  });

  // Map users for fast lookup
  const userMap = new Map();
  for (const u of users) {
    userMap.set(u.id, {
      id: u.id,
      name: u.name || 'Anonymous Learner',
      initials: u.initials || (u.name ? u.name.slice(0, 2).toUpperCase() : '??'),
      points: 0,
      quizzes: 0,
      totalScore: 0,
      totalQuestions: 0
    });
  }

  // Aggregate stats per user
  for (const att of filteredAttempts) {
    let entry = userMap.get(att.user_id);
    if (!entry) {
      entry = {
        id: att.user_id,
        name: 'Learner',
        initials: 'L',
        points: 0,
        quizzes: 0,
        totalScore: 0,
        totalQuestions: 0
      };
      userMap.set(att.user_id, entry);
    }

    entry.points += Number(att.points) || 0;
    entry.quizzes += 1;
    entry.totalScore += Number(att.score) || 0;
    entry.totalQuestions += Number(att.total_questions) || 0;
  }

  // Convert to array and filter out users who have 0 quizzes in this filtered view (except current user if requested)
  const rows = [];
  for (const [, val] of userMap.entries()) {
    if (val.quizzes > 0 || (currentUserId && val.id === currentUserId)) {
      const avgAccuracy = val.totalQuestions > 0
        ? Math.round((val.totalScore / val.totalQuestions) * 100)
        : 0;

      rows.push({
        id: val.id,
        name: val.name,
        initials: val.initials,
        points: Math.round(val.points * 10) / 10,
        quizzes: val.quizzes,
        avgAccuracy,
        isCurrent: Boolean(currentUserId && val.id === currentUserId)
      });
    }
  }

  // Sort descending by points, tie-break by accuracy, then quizzes
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.avgAccuracy !== a.avgAccuracy) return b.avgAccuracy - a.avgAccuracy;
    return b.quizzes - a.quizzes;
  });

  // Assign 1-based ranks
  return rows.map((row, index) => ({
    rank: index + 1,
    ...row
  }));
}

module.exports = {
  buildLeaderboard
};

