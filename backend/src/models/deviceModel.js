'use strict';

const db = require('../config/database');

class DeviceModel {
  /**
   * Helper to format database row values to clean numbers
   */
  _format(row) {
    if (!row) return null;
    const formatted = { ...row };
    if (formatted.IsActive !== undefined && formatted.IsActive !== null) {
      formatted.IsActive = Buffer.isBuffer(formatted.IsActive)
        ? formatted.IsActive[0]
        : (formatted.IsActive ? 1 : 0);
    }
    return formatted;
  }

  /**
   * Find device by ID with comport info
   */
  async findById(deviceId) {
    const [rows] = await db.query(
      `SELECT d.DeviceId, d.DeviceName, d.DeviceModel, d.ComportId, d.SlaveAddress,
              d.Location, d.IsActive, d.CreatedAt,
              c.Protocol, c.PortName, c.BaudRate
       FROM Devices d
       LEFT JOIN Comports c ON d.ComportId = c.ComportId
       WHERE d.DeviceId = ?`,
      [deviceId]
    );
    return rows[0] ? this._format(rows[0]) : null;
  }

  /**
   * Get all devices with pagination and filtering
   */
  async findAll({ page, limit, isActive, search, comportId } = {}) {
    const conditions = [];
    const params = [];

    if (isActive !== undefined) {
      conditions.push('d.IsActive = ?');
      params.push(isActive ? 1 : 0);
    }
    if (comportId) {
      conditions.push('d.ComportId = ?');
      params.push(comportId);
    }
    if (search) {
      conditions.push('(d.DeviceName LIKE ? OR d.DeviceModel LIKE ? OR d.Location LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT d.DeviceId, d.DeviceName, d.DeviceModel, d.ComportId, d.SlaveAddress,
             d.Location, d.IsActive, d.CreatedAt,
             c.Protocol, c.PortName, c.BaudRate
      FROM Devices d
      LEFT JOIN Comports c ON d.ComportId = c.ComportId
      ${whereClause}
      ORDER BY d.CreatedAt DESC
    `;
    const countQuery = `SELECT COUNT(*) as total FROM Devices d ${whereClause}`;

    const result = await db.paginatedQuery(baseQuery, countQuery, params, page, limit);
    result.data = result.data.map(row => this._format(row));
    return result;
  }

  /**
   * Get all active devices (no pagination - for dropdowns)
   */
  async findAllActive() {
    const [rows] = await db.query(
      `SELECT d.DeviceId, d.DeviceName, d.DeviceModel, d.SlaveAddress, d.Location,
              c.Protocol, c.PortName
       FROM Devices d
       LEFT JOIN Comports c ON d.ComportId = c.ComportId
       WHERE d.IsActive = 1
       ORDER BY d.DeviceName ASC`
    );
    return rows.map(row => this._format(row));
  }

  /**
   * Create new device
   */
  async create({ deviceName, deviceModel, comportId, slaveAddress, location, isActive = 0 }) {
    const [result] = await db.query(
      `INSERT INTO Devices (DeviceName, DeviceModel, ComportId, SlaveAddress, Location, IsActive, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [deviceName, deviceModel, comportId, slaveAddress, location || null, isActive ? 1 : 0]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update device
   */
  async update(deviceId, updates) {
    const fields = [];
    const values = [];

    if (updates.deviceName !== undefined) { fields.push('DeviceName = ?'); values.push(updates.deviceName); }
    if (updates.deviceModel !== undefined) { fields.push('DeviceModel = ?'); values.push(updates.deviceModel); }
    if (updates.comportId !== undefined) { fields.push('ComportId = ?'); values.push(updates.comportId); }
    if (updates.slaveAddress !== undefined) { fields.push('SlaveAddress = ?'); values.push(updates.slaveAddress); }
    if (updates.location !== undefined) { fields.push('Location = ?'); values.push(updates.location); }
    if (updates.isActive !== undefined) { fields.push('IsActive = ?'); values.push(updates.isActive ? 1 : 0); }

    if (fields.length === 0) return this.findById(deviceId);

    values.push(deviceId);
    await db.query(`UPDATE Devices SET ${fields.join(', ')} WHERE DeviceId = ?`, values);
    return this.findById(deviceId);
  }

  /**
   * Toggle device active status
   */
  async toggleActive(deviceId, isActive) {
    await db.query('UPDATE Devices SET IsActive = ? WHERE DeviceId = ?', [isActive ? 1 : 0, deviceId]);
    return this.findById(deviceId);
  }

  /**
   * Delete device
   */
  async delete(deviceId) {
    const [result] = await db.query('DELETE FROM Devices WHERE DeviceId = ?', [deviceId]);
    return result.affectedRows > 0;
  }

  /**
   * Get device register count
   */
  async getRegisterCount(deviceId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM RegisterDefinitions WHERE DeviceId = ?',
      [deviceId]
    );
    return rows[0].count;
  }

  /**
   * Check if slave address is already used in the same comport
   */
  async slaveAddressExists(comportId, slaveAddress, excludeId = null) {
    const query = excludeId
      ? 'SELECT 1 FROM Devices WHERE ComportId = ? AND SlaveAddress = ? AND DeviceId != ?'
      : 'SELECT 1 FROM Devices WHERE ComportId = ? AND SlaveAddress = ?';
    const params = excludeId ? [comportId, slaveAddress, excludeId] : [comportId, slaveAddress];
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  }
}

module.exports = new DeviceModel();
