'use strict';

const thresholdModel = require('../models/thresholdModel');
const thresholdAlertStateModel = require('../models/thresholdAlertStateModel');
const registerReadingModel = require('../models/registerReadingModel');
const userModel = require('../models/userModel');
const alertRecipientModel = require('../models/alertRecipientModel');
const emailService = require('./emailService');
const { logger } = require('../utils/logger');
const { tableForGroup, isActiveStatus } = require('../utils/readingTables');

/**
 * Email alerts for thresholds.
 *
 * Every ACTIVE threshold sends an email to the users selected for it on the Alert Recipients page
 * (ThresholdEmailNotifyUsers). It does not depend on the SMS switch: SMS is a separate channel,
 * sent by the BE service on site.
 *
 * Two ways a reading gets here:
 *  - processReading(s): readings posted to the API (POST /readings)
 *  - checkLatestReadings: the newest stored reading of every active threshold. The BE service writes
 *    readings straight into the database, so this is what sends the emails for real data.
 *
 * An email is sent when a value goes out of range (ThresholdAlertStates remembers that it did),
 * and again only after the value has been back inside the limits.
 */
class ThresholdMonitorService {
  _getViolation(threshold, value) {
    const minValue = threshold.MinValue !== null ? Number(threshold.MinValue) : null;
    const maxValue = threshold.MaxValue !== null ? Number(threshold.MaxValue) : null;

    if (minValue !== null && value < minValue) {
      return `Warning: Threshold #${threshold.ThresholdId} for ${threshold.RegisterName} is below its minimum of ${minValue}.`;
    }
    if (maxValue !== null && value > maxValue) {
      return `Warning: Threshold #${threshold.ThresholdId} for ${threshold.RegisterName} is above its maximum of ${maxValue}.`;
    }
    return null;
  }

  /**
   * One value against one threshold. Returns true when an alert email was started.
   * With waitForEmail the emails are finished when this returns, otherwise they are sent in the background.
   */
  async _evaluate({ threshold, value, recordedAt, userId, waitForEmail = false }) {
    const warning = this._getViolation(threshold, value);
    const isActive = Number(threshold.IsActive) === 1;
    const hasNewViolation = await thresholdAlertStateModel.updateViolation(
      threshold.ThresholdId,
      isActive && Boolean(warning)
    );

    if (!isActive || !warning || !hasNewViolation) return false;

    const sending = this._dispatchEmail({
      userId: Number(userId),
      threshold,
      currentValue: value,
      warning,
      recordedAt: recordedAt || new Date(),
    });

    if (waitForEmail) await sending;
    return true;
  }

  async _processReading(reading, userId, thresholds) {
    const currentValue = Number(reading.scaledValue);
    if (!Number.isFinite(currentValue)) return;

    for (const threshold of thresholds) {
      await this._evaluate({ threshold, value: currentValue, recordedAt: reading.recordedAt, userId });
    }
  }

  async processReading(reading, userId) {
    const thresholds = await thresholdModel.findByRegisterId(reading.registerId);
    await this._processReading(reading, userId, thresholds);
  }

  async processReadings(readings, userId) {
    const thresholdsByRegister = new Map();
    for (const reading of readings) {
      if (!thresholdsByRegister.has(reading.registerId)) {
        thresholdsByRegister.set(
          reading.registerId,
          await thresholdModel.findByRegisterId(reading.registerId)
        );
      }
      await this._processReading(reading, userId, thresholdsByRegister.get(reading.registerId));
    }
  }

  /**
   * Check the newest stored reading of every active threshold.
   * Run on a timer (alertMonitorScheduler) or by POST /alert-monitor/run.
   * @returns {Promise<{thresholds:number, checked:number, alerts:number}>}
   */
  async checkLatestReadings() {
    const thresholds = await thresholdModel.findAllActiveForMonitor();

    // Registers of one group share a readings table; inactive registers store no readings
    const byTable = new Map();
    for (const threshold of thresholds) {
      if (!isActiveStatus(threshold.RegisterStatus)) continue;
      const table = tableForGroup(threshold.RegisterGroup);
      if (!table) continue;
      if (!byTable.has(table)) byTable.set(table, []);
      byTable.get(table).push(threshold);
    }

    let checked = 0;
    let alerts = 0;

    for (const [table, list] of byTable) {
      const registerIds = [...new Set(list.map((t) => t.RegisterId))];
      const latest = new Map(
        (await registerReadingModel.findLatestValues(table, registerIds)).map((r) => [r.RegisterId, r])
      );

      for (const threshold of list) {
        const reading = latest.get(threshold.RegisterId);
        const value = reading ? Number(reading.ScaledValue) : NaN;
        if (!Number.isFinite(value)) continue;

        checked += 1;
        try {
          const sent = await this._evaluate({
            threshold,
            value,
            recordedAt: reading.RecordedAt,
            userId: NaN,
            waitForEmail: true,
          });
          if (sent) alerts += 1;
        } catch (error) {
          logger.error('Threshold check failed', { thresholdId: threshold.ThresholdId, error: error.message });
        }
      }
    }

    return { thresholds: thresholds.length, checked, alerts };
  }

  /**
   * Who gets the alert email:
   * 1. The users selected for this threshold on the Alert Recipients page (ThresholdEmailNotifyUsers).
   * 2. If nobody is selected, the user who sent the readings (x-user-id), as before.
   */
  async _getEmailRecipients(threshold, userId) {
    const selected = await alertRecipientModel.findEmailRecipients(threshold.ThresholdId);
    if (selected.length > 0) return selected;

    if (!Number.isSafeInteger(userId) || userId < 1) {
      logger.warn('Threshold alert email skipped: no email recipients selected and no valid sender user ID', {
        thresholdId: threshold.ThresholdId,
      });
      return [];
    }

    const user = await userModel.findById(userId);
    if (!user || !user.Email) {
      logger.warn('Threshold alert email skipped because the selected user has no registered email', {
        userId,
        thresholdId: threshold.ThresholdId,
      });
      return [];
    }
    return [user];
  }

  async _dispatchEmail({ userId, threshold, currentValue, warning, recordedAt }) {
    let recipients;
    try {
      recipients = await this._getEmailRecipients(threshold, userId);
    } catch (error) {
      logger.error('Failed to look up threshold alert email recipients', {
        thresholdId: threshold.ThresholdId,
        error: error.message,
      });
      return;
    }

    // One email per recipient, so addresses are not shared and one failure does not stop the others
    for (const user of recipients) {
      try {
        await emailService.sendThresholdNotification({
          recipient: user.Email,
          threshold,
          currentValue,
          warning,
          recordedAt,
        });
        logger.info('Threshold alert email sent', {
          userId: user.UserId,
          thresholdId: threshold.ThresholdId,
        });
      } catch (error) {
        logger.error('Failed to send threshold alert email', {
          userId: user.UserId,
          thresholdId: threshold.ThresholdId,
          error: error.message,
        });
      }
    }
  }
}

module.exports = new ThresholdMonitorService();
