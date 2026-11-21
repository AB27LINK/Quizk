const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const app = require('../server/index.js');

/**
 * Dispatches an HTTP request directly to the Express app via native IncomingMessage and ServerResponse.
 * Runs 100% in-memory with zero TCP socket overhead.
 */
function request(app, { method = 'GET', url = '/', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const req = new http.IncomingMessage(socket);
    const res = new http.ServerResponse(req);

    req.method = method;
    req.url = url;
    req.headers = { ...headers };

    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = String(Buffer.byteLength(payload));
    }

    let out = '';
    res.write = (chunk) => {
      if (chunk) out += chunk;
      return true;
    };

    res.end = (chunk) => {
      if (chunk) out += chunk;
      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        text: () => Promise.resolve(out),
        json: () => Promise.resolve(out ? JSON.parse(out) : null)
      });
    };

    try {
      app(req, res);
      if (payload) {
        req.push(payload);
      }
      req.push(null);
    } catch (err) {
      reject(err);
    }
  });
}

test('GET /api/health returns ok', async () => {
  const res = await request(app, { method: 'GET', url: '/api/health' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.name, 'QUIZK');
});

test('POST /api/auth/login authenticates demo user and issues cookie', async () => {
  const res = await request(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: { email: 'abhi@quizk.dev', password: 'password123' }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.user.email, 'abhi@quizk.dev');
  assert.equal(data.user.name, 'Abhi');
  const cookie = res.headers['set-cookie'];
  assert.ok(cookie && String(cookie).includes('quizk_token='));

  // Verify GET /api/me works with the issued cookie
  const meRes = await request(app, {
    method: 'GET',
    url: '/api/me',
    headers: { cookie: Array.isArray(cookie) ? cookie.join('; ') : String(cookie) }
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.user?.email, 'abhi@quizk.dev');
});

test('POST /api/quiz rejects notes under 200 characters', async () => {
  const res = await request(app, {
    method: 'POST',
    url: '/api/quiz',
    body: { source: 'Too short text', count: 5, difficulty: 'Medium' }
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /too short/);
});

test('POST /api/quiz generates quiz from source text', async () => {
  const sampleNotes = `
Operating Systems: Process Management and CPU Scheduling.
A process is a program in execution. A process includes the current activity,
as represented by the value of the Program Counter (PC) and the contents of the processor registers.
The Process Control Block (PCB) is a data structure in the operating system kernel containing the information needed to manage a particular process.
It contains process state, program counter, CPU registers, CPU-scheduling information, and memory management information.
Context switching occurs when the CPU switches from executing one process to another.
The state of the currently executing process is saved in its PCB, and the state of the new process is loaded from its PCB.
Context switching is pure overhead because the system does no useful work while switching.
CPU Scheduling algorithms determine which process in the ready queue is allocated the CPU.
Round Robin scheduling is designed especially for time-sharing systems with a time quantum.
`;

  const res = await request(app, {
    method: 'POST',
    url: '/api/quiz',
    body: {
      source: sampleNotes,
      count: 5,
      difficulty: 'Easy',
      language: 'English'
    }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.quizId);
  assert.equal(data.effectiveDifficulty, 'Easy');
  assert.equal(data.questions.length, 5);

  const firstQ = data.questions[0];
  assert.ok(firstQ.q);
  assert.equal(firstQ.options.length, 4);
  assert.ok(firstQ.answer >= 0 && firstQ.answer <= 3);
  assert.ok(firstQ.explanation);
});

test('GET /api/dashboard returns complete metrics', async () => {
  const res = await request(app, { method: 'GET', url: '/api/dashboard' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.stats);
  assert.ok(data.stats.quizzes > 0);
  assert.ok(data.accuracyByDifficulty.Easy);
  assert.ok(data.accuracyByDifficulty.Medium);
  assert.ok(data.accuracyByDifficulty.Hard);
});

test('GET /api/leaderboard returns ranked list with filters', async () => {
  const res = await request(app, { method: 'GET', url: '/api/leaderboard?difficulty=All&period=all' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.leaderboard));
  assert.ok(data.leaderboard.length >= 3);
  assert.equal(data.leaderboard[0].rank, 1);
});

test('GET /api/roadmap returns next steps and weekly plan', async () => {
  const res = await request(app, { method: 'GET', url: '/api/roadmap' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.nextSteps));
  assert.equal(data.weeklyPlan.length, 3);
});

test('api/index.js serverless handler bridges requests correctly', async () => {
  const serverlessHandler = require('../api/index.js');
  const res = await request(serverlessHandler, { method: 'GET', url: '/api/health' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.name, 'QUIZK');
});

test('Endpoints respond even if serverless proxy strips /api prefix', async () => {
  const res = await request(app, { method: 'GET', url: '/health' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
});

test('Unmatched API routes return JSON 404 and never HTML', async () => {
  const res = await request(app, { method: 'GET', url: '/api/nonexistent-route' });
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.ok(data.error);
  assert.match(data.error, /not found/i);
});

test('POST /api/attempts calculates score and persists attempt', async () => {
  const res = await request(app, {
    method: 'POST',
    url: '/api/attempts',
    body: {
      quizId: 'qiz_test_01',
      difficulty: 'Hard',
      answers: [
        { isCorrect: true, questionId: 'q1' },
        { isCorrect: true, questionId: 'q2' },
        { isCorrect: false, questionId: 'q3' }
      ],
      timeTakenSeconds: 35
    }
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.score, 2);
  assert.equal(data.totalQuestions, 3);
  assert.equal(data.difficulty, 'Hard');
  // Hard difficulty multiplier = 2.0 -> 2 * 2.0 = 4 points
  assert.equal(data.points, 4.0);
  assert.equal(data.accuracy, 67);
});
