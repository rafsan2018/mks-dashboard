'use strict';

const thresholdMonitorService = require('./thresholdMonitorService');
const { logger } = require('../utils/logger');

/**
 * Runs the threshold email check on a timer.
 *
 * ALERT_POLL_SECONDS (backend/.env): seconds between checks. Default 60. 0 = no timer.
 * Hosting that stops idle Node apps (some cPanel setups) can also call POST /api/v1/alert-monitor/run
 * from a cron job (see routes/alertMonitorRoutes.js).
 */
class AlertMonitorScheduler {
  constructor() {
    this.timer = null;
    this.firstRun = null;
    this.running = false;
  }

  get intervalSeconds() {
    const raw = process.env.ALERT_POLL_SECONDS;
    const seconds = raw === undefined || raw === '' ? 60 : Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? Math.max(10, seconds) : 0;
  }

  start() {
    if (this.timer || process.env.NODE_ENV === 'test') return;

    const seconds = this.intervalSeconds;
    if (seconds === 0) {
      logger.info('Threshold email check timer is off (ALERT_POLL_SECONDS = 0)');
      return;
    }

    this.firstRun = setTimeout(() => this.runOnce(), 5000);
    this.timer = setInterval(() => this.runOnce(), seconds * 1000);
    this.firstRun.unref();
    this.timer.unref();
    logger.info(`Threshold email check runs every ${seconds} seconds`);
  }

  stop() {
    clearTimeout(this.firstRun);
    clearInterval(this.timer);
    this.timer = null;
    this.firstRun = null;
  }

  /** One check. Returns null if the previous check is still running. */
  async runOnce() {
    if (this.running) return null;
    this.running = true;
    try {
      const result = await thresholdMonitorService.checkLatestReadings();
      if (result.alerts > 0) logger.info('Threshold email check finished', result);
      return result;
    } catch (error) {
      logger.error('Threshold email check failed', { error: error.message });
      return null;
    } finally {
      this.running = false;
    }
  }
}

module.exports = new AlertMonitorScheduler();
