'use strict';

const { body, param } = require('express-validator');

const createDeviceValidator = [
  body('deviceName')
    .trim()
    .notEmpty().withMessage('Device name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Device name must be 2-255 characters'),

  body('deviceModel')
    .trim()
    .notEmpty().withMessage('Device model is required')
    .isLength({ min: 1, max: 100 }).withMessage('Device model must be 1-100 characters'),

  body('comportId')
    .notEmpty().withMessage('Comport ID is required')
    .isInt({ min: 1 }).withMessage('Comport ID must be a positive integer'),

  body('slaveAddress')
    .notEmpty().withMessage('Slave address is required')
    .isInt({ min: 1, max: 247 }).withMessage('Slave address must be between 1 and 247'),

  body('location')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Location must not exceed 255 characters'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('IsActive must be a boolean'),
];

const updateDeviceValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Device ID must be a positive integer'),

  body('deviceName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Device name must be 2-255 characters'),

  body('deviceModel')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Device model must be 1-100 characters'),

  body('comportId')
    .optional()
    .isInt({ min: 1 }).withMessage('Comport ID must be a positive integer'),

  body('slaveAddress')
    .optional()
    .isInt({ min: 1, max: 247 }).withMessage('Slave address must be between 1 and 247'),

  body('location')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 }).withMessage('Location must not exceed 255 characters'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('IsActive must be a boolean'),
];

const deviceIdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Device ID must be a positive integer'),
];

module.exports = { createDeviceValidator, updateDeviceValidator, deviceIdValidator };
