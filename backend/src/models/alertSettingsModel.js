'use strict';

const db = require('../config/database');

/**
 * SMS settings (AlertSettings, one row per setting) and the recipients of SMS
 * that do not belong to a threshold (AlertEventRecipients).
 * The tables are created by migrations/2026-11-06-sms-settings.sql.
 */
class AlertSettingsModel {
  /** All settings as { SettingKey: 'value' } */
  async getAll() {
    const [rows] = await db.query('SELECT SettingKey, SettingValue FROM AlertSettings');
    return Object.fromEntries(rows.map((r) => [r.SettingKey, r.SettingValue]));
  }

  /** Insert or update several settings in one transaction. */
  async setMany(values) {
    const entries = Object.entries(values);
    if (entries.length === 0) return;

    await db.transaction(async (connection) => {
      for (const [key, value] of entries) {
        await connection.query(
          `INSERT INTO AlertSettings (SettingKey, SettingValue) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE SettingValue = VALUES(SettingValue)`,
          [key, String(value)]
        );
      }
    });
  }

  async findEventRecipientIds(eventType) {
    const [rows] = await db.query(
      'SELECT UserId FROM AlertEventRecipients WHERE EventType = ? ORDER BY UserId ASC',
      [eventType]
    );
    return rows.map((r) => r.UserId);
  }

  async findUsersByIds(userIds) {
    if (userIds.length === 0) return [];
    const [rows] = await db.query(
      'SELECT UserId, Username, PhoneNumber, IsActive FROM Users WHERE UserId IN (?)',
      [userIds]
    );
    return rows;
  }

  /** Replace the recipients of one event type. */
  async replaceEventRecipients(eventType, userIds) {
    await db.transaction(async (connection) => {
      await connection.query('DELETE FROM AlertEventRecipients WHERE EventType = ?', [eventType]);
      if (userIds.length > 0) {
        await connection.query(
          'INSERT INTO AlertEventRecipients (EventType, UserId) VALUES ?',
          [userIds.map((userId) => [eventType, userId])]
        );
      }
    });
  }
}

module.exports = new AlertSettingsModel();
