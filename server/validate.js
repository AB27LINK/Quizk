/**
 * server/validate.js
 * Validates AI-generated quiz questions according to .agents/rules/quiz-schema.md
 */

/**
 * Strips markdown code fences (e.g. ```json ... ```) from a text response.
 * @param {string} text
 * @returns {string}
 */
function stripCodeFences(text) {
  if (typeof text !== 'string') return '';
  let cleaned = text.trim();
  // Strip opening fence with optional language identifier
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  // Strip closing fence
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}

/**
 * Validates a single question candidate.
 * Returns null if invalid, or normalized question object if valid.
 */
function validateQuestion(item) {
  if (!item || typeof item !== 'object') return null;

  // q must be a non-empty string
  if (typeof item.q !== 'string' || item.q.trim().length === 0) return null;

  // options must be an array of exactly 4 non-empty, distinct strings
  if (!Array.isArray(item.options) || item.options.length !== 4) return null;

  const trimmedOptions = [];
  const seenOptions = new Set();
  for (const opt of item.options) {
    if (typeof opt !== 'string') return null;
    const trimmed = opt.trim();
    if (trimmed.length === 0) return null;
    const lower = trimmed.toLowerCase();
    if (seenOptions.has(lower)) return null; // must be distinct
    seenOptions.add(lower);
    trimmedOptions.push(trimmed);
  }

  // answer must be integer from 0 to 3
  if (
    typeof item.answer !== 'number' ||
    !Number.isInteger(item.answer) ||
    item.answer < 0 ||
    item.answer > 3
  ) {
    return null;
  }

  // explanation must be non-empty string
  if (typeof item.explanation !== 'string' || item.explanation.trim().length === 0) {
    return null;
  }

  return {
    q: item.q.trim(),
    options: trimmedOptions,
    answer: item.answer,
    explanation: item.explanation.trim()
  };
}

/**
 * Shuffles options of a question and updates the answer index.
 */
function shuffleQuestionOptions(q) {
  const correctAnswer = q.options[q.answer];
  const indices = [0, 1, 2, 3];
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const newOptions = indices.map((idx) => q.options[idx]);
  const newAnswer = newOptions.indexOf(correctAnswer);

  return {
    ...q,
    options: newOptions,
    answer: newAnswer
  };
}

/**
 * Enforces position diversity:
 * "Shuffle options server-side if the model puts the correct answer in the same position more than 60% of the time."
 */
function balanceAnswerPositions(questions) {
  if (questions.length < 2) return questions;

  const counts = [0, 0, 0, 0];
  for (const q of questions) {
    counts[q.answer]++;
  }

  const maxFreq = Math.max(...counts);
  const biasThreshold = 0.60;

  if (maxFreq / questions.length > biasThreshold) {
    // Re-shuffle all questions to ensure unbiased distribution
    return questions.map((q) => shuffleQuestionOptions(q));
  }

  return questions;
}

/**
 * Parses and validates raw AI output or parsed JSON into a valid Quiz object.
 *
 * @param {string|object} rawInput - JSON string or parsed object
 * @param {number} [maxCount] - Requested question count limit
 * @returns {{ questions: Array<{ q: string, options: string[], answer: number, explanation: string }> }}
 * @throws {Error} if input cannot be parsed or no valid questions remain
 */
function validateQuiz(rawInput, maxCount = 15) {
  let parsed;

  if (typeof rawInput === 'string') {
    const cleaned = stripCodeFences(rawInput);
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new Error(`Invalid JSON output: ${err.message}`);
    }
  } else if (rawInput && typeof rawInput === 'object') {
    parsed = rawInput;
  } else {
    throw new Error('Invalid input: expected JSON string or object');
  }

  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error('Top level output must contain a "questions" array');
  }

  // Drop invalid questions instead of failing the whole quiz
  const validQuestions = [];
  for (const item of parsed.questions) {
    const valid = validateQuestion(item);
    if (valid) {
      validQuestions.push(valid);
      if (validQuestions.length === maxCount) {
        break; // Stop once requested count reached
      }
    }
  }

  if (validQuestions.length === 0) {
    throw new Error('No valid questions found in AI output');
  }

  const balanced = balanceAnswerPositions(validQuestions);

  return {
    questions: balanced
  };
}

module.exports = {
  stripCodeFences,
  validateQuestion,
  shuffleQuestionOptions,
  balanceAnswerPositions,
  validateQuiz
};

