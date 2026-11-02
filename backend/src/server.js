'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const app = require('./app');
const { logger } = require('./utils/logger');
const db = require('./config/database');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function bootstrap() {
  try {
    // Test database connection
    await db.testConnection();
    logger.info('✅ Database connection established successfully');

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
      logger.info(`📡 API Base URL: http://localhost:${PORT}${process.env.API_PREFIX || '/api/v1'}`);
      logger.info(`📋 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`\n🔴 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await db.pool.end();
          logger.info('✅ Database connection pool closed');
          logger.info('👋 Server shut down successfully');
          process.exit(0);
        } catch (err) {
          logger.error('❌ Error during shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = { bootstrap };
