/**
 * server/middleware/auth.js
 * JWT authentication middleware for QUIZK.
 * Compatible with both synchronous and asynchronous database layers.
 */

const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db.js');

const JWT_SECRET = process.env.JWT_SECRET || 'quizk_default_secret_jwt_key_2026';

/**
 * Extracts and verifies JWT from httpOnly cookie or Authorization header.
 * Attaches user to req.user if authenticated; otherwise req.user is null.
 */
async function optionalAuth(req, res, next) {
  const token = req.cookies?.quizk_token || req.headers?.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDatabase();
    const user = await db.get('SELECT id, email, name, initials, created_at FROM users WHERE id = ?', [decoded.id]);
    req.user = user || null;
  } catch {
    req.user = null;
  }

  next();
}

/**
 * Requires authenticated user. Returns 401 if missing.
 */
function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    next();
  });
}

module.exports = {
  JWT_SECRET,
  optionalAuth,
  requireAuth
};
