'use strict';

module.exports = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  // Pagination Defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // User Roles
  ROLES: {
    ADMIN: 'Admin',
    OPERATOR: 'Operator',
    VIEWER: 'Viewer',
  },

  // Modbus Function Codes
  MODBUS_FUNCTION_CODES: {
    READ_COILS: 1,
    READ_DISCRETE_INPUTS: 2,
    READ_HOLDING_REGISTERS: 3,
    READ_INPUT_REGISTERS: 4,
    WRITE_SINGLE_COIL: 5,
    WRITE_SINGLE_REGISTER: 6,
    WRITE_MULTIPLE_COILS: 15,
    WRITE_MULTIPLE_REGISTERS: 16,
  },

  // Modbus Data Types
  MODBUS_DATA_TYPES: {
    UINT16: 'UInt16',
    INT16: 'Int16',
    UINT32: 'UInt32',
    INT32: 'Int32',
    FLOAT32: 'Float32',
    FLOAT64: 'Float64',
    BOOLEAN: 'Boolean',
    STRING: 'String',
  },

  // Register Actions
  REGISTER_ACTIONS: {
    READ_ONLY: 'RO',
    WRITE_ONLY: 'WO',
    READ_WRITE: 'RW',
  },

  // Comport Protocols
  COMPORT_PROTOCOLS: {
    MODBUS_RTU: 'Modbus RTU',
    MODBUS_TCP: 'Modbus TCP',
    MODBUS_ASCII: 'Modbus ASCII',
  },

  // Parity Options
  PARITY_OPTIONS: ['None', 'Even', 'Odd', 'Mark', 'Space'],

  // Token Types
  TOKEN_TYPES: {
    ACCESS: 'access',
    REFRESH: 'refresh',
  },

  // Sort Orders
  SORT_ORDERS: {
    ASC: 'ASC',
    DESC: 'DESC',
  },

  // Time Ranges for Readings
  TIME_RANGES: {
    LAST_HOUR: '1h',
    LAST_6_HOURS: '6h',
    LAST_24_HOURS: '24h',
    LAST_7_DAYS: '7d',
    LAST_30_DAYS: '30d',
    CUSTOM: 'custom',
  },

  // Threshold Severities
  SEVERITIES: {
    CRITICAL: 'Critical',
    WARNING: 'Warning',
    INFO: 'Info',
  },
};
