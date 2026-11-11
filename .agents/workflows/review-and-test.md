# Review and test

Description: Review the codebase against project rules and run all checks before a release.

## Steps
1. Run `npm test` and `npm run lint`; report failures.
2. Search the code for `innerHTML`, hard-coded API keys, and direct LLM calls from `public/`; list any violations of `AGENTS.md`.
3. Confirm `.env` is git-ignored and `.env.example` lists every required variable.
4. Test edge cases in the browser: source under 200 characters, very long source, Hindi language option, API error, and a retake.
5. Check accessibility: keyboard navigation through a whole quiz, visible focus, contrast in both themes.
6. Output a checklist of passed and failed items with suggested fixes.
