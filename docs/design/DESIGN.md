# QUIZK Design System

Visual reference: `quizk-template.html` (open in a browser: working light/dark mode and sample Create, Quiz, Results, Dashboard and Leaderboard screens). Match it closely. Copy its `:root` tokens and component CSS into the app's global stylesheet.

## Brand assets (final, do not redraw or recolour)
Files are in `/brand` (copy to `public/brand/`).
- `quizk-logo.svg` / `.png`: full logo for LIGHT backgrounds.
- `quizk-logo-dark.svg` / `.png`: full logo for DARK backgrounds (white wordmark, lime K and tagline).
- `quizk-icon.svg`: the icon alone (rounded navy badge, white Q, lime cap and tail).
- Favicon set: `favicon.svg` (the icon), `favicon.ico`, `favicon-16/32/48.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest`. Add the tags from `HEAD-SNIPPET.html` to `index.html`.
- Use the full logo on the landing and login pages. In the app header use the icon plus the "QUIZK" wordmark text, as in the template. Switch between the light and dark logo files with `prefers-color-scheme`.
- Keep clear space around the logo equal to the height of the Q ring. Never stretch, rotate, recolour or add effects. Minimum icon size 24px.

## Personality
Friendly, confident, a little playful. Matches "No Cap, Just Facts." Short human copy, big rounded shapes, one strong accent.

## Colour tokens (light / dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--navy` | #120f33 | #120f33 | logo badge, dark surfaces, theme colour |
| `--navy-2` | #2b2670 | #2b2670 | gradient partner for navy |
| `--bg` | #f6f4ff | #0f0d1f | page background |
| `--surface` | #ffffff | #1a1733 | cards |
| `--ink` | #14122b | #f1efff | text |
| `--muted` | #6b6885 | #a09cc4 | secondary text |
| `--brand` | #6c4df6 | #8b73ff | primary buttons, links, progress, the K on light |
| `--pop` | #c6f432 | #c6f432 | lime highlight (logo accent, tagline mark, "Next" button) |
| `--easy` | #1fa971 | #4ad8a0 | Easy level |
| `--med` | #c77d00 | #ffc14d | Medium level |
| `--hard` | #e5484d | #ff7b80 | Hard level |

Difficulty colours are always paired with a text label and a dot. Never rely on colour alone.

## Typography
Headings: Space Grotesk 500/700. Body: Inter 400/500/600. Logo wordmark is outlined artwork (Poppins Bold), so never retype it. Hero heading `clamp(2rem, 6vw, 3.4rem)`; question text about 1.35rem; body 16px.

## Shape and spacing
Cards: 18px radius, 1px line border, soft violet shadow, 22px padding. Inputs and options: 12px radius, 2px border. Buttons and badges: pills; primary buttons have a chunky 4px bottom shadow that flattens on press. Spacing scale: 6, 10, 14, 16, 22, 26px.

## Components
Top bar (icon plus wordmark, pill nav; bottom tab bar under 720px), difficulty segmented control (Easy, Medium, Hard, Auto) with description, difficulty badge, answer option with letter chip (default, hover, correct, wrong), progress bar, score ring, stat card, leaderboard row (highlight current user), filter chips, roadmap card.

## Motion and accessibility
250ms fade-and-rise on screen change; respect `prefers-reduced-motion`. Visible 3px focus ring, text contrast of at least 4.5:1, real `<button>` elements, tap targets at least 44px on mobile.
