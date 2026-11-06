import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineLightningBolt, HiOutlineStatusOnline, HiOutlineExclamationCircle,
  HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineCheck,
} from 'react-icons/hi';
import { TbEngine, TbBolt, TbAlertTriangle } from 'react-icons/tb';
import GaugeChart from '../components/GaugeChart';
import AlarmChip from '../components/AlarmChip';
import StatusChip from '../components/StatusChip';
import { TrendChart } from '../components/Charts';
import { ALARM_TYPES, ALARM_LABELS } from '../constants/alarmConstants';
import usePolling from '../hooks/usePolling';
import { createInitialGensetData, fetchDeviceReadings, transformGensetResponse, G, isShown } from '../api/deviceReadingService';

/* ── helpers ── */
const fmt = (v, dp = 2) => {
  if (v === null || v === undefined || v === '') return (0).toFixed(dp);
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(dp);
};

const fmtRunTime = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return { d, h, m };
};

/* ── Section header ── */
const Sec = ({ title, subtitle, color = '#6366f1', icon: Icon }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-1 h-7 rounded-full shrink-0" style={{ background: color }} />
    {Icon && <Icon className="text-xl shrink-0" style={{ color }} />}
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-[11px] text-dark-300 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

/* ── Parameter row ── */
const PR = ({ label, value, unit = '', color = '#94a3b8', dp = 2 }) => (
  <div className="param-row">
    <span className="param-label">{label}</span>
    <span className="param-value" style={{ color }}>{fmt(value, dp)}<span className="unit-label text-[10px] ml-1">{unit}</span></span>
  </div>
);

/* ── Phase trio card ── */
const PhaseCard = ({ label, phases, unit, colors = ['#818cf8', '#38bdf8', '#22d3ee'] }) => (
  <div className="glass-card p-5">
    <p className="section-label mb-3">{label}</p>
    <div className="grid grid-cols-3 gap-2 mb-3">
      {phases.map(({ ph, val }, i) => (
        <div key={ph} className="text-center p-3 rounded-xl" style={{ background: `${colors[i]}12`, border: `1px solid ${colors[i]}20` }}>
          <p className="section-label mb-1">{ph}</p>
          <p className="metric-value-sm" style={{ color: colors[i] }}>{fmt(val, 2)}</p>
          <p className="unit-label text-[10px]">{unit}</p>
        </div>
      ))}
    </div>
  </div>
);

/* ── Control button with confirmation ── */
const CtrlBtn = ({ label, color = '#6366f1', dangerous = false, onClick }) => {
  const [confirm, setConfirm] = useState(false);
  return !confirm ? (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onClick={() => dangerous ? setConfirm(true) : onClick?.()}
      className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full min-h-[44px] flex items-center justify-center text-center"
      style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
    >{label}</motion.button>
  ) : (
    <div className="flex gap-2 w-full">
      <button className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all min-h-[44px] flex items-center justify-center"
        style={{ background: color }} onClick={() => { onClick?.(); setConfirm(false); }}>Confirm</button>
      <button className="px-3 py-2.5 rounded-xl text-sm text-dark-300 transition-all min-h-[44px] flex items-center justify-center"
        style={{ background: 'rgba(26,35,64,0.7)', border: '1px solid rgba(99,102,241,0.1)' }}
        onClick={() => setConfirm(false)}>Cancel</button>
    </div>
  );
};

/* ── Expandable section ── */
const Expandable = ({ title, color = '#6366f1', children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card overflow-hidden" style={{ borderColor: `${color}35` }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
        style={{ background: `${color}10` }}
      >
        <span className="text-sm font-semibold" style={{ color }}>{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: `${color}cc` }}>{open ? 'Hide' : 'Show'}</span>
          {open ? <HiOutlineChevronUp style={{ color }} /> : <HiOutlineChevronDown style={{ color }} />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
              <div className="pt-4">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════════════════════════════════════════ */

const Genset = () => {
  const createZeroTrend = () => Array.from({ length: 24 }, (_, i) => ({ time: `${String(i).padStart(2, '0')}:00`, value: 0 }));
  const [data, setData] = useState(() => createInitialGensetData());
  const [rpmTrend] = useState(() => createZeroTrend());
  const [tempTrend] = useState(() => createZeroTrend());
  const [oilTrend] = useState(() => createZeroTrend());
  const [batteryTrend] = useState(() => createZeroTrend());

  // Fetch Device 1 readings from the API
  const loadData = useCallback(async ({ background } = {}) => {
    try {
      const apiData = await fetchDeviceReadings(1, { background });
      setData(transformGensetResponse(apiData));
    } catch (err) {
      console.error('[Genset] API error:', err);
    }
  }, []);

  // Load on mount, then refresh every POLL_INTERVAL ms
  usePolling(loadData);

  // Widgets of registers with Status <> 'Active' are not shown
  const on = (...names) => isShown(data.inactive, ...names);

  const rt = fmtRunTime(data.engine.runTime);
  const currentLagLeadDeg = Math.acos(Math.min(Math.max(data.generator.avgPF || 0, 0), 1)) * (180 / Math.PI);

  // Power cards: [label, value, register]; rows of inactive registers are removed, empty cards are not shown
  const visibleCards = (cards) => cards
    .map(card => ({ ...card, rows: card.rows.filter(([, , reg]) => on(reg)) }))
    .filter(card => card.rows.length > 0);

  const generatorPowerCards = visibleCards([
    {
      title: 'Active Power', unit: 'W', color: '#34d399', rows: [
        ['L1', data.generator.wattsL1, G.wattsL1], ['L2', data.generator.wattsL2, G.wattsL2], ['L3', data.generator.wattsL3, G.wattsL3], ['Total', data.generator.totalWatts, G.totalWatts]
      ]
    },
    {
      title: 'Apparent Power', unit: 'VA', color: '#818cf8', rows: [
        ['L1', data.generator.vaL1, G.vaL1], ['L2', data.generator.vaL2, G.vaL2], ['L3', data.generator.vaL3, G.vaL3], ['Total', data.generator.totalVA, G.totalVA]
      ]
    },
    {
      title: 'Reactive Power', unit: 'Var', color: '#a78bfa', rows: [
        ['L1', data.generator.varL1, G.varL1], ['L2', data.generator.varL2, G.varL2], ['L3', data.generator.varL3, G.varL3], ['Total', data.generator.totalVar, G.totalVar]
      ]
    },
    {
      title: 'Power Factor', unit: '', color: '#38bdf8', rows: [
        ['PF L1', data.generator.pfL1, G.pfL1], ['PF L2', data.generator.pfL2, G.pfL2], ['PF L3', data.generator.pfL3, G.pfL3], ['Avg PF', data.generator.avgPF, G.avgPF]
      ]
    },
  ]);

  const mainsPowerCards = visibleCards([
    {
      title: 'Active Power', unit: 'kW', color: '#34d399', rows: [
        ['L1', data.mains.wattsL1 / 1000, G.mainsWattsL1], ['L2', data.mains.wattsL2 / 1000, G.mainsWattsL2], ['L3', data.mains.wattsL3 / 1000, G.mainsWattsL3], ['Total', data.mains.totalWatts / 1000, G.mainsTotalW]
      ]
    },
    {
      title: 'Apparent Power', unit: 'kVA', color: '#818cf8', rows: [
        ['L1', data.mains.vaL1 / 1000, G.mainsVaL1], ['L2', data.mains.vaL2 / 1000, G.mainsVaL2], ['L3', data.mains.vaL3 / 1000, G.mainsVaL3], ['Total', data.mains.totalVA / 1000, G.mainsTotalVA]
      ]
    },
    {
      title: 'Reactive Power', unit: 'kVar', color: '#a78bfa', rows: [
        ['L1', data.mains.varL1 / 1000, G.mainsVarL1], ['L2', data.mains.varL2 / 1000, G.mainsVarL2], ['L3', data.mains.varL3 / 1000, G.mainsVarL3], ['Total', data.mains.totalVar / 1000, G.mainsTotalVar]
      ]
    },
    {
      title: 'Power Factor', unit: '', color: '#38bdf8', rows: [
        ['L1', data.mains.pfL1, G.mainsPfL1], ['L2', data.mains.pfL2, G.mainsPfL2], ['L3', data.mains.pfL3, G.mainsPfL3], ['Avg', data.mains.avgPF, G.mainsAvgPF]
      ]
    },
  ]);

  const energyItems = [
    { lbl: 'Positive kWh', val: fmt(data.generator.positiveKWh, 2), unit: 'kWh', color: '#34d399', reg: G.posKWh },
    { lbl: 'Negative kWh', val: fmt(data.generator.negativeKWh, 2), unit: 'kWh', color: '#fb7185', reg: G.negKWh },
    { lbl: 'kVAh', val: fmt(data.generator.kVAh, 2), unit: 'kVAh', color: '#818cf8', reg: G.kVAh },
    { lbl: 'kVArh', val: fmt(data.generator.kVArh, 2), unit: 'kVArh', color: '#a78bfa', reg: G.kVArh },
  ].filter(item => on(item.reg));

  const loadItems = [
    { lbl: 'Full Power', val: '0.00', unit: '%', color: '#34d399', reg: G.pctFullPower },
    { lbl: 'Full Var', val: '0.0', unit: '%', color: '#a78bfa', reg: G.pctFullVar },
  ].filter(item => on(item.reg));

  const activeAlarms = useMemo(() =>
    Object.entries(data.alarms)
      .filter(([, v]) => v > 1)
      .map(([k, v]) => ({ key: k, name: ALARM_LABELS[k] || k, type: v })),
    [data]
  );

  const modeColor = { Auto: '#34d399', Manual: '#fbbf24', Test: '#818cf8', Stop: '#fb7185' }[data.engineMode] || '#94a3b8';

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── STATUS BAR ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full shrink-0 ${data.status === 'online' ? 'status-online' : 'status-warning'}`} />
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">DSE7320 MKII — {data.name}</h2>
            <p className="text-xs text-dark-300">Last updated: {data.lastUpdate}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <span className="section-label hidden sm:inline">Mode:</span>
          {['Stop', 'Manual', 'Test', 'Auto'].map(mode => (
            <span key={mode} className="text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg border"
              style={{
                background: data.engineMode === mode ? `${modeColor}15` : 'transparent',
                color: data.engineMode === mode ? modeColor : '#6b7e99',
                borderColor: data.engineMode === mode ? `${modeColor}30` : 'rgba(99,102,241,0.1)',
              }}>
              {mode}
            </span>
          ))}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg ml-auto sm:ml-0" style={{ background: 'rgba(26,35,64,0.7)', border: '1px solid rgba(99,102,241,0.1)' }}>
            <div className={`w-2 h-2 rounded-full ${data.engineRunning ? 'status-online' : 'status-offline'}`} />
            <span className="text-xs font-semibold" style={{ color: data.engineRunning ? '#34d399' : '#fb7185' }}>{data.engineRunning ? 'Running' : 'Stopped'}</span>
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════
          SECTION A — Engine Health
      ══════════════════════════════════════════ */}
      <div>
        <Sec title="Section A — Engine Health" subtitle="Oil pressure, temperatures, fuel, battery and runtime sensors" color="#f59e0b" icon={TbEngine} />

        {/* Gauges row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {[
            { v: data.engine.speed, min: 0, max: 3000, unit: 'RPM', label: 'Engine Speed', color: '#f59e0b', zones: null, reg: G.engineSpeed },
            {
              v: data.engine.oilPressure, min: 0, max: 10000, unit: 'kPa', label: 'Oil Pressure', color: '#10b981', reg: G.oilPressure,
              zones: [{ start: 0, end: 1500, color: '#f43f5e' }, { start: 1500, end: 3000, color: '#f59e0b' }, { start: 3000, end: 7000, color: '#10b981' }, { start: 7000, end: 10000, color: '#f59e0b' }]
            },
            {
              v: data.engine.coolantTemp, min: -50, max: 200, unit: '°C', label: 'Coolant Temp', color: '#f43f5e', reg: G.coolantTemp,
              zones: [{ start: -50, end: 10, color: '#3b82f6' }, { start: 10, end: 85, color: '#10b981' }, { start: 85, end: 110, color: '#f59e0b' }, { start: 110, end: 200, color: '#f43f5e' }]
            },
            { v: data.engine.batteryVoltage, min: 0, max: 40, unit: 'V', label: 'Battery Voltage', color: '#8b5cf6', zones: null, reg: G.batteryV },
          ].filter(g => on(g.reg)).map((g, i) => (
            <motion.div key={g.label} initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
              className="glass-card p-5 flex flex-col items-center">
              <GaugeChart value={g.v} min={g.min} max={g.max} unit={g.unit} label={g.label} color={g.color} size={140} alarmZones={g.zones} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Runtime & Starts */}
          {on(G.runTime, G.numberOfStarts) && (
            <div className="glass-card p-5">
              <p className="section-label mb-4">Engine Runtime & Starts</p>
              {on(G.runTime) && (
                <div className="flex justify-center gap-5 mb-4">
                  {[{ v: rt.d, l: 'Days' }, { v: rt.h, l: 'Hours' }, { v: rt.m, l: 'Mins' }].map(t => (
                    <div key={t.l} className="text-center">
                      <p className="metric-value text-3xl" style={{ color: '#fbbf24' }}>{String(t.v).padStart(2, '0')}</p>
                      <p className="unit-label text-[10px] uppercase tracking-wider mt-1">{t.l}</p>
                    </div>
                  ))}
                </div>
              )}
              {on(G.numberOfStarts) && <PR label="Number of Starts" value={data.engine.numberOfStarts} unit="starts" color="#38bdf8" dp={0} />}
            </div>
          )}

          {/* Fuel Level progress */}
          {on(G.fuelLevel, G.chargeAltV, G.batteryV, G.boostPressure) && (
            <div className="glass-card p-5">
              <p className="section-label mb-4">Fuel Level</p>
              {on(G.fuelLevel) && (
                <>
                  <div className="flex items-end gap-3 mb-3">
                    <p className="metric-value text-5xl" style={{ color: data.engine.fuelLevel < 20 ? '#fb7185' : '#34d399' }}>
                      {fmt(data.engine.fuelLevel, 2)}
                    </p>
                    <p className="unit-label text-[10px] mb-2">%</p>
                  </div>
                  <div className="w-full h-4 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(26,35,64,0.8)' }}>
                    <motion.div animate={{ width: `${data.engine.fuelLevel}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: data.engine.fuelLevel < 20 ? 'linear-gradient(90deg,#e11d48,#fb7185)' : data.engine.fuelLevel < 40 ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#059669,#34d399)' }}
                    />
                  </div>
                </>
              )}
              {on(G.chargeAltV) && <PR label="Charge Alt. Voltage" value={data.engine.chargeAltVoltage} unit="V" color="#a78bfa" />}
              {on(G.batteryV) && <PR label="Battery Voltage" value={data.engine.batteryVoltage} unit="V" color="#8b5cf6" />}
              {on(G.boostPressure) && <PR label="Boost Pressure" value={data.engine.boostPressure} unit="bar" color="#38bdf8" />}
            </div>
          )}
        </div>

        {/* Engine trends */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <TrendChart data={tempTrend}    title="Coolant Temp"    unit="°C"  color="#f43f5e" />
          <TrendChart data={oilTrend}     title="Oil Pressure"    unit="kPa" color="#10b981" />
          <TrendChart data={batteryTrend} title="Battery Voltage" unit="V"   color="#8b5cf6" />
        </div> */}
      </div>

      {/* ══════════════════════════════════════════
          SECTION B — Generator Output
      ══════════════════════════════════════════ */}
      <div>
        <Sec title="Section B — Generator Output" subtitle="Voltage, current, power and energy from generator terminals" color="#6366f1" icon={TbBolt} />

        {/* Voltage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {on(G.voltL1N, G.voltL2N, G.voltL3N, G.voltL1L2, G.voltL2L3, G.voltL3L1, G.genFreq) && (
            <div className="glass-card p-5">
              <p className="section-label mb-3">{on(G.voltL1N, G.voltL2N, G.voltL3N) ? 'Generator Voltage — Phase to Neutral' : 'Generator Voltage'}</p>
              {on(G.voltL1N, G.voltL2N, G.voltL3N) && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[['L1-N', data.generator.voltL1N, G.voltL1N, 0], ['L2-N', data.generator.voltL2N, G.voltL2N, 1], ['L3-N', data.generator.voltL3N, G.voltL3N, 2]]
                    .filter(([, , reg]) => on(reg))
                    .map(([ph, v, , i]) => (
                      <div key={ph} className="text-center p-3 rounded-xl" style={{ background: ['rgba(99,102,241,0.08)', 'rgba(14,165,233,0.08)', 'rgba(6,182,212,0.08)'][i], border: `1px solid ${['rgba(99,102,241,0.15)', 'rgba(14,165,233,0.15)', 'rgba(6,182,212,0.15)'][i]}` }}>
                        <p className="text-xs font-semibold tracking-wide text-dark-300 mb-1">{ph}</p>
                        <p className="metric-value-sm" style={{ color: ['#818cf8', '#38bdf8', '#22d3ee'][i] }}>{fmt(v, 2)}</p>
                        <p className="unit-label text-[10px]">V</p>
                      </div>
                    ))}
                </div>
              )}
              {on(G.voltL1L2) && <PR label="L1-L2" value={data.generator.voltL1L2} unit="V" color="#818cf8" />}
              {on(G.voltL2L3) && <PR label="L2-L3" value={data.generator.voltL2L3} unit="V" color="#38bdf8" />}
              {on(G.voltL3L1) && <PR label="L3-L1" value={data.generator.voltL3L1} unit="V" color="#22d3ee" />}
              {on(G.genFreq) && <PR label="Frequency" value={data.generator.frequency} unit="Hz" color="#34d399" />}
            </div>
          )}

          {/* Current */}
          {on(G.currentL1, G.currentL2, G.currentL3, G.currentE, G.currentLagLead) && (
            <div className="glass-card p-5">
              <p className="section-label mb-3">Generator Current</p>
              {on(G.currentL1, G.currentL2, G.currentL3) && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[['L1', data.generator.currentL1, G.currentL1], ['L2', data.generator.currentL2, G.currentL2], ['L3', data.generator.currentL3, G.currentL3]]
                    .filter(([, , reg]) => on(reg))
                    .map(([ph, v]) => (
                      <div key={ph} className="text-center p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <p className="text-xs font-semibold tracking-wide text-dark-300 mb-1">{ph}</p>
                        <p className="metric-value-sm" style={{ color: '#fbbf24' }}>{fmt(v, 2)}</p>
                        <p className="unit-label text-[10px]">A</p>
                      </div>
                    ))}
                </div>
              )}
              {on(G.currentE) && <PR label="Earth Current" value={data.generator.currentEarth} unit="A" color="#fb7185" />}
              {on(G.currentLagLead) && <PR label="Current Lag/Lead" value={currentLagLeadDeg} unit="°" color="#818cf8" />}
            </div>
          )}
        </div>

        {/* Power tables */}
        {generatorPowerCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {generatorPowerCards.map(({ title, unit, color, rows }) => (
              <div key={title} className="glass-card p-5">
                <p className="section-label mb-3">{title}</p>
                {rows.map(([lbl, val]) => (
                  <PR key={lbl} label={lbl} value={val} unit={unit} color={lbl === 'Total' || lbl === 'Avg PF' ? color : '#94a3b8'} />
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {energyItems.length > 0 && (
            <div className="glass-card p-5">
              <p className="section-label mb-4">Generator Energy Accumulation</p>
              <div className="grid grid-cols-2 gap-4">
                {energyItems.map(({ lbl, val, unit, color }) => (
                  <div key={lbl} className="p-4 rounded-xl text-center" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                    <p className="section-label mb-2">{lbl}</p>
                    <p className="metric-value text-xl" style={{ color }}>{val}</p>
                    <p className="unit-label text-[10px] mt-1">{unit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadItems.length > 0 && (
            <div className="glass-card p-5">
              <p className="section-label mb-4">Generator Load</p>
              <div className="grid grid-cols-2 gap-4">
                {loadItems.map(({ lbl, val, unit, color }) => (
                  <div key={lbl} className="p-4 rounded-xl text-center" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                    <p className="section-label mb-2">{lbl}</p>
                    <p className="metric-value text-xl" style={{ color }}>
                      {val} {unit}
                    </p>
                    {/* <p className="unit-label text-[10px] mt-1">{unit}</p> */}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION C — Mains Supply
      ══════════════════════════════════════════ */}
      <div>
        <Sec title="Section C — Mains Supply" subtitle="Utility grid voltage, frequency, current and power measurements" color="#8b5cf6" icon={HiOutlineLightningBolt} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {on(G.mainsVoltL1N, G.mainsVoltL2N, G.mainsVoltL3N, G.mainsVoltL1L2, G.mainsVoltL2L3, G.mainsVoltL3L1, G.mainsVoltLagLead) && (
            <div className="glass-card p-5">
              <p className="section-label mb-3">Mains Voltages</p>
              {on(G.mainsVoltL1N, G.mainsVoltL2N, G.mainsVoltL3N) && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[['L1-N', data.mains.voltL1N, G.mainsVoltL1N], ['L2-N', data.mains.voltL2N, G.mainsVoltL2N], ['L3-N', data.mains.voltL3N, G.mainsVoltL3N]]
                    .filter(([, , reg]) => on(reg))
                    .map(([ph, v]) => (
                      <div key={ph} className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}>
                        <p className="text-xs font-semibold tracking-wide text-dark-300 mb-1">{ph}</p>
                        <p className="metric-value-sm" style={{ color: '#a78bfa' }}>{fmt(v, 2)}</p>
                        <p className="unit-label text-[10px]">V</p>
                      </div>
                    ))}
                </div>
              )}
              {on(G.mainsVoltL1L2) && <PR label="L1-L2" value={data.mains.voltL1L2} unit="V" color="#a78bfa" />}
              {on(G.mainsVoltL2L3) && <PR label="L2-L3" value={data.mains.voltL2L3} unit="V" color="#8b5cf6" />}
              {on(G.mainsVoltL3L1) && <PR label="L3-L1" value={data.mains.voltL3L1} unit="V" color="#7c3aed" />}
              {on(G.mainsVoltLagLead) && <PR label="Voltage Lead/Lag" value={0.0} unit="°" color="#c4b5fd" />}
            </div>
          )}

          {on(G.mainsCurL1, G.mainsCurL2, G.mainsCurL3, G.mainsCurE, G.mainsCurLagLead, G.mainsFreq, G.mainsPhaseRotation) && (
            <div className="glass-card p-5">
              <p className="section-label mb-3">Mains Current</p>
              {on(G.mainsCurL1, G.mainsCurL2, G.mainsCurL3) && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[['L1', data.mains.currentL1, G.mainsCurL1], ['L2', data.mains.currentL2, G.mainsCurL2], ['L3', data.mains.currentL3, G.mainsCurL3]]
                    .filter(([, , reg]) => on(reg))
                    .map(([ph, v]) => (
                      <div key={ph} className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}>
                        <p className="text-xs font-semibold tracking-wide text-dark-300 mb-1">{ph}</p>
                        <p className="metric-value-sm" style={{ color: '#a78bfa' }}>{fmt(v, 2)}</p>
                        <p className="unit-label text-[10px]">A</p>
                      </div>
                    ))}
                </div>
              )}
              {on(G.mainsCurE) && <PR label="Earth Current" value={0.0} unit="A" color="#fb7185" />}
              {on(G.mainsCurLagLead) && <PR label="Current Lag/Lead" value={0.0} unit="°" color="#c4b5fd" />}
              {on(G.mainsFreq) && <PR label="Frequency" value={data.mains.frequency} unit="Hz" color="#34d399" />}
              {on(G.mainsPhaseRotation) && <PR label="Phase Rotation" value={data.mains.phaseRotation} unit="" color="#c4b5fd" />}
            </div>
          )}
        </div>

        {mainsPowerCards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
            {mainsPowerCards.map(({ title, unit, color, rows }) => (
              <div key={title} className="glass-card p-5">
                <p className="section-label mb-3">{title}</p>
                {rows.map(([lbl, val]) => (
                  <PR key={lbl} label={lbl} value={val} unit={unit} color={color} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Mains health indicator */}
        <div className="glass-card mt-4 p-5">
          <p className="section-label mb-4">System Status</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { lbl: 'Mains Available', ok: data.status_flags.mainsAvailable },
              { lbl: 'Mains Breaker', ok: data.status_flags.mainsBreaker },
              { lbl: 'Generator Available', ok: data.status_flags.genAvailable },
              { lbl: 'Generator Breaker', ok: data.status_flags.genBreaker },
            ].map(({ lbl, ok }) => (
              <div key={lbl} className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{ background: ok ? 'rgba(52,211,153,0.07)' : 'rgba(251,113,133,0.07)', border: `1px solid ${ok ? 'rgba(52,211,153,0.2)' : 'rgba(251,113,133,0.2)'}` }}>
                <div className={`w-2.5 h-2.5 rounded-full ${ok ? 'status-online' : 'status-offline'}`} />
                <span className="text-xs font-semibold" style={{ color: ok ? '#34d399' : '#fb7185' }}>{lbl}: {ok ? 'CLOSED' : 'OPEN'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION D — LED Status & Digital Outputs
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <Sec title="LED Status Panel" color="#818cf8" />
          <div className="grid grid-cols-2 gap-2">
            {[
              ['STOP', data.leds.stop, 'rose'], ['MANUAL', data.leds.manual, 'amber'],
              ['TEST', data.leds.test, 'indigo'], ['AUTO', data.leds.auto, 'emerald'],
              ['GEN', data.leds.gen, 'amber'], ['GEN BRK', data.leds.genBreaker, 'sky'],
              ['MAINS', data.leds.mains, 'violet'], ['MAINS BRK', data.leds.mainsBreaker, 'emerald'],
              ['WARNING', data.leds.warning, 'rose'], ['COMMON ALM', data.leds.common, 'rose'],
            ].map(([lbl, active, color]) => (
              <StatusChip key={lbl} label={lbl} active={active} color={color} />
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <Sec title="Operating Mode Summary" color="#10b981" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { mode: 'AUTO', desc: 'Automatic transfer & start', active: data.engineMode === 'Auto', color: '#34d399' },
              { mode: 'MANUAL', desc: 'Manual operator control', active: data.engineMode === 'Manual', color: '#fbbf24' },
              { mode: 'TEST', desc: 'Test run (on or off load)', active: data.engineMode === 'Test', color: '#818cf8' },
              { mode: 'STOP', desc: 'Engine stopped / inhibit start', active: data.engineMode === 'Stop', color: '#fb7185' },
            ].map(({ mode, desc, active, color }) => (
              <div key={mode} className="p-4 rounded-xl border transition-all"
                style={{ background: active ? `${color}12` : 'rgba(26,35,64,0.4)', borderColor: active ? `${color}30` : 'rgba(99,102,241,0.08)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${active ? '' : 'opacity-30'}`} style={{ background: color }} />
                  <p className="text-xs font-bold" style={{ color: active ? color : '#6b7e99' }}>{mode}</p>
                </div>
                <p className="text-[10px] text-dark-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION E — Remote Control Panel
      ══════════════════════════════════════════ */}
      <div>
        <Sec title="Section E — Remote Control" subtitle="Use confirmation dialogs for disruptive actions" color="#10b981" />
        <div className="glass-card p-6">
          <div className="mb-4 p-3 rounded-xl flex items-start gap-3"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <HiOutlineExclamationCircle className="text-amber-400 text-xl shrink-0 mt-0.5" />
            <p className="text-xs text-dark-300">Remote control commands are sent directly to the DSE7320 MKII controller via Modbus. <strong className="text-amber-400">Red buttons require confirmation</strong> before executing.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <CtrlBtn label="Select Auto Mode" color="#34d399" />
            <CtrlBtn label="Select Manual Mode" color="#fbbf24" />
            <CtrlBtn label="Select Test on Load" color="#818cf8" />
            <CtrlBtn label="Mute Alarm" color="#f59e0b" />
            <CtrlBtn label="Reset Alarms" color="#f59e0b" />
            <CtrlBtn label="Start Engine" color="#10b981" dangerous />
            <CtrlBtn label="Transfer → Gen" color="#6366f1" dangerous />
            <CtrlBtn label="Transfer → Mains" color="#8b5cf6" dangerous />
            <CtrlBtn label="Stop Engine" color="#f43f5e" dangerous />
            <CtrlBtn label="Emergency Stop" color="#e11d48" dangerous />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION F — Alarms
      ══════════════════════════════════════════ */}
      <div>
        <Sec title="Section F — Alarm Status" subtitle="DSE7320 MKII decoded alarm registers (24 alarms)" color="#f43f5e" icon={TbAlertTriangle} />

        {/* Active alarms summary */}
        <div className="glass-card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Active Alarms</span>
            </div>
            <span className="text-sm font-bold px-3 py-1 rounded-lg"
              style={{ color: activeAlarms.length > 0 ? '#fb7185' : '#34d399', background: activeAlarms.length > 0 ? 'rgba(244,63,94,0.1)' : 'rgba(52,211,153,0.1)' }}>
              {activeAlarms.length} / 24
            </span>
          </div>
          {activeAlarms.length > 0 ? (
            <div className="space-y-2">
              {activeAlarms.map((a, i) => <AlarmChip key={i} name={a.name} type={a.type} />)}
            </div>
          ) : (
            <div className="text-center py-8">
              <HiOutlineStatusOnline className="text-5xl text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-emerald-400">All Clear — No Active Alarms</p>
            </div>
          )}
        </div>

        {/* Full alarm register table */}
        <Expandable title="Full Alarm Register — All 24 Points" color="#f59e0b">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(data.alarms).map(([key, val]) => {
              const at = ALARM_TYPES[val] || ALARM_TYPES[1];
              return (
                <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ background: val > 1 ? `${at.bg}` : 'rgba(15,23,42,0.4)', border: `1px solid ${val > 1 ? at.border : 'rgba(99,102,241,0.05)'}` }}>
                  <span className="text-xs text-dark-200">{ALARM_LABELS[key] || key}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: at.color, background: `${at.color}15` }}>{at.label}</span>
                </div>
              );
            })}
          </div>
        </Expandable>
      </div>
    </div>
  );
};

export default Genset;
