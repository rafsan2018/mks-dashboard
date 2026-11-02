import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineLightningBolt, HiOutlineChartBar,
  HiOutlineChevronDown, HiOutlineChevronUp,
} from 'react-icons/hi';
import { TbBolt, TbWaveSine, TbMath, TbClock } from 'react-icons/tb';
import { MdOutlineElectricMeter } from 'react-icons/md';
import GaugeChart from '../components/GaugeChart';
import { TrendChart, EnergyBarChart, MultiLineChart } from '../components/Charts';
import { generateME631Data, generateTrendData, generateEnergyBarData } from '../data/mockData';

/* ── helpers ── */
const fmt = (v, dp = 3) =>
  typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: dp }) : v;

/* ── Section header ── */
const Sec = ({ title, subtitle, color = '#0ea5e9', icon: Icon, badge }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-3">
      <div className="w-1 h-7 rounded-full shrink-0" style={{ background: color }} />
      {Icon && <Icon className="text-xl shrink-0" style={{ color }} />}
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-dark-300 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {badge && <span className="section-label px-2 py-1 rounded-md" style={{ background: 'rgba(26,35,64,0.7)' }}>{badge}</span>}
  </div>
);

/* ── KPI card ── */
const Kpi = ({ label, value, unit, color = '#94a3b8', large }) => (
  <div className="glass-card p-4">
    <p className="section-label mb-2">{label}</p>
    <p className={large ? 'metric-value text-3xl' : 'metric-value-sm'} style={{ color }}>
      {fmt(value)}<span className="text-dark-400 text-xs ml-1.5 font-sans font-normal">{unit}</span>
    </p>
  </div>
);

/* ── Parameter row ── */
const PR = ({ label, value, unit = '', color = '#94a3b8' }) => (
  <div className="param-row">
    <span className="param-label">{label}</span>
    <span className="param-value" style={{ color }}>{fmt(value)}<span className="text-dark-400 text-xs ml-1">{unit}</span></span>
  </div>
);

/* ── Phase trio display ── */
const PhaseTrio = ({ label, items, unit, baseColor }) => {
  const colors = [`${baseColor}`, `${baseColor}cc`, `${baseColor}99`];
  return (
    <div className="glass-card p-5">
      <p className="section-label mb-3">{label}</p>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {items.map(({ ph, val }, i) => (
          <div key={ph} className="text-center p-3 rounded-xl" style={{ background: `${baseColor}10`, border: `1px solid ${baseColor}20` }}>
            <p className="section-label mb-1">{ph}</p>
            <p className="metric-value-sm" style={{ color: baseColor }}>{fmt(val, 2)}</p>
            <p className="text-[10px] text-dark-400">{unit}</p>
          </div>
        ))}
      </div>
      {items.length === 3 && (
        <div className="flex items-center justify-between px-1 mt-1">
          <span className="section-label">Avg / Total</span>
          <span className="param-value text-sm" style={{ color: baseColor }}>
            {fmt(items.reduce((s, i) => s + i.val, 0) / items.length, 2)}<span className="text-dark-400 text-xs ml-1">{unit}</span>
          </span>
        </div>
      )}
    </div>
  );
};

/* ── Expandable section ── */
const Expandable = ({ title, subtitle, color = '#6366f1', children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && <p className="text-[11px] text-dark-300 mt-0.5">{subtitle}</p>}
        </div>
        {open ? <HiOutlineChevronUp className="text-dark-400 text-lg shrink-0" /> : <HiOutlineChevronDown className="text-dark-400 text-lg shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="px-5 pb-5 pt-0" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
              <div className="pt-4">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── THD gauge ── */
const ThdGauge = ({ label, val, warn = 5, alarm = 8 }) => {
  const color = val > alarm ? '#fb7185' : val > warn ? '#fbbf24' : '#34d399';
  return (
    <div className="text-center p-3 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <p className="section-label mb-1">{label}</p>
      <p className="metric-value-sm" style={{ color }}>{fmt(val, 2)}</p>
      <p className="text-[10px] text-dark-400">%</p>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
const DPM = () => {
  const [d, setD] = useState(generateME631Data());
  const [pwrTrend]    = useState(generateTrendData(24, 8.4, 0.05));
  const [energyData]  = useState(generateEnergyBarData());
  const [multiTrend]  = useState(() => ({
    data: Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2,'0')}:00`,
      P1: 2.87 + Math.sin(i/4)*0.5,
      P2: 2.72 + Math.sin(i/4)*0.4,
      P3: 2.80 + Math.sin(i/4)*0.45,
    })),
  }));

  // TODO: fetch from GET /api/dpm/me631
  useEffect(() => {
    const id = setInterval(() => setD(generateME631Data()), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Device header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${d.status === 'online' ? 'status-online' : 'status-warning'}`} />
          <div>
            <h2 className="text-sm font-bold text-white">ME631 — Digital Power Meter (Modbus RTU/TCP)</h2>
            <p className="text-xs text-dark-300">Register groups per MODBUS LIST MANUAL ME631.pdf — p.12+</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {[
            { lbl: 'Avg Freq',    val: `${fmt(d.frequency.FreqAvg, 2)} Hz`, color: '#34d399' },
            { lbl: 'Avg PF',      val: fmt(d.powerFactor.PFAvg),            color: d.powerFactor.PFAvg > 0.9 ? '#34d399' : '#fbbf24' },
            { lbl: 'Total P',     val: `${fmt(d.activePower.PTotal, 2)} kW`, color: '#818cf8' },
            { lbl: 'Avg I THD',   val: `${fmt(d.currentHarmonics.ITHDAvg, 2)} %`, color: d.currentHarmonics.ITHDAvg > 8 ? '#fb7185' : '#fbbf24' },
          ].map(({ lbl, val, color }) => (
            <div key={lbl} className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(26,35,64,0.7)', border: '1px solid rgba(99,102,241,0.1)' }}>
              <span className="text-dark-400">{lbl}: </span>
              <span className="font-bold font-mono" style={{ color }}>{val}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════
          GROUP 1 — Power Factor (PF & DPF)
          Manual: PF1, PF2, PF3, PFAvg, DPF1, DPF2, DPF3, DPFAvg
      ════════════════════════════════════════════ */}
      <div>
        <Sec title="Group 1 — Power Factor" subtitle="True PF and Displacement PF per phase" color="#6366f1" icon={TbMath} badge="Reg 0000–0015" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {['PF1', 'PF2', 'PF3', 'PFAvg'].map((k, i) => (
            <motion.div key={k} initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
              className="glass-card p-5 flex flex-col items-center">
              <GaugeChart value={d.powerFactor[k]} min={-1} max={1} label={k.replace('Avg', ' Avg')} color="#6366f1" size={130} centerZero />
            </motion.div>
          ))}
        </div>
        <div className="glass-card p-5">
          <p className="section-label mb-4">Displacement Power Factor (DPF)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['DPF1', 'DPF2', 'DPF3', 'DPFAvg'].map((k, i) => (
              <div key={k} className="text-center p-3 sm:p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="section-label mb-2">{k}</p>
                <p className="metric-value text-lg sm:text-xl" style={{ color: '#a78bfa' }}>{fmt(d.powerFactor[k])}</p>
                <p className="text-[10px] text-dark-400 mt-1">DPF</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 2 — Frequency
          Manual: Freq1, Freq2, Freq3, FreqAvg (Hz)
      ════════════════════════════════════════════ */}
      <div>
        <Sec title="Group 2 — Frequency" subtitle="Per-phase and average system frequency" color="#34d399" badge="Reg 0016–0023" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1 glass-card p-6 flex flex-col items-center justify-center">
            <GaugeChart value={d.frequency.FreqAvg} min={48} max={52} unit="Hz" label="Average Frequency" color="#34d399" size={160} />
          </div>
          <div className="glass-card p-5">
            <p className="section-label mb-4">Per-Phase Frequency</p>
            <PR label="Freq1 (Phase 1)" value={d.frequency.Freq1} unit="Hz" color="#34d399" />
            <PR label="Freq2 (Phase 2)" value={d.frequency.Freq2} unit="Hz" color="#10b981" />
            <PR label="Freq3 (Phase 3)" value={d.frequency.Freq3} unit="Hz" color="#059669" />
            <PR label="FreqAvg"         value={d.frequency.FreqAvg} unit="Hz" color="#34d399" />
            <div className="mt-3 flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${Math.abs(d.frequency.FreqAvg - 50) < 0.5 ? 'status-online' : 'status-warning'}`} />
              <span className="text-xs" style={{ color: Math.abs(d.frequency.FreqAvg - 50) < 0.5 ? '#34d399' : '#fbbf24' }}>
                {Math.abs(d.frequency.FreqAvg - 50) < 0.5 ? 'Normal (49.5–50.5 Hz)' : 'Out of range'}
              </span>
            </div>
          </div>
          <div className="sm:col-span-1">
            <TrendChart data={pwrTrend.map(p => ({ time: p.time, value: 50 + (Math.random() - 0.5) * 0.4 }))} title="Freq Trend — 24h" unit="Hz" color="#34d399" />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 3 — Current (I1, I2, I3, IAvg)
          Manual: registers ~2139+
      ════════════════════════════════════════════ */}
      <div>
        <Sec title="Group 3 — Current" subtitle="Phase currents and average — I1, I2, I3, IAvg" color="#f59e0b" icon={TbBolt} badge="Reg ~2139+" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="I1 (Phase 1)" value={d.current.I1}   unit="A" color="#fbbf24" large />
          <Kpi label="I2 (Phase 2)" value={d.current.I2}   unit="A" color="#f59e0b" large />
          <Kpi label="I3 (Phase 3)" value={d.current.I3}   unit="A" color="#d97706" large />
          <Kpi label="IAvg"         value={d.current.IAvg} unit="A" color="#fbbf24" large />
        </div>
        <div className="mt-4">
          <PhaseTrio label="Phase Current Distribution" unit="A" baseColor="#fbbf24"
            items={[{ ph: 'I1', val: d.current.I1 }, { ph: 'I2', val: d.current.I2 }, { ph: 'I3', val: d.current.I3 }]} />
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 4 — Voltage (U1, U2, U3, UAvg)
          Manual: registers ~2147+
      ════════════════════════════════════════════ */}
      <div>
        <Sec title="Group 4 — Voltage" subtitle="Phase-to-neutral, line voltages and average — U1, U2, U3, UAvg" color="#818cf8" icon={TbBolt} badge="Reg ~2147+" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Kpi label="U1 (Phase A–N)" value={d.voltage.U1}   unit="V" color="#818cf8" large />
          <Kpi label="U2 (Phase B–N)" value={d.voltage.U2}   unit="V" color="#6366f1" large />
          <Kpi label="U3 (Phase C–N)" value={d.voltage.U3}   unit="V" color="#4f46e5" large />
          <Kpi label="UAvg"           value={d.voltage.UAvg} unit="V" color="#818cf8" large />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhaseTrio label="Phase Voltages (U1, U2, U3)" unit="V" baseColor="#818cf8"
            items={[{ ph: 'U1', val: d.voltage.U1 }, { ph: 'U2', val: d.voltage.U2 }, { ph: 'U3', val: d.voltage.U3 }]} />
          <div className="glass-card p-5">
            <p className="section-label mb-3">Line Voltages</p>
            <PR label="U12 (A-B)" value={d.voltage.U12} unit="V" color="#818cf8" />
            <PR label="U23 (B-C)" value={d.voltage.U23} unit="V" color="#6366f1" />
            <PR label="U31 (C-A)" value={d.voltage.U31} unit="V" color="#4f46e5" />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 5 — Active Power (P1, P2, P3, PTotal)
          Manual: registers ~2155+
      ════════════════════════════════════════════ */}
      <div>
        <Sec title="Group 5 — Active Power" subtitle="P1, P2, P3 and PTotal — in kW" color="#34d399" icon={HiOutlineLightningBolt} badge="Reg ~2155+" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="P1 (Phase 1)" value={d.activePower.P1}     unit="kW" color="#34d399" large />
          <Kpi label="P2 (Phase 2)" value={d.activePower.P2}     unit="kW" color="#10b981" large />
          <Kpi label="P3 (Phase 3)" value={d.activePower.P3}     unit="kW" color="#059669" large />
          <Kpi label="P Total"      value={d.activePower.PTotal} unit="kW" color="#34d399" large />
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 6 — Reactive & Apparent Power
      ════════════════════════════════════════════ */}
      <div>
        <Sec title="Group 6 — Reactive & Apparent Power" subtitle="FQ1/FQ2/FQ3, S1/S2/S3 and totals" color="#a78bfa" badge="Reactive kVar | Apparent kVA" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Reactive */}
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[['FQ1', d.reactivePower.FQ1], ['FQ2', d.reactivePower.FQ2], ['FQ3', d.reactivePower.FQ3], ['FQ Total', d.reactivePower.FQTotal]].map(([lbl, val]) => (
                <Kpi key={lbl} label={lbl} value={val} unit="kVar" color="#a78bfa" />
              ))}
            </div>
            <PhaseTrio label="Reactive Power — Phase Comparison" unit="kVar" baseColor="#a78bfa"
              items={[{ ph: 'FQ1', val: d.reactivePower.FQ1 }, { ph: 'FQ2', val: d.reactivePower.FQ2 }, { ph: 'FQ3', val: d.reactivePower.FQ3 }]} />
          </div>
          {/* Apparent */}
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[['S1', d.apparentPower.S1], ['S2', d.apparentPower.S2], ['S3', d.apparentPower.S3], ['S Total', d.apparentPower.STotal]].map(([lbl, val]) => (
                <Kpi key={lbl} label={lbl} value={val} unit="kVA" color="#818cf8" />
              ))}
            </div>
            <PhaseTrio label="Apparent Power — Phase Comparison" unit="kVA" baseColor="#818cf8"
              items={[{ ph: 'S1', val: d.apparentPower.S1 }, { ph: 'S2', val: d.apparentPower.S2 }, { ph: 'S3', val: d.apparentPower.S3 }]} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 7 — Power Quality / Harmonics (Expandable)
      ════════════════════════════════════════════ */}
      <div>
        <Sec title="Group 7 — Power Quality / Harmonics" subtitle="Current THD (I1/I2/I3 — x/y/z) and Voltage THD (U1/U2/U3 — x/y/z)" color="#f43f5e" icon={TbWaveSine} />

        {/* Summary THD cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { lbl: 'ITHD Avg',  val: d.currentHarmonics.ITHDAvg, warn: 8,  alarm: 12 },
            { lbl: 'UTHD Avg',  val: d.voltageHarmonics.UTHDAvg, warn: 5,  alarm: 8 },
            { lbl: 'I THDx Avg', val: d.currentHarmonics.ITHDxAvg, warn: 7, alarm: 10 },
            { lbl: 'U THDx Avg', val: d.voltageHarmonics.UTHDxAvg, warn: 4, alarm: 7 },
          ].map(({ lbl, val, warn, alarm }) => {
            const color = val > alarm ? '#fb7185' : val > warn ? '#fbbf24' : '#34d399';
            return (
              <div key={lbl} className="glass-card p-4 text-center">
                <p className="section-label mb-2">{lbl}</p>
                <p className="metric-value text-2xl" style={{ color }}>{fmt(val, 2)}</p>
                <p className="text-xs text-dark-400 mt-1">%</p>
                <div className="mt-2 w-full h-1.5 rounded-full" style={{ background: 'rgba(26,35,64,0.8)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(val / 15 * 100, 100)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Harmonics — expandable */}
        <Expandable title="Current Harmonics Detail — I1/I2/I3 (x, y, z, total)" subtitle="Odd-order (x), Even-order (y), Sub-harmonics (z), Total THD">
          <div className="space-y-5">
            {[
              { label: 'Odd-Order (THDx)',  keys: ['I1THDx','I2THDx','I3THDx','ITHDxAvg'], color: '#f43f5e', warn: 7,  alarm: 10 },
              { label: 'Even-Order (THDy)', keys: ['I1THDy','I2THDy','I3THDy','ITHDyAvg'], color: '#f59e0b', warn: 2,  alarm: 4 },
              { label: 'Sub-Harmonics (THDz)',keys:['I1THDz','I2THDz','I3THDz','ITHDzAvg'],color: '#8b5cf6', warn: 1,  alarm: 2 },
              { label: 'Total THD (I)',     keys: ['I1THD','I2THD','I3THD','ITHDAvg'],     color: '#fb7185', warn: 8,  alarm: 12 },
            ].map(({ label, keys, color, warn, alarm }) => (
              <div key={label}>
                <p className="section-label mb-2" style={{ color }}>{label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {keys.map(k => <ThdGauge key={k} label={k} val={d.currentHarmonics[k]} warn={warn} alarm={alarm} />)}
                </div>
              </div>
            ))}
          </div>
        </Expandable>

        {/* Voltage Harmonics — expandable */}
        <Expandable title="Voltage Harmonics Detail — U1/U2/U3 (x, y, z, total)" subtitle="Odd-order (x), Even-order (y), Sub-harmonics (z), Total THD">
          <div className="space-y-5">
            {[
              { label: 'Odd-Order (THDx)',  keys: ['U1THDx','U2THDx','U3THDx','UTHDxAvg'], color: '#f43f5e', warn: 4,  alarm: 7 },
              { label: 'Even-Order (THDy)', keys: ['U1THDy','U2THDy','U3THDy','UTHDyAvg'], color: '#f59e0b', warn: 1.5, alarm: 3 },
              { label: 'Sub-Harmonics (THDz)',keys:['U1THDz','U2THDz','U3THDz','UTHDzAvg'],color: '#8b5cf6', warn: 0.5, alarm: 1 },
              { label: 'Total THD (U)',     keys: ['U1THD','U2THD','U3THD','UTHDAvg'],     color: '#fb7185', warn: 5,  alarm: 8 },
            ].map(({ label, keys, color, warn, alarm }) => (
              <div key={label}>
                <p className="section-label mb-2" style={{ color }}>{label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {keys.map(k => <ThdGauge key={k} label={k} val={d.voltageHarmonics[k]} warn={warn} alarm={alarm} />)}
                </div>
              </div>
            ))}
          </div>
        </Expandable>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 8 — Energy (Import / Export)
          Active kWh, Reactive kVarh, Apparent kVAh
      ════════════════════════════════════════════ */}
      <div>
        <Sec title="Group 8 — Energy" subtitle="Active, reactive and apparent energy — import/export per phase" color="#0ea5e9" icon={HiOutlineChartBar} />

        {/* Active energy */}
        <div className="mb-4">
          <p className="section-label mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Active Energy (kWh)
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <p className="section-label mb-3 text-emerald-400">▼ Import</p>
              <PR label="Phase 1 Import" value={fmt(d.energy.activeImport.P1, 1)}    unit="kWh" color="#34d399" />
              <PR label="Phase 2 Import" value={fmt(d.energy.activeImport.P2, 1)}    unit="kWh" color="#10b981" />
              <PR label="Phase 3 Import" value={fmt(d.energy.activeImport.P3, 1)}    unit="kWh" color="#059669" />
              <div className="param-row" style={{ borderTop: '1px solid rgba(52,211,153,0.15)', paddingTop: '8px', marginTop: '4px' }}>
                <span className="text-sm font-semibold text-white">Total Import</span>
                <span className="metric-value-sm" style={{ color: '#34d399' }}>{fmt(d.energy.activeImport.Total, 1)} <span className="text-xs font-normal text-dark-400">kWh</span></span>
              </div>
            </div>
            <div className="glass-card p-5">
              <p className="section-label mb-3 text-amber-400">▲ Export</p>
              <PR label="Phase 1 Export" value={fmt(d.energy.activeExport.P1, 1)}    unit="kWh" color="#fbbf24" />
              <PR label="Phase 2 Export" value={fmt(d.energy.activeExport.P2, 1)}    unit="kWh" color="#f59e0b" />
              <PR label="Phase 3 Export" value={fmt(d.energy.activeExport.P3, 1)}    unit="kWh" color="#d97706" />
              <div className="param-row" style={{ borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: '8px', marginTop: '4px' }}>
                <span className="text-sm font-semibold text-white">Total Export</span>
                <span className="metric-value-sm" style={{ color: '#fbbf24' }}>{fmt(d.energy.activeExport.Total, 1)} <span className="text-xs font-normal text-dark-400">kWh</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Reactive energy */}
        <Expandable title="Reactive Energy (kVarh) — Import / Export per Phase">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <p className="section-label mb-3 text-violet-400">▼ Reactive Import</p>
              {['P1','P2','P3'].map(p => <PR key={p} label={`Phase ${p.slice(1)} Import`} value={fmt(d.energy.reactiveImport[p], 1)} unit="kVarh" color="#a78bfa" />)}
              <PR label="Total" value={fmt(d.energy.reactiveImport.Total, 1)} unit="kVarh" color="#8b5cf6" />
            </div>
            <div className="glass-card p-5">
              <p className="section-label mb-3 text-rose-400">▲ Reactive Export</p>
              {['P1','P2','P3'].map(p => <PR key={p} label={`Phase ${p.slice(1)} Export`} value={fmt(d.energy.reactiveExport[p], 1)} unit="kVarh" color="#fb7185" />)}
              <PR label="Total" value={fmt(d.energy.reactiveExport.Total, 1)} unit="kVarh" color="#f43f5e" />
            </div>
          </div>
        </Expandable>

        {/* Apparent energy */}
        <Expandable title="Apparent Energy (kVAh) — Import / Export per Phase">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <p className="section-label mb-3 text-sky-400">▼ Apparent Import</p>
              {['P1','P2','P3'].map(p => <PR key={p} label={`Phase ${p.slice(1)} Import`} value={fmt(d.energy.apparentImport[p], 1)} unit="kVAh" color="#38bdf8" />)}
              <PR label="Total" value={fmt(d.energy.apparentImport.Total, 1)} unit="kVAh" color="#0ea5e9" />
            </div>
            <div className="glass-card p-5">
              <p className="section-label mb-3 text-orange-400">▲ Apparent Export</p>
              {['P1','P2','P3'].map(p => <PR key={p} label={`Phase ${p.slice(1)} Export`} value={fmt(d.energy.apparentExport[p], 1)} unit="kVAh" color="#fb923c" />)}
              <PR label="Total" value={fmt(d.energy.apparentExport.Total, 1)} unit="kVAh" color="#ea580c" />
            </div>
          </div>
        </Expandable>

        <div className="mt-4">
          <EnergyBarChart data={energyData} title="Monthly Energy — Active Import vs Export (kWh)" />
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 9 — Demand
          Active, Reactive, Apparent, Current per phase
      ════════════════════════════════════════════ */}
      <div>
        <Sec title="Group 9 — Power & Current Demand" subtitle="Present & peak demand with timestamps" color="#f59e0b" icon={TbClock} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {[
            { title: 'Active Power Demand',   presentKey: 'activePresentDemand',   peakKey: 'activePeakDemand',   dtKey: 'activePeakDateTime',   unit: 'kW',   color: '#34d399' },
            { title: 'Reactive Power Demand', presentKey: 'reactivePresentDemand', peakKey: 'reactivePeakDemand', dtKey: 'reactivePeakDateTime', unit: 'kVar', color: '#a78bfa' },
            { title: 'Apparent Power Demand', presentKey: 'apparentPresentDemand', peakKey: 'apparentPeakDemand', dtKey: 'apparentPeakDateTime', unit: 'kVA',  color: '#818cf8' },
          ].map(({ title, presentKey, peakKey, dtKey, unit, color }) => (
            <div key={title} className="glass-card p-5">
              <p className="section-label mb-4">{title}</p>
              <div className="flex items-end gap-2 mb-1">
                <p className="metric-value text-2xl" style={{ color }}>{fmt(d.demand[presentKey], 2)}</p>
                <p className="text-dark-400 text-sm mb-1">{unit}</p>
              </div>
              <p className="text-[11px] text-dark-400 mb-3">Present Demand</p>
              <div className="p-3 rounded-xl" style={{ background: 'rgba(251,113,133,0.06)', border: '1px solid rgba(251,113,133,0.12)' }}>
                <p className="section-label mb-1 text-rose-400">Peak Demand</p>
                <p className="metric-value-sm" style={{ color: '#fb7185' }}>{fmt(d.demand[peakKey], 2)} {unit}</p>
                <p className="text-[10px] text-dark-400 mt-1 flex items-center gap-1"><TbClock className="inline" />{d.demand[dtKey]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Current demand per phase */}
        <div className="glass-card p-5">
          <p className="section-label mb-4">Current Demand — Per Phase</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { ph: 'I1', presentK: 'I1PresentDemand', peakK: 'I1PeakDemand', dtK: 'I1PeakDateTime' },
              { ph: 'I2', presentK: 'I2PresentDemand', peakK: 'I2PeakDemand', dtK: 'I2PeakDateTime' },
              { ph: 'I3', presentK: 'I3PresentDemand', peakK: 'I3PeakDemand', dtK: 'I3PeakDateTime' },
              { ph: 'IAvg', presentK: 'IAvgPresentDemand', peakK: 'IAvgPeakDemand', dtK: 'IAvgPeakDateTime' },
            ].map(({ ph, presentK, peakK, dtK }) => (
              <div key={ph} className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <p className="section-label mb-2 text-amber-400">{ph}</p>
                <p className="metric-value text-xl mb-1" style={{ color: '#fbbf24' }}>{fmt(d.demand[presentK], 2)} A</p>
                <p className="text-[10px] text-dark-400 mb-2">Present</p>
                <p className="text-xs font-bold" style={{ color: '#fb7185' }}>{fmt(d.demand[peakK], 2)} A</p>
                <p className="text-[10px] text-dark-400">Peak: {d.demand[dtK]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart data={pwrTrend} title="Active Power (PTotal) — 24h Trend" unit="kW" color="#34d399" />
        <TrendChart data={pwrTrend.map(p => ({ time: p.time, value: p.value * 1.04 }))} title="Apparent Power (STotal) — 24h Trend" unit="kVA" color="#818cf8" />
      </div>
    </div>
  );
};

export default DPM;
