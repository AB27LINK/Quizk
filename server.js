// Root Express entry point for Vercel.
// Vercel detects Express apps from a recognized root entry file that imports express.
require('dotenv').config();
require('express');
const app = require('./server/index.js');

module.exports = app;
