# QUIZK ("No Cap, Just Facts.")

AI-powered learning platform: Upload your notes. Get a quiz grounded only in that material. Know what you actually know.

---

## 🚀 Quick Setup (Under 10 Steps)

1. **Clone / Open Workspace:**
   Open the `Quizk` repository folder in your terminal or IDE.
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Environment Setup:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key as `GEMINI_API_KEY` (optional: offline fallback generator is built-in for offline testing).
4. **Build Frontend:**
   ```bash
   npm run build
   ```
5. **Start Application:**
   ```bash
   npm start
   ```
   Open `http://localhost:3001` in your browser.
6. **(Optional) Run in Dev Mode:**
   ```bash
   npm run dev
   ```
7. **Run Automated Test Suite (30 unit & integration tests):**
   ```bash
   npm test
   ```
8. **Run Security & AGENTS.md Compliance Linter:**
   ```bash
   npm run lint
   ```

---

## 🎯 Key Features
- **Strict Grounding:** Quizzes are generated using ONLY the supplied notes. Instructions inside the source are ignored.
- **First-Class Difficulty Engine:**
  - **Easy:** Direct recall of stated facts & definitions (1.0x points multiplier).
  - **Medium:** Connecting two ideas with plausible distractors (1.5x points multiplier).
  - **Hard:** Inferences, cause-and-effect, and close distractors (2.0x points multiplier).
  - **Auto (Adaptive):** Evaluates learner trajectory (promotes after two scores >= 80%, demotes after two scores < 50%).
- **Interactive Quiz Runner:** Real-time feedback, green/red highlight, grounded explanation, live score, and progress bar.
- **Study Roadmap:** Rules-based recommendations per source notes, missed topic tracker, and 3-session weekly study plan.
- **Leaderboard:** Filterable by difficulty and time period (all-time / this week), with current-user highlighting.
- **Learning History:** Filterable attempt logs with full question-by-question review.
- **Design System:** Space Grotesk / Inter fonts, custom navy & lime badges, responsive desktop top bar, and mobile bottom tab bar.
