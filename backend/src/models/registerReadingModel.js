'use strict';

const db = require('../config/database');

// Time range to SQL interval mapping
const TIME_RANGE_MAP = {
  '1h':  'INTERVAL 1 HOUR',
  '6h':  'INTERVAL 6 HOUR',
  '24h': 'INTERVAL 24 HOUR',
  '7d':  'INTERVAL 7 DAY',
  '30d': 'INTERVAL 30 DAY',
};

class RegisterReadingModel {
  /**
   * Find reading by ID
   */
  async findById(readingId) {
    const [rows] = await db.query(
      `SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt,
              rd.RegisterName, rd.Unit, rd.DataType, rd.DeviceId,
              d.DeviceName
       FROM RegisterReadings rr
       JOIN RegisterDefinitions rd ON rr.RegisterId = rd.RegisterId
       JOIN Devices d ON rd.DeviceId = d.DeviceId
       WHERE rr.ReadingId = ?`,
      [readingId]
    );
    return rows[0] || null;
  }

  /**
   * Get readings with full filtering, pagination, time range
   */
  async findAll({ page, limit, registerId, deviceId, startDate, endDate, timeRange } = {}) {
    const conditions = [];
    const params = [];

    if (registerId) {
      conditions.push('rr.RegisterId = ?');
      params.push(registerId);
    }
    if (deviceId) {
      conditions.push('rd.DeviceId = ?');
      params.push(deviceId);
    }
    if (timeRange && TIME_RANGE_MAP[timeRange]) {
      conditions.push(`rr.RecordedAt >= NOW() - ${TIME_RANGE_MAP[timeRange]}`);
    } else {
      if (startDate) {
        conditions.push('rr.RecordedAt >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('rr.RecordedAt <= ?');
        params.push(endDate);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt,
             rd.RegisterName, rd.Unit, rd.DataType, rd.DeviceId,
             d.DeviceName
      FROM RegisterReadings rr
      JOIN RegisterDefinitions rd ON rr.RegisterId = rd.RegisterId
      JOIN Devices d ON rd.DeviceId = d.DeviceId
      ${whereClause}
      ORDER BY rr.RecordedAt DESC
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM RegisterReadings rr
      JOIN RegisterDefinitions rd ON rr.RegisterId = rd.RegisterId
      JOIN Devices d ON rd.DeviceId = d.DeviceId
      ${whereClause}
    `;

    return db.paginatedQuery(baseQuery, countQuery, params, page, limit);
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
         latest.ReadingId,
         latest.RawValue,
         latest.ScaledValue,
         latest.RecordedAt
       FROM RegisterDefinitions rd
       LEFT JOIN (
         SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt
         FROM RegisterReadings rr
         INNER JOIN (
           SELECT RegisterId, MAX(RecordedAt) AS MaxRecordedAt
           FROM RegisterReadings
           GROUP BY RegisterId
         ) latest_times
           ON rr.RegisterId = latest_times.RegisterId
          AND rr.RecordedAt = latest_times.MaxRecordedAt
       ) latest ON rd.RegisterId = latest.RegisterId
       WHERE rd.DeviceId = ?
       ORDER BY rd.StartAddress ASC`,
      [deviceId]
    );
    return rows;
  }

  /**
   * Get latest reading for a specific register
   */
  async findLatestByRegister(registerId) {
    const [rows] = await db.query(
      `SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt,
              rd.RegisterName, rd.Unit, rd.DataType
       FROM RegisterReadings rr
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
    const rangeExpr = TIME_RANGE_MAP[timeRange] || 'INTERVAL 24 HOUR';
    const [rows] = await db.query(
      `SELECT ReadingId, RegisterId, RawValue, ScaledValue, RecordedAt
       FROM RegisterReadings
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
       FROM RegisterReadings
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
      `SELECT RegisterId, RegisterName, Unit, DataType, StartAddress
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

    const registerIds = registers.map(r => r.RegisterId);
    const placeholders = registerIds.map(() => '?').join(', ');

    // 2. Query historical readings from database within the timeRange
    const [rows] = await db.query(
      `SELECT
         rr.ReadingId,
         rr.RegisterId,
         rd.RegisterName,
         rd.Unit,
         rr.RawValue,
         rr.ScaledValue,
         rr.RecordedAt
       FROM RegisterReadings rr
       JOIN RegisterDefinitions rd ON rr.RegisterId = rd.RegisterId
       WHERE rr.RegisterId IN (${placeholders})
         AND rr.RecordedAt >= NOW() - ${rangeExpr}
       ORDER BY rr.RecordedAt ASC`,
      registerIds
    );

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
         d.DeviceName,
         d.DeviceModel,
         d.IsActive,
         latest.ReadingId,
         latest.RawValue,
         latest.ScaledValue,
         latest.RecordedAt
       FROM RegisterDefinitions rd
       JOIN Devices d ON rd.DeviceId = d.DeviceId
       LEFT JOIN (
         SELECT rr.ReadingId, rr.RegisterId, rr.RawValue, rr.ScaledValue, rr.RecordedAt
         FROM RegisterReadings rr
         INNER JOIN (
           SELECT RegisterId, MAX(RecordedAt) AS MaxRecordedAt
           FROM RegisterReadings
           GROUP BY RegisterId
         ) latest_times
           ON rr.RegisterId = latest_times.RegisterId
          AND rr.RecordedAt = latest_times.MaxRecordedAt
       ) latest ON rd.RegisterId = latest.RegisterId
       WHERE rd.RegisterName IN (${placeholders})
       ORDER BY rd.DeviceId ASC, rd.StartAddress ASC`,
      allNames
    );
    return { rows, GENSET_REGISTER_NAMES, DPM_REGISTER_NAMES };
  }

  /**
   * Create a single reading
   */
  async create({ registerId, rawValue, scaledValue, recordedAt }) {
    const [result] = await db.query(
      `INSERT INTO RegisterReadings (RegisterId, RawValue, ScaledValue, RecordedAt)
       VALUES (?, ?, ?, ?)`,
      [registerId, rawValue, scaledValue, recordedAt || new Date()]
    );
    return this.findById(result.insertId);
  }

  /**
   * Bulk insert readings (for Modbus polling data)
   */
  async bulkCreate(readings) {
    if (!readings || readings.length === 0) return 0;

    const values = readings.map(r => [
      r.registerId, r.rawValue, r.scaledValue, r.recordedAt || new Date()
    ]);

    const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
    const flatValues = values.flat();

    const [result] = await db.query(
      `INSERT INTO RegisterReadings (RegisterId, RawValue, ScaledValue, RecordedAt)
       VALUES ${placeholders}`,
      flatValues
    );
    return result.affectedRows;
  }

  /**
   * Delete reading by ID
   */
  async delete(readingId) {
    const [result] = await db.query('DELETE FROM RegisterReadings WHERE ReadingId = ?', [readingId]);
    return result.affectedRows > 0;
  }

  /**
   * Delete old readings (data retention)
   */
  async deleteOlderThan(days) {
    const safeDays = Math.max(1, parseInt(days, 10) || 90);
    const [result] = await db.query(
      `DELETE FROM RegisterReadings WHERE RecordedAt < NOW() - INTERVAL ${safeDays} DAY`
    );
    return result.affectedRows;
  }

  /**
   * Get total readings count
   */
  async getTotalCount() {
    const [rows] = await db.query('SELECT COUNT(*) as total FROM RegisterReadings');
    return rows[0].total;
  }
}

module.exports = new RegisterReadingModel();
