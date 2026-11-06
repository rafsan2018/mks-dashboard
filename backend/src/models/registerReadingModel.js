'use strict';

const db = require('../config/database');
const { DPM_TABLE, READING_TABLES, tableForGroup } = require('../utils/readingTables');

// Time range to SQL interval mapping
const TIME_RANGE_MAP = {
  '1h':  'INTERVAL 1 HOUR',
  '6h':  'INTERVAL 6 HOUR',
  '24h': 'INTERVAL 24 HOUR',
  '7d':  'INTERVAL 7 DAY',
  '30d': 'INTERVAL 30 DAY',
};

/**
 * Readings of several tables as one derived table.
 * `where` uses reading columns only and is applied inside every branch, so each table's indexes are used.
 */
const unionReadings = (tables, where = '', params = []) => ({
  sql: '(' + tables.map(t =>
    `SELECT ReadingId, RegisterId, RawValue, ScaledValue, RecordedAt FROM ${t} ${where}`
  ).join(' UNION ALL ') + ')',
  params: tables.flatMap(() => params),
});

/**
 * Latest reading of every register, over all readings tables.
 */
const LATEST_READINGS_SQL = READING_TABLES.map(t => `
  SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt
  FROM ${t} rr
  INNER JOIN (
    SELECT RegisterId, MAX(RecordedAt) AS MaxRecordedAt
    FROM ${t}
    GROUP BY RegisterId
  ) latest_times
    ON rr.RegisterId = latest_times.RegisterId
   AND rr.RecordedAt = latest_times.MaxRecordedAt`
).join(' UNION ALL ');

/**
 * Keeps one row per RegisterId (the one with the newest RecordedAt), in the original order.
 * A register can have readings in two tables if its Group was changed.
 */
const keepLatestPerRegister = (rows) => {
  const byRegister = new Map();
  for (const row of rows) {
    const existing = byRegister.get(row.RegisterId);
    if (!existing || (row.RecordedAt && (!existing.RecordedAt || new Date(row.RecordedAt) > new Date(existing.RecordedAt)))) {
      byRegister.set(row.RegisterId, row);
    }
  }
  return Array.from(byRegister.values());
};

class RegisterReadingModel {
  /**
   * Readings table of a register (from its Group), or null if the register or its group is unknown
   */
  async tableForRegister(registerId) {
    const [rows] = await db.query(
      'SELECT `Group` FROM RegisterDefinitions WHERE RegisterId = ?',
      [registerId]
    );
    return rows[0] ? tableForGroup(rows[0].Group) : null;
  }

  /**
   * Find reading by ID. Reading IDs are per table, so the group decides the table (default DPM).
   */
  async findById(readingId, group = 'DPM') {
    const table = tableForGroup(group);
    if (!table) return null;
    return this._findByIdInTable(readingId, table);
  }

  async _findByIdInTable(readingId, table) {
    const [rows] = await db.query(
      `SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt,
              rd.RegisterName, rd.Unit, rd.DataType, rd.DeviceId, rd.\`Group\`, rd.Status,
              d.DeviceName
       FROM ${table} rr
       JOIN RegisterDefinitions rd ON rr.RegisterId = rd.RegisterId
       JOIN Devices d ON rd.DeviceId = d.DeviceId
       WHERE rr.ReadingId = ?`,
      [readingId]
    );
    return rows[0] || null;
  }

  /**
   * Get readings with full filtering, pagination, time range (over every readings table)
   */
  async findAll({ page, limit, registerId, deviceId, startDate, endDate, timeRange } = {}) {
    // Conditions on the readings tables (applied inside every UNION branch)
    const readingConditions = [];
    const readingParams = [];
    // Conditions on RegisterDefinitions (applied after the UNION)
    const conditions = [];
    const params = [];

    let tables = READING_TABLES;

    if (registerId) {
      const table = await this.tableForRegister(registerId);
      if (!table) {
        return { data: [], pagination: { total: 0, page: page || 1, limit: limit || 20, totalPages: 0, hasNext: false, hasPrev: false } };
      }
      tables = [table];
      readingConditions.push('RegisterId = ?');
      readingParams.push(registerId);
    }
    if (deviceId) {
      conditions.push('rd.DeviceId = ?');
      params.push(deviceId);
    }
    if (timeRange && TIME_RANGE_MAP[timeRange]) {
      readingConditions.push(`RecordedAt >= NOW() - ${TIME_RANGE_MAP[timeRange]}`);
    } else {
      if (startDate) {
        readingConditions.push('RecordedAt >= ?');
        readingParams.push(startDate);
      }
      if (endDate) {
        readingConditions.push('RecordedAt <= ?');
        readingParams.push(endDate);
      }
    }

    const readings = unionReadings(
      tables,
      readingConditions.length > 0 ? `WHERE ${readingConditions.join(' AND ')}` : '',
      readingParams
    );
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt,
             rd.RegisterName, rd.Unit, rd.DataType, rd.DeviceId, rd.\`Group\`, rd.Status,
             d.DeviceName
      FROM ${readings.sql} rr
      JOIN RegisterDefinitions rd ON rr.RegisterId = rd.RegisterId
      JOIN Devices d ON rd.DeviceId = d.DeviceId
      ${whereClause}
      ORDER BY rr.RecordedAt DESC
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${readings.sql} rr
      JOIN RegisterDefinitions rd ON rr.RegisterId = rd.RegisterId
      JOIN Devices d ON rd.DeviceId = d.DeviceId
      ${whereClause}
    `;

    return db.paginatedQuery(baseQuery, countQuery, [...readings.params, ...params], page, limit);
  }

  /**
   * Get the latest reading for every configured register on a device.
   * Uses RegisterDefinitions as the master list so registers with no
   * readings yet still appear (with null reading fields).
   */
  async findByDevice(deviceId) {
    const [rows] = await db.query(
      `SELECT
         rd.RegisterId,
         rd.RegisterName,
         rd.Unit,
         rd.DataType,
         rd.StartAddress,
         rd.Action,
         rd.\`Group\`,
         rd.Status,
         latest.ReadingId,
         latest.RawValue,
         latest.ScaledValue,
         latest.RecordedAt
       FROM RegisterDefinitions rd
       LEFT JOIN (${LATEST_READINGS_SQL}) latest ON rd.RegisterId = latest.RegisterId
       WHERE rd.DeviceId = ?
       ORDER BY rd.StartAddress ASC`,
      [deviceId]
    );
    return keepLatestPerRegister(rows);
  }

  /**
   * Newest stored reading of each given register, from one readings table.
   * Used by the threshold monitor (registers of one group share a table).
   */
  async findLatestValues(table, registerIds) {
    if (!READING_TABLES.includes(table) || registerIds.length === 0) return [];

    const [rows] = await db.query(
      `SELECT rr.RegisterId, rr.ScaledValue, rr.RecordedAt
       FROM ${table} rr
       JOIN (SELECT RegisterId, MAX(ReadingId) AS ReadingId
             FROM ${table}
             WHERE RegisterId IN (?)
             GROUP BY RegisterId) latest ON latest.ReadingId = rr.ReadingId`,
      [registerIds]
    );
    return rows;
  }

  /**
   * Get latest reading for a specific register
   */
  async findLatestByRegister(registerId) {
    const table = await this.tableForRegister(registerId);
    if (!table) return null;

    const [rows] = await db.query(
      `SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt,
              rd.RegisterName, rd.Unit, rd.DataType
       FROM ${table} rr
       JOIN RegisterDefinitions rd ON rr.RegisterId = rd.RegisterId
       WHERE rr.RegisterId = ?
       ORDER BY rr.RecordedAt DESC
       LIMIT 1`,
      [registerId]
    );
    return rows[0] || null;
  }

  /**
   * Get time-series data for a register (for charts)
   */
  async findTimeSeries(registerId, timeRange = '24h') {
    const table = await this.tableForRegister(registerId);
    if (!table) return [];

    const rangeExpr = TIME_RANGE_MAP[timeRange] || 'INTERVAL 24 HOUR';
    const [rows] = await db.query(
      `SELECT ReadingId, RegisterId, RawValue, ScaledValue, RecordedAt
       FROM ${table}
       WHERE RegisterId = ?
         AND RecordedAt >= NOW() - ${rangeExpr}
       ORDER BY RecordedAt ASC`,
      [registerId]
    );
    return rows;
  }

  /**
   * Get aggregated statistics for a register
   */
  async getStats(registerId, timeRange = '24h') {
    const table = (await this.tableForRegister(registerId)) || DPM_TABLE;
    const rangeExpr = TIME_RANGE_MAP[timeRange] || 'INTERVAL 24 HOUR';
    const [rows] = await db.query(
      `SELECT
         COUNT(*) as count,
         MIN(ScaledValue) as min,
         MAX(ScaledValue) as max,
         AVG(ScaledValue) as avg,
         STDDEV(ScaledValue) as stddev,
         MIN(RecordedAt) as firstRecording,
         MAX(RecordedAt) as lastRecording
       FROM ${table}
       WHERE RegisterId = ?
         AND RecordedAt >= NOW() - ${rangeExpr}`,
      [registerId]
    );
    return rows[0];
  }

  /**
   * Get historical power trends (PTotal, STotal, FQTotal) for a device over a timeRange (up to 30d / 1 month)
   */
  async getPowerTrendsByDevice(deviceId, timeRange = '30d') {
    const rangeExpr = TIME_RANGE_MAP[timeRange] || 'INTERVAL 30 DAY';

    // 1. Fetch relevant power registers for this device
    const [registers] = await db.query(
      `SELECT RegisterId, RegisterName, Unit, DataType, StartAddress, \`Group\`
       FROM RegisterDefinitions
       WHERE DeviceId = ?
         AND (
           RegisterName IN (
             'Total of Active Power',
             'Total Apparent Power',
             'Total Fundamental Reactive Power',
             'Total Reactive Power'
           )
           OR RegisterName LIKE '%Active Power%'
           OR RegisterName LIKE '%Apparent Power%'
           OR RegisterName LIKE '%Reactive Power%'
         )
       ORDER BY RegisterId ASC`,
      [deviceId]
    );

    if (!registers || registers.length === 0) {
      return {
        deviceId,
        timeRange,
        registers: [],
        readings: [],
        alignedRecords: [],
        count: 0,
      };
    }

    // 2. Query historical readings within the timeRange, from the table of each register's group
    const idsByTable = new Map();
    for (const r of registers) {
      const table = tableForGroup(r.Group);
      if (!table) continue;
      if (!idsByTable.has(table)) idsByTable.set(table, []);
      idsByTable.get(table).push(r.RegisterId);
    }

    const rows = [];
    for (const [table, registerIds] of idsByTable) {
      const placeholders = registerIds.map(() => '?').join(', ');
      const [tableRows] = await db.query(
        `SELECT
           rr.ReadingId,
           rr.RegisterId,
           rd.RegisterName,
           rd.Unit,
           rr.RawValue,
           rr.ScaledValue,
           rr.RecordedAt
         FROM ${table} rr
         JOIN RegisterDefinitions rd ON rr.RegisterId = rd.RegisterId
         WHERE rr.RegisterId IN (${placeholders})
           AND rr.RecordedAt >= NOW() - ${rangeExpr}
         ORDER BY rr.RecordedAt ASC`,
        registerIds
      );
      rows.push(...tableRows);
    }
    rows.sort((a, b) => new Date(a.RecordedAt) - new Date(b.RecordedAt));

    // 3. Helper to categorize register into metric key
    const getMetricKey = (name) => {
      const n = (name || '').toLowerCase();
      if (n.includes('active') && (n.includes('total') || n.includes('ptotal'))) return 'pTotal';
      if (n.includes('apparent') && (n.includes('total') || n.includes('stotal'))) return 'sTotal';
      if (n.includes('reactive') && (n.includes('total') || n.includes('fqtotal'))) return 'fqTotal';
      return null;
    };

    // 4. Group readings into timestamp buckets (by minute) so that PTotal, STotal, FQTotal align cleanly
    const timeBuckets = new Map();
    for (const row of rows) {
      const date = new Date(row.RecordedAt);
      const iso = !isNaN(date.getTime()) ? date.toISOString() : String(row.RecordedAt);
      const bucketKey = iso.length >= 16 ? iso.slice(0, 16) + ':00.000Z' : iso;

      if (!timeBuckets.has(bucketKey)) {
        timeBuckets.set(bucketKey, {
          timestamp: row.RecordedAt,
          isoTimestamp: iso,
          pTotal: null,
          sTotal: null,
          fqTotal: null,
        });
      }
      const entry = timeBuckets.get(bucketKey);
      const key = getMetricKey(row.RegisterName);
      if (key) {
        entry[key] = Number(row.ScaledValue);
      }
    }

    const alignedRecords = Array.from(timeBuckets.values()).sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    return {
      deviceId,
      timeRange,
      registers,
      readings: rows,
      alignedRecords,
      count: alignedRecords.length,
    };
  }

  /**
   * Get dashboard registers — uses RegisterDefinitions as the master list.
   * Only includes register names displayed in the Genset Summary and DPM/ME631 Summary.
   * LEFT JOINs with the latest reading per register; returns null values when no reading exists.
   */
  async getDashboardRegisters() {
    // Register names shown on the Genset Summary dashboard (exact names from RegisterDefinitions)
    // DSE7320 MKII device (DeviceId = 1)
    const GENSET_REGISTER_NAMES = [
      'Oil Pressure',                  // kPa  — Engine sensor
      'Coolant Temperature',           // °C   — Engine sensor
      'Fuel Level',                    // %    — Engine sensor
      'Engine Battery Voltage',        // V    — Engine sensor
      'Engine Speed',                  // RPM  — Engine sensor
      'Generator Frequency',           // Hz   — Generator output
      'Generator L1-N Voltage',        // V    — Generator output
      'Generator L2-N Voltage',        // V    — Generator output
      'Generator L3-N Voltage',        // V    — Generator output
      'Generator Total Watts',         // W    — Total Output Power panel
      'Generator Average Power Factor',// -    — Average Power Factor panel
      'Mains Frequency',               // Hz   — Mains panel
      'Mains L1-N Voltage',            // V    — Mains L1-N panel
    ];

    // Register names shown on the DPM / ME631 Summary dashboard (exact names from RegisterDefinitions)
    // ME631 Power Meter device (DeviceId = 2)
    const DPM_REGISTER_NAMES = [
      'Average of Voltage',                            // V    — Avg Voltage
      'Average of Current',                            // A    — Avg Current
      'Average of Frequency',                          // Hz   — Avg Frequency
      'Total of Active Power',                         // kW   — Total Active Pwr
      'Total Apparent Power',                          // kVA  — Apparent Power
      'Average of Power Factor',                       // -    — Avg Power Factor
      'Total Active Energy Import Phase All',          // kWh  — Imported Energy
      'Total Active Energy Export Phase All',          // kWh  — Exported Energy
      'Active Power Peak Demand',                      // kW   — Peak Demand
      'Average of Total Harmonics Current Distortion', // %    — Avg Current THD
      'Average of Total Harmonics Voltage Distortion', // %    — Avg Voltage THD
    ];

    const allNames = [...new Set([...GENSET_REGISTER_NAMES, ...DPM_REGISTER_NAMES])];
    const placeholders = allNames.map(() => '?').join(', ');

    const [rows] = await db.query(
      `SELECT
         rd.RegisterId,
         rd.RegisterName,
         rd.Unit,
         rd.DataType,
         rd.Action,
         rd.DeviceId,
         rd.StartAddress,
         rd.\`Group\`,
         rd.Status,
         d.DeviceName,
         d.DeviceModel,
         d.IsActive,
         latest.ReadingId,
         latest.RawValue,
         latest.ScaledValue,
         latest.RecordedAt
       FROM RegisterDefinitions rd
       JOIN Devices d ON rd.DeviceId = d.DeviceId
       LEFT JOIN (${LATEST_READINGS_SQL}) latest ON rd.RegisterId = latest.RegisterId
       WHERE rd.RegisterName IN (${placeholders})
       ORDER BY rd.DeviceId ASC, rd.StartAddress ASC`,
      allNames
    );
    return { rows: keepLatestPerRegister(rows), GENSET_REGISTER_NAMES, DPM_REGISTER_NAMES };
  }

  /**
   * Create a single reading in the given readings table
   */
  async create({ registerId, rawValue, scaledValue, recordedAt }, table) {
    const [result] = await db.query(
      `INSERT INTO ${table} (RegisterId, RawValue, ScaledValue, RecordedAt)
       VALUES (?, ?, ?, ?)`,
      [registerId, rawValue, scaledValue, recordedAt || new Date()]
    );
    return this._findByIdInTable(result.insertId, table);
  }

  /**
   * Bulk insert readings (for Modbus polling data). Every reading carries its `table`.
   */
  async bulkCreate(readings) {
    if (!readings || readings.length === 0) return 0;

    const byTable = new Map();
    for (const r of readings) {
      if (!byTable.has(r.table)) byTable.set(r.table, []);
      byTable.get(r.table).push([r.registerId, r.rawValue, r.scaledValue, r.recordedAt || new Date()]);
    }

    let affectedRows = 0;
    for (const [table, values] of byTable) {
      const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
      const [result] = await db.query(
        `INSERT INTO ${table} (RegisterId, RawValue, ScaledValue, RecordedAt)
         VALUES ${placeholders}`,
        values.flat()
      );
      affectedRows += result.affectedRows;
    }
    return affectedRows;
  }

  /**
   * Delete reading by ID (the group decides the table, default DPM)
   */
  async delete(readingId, group = 'DPM') {
    const table = tableForGroup(group);
    if (!table) return false;
    const [result] = await db.query(`DELETE FROM ${table} WHERE ReadingId = ?`, [readingId]);
    return result.affectedRows > 0;
  }

  /**
   * Delete old readings from every readings table (data retention)
   */
  async deleteOlderThan(days) {
    const safeDays = Math.max(1, parseInt(days, 10) || 90);
    let affectedRows = 0;
    for (const table of READING_TABLES) {
      const [result] = await db.query(
        `DELETE FROM ${table} WHERE RecordedAt < NOW() - INTERVAL ${safeDays} DAY`
      );
      affectedRows += result.affectedRows;
    }
    return affectedRows;
  }

  /**
   * Get total readings count over every readings table
   */
  async getTotalCount() {
    const [rows] = await db.query(
      `SELECT SUM(total) AS total FROM (${READING_TABLES.map(t => `SELECT COUNT(*) AS total FROM ${t}`).join(' UNION ALL ')}) counts`
    );
    return Number(rows[0].total) || 0;
  }
}

module.exports = new RegisterReadingModel();
