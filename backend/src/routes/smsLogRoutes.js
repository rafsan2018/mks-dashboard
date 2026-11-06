'use strict';

const router = require('express').Router();
const { query } = require('express-validator');
const smsLogModel = require('../models/smsLogModel');
const { validate } = require('../middleware/validate');
const { successResponse } = require('../utils/apiResponse');

// GET /api/v1/sms-log?limit=100&status=FAILED  - Newest SMS first, with the count of the last 7 days
router.get('/',
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500'),
  query('status').optional().isIn(['SENT', 'FAILED', 'PENDING']).withMessage('status must be SENT, FAILED or PENDING'),
  validate,
  async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const status = req.query.status || null;
      const [rows, last7Days] = await Promise.all([
        smsLogModel.findRecent({ limit, status }),
        smsLogModel.countByStatus(),
      ]);
      return successResponse(res, { rows, last7Days }, 'SMS log retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
