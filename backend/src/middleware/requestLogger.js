'use strict';

const { logger } = require('../utils/logger');

/**
 * Custom request logger middleware
 * Logs request details and response time
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const user = req.user?.Username || 'anonymous';

    const logData = {
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip,
      user,
    };

    if (statusCode >= 500) {
      logger.error('Request completed with server error', logData);
    } else if (statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.http('Request completed', logData);
    }
  });

  next();
}

module.exports = { requestLogger };
