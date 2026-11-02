'use strict';

const { body, param } = require('express-validator');
const { MODBUS_DATA_TYPES, REGISTER_ACTIONS, MODBUS_FUNCTION_CODES } = require('../utils/constants');

const createRegisterDefinitionValidator = [
  body('deviceId')
    .notEmpty().withMessage('Device ID is required')
    .isInt({ min: 1 }).withMessage('Device ID must be a positive integer'),

  body('registerName')
    .trim()
    .notEmpty().withMessage('Register name is required')
    .isLength({ min: 1, max: 255 }).withMessage('Register name must be 1-255 characters'),

  body('action')
    .notEmpty().withMessage('Action is required')
    .isIn(Object.values(REGISTER_ACTIONS))
    .withMessage(`Action must be one of: ${Object.values(REGISTER_ACTIONS).join(', ')}`),

  body('functionCode')
    .notEmpty().withMessage('Function code is required')
    .isInt({ min: 1, max: 25 })
    .withMessage('Function code must be a valid Modbus function code (1-25)')
    .custom((val) => {
      const validCodes = Object.values(MODBUS_FUNCTION_CODES);
      if (!validCodes.includes(parseInt(val))) {
        throw new Error(`Function code must be one of: ${validCodes.join(', ')}`);
      }
      return true;
    }),

  body('dataType')
    .notEmpty().withMessage('Data type is required')
    .isIn(Object.values(MODBUS_DATA_TYPES))
    .withMessage(`Data type must be one of: ${Object.values(MODBUS_DATA_TYPES).join(', ')}`),

  body('startAddress')
    .notEmpty().withMessage('Start address is required')
    .isInt({ min: 0, max: 65535 }).withMessage('Start address must be between 0 and 65535'),

  body('registerCount')
    .notEmpty().withMessage('Register count is required')
    .isInt({ min: 1, max: 125 }).withMessage('Register count must be between 1 and 125'),

  body('scaleFactor')
    .optional({ nullable: true })
    .matches(/^[\d./-]+$|^-$/)
    .withMessage('Scale factor must be a valid numeric expression or "-"'),

  body('unit')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Unit must not exceed 50 characters'),
];

const updateRegisterDefinitionValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),

  body('registerName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('Register name must be 1-255 characters'),

  body('action')
    .optional()
    .isIn(Object.values(REGISTER_ACTIONS))
    .withMessage(`Action must be one of: ${Object.values(REGISTER_ACTIONS).join(', ')}`),

  body('functionCode')
    .optional()
    .isInt({ min: 1, max: 25 })
    .withMessage('Function code must be a valid Modbus function code'),

  body('dataType')
    .optional()
    .isIn(Object.values(MODBUS_DATA_TYPES))
    .withMessage(`Data type must be one of: ${Object.values(MODBUS_DATA_TYPES).join(', ')}`),

  body('startAddress')
    .optional()
    .isInt({ min: 0, max: 65535 }).withMessage('Start address must be between 0 and 65535'),

  body('registerCount')
    .optional()
    .isInt({ min: 1, max: 125 }).withMessage('Register count must be between 1 and 125'),

  body('scaleFactor')
    .optional({ nullable: true })
    .matches(/^[\d./-]+$|^-$/)
    .withMessage('Scale factor must be a valid numeric expression or "-"'),

  body('unit')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Unit must not exceed 50 characters'),
];

const registerIdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),
];

module.exports = {
  createRegisterDefinitionValidator,
  updateRegisterDefinitionValidator,
  registerIdValidator,
};
