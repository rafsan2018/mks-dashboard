'use strict';

const alertRecipientModel = require('../models/alertRecipientModel');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { logger } = require('../utils/logger');

const unique = (ids = []) => [...new Set(ids.map(Number))];
const hasText = (value) => typeof value === 'string' && value.trim() !== '';

class AlertRecipientService {
  async getAllRecipients() {
    return alertRecipientModel.findAll();
  }

  /**
   * Save the Email and SMS recipients of one or more thresholds.
   * Each item replaces that threshold's lists completely (an empty list removes everyone).
   */
  async saveRecipients(items) {
    const normalized = items.map(item => ({
      thresholdId: Number(item.thresholdId),
      emailUserIds: unique(item.emailUserIds),
      smsUserIds: unique(item.smsUserIds),
    }));

    const thresholdIds = unique(normalized.map(i => i.thresholdId));
    if (thresholdIds.length !== normalized.length) {
      throw new ValidationError('Each threshold may appear only once per request');
    }

    const existingThresholds = new Set(await alertRecipientModel.findExistingThresholdIds(thresholdIds));
    const missingThreshold = thresholdIds.find(id => !existingThresholds.has(id));
    if (missingThreshold) throw new NotFoundError(`Threshold with ID ${missingThreshold}`);

    const allUserIds = unique(normalized.flatMap(i => [...i.emailUserIds, ...i.smsUserIds]));
    const users = new Map((await alertRecipientModel.findUsersByIds(allUserIds)).map(u => [u.UserId, u]));

    const missingUser = allUserIds.find(id => !users.has(id));
    if (missingUser) throw new NotFoundError(`User with ID ${missingUser}`);

    const errors = [];
    for (const item of normalized) {
      for (const userId of item.emailUserIds) {
        if (!hasText(users.get(userId).Email)) {
          errors.push({ field: 'emailUserIds', message: `${users.get(userId).Username} has no email address`, value: userId });
        }
      }
      for (const userId of item.smsUserIds) {
        if (!hasText(users.get(userId).PhoneNumber)) {
          errors.push({ field: 'smsUserIds', message: `${users.get(userId).Username} has no phone number`, value: userId });
        }
      }
    }
    if (errors.length > 0) {
      throw new ValidationError('Some selected users cannot receive this alert type', errors);
    }

    const result = await alertRecipientModel.replaceMany(normalized);
    logger.info('Alert recipients updated', { thresholdIds, ...result });
    return alertRecipientModel.findAll();
  }
}

module.exports = new AlertRecipientService();
