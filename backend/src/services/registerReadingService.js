'use strict';

const registerReadingModel = require('../models/registerReadingModel');
const registerDefinitionModel = require('../models/registerDefinitionModel');
const deviceModel = require('../models/deviceModel');
const thresholdMonitorService = require('./thresholdMonitorService');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const { normalizeGroup, tableForGroup, isActiveStatus } = require('../utils/readingTables');
const { createShortCache } = require('../utils/shortCache');

// The Dashboard, Genset and DPM pages refresh every second: share one database query per second
const liveCache = createShortCache(1000);

/**
 * Convert a DB row (RegisterDefinitions LEFT JOIN latest reading) into the API register object.
 * Inactive registers keep their definition but never show a value.
 */
const toRegisterReading = (row) => {
  const active = isActiveStatus(row.Status);
  return {
    readingId:    active ? (row.ReadingId ?? null) : null,
    registerId:   row.RegisterId,
    registerName: row.RegisterName,
    rawValue:     active && row.RawValue    != null ? String(row.RawValue)    : null,
    scaledValue:  active && row.ScaledValue != null ? String(row.ScaledValue) : null,
    unit:         row.Unit         ?? null,
    dataType:     row.DataType     ?? null,
    action:       row.Action       ?? null,
    group:        normalizeGroup(row.Group) || null,
    status:       row.Status       ?? null,
    recordedAt:   active ? (row.RecordedAt ?? null) : null,
  };
};

class RegisterReadingService {
  /**
   * Get paginated readings with filters
   */
  async getReadings(query) {
    const { page = 1, limit = 20, registerId, deviceId, startDate, endDate, timeRange } = query;
    return registerReadingModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      registerId: registerId ? parseInt(registerId) : null,
      deviceId: deviceId ? parseInt(deviceId) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      timeRange: timeRange || null,
    });
  }

  /**
   * Get reading by ID. Reading IDs are per group table, so the group is needed (default DPM).
   */
  async getReadingById(readingId, group = 'DPM') {
    const reading = await registerReadingModel.findById(readingId, group);
    if (!reading) throw new NotFoundError('Reading');
    return reading;
  }

  /**
   * Get the latest value for every registered register on a device.
   * Uses RegisterDefinitions as the master list — registers with no
   * readings yet are still returned with null reading fields.
   */
  async getByDevice(deviceId) {
    return liveCache(`device:${deviceId}`, () => this._loadByDevice(deviceId));
  }

  async _loadByDevice(deviceId) {
    const device = await deviceModel.findById(deviceId);
    if (!device) throw new NotFoundError('Device');

    const rows = await registerReadingModel.findByDevice(deviceId);
    return {
      deviceId: device.DeviceId,
      deviceName: device.DeviceName,
      deviceModel: device.DeviceModel,
      registers: rows.map(toRegisterReading),
    };
  }

  /**
   * Get latest reading for a single register
   */
  async getLatestByRegister(registerId) {
    const register = await registerDefinitionModel.findById(registerId);
    if (!register) throw new NotFoundError('Register definition');
    return registerReadingModel.findLatestByRegister(registerId);
  }

  /**
   * Get time-series data for charting
   */
  async getTimeSeries(registerId, timeRange) {
    const register = await registerDefinitionModel.findById(registerId);
    if (!register) throw new NotFoundError('Register definition');
    const data = await registerReadingModel.findTimeSeries(registerId, timeRange);
    return { register, data };
  }

  /**
   * Get power trends (PTotal, STotal, FQTotal) for a device over a timeRange (up to 30d / 1 month)
   */
  async getDevicePowerTrends(deviceId, timeRange = '30d') {
    return liveCache(`trends:${deviceId}:${timeRange}`, () => this._loadDevicePowerTrends(deviceId, timeRange));
  }

  async _loadDevicePowerTrends(deviceId, timeRange) {
    const device = await deviceModel.findById(deviceId);
    if (!device) throw new NotFoundError('Device');
    const result = await registerReadingModel.getPowerTrendsByDevice(deviceId, timeRange);
    return {
      device: {
        deviceId: device.DeviceId,
        deviceName: device.DeviceName,
        deviceModel: device.DeviceModel,
        location: device.Location,
      },
      ...result,
    };
  }

  /**
   * Format power trends to Excel-compatible CSV string
   */
  convertPowerTrendsToCsv(result) {
    const headers = [
      'Timestamp (UTC)',
      'Date & Time (Local)',
      'Active Power PTotal (kW)',
      'Apparent Power STotal (kVA)',
      'Reactive Power FQTotal (kVar)',
      'Device Name',
      'Device Model',
      'Device ID',
    ];

    const rows = (result.alignedRecords || []).map(r => {
      const d = new Date(r.timestamp);
      const localStr = !isNaN(d.getTime()) ? d.toLocaleString() : '';
      const p = r.pTotal != null ? Number(r.pTotal).toFixed(2) : '';
      const s = r.sTotal != null ? Number(r.sTotal).toFixed(2) : '';
      const fq = r.fqTotal != null ? Number(r.fqTotal).toFixed(2) : '';
      return [
        `"${r.isoTimestamp || r.timestamp}"`,
        `"${localStr}"`,
        p,
        s,
        fq,
        `"${result.device?.deviceName || 'AMF Board Outgoing DPM'}"`,
        `"${result.device?.deviceModel || 'ME631'}"`,
        result.deviceId || 2,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Get statistical summary for a register
   */
  async getStats(registerId, timeRange) {
    const register = await registerDefinitionModel.findById(registerId);
    if (!register) throw new NotFoundError('Register definition');
    const stats = await registerReadingModel.getStats(registerId, timeRange);
    return { register, stats };
  }

  /**
   * Get dashboard — uses RegisterDefinitions as the master list of applicable registers.
   * Only includes registers currently displayed in the Genset Summary and DPM/ME631 Summary
   * dashboard panels. For each register, returns the latest reading from the readings table
   * of its group, or null values when no reading exists yet (or the register is inactive).
   */
  async getDashboard() {
    return liveCache('dashboard', () => this._loadDashboard());
  }

  async _loadDashboard() {
    const { rows, GENSET_REGISTER_NAMES, DPM_REGISTER_NAMES } = await registerReadingModel.getDashboardRegisters();
    const totalCount = await registerReadingModel.getTotalCount();

    // Build a lookup: RegisterName → reading row (first match wins — names should be unique per device)
    const byName = {};
    for (const row of rows) {
      // Prefer a row that has an actual reading; keep first occurrence otherwise
      if (!byName[row.RegisterName] || (byName[row.RegisterName].ReadingId === null && row.ReadingId !== null)) {
        byName[row.RegisterName] = row;
      }
    }

    // Separate rows into genset vs dpm buckets while preserving DB order
    const gensetSet = new Set(GENSET_REGISTER_NAMES);
    const dpmSet    = new Set(DPM_REGISTER_NAMES);

    const gensetRows = rows.filter(r => gensetSet.has(r.RegisterName));
    const dpmRows    = rows.filter(r => dpmSet.has(r.RegisterName));

    // Deduplicate by RegisterName (keep first occurrence)
    const dedupe = (arr) => {
      const seen = new Set();
      return arr.filter(r => {
        if (seen.has(r.RegisterName)) return false;
        seen.add(r.RegisterName);
        return true;
      });
    };

    // Build device info from the first row that has a DeviceId
    const deviceInfoFrom = (rowArr) => {
      const first = rowArr[0];
      if (!first) return null;
      return {
        deviceId:    first.DeviceId,
        deviceName:  first.DeviceName,
        deviceModel: first.DeviceModel,
        isActive:    first.IsActive,
      };
    };

    const gensetUniqueRows = dedupe(gensetRows);
    const dpmUniqueRows    = dedupe(dpmRows);

    return {
      genset: {
        ...(deviceInfoFrom(gensetUniqueRows) || {}),
        registers: gensetUniqueRows.map(toRegisterReading),
      },
      dpm: {
        ...(deviceInfoFrom(dpmUniqueRows) || {}),
        registers: dpmUniqueRows.map(toRegisterReading),
      },
      totalReadings: totalCount,
      generatedAt:   new Date().toISOString(),
    };
  }

  /**
   * Create a single reading. Only Active registers are stored, in the table of their group.
   */
  async createReading(data, userId) {
    const register = await registerDefinitionModel.findById(data.registerId);
    if (!register) throw new NotFoundError('Register definition');
    if (!isActiveStatus(register.Status)) {
      throw new ValidationError(`Register ${register.RegisterId} is not Active; only Active registers store readings`);
    }

    const table = tableForGroup(register.Group);
    if (!table) {
      throw new ValidationError(`Register ${register.RegisterId} has group '${normalizeGroup(register.Group)}' which has no readings table`);
    }

    const reading = await registerReadingModel.create(data, table);
    await this._processThresholds([data], userId);
    return reading;
  }

  /**
   * Bulk create readings (from Modbus polling).
   * Readings of registers that are not Active (or whose group has no table) are skipped.
   */
  async bulkCreateReadings(readings, userId) {
    // Validate all register IDs exist and find the table of each
    const registerIds = [...new Set(readings.map(r => r.registerId))];
    const tableByRegister = new Map();
    for (const regId of registerIds) {
      const reg = await registerDefinitionModel.findById(regId);
      if (!reg) throw new NotFoundError(`Register definition with ID ${regId}`);
      if (isActiveStatus(reg.Status)) tableByRegister.set(regId, tableForGroup(reg.Group));
    }

    const toStore = readings
      .filter(r => tableByRegister.get(r.registerId))
      .map(r => ({ ...r, table: tableByRegister.get(r.registerId) }));

    const count = await registerReadingModel.bulkCreate(toStore);
    await this._processThresholds(toStore, userId);
    const skippedCount = readings.length - toStore.length;
    logger.info(`Bulk inserted ${count} readings` + (skippedCount > 0 ? `, skipped ${skippedCount} of inactive registers` : ''));
    return { insertedCount: count, skippedCount };
  }

  async _processThresholds(readings, userId) {
    try {
      await thresholdMonitorService.processReadings(readings, userId);
    } catch (error) {
      logger.error('Threshold monitoring failed while processing readings', {
        error: error.message,
      });
    }
  }

  /**
   * Delete a reading
   */
  async deleteReading(readingId, group = 'DPM') {
    const reading = await registerReadingModel.findById(readingId, group);
    if (!reading) throw new NotFoundError('Reading');

    await registerReadingModel.delete(readingId, group);
    return true;
  }

  /**
   * Delete old readings for data retention
   */
  async purgeOldReadings(days = 90) {
    const deleted = await registerReadingModel.deleteOlderThan(days);
    logger.info(`Purged ${deleted} readings older than ${days} days`);
    return { deletedCount: deleted };
  }
}

module.exports = new RegisterReadingService();
