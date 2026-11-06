'use strict';

const db = require('../config/database');

/** Log of the SMS the BE service sent (table SmsAlertLog). */
class SmsLogModel {
  /**
   * Newest first. The Recipient column exists after migrations/2026-11-06-sms-settings.sql;
   * before that, the log is still shown (without the phone number).
   */
  async findRecent({ limit = 100, status = null } = {}) {
    const where = status ? 'WHERE l.Status = ?' : '';
    const params = status ? [status, limit] : [limit];

    const build = (recipientColumn) => `
      SELECT l.AlertId, l.ThresholdId, ${recipientColumn} AS Recipient, l.Message, l.Status, l.SentAt,
             rd.RegisterName
      FROM SmsAlertLog l
      LEFT JOIN Thresholds t ON t.ThresholdId = l.ThresholdId
      LEFT JOIN RegisterDefinitions rd ON rd.RegisterId = t.RegisterId
      ${where}
      ORDER BY l.AlertId DESC
      LIMIT ?`;

    try {
      const [rows] = await db.query(build('l.Recipient'), params);
      return rows;
    } catch (error) {
      if (error && error.code === 'ER_BAD_FIELD_ERROR') {
        const [rows] = await db.query(build('NULL'), params);
        return rows;
      }
      throw error;
    }
  }

  async countByStatus() {
    const [rows] = await db.query(
      `SELECT Status, COUNT(*) AS Total FROM SmsAlertLog WHERE SentAt >= (NOW() - INTERVAL 7 DAY) GROUP BY Status`
    );
    return Object.fromEntries(rows.map((r) => [r.Status, Number(r.Total)]));
  }
}

module.exports = new SmsLogModel();
