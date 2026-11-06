'use strict';

const { logger } = require('../utils/logger');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  let { statusCode = 500, message, errors } = err;

  // Handle MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'A record with this value already exists';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenced resource does not exist';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 409;
    message = 'Cannot delete: resource is referenced by other records';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Database connection refused. Please try again later.';
  }


  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    statusCode = 403;
    message = 'CORS policy does not allow this origin';
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?.UserId || 'anonymous',
    });
  } else {
    logger.warn('Client Error:', {
      message,
      url: req.originalUrl,
      method: req.method,
      statusCode,
    });
  }

  const response = {
    success: false,
    message: statusCode >= 500 &&
      process.env.NODE_ENV === 'production' &&
      !['SMTP_GREETING_TIMEOUT', 'SMTP_AUTH_FAILED', 'SMTP_NOT_CONFIGURED'].includes(err.code)
      ? 'An internal server error occurred'
      : message,
    timestamp: new Date().toISOString(),
  };

  if (errors) response.errors = errors;

  if (process.env.NODE_ENV === 'development' &&
      statusCode >= 500 &&
      !String(err.code || '').startsWith('SMTP_')) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { errorHandler, notFoundHandler };
