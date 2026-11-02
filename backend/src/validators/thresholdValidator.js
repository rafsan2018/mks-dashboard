'use strict';

const { body, param, query } = require('express-validator');
const { SEVERITIES } = require('../utils/constants');

const allowedSeverities = [SEVERITIES.CRITICAL, SEVERITIES.WARNING, SEVERITIES.INFO];

const createThresholdValidator = [
  body('registerId')
    .notEmpty().withMessage('Register ID is required')
    .isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),



  body('minValue')
    .optional({ nullable: true })
    .isNumeric().withMessage('Min value must be a valid number'),

  body('maxValue')
    .optional({ nullable: true })
    .isNumeric().withMessage('Max value must be a valid number'),

  body('severity')
    .optional()
    .isIn(allowedSeverities).withMessage(`Severity must be one of: ${allowedSeverities.join(', ')}`),

  body('smsEnabled')
    .optional()
    .custom(val => val === 0 || val === 1 || typeof val === 'boolean')
    .withMessage('smsEnabled must be 0, 1, or boolean'),

  body('isActive')
    .optional()
    .custom(val => val === 0 || val === 1 || typeof val === 'boolean')
    .withMessage('isActive must be 0, 1, or boolean'),
];

const updateThresholdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Threshold ID must be a positive integer'),

  body('registerId')
    .optional()
    .isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),



  body('minValue')
    .optional({ nullable: true })
    .isNumeric().withMessage('Min value must be a valid number'),

  body('maxValue')
    .optional({ nullable: true })
    .isNumeric().withMessage('Max value must be a valid number'),

  body('severity')
    .optional()
    .isIn(allowedSeverities).withMessage(`Severity must be one of: ${allowedSeverities.join(', ')}`),

  body('smsEnabled')
    .optional()
    .custom(val => val === 0 || val === 1 || typeof val === 'boolean')
    .withMessage('smsEnabled must be 0, 1, or boolean'),

  body('isActive')
    .optional()
    .custom(val => val === 0 || val === 1 || typeof val === 'boolean')
    .withMessage('isActive must be 0, 1, or boolean'),
];

const thresholdIdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Threshold ID must be a positive integer'),
];

const thresholdQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('registerId')
    .optional()
    .isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),

  query('deviceId')
    .optional()
    .isInt({ min: 1 }).withMessage('Device ID must be a positive integer'),

  query('severity')
    .optional()
    .isIn(allowedSeverities).withMessage(`Severity must be one of: ${allowedSeverities.join(', ')}`),
];

module.exports = {
  createThresholdValidator,
  updateThresholdValidator,
  thresholdIdValidator,
  thresholdQueryValidator,
};
