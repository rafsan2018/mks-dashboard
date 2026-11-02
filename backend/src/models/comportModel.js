'use strict';

const db = require('../config/database');

class ComportModel {
  /**
   * Find comport by ID
   */
  async findById(comportId) {
    const [rows] = await db.query(
      `SELECT ComportId, Protocol, PortName, BaudRate, DataBits, StopBits, Parity, PollIntervalMs
       FROM Comports WHERE ComportId = ?`,
      [comportId]
    );
    return rows[0] || null;
  }

  /**
   * Find comport by port name
   */
  async findByPortName(portName) {
    const [rows] = await db.query(
      'SELECT * FROM Comports WHERE PortName = ?',
      [portName]
    );
    return rows[0] || null;
  }

  /**
   * Get all comports with pagination and filtering
   */
  async findAll({ page, limit, protocol, search } = {}) {
    const conditions = [];
    const params = [];

    if (protocol) {
      conditions.push('Protocol = ?');
      params.push(protocol);
    }
    if (search) {
      conditions.push('(PortName LIKE ? OR Protocol LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT ComportId, Protocol, PortName, BaudRate, DataBits, StopBits, Parity, PollIntervalMs
      FROM Comports ${whereClause}
      ORDER BY ComportId ASC
    `;
    const countQuery = `SELECT COUNT(*) as total FROM Comports ${whereClause}`;

    return db.paginatedQuery(baseQuery, countQuery, params, page, limit);
  }

  /**
   * Get all comports (no pagination)
   */
  async findAllList() {
    const [rows] = await db.query(
      `SELECT ComportId, Protocol, PortName, BaudRate, DataBits, StopBits, Parity, PollIntervalMs
       FROM Comports ORDER BY PortName ASC`
    );
    return rows;
  }

  /**
   * Create comport
   */
  async create({ protocol, portName, baudRate, dataBits, stopBits, parity, pollIntervalMs = 1000 }) {
    const [result] = await db.query(
      `INSERT INTO Comports (Protocol, PortName, BaudRate, DataBits, StopBits, Parity, PollIntervalMs)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [protocol, portName, baudRate, dataBits, stopBits, parity, pollIntervalMs]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update comport
   */
  async update(comportId, updates) {
    const fields = [];
    const values = [];

    if (updates.protocol !== undefined) { fields.push('Protocol = ?'); values.push(updates.protocol); }
    if (updates.portName !== undefined) { fields.push('PortName = ?'); values.push(updates.portName); }
    if (updates.baudRate !== undefined) { fields.push('BaudRate = ?'); values.push(updates.baudRate); }
    if (updates.dataBits !== undefined) { fields.push('DataBits = ?'); values.push(updates.dataBits); }
    if (updates.stopBits !== undefined) { fields.push('StopBits = ?'); values.push(updates.stopBits); }
    if (updates.parity !== undefined) { fields.push('Parity = ?'); values.push(updates.parity); }
    if (updates.pollIntervalMs !== undefined) { fields.push('PollIntervalMs = ?'); values.push(updates.pollIntervalMs); }

    if (fields.length === 0) return this.findById(comportId);

    values.push(comportId);
    await db.query(`UPDATE Comports SET ${fields.join(', ')} WHERE ComportId = ?`, values);
    return this.findById(comportId);
  }

  /**
   * Delete comport
   */
  async delete(comportId) {
    const [result] = await db.query('DELETE FROM Comports WHERE ComportId = ?', [comportId]);
    return result.affectedRows > 0;
  }

  /**
   * Check if port name exists
   */
  async portNameExists(portName, excludeId = null) {
    const query = excludeId
      ? 'SELECT 1 FROM Comports WHERE PortName = ? AND ComportId != ?'
      : 'SELECT 1 FROM Comports WHERE PortName = ?';
    const params = excludeId ? [portName, excludeId] : [portName];
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  }

  /**
   * Get devices using this comport
   */
  async getLinkedDevices(comportId) {
    const [rows] = await db.query(
      'SELECT DeviceId, DeviceName, DeviceModel, SlaveAddress FROM Devices WHERE ComportId = ?',
      [comportId]
    );
    return rows;
  }
}

module.exports = new ComportModel();
