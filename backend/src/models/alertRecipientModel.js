'use strict';

const db = require('../config/database');
const { isSmsRegister, MAX_SMS_RECIPIENTS } = require('../utils/alertRules');

// One row per (threshold, user) in each table.
// SMS  -> ThresholdNotifyUsers      (also read by the C# BE service for WhatsApp alerts)
// Email-> ThresholdEmailNotifyUsers (read by thresholdMonitorService for alert emails)
const TABLES = {
  email: 'ThresholdEmailNotifyUsers',
  sms: 'ThresholdNotifyUsers',
};

class AlertRecipientModel {
  /**
   * Recipients of every threshold, including thresholds with nobody selected.
   * SmsEligible tells if the register can send SMS (oil pressure, coolant temperature, fuel level);
   * the other thresholds are Email only.
   * @returns {Promise<Array<{ThresholdId:number, RegisterName:string, SmsEligible:boolean, SmsMax:number, EmailUserIds:number[], SmsUserIds:number[]}>>}
   */
  async findAll() {
    const [thresholds] = await db.query(
      `SELECT t.ThresholdId, rd.RegisterName
       FROM Thresholds t
       LEFT JOIN RegisterDefinitions rd ON rd.RegisterId = t.RegisterId
       ORDER BY t.ThresholdId ASC`
    );
    const [rows] = await db.query(
      `SELECT ThresholdId, UserId, 'email' AS Channel FROM ${TABLES.email}
       UNION ALL
       SELECT ThresholdId, UserId, 'sms' AS Channel FROM ${TABLES.sms}`
    );

    const byThreshold = new Map(
      thresholds.map(t => [t.ThresholdId, {
        ThresholdId: t.ThresholdId,
        RegisterName: t.RegisterName || '',
        SmsEligible: isSmsRegister(t.RegisterName),
        SmsMax: MAX_SMS_RECIPIENTS,
        EmailUserIds: [],
        SmsUserIds: [],
      }])
    );
    for (const row of rows) {
      const entry = byThreshold.get(row.ThresholdId);
      if (!entry) continue;
      (row.Channel === 'email' ? entry.EmailUserIds : entry.SmsUserIds).push(row.UserId);
    }
    for (const entry of byThreshold.values()) {
      entry.EmailUserIds.sort((a, b) => a - b);
      entry.SmsUserIds.sort((a, b) => a - b);
    }
    return [...byThreshold.values()];
  }

  /**
   * Active users with an email address selected for this threshold.
   */
  async findEmailRecipients(thresholdId) {
    const [rows] = await db.query(
      `SELECT u.UserId, u.Username, u.Email
       FROM ${TABLES.email} r
       JOIN Users u ON u.UserId = r.UserId
       WHERE r.ThresholdId = ?
         AND u.IsActive = 1
         AND u.Email IS NOT NULL
         AND TRIM(u.Email) <> ''
       ORDER BY u.UserId ASC`,
      [thresholdId]
    );
    return rows;
  }

  /** Register name of each given threshold, as { ThresholdId: 'Oil Pressure' } */
  async findRegisterNames(thresholdIds) {
    if (thresholdIds.length === 0) return {};
    const [rows] = await db.query(
      `SELECT t.ThresholdId, rd.RegisterName
       FROM Thresholds t
       LEFT JOIN RegisterDefinitions rd ON rd.RegisterId = t.RegisterId
       WHERE t.ThresholdId IN (?)`,
      [thresholdIds]
    );
    return Object.fromEntries(rows.map(r => [r.ThresholdId, r.RegisterName || '']));
  }

  async findExistingThresholdIds(thresholdIds) {
    if (thresholdIds.length === 0) return [];
    const [rows] = await db.query('SELECT ThresholdId FROM Thresholds WHERE ThresholdId IN (?)', [thresholdIds]);
    return rows.map(r => r.ThresholdId);
  }

  async findUsersByIds(userIds) {
    if (userIds.length === 0) return [];
    const [rows] = await db.query(
      'SELECT UserId, Username, Email, PhoneNumber, IsActive FROM Users WHERE UserId IN (?)',
      [userIds]
    );
    return rows;
  }

  /**
   * Replace the Email and SMS recipients of the given thresholds in one transaction.
   * @param {Array<{thresholdId:number, emailUserIds:number[], smsUserIds:number[]}>} items
   */
  async replaceMany(items) {
    return db.transaction(async (connection) => {
      const thresholdIds = items.map(i => i.thresholdId);
      await connection.query(`DELETE FROM ${TABLES.email} WHERE ThresholdId IN (?)`, [thresholdIds]);
      await connection.query(`DELETE FROM ${TABLES.sms} WHERE ThresholdId IN (?)`, [thresholdIds]);

      const emailRows = items.flatMap(i => i.emailUserIds.map(userId => [i.thresholdId, userId]));
      const smsRows = items.flatMap(i => i.smsUserIds.map(userId => [i.thresholdId, userId]));

      if (emailRows.length > 0) {
        await connection.query(`INSERT INTO ${TABLES.email} (ThresholdId, UserId) VALUES ?`, [emailRows]);
      }
      if (smsRows.length > 0) {
        await connection.query(`INSERT INTO ${TABLES.sms} (ThresholdId, UserId) VALUES ?`, [smsRows]);
      }
      return { emailCount: emailRows.length, smsCount: smsRows.length };
    });
  }
}

module.exports = new AlertRecipientModel();
