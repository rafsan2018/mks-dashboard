'use strict';

const alertSettingsModel = require('../models/alertSettingsModel');
const { AppError, ValidationError, NotFoundError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const {
  SMS_REGISTER_NAMES,
  MAX_SMS_RECIPIENTS,
  EVENT_GENSET_START,
  START_PLACEHOLDERS,
  START_SAMPLE_VALUES,
  SMS_MAX_LENGTH,
  SMS_TEXT_PATTERN,
  validateStartMessage,
} = require('../utils/alertRules');

// Defaults, used for any setting that is missing in the database (same as the BE service)
const DEFAULT_START_MESSAGE =
  'MKS {site}: Genset STARTED (#{starts}) {time}\nEngine: {rpm} rpm\nOil Press: {oil} kPa\nCoolant: {coolant} degC\nFuel: {fuel} %';

const DEFAULTS = {
  smsEnabled: true,
  siteName: 'Genset Room',
  reminderMinutes: 30,
  retryMinutes: 1,
  gensetStartEnabled: true,
  startDelaySeconds: 10,
  suppressLowWhenStopped: true,
  startMessage: DEFAULT_START_MESSAGE,
};

// API field -> AlertSettings key
const KEYS = {
  smsEnabled: 'SmsEnabled',
  siteName: 'SiteName',
  reminderMinutes: 'ReminderMinutes',
  retryMinutes: 'RetryMinutes',
  gensetStartEnabled: 'GensetStartEnabled',
  startDelaySeconds: 'StartDelaySeconds',
  suppressLowWhenStopped: 'SuppressLowWhenStopped',
  startMessage: 'StartMessage',
};

const BOOLEAN_FIELDS = ['smsEnabled', 'gensetStartEnabled', 'suppressLowWhenStopped'];
const NUMBER_FIELDS = {
  reminderMinutes: { min: 0, max: 1440, label: 'Reminder interval (minutes)' },
  retryMinutes: { min: 1, max: 120, label: 'Retry after a failed send (minutes)' },
  startDelaySeconds: { min: 0, max: 120, label: 'Delay after the start (seconds)' },
};

const hasText = (value) => typeof value === 'string' && value.trim() !== '';
const toBool = (value, fallback) => (value === undefined || value === null ? fallback : ['1', 'true'].includes(String(value).toLowerCase()));
const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

// The tables come from a migration: say so clearly if it has not been run
const wrapMissingTable = (error) => {
  if (error && error.code === 'ER_NO_SUCH_TABLE') {
    return new AppError('SMS settings are not set up yet. Run backend/migrations/2026-11-06-sms-settings.sql on the database.', 503);
  }
  return error;
};

class AlertSettingsService {
  /** Settings + genset-start recipients, with what the page needs to explain the rules. */
  async getSettings() {
    let raw;
    let gensetStartUserIds;
    try {
      raw = await alertSettingsModel.getAll();
      gensetStartUserIds = await alertSettingsModel.findEventRecipientIds(EVENT_GENSET_START);
    } catch (error) {
      throw wrapMissingTable(error);
    }

    return {
      settings: {
        smsEnabled: toBool(raw[KEYS.smsEnabled], DEFAULTS.smsEnabled),
        siteName: hasText(raw[KEYS.siteName]) ? raw[KEYS.siteName] : DEFAULTS.siteName,
        reminderMinutes: toInt(raw[KEYS.reminderMinutes], DEFAULTS.reminderMinutes),
        retryMinutes: toInt(raw[KEYS.retryMinutes], DEFAULTS.retryMinutes),
        gensetStartEnabled: toBool(raw[KEYS.gensetStartEnabled], DEFAULTS.gensetStartEnabled),
        startDelaySeconds: toInt(raw[KEYS.startDelaySeconds], DEFAULTS.startDelaySeconds),
        suppressLowWhenStopped: toBool(raw[KEYS.suppressLowWhenStopped], DEFAULTS.suppressLowWhenStopped),
        startMessage: hasText(raw[KEYS.startMessage]) ? raw[KEYS.startMessage] : DEFAULTS.startMessage,
      },
      gensetStartUserIds,
      rules: {
        smsRegisterNames: SMS_REGISTER_NAMES,
        maxSmsRecipients: MAX_SMS_RECIPIENTS,
        smsMaxLength: SMS_MAX_LENGTH,
        placeholders: START_PLACEHOLDERS,
        sampleValues: START_SAMPLE_VALUES,
        defaultStartMessage: DEFAULT_START_MESSAGE,
      },
    };
  }

  /**
   * Save the given settings (any subset) and, if given, the genset-start recipients.
   * @param {{settings?: object, gensetStartUserIds?: number[]}} body
   */
  async saveSettings(body = {}) {
    const incoming = body.settings || {};
    const errors = [];
    const toSave = {};

    for (const field of BOOLEAN_FIELDS) {
      if (incoming[field] === undefined) continue;
      if (typeof incoming[field] !== 'boolean') {
        errors.push({ field, message: `${field} must be true or false`, value: incoming[field] });
        continue;
      }
      toSave[KEYS[field]] = incoming[field] ? '1' : '0';
    }

    for (const [field, rule] of Object.entries(NUMBER_FIELDS)) {
      if (incoming[field] === undefined) continue;
      const n = Number(incoming[field]);
      if (!Number.isInteger(n) || n < rule.min || n > rule.max) {
        errors.push({ field, message: `${rule.label} must be a whole number from ${rule.min} to ${rule.max}`, value: incoming[field] });
        continue;
      }
      toSave[KEYS[field]] = String(n);
    }

    if (incoming.siteName !== undefined) {
      const siteName = String(incoming.siteName).trim();
      if (siteName === '' || siteName.length > 30 || !SMS_TEXT_PATTERN.test(siteName)) {
        errors.push({ field: 'siteName', message: 'Site name must be 1 to 30 plain characters (letters, digits and . , : ; ( ) + - / % ! ? = # * & < >)', value: incoming.siteName });
      } else {
        toSave[KEYS.siteName] = siteName;
      }
    }

    if (incoming.startMessage !== undefined) {
      const startMessage = String(incoming.startMessage);
      const problems = validateStartMessage(startMessage);
      if (problems.length > 0) {
        problems.forEach((message) => errors.push({ field: 'startMessage', message }));
      } else {
        toSave[KEYS.startMessage] = startMessage.replace(/\r\n/g, '\n');
      }
    }

    let recipientIds = null;
    if (body.gensetStartUserIds !== undefined) {
      if (!Array.isArray(body.gensetStartUserIds)) {
        errors.push({ field: 'gensetStartUserIds', message: 'gensetStartUserIds must be an array of user IDs' });
      } else {
        recipientIds = [...new Set(body.gensetStartUserIds.map(Number))];
        if (recipientIds.some((id) => !Number.isInteger(id) || id < 1)) {
          errors.push({ field: 'gensetStartUserIds', message: 'gensetStartUserIds must contain positive integers' });
        } else if (recipientIds.length > MAX_SMS_RECIPIENTS) {
          errors.push({ field: 'gensetStartUserIds', message: `At most ${MAX_SMS_RECIPIENTS} people can receive the SMS` });
        }
      }
    }

    if (errors.length > 0) throw new ValidationError('Some SMS settings are not valid', errors);

    try {
      if (recipientIds !== null) {
        const users = new Map((await alertSettingsModel.findUsersByIds(recipientIds)).map((u) => [u.UserId, u]));
        const missing = recipientIds.find((id) => !users.has(id));
        if (missing) throw new NotFoundError(`User with ID ${missing}`);

        const noPhone = recipientIds.map((id) => users.get(id)).filter((u) => !hasText(u.PhoneNumber));
        if (noPhone.length > 0) {
          throw new ValidationError('Some selected users cannot receive an SMS', noPhone.map((u) => ({
            field: 'gensetStartUserIds',
            message: `${u.Username} has no phone number`,
            value: u.UserId,
          })));
        }
      }

      await alertSettingsModel.setMany(toSave);
      if (recipientIds !== null) {
        await alertSettingsModel.replaceEventRecipients(EVENT_GENSET_START, recipientIds);
      }
    } catch (error) {
      throw wrapMissingTable(error);
    }

    logger.info('SMS settings updated', { keys: Object.keys(toSave), gensetStartRecipients: recipientIds?.length });
    return this.getSettings();
  }
}

module.exports = new AlertSettingsService();
