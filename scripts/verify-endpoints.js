/**
 * scripts/verify-endpoints.js
 * Comprehensive automated HTTP audit testing every backend endpoint against the live server.
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (postData) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let isJson = false;
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : {};
          isJson = true;
        } catch {}

        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'] || '',
          setCookie: res.headers['set-cookie'] || [],
          raw: data,
          isJson,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  const results = [];
  let authCookie = '';

  const sampleOSNotes = `Operating Systems: Process Management and CPU Scheduling.
A process is a program in execution. The execution of a process must progress in a sequential fashion.
A process includes the current activity, as represented by the value of the Program Counter (PC) and processor registers.
The Process Control Block (PCB) is a data structure in the operating system kernel containing the information needed to manage a particular process.
It contains process state, program counter, CPU registers, CPU-scheduling information, and memory management information.
Context switching occurs when the CPU switches from executing one process to another.
The state of the currently executing process is saved in its PCB, and the state of the new process is loaded from its PCB.
Context switching is pure overhead because the system does no useful work while switching.`;

  const customNotes = `Software Architecture and Clean Code Patterns.
Clean architecture emphasizes separation of concerns across multiple layers: entities, use cases, interface adapters, and frameworks.
The Dependency Inversion Principle dictates that high-level modules should not depend on low-level modules; both should depend on abstractions.
Domain entities encapsulate enterprise-wide business rules and remain completely decoupled from database mechanics or user interface changes.
Unit testing benefits substantially from isolated domain layers that execute in memory without external database or network round-trips.`;

  console.log('================================================================');
  console.log('🧪 QUIZK LIVE ENDPOINT VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // 1. Health Check
  {
    const res = await request({ path: '/api/health', method: 'GET' });
    const pass = res.statusCode === 200 && res.isJson && res.body.status === 'ok';
    results.push({
      name: 'GET /api/health',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Status ok, name=${res.body.name}, env=${res.body.environment}` : 'Unexpected response'
    });
  }

  // 2. Auth: Register
  const testEmail = `test_${Date.now()}@quizk.dev`;
  {
    const res = await request(
      { path: '/api/auth/register', method: 'POST' },
      JSON.stringify({ email: testEmail, password: 'securePassword123', name: 'Test Runner' })
    );
    const pass = res.statusCode === 201 && res.isJson && res.body.user?.email === testEmail;
    if (res.setCookie.length > 0) {
      authCookie = res.setCookie[0].split(';')[0];
    }
    results.push({
      name: 'POST /api/auth/register',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Created user ${res.body.user.id}, cookie issued` : 'Registration failed'
    });
  }

  // 3. Auth: Login
  {
    const res = await request(
      { path: '/api/auth/login', method: 'POST' },
      JSON.stringify({ email: 'abhi@quizk.dev', password: 'password123' })
    );
    const pass = res.statusCode === 200 && res.isJson && res.body.user?.name === 'Abhi';
    if (res.setCookie.length > 0) {
      authCookie = res.setCookie[0].split(';')[0];
    }
    results.push({
      name: 'POST /api/auth/login',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Logged in Abhi (initials: ${res.body.user.initials}), session cookie acquired` : 'Login failed'
    });
  }

  // 4. Auth: Me (Session Check)
  {
    const res = await request({
      path: '/api/me',
      method: 'GET',
      headers: { Cookie: authCookie }
    });
    const pass = res.statusCode === 200 && res.isJson && res.body.user?.email === 'abhi@quizk.dev';
    results.push({
      name: 'GET /api/me',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Session authenticated for ${res.body.user.name}` : 'Session failed'
    });
  }

  // 5. Sources: Create Source
  let createdSourceId = null;
  {
    const res = await request(
      {
        path: '/api/sources',
        method: 'POST',
        headers: { Cookie: authCookie }
      },
      JSON.stringify({ title: 'Clean Architecture Notes', content: customNotes })
    );
    const pass = res.statusCode === 201 && res.isJson && res.body.source?.title === 'Clean Architecture Notes';
    createdSourceId = res.body.source?.id;
    results.push({
      name: 'POST /api/sources',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Created source ID: ${createdSourceId}` : 'Source creation failed'
    });
  }

  // 6. Sources: List Sources
  {
    const res = await request({
      path: '/api/sources',
      method: 'GET',
      headers: { Cookie: authCookie }
    });
    const pass = res.statusCode === 200 && res.isJson && Array.isArray(res.body.sources) && res.body.sources.length > 0;
    results.push({
      name: 'GET /api/sources',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Retrieved ${res.body.sources.length} sources` : 'Sources listing failed'
    });
  }

  // 7. Quiz Generation: Sample Text (OS Notes)
  let generatedQuiz = null;
  {
    const res = await request(
      { path: '/api/quiz', method: 'POST', headers: { Cookie: authCookie } },
      JSON.stringify({ source: sampleOSNotes, count: 5, difficulty: 'Medium', title: 'OS Sample' })
    );
    const pass = res.statusCode === 200 && res.isJson && res.body.questions?.length === 5;
    generatedQuiz = res.body;
    results.push({
      name: 'POST /api/quiz (Sample Text)',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Generated ${res.body.questions.length} questions, effectiveDiff=${res.body.effectiveDifficulty}` : 'Quiz generation failed'
    });
  }

  // 8. Quiz Generation: Custom Text (Clean Architecture)
  {
    const res = await request(
      { path: '/api/quiz', method: 'POST', headers: { Cookie: authCookie } },
      JSON.stringify({ source: customNotes, count: 8, difficulty: 'Hard', title: 'Clean Architecture Quiz' })
    );
    const pass = res.statusCode === 200 && res.isJson && res.body.questions?.length === 8;
    results.push({
      name: 'POST /api/quiz (Custom Text)',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Generated ${res.body.questions.length} questions at Hard difficulty` : 'Custom quiz failed'
    });
  }

  // 9. Quiz Generation: Input Validation (Text < 200 chars rejects with 400)
  {
    const res = await request(
      { path: '/api/quiz', method: 'POST' },
      JSON.stringify({ source: 'Too short text', count: 5, difficulty: 'Easy' })
    );
    const pass = res.statusCode === 400 && res.isJson && /too short/i.test(res.body.error);
    results.push({
      name: 'POST /api/quiz (Validation Reject)',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Correctly rejected: "${res.body.error}"` : 'Failed to reject invalid input'
    });
  }

  // 10. Quiz Submission: Submit Attempt
  let attemptId = null;
  {
    const answers = (generatedQuiz?.questions || []).map((q, idx) => ({
      questionId: q.id,
      selectedOption: idx % 2 === 0 ? q.answer : (q.answer + 1) % 4,
      isCorrect: idx % 2 === 0
    }));

    const res = await request(
      { path: '/api/attempts', method: 'POST', headers: { Cookie: authCookie } },
      JSON.stringify({
        quizId: generatedQuiz?.quizId,
        sourceId: generatedQuiz?.sourceId,
        difficulty: 'Medium',
        answers,
        timeTakenSeconds: 42
      })
    );
    const pass = res.statusCode === 201 && res.isJson && typeof res.body.score === 'number' && typeof res.body.points === 'number';
    attemptId = res.body.attemptId;
    results.push({
      name: 'POST /api/attempts',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Attempt ${attemptId} saved: score=${res.body.score}/${res.body.totalQuestions}, points=${res.body.points}` : 'Attempt submission failed'
    });
  }

  // 11. Results / History: List Attempts
  {
    const res = await request({
      path: '/api/attempts',
      method: 'GET',
      headers: { Cookie: authCookie }
    });
    const pass = res.statusCode === 200 && res.isJson && Array.isArray(res.body.attempts) && res.body.attempts.length > 0;
    results.push({
      name: 'GET /api/attempts',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Retrieved ${res.body.attempts.length} attempts in history` : 'History listing failed'
    });
  }

  // 12. Results / History: Single Attempt Detail Review
  {
    const res = await request({
      path: `/api/attempts/${attemptId}`,
      method: 'GET',
      headers: { Cookie: authCookie }
    });
    const pass = res.statusCode === 200 && res.isJson && res.body.attempt?.id === attemptId && Array.isArray(res.body.attempt?.answers);
    results.push({
      name: 'GET /api/attempts/:id',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Review loaded for attempt ${attemptId} with ${res.body.attempt.answers.length} answers` : 'Attempt review failed'
    });
  }

  // 13. Dashboard Endpoint
  {
    const res = await request({
      path: '/api/dashboard',
      method: 'GET',
      headers: { Cookie: authCookie }
    });
    const pass = res.statusCode === 200 && res.isJson && res.body.stats?.quizzes > 0 && res.body.accuracyByDifficulty;
    results.push({
      name: 'GET /api/dashboard',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Stats: quizzes=${res.body.stats.quizzes}, points=${res.body.stats.points}, streak=${res.body.stats.streak}d` : 'Dashboard failed'
    });
  }

  // 14. Roadmap Endpoint
  {
    const res = await request({
      path: '/api/roadmap',
      method: 'GET',
      headers: { Cookie: authCookie }
    });
    const pass = res.statusCode === 200 && res.isJson && Array.isArray(res.body.nextSteps) && Array.isArray(res.body.weeklyPlan);
    results.push({
      name: 'GET /api/roadmap',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Roadmap: ${res.body.nextSteps.length} next steps, ${res.body.weeklyPlan.length} weekly sessions` : 'Roadmap failed'
    });
  }

  // 15. Leaderboard Endpoint
  {
    const res = await request({
      path: '/api/leaderboard?difficulty=All&period=all',
      method: 'GET'
    });
    const pass = res.statusCode === 200 && res.isJson && Array.isArray(res.body.leaderboard) && res.body.leaderboard.length >= 3;
    results.push({
      name: 'GET /api/leaderboard',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Rank 1: ${res.body.leaderboard[0].name} (${res.body.leaderboard[0].points} pts)` : 'Leaderboard failed'
    });
  }

  // 16. Fallback Unmatched Route (Verify JSON 404, NEVER HTML)
  {
    const res = await request({
      path: '/api/nonexistent-route-audit',
      method: 'GET'
    });
    const pass = res.statusCode === 404 && res.isJson && /not found/i.test(res.body.error);
    results.push({
      name: 'GET /api/nonexistent (JSON 404 Guard)',
      statusCode: res.statusCode,
      contentType: res.contentType,
      isJson: res.isJson,
      pass,
      details: pass ? `Returned JSON 404: "${res.body.error}"` : 'Failed JSON 404 guard'
    });
  }

  // Print Formatted Table
  console.log('| Endpoint | HTTP Status | Content-Type | Valid JSON? | Result | Details |');
  console.log('|---|---|---|---|---|---|');
  for (const r of results) {
    const statusIcon = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`| \`${r.name}\` | \`${r.statusCode}\` | \`${r.contentType}\` | ${r.isJson ? 'Yes' : 'No'} | **${statusIcon}** | ${r.details} |`);
  }

  const allPassed = results.every((r) => r.pass);
  console.log('\n================================================================');
  console.log(`Summary: ${results.filter((r) => r.pass).length}/${results.length} endpoints passed.`);
  console.log(`Status: ${allPassed ? 'ALL AUDIT TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('================================================================');

  if (!allPassed) process.exit(1);
}

run().catch((err) => {
  console.error('[Verification Runner Error]', err);
  process.exit(1);
});

