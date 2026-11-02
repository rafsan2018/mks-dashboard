import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineLightningBolt, HiOutlineChartBar, HiOutlineExclamationCircle,
  HiOutlineStatusOnline, HiOutlineServer, HiOutlineWifi,
} from 'react-icons/hi';
import { TbEngine, TbBolt, TbGauge, TbAlertTriangle } from 'react-icons/tb';
import { MdOutlineElectricMeter, MdOutlineSpeed } from 'react-icons/md';
import { BsSpeedometer2, BsFuelPump } from 'react-icons/bs';
import GaugeChart from '../components/GaugeChart';
import AlarmChip from '../components/AlarmChip';
import { TrendChart, EnergyBarChart, MultiLineChart } from '../components/Charts';
import { ALARM_LABELS } from '../constants/alarmConstants';
import { fetchDashboard, createInitialDashboardData } from '../api/dashboardService';

/* ── Poll interval (ms) — how often to refresh live data from the API ── */
const POLL_INTERVAL = 30000;

/* ── helpers ── */
const fmt = (v, dp = 2) => {
  if (v === null || v === undefined || v === '') return (0).toFixed(dp);
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(dp);
};

/* ── System KPI card ── */
const SysCard = ({ label, value, sub, icon: Icon, color, delay }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="glass-card p-5 flex items-center gap-4"
  >
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
    >
      <Icon className="text-2xl" style={{ color }} />
    </div>
    <div>
      <p className="section-label">{label}</p>
      <p className="metric-value text-3xl" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-dark-300 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

/* ── Genset device card ── */
const GensetCard = ({ data }) => {
  const alarmCount = Object.values(data.alarms).filter(v => v > 1).length;
  const modeColor = { Auto: '#34d399', Manual: '#fbbf24', Test: '#818cf8', Stop: '#fb7185' }[data.engineMode] || '#94a3b8';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full mt-0.5 ${data.status === 'online' ? 'status-online' : 'status-warning'}`} />
          <div>
            <h3 className="text-sm font-bold text-white">{data.name}</h3>
            <p className="text-[11px] text-dark-300">DSE7320 MKII</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
          style={{ color: modeColor, background: `${modeColor}15`, border: `1px solid ${modeColor}30` }}>
          {data.engineMode}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { lbl: 'Engine Speed', val: `${fmt(data.engine.speed, 2)} RPM`, color: '#fbbf24' },
          { lbl: 'Load', val: `${fmt(data.loadPercent, 2)} %`, color: '#818cf8' },
          { lbl: 'Coolant Temp', val: `${fmt(data.engine.coolantTemp, 2)} °C`, color: '#f43f5e' },
          { lbl: 'Oil Pressure', val: `${fmt(data.engine.oilPressure, 2)} kPa`, color: '#34d399' },
          { lbl: 'Fuel Level', val: `${fmt(data.engine.fuelLevel, 2)} %`, color: data.engine.fuelLevel < 20 ? '#fb7185' : '#34d399' },
          { lbl: 'Battery', val: `${fmt(data.engine.batteryVoltage, 2)} V`, color: '#a78bfa' },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} className="p-2.5 rounded-xl" style={{ background: 'rgba(26,35,64,0.5)' }}>
            <p className="section-label mb-0.5">{lbl}</p>
            <p className="text-sm font-bold font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${data.engineRunning ? 'status-online' : 'status-offline'}`} />
          <span className="text-xs text-dark-300">{data.engineRunning ? 'Engine Running' : 'Engine Stopped'}</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
          style={{ color: alarmCount > 0 ? '#fb7185' : '#34d399', background: alarmCount > 0 ? 'rgba(251,113,133,0.1)' : 'rgba(52,211,153,0.1)' }}>
          {alarmCount} alarm{alarmCount !== 1 ? 's' : ''}
        </span>
      </div>
    </motion.div>
  );
};

/* ── DPM KPI card ── */
const DpmKpi = ({ label, value, unit, color, icon: Icon }) => (
  <div className="glass-card p-4">
    <div className="flex items-center justify-between mb-2">
      <p className="section-label">{label}</p>
      {Icon && <Icon className="text-lg" style={{ color, opacity: 0.7 }} />}
    </div>
    <p className="metric-value text-xl" style={{ color }}>{fmt(value)}</p>
    {unit && <p className="unit-label text-[10px] mt-1">{unit}</p>}
  </div>
);

/* ── Section header ── */
const Sec = ({ title, subtitle, color = '#6366f1', icon: Icon }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-1 h-7 rounded-full" style={{ background: color }} />
    {Icon && <Icon className="text-lg" style={{ color }} />}
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="text-[11px] text-dark-300 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════ */
const Dashboard = () => {
  const [ov, setOv] = useState(() => createInitialDashboardData());
  const [loading, setLoading] = useState(true);   // true until first API response
  const [error, setError] = useState(null);   // non-null when API unreachable

  // ── API fetch helper ───────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    try {
      // Pass the current `ov` snapshot as the mock-fallback so any register
      // not yet in the DB keeps its last good / generated value.
      const normalised = await fetchDashboard(ov);
      setOv(normalised);
      setError(null);
    } catch (err) {
      console.error('[Dashboard] API error:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch dashboard data');
      // On error keep showing the last successfully-fetched (or mock) values
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);   // no dep on `ov` — we read it via closure only for the initial fallback

  // ── Poll on mount + every POLL_INTERVAL ms ─────────────────────
  useEffect(() => {
    loadDashboard();                                         // immediate first fetch
    const id = setInterval(loadDashboard, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadDashboard]);

  const { genset, dpm } = ov;

  // ── Dynamic live trends derived from real device readings ──────────
  const multiTrend = useMemo(() => {
    const curP = dpm?.summary?.totalActivePower || 0;
    const curI = dpm?.summary?.avgCurrent || 0;
    const curV = dpm?.summary?.avgVoltage || 0;
    const curF = dpm?.summary?.avgFrequency || 0;
    const nowHour = new Date().getHours();

    return Array.from({ length: 24 }, (_, i) => {
      const h = (nowHour - 23 + i + 24) % 24;
      return {
        time: `${String(h).padStart(2, '0')}:00`,
        power: i === 23 ? curP : 0,
        current: i === 23 ? curI : 0,
        voltage: i === 23 ? curV : 0,
        frequency: i === 23 ? curF : 0,
      };
    });
  }, [dpm]);

  const powerTrend = useMemo(() => {
    return multiTrend.map(d => ({ time: d.time, value: d.power }));
  }, [multiTrend]);

  const energyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const curMonth = new Date().getMonth();
    const imp = dpm?.summary?.importedEnergy || 0;
    const exp = dpm?.summary?.exportedEnergy || 0;

    return months.map((m, idx) => ({
      month: m,
      import: idx === curMonth ? imp : 0,
      export: idx === curMonth ? exp : 0,
    }));
  }, [dpm]);

  const activeAlarms = useMemo(() => {
    return Object.entries(genset?.alarms || {})
      .filter(([, v]) => v > 1)
      .map(([k, v]) => ({ name: ALARM_LABELS[k] || k, type: v }));
  }, [genset]);

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ══════════════════════════════════════════
          SECTION 1 — System Status
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SysCard label="Total Devices" value={ov.totalDevices} sub="Monitored endpoints" icon={HiOutlineServer} color="#6366f1" delay={0} />
        <SysCard label="Online Devices" value={ov.onlineDevices} sub="Communicating OK" icon={HiOutlineWifi} color="#34d399" delay={0.06} />
        <SysCard label="Offline Devices" value={ov.offlineDevices} sub="No response" icon={HiOutlineServer} color={ov.offlineDevices > 0 ? '#fb7185' : '#6b7e99'} delay={0.12} />
        <SysCard label="Active Alerts" value={ov.activeAlerts} sub={ov.activeAlerts > 0 ? 'Require attention' : 'All systems normal'} icon={HiOutlineExclamationCircle} color={ov.activeAlerts > 0 ? '#fb7185' : '#34d399'} delay={0.18} />
      </div>

      {/* ══════════════════════════════════════════
          SECTION 2 — Genset Summary
      ══════════════════════════════════════════ */}
      <div>
        <Sec title="Genset Summary" subtitle="DSE7320 MKII — key engine & generator parameters" color="#f59e0b" icon={TbEngine} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Genset device card */}
          <GensetCard data={genset} />

          {/* Generator output */}
          <div className="glass-card p-4 sm:p-5">
            <p className="section-label mb-4">Generator Output</p>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
              {[['L1', genset.generator.voltL1N], ['L2', genset.generator.voltL2N], ['L3', genset.generator.voltL3N]].map(([ph, v]) => (
                <div key={ph} className="text-center p-2 sm:p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="section-label mb-1">{ph}-N</p>
                  <p className="metric-value-sm text-sm sm:text-base" style={{ color: '#fbbf24' }}>{fmt(v, 2)}</p>
                  <p className="text-[10px] text-dark-100">V</p>
                </div>
              ))}
            </div>
            {[
              { lbl: 'Generator Frequency', val: `${fmt(genset.generator.frequency, 2)} Hz`, color: '#34d399' },
              { lbl: 'Total Output Power', val: `${fmt(genset.generator.totalWatts / 1000, 2)} kW`, color: '#fbbf24' },
              { lbl: 'Average Power Factor', val: fmt(genset.generator.avgPF), color: '#818cf8' },
              { lbl: 'Mains Frequency', val: `${fmt(genset.mains.frequency, 2)} Hz`, color: '#38bdf8' },
              { lbl: 'Mains L1-N', val: `${fmt(genset.mains.voltL1N, 2)} V`, color: '#38bdf8' },
            ].map(({ lbl, val, color }) => (
              <div key={lbl} className="param-row">
                <span className="param-label">{lbl}</span>
                <span className="param-value" style={{ color }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Engine gauges mini */}
          <div className="glass-card p-4 sm:p-5">
            <p className="section-label mb-4">Engine Sensors</p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col items-center">
                <GaugeChart value={genset.engine.oilPressure} min={0} max={10000} unit="kPa" label="Oil Pressure" color="#10b981" size={110}
                  alarmZones={[{ start: 0, end: 1500, color: '#f43f5e' }, { start: 1500, end: 3000, color: '#f59e0b' }, { start: 3000, end: 7000, color: '#10b981' }, { start: 7000, end: 10000, color: '#f59e0b' }]} />
              </div>
              <div className="flex flex-col items-center">
                <GaugeChart value={genset.engine.coolantTemp} min={-50} max={200} unit="°C" label="Coolant Temp" color="#f43f5e" size={110}
                  alarmZones={[{ start: -50, end: 10, color: '#3b82f6' }, { start: 10, end: 85, color: '#10b981' }, { start: 85, end: 110, color: '#f59e0b' }, { start: 110, end: 200, color: '#f43f5e' }]} />
              </div>
              <div className="flex flex-col items-center">
                <GaugeChart value={genset.engine.speed} min={0} max={3000} unit="RPM" label="Engine Speed" color="#f59e0b" size={110} />
              </div>
              <div className="flex flex-col items-center col-span-1 justify-center">
                {/* Fuel level bar */}
                <p className="section-label mb-1">Fuel Level</p>
                <p className="metric-value text-xl sm:text-2xl mb-1.5" style={{ color: genset.engine.fuelLevel < 20 ? '#fb7185' : '#34d399' }}>
                  {fmt(genset.engine.fuelLevel, 2)}%
                </p>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(26,35,64,0.8)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${genset.engine.fuelLevel}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: genset.engine.fuelLevel < 20 ? 'linear-gradient(90deg,#f43f5e,#fb7185)' : 'linear-gradient(90deg,#10b981,#34d399)' }}
                  />
                </div>
                <p className="section-label mt-2 text-[10px]">Battery: {fmt(genset.engine.batteryVoltage)} V</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 3 — DPM / ME631 Summary
      ══════════════════════════════════════════ */}
      <div>
          <Sec title="Power" subtitle="Active, apparent, demand, and factor measurements" color="#fbbf24" icon={TbGauge} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          <DpmKpi label="Total Active Power" value={dpm.summary.totalActivePower} unit="kW" color="#fbbf24" icon={HiOutlineLightningBolt} />
          <DpmKpi label="Apparent Power" value={dpm.summary.totalApparentPower} unit="kVA" color="#a78bfa" icon={TbGauge} />
          <DpmKpi label="Peak Demand" value={dpm.summary.peakDemand} unit="kW" color="#fb7185" />
          <DpmKpi label="Avg Power Factor" value={dpm.summary.avgPowerFactor} unit="" color="#818cf8" icon={TbGauge} />
        </div>
        
        <Sec title="Voltage / Current" subtitle="Average electrical measurements and power quality" color="#0ea5e9" icon={MdOutlineElectricMeter} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <DpmKpi label="Avg Voltage" value={dpm.summary.avgVoltage} unit="V" color="#818cf8" icon={TbBolt} />
          <DpmKpi label="Avg Current" value={dpm.summary.avgCurrent} unit="A" color="#38bdf8" icon={TbBolt} />
          <DpmKpi label="Avg Voltage THD" value={dpm.summary.avgVoltageTHD} unit="%" color={dpm.summary.avgVoltageTHD > 5 ? '#fb7185' : '#34d399'} />
          <DpmKpi label="Avg Current THD" value={dpm.summary.avgCurrentTHD} unit="%" color={dpm.summary.avgCurrentTHD > 8 ? '#fb7185' : '#fbbf24'} />
          <DpmKpi label="Avg Frequency" value={dpm.summary.avgFrequency} unit="Hz" color="#34d399" icon={MdOutlineSpeed} />
        </div>



        <div className="mb-6">
          <Sec title="Energy | Digital Output" subtitle="Imported and exported energy totals and current output states" color="#34d399" icon={HiOutlineLightningBolt} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <HiOutlineLightningBolt className="text-emerald-400 text-lg" />
                <h3 className="text-sm font-bold text-white">Energy</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DpmKpi label="Imported Energy" value={(dpm.summary.importedEnergy / 1000).toFixed(1)} unit="MWh" color="#34d399" />
                <DpmKpi label="Exported Energy" value={(dpm.summary.exportedEnergy / 1000).toFixed(2)} unit="MWh" color="#f59e0b" />
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TbEngine className="text-amber-400 text-lg" />
                <h3 className="text-sm font-bold text-white">Digital Output</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { lbl: 'Digital Output 1', active: dpm.summary.digitalOutput1 },
                  { lbl: 'Digital Output 2', active: dpm.summary.digitalOutput2 },
                ].map(({ lbl, active }) => (
                  <div key={lbl} className="flex items-center gap-2 px-4 py-2 rounded-xl w-full sm:w-auto"
                    style={{ background: active ? 'rgba(52,211,153,0.08)' : 'rgba(26,35,64,0.5)', border: `1px solid ${active ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.1)'}` }}>
                    <div className={`w-2.5 h-2.5 rounded-full ${active ? 'status-online' : 'status-offline'}`} />
                    <span className="text-xs font-medium" style={{ color: active ? '#34d399' : '#6b7e99' }}>{lbl}: {active ? 'ON' : 'OFF'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 4 — Power & Energy Trends + Alarms
      ══════════════════════════════════════════ */}
      <Sec title="Power & Energy Trends" subtitle="24h live data — power, voltage, current, frequency" color="#6366f1" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Charts col */}
        <div className="lg:col-span-2 space-y-5">
          <MultiLineChart
            data={multiTrend}
            title="Power, Current & Voltage — 24h"
            lines={[
              { key: 'power', name: 'Active Power (kW)', color: '#6366f1' },
              { key: 'current', name: 'Current (A)', color: '#0ea5e9' },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TrendChart data={powerTrend} title="Active Power Trend" unit="kW" color="#6366f1" />
            <TrendChart
              data={multiTrend.map(d => ({ time: d.time, value: d.frequency }))}
              title="Frequency Trend" unit="Hz" color="#34d399"
            />
          </div>
          <EnergyBarChart data={energyData} title="Monthly Energy — Import vs Export" />
        </div>

        {/* Active alarms panel */}
        <div className="glass-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5 pb-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
            <div className="flex items-center gap-2">
              <TbAlertTriangle className="text-rose-400 text-xl" />
              <h3 className="text-sm font-bold text-white">Active Alarms</h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ color: activeAlarms.length > 0 ? '#fb7185' : '#34d399', background: activeAlarms.length > 0 ? 'rgba(244,63,94,0.1)' : 'rgba(52,211,153,0.1)' }}>
              {activeAlarms.length}
            </span>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {activeAlarms.length > 0 ? (
              activeAlarms.map((alarm, i) => <AlarmChip key={i} name={alarm.name} type={alarm.type} />)
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <HiOutlineStatusOnline className="text-5xl text-emerald-400 mb-3" />
                <p className="text-sm font-semibold text-emerald-400">All Systems Normal</p>
                <p className="text-xs text-dark-400 mt-1">No active alarms</p>
              </div>
            )}
          </div>
          {/* Alarm type legend */}
          <div className="mt-4 pt-4 space-y-1.5" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
            <p className="section-label mb-2">Severity Levels</p>
            {[
              { label: 'Normal', color: '#34d399' },
              { label: 'Warning', color: '#fbbf24' },
              { label: 'Shutdown', color: '#fb7185' },
              { label: 'Electrical Trip', color: '#a78bfa' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
                <span className="text-xs text-dark-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
