'use strict';

const { HTTP_STATUS, PAGINATION } = require('./constants');

/**
 * Standard success response
 */
function successResponse(res, data, message = 'Success', statusCode = HTTP_STATUS.OK) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Paginated success response
 */
function paginatedResponse(res, data, pagination, message = 'Success') {
  return res.status(HTTP_STATUS.OK)
    .set('X-Total-Count', pagination.total)
    .set('X-Page', pagination.page)
    .set('X-Per-Page', pagination.limit)
    .json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
}

/**
 * Created response (201)
 */
function createdResponse(res, data, message = 'Resource created successfully') {
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * No content response (204)
 */
function noContentResponse(res) {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}

/**
 * Error response
 */
function errorResponse(res, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
}

/**
 * Validation error response (422)
 */
function validationErrorResponse(res, errors) {
  return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
    success: false,
    message: 'Validation failed',
    errors,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Parse pagination params from request query
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  return { page, limit };
}

/**
 * Parse sort params from request query
 */
function parseSort(query, allowedFields = [], defaultField = 'CreatedAt', defaultOrder = 'DESC') {
  const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : defaultField;
  const sortOrder = ['ASC', 'DESC'].includes((query.sortOrder || '').toUpperCase())
    ? query.sortOrder.toUpperCase()
    : defaultOrder;
  return { sortBy, sortOrder };
}

module.exports = {
  successResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
  validationErrorResponse,
  parsePagination,
  parseSort,
};
