// ============================================================
// ModBas Dashboard — Mock Data Layer
// Based on: Modbus_Register_Reference_1.xlsx & MODBUS LIST MANUAL ME631.pdf
//
// Architecture: API → Data/Service Layer → State → UI
// TODO: Replace each generate* function with the corresponding API fetch:
//   GET /api/overview | /api/gensets | /api/dpm | /api/alerts | /api/thresholds | /api/users
// ============================================================

const rand = (min, max, dp = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(dp));

const vary = (base, pct = 0.03) =>
  parseFloat((base * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(2));

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── ME631 Power Meter ───────────────────────────────────────
// Register groups per MODBUS LIST MANUAL ME631.pdf (page 12+)
// TODO: fetch from GET /api/dpm
export const generateME631Data = () => ({
  device: 'ME631',
  status: 'online',
  lastUpdate: new Date().toLocaleTimeString(),

  // GROUP 1 — Power Factor (p.12)
  // PF = True Power Factor, DPF = Displacement Power Factor
  powerFactor: {
    PF1: vary(0.962, 0.03),    PF2: vary(0.948, 0.03),    PF3: vary(0.955, 0.03),    PFAvg: vary(0.955, 0.02),
    DPF1: vary(0.971, 0.02),   DPF2: vary(0.958, 0.02),   DPF3: vary(0.963, 0.02),   DPFAvg: vary(0.964, 0.02),
  },

  // GROUP 2 — Frequency (p.13)
  frequency: {
    Freq1: vary(50.02, 0.004), Freq2: vary(50.01, 0.004),
    Freq3: vary(50.00, 0.004), FreqAvg: vary(50.01, 0.003),
  },

  // GROUP 3 — Current Harmonics (p.14)
  // x = odd-order harmonics, y = even-order harmonics, z = sub-harmonics
  currentHarmonics: {
    I1THDx: vary(6.34, 0.15),  I2THDx: vary(5.98, 0.15),  I3THDx: vary(6.12, 0.15),  ITHDxAvg: vary(6.15, 0.12),
    I1THDy: vary(1.24, 0.2),   I2THDy: vary(1.12, 0.2),   I3THDy: vary(1.18, 0.2),   ITHDyAvg: vary(1.18, 0.18),
    I1THDz: vary(0.45, 0.25),  I2THDz: vary(0.38, 0.25),  I3THDz: vary(0.41, 0.25),  ITHDzAvg: vary(0.41, 0.2),
    I1THD:  vary(7.82, 0.1),   I2THD:  vary(7.52, 0.1),   I3THD:  vary(7.65, 0.1),   ITHDAvg: vary(7.66, 0.08),
  },

  // GROUP 4 — Voltage Harmonics (p.15)
  voltageHarmonics: {
    U1THDx: vary(2.14, 0.15),  U2THDx: vary(2.08, 0.15),  U3THDx: vary(2.21, 0.15),  UTHDxAvg: vary(2.14, 0.12),
    U1THDy: vary(0.42, 0.2),   U2THDy: vary(0.38, 0.2),   U3THDy: vary(0.45, 0.2),   UTHDyAvg: vary(0.42, 0.18),
    U1THDz: vary(0.18, 0.25),  U2THDz: vary(0.15, 0.25),  U3THDz: vary(0.19, 0.25),  UTHDzAvg: vary(0.17, 0.2),
    U1THD:  vary(2.34, 0.1),   U2THD:  vary(2.18, 0.1),   U3THD:  vary(2.45, 0.1),   UTHDAvg: vary(2.32, 0.08),
  },

  // GROUP 5 — Current (registers ~2139+)
  current: {
    I1: vary(12.45, 0.06), I2: vary(11.82, 0.06), I3: vary(12.18, 0.06), IAvg: vary(12.15, 0.05),
  },

  // GROUP 6 — Voltage (registers ~2147+)
  voltage: {
    U1: vary(230.8, 0.015), U2: vary(229.5, 0.015), U3: vary(231.1, 0.015), UAvg: vary(230.5, 0.01),
    // Line voltages
    U12: vary(399.6, 0.015), U23: vary(398.1, 0.015), U31: vary(400.0, 0.015),
  },

  // GROUP 7 — Active Power (registers ~2155+)
  activePower: {
    P1: vary(2.87, 0.08), P2: vary(2.72, 0.08), P3: vary(2.80, 0.08), PTotal: vary(8.39, 0.06),
  },

  // GROUP 8 — Reactive Power
  reactivePower: {
    FQ1: vary(0.84, 0.12), FQ2: vary(0.79, 0.12), FQ3: vary(0.81, 0.12), FQTotal: vary(2.44, 0.1),
  },

  // GROUP 9 — Apparent Power
  apparentPower: {
    S1: vary(2.99, 0.08), S2: vary(2.83, 0.08), S3: vary(2.92, 0.08), STotal: vary(8.74, 0.06),
  },

  // GROUP 10 — Energy (kWh / kVarh / kVAh)
  energy: {
    // Active energy
    activeImport: {
      P1: vary(41820.4, 0.001), P2: vary(39640.2, 0.001), P3: vary(40680.5, 0.001),
      Total: vary(122141.1, 0.001),
    },
    activeExport: {
      P1: vary(820.4, 0.003),   P2: vary(742.8, 0.003),   P3: vary(781.6, 0.003),
      Total: vary(2344.8, 0.003),
    },
    // Reactive energy
    reactiveImport: {
      P1: vary(12480.3, 0.001), P2: vary(11820.6, 0.001), P3: vary(12150.4, 0.001),
      Total: vary(36451.3, 0.001),
    },
    reactiveExport: {
      P1: vary(520.1, 0.003),   P2: vary(480.5, 0.003),   P3: vary(500.2, 0.003),
      Total: vary(1500.8, 0.003),
    },
    // Apparent energy
    apparentImport: {
      P1: vary(43420.8, 0.001), P2: vary(41240.4, 0.001), P3: vary(42330.6, 0.001),
      Total: vary(126991.8, 0.001),
    },
    apparentExport: {
      P1: vary(902.4, 0.003),   P2: vary(820.2, 0.003),   P3: vary(861.3, 0.003),
      Total: vary(2583.9, 0.003),
    },
  },

  // GROUP 11 — Demand
  demand: {
    // Active power demand
    activePresentDemand: vary(8.39, 0.08),
    activePeakDemand: vary(12.56, 0.02),
    activePeakDateTime: '2026-09-05 14:32',
    // Reactive power demand
    reactivePresentDemand: vary(2.44, 0.1),
    reactivePeakDemand: vary(3.82, 0.02),
    reactivePeakDateTime: '2026-09-05 14:30',
    // Apparent power demand
    apparentPresentDemand: vary(8.74, 0.08),
    apparentPeakDemand: vary(13.21, 0.02),
    apparentPeakDateTime: '2026-09-05 14:32',
    // Current demand per phase
    I1PresentDemand: vary(12.45, 0.06), I1PeakDemand: vary(18.62, 0.02), I1PeakDateTime: '2026-09-04 09:15',
    I2PresentDemand: vary(11.82, 0.06), I2PeakDemand: vary(17.84, 0.02), I2PeakDateTime: '2026-09-04 09:18',
    I3PresentDemand: vary(12.18, 0.06), I3PeakDemand: vary(18.20, 0.02), I3PeakDateTime: '2026-09-04 09:16',
    IAvgPresentDemand: vary(12.15, 0.05), IAvgPeakDemand: vary(18.22, 0.02), IAvgPeakDateTime: '2026-09-04 09:16',
  },

  // Summary helpers (for Overview page)
  summary: {
    avgVoltage: vary(230.5, 0.01),
    avgCurrent: vary(12.15, 0.05),
    avgFrequency: vary(50.01, 0.003),
    totalActivePower: vary(8.39, 0.06),
    totalApparentPower: vary(8.74, 0.06),
    avgPowerFactor: vary(0.955, 0.02),
    importedEnergy: vary(122141.1, 0.001),
    exportedEnergy: vary(2344.8, 0.003),
    peakDemand: vary(12.56, 0.02),
    avgCurrentTHD: vary(7.66, 0.08),
    avgVoltageTHD: vary(2.32, 0.08),
    digitalOutput1: Math.random() > 0.5,
    digitalOutput2: Math.random() > 0.7,
  },

  alarmState: Math.random() > 0.9 ? 1 : 0,
});

// ─── DSE7320 MKII Genset Controller ────────────────────────
// Based on Dashboard — ME631 Power Meter & Oil Pressure tabs of Excel
// TODO: fetch from GET /api/gensets/:id
export const generateGensetData = () => {
  const mode = ['Auto', 'Manual', 'Test', 'Stop'][randInt(0, 2)];
  return {
    device: 'DSE7320 MKII',
    name: 'Genset Unit 1',
    status: Math.random() > 0.1 ? 'online' : 'warning',
    lastUpdate: new Date().toLocaleTimeString(),
    engineMode: mode,
    engineRunning: mode !== 'Stop',
    loadPercent: vary(62.4, 0.06),

    // ── Engine Health (Section A)
    engine: {
      speed: vary(1500, 0.015),                     // RPM
      coolantTemp: vary(82.4, 0.06),                // °C
      oilPressure: vary(4200, 0.04),                // kPa
      oilTemp: vary(88.2, 0.05),                    // °C
      fuelLevel: vary(78.5, 0.015),                 // %
      batteryVoltage: vary(27.8, 0.025),            // V
      chargeAltVoltage: vary(28.2, 0.025),          // V
      boostPressure: vary(1.82, 0.04),              // bar
      runTime: Math.floor(vary(158400, 0.001)),      // seconds
      numberOfStarts: Math.floor(vary(3420, 0.001)),
    },

    // ── Generator Output (Section B)
    generator: {
      frequency: vary(50.01, 0.004),               // Hz
      // Phase-to-neutral voltages
      voltL1N: vary(230.8, 0.015),                  // V L1-N
      voltL2N: vary(229.5, 0.015),                  // V L2-N
      voltL3N: vary(231.1, 0.015),                  // V L3-N
      // Line voltages
      voltL1L2: vary(399.6, 0.015),                 // V L1-L2
      voltL2L3: vary(398.1, 0.015),                 // V L2-L3
      voltL3L1: vary(400.0, 0.015),                 // V L3-L1
      // Currents
      currentL1: vary(45.2, 0.06),                  // A
      currentL2: vary(43.8, 0.06),                  // A
      currentL3: vary(44.6, 0.06),                  // A
      currentEarth: vary(0.12, 0.3),                // A
      // Active power
      wattsL1: vary(10420, 0.07),                   // W
      wattsL2: vary(10090, 0.07),                   // W
      wattsL3: vary(10240, 0.07),                   // W
      totalWatts: vary(30750, 0.06),                // W
      // Apparent power
      vaL1: vary(10850, 0.07),                      // VA
      vaL2: vary(10520, 0.07),                      // VA
      vaL3: vary(10680, 0.07),                      // VA
      totalVA: vary(32050, 0.06),                   // VA
      // Reactive power
      varL1: vary(3240, 0.1),                       // Var
      varL2: vary(3140, 0.1),                       // Var
      varL3: vary(3190, 0.1),                       // Var
      totalVar: vary(9570, 0.1),                    // Var
      // Power factors
      pfL1: vary(0.96, 0.025),
      pfL2: vary(0.94, 0.025),
      pfL3: vary(0.95, 0.025),
      avgPF: vary(0.95, 0.02),
      // Energy
      positiveKWh: vary(48240.5, 0.001),            // kWh
      negativeKWh: vary(820.3, 0.003),              // kWh
      kVAh: vary(50820.4, 0.001),                   // kVAh
      kVArh: vary(15240.6, 0.001),                  // kVArh
    },

    // ── Mains Supply (Section C)
    mains: {
      frequency: vary(50.00, 0.004),
      voltL1N: vary(231.2, 0.015),
      voltL2N: vary(230.1, 0.015),
      voltL3N: vary(229.8, 0.015),
      voltL1L2: vary(400.1, 0.015),
      voltL2L3: vary(398.8, 0.015),
      voltL3L1: vary(399.4, 0.015),
      phaseRotation: 'ABC',                          // ABC / ACB
      currentL1: vary(41.2, 0.06),
      currentL2: vary(39.8, 0.06),
      currentL3: vary(40.6, 0.06),
      totalWatts: vary(28900, 0.06),
      totalVA: vary(30120, 0.06),
      totalVar: vary(9450, 0.1),
      avgPF: vary(0.96, 0.025),
    },

    // ── Status
    status_flags: {
      genBreaker: Math.random() > 0.4,
      mainsBreaker: Math.random() > 0.3,
      genAvailable: Math.random() > 0.2,
      mainsAvailable: Math.random() > 0.15,
    },

    // ── LED panel
    leds: {
      stop: Math.random() > 0.8,
      manual: Math.random() > 0.6,
      test: false,
      auto: Math.random() > 0.3,
      gen: Math.random() > 0.4,
      genBreaker: Math.random() > 0.5,
      mains: Math.random() > 0.3,
      mainsBreaker: Math.random() > 0.4,
      warning: Math.random() > 0.8,
      common: Math.random() > 0.7,
    },

    // ── Alarms (4-bit nibble decoded)
    // 1 = Normal, 2 = Warning, 3 = Shutdown, 4 = Electrical Trip
    alarms: {
      emergencyStop:      Math.random() > 0.96 ? 3 : 1,
      lowOilPressure:     Math.random() > 0.93 ? 2 : 1,
      highCoolantTemp:    Math.random() > 0.94 ? 2 : 1,
      lowCoolantTemp:     1,
      underSpeed:         1,
      overSpeed:          Math.random() > 0.96 ? 3 : 1,
      genUnderFreq:       1,
      genOverFreq:        1,
      genLowVoltage:      1,
      genHighVoltage:     1,
      batteryLowVoltage:  Math.random() > 0.91 ? 2 : 1,
      batteryHighVoltage: 1,
      failToStart:        Math.random() > 0.96 ? 3 : 1,
      failToStop:         1,
      genHighCurrent:     Math.random() > 0.95 ? 2 : 1,
      lowFuelLevel:       Math.random() > 0.92 ? 2 : 1,
      canEcuWarning:      Math.random() > 0.95 ? 2 : 1,
      canEcuShutdown:     1,
      genShortCircuit:    1,
      mainsShortCircuit:  1,
      earthFault:         Math.random() > 0.97 ? 4 : 1,
      maintenanceAlarm:   Math.random() > 0.88 ? 2 : 1,
      loadingFreqAlarm:   1,
      loadingVoltAlarm:   1,
    },
  };
};

// ─── Overview / System Summary ─────────────────────────────
// TODO: fetch from GET /api/overview
export const generateOverviewData = () => {
  const genset = generateGensetData();
  const me631  = generateME631Data();
  const alarms = Object.entries(genset.alarms).filter(([, v]) => v > 1);
  return {
    totalDevices: 2,
    onlineDevices: 2,
    offlineDevices: 0,
    activeAlerts: alarms.length,
    genset,
    dpm: me631,
  };
};

// ─── Trend Data ─────────────────────────────────────────────
export const generateTrendData = (points = 24, base = 50, variance = 0.05) =>
  Array.from({ length: points }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    value: vary(base + Math.sin(i / 5) * base * 0.08, variance),
  }));

export const generateMultiTrendData = (points = 24) =>
  Array.from({ length: points }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    power:   vary(8.4  + Math.sin(i / 4) * 2.5, 0.04),
    voltage: vary(230  + Math.sin(i / 6) * 4,   0.008),
    current: vary(12   + Math.sin(i / 4) * 3.5, 0.04),
    frequency: vary(50 + Math.sin(i / 8) * 0.3, 0.003),
  }));

export const generateEnergyBarData = () =>
  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => ({
    month: m,
    import: rand(8000, 14000, 0),
    export: rand(1000, 3000, 0),
  }));

// ─── Settings Defaults ──────────────────────────────────────
// TODO: fetch from GET /api/settings
export const generateSettingsDefaults = () => ({
  system: {
    gensetIp: '192.168.1.100', gensetPort: 502, gensetModbusId: 1,
    me631Ip:  '192.168.1.101', me631Port:  502, me631ModbusId:  2,
    pollingInterval: 3000, timezone: 'Asia/Dhaka', dateFormat: 'DD/MM/YYYY',
  },
  display: {
    refreshInterval: 3, powerUnit: 'kW', pressureUnit: 'kPa',
    temperatureUnit: 'C', showTrends: true, compactCards: false,
  },
  notifications: { emailEnabled: false, emailRecipients: '', emailSmtp: '', emailPort: 587, emailUser: '' },
});

// ─── Threshold Defaults (matching elliance_mks.Thresholds schema) ────
// TODO: fetch from GET /api/thresholds
export const generateThresholdDefaults = () => ([
  { thresholdId: 1, registerId: 2, label: 'Voltage L1-N',       device: 'ME631',  unit: 'V',   conditionType: 'Between',      minValue: 198.00, maxValue: 242.00, severity: 'Warning',  smsEnabled: true,  isActive: true  },
  { thresholdId: 2, registerId: 2, label: 'High Voltage Trip',  device: 'ME631',  unit: 'V',   conditionType: 'Above',        minValue: null,   maxValue: 255.00, severity: 'Critical', smsEnabled: true,  isActive: true  },
  { thresholdId: 3, registerId: 1, label: 'Frequency',          device: 'ME631',  unit: 'Hz',  conditionType: 'Between',      minValue: 48.50,  maxValue: 51.50,  severity: 'Warning',  smsEnabled: true,  isActive: true  },
  { thresholdId: 4, registerId: 3, label: 'Total Current',      device: 'ME631',  unit: 'A',   conditionType: 'Above',        minValue: null,   maxValue: 100.00, severity: 'Critical', smsEnabled: true,  isActive: true  },
  { thresholdId: 5, registerId: 4, label: 'Power Factor Low',   device: 'ME631',  unit: '',    conditionType: 'Below',        minValue: 0.85,   maxValue: null,   severity: 'Warning',  smsEnabled: false, isActive: true  },
  { thresholdId: 6, registerId: 5, label: 'Engine Speed (RPM)', device: 'Genset', unit: 'RPM', conditionType: 'Between',      minValue: 1400.0, maxValue: 1600.0, severity: 'Warning',  smsEnabled: true,  isActive: true  },
  { thresholdId: 7, registerId: 6, label: 'Coolant Temp High',  device: 'Genset', unit: '°C',  conditionType: 'Above',        minValue: null,   maxValue: 95.00,  severity: 'Critical', smsEnabled: true,  isActive: true  },
  { thresholdId: 8, registerId: 7, label: 'Oil Pressure Low',   device: 'Genset', unit: 'kPa', conditionType: 'Below',        minValue: 1500.0, maxValue: null,   severity: 'Critical', smsEnabled: true,  isActive: true  },
  { thresholdId: 9, registerId: 8, label: 'Fuel Level Low',     device: 'Genset', unit: '%',   conditionType: 'Below',        minValue: 20.00,  maxValue: null,   severity: 'Warning',  smsEnabled: true,  isActive: true  },
  { thresholdId: 10,registerId: 9, label: 'Battery Voltage',    device: 'Genset', unit: 'V',   conditionType: 'Between',      minValue: 22.00,  maxValue: 30.00,  severity: 'Warning',  smsEnabled: false, isActive: true  },
]);

// ─── Users & SMS ────────────────────────────────────────────
// TODO: fetch from GET /api/users & GET /api/notifications
export const INITIAL_USERS = [
  { id: 1, name: 'Abdul Kader',   email: 'admin@modbus.io',  phone: '+8801700000001', role: 'Administrator', status: 'active',   lastLogin: '2026-09-08 09:15', avatar: 'AK',
    sms: { enabled: true,  prefs: { critical: true,  warning: true,  gensetAlarms: true,  dpmThreshold: true,  deviceOffline: true  } } },
  { id: 2, name: 'Sarah Ahmed',   email: 'sarah@modbus.io',  phone: '+8801711000002', role: 'Operator',      status: 'active',   lastLogin: '2026-09-08 08:42', avatar: 'SA',
    sms: { enabled: true,  prefs: { critical: true,  warning: false, gensetAlarms: true,  dpmThreshold: false, deviceOffline: true  } } },
  { id: 3, name: 'Mohammad Ali',  email: 'mali@modbus.io',   phone: '',               role: 'Viewer',        status: 'active',   lastLogin: '2026-09-07 14:23', avatar: 'MA',
    sms: { enabled: false, prefs: { critical: false, warning: false, gensetAlarms: false, dpmThreshold: false, deviceOffline: false } } },
  { id: 4, name: 'Fatima Hassan', email: 'fatima@modbus.io', phone: '+8801755000004', role: 'Operator',      status: 'inactive', lastLogin: '2026-09-02 11:05', avatar: 'FH',
    sms: { enabled: false, prefs: { critical: true,  warning: false, gensetAlarms: false, dpmThreshold: false, deviceOffline: false } } },
  { id: 5, name: 'John Smith',    email: 'john@modbus.io',   phone: '+8801777000005', role: 'Viewer',        status: 'active',   lastLogin: '2026-09-08 07:30', avatar: 'JS',
    sms: { enabled: false, prefs: { critical: false, warning: false, gensetAlarms: false, dpmThreshold: false, deviceOffline: false } } },
  { id: 6, name: 'Ayesha Khan',   email: 'ayesha@modbus.io', phone: '+8801799000006', role: 'Operator',      status: 'active',   lastLogin: '2026-09-07 16:55', avatar: 'AK2',
    sms: { enabled: true,  prefs: { critical: true,  warning: true,  gensetAlarms: true,  dpmThreshold: true,  deviceOffline: true  } } },
];

export const SMS_GATEWAY_DEFAULTS = {
  enabled: false,
  apiUrl: 'https://api.smsprovider.com/send',
  apiKey: '',
  senderId: 'MODBUS',
};

// ─── Alarm types ─────────────────────────────────────────────
export const ALARM_TYPES = {
  1: { label: 'Normal',          color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)'  },
  2: { label: 'Warning',         color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)'  },
  3: { label: 'Shutdown',        color: '#fb7185', bg: 'rgba(251,113,133,0.1)', border: 'rgba(251,113,133,0.2)' },
  4: { label: 'Electrical Trip', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
};

export const ALARM_LABELS = {
  emergencyStop:     'Emergency Stop',
  lowOilPressure:    'Low Oil Pressure',
  highCoolantTemp:   'High Coolant Temperature',
  lowCoolantTemp:    'Low Coolant Temperature',
  underSpeed:        'Under Speed',
  overSpeed:         'Over Speed',
  genUnderFreq:      'Generator Under Frequency',
  genOverFreq:       'Generator Over Frequency',
  genLowVoltage:     'Generator Low Voltage',
  genHighVoltage:    'Generator High Voltage',
  batteryLowVoltage: 'Battery Low Voltage',
  batteryHighVoltage:'Battery High Voltage',
  failToStart:       'Fail to Start',
  failToStop:        'Fail to Stop',
  genHighCurrent:    'Generator High Current',
  lowFuelLevel:      'Low Fuel Level',
  canEcuWarning:     'CAN ECU Warning',
  canEcuShutdown:    'CAN ECU Shutdown',
  genShortCircuit:   'Generator Short Circuit',
  mainsShortCircuit: 'Mains Short Circuit',
  earthFault:        'Earth Fault',
  maintenanceAlarm:  'Maintenance Alarm',
  loadingFreqAlarm:  'Loading Frequency Alarm',
  loadingVoltAlarm:  'Loading Voltage Alarm',
};
