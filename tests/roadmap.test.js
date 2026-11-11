const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveAdaptiveDifficulty,
  getSourceRecommendation,
  generateRoadmap
} = require('../server/roadmap.js');

test('resolveAdaptiveDifficulty defaults to Medium when fewer than 2 attempts exist', () => {
  assert.equal(resolveAdaptiveDifficulty([]), 'Medium');
  assert.equal(resolveAdaptiveDifficulty([{ score: 8, total_questions: 10, difficulty: 'Easy' }]), 'Medium');
});

test('resolveAdaptiveDifficulty promotes after two scores >= 80%', () => {
  // Easy -> Medium
  const atts1 = [
    { score: 9, total_questions: 10, difficulty: 'Easy' },
    { score: 8, total_questions: 10, difficulty: 'Easy' }
  ];
  assert.equal(resolveAdaptiveDifficulty(atts1), 'Medium');

  // Medium -> Hard
  const atts2 = [
    { score: 5, total_questions: 5, difficulty: 'Medium' },
    { score: 4, total_questions: 5, difficulty: 'Medium' }
  ];
  assert.equal(resolveAdaptiveDifficulty(atts2), 'Hard');

  // Hard -> stays Hard (capped)
  const atts3 = [
    { score: 8, total_questions: 10, difficulty: 'Hard' },
    { score: 10, total_questions: 10, difficulty: 'Hard' }
  ];
  assert.equal(resolveAdaptiveDifficulty(atts3), 'Hard');
});

test('resolveAdaptiveDifficulty demotes after two scores < 50%', () => {
  // Hard -> Medium
  const atts1 = [
    { score: 2, total_questions: 10, difficulty: 'Hard' },
    { score: 4, total_questions: 10, difficulty: 'Hard' }
  ];
  assert.equal(resolveAdaptiveDifficulty(atts1), 'Medium');

  // Medium -> Easy
  const atts2 = [
    { score: 1, total_questions: 5, difficulty: 'Medium' },
    { score: 2, total_questions: 5, difficulty: 'Medium' }
  ];
  assert.equal(resolveAdaptiveDifficulty(atts2), 'Easy');

  // Easy -> stays Easy (minimum)
  const atts3 = [
    { score: 1, total_questions: 5, difficulty: 'Easy' },
    { score: 2, total_questions: 5, difficulty: 'Easy' }
  ];
  assert.equal(resolveAdaptiveDifficulty(atts3), 'Easy');
});

test('resolveAdaptiveDifficulty maintains level when scores are mixed', () => {
  const atts = [
    { score: 9, total_questions: 10, difficulty: 'Medium' }, // 90%
    { score: 4, total_questions: 10, difficulty: 'Medium' }  // 40%
  ];
  assert.equal(resolveAdaptiveDifficulty(atts), 'Medium');
});

test('getSourceRecommendation suggests Medium for unattempted sources', () => {
  const source = { id: 's1', title: 'Biology Notes' };
  const rec = getSourceRecommendation(source, []);
  assert.equal(rec.targetDifficulty, 'Medium');
  assert.equal(rec.status, 'new');
  assert.match(rec.recommendation, /Start with a Medium quiz/);
});

test('getSourceRecommendation promotes when latest score >= 80%', () => {
  const source = { id: 's1', title: 'Biology Notes' };
  const rec = getSourceRecommendation(source, [
    { score: 9, total_questions: 10, difficulty: 'Medium' }
  ]);
  assert.equal(rec.targetDifficulty, 'Hard');
  assert.equal(rec.status, 'level_up');
  assert.match(rec.recommendation, /Move up to Hard/);
});

test('getSourceRecommendation advises re-reading and demoting when latest score < 50%', () => {
  const source = { id: 's1', title: 'Chemistry Notes' };
  const rec = getSourceRecommendation(source, [
    { score: 3, total_questions: 10, difficulty: 'Hard' }
  ]);
  assert.equal(rec.targetDifficulty, 'Medium');
  assert.equal(rec.status, 'remedial');
  assert.match(rec.recommendation, /Re-read the source.*build confidence at Medium/);
});

test('generateRoadmap generates 3 weekly sessions and collects missed topics', () => {
  const sources = [
    { id: 's1', title: 'Calculus' },
    { id: 's2', title: 'Physics' }
  ];
  const attempts = [
    { source_id: 's1', score: 3, total_questions: 10, difficulty: 'Hard' }
  ];
  const missed = [
    { question_id: 'q1', q: 'What is a derivative?', incorrect_count: 3 }
  ];

  const roadmap = generateRoadmap(sources, attempts, missed);
  assert.equal(roadmap.weeklyPlan.length, 3);
  assert.equal(roadmap.nextSteps.length, 2);
  assert.equal(roadmap.missedTopics.length, 1);
  assert.equal(roadmap.missedTopics[0].stem, 'What is a derivative?');
  assert.equal(roadmap.missedTopics[0].missedCount, 3);
});

