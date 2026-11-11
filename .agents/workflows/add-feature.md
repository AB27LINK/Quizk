# Add a feature

Description: Safely add a new feature to Source to Quiz.

## Steps
1. Ask me for the feature name and one-paragraph description if not provided.
2. Re-read `AGENTS.md` and `docs/SPEC.md`. Check the feature is not listed as out of scope; if it is, ask before proceeding.
3. Update `docs/SPEC.md` with the new requirement and any API contract change.
4. Write a short plan artifact listing the files to change. Wait for approval.
5. Implement with tests for any new server logic.
6. Run `npm test` and `npm run lint`.
7. Verify in the browser on mobile and desktop widths, light and dark mode.
8. Summarise the change and update the "Future ideas" section of the spec.
