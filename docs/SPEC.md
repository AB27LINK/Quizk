# Product Spec: QUIZK

## Goal
Turn any pasted or uploaded notes into a quiz grounded in that text, at the learner's chosen difficulty, then track progress and guide what to study next.

## Users
Students and professionals revising from their own notes.

## Pages
Landing, Login/Register, Create (source + options), Quiz, Results, History, Roadmap, Dashboard and Profile, Leaderboard.

## Core flow
Upload material, content processing, AI quiz generation, attempt, performance analysis, progress tracking.

## Difficulty levels
- Easy: direct recall. Medium: connect two ideas, plausible distractors. Hard: inference, cause and effect, close distractors.
- Auto: starts at Medium; moves up after two scores of 80% or more, down after two below 50%, else stays.
- Stored on every quiz and attempt; shown as a badge on quiz header, results, history and leaderboard; dashboard shows accuracy per level; roadmap suggests level changes.
- Leaderboard points = correct answers x multiplier (Easy 1, Medium 1.5, Hard 2); filter by level and by week or all time.

## Functional requirements
- FR1 Reject source under 200 chars; truncate to 12,000 for the model.
- FR2 Exactly 4 options and one correct answer per question; correct position varies; explanations come only from the source.
- FR3 Per-answer feedback (green/red + explanation); results review; Retake reuses questions without an API call; "Try a different difficulty" regenerates from the same source.
- FR4 History per source with filters; open any past attempt; delete a source.
- FR5 Rules-based roadmap (next step per source, missed-topic list, weekly plan of 3 sessions).
- FR6 Dashboard: quizzes, questions, correct answers, accuracy, streak, accuracy by difficulty.
- FR7 Leaderboard with current-user highlight.
- FR8 Guest mode: one unsaved quiz.
- FR9 Favicon and logo per `brand/`.

## API
`POST /api/auth/register|login|logout`, `GET /api/me`
`POST /api/sources`, `GET /api/sources`, `DELETE /api/sources/:id`
`POST /api/quiz` `{ sourceId|source, count: 5|8|10|15, difficulty: Easy|Medium|Hard|Auto, language }` -> `{ questions: [{ q, options[4], answer 0-3, explanation }] }`
`POST /api/attempts`, `GET /api/attempts?sourceId=&difficulty=`
`GET /api/dashboard`, `GET /api/roadmap`, `GET /api/leaderboard?difficulty=&period=`
Errors: 400 invalid input, 401, 429 rate limited, 502 invalid model output, 500. Body `{ "error": string }`.

## Non-functional
Mobile first, accessible (keyboard, focus, contrast), light and dark themes, generation usually under about 15 seconds, rate limit on `/api/quiz`.

## Out of scope (v1)
Native mobile app, true/false and short answer types, social features beyond the leaderboard.
