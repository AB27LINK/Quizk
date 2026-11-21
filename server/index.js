/**
 * server/index.js
 * Express server entry point for QUIZK ("No Cap, Just Facts.")
 * Optimized for local development and Vercel Serverless deployments.
 */

require('dotenv').config();
const path = require('path');
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

// Initialize database schema and demo seeds
getDatabase();

// Standard middlewares
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// URL Normalization Middleware:
// Vercel serverless function rewrites may pass '/api/index.js' or strip '/api'.
// We normalize the URL so route resolution is bulletproof.
app.use((req, res, next) => {
  if (req.url.startsWith('/api/index.js')) {
    req.url = req.url.replace('/api/index.js', '') || '/';
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') || process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Centralized API Router
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'QUIZK',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'vercel-serverless' : 'standard'
  });
});

// Route groupings
apiRouter.use('/auth', authRoutes);
apiRouter.use('/sources', sourcesRoutes);
apiRouter.use('/quiz', quizRoutes);
apiRouter.use('/attempts', attemptsRoutes);
apiRouter.use('/', statsRoutes);

// Direct session check endpoint (/api/me)
const { optionalAuth } = require('./middleware/auth.js');
apiRouter.get('/me', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  return res.json({ user: req.user });
});

// Mount the API Router on BOTH '/api' and '/'
// Why: When running locally or with standard rewrites, requests arrive with '/api/...'.
// In some serverless proxies or edge rewrites, the '/api' prefix may be stripped.
// Mounting on both paths guarantees that every endpoint resolves reliably without 404s.
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Fallback JSON 404 for any unmatched API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl || req.url}` });
});

// Local static asset serving (only active during standalone local Express execution)
// On Vercel, static assets in client/dist are served directly by the edge CDN.
if (!process.env.VERCEL) {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const indexPath = path.join(clientDist, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  });
}

// Global 404 fallback - guarantees JSON response for API or serverless invocations
app.use((req, res) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl || req.url}` });
});

// Global error handler - guarantees JSON error responses
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
