'use strict';

const thresholdModel = require('../models/thresholdModel');
const thresholdAlertStateModel = require('../models/thresholdAlertStateModel');
const userModel = require('../models/userModel');
const alertRecipientModel = require('../models/alertRecipientModel');
const emailService = require('./emailService');
const { logger } = require('../utils/logger');

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

  async _processReading(reading, userId, thresholds) {
    const currentValue = Number(reading.scaledValue);
    if (!Number.isFinite(currentValue)) return;

    for (const threshold of thresholds) {
      const warning = this._getViolation(threshold, currentValue);
      const isActive = Number(threshold.IsActive) === 1;
      const hasNewViolation = await thresholdAlertStateModel.updateViolation(
        threshold.ThresholdId,
        isActive && Boolean(warning)
      );

      if (!isActive || !warning || !hasNewViolation || Number(threshold.SMSEnabled) !== 1) {
        continue;
      }

      this._dispatchEmail({
        userId: Number(userId),
        threshold,
        currentValue,
        warning,
        recordedAt: reading.recordedAt || new Date(),
      });
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
