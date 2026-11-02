'use strict';

const { body, param, query } = require('express-validator');

const createReadingValidator = [
  body('registerId')
    .notEmpty().withMessage('Register ID is required')
    .isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),

  body('rawValue')
    .notEmpty().withMessage('Raw value is required')
    .isFloat().withMessage('Raw value must be a number'),

  body('scaledValue')
    .notEmpty().withMessage('Scaled value is required')
    .isFloat().withMessage('Scaled value must be a number'),

  body('recordedAt')
    .optional()
    .isISO8601().withMessage('RecordedAt must be a valid ISO 8601 datetime'),
];

const bulkCreateReadingValidator = [
  body()
    .isArray({ min: 1, max: 500 }).withMessage('Request body must be an array of 1-500 readings'),

  body('*.registerId')
    .notEmpty().withMessage('Register ID is required')
    .isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),

  body('*.rawValue')
    .notEmpty().withMessage('Raw value is required')
    .isFloat().withMessage('Raw value must be a number'),

  body('*.scaledValue')
    .notEmpty().withMessage('Scaled value is required')
    .isFloat().withMessage('Scaled value must be a number'),

  body('*.recordedAt')
    .optional()
    .isISO8601().withMessage('RecordedAt must be a valid ISO 8601 datetime'),
];

const readingQueryValidator = [
  query('registerId')
    .optional()
    .isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),

  query('deviceId')
    .optional()
    .isInt({ min: 1 }).withMessage('Device ID must be a positive integer'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid ISO 8601 datetime'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid ISO 8601 datetime')
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate < req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  query('timeRange')
    .optional()
    .isIn(['1h', '6h', '24h', '7d', '30d']).withMessage('Time range must be 1h, 6h, 24h, 7d, or 30d'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const readingIdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Reading ID must be a positive integer'),
];

module.exports = {
  createReadingValidator,
  bulkCreateReadingValidator,
  readingQueryValidator,
  readingIdValidator,
};
