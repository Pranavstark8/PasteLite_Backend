/**
 * Deterministic time utility for testing support
 * 
 * In TEST_MODE, this module allows overriding the current time
 * via the x-test-now-ms request header for reproducible tests.
 */

/**
 * Get current time in milliseconds
 * 
 * @param {Object} req - Express request object (optional)
 * @returns {number} Current time in milliseconds since epoch
 */
function getCurrentTime(req = null) {
  // Check if TEST_MODE is enabled
  const testMode = process.env.TEST_MODE === '1';
  
  if (testMode && req && req.headers && req.headers['x-test-now-ms']) {
    const testTime = parseInt(req.headers['x-test-now-ms'], 10);
    
    // Validate that the header contains a valid number
    if (!isNaN(testTime) && testTime > 0) {
      return testTime;
    }
  }
  
  // Fall back to actual current time
  return Date.now();
}

module.exports = {
  getCurrentTime
};
