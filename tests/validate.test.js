const test = require('node:test');
const assert = require('node:assert/strict');
const {
  stripCodeFences,
  validateQuestion,
  validateQuiz,
  balanceAnswerPositions
} = require('../server/validate.js');

test('stripCodeFences removes markdown json tags', () => {
  const fenced = '```json\n{"questions":[]}\n```';
  assert.equal(stripCodeFences(fenced), '{"questions":[]}');

  const fencedGeneric = '```\n{"questions":[]}\n```';
  assert.equal(stripCodeFences(fencedGeneric), '{"questions":[]}');

  const raw = '{"questions":[]}';
  assert.equal(stripCodeFences(raw), '{"questions":[]}');
});

test('validateQuestion rejects questions missing required fields', () => {
  assert.equal(validateQuestion(null), null);
  assert.equal(validateQuestion({}), null);
  assert.equal(validateQuestion({ q: '', options: ['A', 'B', 'C', 'D'], answer: 0, explanation: 'Exp' }), null);
  assert.equal(validateQuestion({ q: 'Q1', options: ['A', 'B', 'C'], answer: 0, explanation: 'Exp' }), null); // 3 options
  assert.equal(validateQuestion({ q: 'Q1', options: ['A', 'B', 'C', 'D', 'E'], answer: 0, explanation: 'Exp' }), null); // 5 options
  assert.equal(validateQuestion({ q: 'Q1', options: ['A', 'A', 'B', 'C'], answer: 0, explanation: 'Exp' }), null); // duplicates
  assert.equal(validateQuestion({ q: 'Q1', options: ['A', 'B', 'C', 'D'], answer: 4, explanation: 'Exp' }), null); // answer > 3
  assert.equal(validateQuestion({ q: 'Q1', options: ['A', 'B', 'C', 'D'], answer: -1, explanation: 'Exp' }), null); // answer < 0
  assert.equal(validateQuestion({ q: 'Q1', options: ['A', 'B', 'C', 'D'], answer: 0, explanation: '' }), null); // empty explanation
});

test('validateQuestion accepts valid questions and trims strings', () => {
  const q = {
    q: ' What is QUIZK? ',
    options: [' App ', ' Car ', ' Animal ', ' Book '],
    answer: 0,
    explanation: ' It is an AI learning app. '
  };
  const validated = validateQuestion(q);
  assert.ok(validated);
  assert.equal(validated.q, 'What is QUIZK?');
  assert.deepEqual(validated.options, ['App', 'Car', 'Animal', 'Book']);
  assert.equal(validated.answer, 0);
  assert.equal(validated.explanation, 'It is an AI learning app.');
});

test('validateQuiz successfully parses clean JSON', () => {
  const input = JSON.stringify({
    questions: [
      {
        q: 'What does QUIZK stand for?',
        options: ['Quiz Knowledge', 'Quick Zing', 'Quality Key', 'Quiet Kid'],
        answer: 0,
        explanation: 'Source describes the brand identity.'
      }
    ]
  });

  const res = validateQuiz(input);
  assert.equal(res.questions.length, 1);
  assert.equal(res.questions[0].q, 'What does QUIZK stand for?');
});

test('validateQuiz parses fenced JSON', () => {
  const input = '```json\n{"questions":[{"q":"Test Q?","options":["A","B","C","D"],"answer":1,"explanation":"Exp"}]}\n```';
  const res = validateQuiz(input);
  assert.equal(res.questions.length, 1);
  assert.equal(res.questions[0].answer, 1);
});

test('validateQuiz drops invalid questions while retaining valid ones', () => {
  const input = JSON.stringify({
    questions: [
      { q: 'Good Q', options: ['1', '2', '3', '4'], answer: 2, explanation: 'Valid' },
      { q: 'Bad Q', options: ['1', '2'], answer: 0, explanation: 'Invalid' },
      { q: 'Another Good Q', options: ['W', 'X', 'Y', 'Z'], answer: 3, explanation: 'Valid' }
    ]
  });

  const res = validateQuiz(input);
  assert.equal(res.questions.length, 2);
  assert.equal(res.questions[0].q, 'Good Q');
  assert.equal(res.questions[1].q, 'Another Good Q');
});

test('validateQuiz throws when given total garbage or no valid questions', () => {
  assert.throws(() => validateQuiz('not json at all'), /Invalid JSON output/);
  assert.throws(() => validateQuiz(JSON.stringify({ questions: [] })), /No valid questions found/);
  assert.throws(() => validateQuiz(JSON.stringify({ questions: [{ q: 'Bad', options: [] }] })), /No valid questions found/);
});

test('balanceAnswerPositions shuffles options when correct answers are biased > 60%', () => {
  const biased = [
    { q: 'Q1', options: ['A1', 'B1', 'C1', 'D1'], answer: 0, explanation: 'E1' },
    { q: 'Q2', options: ['A2', 'B2', 'C2', 'D2'], answer: 0, explanation: 'E2' },
    { q: 'Q3', options: ['A3', 'B3', 'C3', 'D3'], answer: 0, explanation: 'E3' },
    { q: 'Q4', options: ['A4', 'B4', 'C4', 'D4'], answer: 0, explanation: 'E4' },
    { q: 'Q5', options: ['A5', 'B5', 'C5', 'D5'], answer: 1, explanation: 'E5' }
  ]; // 4 out of 5 = 80% at index 0

  const balanced = balanceAnswerPositions(biased);
  assert.equal(balanced.length, 5);

  // Verify correctness maintained: the option indicated by new answer is still the original correct option!
  for (let i = 0; i < biased.length; i++) {
    const origCorrectText = biased[i].options[biased[i].answer];
    const newCorrectText = balanced[i].options[balanced[i].answer];
    assert.equal(origCorrectText, newCorrectText);
  }
});

