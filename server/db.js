/**
 * server/db.js
 * Universal Database Layer for QUIZK ("No Cap, Just Facts.")
 *
 * Persistence Strategy:
 * 1. Cloud Serverless Mode (Production Persistence):
 *    When TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in Vercel environment variables,
 *    Quizk communicates with Turso (libSQL) over HTTP. This provides 100% persistence across
 *    serverless cold starts without native C++ compilation dependencies.
 *
 * 2. Local SQLite Mode (Dev / Test / Zero-config Serverless):
 *    Uses Node 22 built-in node:sqlite or better-sqlite3 with WAL mode.
 *    In ephemeral serverless environments without Turso credentials, uses /tmp/quizk.db
 *    and auto-initializes the schema and demo seeds.
 */

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbInstance = null;

/**
 * Turso / libSQL HTTP pipeline client (zero external dependencies).
 */
function createTursoClient(url, token) {
  const endpoint = url.replace(/^libsql:\/\//, 'https://').replace(/\/$/, '') + '/v2/pipeline';

  function formatArgs(params = []) {
    return params.map((p) => {
      if (p === null || p === undefined) return { type: 'null' };
      if (typeof p === 'boolean') return { type: 'integer', value: p ? '1' : '0' };
      if (typeof p === 'number') {
        return Number.isInteger(p) ? { type: 'integer', value: String(p) } : { type: 'float', value: p };
      }
      return { type: 'text', value: String(p) };
    });
  }

  async function pipeline(statements) {
    const requests = statements.map((st) => ({
      type: 'execute',
      stmt: {
        sql: st.sql,
        args: formatArgs(st.params || [])
      }
    }));
    requests.push({ type: 'close' });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Turso HTTP Pipeline error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  function parseResult(item) {
    if (!item) return { rows: [], changes: 0, lastInsertRowid: null };
    if (item.type === 'error') {
      throw new Error(`Turso execution error: ${item.error?.message || 'Unknown database error'}`);
    }
    const res = item.response?.result;
    if (!res) return { rows: [], changes: 0, lastInsertRowid: null };

    const colNames = (res.cols || []).map((c) => c.name);
    const rows = (res.rows || []).map((r) => {
      const obj = {};
      colNames.forEach((colName, idx) => {
        const cell = r[idx];
        if (cell === null || cell === undefined || cell.type === 'null') {
          obj[colName] = null;
        } else if (cell.type === 'integer' || cell.type === 'float') {
          obj[colName] = Number(cell.value);
        } else {
          obj[colName] = cell.value;
        }
      });
      return obj;
    });

    return {
      rows,
      changes: res.affected_row_count || 0,
      lastInsertRowid: res.last_insert_rowid || null
    };
  }

  return {
    isCloud: true,
    all: async (sql, params = []) => {
      const results = await pipeline([{ sql, params }]);
      return parseResult(results[0]).rows;
    },
    get: async (sql, params = []) => {
      const results = await pipeline([{ sql, params }]);
      const rows = parseResult(results[0]).rows;
      return rows.length > 0 ? rows[0] : null;
    },
    run: async (sql, params = []) => {
      const results = await pipeline([{ sql, params }]);
      const parsed = parseResult(results[0]);
      return { changes: parsed.changes, lastInsertRowid: parsed.lastInsertRowid };
    },
    exec: async (sql) => {
      const stmts = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => ({ sql: s, params: [] }));

      if (stmts.length === 0) return;
      await pipeline(stmts);
    }
  };
}

/**
 * Initializes and returns the active database connection.
 */
function getDatabase() {
  if (dbInstance) return dbInstance;

  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    console.log('[DB] Connecting to persistent Turso / libSQL cloud database...');
    dbInstance = createTursoClient(tursoUrl, tursoToken);
    initSchema(dbInstance);
    seedDemoData(dbInstance);
    return dbInstance;
  }

  // Fallback to local SQLite
  const DB_PATH = process.env.DB_PATH || (process.env.VERCEL ? path.join('/tmp', 'quizk.db') : path.resolve(__dirname, '../quizk.db'));

  if (process.env.VERCEL) {
    console.log('[DB] Notice: Using ephemeral /tmp SQLite storage. For permanent cloud persistence across serverless cold starts, set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel project settings.');
  }

  try {
    const betterSqlite3 = require('better-sqlite3');
    const db = betterSqlite3(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    dbInstance = {
      isCloud: false,
      all: (sql, params = []) => db.prepare(sql).all(params),
      get: (sql, params = []) => db.prepare(sql).get(params),
      run: (sql, params = []) => db.prepare(sql).run(params),
      exec: (sql) => db.exec(sql)
    };
  } catch {
    // Built-in node:sqlite fallback (Node 22+)
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA foreign_keys = ON;');

    dbInstance = {
      isCloud: false,
      all: (sql, params = []) => db.prepare(sql).all(...params),
      get: (sql, params = []) => db.prepare(sql).get(...params),
      run: (sql, params = []) => db.prepare(sql).run(...params),
      exec: (sql) => db.exec(sql)
    };
  }

  initSchema(dbInstance);
  seedDemoData(dbInstance);

  return dbInstance;
}

/**
 * Initializes schema tables and indexes.
 */
function initSchema(db) {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      char_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      effective_difficulty TEXT NOT NULL,
      language TEXT NOT NULL,
      question_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      q TEXT NOT NULL,
      options TEXT NOT NULL,
      answer INTEGER NOT NULL,
      explanation TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT,
      source_id TEXT,
      user_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      time_taken_seconds INTEGER NOT NULL,
      points REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attempt_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT,
      selected_option INTEGER,
      is_correct INTEGER NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sources_user ON sources(user_id);
    CREATE INDEX IF NOT EXISTS idx_quizzes_source ON quizzes(source_id);
    CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_source ON attempts(source_id);
  `;

  if (db.isCloud) {
    db.exec(schemaSql).catch((err) => console.error('[DB Cloud Schema Init Error]', err));
  } else {
    db.exec(schemaSql);
  }
}

/**
 * Seeds demo data if database is empty.
 */
async function seedDemoData(db) {
  try {
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', ['abhi@quizk.dev']);
    if (existingUser) return; // already seeded

    const passwordHash = bcrypt.hashSync('password123', 10);
    const now = new Date().toISOString();

    // 1. Primary demo user: Abhi
    const abhiId = 'usr_abhi_01';
    await db.run(
      'INSERT INTO users (id, email, password_hash, name, initials, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [abhiId, 'abhi@quizk.dev', passwordHash, 'Abhi', 'AB', now]
    );

    // 2. Leaderboard competitors
    const competitors = [
      { id: 'usr_riya_02', email: 'riya@quizk.dev', name: 'Riya S.', initials: 'RS', points: 412, quizzes: 31, accuracy: 91 },
      { id: 'usr_manav_03', email: 'manav@quizk.dev', name: 'Manav K.', initials: 'MK', points: 368, quizzes: 28, accuracy: 84 },
      { id: 'usr_priya_04', email: 'priya@quizk.dev', name: 'Priya D.', initials: 'PD', points: 231, quizzes: 19, accuracy: 80 }
    ];

    for (const c of competitors) {
      await db.run(
        'INSERT INTO users (id, email, password_hash, name, initials, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.email, passwordHash, c.name, c.initials, now]
      );

      // Seed dummy attempts so leaderboard math works dynamically
      const correctPerQuiz = Math.round((c.points / c.quizzes) / 1.5);
      for (let i = 0; i < c.quizzes; i++) {
        const attDate = new Date(Date.now() - (i % 6) * 86400000).toISOString();
        const diff = i % 3 === 0 ? 'Hard' : (i % 2 === 0 ? 'Medium' : 'Easy');
        const mult = diff === 'Hard' ? 2.0 : (diff === 'Medium' ? 1.5 : 1.0);
        const score = Math.min(8, Math.max(4, Math.round(correctPerQuiz)));
        await db.run(
          `INSERT INTO attempts (id, quiz_id, source_id, user_id, difficulty, score, total_questions, time_taken_seconds, points, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`att_seed_${c.id}_${i}`, null, null, c.id, diff, score, 8, 45, Math.round(score * mult * 10) / 10, attDate]
        );
      }
    }

    // 3. Seed sample source for Abhi: Operating Systems
    const osSourceId = 'src_os_notes_01';
    const osContent = `Operating Systems: Process Management and CPU Scheduling

A process is a program in execution. The execution of a process must progress in a sequential fashion. A process includes the current activity, as represented by the value of the Program Counter (PC) and the contents of the processor's registers. A process generally also includes the process stack, which contains temporary data such as function parameters, return addresses, and local variables.

The Process Control Block (PCB) is a data structure in the operating system kernel containing the information needed to manage a particular process. It contains:
1. Process state: new, ready, running, waiting, or terminated.
2. Program counter: indicates the address of the next instruction to be executed for this process.
3. CPU registers: accumulators, index registers, stack pointers, and general-purpose registers.
4. CPU-scheduling information: process priority, pointers to scheduling queues, and other scheduling parameters.
5. Memory-management information: base and limit registers or page tables.

Context switching occurs when the CPU switches from executing one process to another. The state of the currently executing process is saved in its PCB, and the state of the new process is loaded from its PCB. Context switching is pure overhead because the system does no useful work while switching. Its speed varies from machine to machine, typically requiring a few microseconds.

CPU Scheduling algorithms determine which process in the ready queue is allocated the CPU:
- First-Come, First-Served (FCFS): The process that requests the CPU first is allocated the CPU first. It can lead to the convoy effect where short processes wait behind one long process.
- Shortest-Job-Next (SJN) / Shortest-Job-First (SJF): Associates with each process the length of its next CPU burst. It is provably optimal in terms of minimizing average waiting time.
- Round Robin (RR): Designed especially for time-sharing systems. A small unit of time called a time quantum or time slice (typically 10 to 100 milliseconds) is defined. The ready queue is treated as a circular FIFO queue.
- Multilevel Feedback Queue Scheduling: Allows a process to move between queues based on the characteristics of its CPU bursts. If a process uses too much CPU time, it will be moved to a lower-priority queue.

A race condition occurs when multiple processes access and manipulate the same shared data concurrently and the outcome of the execution depends on the particular order in which the access takes place. To prevent race conditions, concurrent processes must be synchronized. The critical-section problem requires three conditions to be met: Mutual Exclusion, Progress, and Bounded Waiting.`;

    await db.run(
      'INSERT INTO sources (id, user_id, title, content, char_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [osSourceId, abhiId, 'Operating Systems: Process Management', osContent, osContent.length, now]
    );

    // 4. Seed sample attempts for Abhi (24 quizzes, 264 points, streak of 5 days)
    const diffs = ['Easy', 'Medium', 'Hard'];
    for (let i = 0; i < 24; i++) {
      const dayOffset = (i % 5);
      const attDate = new Date(Date.now() - dayOffset * 86400000 - (i * 3600000)).toISOString();
      const diff = diffs[i % 3];
      const mult = diff === 'Hard' ? 2.0 : (diff === 'Medium' ? 1.5 : 1.0);
      const score = diff === 'Easy' ? 7 : (diff === 'Medium' ? 6 : 4);
      const totalQ = 8;
      const pts = Math.round(score * mult * 10) / 10;
      const attId = `att_abhi_${i}`;

      await db.run(
        `INSERT INTO attempts (id, quiz_id, source_id, user_id, difficulty, score, total_questions, time_taken_seconds, points, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [attId, null, osSourceId, abhiId, diff, score, totalQ, 55, pts, attDate]
      );

      if (score < totalQ) {
        await db.run(
          `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option, is_correct)
           VALUES (?, ?, ?, ?, ?)`,
          [`ans_abhi_${i}_1`, attId, 'q_process_scheduling', 1, 0]
        );
      }
    }
  } catch (err) {
    console.error('[DB Seed Error]', err);
  }
}

module.exports = {
  getDatabase
};
