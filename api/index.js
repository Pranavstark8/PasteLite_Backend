/**
 * Vercel Serverless Entry Point
 * Exports the Express app for Vercel's serverless functions
 */

const app = require('../src/server');

module.exports = app;
