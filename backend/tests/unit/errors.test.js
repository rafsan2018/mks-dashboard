'use strict';

const {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} = require('../../src/utils/errors');

describe('Custom Error Classes', () => {
  test('AppError sets default values correctly', () => {
    const err = new AppError('Server error', 500);
    expect(err.message).toBe('Server error');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err.name).toBe('AppError');
  });

  test('NotFoundError defaults to 404 and formats resource name', () => {
    const err = new NotFoundError('Device');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Device not found');
  });

  test('ValidationError sets 422 and optional error details', () => {
    const details = [{ field: 'portName', msg: 'Required' }];
    const err = new ValidationError('Invalid data', details);
    expect(err.statusCode).toBe(422);
    expect(err.errors).toEqual(details);
  });

  test('UnauthorizedError sets 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
  });

  test('ForbiddenError sets 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Access denied');
  });

  test('ConflictError sets 409', () => {
    const err = new ConflictError('Duplicate key');
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Duplicate key');
  });
});
