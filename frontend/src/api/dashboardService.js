/**
 * dashboardService.js
 * API service for GET /api/v1/readings/dashboard.
 *
 * Connects the backend dashboard endpoint to the frontend Overview Dashboard page.
 * Fetches dynamic register readings for DSE7320 MKII (Genset) and ME631 (DPM),
 * mapping backend register names and scaled values to the frontend dashboard structure.
 */

import axiosInstance from './axiosInstance';
import { getInactiveNames } from './deviceReadingService';

// ─── Register name constants (matching RegisterDefinitions.RegisterName) ─────
export const G = {
  loadPercent: 'Generator Percentage Of Full Power',
  oilPressure: 'Oil Pressure',
  coolantTemp: 'Coolant Temperature',
  fuelLevel: 'Fuel Level',
  batteryV: 'Engine Battery Voltage',
  engineSpeed: 'Engine Speed',
  genFreq: 'Generator Frequency',
  voltL1N: 'Generator L1-N Voltage',
  voltL2N: 'Generator L2-N Voltage',
  voltL3N: 'Generator L3-N Voltage',
  totalWatts: 'Generator Total Watts',
  avgPF: 'Generator Average Power Factor',
  mainsFreq: 'Mains Frequency',
  mainsVoltL1N: 'Mains L1-N Voltage',
};

export const D = {
  avgVoltage: 'Average of Voltage',
  avgCurrent: 'Average of Current',
  avgFrequency: 'Average of Frequency',
  totalActivePower: 'Total of Active Power',
  totalApparent: 'Total Apparent Power',
  avgPF: 'Average of Power Factor',
  importedEnergy: 'Total Active Energy Import Phase All',
  exportedEnergy: 'Total Active Energy Export Phase All',
  peakDemand: 'Active Power Peak Demand',
  currentTHD: 'Average of Total Harmonics Current Distortion',
  voltageTHD: 'Average of Total Harmonics Voltage Distortion',
};

/**
 * Build a lookup map from the registers array:
 * { [registerName]: numericScaledValue | null }
 */
const buildLookup = (registers = []) => {
  const map = {};
  if (!Array.isArray(registers)) return map;
  for (const r of registers) {
    if (r && r.registerName) {
      const key = String(r.registerName).trim();
      const val = r.scaledValue != null ? r.scaledValue : null;
      map[key] = val;
      map[key.toLowerCase()] = val;
    }
  }
  return map;
};

/**
 * Helper to safely extract a numeric value.
 * If the register exists with a numeric reading, returns that reading.
 * If the register has no reading yet (null in DB), returns fallback (default 0).
 */
const num = (v, fallback = 0) => {
  if (v !== null && v !== undefined && v !== '') {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
};

/**
 * Transform backend GET /api/v1/readings/dashboard payload into
 * the exact data structure expected by Dashboard.jsx.
 *
 * Preserves the existing dashboard UI and layout while populating
 * all displayed register values dynamically from the API response.
 */
export const transformDashboardResponse = (apiData, prevOv = {}) => {
  if (!apiData) return prevOv;

  const gensetMeta = apiData.genset || {};
  const dpmMeta = apiData.dpm || {};

  const g = buildLookup(gensetMeta.registers);
  const d = buildLookup(dpmMeta.registers);

  // Engine state derived dynamically from Engine Speed register
  const speed = num(g[G.engineSpeed], 0);
  const engineRunning = speed > 100;
  const engineMode = engineRunning ? 'Auto' : 'Stop';

  // Alarms: preserve any existing alarm structure or empty
  const alarms = prevOv?.genset?.alarms || {
    emergencyStop: 1, lowOilPressure: 1, highCoolantTemp: 1, lowCoolantTemp: 1,
    underSpeed: 1, overSpeed: 1, genUnderFreq: 1, genOverFreq: 1,
    genLowVoltage: 1, genHighVoltage: 1, batteryLowVoltage: 1, batteryHighVoltage: 1,
    failToStart: 1, failToStop: 1, genHighCurrent: 1, lowFuelLevel: 1,
    canEcuWarning: 1, canEcuShutdown: 1, genShortCircuit: 1, mainsShortCircuit: 1,
    earthFault: 1, maintenanceAlarm: 1, loadingFreqAlarm: 1, loadingVoltAlarm: 1,
  };
  const activeAlerts = Object.values(alarms).filter(v => v > 1).length;

  const totalDevices = 2;
  const onlineDevices = (gensetMeta.isActive ? 1 : 0) + (dpmMeta.isActive ? 1 : 0);
  const offlineDevices = totalDevices - onlineDevices;

  // Build dynamic Genset state
  const genset = {
    name: gensetMeta.deviceName || 'AMF Control Module #1',
    device: gensetMeta.deviceModel || 'DSE7320 MKII',
    status: gensetMeta.isActive ? 'online' : 'warning',
    lastUpdate: apiData.generatedAt ? new Date(apiData.generatedAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
    engineMode,
    engineRunning,
    loadPercent: prevOv?.genset?.loadPercent ?? 0,

    engine: {
      speed,
      coolantTemp: num(g[G.coolantTemp], 0),
      oilPressure: num(g[G.oilPressure], 0),
      oilTemp: 0,
      fuelLevel: num(g[G.fuelLevel], 0),
      batteryVoltage: num(g[G.batteryV], 0),
      chargeAltVoltage: 0,
      boostPressure: 0,
      runTime: 0,
      numberOfStarts: 0,
    },

    generator: {
      frequency: num(g[G.genFreq], 0),
      voltL1N: num(g[G.voltL1N], 0),
      voltL2N: num(g[G.voltL2N], 0),
      voltL3N: num(g[G.voltL3N], 0),
      voltL1L2: prevOv?.genset?.generator?.voltL1L2 ?? 0,
      voltL2L3: prevOv?.genset?.generator?.voltL2L3 ?? 0,
      voltL3L1: prevOv?.genset?.generator?.voltL3L1 ?? 0,
      currentL1: prevOv?.genset?.generator?.currentL1 ?? 0,
      currentL2: prevOv?.genset?.generator?.currentL2 ?? 0,
      currentL3: prevOv?.genset?.generator?.currentL3 ?? 0,
      currentEarth: prevOv?.genset?.generator?.currentEarth ?? 0,
      wattsL1: prevOv?.genset?.generator?.wattsL1 ?? 0,
      wattsL2: prevOv?.genset?.generator?.wattsL2 ?? 0,
      wattsL3: prevOv?.genset?.generator?.wattsL3 ?? 0,
      totalWatts: num(g[G.totalWatts], 0),
      vaL1: prevOv?.genset?.generator?.vaL1 ?? 0,
      vaL2: prevOv?.genset?.generator?.vaL2 ?? 0,
      vaL3: prevOv?.genset?.generator?.vaL3 ?? 0,
      totalVA: prevOv?.genset?.generator?.totalVA ?? 0,
      varL1: prevOv?.genset?.generator?.varL1 ?? 0,
      varL2: prevOv?.genset?.generator?.varL2 ?? 0,
      varL3: prevOv?.genset?.generator?.varL3 ?? 0,
      totalVar: prevOv?.genset?.generator?.totalVar ?? 0,
      pfL1: prevOv?.genset?.generator?.pfL1 ?? 0,
      pfL2: prevOv?.genset?.generator?.pfL2 ?? 0,
      pfL3: prevOv?.genset?.generator?.pfL3 ?? 0,
      avgPF: num(g[G.avgPF], 0),
      positiveKWh: prevOv?.genset?.generator?.positiveKWh ?? 0,
      negativeKWh: prevOv?.genset?.generator?.negativeKWh ?? 0,
      kVAh: prevOv?.genset?.generator?.kVAh ?? 0,
      kVArh: prevOv?.genset?.generator?.kVArh ?? 0,
    },

    mains: {
      frequency: num(g[G.mainsFreq], 0),
      voltL1N: num(g[G.mainsVoltL1N], 0),
      voltL2N: prevOv?.genset?.mains?.voltL2N ?? 0,
      voltL3N: prevOv?.genset?.mains?.voltL3N ?? 0,
      voltL1L2: prevOv?.genset?.mains?.voltL1L2 ?? 0,
      voltL2L3: prevOv?.genset?.mains?.voltL2L3 ?? 0,
      voltL3L1: prevOv?.genset?.mains?.voltL3L1 ?? 0,
      phaseRotation: prevOv?.genset?.mains?.phaseRotation ?? 'ABC',
      currentL1: prevOv?.genset?.mains?.currentL1 ?? 0,
      currentL2: prevOv?.genset?.mains?.currentL2 ?? 0,
      currentL3: prevOv?.genset?.mains?.currentL3 ?? 0,
      totalWatts: prevOv?.genset?.mains?.totalWatts ?? 0,
      totalVA: prevOv?.genset?.mains?.totalVA ?? 0,
      totalVar: prevOv?.genset?.mains?.totalVar ?? 0,
      avgPF: prevOv?.genset?.mains?.avgPF ?? 0,
    },

    status_flags: prevOv?.genset?.status_flags ?? {},
    leds: prevOv?.genset?.leds ?? {},
    alarms,
  };

  // Build dynamic DPM state
  const dpm = {
    device: dpmMeta.deviceModel || 'ME631',
    status: dpmMeta.isActive ? 'online' : 'warning',
    lastUpdate: apiData.generatedAt ? new Date(apiData.generatedAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
    summary: {
      avgVoltage: num(d[D.avgVoltage], 0),
      avgCurrent: num(d[D.avgCurrent], 0),
      avgFrequency: num(d[D.avgFrequency], 0),
      totalActivePower: num(d[D.totalActivePower], 0),
      totalApparentPower: num(d[D.totalApparent], 0),
      avgPowerFactor: num(d[D.avgPF], 0),
      importedEnergy: num(d[D.importedEnergy], 0),
      exportedEnergy: num(d[D.exportedEnergy], 0),
      peakDemand: num(d[D.peakDemand], 0),
      avgCurrentTHD: num(d[D.currentTHD], 0),
      avgVoltageTHD: num(d[D.voltageTHD], 0),
      digitalOutput1: prevOv?.dpm?.summary?.digitalOutput1 ?? false,
      digitalOutput2: prevOv?.dpm?.summary?.digitalOutput2 ?? false,
    },
    powerFactor: prevOv?.dpm?.powerFactor ?? {},
    frequency: prevOv?.dpm?.frequency ?? {},
    currentHarmonics: prevOv?.dpm?.currentHarmonics ?? {},
    voltageHarmonics: prevOv?.dpm?.voltageHarmonics ?? {},
    current: prevOv?.dpm?.current ?? {},
    voltage: prevOv?.dpm?.voltage ?? {},
    activePower: prevOv?.dpm?.activePower ?? {},
    reactivePower: prevOv?.dpm?.reactivePower ?? {},
    apparentPower: prevOv?.dpm?.apparentPower ?? {},
    energy: prevOv?.dpm?.energy ?? {},
    demand: prevOv?.dpm?.demand ?? {},
    alarmState: prevOv?.dpm?.alarmState ?? 0,
  };

  return {
    totalDevices,
    onlineDevices,
    offlineDevices,
    activeAlerts,
    genset,
    dpm,
    // Registers with Status <> 'Active' — their widgets are hidden
    inactive: getInactiveNames([...(gensetMeta.registers || []), ...(dpmMeta.registers || [])]),
    _meta: {
      totalReadings: apiData.totalReadings,
      generatedAt: apiData.generatedAt,
      source: 'api',
    },
  };
};

/**
 * Creates clean initial Dashboard data with 0 defaults (no mock data).
 */
export const createInitialDashboardData = () => ({
  totalDevices: 2,
  onlineDevices: 2,
  offlineDevices: 0,
  activeAlerts: 0,
  genset: {
    name: 'AMF Control Module #1',
    device: 'DSE7320 MKII',
    status: 'online',
    lastUpdate: '--:--:--',
    engineMode: 'Stop',
    engineRunning: false,
    loadPercent: 0,
    engine: {
      speed: 0, coolantTemp: 0, oilPressure: 0, oilTemp: 0, fuelLevel: 0,
      batteryVoltage: 0, chargeAltVoltage: 0, boostPressure: 0, runTime: 0, numberOfStarts: 0,
    },
    generator: {
      frequency: 0, voltL1N: 0, voltL2N: 0, voltL3N: 0, voltL1L2: 0, voltL2L3: 0, voltL3L1: 0,
      currentL1: 0, currentL2: 0, currentL3: 0, currentEarth: 0,
      wattsL1: 0, wattsL2: 0, wattsL3: 0, totalWatts: 0,
      vaL1: 0, vaL2: 0, vaL3: 0, totalVA: 0,
      varL1: 0, varL2: 0, varL3: 0, totalVar: 0,
      pfL1: 0, pfL2: 0, pfL3: 0, avgPF: 0,
      positiveKWh: 0, negativeKWh: 0, kVAh: 0, kVArh: 0,
    },
    mains: {
      frequency: 0, voltL1N: 0, voltL2N: 0, voltL3N: 0, voltL1L2: 0, voltL2L3: 0, voltL3L1: 0,
      phaseRotation: 'ABC', currentL1: 0, currentL2: 0, currentL3: 0,
      totalWatts: 0, totalVA: 0, totalVar: 0, avgPF: 0,
    },
    status_flags: {},
    leds: {},
    alarms: {},
  },
  dpm: {
    device: 'ME631',
    status: 'online',
    lastUpdate: '--:--:--',
    powerFactor: { PF1: 0, PF2: 0, PF3: 0, PFAvg: 0, DPF1: 0, DPF2: 0, DPF3: 0, DPFAvg: 0 },
    frequency: { Freq1: 0, Freq2: 0, Freq3: 0, FreqAvg: 0 },
    currentHarmonics: { I1THDx: 0, I2THDx: 0, I3THDx: 0, ITHDxAvg: 0, I1THDy: 0, I2THDy: 0, I3THDy: 0, ITHDyAvg: 0, I1THDz: 0, I2THDz: 0, I3THDz: 0, ITHDzAvg: 0, I1THD: 0, I2THD: 0, I3THD: 0, ITHDAvg: 0 },
    voltageHarmonics: { U1THDx: 0, U2THDx: 0, U3THDx: 0, UTHDxAvg: 0, U1THDy: 0, U2THDy: 0, U3THDy: 0, UTHDyAvg: 0, U1THDz: 0, U2THDz: 0, U3THDz: 0, UTHDzAvg: 0, U1THD: 0, U2THD: 0, U3THD: 0, UTHDAvg: 0 },
    current: { I1: 0, I2: 0, I3: 0, IAvg: 0 },
    voltage: { U1: 0, U2: 0, U3: 0, UAvg: 0, U12: 0, U23: 0, U31: 0 },
    activePower: { P1: 0, P2: 0, P3: 0, PTotal: 0 },
    reactivePower: { FQ1: 0, FQ2: 0, FQ3: 0, FQTotal: 0 },
    apparentPower: { S1: 0, S2: 0, S3: 0, STotal: 0 },
    energy: {
      activeImport: { P1: 0, P2: 0, P3: 0, Total: 0 },
      activeExport: { P1: 0, P2: 0, P3: 0, Total: 0 },
      reactiveImport: { P1: 0, P2: 0, P3: 0, Total: 0 },
      reactiveExport: { P1: 0, P2: 0, P3: 0, Total: 0 },
      apparentImport: { P1: 0, P2: 0, P3: 0, Total: 0 },
      apparentExport: { P1: 0, P2: 0, P3: 0, Total: 0 },
    },
    demand: {
      activePresentDemand: 0, activePeakDemand: 0, activePeakDateTime: '—',
      reactivePresentDemand: 0, reactivePeakDemand: 0, reactivePeakDateTime: '—',
      apparentPresentDemand: 0, apparentPeakDemand: 0, apparentPeakDateTime: '—',
      I1PresentDemand: 0, I1PeakDemand: 0, I1PeakDateTime: '—',
      I2PresentDemand: 0, I2PeakDemand: 0, I2PeakDateTime: '—',
      I3PresentDemand: 0, I3PeakDemand: 0, I3PeakDateTime: '—',
      IAvgPresentDemand: 0, IAvgPeakDemand: 0, IAvgPeakDateTime: '—',
    },
    summary: {
      avgVoltage: 0, avgCurrent: 0, avgFrequency: 0, totalActivePower: 0,
      totalApparentPower: 0, avgPowerFactor: 0, importedEnergy: 0, exportedEnergy: 0,
      peakDemand: 0, avgCurrentTHD: 0, avgVoltageTHD: 0, digitalOutput1: false, digitalOutput2: false,
    },
  },
  inactive: new Set(),
});

/**
 * Fetch the dashboard snapshot from the backend via GET /api/v1/readings/dashboard
 *
 * @param {object} prevData - Previous state data used for non-register properties
 * @returns {Promise<object>} Normalised dashboard data object
 */
export const fetchDashboard = async (prevData, { background = false } = {}) => {
  // background = timed refresh: no global loading spinner
  const response = await axiosInstance.get('/readings/dashboard', { skipLoading: background });
  const apiData = response.data?.data ?? response.data;
  return transformDashboardResponse(apiData, prevData);
};

