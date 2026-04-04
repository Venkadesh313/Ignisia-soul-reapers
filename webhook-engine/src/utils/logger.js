/**
 * Simple Console Logger with Timestamps
 * 
 * Provides info, warn, and error methods that prefix
 * each log line with an ISO 8601 timestamp and log level.
 */

/**
 * Format the current timestamp as ISO 8601
 * @returns {string} Formatted timestamp
 */
function timestamp() {
  return new Date().toISOString();
}

const logger = {
  /**
   * Log an informational message
   * @param {string} message - Primary message
   * @param  {...any} args   - Additional data to log
   */
  info(message, ...args) {
    console.log(`[${timestamp()}] [INFO]  ${message}`, ...args);
  },

  /**
   * Log a warning message
   * @param {string} message - Primary message
   * @param  {...any} args   - Additional data to log
   */
  warn(message, ...args) {
    console.warn(`[${timestamp()}] [WARN]  ${message}`, ...args);
  },

  /**
   * Log an error message
   * @param {string} message - Primary message
   * @param  {...any} args   - Additional data to log
   */
  error(message, ...args) {
    console.error(`[${timestamp()}] [ERROR] ${message}`, ...args);
  },
};

module.exports = logger;
