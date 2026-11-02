'use strict';

const {
  successResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
  validationErrorResponse,
  parsePagination,
  parseSort,
} = require('../../src/utils/apiResponse');
const { HTTP_STATUS } = require('../../src/utils/constants');

describe('API Response Utilities', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      statusCode: null,
      headers: {},
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      set(key, value) {
        this.headers[key] = value;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      send() {
        return this;
      },
    };
  });

  test('successResponse returns 200 with standard structure', () => {
    successResponse(mockRes, { foo: 'bar' }, 'Custom Message');
    expect(mockRes.statusCode).toBe(HTTP_STATUS.OK);
    expect(mockRes.body.success).toBe(true);
    expect(mockRes.body.message).toBe('Custom Message');
    expect(mockRes.body.data).toEqual({ foo: 'bar' });
    expect(mockRes.body.timestamp).toBeDefined();
  });

  test('createdResponse returns 201', () => {
    createdResponse(mockRes, { id: 1 }, 'Created');
    expect(mockRes.statusCode).toBe(HTTP_STATUS.CREATED);
    expect(mockRes.body.success).toBe(true);
    expect(mockRes.body.data).toEqual({ id: 1 });
  });

  test('noContentResponse returns 204', () => {
    noContentResponse(mockRes);
    expect(mockRes.statusCode).toBe(HTTP_STATUS.NO_CONTENT);
  });

  test('errorResponse returns correct error code and format', () => {
    errorResponse(mockRes, 'Something went wrong', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(mockRes.statusCode).toBe(500);
    expect(mockRes.body.success).toBe(false);
    expect(mockRes.body.message).toBe('Something went wrong');
  });

  test('validationErrorResponse returns 422 with errors array', () => {
    const errors = [{ field: 'email', message: 'Invalid email' }];
    validationErrorResponse(mockRes, errors);
    expect(mockRes.statusCode).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(mockRes.body.success).toBe(false);
    expect(mockRes.body.errors).toEqual(errors);
  });

  test('paginatedResponse sets header metadata and pagination payload', () => {
    const pagination = { total: 50, page: 2, limit: 10, totalPages: 5, hasNext: true, hasPrev: true };
    paginatedResponse(mockRes, [1, 2, 3], pagination);
    expect(mockRes.statusCode).toBe(200);
    expect(mockRes.headers['X-Total-Count']).toBe(50);
    expect(mockRes.headers['X-Page']).toBe(2);
    expect(mockRes.headers['X-Per-Page']).toBe(10);
    expect(mockRes.body.pagination).toEqual(pagination);
  });

  test('parsePagination extracts safe integers with boundaries', () => {
    expect(parsePagination({ page: '3', limit: '15' })).toEqual({ page: 3, limit: 15 });
    expect(parsePagination({ page: '-5', limit: '500' })).toEqual({ page: 1, limit: 100 });
    expect(parsePagination({})).toEqual({ page: 1, limit: 20 });
  });

  test('parseSort validates sort fields and orders', () => {
    const allowed = ['Name', 'CreatedAt'];
    expect(parseSort({ sortBy: 'Name', sortOrder: 'asc' }, allowed)).toEqual({
      sortBy: 'Name',
      sortOrder: 'ASC',
    });
    expect(parseSort({ sortBy: 'HackedField', sortOrder: 'invalid' }, allowed)).toEqual({
      sortBy: 'CreatedAt',
      sortOrder: 'DESC',
    });
  });
});
