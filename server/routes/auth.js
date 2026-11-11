/**
 * server/routes/auth.js
 * Authentication endpoints (register, login, logout, me) with bcrypt and JWT.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db.js');
const { JWT_SECRET, optionalAuth } = require('../middleware/auth.js');

const router = express.Router();

// Helper to generate initials (e.g. "Anoop Kumar" -> "AK")
function extractInitials(name) {
  if (!name || typeof name !== 'string') return 'QK';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanName = (name && typeof name === 'string' && name.trim()) || email.split('@')[0];
  const initials = extractInitials(cleanName);
  const db = getDatabase();

  const existing = db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  db.run(
    'INSERT INTO users (id, email, password_hash, name, initials, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, email.toLowerCase().trim(), passwordHash, cleanName, initials, now]
  );

  const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

  res.cookie('quizk_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.status(201).json({
    user: { id: userId, email: email.toLowerCase().trim(), name: cleanName, initials, createdAt: now }
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = getDatabase();
  const user = db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  res.cookie('quizk_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      initials: user.initials,
      createdAt: user.created_at
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('quizk_token', {
    httpOnly: true,
    sameSite: 'lax'
  });
  return res.json({ success: true, message: 'Signed out successfully.' });
});

// GET /api/me
router.get('/me', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  return res.json({ user: req.user });
});

module.exports = router;

