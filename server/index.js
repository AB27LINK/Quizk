/**
 * server/index.js
 * Express server entry point for QUIZK ("No Cap, Just Facts.")
 */

require('dotenv').config();
const path = require('path');

// Vercel's filesystem is read-only except for /tmp. This SQLite database is
// ephemeral on serverless deployments; use a managed database for persistence.
if (process.env.VERCEL && !process.env.DB_PATH) {
  process.env.DB_PATH = path.join('/tmp', 'quizk.db');
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.js');
const sourcesRoutes = require('./routes/sources.js');
const quizRoutes = require('./routes/quiz.js');
const attemptsRoutes = require('./routes/attempts.js');
const statsRoutes = require('./routes/stats.js');
const { getDatabase } = require('./db.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database schema and seeds
getDatabase();

// Standard middlewares
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/attempts', attemptsRoutes);
app.use('/api', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'QUIZK', timestamp: new Date().toISOString() });
});

// Serve frontend build in production
const clientDist = process.env.VERCEL\n  ? path.resolve(__dirname, '../public')\n  : path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));

// Catch-all route to client index.html for SPA routing in production
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Global 404 for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'An unexpected internal server error occurred.'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 QUIZK server running on http://localhost:${PORT}`);
    console.log(`📚 "No Cap, Just Facts."`);
  });
}

module.exports = app;

