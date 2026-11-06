'use strict';

const crypto = require('crypto');
const router = require('express').Router();
const alertMonitorScheduler = require('../services/alertMonitorScheduler');
const { successResponse } = require('../utils/apiResponse');

const sameText = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// POST /api/v1/alert-monitor/run
// Runs the threshold email check now. For a cron job:
//   curl -X POST -H "x-monitor-token: <ALERT_MONITOR_TOKEN>" https://<dashboard>/api/v1/alert-monitor/run
// Needs ALERT_MONITOR_TOKEN in backend/.env; without it the endpoint is switched off.
router.post('/run', async (req, res, next) => {
  try {
    const token = process.env.ALERT_MONITOR_TOKEN;
    if (!token) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    if (!sameText(req.get('x-monitor-token') || '', token)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await alertMonitorScheduler.runOnce();
    return successResponse(res, result || { skipped: true }, result ? 'Threshold check finished' : 'A check is already running');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
