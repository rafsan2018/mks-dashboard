/**
 * deviceReadingService.js
 * API service for GET /api/v1/readings/device/:deviceId
 *
 * Fetches all register definitions with their latest readings for a device,
 * then transforms the response into the data structures expected by the
 * Genset (Device 1) and DPM (Device 2) pages.
 *
 * Verified against live database and API endpoint responses:
 * - Device 1: AMF Control Module #1 (DSE7320 MKII)
 * - Device 2: Three-Phase Power Meter #1 (ME631)
 */

import axiosInstance from './axiosInstance';

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Build a lookup map from the registers array:
 * { [registerName]: scaledValue, _raw: { [registerName]: rawValue } }
 * Indexes both exact and lowercase trimmed keys for maximum lookup resilience.
 */
export const buildLookup = (registers = []) => {
  const map = { _raw: {} };
  if (!Array.isArray(registers)) return map;

  for (const r of registers) {
    if (r && r.registerName) {
      const key = String(r.registerName).trim();
      const lower = key.toLowerCase();
      const scaledVal = r.scaledValue != null ? r.scaledValue : null;
      const rawVal = r.rawValue != null ? r.rawValue : null;

      if (map[key] === undefined || map[key] === null || scaledVal !== null) {
        map[key] = scaledVal;
        map[lower] = scaledVal;
      }
      if (map._raw[key] === undefined || map._raw[key] === null || rawVal !== null) {
        map._raw[key] = rawVal;
        map._raw[lower] = rawVal;
      }
    }
  }
  return map;
};

/**
 * Safe numeric extractor:
 * Tries names in order. If none match or value is null/empty, returns 0.
 * Returns a clean JavaScript number for gauges, charts, and math calculations.
 */
export const getVal = (lookup, ...names) => {
  if (!lookup) return 0;
  for (const name of names) {
    if (!name) continue;
    const clean = String(name).trim();
    const val = lookup[clean] ?? lookup[clean.toLowerCase()];
    if (val !== null && val !== undefined && val !== '') {
      const n = Number(val);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
};

/**
 * Safe raw string extractor:
 * Extracts unscaled raw values (such as timestamp strings or text codes).
 */
export const getRawVal = (lookup, ...names) => {
  if (!lookup) return null;
  for (const name of names) {
    if (!name) continue;
    const clean = String(name).trim();
    const val = lookup._raw?.[clean] ?? lookup._raw?.[clean.toLowerCase()];
    if (val !== null && val !== undefined && val !== '') {
      return String(val);
    }
  }
  return null;
};

/**
 * Names of the registers whose RegisterDefinitions.Status is not 'Active'.
 * Their widgets are hidden. Before the first API response the set is empty, so nothing is hidden.
 */
export const getInactiveNames = (registers = []) => {
  const names = new Set();
  if (!Array.isArray(registers)) return names;
  for (const r of registers) {
    if (r?.registerName && r.status != null && String(r.status).trim().toLowerCase() !== 'active') {
      names.add(String(r.registerName).trim());
    }
  }
  return names;
};

/**
 * True when at least one of the named registers is Active (or its status is not known yet).
 * A widget made of several registers is hidden only when all of them are inactive.
 */
export const isShown = (inactive, ...names) => names.some(name => !inactive?.has(name));

/**
 * Format helper for text display:
 * Defaults to 2 decimal places.
 */
export const formatReading = (v, dp = 2) => {
  if (v === null || v === undefined || v === '') return (0).toFixed(dp);
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(dp);
};

// ─── API fetch ───────────────────────────────────────────────────────────

/**
 * Fetch all register readings for a device.
 * @param {number} deviceId
 * @returns {Promise<object>} { deviceId, deviceName, deviceModel, registers: [...] }
 */
export const fetchDeviceReadings = async (deviceId, { background = false } = {}) => {
  // background = timed refresh: no global loading spinner
  const response = await axiosInstance.get(`/readings/device/${deviceId}`, { skipLoading: background });
  return response.data?.data ?? response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// GENSET (Device 1 — DSE7320 MKII)
// ═══════════════════════════════════════════════════════════════════════════

/** Register name constants — matching database & API RegisterDefinitions */
export const G = {
  // Engine sensors
  oilPressure:    'Oil Pressure',
  coolantTemp:    'Coolant Temperature',
  oilTemp:        'Oil Temperature',
  fuelLevel:      'Fuel Level',
  batteryV:       'Engine Battery Voltage',
  chargeAltV:     'Charge Alternator Voltage',
  engineSpeed:    'Engine Speed',
  boostPressure:  'Boost Pressure',
  runTime:        'Engine Run Time',
  numberOfStarts: 'Number Of Starts',

  // Generator output
  genFreq:    'Generator Frequency',
  currentLagLead: 'Generator Current Lag/Lead',
  pctFullPower:   'Generator Percentage Of Full Power',
  pctFullVar:     'Generator Percentage Of Full Var',
  voltL1N:    'Generator L1-N Voltage',
  voltL2N:    'Generator L2-N Voltage',
  voltL3N:    'Generator L3-N Voltage',
  voltL1L2:   'Generator L1-L2 Voltage',
  voltL2L3:   'Generator L2-L3 Voltage',
  voltL3L1:   'Generator L3-L1 Voltage',
  currentL1:  'Generator L1 Current',
  currentL2:  'Generator L2 Current',
  currentL3:  'Generator L3 Current',
  currentE:   'Generator Earth Current',
  wattsL1:    'Generator L1 Watts',
  wattsL2:    'Generator L2 Watts',
  wattsL3:    'Generator L3 Watts',
  totalWatts: 'Generator Total Watts',
  vaL1:       'Generator L1 VA',
  vaL2:       'Generator L2 VA',
  vaL3:       'Generator L3 VA',
  totalVA:    'Generator Total VA',
  varL1:      'Generator L1 Var',
  varL2:      'Generator L2 Var',
  varL3:      'Generator L3 Var',
  totalVar:   'Generator Total Var',
  pfL1:       'Generator Power Factor L1',
  pfL2:       'Generator Power Factor L2',
  pfL3:       'Generator Power Factor L3',
  avgPF:      'Generator Average Power Factor',
  posKWh:     'Generator Positive kWh',
  negKWh:     'Generator Negative kWh',
  kVAh:       'Generator kVAh',
  kVArh:      'Generator kVArh',

  // Mains
  mainsFreq:     'Mains Frequency',
  mainsVoltL1N:  'Mains L1-N Voltage',
  mainsVoltL2N:  'Mains L2-N Voltage',
  mainsVoltL3N:  'Mains L3-N Voltage',
  mainsVoltL1L2: 'Mains L1-L2 Voltage',
  mainsVoltL2L3: 'Mains L2-L3 Voltage',
  mainsVoltL3L1: 'Mains L3-L1 Voltage',
  mainsCurL1:    'Mains L1 Current',
  mainsCurL2:    'Mains L2 Current',
  mainsCurL3:    'Mains L3 Current',
  mainsCurE:     'Mains Earth Current',
  mainsVoltLagLead: 'Mains Voltage Phase Lag/Lead',
  mainsCurLagLead:  'Mains Current Lag/Lead',
  mainsPhaseRotation: 'Mains Phase Rotation',
  mainsWattsL1:  'Mains L1 Watts',
  mainsWattsL2:  'Mains L2 Watts',
  mainsWattsL3:  'Mains L3 Watts',
  mainsTotalW:   'Mains Total Watts',
  mainsVaL1:     'Mains L1 VA',
  mainsVaL2:     'Mains L2 VA',
  mainsVaL3:     'Mains L3 VA',
  mainsTotalVA:  'Mains Total VA',
  mainsVarL1:    'Mains L1 Var',
  mainsVarL2:    'Mains L2 Var',
  mainsVarL3:    'Mains L3 Var',
  mainsTotalVar: 'Mains Total Var',
  mainsPfL1:     'Mains Power Factor L1',
  mainsPfL2:     'Mains Power Factor L2',
  mainsPfL3:     'Mains Power Factor L3',
  mainsAvgPF:    'Mains Average Power Factor',
};

/** Genset alarm register mappings from API */
export const GENSET_ALARMS_MAP = {
  emergencyStop:      ['Emergency Stop'],
  lowOilPressure:     ['Low Oil Pressure'],
  highCoolantTemp:    ['High Coolant Temperature'],
  lowCoolantTemp:     ['Low Coolant Temperature'],
  underSpeed:         ['Under Speed'],
  overSpeed:          ['Over Speed'],
  genUnderFreq:       ['Generator Under Frequency'],
  genOverFreq:        ['Generator Over Frequency'],
  genLowVoltage:      ['Generator Low Voltage'],
  genHighVoltage:     ['Generator High Voltage'],
  batteryLowVoltage:  ['Battery Low Voltage'],
  batteryHighVoltage: ['Battery High Voltage'],
  chargeAltFail:      ['Charge Alternator Failure'],
  failToStart:        ['Fail To Start', 'Fail to Start'],
  failToStop:         ['Fail To Stop', 'Fail to Stop'],
  genFailToClose:     ['Generator Fail To Close', 'Generator Fail to Close'],
  mainsFailToClose:   ['Mains Fail To Close', 'Mains Fail to Close'],
  oilPressureFault:   ['Oil Pressure Sender Fault'],
  lossMagPickUp:      ['Loss Of Magnetic Pick Up'],
  magPickUpOpen:      ['Magnetic Pick Up Open Circuit'],
  genHighCurrent:     ['Generator High Current'],
  lowFuelLevel:       ['Low Fuel Level'],
  canEcuWarning:      ['CAN ECU Warning'],
  canEcuShutdown:     ['CAN ECU Shutdown'],
  canEcuDataFail:     ['CAN ECU Data Fail'],
  lowOilLevelSwitch:  ['Low Oil Level Switch'],
  highTempSwitch:     ['High Temperature Switch'],
  lowFuelLevelSwitch: ['Low Fuel Level Switch'],
  expansionWatchdog:  ['Expansion Unit Watchdog Alarm'],
  kwOverload:         ['kW Overload Alarm'],
  negPhaseSeqCurrent: ['Negative Phase Sequence Current Alarm'],
  earthFaultTrip:     ['Earth Fault Trip Alarm', 'Earth Fault'],
  genPhaseRotation:   ['Generator Phase Rotation Alarm'],
  autoVoltSenseFail:  ['Auto Voltage Sense Fail'],
  maintenanceAlarm:   ['Maintenance Alarm'],
  loadingFreqAlarm:   ['Loading Frequency Alarm'],
  loadingVoltAlarm:   ['Loading Voltage Alarm'],
  genShortCircuit:    ['Generator Short Circuit'],
  mainsHighCurrent:   ['Mains High Current'],
  mainsEarthFault:    ['Mains Earth Fault'],
  mainsShortCircuit:  ['Mains Short Circuit'],
  ecuProtect:         ['ECU Protect'],
  coolantSensorOpen:  ['Coolant Sensor Open Circuit'],
};

/**
 * Creates initial clean Genset data structure with ZERO dummy values.
 */
export const createInitialGensetData = () => ({
  device: 'DSE7320 MKII',
  name: 'AMF Control Module #1',
  status: 'online',
  lastUpdate: '--:--:--',
  engineMode: 'Stop',
  engineRunning: false,
  loadPercent: 0,

  engine: {
    speed: 0,
    coolantTemp: 0,
    oilPressure: 0,
    oilTemp: 0,
    fuelLevel: 0,
    batteryVoltage: 0,
    chargeAltVoltage: 0,
    boostPressure: 0,
    runTime: 0,
    numberOfStarts: 0,
  },

  generator: {
    frequency: 0,
    voltL1N: 0,
    voltL2N: 0,
    voltL3N: 0,
    voltL1L2: 0,
    voltL2L3: 0,
    voltL3L1: 0,
    currentL1: 0,
    currentL2: 0,
    currentL3: 0,
    currentEarth: 0,
    wattsL1: 0,
    wattsL2: 0,
    wattsL3: 0,
    totalWatts: 0,
    vaL1: 0,
    vaL2: 0,
    vaL3: 0,
    totalVA: 0,
    varL1: 0,
    varL2: 0,
    varL3: 0,
    totalVar: 0,
    pfL1: 0,
    pfL2: 0,
    pfL3: 0,
    avgPF: 0,
    positiveKWh: 0,
    negativeKWh: 0,
    kVAh: 0,
    kVArh: 0,
  },

  mains: {
    frequency: 0,
    voltL1N: 0,
    voltL2N: 0,
    voltL3N: 0,
    voltL1L2: 0,
    voltL2L3: 0,
    voltL3L1: 0,
    phaseRotation: 'ABC',
    currentL1: 0,
    currentL2: 0,
    currentL3: 0,
    wattsL1: 0,
    wattsL2: 0,
    wattsL3: 0,
    totalWatts: 0,
    vaL1: 0,
    vaL2: 0,
    vaL3: 0,
    totalVA: 0,
    varL1: 0,
    varL2: 0,
    varL3: 0,
    totalVar: 0,
    pfL1: 0,
    pfL2: 0,
    pfL3: 0,
    avgPF: 0,
  },

  status_flags: {},
  leds: {},
  alarms: {},
  inactive: new Set(),
});

/**
 * Transform the device-readings API response for Device 1 into the Genset page state.
 *
 * @param {object} apiData - Response from fetchDeviceReadings(1)
 * @returns {object} - Genset page data object
 */
export const transformGensetResponse = (apiData) => {
  if (!apiData || !apiData.registers) {
    return createInitialGensetData();
  }

  const g = buildLookup(apiData.registers);

  // Dynamic engine state derived from Engine Speed reading
  const speed = getVal(g, G.engineSpeed);
  const engineRunning = speed > 100;
  const engineMode = engineRunning ? 'Auto' : 'Stop';

  return {
    device: apiData.deviceModel || 'DSE7320 MKII',
    name: apiData.deviceName || 'AMF Control Module #1',
    status: 'online',
    lastUpdate: new Date().toLocaleTimeString(),
    engineMode,
    engineRunning,
    loadPercent: getVal(g, 'Generator Percentage Of Full Power'),

    engine: {
      speed,
      coolantTemp:      getVal(g, G.coolantTemp),
      oilPressure:      getVal(g, G.oilPressure),
      oilTemp:          getVal(g, G.oilTemp),
      fuelLevel:        getVal(g, G.fuelLevel),
      batteryVoltage:   getVal(g, G.batteryV),
      chargeAltVoltage: getVal(g, G.chargeAltV),
      boostPressure:    getVal(g, G.boostPressure),
      runTime:          getVal(g, G.runTime),
      numberOfStarts:   getVal(g, G.numberOfStarts),
    },

    generator: {
      frequency:    getVal(g, G.genFreq),
      voltL1N:      getVal(g, G.voltL1N),
      voltL2N:      getVal(g, G.voltL2N),
      voltL3N:      getVal(g, G.voltL3N),
      voltL1L2:     getVal(g, G.voltL1L2),
      voltL2L3:     getVal(g, G.voltL2L3),
      voltL3L1:     getVal(g, G.voltL3L1),
      currentL1:    getVal(g, G.currentL1),
      currentL2:    getVal(g, G.currentL2),
      currentL3:    getVal(g, G.currentL3),
      currentEarth: getVal(g, G.currentE),
      wattsL1:      getVal(g, G.wattsL1),
      wattsL2:      getVal(g, G.wattsL2),
      wattsL3:      getVal(g, G.wattsL3),
      totalWatts:   getVal(g, G.totalWatts),
      vaL1:         getVal(g, G.vaL1),
      vaL2:         getVal(g, G.vaL2),
      vaL3:         getVal(g, G.vaL3),
      totalVA:      getVal(g, G.totalVA),
      varL1:        getVal(g, G.varL1),
      varL2:        getVal(g, G.varL2),
      varL3:        getVal(g, G.varL3),
      totalVar:     getVal(g, G.totalVar),
      pfL1:         getVal(g, G.pfL1, 'Generator L1 Power Factor'),
      pfL2:         getVal(g, G.pfL2, 'Generator L2 Power Factor'),
      pfL3:         getVal(g, G.pfL3, 'Generator L3 Power Factor'),
      avgPF:        getVal(g, G.avgPF),
      positiveKWh:  getVal(g, G.posKWh),
      negativeKWh:  getVal(g, G.negKWh),
      kVAh:         getVal(g, G.kVAh),
      kVArh:        getVal(g, G.kVArh),
    },

    mains: {
      frequency:     getVal(g, G.mainsFreq),
      voltL1N:       getVal(g, G.mainsVoltL1N),
      voltL2N:       getVal(g, G.mainsVoltL2N),
      voltL3N:       getVal(g, G.mainsVoltL3N),
      voltL1L2:      getVal(g, G.mainsVoltL1L2),
      voltL2L3:      getVal(g, G.mainsVoltL2L3),
      voltL3L1:      getVal(g, G.mainsVoltL3L1),
      phaseRotation: 'ABC',
      currentL1:     getVal(g, G.mainsCurL1),
      currentL2:     getVal(g, G.mainsCurL2),
      currentL3:     getVal(g, G.mainsCurL3),
      wattsL1:       getVal(g, G.mainsWattsL1),
      wattsL2:       getVal(g, G.mainsWattsL2),
      wattsL3:       getVal(g, G.mainsWattsL3),
      totalWatts:    getVal(g, G.mainsTotalW),
      vaL1:          getVal(g, G.mainsVaL1),
      vaL2:          getVal(g, G.mainsVaL2),
      vaL3:          getVal(g, G.mainsVaL3),
      totalVA:       getVal(g, G.mainsTotalVA),
      varL1:         getVal(g, G.mainsVarL1),
      varL2:         getVal(g, G.mainsVarL2),
      varL3:         getVal(g, G.mainsVarL3),
      totalVar:      getVal(g, G.mainsTotalVar),
      pfL1:          getVal(g, G.mainsPfL1),
      pfL2:          getVal(g, G.mainsPfL2),
      pfL3:          getVal(g, G.mainsPfL3),
      avgPF:         getVal(g, G.mainsAvgPF),
    },

    status_flags: {
      genBreaker:     getVal(g, 'GEN BREAKER LED Status') === 1,
      mainsBreaker:   getVal(g, 'MAINS BREAKER LED Status') === 1,
      genAvailable:   getVal(g, 'GEN LED Status') === 1 || getVal(g, G.voltL1N) > 100,
      mainsAvailable: getVal(g, 'MAINS LED Status') === 1 || getVal(g, G.mainsVoltL1N) > 100,
    },

    leds: {
      stop:         getVal(g, 'STOP LED Status') === 1,
      manual:       getVal(g, 'MANUAL LED Status') === 1,
      test:         getVal(g, 'TEST LED Status') === 1,
      auto:         getVal(g, 'AUTO LED Status') === 1,
      mains:        getVal(g, 'MAINS LED Status') === 1,
      mainsBreaker: getVal(g, 'MAINS BREAKER LED Status') === 1,
      genBreaker:   getVal(g, 'GEN BREAKER LED Status') === 1,
      gen:          getVal(g, 'GEN LED Status') === 1,
      user1:        getVal(g, 'USER LED 1 Status') === 1,
      user2:        getVal(g, 'USER LED 2 Status') === 1,
      user3:        getVal(g, 'USER LED 3 Status') === 1,
      user4:        getVal(g, 'USER LED 4 Status') === 1,
    },

    alarms: Object.fromEntries(
      Object.entries(GENSET_ALARMS_MAP).map(([key, names]) => [
        key,
        getVal(g, ...names) || 1, // 1 = Normal
      ])
    ),

    // Registers with Status <> 'Active' — their widgets are hidden
    inactive: getInactiveNames(apiData.registers),
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// DPM (Device 2 — ME631 Power Meter)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Register name constants — exactly matching backend database and API names
 */
export const D = {
  // Power Factor
  PF1:      'Phase 1 Power Factor',
  PF2:      'Phase 2 Power Factor',
  PF3:      'Phase 3 Power Factor',
  PFAvg:    'Average of Power Factor',
  DPF1:     'Phase 1 Displacement Power Factor',
  DPF2:     'Phase 2 Displacement Power Factor',
  DPF3:     'Phase 3 Displacement Power Factor',
  DPFAvg:   'Average of Displacement Power Factor',

  // Frequency
  Freq1:    'Phase 1 Frequency',
  Freq2:    'Phase 2 Frequency',
  Freq3:    'Phase 3 Frequency',
  FreqAvg:  'Average of Frequency',

  // Current
  I1:       'Phase 1 Current',
  I2:       'Phase 2 Current',
  I3:       'Phase 3 Current',
  IAvg:     'Average of Current',

  // Voltage phase-to-neutral
  U1:       'Phase 1 Voltage',
  U2:       'Phase 2 Voltage',
  U3:       'Phase 3 Voltage',
  UAvg:     'Average of Voltage',

  // Voltage line-to-line (ME631 provides phase voltages; alias preserved)
  U12:      'Voltage Phase 1-2',
  U23:      'Voltage Phase 2-3',
  U31:      'Voltage Phase 3-1',

  // Active Power
  P1:       'Active Power Phase 1',
  P2:       'Active Power Phase 2',
  P3:       'Active Power Phase 3',
  PTotal:   'Total of Active Power',

  // Reactive Power (API returns "Fundamental Reactive Power Phase 1/2/3" and "Total Fundamental Reactive Power")
  FQ1:      'Fundamental Reactive Power Phase 1',
  FQ2:      'Fundamental Reactive Power Phase 2',
  FQ3:      'Fundamental Reactive Power Phase 3',
  FQTotal:  'Total Fundamental Reactive Power',

  // Apparent Power
  S1:       'Apparent Power Phase 1',
  S2:       'Apparent Power Phase 2',
  S3:       'Apparent Power Phase 3',
  STotal:   'Total Apparent Power',

  // Current Harmonics — Total THD
  I1THD:    'Phase 1 Total Harmonics Current Distortion',
  I2THD:    'Phase 2 Total Harmonics Current Distortion',
  I3THD:    'Phase 3 Total Harmonics Current Distortion',
  ITHDAvg:  'Average of Total Harmonics Current Distortion',

  // Current Harmonics — Odd (X Times)
  I1THDx:   'Phase 1 X Times Harmonics Current Distortion',
  I2THDx:   'Phase 2 X Times Harmonics Current Distortion',
  I3THDx:   'Phase 3 X Times Harmonics Current Distortion',
  ITHDxAvg: 'Average of X Times Harmonics Current Distortion',

  // Current Harmonics — Even (y Times)
  I1THDy:   'Phase 1 y Times Harmonics Current Distortion',
  I2THDy:   'Phase 2 y Times Harmonics Current Distortion',
  I3THDy:   'Phase 3 y Times Harmonics Current Distortion',
  ITHDyAvg: 'Average of y Times Harmonics Current Distortion',

  // Current Harmonics — Sub (z Times)
  I1THDz:   'Phase 1 z Times Harmonics Current Distortion',
  I2THDz:   'Phase 2 z Times Harmonics Current Distortion',
  I3THDz:   'Phase 3 z Times Harmonics Current Distortion',
  ITHDzAvg: 'Average of z Times Harmonics Current Distortion',

  // Voltage Harmonics — Total THD
  U1THD:    'Phase 1 Total Harmonics Voltage Distortion',
  U2THD:    'Phase 2 Total Harmonics Voltage Distortion',
  U3THD:    'Phase 3 Total Harmonics Voltage Distortion',
  UTHDAvg:  'Average of Total Harmonics Voltage Distortion',

  // Voltage Harmonics — Odd (X Times)
  U1THDx:   'Phase 1 X Times Harmonics Voltage Distortion',
  U2THDx:   'Phase 2 X Times Harmonics Voltage Distortion',
  U3THDx:   'Phase 3 X Times Harmonics Voltage Distortion',
  UTHDxAvg: 'Average of X Times Harmonics Voltage Distortion',

  // Voltage Harmonics — Even (y Times)
  U1THDy:   'Phase 1 y Times Harmonics Voltage Distortion',
  U2THDy:   'Phase 2 y Times Harmonics Voltage Distortion',
  U3THDy:   'Phase 3 y Times Harmonics Voltage Distortion',
  UTHDyAvg: 'Average of y Times Harmonics Voltage Distortion',

  // Voltage Harmonics — Sub (z Times)
  U1THDz:   'Phase 1 z Times Harmonics Voltage Distortion',
  U2THDz:   'Phase 2 z Times Harmonics Voltage Distortion',
  U3THDz:   'Phase 3 z Times Harmonics Voltage Distortion',
  UTHDzAvg: 'Average of z Times Harmonics Voltage Distortion',

  // Energy — Active
  activeImportP1:    'Active Energy Import Phase 1',
  activeImportP2:    'Active Energy Import Phase 2',
  activeImportP3:    'Active Energy Import Phase 3',
  activeImportTotal: 'Total Active Energy Import Phase All',
  activeExportP1:    'Active Energy Export Phase 1',
  activeExportP2:    'Active Energy Export Phase 2',
  activeExportP3:    'Active Energy Export Phase 3',
  activeExportTotal: 'Total Active Energy Export Phase All',

  // Energy — Reactive
  reactiveImportP1:    'Reactive Energy Import Phase 1',
  reactiveImportP2:    'Reactive Energy Import Phase 2',
  reactiveImportP3:    'Reactive Energy Import Phase 3',
  reactiveImportTotal: 'Total Reactive Energy Import Phase All',
  reactiveExportP1:    'Reactive Energy Export Phase 1',
  reactiveExportP2:    'Reactive Energy Export Phase 2',
  reactiveExportP3:    'Reactive Energy Export Phase 3',
  reactiveExportTotal: 'Total Reactive Energy Export Phase All',

  // Energy — Apparent
  apparentImportP1:    'Apparent Energy Import Phase 1',
  apparentImportP2:    'Apparent Energy Import Phase 2',
  apparentImportP3:    'Apparent Energy Import Phase 3',
  apparentImportTotal: 'Total Apparent Energy Import Phase All',
  apparentExportP1:    'Apparent Energy Export Phase 1',
  apparentExportP2:    'Apparent Energy Export Phase 2',
  apparentExportP3:    'Apparent Energy Export Phase 3',
  apparentExportTotal: 'Total Apparent Energy Export Phase All',

  // Demand — Active Power
  activePresentDemand:     'Active Power Present Demand',
  activePeakDemand:        'Active Power Peak Demand',
  activePeakDateTime:      'Active Power Peak Demand Date/Time',

  // Demand — Reactive Power
  reactivePresentDemand:   'Reactive Power Present Demand',
  reactivePeakDemand:      'Reactive Power Peak Demand',
  reactivePeakDateTime:    'Reactive Power Peak Demand Date/Time',

  // Demand — Apparent Power
  apparentPresentDemand:   'Apparent Power Present Demand',
  apparentPeakDemand:      'Apparent Power Peak Demand',
  apparentPeakDateTime:    'Apparent Power Peak Demand Date/Time',

  // Demand — Current per phase
  I1PresentDemand:         'Current I1 Present Demand',
  I1PeakDemand:            'Current I1 Peak Demand',
  I1PeakDateTime:          'Current I1 Peak Demand Date/Time',

  I2PresentDemand:         'Current I2 Present Demand',
  I2PeakDemand:            'Current I2 Peak Demand',
  I2PeakDateTime:          'Current I2 Peak Demand Date/Time',

  I3PresentDemand:         'Current I3 Present Demand',
  I3PeakDemand:            'Current I3 Peak Demand',
  I3PeakDateTime:          'Current I3 Peak Demand Date/Time',

  IAvgPresentDemand:       'Current IAvg Present Demand',
  IAvgPeakDemand:          'Current IAvg Peak Demand',
  IAvgPeakDateTime:        'Current IAvg Peak Demand Date/Time',
};

/**
 * Creates initial clean DPM data structure with ZERO dummy values.
 */
export const createInitialDpmData = () => ({
  device: 'ME631',
  status: 'online',
  lastUpdate: '--:--:--',

  powerFactor: {
    PF1: 0, PF2: 0, PF3: 0, PFAvg: 0,
    DPF1: 0, DPF2: 0, DPF3: 0, DPFAvg: 0,
  },

  frequency: {
    Freq1: 0, Freq2: 0, Freq3: 0, FreqAvg: 0,
  },

  currentHarmonics: {
    I1THDx: 0, I2THDx: 0, I3THDx: 0, ITHDxAvg: 0,
    I1THDy: 0, I2THDy: 0, I3THDy: 0, ITHDyAvg: 0,
    I1THDz: 0, I2THDz: 0, I3THDz: 0, ITHDzAvg: 0,
    I1THD: 0, I2THD: 0, I3THD: 0, ITHDAvg: 0,
  },

  voltageHarmonics: {
    U1THDx: 0, U2THDx: 0, U3THDx: 0, UTHDxAvg: 0,
    U1THDy: 0, U2THDy: 0, U3THDy: 0, UTHDyAvg: 0,
    U1THDz: 0, U2THDz: 0, U3THDz: 0, UTHDzAvg: 0,
    U1THD: 0, U2THD: 0, U3THD: 0, UTHDAvg: 0,
  },

  current: {
    I1: 0, I2: 0, I3: 0, IAvg: 0,
  },

  voltage: {
    U1: 0, U2: 0, U3: 0, UAvg: 0,
    U12: 0, U23: 0, U31: 0,
  },

  activePower: {
    P1: 0, P2: 0, P3: 0, PTotal: 0,
  },

  reactivePower: {
    FQ1: 0, FQ2: 0, FQ3: 0, FQTotal: 0,
  },

  apparentPower: {
    S1: 0, S2: 0, S3: 0, STotal: 0,
  },

  energy: {
    activeImport: { P1: 0, P2: 0, P3: 0, Total: 0 },
    activeExport: { P1: 0, P2: 0, P3: 0, Total: 0 },
    reactiveImport: { P1: 0, P2: 0, P3: 0, Total: 0 },
    reactiveExport: { P1: 0, P2: 0, P3: 0, Total: 0 },
    apparentImport: { P1: 0, P2: 0, P3: 0, Total: 0 },
    apparentExport: { P1: 0, P2: 0, P3: 0, Total: 0 },
  },

  demand: {
    activePresentDemand: 0,
    activePeakDemand: 0,
    activePeakDateTime: '—',
    reactivePresentDemand: 0,
    reactivePeakDemand: 0,
    reactivePeakDateTime: '—',
    apparentPresentDemand: 0,
    apparentPeakDemand: 0,
    apparentPeakDateTime: '—',
    I1PresentDemand: 0, I1PeakDemand: 0, I1PeakDateTime: '—',
    I2PresentDemand: 0, I2PeakDemand: 0, I2PeakDateTime: '—',
    I3PresentDemand: 0, I3PeakDemand: 0, I3PeakDateTime: '—',
    IAvgPresentDemand: 0, IAvgPeakDemand: 0, IAvgPeakDateTime: '—',
  },

  summary: {
    avgVoltage: 0,
    avgCurrent: 0,
    avgFrequency: 0,
    totalActivePower: 0,
    totalApparentPower: 0,
    avgPowerFactor: 0,
    importedEnergy: 0,
    exportedEnergy: 0,
    peakDemand: 0,
    avgCurrentTHD: 0,
    avgVoltageTHD: 0,
    digitalOutput1: false,
    digitalOutput2: false,
  },

  alarmState: 0,
});

/**
 * Transform the device-readings API response for Device 2 into the DPM page state.
 *
 * @param {object} apiData - Response from fetchDeviceReadings(2)
 * @returns {object} - DPM page data object
 */
export const transformDpmResponse = (apiData) => {
  if (!apiData || !apiData.registers) {
    return createInitialDpmData();
  }

  const d = buildLookup(apiData.registers);

  const u1 = getVal(d, D.U1, 'Voltage Phase 1');
  const u2 = getVal(d, D.U2, 'Voltage Phase 2');
  const u3 = getVal(d, D.U3, 'Voltage Phase 3');

  // Calculate line-to-line voltage if not provided as a discrete register
  const calcL2L = (vA, vB) => {
    if (!vA && !vB) return 0;
    return Number((Math.sqrt(3) * ((vA + vB) / 2)).toFixed(2));
  };

  const u12 = getVal(d, D.U12) || calcL2L(u1, u2);
  const u23 = getVal(d, D.U23) || calcL2L(u2, u3);
  const u31 = getVal(d, D.U31) || calcL2L(u3, u1);

  return {
    device: apiData.deviceModel || 'ME631',
    status: 'online',
    lastUpdate: new Date().toLocaleTimeString(),

    // GROUP 1 — Power Factor
    powerFactor: {
      PF1:    getVal(d, D.PF1, 'Power Factor Phase 1'),
      PF2:    getVal(d, D.PF2, 'Power Factor Phase 2'),
      PF3:    getVal(d, D.PF3, 'Power Factor Phase 3'),
      PFAvg:  getVal(d, D.PFAvg),
      DPF1:   getVal(d, D.DPF1, 'Displacement Power Factor Phase 1'),
      DPF2:   getVal(d, D.DPF2, 'Displacement Power Factor Phase 2'),
      DPF3:   getVal(d, D.DPF3, 'Displacement Power Factor Phase 3'),
      DPFAvg: getVal(d, D.DPFAvg),
    },

    // GROUP 2 — Frequency
    frequency: {
      Freq1:   getVal(d, D.Freq1, 'Frequency Phase 1'),
      Freq2:   getVal(d, D.Freq2, 'Frequency Phase 2'),
      Freq3:   getVal(d, D.Freq3, 'Frequency Phase 3'),
      FreqAvg: getVal(d, D.FreqAvg),
    },

    // GROUP 3 — Current Harmonics
    currentHarmonics: {
      I1THDx:   getVal(d, D.I1THDx, 'Odd Harmonics Current Distortion Phase 1'),
      I2THDx:   getVal(d, D.I2THDx, 'Odd Harmonics Current Distortion Phase 2'),
      I3THDx:   getVal(d, D.I3THDx, 'Odd Harmonics Current Distortion Phase 3'),
      ITHDxAvg: getVal(d, D.ITHDxAvg, 'Average of Odd Harmonics Current Distortion'),
      I1THDy:   getVal(d, D.I1THDy, 'Even Harmonics Current Distortion Phase 1'),
      I2THDy:   getVal(d, D.I2THDy, 'Even Harmonics Current Distortion Phase 2'),
      I3THDy:   getVal(d, D.I3THDy, 'Even Harmonics Current Distortion Phase 3'),
      ITHDyAvg: getVal(d, D.ITHDyAvg, 'Average of Even Harmonics Current Distortion'),
      I1THDz:   getVal(d, D.I1THDz, 'Sub Harmonics Current Distortion Phase 1'),
      I2THDz:   getVal(d, D.I2THDz, 'Sub Harmonics Current Distortion Phase 2'),
      I3THDz:   getVal(d, D.I3THDz, 'Sub Harmonics Current Distortion Phase 3'),
      ITHDzAvg: getVal(d, D.ITHDzAvg, 'Average of Sub Harmonics Current Distortion'),
      I1THD:    getVal(d, D.I1THD, 'Total Harmonics Current Distortion Phase 1'),
      I2THD:    getVal(d, D.I2THD, 'Total Harmonics Current Distortion Phase 2'),
      I3THD:    getVal(d, D.I3THD, 'Total Harmonics Current Distortion Phase 3'),
      ITHDAvg:  getVal(d, D.ITHDAvg),
    },

    // GROUP 4 — Voltage Harmonics
    voltageHarmonics: {
      U1THDx:   getVal(d, D.U1THDx, 'Odd Harmonics Voltage Distortion Phase 1'),
      U2THDx:   getVal(d, D.U2THDx, 'Odd Harmonics Voltage Distortion Phase 2'),
      U3THDx:   getVal(d, D.U3THDx, 'Odd Harmonics Voltage Distortion Phase 3'),
      UTHDxAvg: getVal(d, D.UTHDxAvg, 'Average of Odd Harmonics Voltage Distortion'),
      U1THDy:   getVal(d, D.U1THDy, 'Even Harmonics Voltage Distortion Phase 1'),
      U2THDy:   getVal(d, D.U2THDy, 'Even Harmonics Voltage Distortion Phase 2'),
      U3THDy:   getVal(d, D.U3THDy, 'Even Harmonics Voltage Distortion Phase 3'),
      UTHDyAvg: getVal(d, D.UTHDyAvg, 'Average of Even Harmonics Voltage Distortion'),
      U1THDz:   getVal(d, D.U1THDz, 'Sub Harmonics Voltage Distortion Phase 1'),
      U2THDz:   getVal(d, D.U2THDz, 'Sub Harmonics Voltage Distortion Phase 2'),
      U3THDz:   getVal(d, D.U3THDz, 'Sub Harmonics Voltage Distortion Phase 3'),
      UTHDzAvg: getVal(d, D.UTHDzAvg, 'Average of Sub Harmonics Voltage Distortion'),
      U1THD:    getVal(d, D.U1THD, 'Total Harmonics Voltage Distortion Phase 1'),
      U2THD:    getVal(d, D.U2THD, 'Total Harmonics Voltage Distortion Phase 2'),
      U3THD:    getVal(d, D.U3THD, 'Total Harmonics Voltage Distortion Phase 3'),
      UTHDAvg:  getVal(d, D.UTHDAvg),
    },

    // GROUP 5 — Current
    current: {
      I1:   getVal(d, D.I1, 'Current Phase 1'),
      I2:   getVal(d, D.I2, 'Current Phase 2'),
      I3:   getVal(d, D.I3, 'Current Phase 3'),
      IAvg: getVal(d, D.IAvg),
    },

    // GROUP 6 — Voltage
    voltage: {
      U1:   u1,
      U2:   u2,
      U3:   u3,
      UAvg: getVal(d, D.UAvg),
      U12:  u12,
      U23:  u23,
      U31:  u31,
    },

    // GROUP 7 — Active Power
    activePower: {
      P1:     getVal(d, D.P1),
      P2:     getVal(d, D.P2),
      P3:     getVal(d, D.P3),
      PTotal: getVal(d, D.PTotal),
    },

    // GROUP 8 — Reactive Power
    reactivePower: {
      FQ1:     getVal(d, D.FQ1, 'Reactive Power Phase 1'),
      FQ2:     getVal(d, D.FQ2, 'Reactive Power Phase 2'),
      FQ3:     getVal(d, D.FQ3, 'Reactive Power Phase 3'),
      FQTotal: getVal(d, D.FQTotal, 'Total Reactive Power'),
    },

    // GROUP 9 — Apparent Power
    apparentPower: {
      S1:     getVal(d, D.S1),
      S2:     getVal(d, D.S2),
      S3:     getVal(d, D.S3),
      STotal: getVal(d, D.STotal),
    },

    // GROUP 10 — Energy
    energy: {
      activeImport: {
        P1:    getVal(d, D.activeImportP1),
        P2:    getVal(d, D.activeImportP2),
        P3:    getVal(d, D.activeImportP3),
        Total: getVal(d, D.activeImportTotal),
      },
      activeExport: {
        P1:    getVal(d, D.activeExportP1),
        P2:    getVal(d, D.activeExportP2),
        P3:    getVal(d, D.activeExportP3),
        Total: getVal(d, D.activeExportTotal),
      },
      reactiveImport: {
        P1:    getVal(d, D.reactiveImportP1),
        P2:    getVal(d, D.reactiveImportP2),
        P3:    getVal(d, D.reactiveImportP3),
        Total: getVal(d, D.reactiveImportTotal),
      },
      reactiveExport: {
        P1:    getVal(d, D.reactiveExportP1),
        P2:    getVal(d, D.reactiveExportP2),
        P3:    getVal(d, D.reactiveExportP3),
        Total: getVal(d, D.reactiveExportTotal),
      },
      apparentImport: {
        P1:    getVal(d, D.apparentImportP1),
        P2:    getVal(d, D.apparentImportP2),
        P3:    getVal(d, D.apparentImportP3),
        Total: getVal(d, D.apparentImportTotal),
      },
      apparentExport: {
        P1:    getVal(d, D.apparentExportP1),
        P2:    getVal(d, D.apparentExportP2),
        P3:    getVal(d, D.apparentExportP3),
        Total: getVal(d, D.apparentExportTotal),
      },
    },

    // GROUP 11 — Demand
    demand: {
      activePresentDemand:   getVal(d, D.activePresentDemand),
      activePeakDemand:      getVal(d, D.activePeakDemand),
      activePeakDateTime:    getRawVal(d, D.activePeakDateTime) || '—',
      reactivePresentDemand: getVal(d, D.reactivePresentDemand),
      reactivePeakDemand:    getVal(d, D.reactivePeakDemand),
      reactivePeakDateTime:  getRawVal(d, D.reactivePeakDateTime) || '—',
      apparentPresentDemand: getVal(d, D.apparentPresentDemand),
      apparentPeakDemand:    getVal(d, D.apparentPeakDemand),
      apparentPeakDateTime:  getRawVal(d, D.apparentPeakDateTime) || '—',
      I1PresentDemand:       getVal(d, D.I1PresentDemand, 'Current Phase 1 Present Demand'),
      I1PeakDemand:          getVal(d, D.I1PeakDemand, 'Current Phase 1 Peak Demand'),
      I1PeakDateTime:        getRawVal(d, D.I1PeakDateTime) || '—',
      I2PresentDemand:       getVal(d, D.I2PresentDemand, 'Current Phase 2 Present Demand'),
      I2PeakDemand:          getVal(d, D.I2PeakDemand, 'Current Phase 2 Peak Demand'),
      I2PeakDateTime:        getRawVal(d, D.I2PeakDateTime) || '—',
      I3PresentDemand:       getVal(d, D.I3PresentDemand, 'Current Phase 3 Present Demand'),
      I3PeakDemand:          getVal(d, D.I3PeakDemand, 'Current Phase 3 Peak Demand'),
      I3PeakDateTime:        getRawVal(d, D.I3PeakDateTime) || '—',
      IAvgPresentDemand:     getVal(d, D.IAvgPresentDemand, 'Average Current Present Demand'),
      IAvgPeakDemand:        getVal(d, D.IAvgPeakDemand, 'Average Current Peak Demand'),
      IAvgPeakDateTime:      getRawVal(d, D.IAvgPeakDateTime) || '—',
    },

    summary: {
      avgVoltage:         getVal(d, D.UAvg),
      avgCurrent:         getVal(d, D.IAvg),
      avgFrequency:       getVal(d, D.FreqAvg),
      totalActivePower:   getVal(d, D.PTotal),
      totalApparentPower: getVal(d, D.STotal),
      avgPowerFactor:     getVal(d, D.PFAvg),
      importedEnergy:     getVal(d, D.activeImportTotal),
      exportedEnergy:     getVal(d, D.activeExportTotal),
      peakDemand:         getVal(d, D.activePeakDemand),
      avgCurrentTHD:      getVal(d, D.ITHDAvg),
      avgVoltageTHD:      getVal(d, D.UTHDAvg),
      digitalOutput1:     false,
      digitalOutput2:     false,
    },

    alarmState: 0,
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// HISTORICAL POWER TRENDS & EXPORT (PTotal, STotal, FQTotal)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch historical power trends (PTotal, STotal, FQTotal) for a device.
 * @param {number} deviceId - Device ID (default: 2 for DPM)
 * @param {string} timeRange - '1h', '6h', '24h', '7d', '30d' (default: '30d')
 * @returns {Promise<object>}
 */
export const fetchDevicePowerTrends = async (deviceId = 2, timeRange = '30d', { background = false } = {}) => {
  const skipLoading = background;
  try {
    const response = await axiosInstance.get(`/readings/device/${deviceId}/power-trends`, {
      params: { timeRange },
      skipLoading,
    });
    return response.data?.data ?? response.data;
  } catch (err) {
    console.warn('[deviceReadingService] fetchDevicePowerTrends direct route error, trying timeseries fallback:', err.message);
    try {
      const dev = await fetchDeviceReadings(deviceId, { background });
      const registers = dev.registers || [];
      const pReg = registers.find(r => r.registerName?.toLowerCase().includes('total of active power'));
      const sReg = registers.find(r => r.registerName?.toLowerCase().includes('total apparent power'));
      const fqReg = registers.find(r => r.registerName?.toLowerCase().includes('reactive power') && r.registerName?.toLowerCase().includes('total'));

      const results = await Promise.allSettled([
        pReg?.registerId ? axiosInstance.get(`/readings/register/${pReg.registerId}/timeseries`, { params: { timeRange }, skipLoading }) : null,
        sReg?.registerId ? axiosInstance.get(`/readings/register/${sReg.registerId}/timeseries`, { params: { timeRange }, skipLoading }) : null,
        fqReg?.registerId ? axiosInstance.get(`/readings/register/${fqReg.registerId}/timeseries`, { params: { timeRange }, skipLoading }) : null,
      ]);

      const pData = results[0].status === 'fulfilled' ? (results[0].value?.data?.data?.data || []) : [];
      const sData = results[1].status === 'fulfilled' ? (results[1].value?.data?.data?.data || []) : [];
      const fqData = results[2].status === 'fulfilled' ? (results[2].value?.data?.data?.data || []) : [];

      const map = new Map();
      const addPoints = (arr, key) => {
        for (const item of arr) {
          const iso = new Date(item.RecordedAt).toISOString();
          const bucket = iso.slice(0, 16) + ':00.000Z';
          if (!map.has(bucket)) {
            map.set(bucket, {
              timestamp: item.RecordedAt,
              isoTimestamp: iso,
              pTotal: null,
              sTotal: null,
              fqTotal: null,
            });
          }
          map.get(bucket)[key] = Number(item.ScaledValue);
        }
      };

      addPoints(pData, 'pTotal');
      addPoints(sData, 'sTotal');
      addPoints(fqData, 'fqTotal');

      const alignedRecords = Array.from(map.values()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return {
        deviceId,
        timeRange,
        alignedRecords,
        count: alignedRecords.length,
      };
    } catch (fallbackErr) {
      console.error('[deviceReadingService] Fallback also failed:', fallbackErr);
      return { deviceId, timeRange, alignedRecords: [], count: 0 };
    }
  }
};

/**
 * Generate Excel-compatible CSV string with UTF-8 BOM.
 */
export const generatePowerTrendCsv = (records = [], options = {}) => {
  const {
    deviceName = 'AMF Board Outgoing DPM',
    deviceModel = 'ME631',
    deviceId = 2,
  } = options;

  const headers = [
    'Timestamp (UTC)',
    'Date & Time (Local)',
    'Active Power (PTotal) [kW]',
    'Apparent Power (STotal) [kVA]',
    'Reactive Power (FQTotal) [kVar]',
    'Device Name',
    'Device Model',
    'Device ID',
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return `"${s}"`;
  };

  const rows = records.map((r) => {
    const d = new Date(r.timestamp || r.isoTimestamp);
    const localStr = !isNaN(d.getTime())
      ? d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0') + ':' +
        String(d.getSeconds()).padStart(2, '0')
      : String(r.timestamp);

    const isoStr = !isNaN(d.getTime()) ? d.toISOString() : String(r.isoTimestamp || r.timestamp);

    return [
      escapeCsv(isoStr),
      escapeCsv(localStr),
      r.pTotal != null ? Number(r.pTotal).toFixed(2) : '0.00',
      r.sTotal != null ? Number(r.sTotal).toFixed(2) : '0.00',
      r.fqTotal != null ? Number(r.fqTotal).toFixed(2) : '0.00',
      escapeCsv(deviceName),
      escapeCsv(deviceModel),
      deviceId,
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
};

/**
 * Generate Microsoft XML Spreadsheet (SpreadsheetML) workbook compatible with Excel (.xlsx / .xls).
 */
export const generatePowerTrendExcel = (records = [], options = {}) => {
  const {
    deviceName = 'AMF Board Outgoing DPM',
    deviceModel = 'ME631',
    deviceId = 2,
    timeRange = '30d',
  } = options;

  const escapeXml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const rangeLabel = timeRange === '30d' ? 'Past 30 Days (1 Month)' : timeRange === '7d' ? 'Past 7 Days' : 'Past 24 Hours';

  let xmlRows = '';
  for (const r of records) {
    const d = new Date(r.timestamp || r.isoTimestamp);
    const localStr = !isNaN(d.getTime())
      ? d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0') + ':' +
        String(d.getSeconds()).padStart(2, '0')
      : String(r.timestamp);
    const isoStr = !isNaN(d.getTime()) ? d.toISOString() : String(r.isoTimestamp || r.timestamp);

    const p = r.pTotal != null ? Number(r.pTotal).toFixed(2) : '0.00';
    const s = r.sTotal != null ? Number(r.sTotal).toFixed(2) : '0.00';
    const fq = r.fqTotal != null ? Number(r.fqTotal).toFixed(2) : '0.00';

    xmlRows += `   <Row ss:Height="20">
    <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${escapeXml(isoStr)}</Data></Cell>
    <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${escapeXml(localStr)}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${p}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${s}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${fq}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${escapeXml(deviceName)}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${escapeXml(deviceModel)}</Data></Cell>
    <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${deviceId}</Data></Cell>
   </Row>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Elliance MKS</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="Meta">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#64748B" ss:Italic="1"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataText">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Power Trends 30D">
  <Table>
   <Column ss:Width="160"/>
   <Column ss:Width="140"/>
   <Column ss:Width="150"/>
   <Column ss:Width="150"/>
   <Column ss:Width="150"/>
   <Column ss:Width="190"/>
   <Column ss:Width="110"/>
   <Column ss:Width="80"/>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="7" ss:StyleID="Title"><Data ss:Type="String">AMF Board Outgoing DPM (ME631) — Power &amp; Demand Historical Trend</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="7" ss:StyleID="Meta"><Data ss:Type="String">Date Range: ${rangeLabel} | Generated: ${new Date().toLocaleString()} | Total Records: ${records.length}</Data></Cell>
   </Row>
   <Row ss:Height="8"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Timestamp (UTC)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Date &amp; Time (Local)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Active Power (PTotal) [kW]</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Apparent Power (STotal) [kVA]</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Reactive Power (FQTotal) [kVar]</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Device Name</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Device Model</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Device ID</Data></Cell>
   </Row>
${xmlRows}  </Table>
 </Worksheet>
</Workbook>`;
};

/**
 * Generate Excel-compatible CSV string for a SINGLE trend metric with UTF-8 BOM.
 */
export const generateSingleTrendCsv = (records = [], options = {}) => {
  const {
    metricKey = 'pTotal',
    metricLabel = 'Active Power (PTotal)',
    metricUnit = 'kW',
    deviceName = 'AMF Board Outgoing DPM',
    deviceModel = 'ME631',
    deviceId = 2,
  } = options;

  const headers = [
    'Timestamp (UTC)',
    'Date & Time (Local)',
    `${metricLabel} [${metricUnit}]`,
    'Device Name',
    'Device Model',
    'Device ID',
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return `"${s}"`;
  };

  const rows = records.map((r) => {
    const d = new Date(r.timestamp || r.isoTimestamp);
    const localStr = !isNaN(d.getTime())
      ? d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0') + ':' +
        String(d.getSeconds()).padStart(2, '0')
      : String(r.timestamp);

    const isoStr = !isNaN(d.getTime()) ? d.toISOString() : String(r.isoTimestamp || r.timestamp);
    const val = r[metricKey] != null ? Number(r[metricKey]).toFixed(2) : '0.00';

    return [
      escapeCsv(isoStr),
      escapeCsv(localStr),
      val,
      escapeCsv(deviceName),
      escapeCsv(deviceModel),
      deviceId,
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
};

/**
 * Generate Microsoft XML Spreadsheet (SpreadsheetML) workbook for a SINGLE trend metric.
 */
export const generateSingleTrendExcel = (records = [], options = {}) => {
  const {
    metricKey = 'pTotal',
    metricLabel = 'Active Power (PTotal)',
    metricUnit = 'kW',
    deviceName = 'AMF Board Outgoing DPM',
    deviceModel = 'ME631',
    deviceId = 2,
    timeRange = '30d',
  } = options;

  const escapeXml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const rangeLabel = timeRange === '30d' ? 'Past 30 Days (1 Month)' : timeRange === '7d' ? 'Past 7 Days' : 'Past 24 Hours';

  let xmlRows = '';
  for (const r of records) {
    const d = new Date(r.timestamp || r.isoTimestamp);
    const localStr = !isNaN(d.getTime())
      ? d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0') + ':' +
        String(d.getSeconds()).padStart(2, '0')
      : String(r.timestamp);
    const isoStr = !isNaN(d.getTime()) ? d.toISOString() : String(r.isoTimestamp || r.timestamp);
    const val = r[metricKey] != null ? Number(r[metricKey]).toFixed(2) : '0.00';

    xmlRows += `   <Row ss:Height="20">
    <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${escapeXml(isoStr)}</Data></Cell>
    <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${escapeXml(localStr)}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${val}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${escapeXml(deviceName)}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${escapeXml(deviceModel)}</Data></Cell>
    <Cell ss:StyleID="DataCenter"><Data ss:Type="Number">${deviceId}</Data></Cell>
   </Row>\n`;
  }

  // Worksheet names must be <= 31 characters
  const rawSheet = metricLabel.replace(/[\[\]\*\?\/\\:]/g, '');
  const sheetName = escapeXml(rawSheet.slice(0, 31));

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Elliance MKS</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Title">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="Meta">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#64748B" ss:Italic="1"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#6366F1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataText">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sheetName}">
  <Table>
   <Column ss:Width="160"/>
   <Column ss:Width="140"/>
   <Column ss:Width="180"/>
   <Column ss:Width="190"/>
   <Column ss:Width="110"/>
   <Column ss:Width="80"/>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">${escapeXml(deviceName)} (${escapeXml(deviceModel)}) — ${escapeXml(metricLabel)}</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="5" ss:StyleID="Meta"><Data ss:Type="String">Date Range: ${rangeLabel} | Generated: ${new Date().toLocaleString()} | Total Records: ${records.length}</Data></Cell>
   </Row>
   <Row ss:Height="8"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Timestamp (UTC)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Date &amp; Time (Local)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(metricLabel)} [${escapeXml(metricUnit)}]</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Device Name</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Device Model</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Device ID</Data></Cell>
   </Row>
${xmlRows}  </Table>
 </Worksheet>
</Workbook>`;
};

/**
 * Triggers a file download in the browser.
 */
export const downloadExportFile = (content, filename, mimeType) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
