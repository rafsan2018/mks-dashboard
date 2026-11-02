'use strict';

const db = require('../config/database');

class RegisterDefinitionModel {
  /**
   * Find register by ID with device info
   */
  async findById(registerId) {
    const [rows] = await db.query(
      `SELECT rd.RegisterId, rd.DeviceId, rd.RegisterName, rd.Action, rd.FunctionCode,
              rd.DataType, rd.StartAddress, rd.RegisterCount, rd.ScaleFactor, rd.Unit,
              d.DeviceName, d.DeviceModel, d.SlaveAddress
       FROM RegisterDefinitions rd
       JOIN Devices d ON rd.DeviceId = d.DeviceId
       WHERE rd.RegisterId = ?`,
      [registerId]
    );
    return rows[0] || null;
  }

  /**
   * Get all register definitions with filtering and pagination
   */
  async findAll({ page, limit, deviceId, action, dataType, functionCode, search } = {}) {
    const conditions = [];
    const params = [];

    if (deviceId) {
      conditions.push('rd.DeviceId = ?');
      params.push(deviceId);
    }
    if (action) {
      conditions.push('rd.Action = ?');
      params.push(action);
    }
    if (dataType) {
      conditions.push('rd.DataType = ?');
      params.push(dataType);
    }
    if (functionCode) {
      conditions.push('rd.FunctionCode = ?');
      params.push(functionCode);
    }
    if (search) {
      conditions.push('(rd.RegisterName LIKE ? OR rd.Unit LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT rd.RegisterId, rd.DeviceId, rd.RegisterName, rd.Action, rd.FunctionCode,
             rd.DataType, rd.StartAddress, rd.RegisterCount, rd.ScaleFactor, rd.Unit,
             d.DeviceName, d.DeviceModel
      FROM RegisterDefinitions rd
      JOIN Devices d ON rd.DeviceId = d.DeviceId
      ${whereClause}
      ORDER BY rd.DeviceId ASC, rd.StartAddress ASC
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM RegisterDefinitions rd
      JOIN Devices d ON rd.DeviceId = d.DeviceId
      ${whereClause}
    `;

    return db.paginatedQuery(baseQuery, countQuery, params, page, limit);
  }

  /**
   * Get all registers for a device (no pagination)
   */
  async findByDeviceId(deviceId) {
    const [rows] = await db.query(
      `SELECT RegisterId, DeviceId, RegisterName, Action, FunctionCode,
              DataType, StartAddress, RegisterCount, ScaleFactor, Unit
       FROM RegisterDefinitions
       WHERE DeviceId = ?
       ORDER BY StartAddress ASC`,
      [deviceId]
    );
    return rows;
  }

  /**
   * Find register by device and start address
   */
  async findByDeviceAndAddress(deviceId, startAddress) {
    const [rows] = await db.query(
      `SELECT * FROM RegisterDefinitions WHERE DeviceId = ? AND StartAddress = ?`,
      [deviceId, startAddress]
    );
    return rows[0] || null;
  }

  /**
   * Create register definition
   */
  async create({ deviceId, registerName, action, functionCode, dataType, startAddress, registerCount, scaleFactor, unit }) {
    const [result] = await db.query(
      `INSERT INTO RegisterDefinitions
       (DeviceId, RegisterName, Action, FunctionCode, DataType, StartAddress, RegisterCount, ScaleFactor, Unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, registerName, action, functionCode, dataType, startAddress, registerCount,
       scaleFactor || null, unit || null]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update register definition
   */
  async update(registerId, updates) {
    const fields = [];
    const values = [];

    if (updates.registerName !== undefined) { fields.push('RegisterName = ?'); values.push(updates.registerName); }
    if (updates.action !== undefined) { fields.push('Action = ?'); values.push(updates.action); }
    if (updates.functionCode !== undefined) { fields.push('FunctionCode = ?'); values.push(updates.functionCode); }
    if (updates.dataType !== undefined) { fields.push('DataType = ?'); values.push(updates.dataType); }
    if (updates.startAddress !== undefined) { fields.push('StartAddress = ?'); values.push(updates.startAddress); }
    if (updates.registerCount !== undefined) { fields.push('RegisterCount = ?'); values.push(updates.registerCount); }
    if (updates.scaleFactor !== undefined) { fields.push('ScaleFactor = ?'); values.push(updates.scaleFactor); }
    if (updates.unit !== undefined) { fields.push('Unit = ?'); values.push(updates.unit); }

    if (fields.length === 0) return this.findById(registerId);

    values.push(registerId);
    await db.query(`UPDATE RegisterDefinitions SET ${fields.join(', ')} WHERE RegisterId = ?`, values);
    return this.findById(registerId);
  }

  /**
   * Delete register definition
   */
  async delete(registerId) {
    const [result] = await db.query('DELETE FROM RegisterDefinitions WHERE RegisterId = ?', [registerId]);
    return result.affectedRows > 0;
  }

  /**
   * Bulk create registers (for device import)
   */
  async bulkCreate(registers) {
    if (!registers || registers.length === 0) return 0;

    const values = registers.map(r => [
      r.deviceId, r.registerName, r.action, r.functionCode, r.dataType,
      r.startAddress, r.registerCount, r.scaleFactor || null, r.unit || null,
    ]);

    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = values.flat();

    const [result] = await db.query(
      `INSERT INTO RegisterDefinitions
       (DeviceId, RegisterName, Action, FunctionCode, DataType, StartAddress, RegisterCount, ScaleFactor, Unit)
       VALUES ${placeholders}`,
      flatValues
    );
    return result.affectedRows;
  }

  /**
   * Get distinct data types
   */
  async getDistinctDataTypes() {
    const [rows] = await db.query('SELECT DISTINCT DataType FROM RegisterDefinitions ORDER BY DataType');
    return rows.map(r => r.DataType);
  }
}

module.exports = new RegisterDefinitionModel();
