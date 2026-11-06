'use strict';

const db = require('../config/database');

class ThresholdModel {
  /**
   * Helper to format database row values to clean numbers
   */
  _format(row) {
    if (!row) return null;
    const formatted = { ...row };
    if (formatted.SMSEnabled !== undefined && formatted.SMSEnabled !== null) {
      formatted.SMSEnabled = Buffer.isBuffer(formatted.SMSEnabled)
        ? formatted.SMSEnabled[0]
        : (formatted.SMSEnabled ? 1 : 0);
    }
    if (formatted.IsActive !== undefined && formatted.IsActive !== null) {
      formatted.IsActive = Buffer.isBuffer(formatted.IsActive)
        ? formatted.IsActive[0]
        : (formatted.IsActive ? 1 : 0);
    }
    return formatted;
  }

  /**
   * Find threshold by ID with register and device details
   */
  async findById(thresholdId) {
    const [rows] = await db.query(
      `SELECT t.ThresholdId, t.RegisterId, t.MinValue, t.MaxValue,
              t.Severity, t.SMSEnabled, t.IsActive,
              rd.RegisterName, rd.Unit, rd.DataType, rd.DeviceId,
              d.DeviceName, d.DeviceModel
       FROM Thresholds t
       JOIN RegisterDefinitions rd ON t.RegisterId = rd.RegisterId
       JOIN Devices d ON rd.DeviceId = d.DeviceId
       WHERE t.ThresholdId = ?`,
      [thresholdId]
    );
    return rows[0] ? this._format(rows[0]) : null;
  }

  /**
   * Get all thresholds with pagination and filtering
   */
  async findAll({ page, limit, registerId, deviceId, severity, isActive, search } = {}) {
    const conditions = [];
    const params = [];

    if (registerId) {
      conditions.push('t.RegisterId = ?');
      params.push(registerId);
    }
    if (deviceId) {
      conditions.push('rd.DeviceId = ?');
      params.push(deviceId);
    }
    if (severity) {
      conditions.push('t.Severity = ?');
      params.push(severity);
    }
    if (isActive !== undefined) {
      conditions.push('t.IsActive = ?');
      params.push(isActive ? 1 : 0);
    }
    if (search) {
      conditions.push('(rd.RegisterName LIKE ? OR d.DeviceName LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT t.ThresholdId, t.RegisterId, t.MinValue, t.MaxValue,
             t.Severity, t.SMSEnabled, t.IsActive,
             rd.RegisterName, rd.Unit, rd.DataType, rd.DeviceId,
             d.DeviceName
      FROM Thresholds t
      JOIN RegisterDefinitions rd ON t.RegisterId = rd.RegisterId
      JOIN Devices d ON rd.DeviceId = d.DeviceId
      ${whereClause}
      ORDER BY t.ThresholdId ASC
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Thresholds t
      JOIN RegisterDefinitions rd ON t.RegisterId = rd.RegisterId
      JOIN Devices d ON rd.DeviceId = d.DeviceId
      ${whereClause}
    `;

    const result = await db.paginatedQuery(baseQuery, countQuery, params, page, limit);
    result.data = result.data.map(row => this._format(row));
    return result;
  }

  /**
   * Find thresholds by register ID
   */
  async findByRegisterId(registerId) {
    const [rows] = await db.query(
      `SELECT t.ThresholdId, t.RegisterId, t.MinValue, t.MaxValue,
              t.Severity, t.SMSEnabled, t.IsActive,
              rd.RegisterName, rd.Unit
       FROM Thresholds t
       JOIN RegisterDefinitions rd ON t.RegisterId = rd.RegisterId
       WHERE t.RegisterId = ?
       ORDER BY t.ThresholdId ASC`,
      [registerId]
    );
    return rows.map(row => this._format(row));
  }

  /**
   * Every active threshold with its register, group and status.
   * Used by the monitor, which checks the newest stored reading of each register.
   */
  async findAllActiveForMonitor() {
    const [rows] = await db.query(
      `SELECT t.ThresholdId, t.RegisterId, t.MinValue, t.MaxValue,
              t.Severity, t.SMSEnabled, t.IsActive,
              rd.RegisterName, rd.Unit, rd.\`Group\` AS RegisterGroup, rd.Status AS RegisterStatus
       FROM Thresholds t
       JOIN RegisterDefinitions rd ON t.RegisterId = rd.RegisterId
       WHERE t.IsActive = 1
       ORDER BY t.ThresholdId ASC`
    );
    return rows.map(row => this._format(row));
  }

  /**
   * Create a new threshold
   */
  async create({ registerId, minValue = null, maxValue = null, severity = 'Warning', smsEnabled = 1, isActive = 1 }) {
    const [result] = await db.query(
      `INSERT INTO \`Thresholds\` (\`RegisterId\`, \`MinValue\`, \`MaxValue\`, \`Severity\`, \`SMSEnabled\`, \`IsActive\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        registerId,
        minValue !== undefined && minValue !== null ? minValue : null,
        maxValue !== undefined && maxValue !== null ? maxValue : null,
        severity,
        smsEnabled ? 1 : 0,
        isActive ? 1 : 0,
      ]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update threshold by ID
   */
  async update(thresholdId, updates) {
    const fields = [];
    const values = [];

    if (updates.registerId !== undefined) { fields.push('`RegisterId` = ?'); values.push(updates.registerId); }
    if (updates.minValue !== undefined) { fields.push('`MinValue` = ?'); values.push(updates.minValue); }
    if (updates.maxValue !== undefined) { fields.push('`MaxValue` = ?'); values.push(updates.maxValue); }
    if (updates.severity !== undefined) { fields.push('`Severity` = ?'); values.push(updates.severity); }
    if (updates.smsEnabled !== undefined) { fields.push('`SMSEnabled` = ?'); values.push(updates.smsEnabled ? 1 : 0); }
    if (updates.isActive !== undefined) { fields.push('`IsActive` = ?'); values.push(updates.isActive ? 1 : 0); }

    if (fields.length === 0) return this.findById(thresholdId);

    values.push(thresholdId);
    await db.query(`UPDATE \`Thresholds\` SET ${fields.join(', ')} WHERE \`ThresholdId\` = ?`, values);
    return this.findById(thresholdId);
  }

  /**
   * Toggle active status
   */
  async toggleActive(thresholdId, isActive) {
    await db.query('UPDATE `Thresholds` SET `IsActive` = ? WHERE `ThresholdId` = ?', [isActive ? 1 : 0, thresholdId]);
    return this.findById(thresholdId);
  }

  /**
   * Delete threshold by ID
   */
  async delete(thresholdId) {
    const [result] = await db.query('DELETE FROM `Thresholds` WHERE `ThresholdId` = ?', [thresholdId]);
    return result.affectedRows > 0;
  }
}

module.exports = new ThresholdModel();
