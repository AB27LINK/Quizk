# Quiz schema and validation
<!-- Activation: set to "Model Decision" so it loads when working on quiz generation or validation -->

A valid quiz response must satisfy ALL of these. Implement them in `server/validate.js` and cover them in `tests/validate.test.js`.

- Top level is `{ "questions": [...] }` with at least 1 question and no more than the requested count.
- Each question has a non-empty string `q`.
- `options` is an array of exactly 4 non-empty, distinct strings.
- `answer` is an integer from 0 to 3.
- `explanation` is a non-empty string.
- Strip markdown code fences from the model output before `JSON.parse`.
- Drop invalid questions instead of failing the whole quiz; fail only if none remain.
- Shuffle options server-side if the model puts the correct answer in the same position more than 60% of the time.
