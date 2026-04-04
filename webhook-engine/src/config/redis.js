/**
 * Redis Client Configuration
 *
 * Creates and exports a Redis client using the REDIS_URL
 * environment variable. Connection is established on startup.
 */

const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('connect',      () => logger.info('Redis client connected'));
redisClient.on('error',    (err) => logger.error('Redis client error', err.message));
redisClient.on('reconnecting', () => logger.warn('Redis client reconnecting...'));

/**
 * Connect to Redis. Called once during application startup.
 */
async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info('Redis connection established');
  } catch (err) {
    logger.error('Failed to connect to Redis', err.message);
    throw err;
  }
}

/**
 * GET a key and return its parsed JSON value, or null if missing/invalid.
 * @param {string} key
 * @returns {Promise<object|null>}
 */
async function getWithTimestamp(key) {
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    logger.error('getWithTimestamp failed', err.message);
    return null;
  }
}

module.exports = { redisClient, connectRedis, getWithTimestamp };
