/**
 * api/index.js
 * Vercel Serverless Function entry point for QUIZK.
 * Bridges incoming Vercel serverless requests directly to the Express application.
 */

const app = require('../server/index.js');

module.exports = (req, res) => {
  return app(req, res);
};
