'use strict';

const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

/**
 * Global rate limiter - applies to all API routes
 */
const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
    });
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Strict rate limiter for auth endpoints
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    timestamp: new Date().toISOString(),
  },
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit exceeded:', {
      ip: req.ip,
      body: { username: req.body?.username },
    });
    res.status(options.statusCode).json(options.message);
  },
});

const testEmailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many test emails. Please try again after 15 minutes.',
    timestamp: new Date().toISOString(),
  },
  handler: (req, res, next, options) => {
    logger.warn('Test email rate limit exceeded:', { ip: req.ip });
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Readings rate limiter - slightly more permissive for data-heavy endpoints
 */
const readingsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests to readings endpoint. Please slow down.',
    timestamp: new Date().toISOString(),
  },
});

module.exports = { globalRateLimiter, authRateLimiter, readingsRateLimiter, testEmailRateLimiter };
