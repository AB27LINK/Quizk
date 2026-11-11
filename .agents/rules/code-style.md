# Code style
<!-- Activation: set to "Always On" in Antigravity > Customizations > Rules -->

- Use modern JavaScript (ES2022): `const`/`let`, async/await, optional chaining. No `var`.
- Small functions with one job. Name them by what they do (`renderQuestion`, `validateQuiz`).
- Frontend state lives in one plain object (`state`) in `app.js`; render functions read from it.
- CSS: design tokens as variables on `:root`, redefined under `@media (prefers-color-scheme: dark)`. Use relative units and flexbox. Mobile first.
- Never use `innerHTML` with user or model text. Use `textContent` or `createElement`.
- Wrap every `fetch` in try/catch and show a readable error in the UI.
- Comments explain why, not what.
- Use typographic apostrophes and quotes in user-facing text.
