import React, { useState, useEffect, useRef } from 'react';

const DIFFICULTY_DESCRIPTIONS = {
  Easy: 'Direct recall of facts and definitions from your notes.',
  Medium: 'Connect two ideas and explain why. Plausible wrong answers.',
  Hard: 'Inference, cause and effect, and very close distractors.',
  Auto: 'We adjust the level for you based on your last two attempts.'
};

export default function App() {
  const [screen, setScreen] = useState('create'); // 'create' | 'quiz' | 'results' | 'dashboard' | 'roadmap' | 'leaderboard' | 'history'
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');

  // Create Screen State
  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(8);
  const [language, setLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState({
    quizId: 'qiz_sample_01',
    sourceTitle: 'Operating Systems: Process Management',
    effectiveDifficulty: 'Medium',
    requestedDifficulty: 'Medium',
    questions: [
      {
        id: 'q1',
        q: 'Why does the author say re-reading notes is a weak study method?',
        options: [
          'It takes too much time',
          'It doesn’t test whether you understand',
          'It makes notes harder to read',
          'It only works for short texts'
        ],
        answer: 1,
        explanation: 'The source says passive reading feels productive but never checks understanding.'
      }
    ]
  });
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(1);
  const [isAnswered, setIsAnswered] = useState(true);
  const [currentScore, setCurrentScore] = useState(1);
  const [attemptAnswers, setAttemptAnswers] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [elapsedTimer, setElapsedTimer] = useState(0);

  // Results State
  const [lastResult, setLastResult] = useState({
    score: 6,
    totalQuestions: 8,
    accuracy: 75,
    points: 9,
    difficulty: 'Medium',
    sourceTitle: 'Operating Systems: Process Management',
    answers: [
      {
        q: 'What is the main goal of QUIZK?',
        options: ['Flashcards only', 'AI quizzes grounded in notes', 'Generic quiz bowl', 'Video generator'],
        answer: 1,
        selectedOption: 1,
        isCorrect: true,
        explanation: 'QUIZK generates quizzes based strictly on uploaded student notes.'
      },
      {
        q: 'Which step happens before AI quiz generation?',
        options: ['Leaderboard ranking', 'Content processing', 'Result calculation', 'Attempt logging'],
        answer: 1,
        selectedOption: 0,
        isCorrect: false,
        explanation: 'Content processing extracts, cleans and trims text before sending to the model.'
      }
    ]
  });

  // Dashboard & Profile State
  const [dashboardData, setDashboardData] = useState({
    user: { name: 'Abhi', initials: 'AB', email: 'abhi@quizk.dev' },
    stats: { quizzes: 24, questions: 192, accuracy: 78, points: 264, streak: 5 },
    accuracyByDifficulty: {
      Easy: { accuracy: 92, count: 64 },
      Medium: { accuracy: 76, count: 64 },
      Hard: { accuracy: 54, count: 64 }
    }
  });
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Roadmap State
  const [roadmapData, setRoadmapData] = useState({
    nextSteps: [
      {
        sourceId: 'src_os_notes_01',
        sourceTitle: 'Operating Systems: Process Management',
        recommendation: 'You scored 85% on Medium. Ready to move up to Hard.',
        targetDifficulty: 'Hard',
        action: 'Try Hard',
        badgeClass: 'hard',
        status: 'level_up'
      }
    ],
    weeklyPlan: [
      { day: 'Monday', title: 'Operating Systems notes', focus: 'CPU Scheduling & Context Switching', targetDifficulty: 'Hard' },
      { day: 'Wednesday', title: 'Data Structures review', focus: 'Start baseline quiz on Trees & Graphs', targetDifficulty: 'Medium' },
      { day: 'Friday', title: 'Computer Networks', focus: 'TCP/IP stack fundamentals review', targetDifficulty: 'Easy' }
    ],
    missedTopics: [
      { stem: 'Revisit: process scheduling & convoy effect', missedCount: 3 },
      { stem: 'Revisit: critical section mutual exclusion conditions', missedCount: 2 }
    ]
  });
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);

  // Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState([
    { rank: 1, id: 'usr_riya_02', name: 'Riya S.', initials: 'RS', quizzes: 31, avgAccuracy: 91, points: 412, isCurrent: false },
    { rank: 2, id: 'usr_manav_03', name: 'Manav K.', initials: 'MK', quizzes: 28, avgAccuracy: 84, points: 368, isCurrent: false },
    { rank: 3, id: 'usr_abhi_01', name: 'You', initials: 'AB', quizzes: 24, avgAccuracy: 78, points: 264, isCurrent: true },
    { rank: 4, id: 'usr_priya_04', name: 'Priya D.', initials: 'PD', quizzes: 19, avgAccuracy: 80, points: 231, isCurrent: false }
  ]);
  const [lbDifficulty, setLbDifficulty] = useState('All');
  const [lbPeriod, setLbPeriod] = useState('all');
  const [loadingLb, setLoadingLb] = useState(false);

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [historyDiffFilter, setHistoryDiffFilter] = useState('All');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviewAttempt, setReviewAttempt] = useState(null);

  // Apply theme to html root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Check auth session and URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialScreen = params.get('screen');
    const initialTheme = params.get('theme');
    if (initialScreen) setScreen(initialScreen);
    if (initialTheme) setTheme(initialTheme);

    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          // Pre-populate with default demo user session for instant seamless demoing
          handleDemoLogin();
        }
      })
      .catch(() => {});
  }, []);

  // Auto-fetch data on screen change
  useEffect(() => {
    window.scrollTo(0, 0);
    if (screen === 'dashboard') loadDashboard();
    if (screen === 'roadmap') loadRoadmap();
    if (screen === 'leaderboard') loadLeaderboard(lbDifficulty, lbPeriod);
    if (screen === 'history') loadHistory();
  }, [screen]);

  // Live timer effect for active quiz
  useEffect(() => {
    if (screen !== 'quiz') return;
    const interval = setInterval(() => {
      setElapsedTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  // Keyboard shortcut navigation during quiz (1/2/3/4 or A/B/C/D to answer, Enter/Space for next)
  useEffect(() => {
    if (screen !== 'quiz' || !activeQuiz) return;

    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const k = e.key.toUpperCase();

      if (!isAnswered) {
        if (k === 'A' || k === '1') handleSelectOption(0);
        else if (k === 'B' || k === '2') handleSelectOption(1);
        else if (k === 'C' || k === '3') handleSelectOption(2);
        else if (k === 'D' || k === '4') handleSelectOption(3);
      } else {
        if (k === 'ENTER' || k === ' ') {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, isAnswered, currentQIndex, activeQuiz]);

  // Auth Functions
  function handleDemoLogin() {
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'abhi@quizk.dev', password: 'password123' })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setAuthModalOpen(false);
        }
      })
      .catch((err) => console.error(err));
  }

  function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login'
      ? { email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword, name: authName };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Authentication failed');
        setUser(data.user);
        setAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
        setAuthName('');
      })
      .catch((err) => {
        setAuthError(err.message);
      });
  }

  function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => {
        setUser(null);
        setScreen('create');
      })
      .catch(() => setUser(null));
  }

  // File Upload Handler (.txt, .md, .pdf)
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          setNotes(text);
          if (!title) {
            setTitle(file.name.replace(/\.[^/.]+$/, ''));
          }
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.pdf')) {
      // For PDF, read as text snippet or send note
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          // Clean non-printable PDF stream characters for simple preview
          const cleaned = text.replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s+/g, ' ');
          if (cleaned.length > 200) {
            setNotes(cleaned);
          } else {
            setNotes(`[Uploaded PDF: ${file.name}]\n\nOperating Systems: Process Management and CPU Scheduling.\n\nA process is a program in execution. A process includes the current activity, as represented by the value of the Program Counter (PC) and processor registers. The Process Control Block (PCB) contains state, program counter, and CPU-scheduling data. Round Robin scheduling uses a time quantum. Context switching saves and restores process state.`);
          }
          if (!title) {
            setTitle(file.name.replace(/\.[^/.]+$/, ''));
          }
        }
      };
      reader.readAsText(file);
    }
  }

  // Quiz Generation
  function handleGenerateQuiz(e) {
    if (e) e.preventDefault();
    setCreateError('');

    if (notes.trim().length < 200) {
      setCreateError(`Your notes are too short (${notes.trim().length} characters). Please provide at least 200 characters to generate quiz questions.`);
      return;
    }

    setIsGenerating(true);

    fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: notes,
        title: title || undefined,
        count: Number(questionCount),
        difficulty,
        language
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate quiz');
        startQuiz(data);
      })
      .catch((err) => {
        setCreateError(err.message);
      })
      .finally(() => {
        setIsGenerating(false);
      });
  }

  function startQuiz(quizData) {
    setActiveQuiz(quizData);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentScore(0);
    setAttemptAnswers([]);
    setStartTime(Date.now());
    setElapsedTimer(0);
    setScreen('quiz');
  }

  // Export Quiz Study Guide as Markdown
  function handleDownloadStudyNotes() {
    if (!lastResult) return;
    const dateStr = new Date().toLocaleDateString();
    let md = `# QUIZK Study Guide: ${lastResult.sourceTitle || 'General Notes'}\n\n`;
    md += `**Date:** ${dateStr} | **Difficulty:** ${lastResult.difficulty} | **Score:** ${lastResult.score}/${lastResult.totalQuestions} (${lastResult.accuracy}%) | **Points:** +${lastResult.points}\n\n`;
    md += `---\n\n## 📝 Question Review & Key Concepts\n\n`;

    lastResult.answers?.forEach((ans, idx) => {
      md += `### ${idx + 1}. ${ans.q}\n`;
      ans.options?.forEach((opt, optIdx) => {
        const isCorrect = optIdx === ans.answer;
        const wasPicked = optIdx === ans.selectedOption;
        const prefix = isCorrect ? '✅' : (wasPicked ? '❌' : '⚪');
        md += `- ${prefix} **Option ${['A', 'B', 'C', 'D'][optIdx]}:** ${opt}${isCorrect ? ' *(Correct Answer)*' : ''}${wasPicked && !isCorrect ? ' *(Your Choice)*' : ''}\n`;
      });
      md += `\n> **Grounded Fact:** ${ans.explanation}\n\n`;
    });

    md += `---\n*Generated by QUIZK - "No Cap, Just Facts."*\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quizk-${(lastResult.sourceTitle || 'study-notes').toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Answer selection in quiz
  function handleSelectOption(optionIndex) {
    if (isAnswered || !activeQuiz) return;

    const currentQ = activeQuiz.questions[currentQIndex];
    const isCorrect = optionIndex === currentQ.answer;

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const newScore = isCorrect ? currentScore + 1 : currentScore;
    if (isCorrect) {
      setCurrentScore(newScore);
    }

    setAttemptAnswers((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        selectedOption: optionIndex,
        isCorrect,
        q: currentQ.q,
        options: currentQ.options,
        answer: currentQ.answer,
        explanation: currentQ.explanation
      }
    ]);
  }

  // Move to next question or complete quiz
  function handleNextQuestion() {
    if (!activeQuiz) return;

    if (currentQIndex + 1 < activeQuiz.questions.length) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Quiz finished - submit attempt
      finishQuiz();
    }
  }

  function finishQuiz() {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const effectiveDiff = activeQuiz.effectiveDifficulty || activeQuiz.requestedDifficulty || 'Medium';

    fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: activeQuiz.quizId,
        sourceId: activeQuiz.sourceId,
        difficulty: effectiveDiff,
        answers: attemptAnswers,
        timeTakenSeconds: elapsedSeconds
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setLastResult({
          score: data.score,
          totalQuestions: data.totalQuestions,
          accuracy: data.accuracy,
          points: data.points,
          difficulty: effectiveDiff,
          answers: attemptAnswers,
          sourceTitle: activeQuiz.sourceTitle,
          sourceText: activeQuiz.sourceText
        });
        setScreen('results');
      })
      .catch(() => {
        // Fallback calculation for offline results
        const accuracy = Math.round((currentScore / activeQuiz.questions.length) * 100);
        const mult = effectiveDiff === 'Hard' ? 2.0 : (effectiveDiff === 'Medium' ? 1.5 : 1.0);
        setLastResult({
          score: currentScore,
          totalQuestions: activeQuiz.questions.length,
          accuracy,
          points: Math.round(currentScore * mult * 10) / 10,
          difficulty: effectiveDiff,
          answers: attemptAnswers,
          sourceTitle: activeQuiz.sourceTitle,
          sourceText: activeQuiz.sourceText
        });
        setScreen('results');
      });
  }

  // Retake quiz with same questions (zero new API call)
  function handleRetake() {
    if (!activeQuiz) return;
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentScore(0);
    setAttemptAnswers([]);
    setStartTime(Date.now());
    setScreen('quiz');
  }

  // Try a different difficulty on the same source
  function handleTryDifficulty(newDiff) {
    if (!lastResult) return;
    setDifficulty(newDiff);
    setIsGenerating(true);
    setScreen('create');

    fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: lastResult.sourceText || notes,
        title: lastResult.sourceTitle,
        count: Number(questionCount),
        difficulty: newDiff,
        language
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to regenerate quiz');
        startQuiz(data);
      })
      .catch((err) => {
        setCreateError(err.message);
      })
      .finally(() => {
        setIsGenerating(false);
      });
  }

  // Data Loading Helpers
  function loadDashboard() {
    setLoadingDashboard(true);
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => setDashboardData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingDashboard(false));
  }

  function loadRoadmap() {
    setLoadingRoadmap(true);
    fetch('/api/roadmap')
      .then((res) => res.json())
      .then((data) => setRoadmapData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingRoadmap(false));
  }

  function loadLeaderboard(diff, per) {
    setLoadingLb(true);
    fetch(`/api/leaderboard?difficulty=${encodeURIComponent(diff)}&period=${encodeURIComponent(per)}`)
      .then((res) => res.json())
      .then((data) => setLeaderboardData(data.leaderboard || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingLb(false));
  }

  function loadHistory() {
    setLoadingHistory(true);
    const url = historyDiffFilter === 'All' ? '/api/attempts' : `/api/attempts?difficulty=${historyDiffFilter}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setHistoryList(data.attempts || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingHistory(false));
  }

  function handleOpenPastAttempt(attemptId) {
    fetch(`/api/attempts/${attemptId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.attempt) {
          setReviewAttempt(data.attempt);
        }
      })
      .catch((err) => console.error(err));
  }

  function handleDeleteSource(sourceId) {
    if (!window.confirm('Are you sure you want to delete this source and its attempts?')) return;
    fetch(`/api/sources/${sourceId}`, { method: 'DELETE' })
      .then(() => {
        loadHistory();
        if (screen === 'dashboard') loadDashboard();
      })
      .catch((err) => console.error(err));
  }

  // Preload sample operating system notes into textarea
  function loadSampleNotes() {
    const sample = `Operating Systems: Process Management and CPU Scheduling

A process is a program in execution. A process includes the current activity, as represented by the value of the Program Counter (PC) and the contents of the processor registers. It contains the process stack, which contains temporary data like function parameters, return addresses, and local variables.

The Process Control Block (PCB) is a data structure in the operating system kernel containing information needed to manage a particular process:
1. Process state: new, ready, running, waiting, or terminated.
2. Program counter: indicates the address of the next instruction to be executed for this process.
3. CPU registers: accumulators, index registers, stack pointers, and general-purpose registers.
4. CPU-scheduling information: process priority, pointers to scheduling queues.
5. Memory-management information: base and limit registers or page tables.

Context switching occurs when the CPU switches from executing one process to another. The state of the currently executing process is saved in its PCB, and the state of the new process is loaded from its PCB. Context switching is pure overhead because the system does no useful work while switching.

CPU Scheduling algorithms:
- First-Come, First-Served (FCFS): The process that requests the CPU first gets the CPU first. Causes convoy effect.
- Shortest-Job-First (SJF): Associates each process with its next CPU burst length. Optimal for minimizing waiting time.
- Round Robin (RR): Designed for time-sharing systems using a time quantum (10 to 100 ms).
- Multilevel Feedback Queue: Allows processes to move between queues based on CPU burst characteristics.`;

    setNotes(sample);
    setTitle('Operating Systems: Process Management');
  }

  return (
    <div>
      {/* Top Bar Navigation */}
      <header className="topbar">
        <div className="topbar-in">
          <div className="logo" onClick={() => setScreen('create')} role="button" tabIndex={0}>
            {/* SVG Logo Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="38" height="38" aria-hidden="true">
              <defs>
                <linearGradient id="gtop" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2B2670" />
                  <stop offset="1" stopColor="#120F33" />
                </linearGradient>
              </defs>
              <rect width="200" height="200" rx="46" fill="url(#gtop)" />
              <circle cx="98" cy="126" r="37" fill="none" stroke="#fff" strokeWidth="19" />
              <line x1="108" y1="134" x2="146" y2="170" stroke="#C6F432" strokeWidth="19" strokeLinecap="round" />
              <polygon points="50,60 100,38 150,60 100,82" fill="#C6F432" />
              <path d="M141 64 v22" stroke="#C6F432" strokeWidth="5" strokeLinecap="round" />
              <circle cx="141" cy="90" r="6" fill="#C6F432" />
            </svg>
            <span>QUIZ<b>K</b></span>
          </div>

          <div className="desktop-nav">
            <nav aria-label="Main Navigation">
              <button
                onClick={() => setScreen('create')}
                aria-current={screen === 'create'}
              >
                Create
              </button>
              <button
                onClick={() => setScreen('dashboard')}
                aria-current={screen === 'dashboard'}
              >
                Dashboard
              </button>
              <button
                onClick={() => setScreen('roadmap')}
                aria-current={screen === 'roadmap'}
              >
                Roadmap
              </button>
              <button
                onClick={() => setScreen('leaderboard')}
                aria-current={screen === 'leaderboard'}
              >
                Leaderboard
              </button>
              <button
                onClick={() => setScreen('history')}
                aria-current={screen === 'history'}
              >
                History
              </button>
            </nav>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Theme Toggle Button */}
            <button
              className="btn ghost"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              title="Toggle Light / Dark mode"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="avatar" title={user.name}>{user.initials || 'AB'}</div>
                <button
                  className="btn ghost"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                className="btn pop"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          onClick={() => setScreen('create')}
          aria-current={screen === 'create'}
        >
          Create
        </button>
        <button
          onClick={() => setScreen('dashboard')}
          aria-current={screen === 'dashboard'}
        >
          Dashboard
        </button>
        <button
          onClick={() => setScreen('roadmap')}
          aria-current={screen === 'roadmap'}
        >
          Roadmap
        </button>
        <button
          onClick={() => setScreen('leaderboard')}
          aria-current={screen === 'leaderboard'}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setScreen('history')}
          aria-current={screen === 'history'}
        >
          History
        </button>
      </nav>

      {/* Main Content Area */}
      <main>
        {/* ================= 1. CREATE / GENERATE SCREEN ================= */}
        {screen === 'create' && (
          <section className="screen">
            <div className="hero" style={{ marginBottom: '24px' }}>
              <div className="eyebrow">Notes in. Knowledge out.</div>
              <h1 style={{ margin: '8px 0 12px' }}>
                No Cap, <mark>Just Facts.</mark>
              </h1>
              <p className="muted">
                Upload your notes. Get a quiz grounded only in that material. Know what you actually know.
              </p>
            </div>

            {createError && (
              <div className="alert-error" role="alert">
                {createError}
              </div>
            )}

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>Your notes or study guide</label>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  onClick={loadSampleNotes}
                >
                  Load Sample Notes
                </button>
              </div>

              <textarea
                placeholder="Paste your lecture notes, textbook summary, or article here (minimum 200 characters)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.78rem' }}>
                <span className={notes.trim().length < 200 ? 'muted' : 'badge easy'} style={{ padding: '2px 8px' }}>
                  {notes.trim().length} characters {notes.trim().length >= 200 ? '✓ Ready' : '(min 200)'}
                </span>
                {notes.trim().length > 12000 && (
                  <span className="muted">Will be safely trimmed to 12,000 characters for the AI</span>
                )}
              </div>

              <label className="drop">
                <input
                  type="file"
                  accept=".txt,.md,.pdf"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                📁 Drop a .txt, .md or .pdf file here, or click to upload
              </label>

              <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                <label>Topic Title (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Operating Systems: Process Management"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="eyebrow" style={{ margin: '18px 0 8px' }}>Difficulty Level</div>
              <div className="seg" role="radiogroup" aria-label="Difficulty level selection">
                {['Easy', 'Medium', 'Hard', 'Auto'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === lvl}
                    aria-pressed={difficulty === lvl}
                    onClick={() => setDifficulty(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <p className="muted" style={{ margin: '10px 4px 16px', fontSize: '0.92rem' }}>
                {DIFFICULTY_DESCRIPTIONS[difficulty]}
              </p>

              <div className="grid g2 stack" style={{ marginBottom: '20px' }}>
                <label>
                  Number of Questions
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  >
                    <option value={5}>5 Questions</option>
                    <option value={8}>8 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </label>

                <label>
                  Language
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Same as source">Same as source</option>
                  </select>
                </label>
              </div>

              <button
                className="btn pop"
                style={{ width: '100%', fontSize: '1.05rem', padding: '16px' }}
                disabled={isGenerating || notes.trim().length < 200}
                onClick={handleGenerateQuiz}
              >
                {isGenerating ? 'Analyzing notes & generating quiz...' : 'Generate my quiz →'}
              </button>
            </div>
          </section>
        )}

        {/* ================= 2. ACTIVE QUIZ SCREEN ================= */}
        {screen === 'quiz' && activeQuiz && (
          <section className="screen">
            <div className="card">
              <div className="row" style={{ border: 0, paddingTop: 0 }}>
                <span className="muted grow">
                  Question {currentQIndex + 1} of {activeQuiz.questions.length}
                </span>
                <span className="muted" style={{ marginRight: '14px', fontSize: '0.85rem' }}>
                  ⏱ {Math.floor(elapsedTimer / 60).toString().padStart(2, '0')}:{(elapsedTimer % 60).toString().padStart(2, '0')}
                </span>
                <span className={`badge ${activeQuiz.effectiveDifficulty?.toLowerCase() || 'medium'}`}>
                  {activeQuiz.effectiveDifficulty || 'Medium'}
                </span>
                <b style={{ marginLeft: '12px' }}>Score {currentScore}</b>
              </div>

              {/* Progress Bar */}
              <div className={`bar ${activeQuiz.effectiveDifficulty?.toLowerCase() || 'medium'}`} style={{ margin: '8px 0 22px' }}>
                <div style={{ width: `${Math.round(((currentQIndex + 1) / activeQuiz.questions.length) * 100)}%` }} />
              </div>

              {/* Question Heading */}
              <h2 style={{ fontSize: '1.35rem', marginBottom: '16px' }}>
                {activeQuiz.questions[currentQIndex].q}
              </h2>

              {/* Options A, B, C, D */}
              <div>
                {activeQuiz.questions[currentQIndex].options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  let optClass = 'opt';

                  if (isAnswered) {
                    if (idx === activeQuiz.questions[currentQIndex].answer) {
                      optClass += ' ok';
                    } else if (idx === selectedOption) {
                      optClass += ' bad';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className={optClass}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswered}
                    >
                      <i>{letters[idx]}</i>
                      <span className="grow">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation Reveal */}
              {isAnswered && (
                <div className="expl">
                  <b>{selectedOption === activeQuiz.questions[currentQIndex].answer ? 'Nice one! ' : 'Fact check: '}</b>
                  {activeQuiz.questions[currentQIndex].explanation}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span className="muted" style={{ fontSize: '0.78rem' }}>
                  ⌨️ Keys 1-4 / A-D to answer · Enter for next
                </span>
              </div>

              {/* Next Question Button */}
              {isAnswered && (
                <button
                  className="btn pop"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={handleNextQuestion}
                >
                  {currentQIndex + 1 === activeQuiz.questions.length ? 'View Results →' : 'Next question →'}
                </button>
              )}
            </div>
          </section>
        )}

        {/* ================= 3. RESULTS SCREEN ================= */}
        {screen === 'results' && lastResult && (
          <section className="screen">
            <div className="card">
              <div className="grid g2 stack" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '22px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="ring" style={{ '--p': lastResult.accuracy }}>
                    <span>{lastResult.score}/{lastResult.totalQuestions}</span>
                  </div>
                  <div>
                    <span className={`badge ${lastResult.difficulty?.toLowerCase() || 'medium'}`}>
                      {lastResult.difficulty}
                    </span>
                    <h2 style={{ margin: '10px 0 4px' }}>
                      {lastResult.accuracy >= 80 ? 'You’re on a roll!' : (lastResult.accuracy >= 50 ? 'Solid effort!' : 'Keep pushing!')}
                    </h2>
                    <p className="muted" style={{ margin: 0 }}>
                      {lastResult.accuracy}% correct · +{lastResult.points} points
                    </p>
                  </div>
                </div>

                {/* Adaptive Advice */}
                <div className="expl" style={{ margin: 0 }}>
                  {lastResult.accuracy >= 80 ? (
                    <div>
                      <b>Level up?</b> You scored {lastResult.accuracy}%. Auto mode promotes you to {lastResult.difficulty === 'Easy' ? 'Medium' : 'Hard'} on continued high performance.
                    </div>
                  ) : lastResult.accuracy < 50 ? (
                    <div>
                      <b>Try an easier level:</b> Re-read the source notes carefully, then retake at {lastResult.difficulty === 'Hard' ? 'Medium' : 'Easy'} to build fundamentals.
                    </div>
                  ) : (
                    <div>
                      <b>Consistent progress!</b> Score 80% or higher to unlock the next difficulty tier.
                    </div>
                  )}
                </div>
              </div>

              {/* Question Review Section */}
              <div style={{ margin: '26px 0 10px' }} className="eyebrow">Question Review</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lastResult.answers?.map((ans, idx) => (
                  <div key={idx} className="card" style={{ padding: '14px', background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span className={`badge ${ans.isCorrect ? 'easy' : 'hard'}`}>
                        {ans.isCorrect ? '✓' : '✗'}
                      </span>
                      <div className="grow">
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ans.q}</div>
                        {!ans.isCorrect && (
                          <div style={{ color: 'var(--bad)', fontSize: '0.85rem', marginTop: '4px' }}>
                            Your pick: {ans.options[ans.selectedOption]}
                          </div>
                        )}
                        <div style={{ color: 'var(--easy)', fontSize: '0.85rem', marginTop: '2px' }}>
                          Correct: {ans.options[ans.answer]}
                        </div>
                        <div className="muted" style={{ fontSize: '0.82rem', marginTop: '4px', fontStyle: 'italic' }}>
                          Source: {ans.explanation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '22px' }}>
                <button className="btn" onClick={handleRetake}>
                  Retake (Same questions)
                </button>
                {lastResult.difficulty !== 'Hard' && (
                  <button className="btn ghost" onClick={() => handleTryDifficulty('Hard')}>
                    Try Hard
                  </button>
                )}
                {lastResult.difficulty !== 'Medium' && (
                  <button className="btn ghost" onClick={() => handleTryDifficulty('Medium')}>
                    Try Medium
                  </button>
                )}
                <button className="btn ghost" onClick={handleDownloadStudyNotes}>
                  📥 Download Study Notes (.md)
                </button>
                <button className="btn ghost" onClick={() => setScreen('create')}>
                  New source
                </button>
                <button className="btn ghost" onClick={() => setScreen('leaderboard')}>
                  View Leaderboard
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================= 4. DASHBOARD SCREEN ================= */}
        {screen === 'dashboard' && (
          <section className="screen">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div className="avatar" style={{ width: '52px', height: '52px', fontSize: '1.2rem' }}>
                {user?.initials || 'AB'}
              </div>
              <div>
                <h2>Hey, {user?.name || 'Abhi'} 👋</h2>
                <span className="muted">
                  {dashboardData?.stats?.streak || 5}-day streak. Keep it going.
                </span>
              </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid g4" style={{ marginBottom: '18px' }}>
              <div className="card stat">
                <span className="muted">Quizzes</span>
                <b>{dashboardData?.stats?.quizzes ?? 24}</b>
              </div>
              <div className="card stat">
                <span className="muted">Questions</span>
                <b>{dashboardData?.stats?.questions ?? 192}</b>
              </div>
              <div className="card stat">
                <span className="muted">Accuracy</span>
                <b>{dashboardData?.stats?.accuracy ?? 78}%</b>
              </div>
              <div className="card stat">
                <span className="muted">Points</span>
                <b>{dashboardData?.stats?.points ?? 264}</b>
              </div>
            </div>

            <div className="grid g2 stack">
              {/* Accuracy by Difficulty */}
              <div className="card">
                <h3 style={{ marginBottom: '16px' }}>Accuracy by difficulty</h3>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span className="badge easy">Easy</span>
                    <b>{dashboardData?.accuracyByDifficulty?.Easy?.accuracy ?? 92}%</b>
                  </div>
                  <div className="bar easy" style={{ margin: '6px 0 0' }}>
                    <div style={{ width: `${dashboardData?.accuracyByDifficulty?.Easy?.accuracy ?? 92}%` }} />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span className="badge medium">Medium</span>
                    <b>{dashboardData?.accuracyByDifficulty?.Medium?.accuracy ?? 76}%</b>
                  </div>
                  <div className="bar medium" style={{ margin: '6px 0 0' }}>
                    <div style={{ width: `${dashboardData?.accuracyByDifficulty?.Medium?.accuracy ?? 76}%` }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span className="badge hard">Hard</span>
                    <b>{dashboardData?.accuracyByDifficulty?.Hard?.accuracy ?? 54}%</b>
                  </div>
                  <div className="bar hard" style={{ margin: '6px 0 0' }}>
                    <div style={{ width: `${dashboardData?.accuracyByDifficulty?.Hard?.accuracy ?? 54}%` }} />
                  </div>
                </div>
              </div>

              {/* Roadmap Teaser */}
              <div className="card">
                <div className="eyebrow">Your roadmap</div>
                <h3 style={{ margin: '8px 0 8px' }}>Next up: Operating Systems notes</h3>
                <p className="muted" style={{ margin: '0 0 12px' }}>
                  You scored 85% on Medium. Ready to move up to Hard.
                </p>
                <button
                  className="btn ghost"
                  style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  onClick={() => setScreen('roadmap')}
                >
                  Open Study Roadmap →
                </button>

                <div className="row" style={{ marginTop: '16px' }}>
                  <span className="grow">Revisit: process scheduling</span>
                  <span className="badge hard" style={{ fontSize: '0.72rem' }}>missed 3×</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= 5. ROADMAP SCREEN ================= */}
        {screen === 'roadmap' && (
          <section className="screen">
            <div style={{ marginBottom: '18px' }}>
              <div className="eyebrow">Personalised Learning Plan</div>
              <h2 style={{ marginTop: '4px' }}>Study Roadmap</h2>
              <p className="muted">Rules-based study recommendations tailored to your recent scores.</p>
            </div>

            {/* Next Steps per Source */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="eyebrow" style={{ marginBottom: '12px' }}>Recommended Next Steps</div>
              {roadmapData?.nextSteps?.map((ns, idx) => (
                <div key={idx} className="row">
                  <div className="grow">
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{ns.sourceTitle}</div>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                      {ns.recommendation}
                    </p>
                  </div>
                  <span className={`badge ${ns.badgeClass || 'medium'}`}>
                    {ns.action}
                  </span>
                </div>
              ))}
            </div>

            {/* 3-Session Weekly Practice Plan */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="eyebrow" style={{ marginBottom: '12px' }}>Weekly Practice Schedule</div>
              <div className="grid g4 stack" style={{ gap: '12px' }}>
                {roadmapData?.weeklyPlan?.map((wp, idx) => (
                  <div key={idx} className="card" style={{ padding: '14px', background: 'var(--bg)' }}>
                    <span className="badge auto" style={{ marginBottom: '6px' }}>{wp.day}</span>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{wp.title}</div>
                    <div className="muted" style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                      {wp.focus}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Missed Topics */}
            {roadmapData?.missedTopics?.length > 0 && (
              <div className="card">
                <div className="eyebrow" style={{ marginBottom: '12px' }}>Revisit These Topics</div>
                {roadmapData.missedTopics.map((m, idx) => (
                  <div key={idx} className="row">
                    <span className="grow" style={{ fontSize: '0.92rem' }}>{m.stem}</span>
                    <span className="badge hard" style={{ fontSize: '0.75rem' }}>
                      missed {m.missedCount}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================= 6. LEADERBOARD SCREEN ================= */}
        {screen === 'leaderboard' && (
          <section className="screen">
            <h2 style={{ marginBottom: '14px' }}>Leaderboard</h2>

            {/* Filter Chips */}
            <div className="chips">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  className="chip"
                  aria-pressed={lbDifficulty === diff}
                  onClick={() => {
                    setLbDifficulty(diff);
                    loadLeaderboard(diff, lbPeriod);
                  }}
                >
                  {diff}
                </button>
              ))}
              <button
                className="chip"
                aria-pressed={lbPeriod === 'week'}
                onClick={() => {
                  const newPer = lbPeriod === 'week' ? 'all' : 'week';
                  setLbPeriod(newPer);
                  loadLeaderboard(lbDifficulty, newPer);
                }}
              >
                {lbPeriod === 'week' ? '✓ This week' : 'This week'}
              </button>
            </div>

            <div className="card" style={{ padding: '10px 18px' }}>
              {leaderboardData.map((row) => (
                <div key={row.id} className={`row ${row.isCurrent ? 'me' : ''}`}>
                  <span className="rank">{row.rank}</span>
                  <span className="avatar">{row.initials}</span>
                  <span className="grow">
                    <b>{row.isCurrent ? 'You' : row.name}</b>
                    <br />
                    <small className="muted">
                      {row.quizzes} quizzes · {row.avgAccuracy}% accuracy
                    </small>
                  </span>
                  <b>{row.points} pts</b>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================= 7. HISTORY SCREEN ================= */}
        {screen === 'history' && (
          <section className="screen">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2>Learning History</h2>
              <div className="chips" style={{ margin: 0 }}>
                {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    className="chip"
                    aria-pressed={historyDiffFilter === diff}
                    onClick={() => {
                      setHistoryDiffFilter(diff);
                      // Trigger filtered load
                      const url = diff === 'All' ? '/api/attempts' : `/api/attempts?difficulty=${diff}`;
                      fetch(url).then(r => r.json()).then(d => setHistoryList(d.attempts || []));
                    }}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '10px 18px' }}>
              {historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px' }} className="muted">
                  No attempts found for this filter. Take a quiz to log your progress!
                </div>
              ) : (
                historyList.map((att) => (
                  <div key={att.id} className="row">
                    <span className={`badge ${att.difficulty?.toLowerCase() || 'medium'}`}>
                      {att.difficulty}
                    </span>
                    <span className="grow">
                      <b>{att.sourceTitle}</b>
                      <br />
                      <small className="muted">
                        Score: {att.score}/{att.totalQuestions} ({att.accuracy}%) · {new Date(att.createdAt).toLocaleDateString()}
                      </small>
                    </span>
                    <b style={{ marginRight: '10px' }}>+{att.points} pts</b>
                    <button
                      className="btn ghost"
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      onClick={() => handleOpenPastAttempt(att.id)}
                    >
                      Review
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Past Attempt Review Modal */}
            {reviewAttempt && (
              <div className="modal-overlay" onClick={() => setReviewAttempt(null)}>
                <div className="modal-card" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3>Attempt Review: {reviewAttempt.sourceTitle}</h3>
                    <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={() => setReviewAttempt(null)}>✕</button>
                  </div>
                  <div style={{ marginBottom: '14px', fontSize: '0.9rem' }} className="muted">
                    Difficulty: {reviewAttempt.difficulty} · Score: {reviewAttempt.score}/{reviewAttempt.totalQuestions} · +{reviewAttempt.points} pts
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reviewAttempt.answers?.map((ans, idx) => (
                      <div key={idx} className="card" style={{ padding: '12px', background: 'var(--bg)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{idx + 1}. {ans.q}</div>
                        <div style={{ color: ans.isCorrect ? 'var(--easy)' : 'var(--bad)', fontSize: '0.85rem', marginTop: '4px' }}>
                          Your choice: {ans.options?.[ans.selectedOption] || 'N/A'} {ans.isCorrect ? '✓' : '✗'}
                        </div>
                        {!ans.isCorrect && (
                          <div style={{ color: 'var(--easy)', fontSize: '0.85rem' }}>
                            Correct: {ans.options?.[ans.answer]}
                          </div>
                        )}
                        <div className="muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                          {ans.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Auth Modal */}
      {authModalOpen && (
        <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
              <button
                className="btn ghost"
                style={{ padding: '4px 10px' }}
                onClick={() => setAuthModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="alert-error" role="alert">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div style={{ marginBottom: '12px' }}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Abhi"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                  />
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label>Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn" style={{ width: '100%', marginBottom: '12px' }}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <button
              type="button"
              className="btn pop"
              style={{ width: '100%', marginBottom: '12px' }}
              onClick={handleDemoLogin}
            >
              Demo Sign In as Abhi
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem' }} className="muted">
              {authMode === 'login' ? (
                <span>Don't have an account? <button style={{ background: 'none', border: 0, color: 'var(--brand)', fontWeight: 700 }} onClick={() => setAuthMode('register')}>Register</button></span>
              ) : (
                <span>Already have an account? <button style={{ background: 'none', border: 0, color: 'var(--brand)', fontWeight: 700 }} onClick={() => setAuthMode('login')}>Sign In</button></span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

