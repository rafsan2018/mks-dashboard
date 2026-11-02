'use strict';

const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'elliance_mks',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+00:00',
  dateStrings: false,
  multipleStatements: false,
  // Prevent SQL injection via prepared statements
  namedPlaceholders: true,
  typeCast: function (field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      const val = field.string();
      return val === null ? null : (val === '1' ? 1 : 0);
    }
    if (field.type === 'BIT') {
      const buf = field.buffer();
      return buf && buf.length > 0 ? (buf[0] === 1 ? 1 : 0) : 0;
    }
    return next();
  },
};

const pool = mysql.createPool(dbConfig);

/**
 * Test database connectivity
 */
async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    logger.info(`📦 Connected to MySQL database: ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}`);
  } finally {
    connection.release();
  }
}

/**
 * Execute a query with named placeholders
 * @param {string} sql - SQL query string
 * @param {object|array} params - Query parameters
 * @returns {Promise<[rows, fields]>}
 */
async function query(sql, params = []) {
  try {
    const [rows, fields] = await pool.query(sql, params);
    return [rows, fields];
  } catch (error) {
    logger.error('Database query error:', { sql, error: error.message });
    throw error;
  }
}

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Async function receiving connection
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Transaction rolled back:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Build a paginated query with total count
 * @param {string} baseQuery - Base SQL without LIMIT/OFFSET
 * @param {string} countQuery - Count SQL
 * @param {array} params - Query parameters
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Promise<{data: Array, pagination: Object}>}
 */
async function paginatedQuery(baseQuery, countQuery, params = [], page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (p - 1) * l;
  const paginatedSql = `${baseQuery} LIMIT ? OFFSET ?`;

  const [[{ total }]] = await pool.query(countQuery, params);
  const [data] = await pool.query(paginatedSql, [...params, l, offset]);

  return {
    data,
    pagination: {
      total: parseInt(total, 10) || 0,
      page: p,
      limit: l,
      totalPages: Math.ceil((total || 0) / l),
      hasNext: p < Math.ceil((total || 0) / l),
      hasPrev: p > 1,
    },
  };
}

module.exports = {
  pool,
  query,
  transaction,
  paginatedQuery,
  testConnection,
};
