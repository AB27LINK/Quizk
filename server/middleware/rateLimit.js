/**
 * server/middleware/rateLimit.js
 * In-memory sliding-window rate limiter for /api/quiz
 */

const ipRequestMap = new Map();

/**
 * Limits requests to 10 per minute per IP or authenticated user.
 */
function quizRateLimiter(req, res, next) {
  const key = req.user?.id || req.ip || req.connection.remoteAddress || 'global_client';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  const timestamps = ipRequestMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Maximum 10 quiz generations per minute. Please try again in a moment.'
    });
  }

  validTimestamps.push(now);
  ipRequestMap.set(key, validTimestamps);
  next();
}

module.exports = {
  quizRateLimiter
};

