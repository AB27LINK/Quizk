# Build the MVP

Description: Build QUIZK end to end from `QUIZK_build_prompt.md` and `docs/SPEC.md`, using the design in `docs/design/` and the assets in `brand/`.

## Steps
1. Read `AGENTS.md`, `QUIZK_build_prompt.md`, `docs/SPEC.md` and `docs/design/DESIGN.md`. Produce a short implementation plan as an artifact and wait for approval.
2. Scaffold the project: `package.json` (scripts: dev, test, lint), `.gitignore`, `.env.example`, folders from AGENTS.md.
3. Implement `server/validate.js` with tests first, following `.agents/rules/quiz-schema.md`.
4. Implement `server/llm.js` and `server/index.js` with `POST /api/quiz`, input validation and rate limiting.
5. Use the `quiz-generator` skill to write the prompt and the JSON parsing logic.
6. Build the React frontend per the spec and the design template, including the difficulty selector and badges. Copy `brand/` to `client/public/brand/` and add the favicon tags from `brand/HEAD-SNIPPET.html`. Support light and dark mode.
7. Run `npm test` and `npm run lint`; fix all failures.
8. Open the app in the browser at 375px and desktop widths; test one full quiz with a sample article. Capture screenshots.
9. Produce a walkthrough artifact summarising changes, how to run, and known limitations.
