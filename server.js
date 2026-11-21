/**
 * server.js
 * Standalone root entry point for local execution or cloud container hosting.
 */

require('dotenv').config();
const app = require('./server/index.js');

module.exports = app;
