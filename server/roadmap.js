/**
 * server/roadmap.js
 * Rules-based learning roadmap and adaptive difficulty engine for QUIZK
 */

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

/**
 * Resolves the adaptive difficulty level based on the last two attempts for a source.
 * Rule:
 * - Starts at Medium.
 * - Move up a level after two scores of 80% or more (Easy -> Medium -> Hard).
 * - Move down after two scores below 50% (Hard -> Medium -> Easy).
 * - Otherwise stay at current level.
 *
 * @param {Array<{ score: number, total_questions: number, difficulty: string }>} recentAttempts - ordered newest first
 * @returns {'Easy'|'Medium'|'Hard'}
 */
function resolveAdaptiveDifficulty(recentAttempts = []) {
  if (!recentAttempts || recentAttempts.length < 2) {
    return 'Medium';
  }

  const [att1, att2] = recentAttempts;
  const pct1 = Math.round((att1.score / (att1.total_questions || 1)) * 100);
  const pct2 = Math.round((att2.score / (att2.total_questions || 1)) * 100);

  const currentLevel = att1.difficulty || 'Medium';
  const currentIndex = DIFFICULTY_LEVELS.indexOf(currentLevel);
  const safeIndex = currentIndex === -1 ? 1 : currentIndex;

  if (pct1 >= 80 && pct2 >= 80) {
    // Promote if not at maximum
    const nextIndex = Math.min(DIFFICULTY_LEVELS.length - 1, safeIndex + 1);
    return DIFFICULTY_LEVELS[nextIndex];
  }

  if (pct1 < 50 && pct2 < 50) {
    // Demote if not at minimum
    const prevIndex = Math.max(0, safeIndex - 1);
    return DIFFICULTY_LEVELS[prevIndex];
  }

  return DIFFICULTY_LEVELS[safeIndex];
}

/**
 * Determines the next recommended step for a source based on its attempt history.
 *
 * @param {object} source - { id, title }
 * @param {Array<object>} sourceAttempts - attempts for this source, newest first
 * @returns {object} { title, recommendation, targetDifficulty, status: 'new'|'level_up'|'remedial'|'maintain' }
 */
function getSourceRecommendation(source, sourceAttempts = []) {
  if (!sourceAttempts || sourceAttempts.length === 0) {
    return {
      sourceId: source.id,
      sourceTitle: source.title,
      recommendation: 'Start with a Medium quiz to establish your baseline.',
      targetDifficulty: 'Medium',
      action: 'Start Medium',
      badgeClass: 'medium',
      status: 'new'
    };
  }

  const latest = sourceAttempts[0];
  const pct = Math.round((latest.score / (latest.total_questions || 1)) * 100);
  const currentDiff = latest.difficulty || 'Medium';

  if (pct >= 80) {
    if (currentDiff === 'Hard') {
      return {
        sourceId: source.id,
        sourceTitle: source.title,
        recommendation: `Outstanding! You scored ${pct}% on Hard. Retake to lock in your mastery.`,
        targetDifficulty: 'Hard',
        action: 'Mastery Quiz',
        badgeClass: 'hard',
        status: 'maintain'
      };
    }
    const nextDiff = currentDiff === 'Easy' ? 'Medium' : 'Hard';
    return {
      sourceId: source.id,
      sourceTitle: source.title,
      recommendation: `Great job! You scored ${pct}% on ${currentDiff}. Move up to ${nextDiff}.`,
      targetDifficulty: nextDiff,
      action: `Try ${nextDiff}`,
      badgeClass: nextDiff.toLowerCase(),
      status: 'level_up'
    };
  }

  if (pct < 50) {
    if (currentDiff === 'Easy') {
      return {
        sourceId: source.id,
        sourceTitle: source.title,
        recommendation: `You scored ${pct}% on Easy. Re-read the source notes carefully, then retake.`,
        targetDifficulty: 'Easy',
        action: 'Retake Easy',
        badgeClass: 'easy',
        status: 'remedial'
      };
    }
    const easierDiff = currentDiff === 'Hard' ? 'Medium' : 'Easy';
    return {
      sourceId: source.id,
      sourceTitle: source.title,
      recommendation: `You scored ${pct}% on ${currentDiff}. Re-read the source, then build confidence at ${easierDiff}.`,
      targetDifficulty: easierDiff,
      action: `Try ${easierDiff}`,
      badgeClass: easierDiff.toLowerCase(),
      status: 'remedial'
    };
  }

  return {
    sourceId: source.id,
    sourceTitle: source.title,
    recommendation: `You scored ${pct}% on ${currentDiff}. Practice once more to hit 80% and level up.`,
    targetDifficulty: currentDiff,
    action: `Practice ${currentDiff}`,
    badgeClass: currentDiff.toLowerCase(),
    status: 'maintain'
  };
}

/**
 * Builds the complete roadmap response including next steps, missed topics, and 3-session weekly plan.
 *
 * @param {Array<object>} sources
 * @param {Array<object>} attempts
 * @param {Array<object>} missedAnswers - { question_id, q, incorrect_count }
 * @returns {object}
 */
function generateRoadmap(sources = [], attempts = [], missedAnswers = []) {
  // Group attempts by sourceId
  const attemptsBySource = new Map();
  for (const att of attempts) {
    const list = attemptsBySource.get(att.source_id) || [];
    list.push(att);
    attemptsBySource.set(att.source_id, list);
  }

  // Next steps per source
  const nextSteps = sources.map((source) => {
    const sourceAttempts = attemptsBySource.get(source.id) || [];
    return getSourceRecommendation(source, sourceAttempts);
  });

  // Calculate average accuracy per source for ranking weakest
  const sourceStats = sources.map((s) => {
    const sAtts = attemptsBySource.get(s.id) || [];
    if (sAtts.length === 0) {
      return { source: s, avgPct: -1, attemptsCount: 0 };
    }
    const totalScore = sAtts.reduce((sum, a) => sum + a.score, 0);
    const totalQ = sAtts.reduce((sum, a) => sum + (a.total_questions || 1), 0);
    return {
      source: s,
      avgPct: Math.round((totalScore / totalQ) * 100),
      attemptsCount: sAtts.length
    };
  });

  // Sort: lowest average accuracy first (unattempted included)
  sourceStats.sort((a, b) => a.avgPct - b.avgPct);

  // Generate 3 suggested weekly practice sessions
  const daysOfWeek = ['Monday', 'Wednesday', 'Friday'];
  const weeklyPlan = daysOfWeek.map((day, idx) => {
    const target = sourceStats[idx % Math.max(1, sourceStats.length)];
    if (!target) {
      return {
        day,
        title: 'Upload fresh notes',
        focus: 'Create a new topic to explore',
        targetDifficulty: 'Medium'
      };
    }

    const rec = getSourceRecommendation(target.source, attemptsBySource.get(target.source.id) || []);
    return {
      day,
      sourceId: target.source.id,
      title: target.source.title,
      focus: rec.recommendation,
      targetDifficulty: rec.targetDifficulty
    };
  });

  // Filter missed topics with count >= 2 (or 1 if few)
  const missedTopics = (missedAnswers || [])
    .filter((m) => m && m.q)
    .slice(0, 5)
    .map((m) => ({
      questionId: m.question_id,
      stem: m.q,
      missedCount: m.incorrect_count || 1
    }));

  return {
    nextSteps,
    weeklyPlan,
    missedTopics
  };
}

module.exports = {
  DIFFICULTY_LEVELS,
  resolveAdaptiveDifficulty,
  getSourceRecommendation,
  generateRoadmap
};

