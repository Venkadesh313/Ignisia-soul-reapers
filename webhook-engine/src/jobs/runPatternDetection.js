const { detectPatterns } = require('../services/patternDetector');

/**
 * Background job to execute AI pattern detection asynchronously.
 */
function startPatternDetectionJob() {
  console.log('[INFO] AI Pattern Detection Job Scheduler Started');
  
  // Run on startup
  setTimeout(detectPatterns, 5000);

  // Run every 10 seconds for immediate hackathon demonstration (usually 5 mins in production)
  setInterval(() => {
    detectPatterns().catch(err => {
      console.error('[runPatternDetection] Job execution failed:', err);
    });
  }, 10 * 1000);
}

module.exports = { startPatternDetectionJob };
