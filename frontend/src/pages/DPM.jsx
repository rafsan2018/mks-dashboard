import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineLightningBolt, HiOutlineChartBar,
  HiOutlineChevronDown, HiOutlineChevronUp,
  HiOutlineDownload,
} from 'react-icons/hi';
import { TbBolt, TbWaveSine, TbMath, TbClock, TbFileSpreadsheet } from 'react-icons/tb';
import { MdOutlineElectricMeter } from 'react-icons/md';
import GaugeChart from '../components/GaugeChart';
import { TrendChart, EnergyBarChart, MultiLineChart } from '../components/Charts';
import {
  createInitialDpmData,
  fetchDeviceReadings,
  transformDpmResponse,
  fetchDevicePowerTrends,
  generateSingleTrendCsv,
  generateSingleTrendExcel,
  downloadExportFile,
} from '../api/deviceReadingService';
import usePolling from '../hooks/usePolling';

/* ── helpers ── */
const fmt = (v, dp = 2) => {
  if (v === null || v === undefined || v === '') return (0).toFixed(dp);
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(dp);
};

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
const Kpi = ({ label, value, unit, color = '#94a3b8', large, labelLarge = false }) => (
  <div className="glass-card p-4">
    <p className={`${labelLarge ? 'text-sm font-semibold tracking-wide text-dark-300' : 'section-label'} mb-2`}>{label}</p>
    <p className={large ? 'metric-value text-3xl' : 'metric-value-sm'} style={{ color }}>
      {fmt(value)}<span className="unit-label text-[10px] ml-1.5 font-sans font-normal">{unit}</span>
    </p>
  </div>
);

/* ── Parameter row ── */
const PR = ({ label, value, unit = '', color = '#94a3b8' }) => (
  <div className="param-row">
    <span className="param-label">{label}</span>
    <span className="param-value" style={{ color }}>{fmt(value)}<span className="unit-label text-[10px] ml-1">{unit}</span></span>
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
            <p className="unit-label text-[10px]">{unit}</p>
          </div>
        ))}
      </div>
      {items.length === 3 && (
        <div className="flex items-center justify-between px-1 mt-1">
          <span className="section-label">Avg / Total</span>
          <span className="param-value text-sm" style={{ color: baseColor }}>
            {fmt(items.reduce((s, i) => s + i.val, 0) / items.length, 2)}<span className="unit-label text-[10px] ml-1">{unit}</span>
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
      <p className="unit-label text-[10px]">%</p>
    </div>
  );
};

/* ── Individual Trend Export Menu Component ── */
const TrendExportMenu = ({
  metricKey,
  metricLabel,
  metricUnit,
  color,
  currentRange,
  onRangeChange,
  isOpen,
  onToggle,
  onExport,
  isExporting,
  exportingFormat,
}) => (
  <div className="relative">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={isExporting}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      style={{
        background: isOpen ? 'rgba(99,102,241,0.25)' : 'rgba(30,41,59,0.7)',
        border: `1px solid ${isOpen ? color : 'rgba(99,102,241,0.25)'}`,
        color: isOpen ? '#ffffff' : '#cbd5e1',
      }}
      title={`Export ${metricLabel} data`}
    >
      {isExporting ? (
        <>
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-[11px]">Preparing...</span>
        </>
      ) : (
        <>
          <HiOutlineDownload className="text-xs shrink-0" style={{ color }} />
          <span className="text-[11px]">Export Data</span>
          <span className="text-[9px] opacity-70">▾</span>
        </>
      )}
    </button>

    {isOpen && (
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 mt-2 w-64 p-3.5 rounded-xl shadow-2xl z-50 text-xs backdrop-blur-xl animate-fade-in"
        style={{
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.8), 0 10px 15px -5px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Metric Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60">
          <span className="font-semibold text-white text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            {metricLabel}
          </span>
          <span className="text-[10px] text-dark-400 font-mono">[{metricUnit}]</span>
        </div>

        {/* Date Range Selection (up to 1 month) */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-dark-300 uppercase tracking-wider font-semibold">
              Date Range
            </label>
            <span className="text-[9px] font-mono text-emerald-400">Up to 1 Month</span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-900/80 border border-slate-800">
            {[
              { id: '24h', label: '24 Hours' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '1 Month' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onRangeChange(opt.id)}
                disabled={isExporting}
                className={`py-1 text-[10px] rounded-md transition-all ${
                  currentRange === opt.id
                    ? 'bg-indigo-600 text-white shadow font-semibold'
                    : 'text-dark-300 hover:text-white font-medium'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Export Formats */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onExport('xlsx')}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-white font-semibold text-[11px] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #059669, #10b981)',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              border: '1px solid rgba(52,211,153,0.3)',
            }}
          >
            {isExporting && exportingFormat === 'xlsx' ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Preparing Excel...</span>
              </>
            ) : (
              <>
                <TbFileSpreadsheet className="text-sm shrink-0" />
                <span>Export to Excel (.xlsx)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onExport('csv')}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-dark-200 hover:text-white font-semibold text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80"
          >
            {isExporting && exportingFormat === 'csv' ? (
              <>
                <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Preparing CSV...</span>
              </>
            ) : (
              <>
                <HiOutlineDownload className="text-sm shrink-0" />
                <span>Export to CSV (.csv)</span>
              </>
            )}
          </button>
        </div>
      </div>
    )}
  </div>
);

const DPM = () => {
  const [d, setD] = useState(() => createInitialDpmData());
  const [pwrTrend] = useState(() => Array.from({ length: 24 }, (_, i) => ({ time: `${String(i).padStart(2, '0')}:00`, value: 0 })));
  const [energyData] = useState(() => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => ({ month: m, import: 0, export: 0 })));
  const [multiTrend] = useState(() => ({
    data: Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      P1: 0,
      P2: 0,
      P3: 0,
    })),
  }));

  // Individual export menu and range states per trend
  const [openExportMenu, setOpenExportMenu] = useState(null); // 'pTotal' | 'sTotal' | 'fqTotal' | null
  const [trendRanges, setTrendRanges] = useState({
    pTotal: '30d',
    sTotal: '30d',
    fqTotal: '30d',
  });
  const [exportingMetric, setExportingMetric] = useState(null); // 'pTotal' | 'sTotal' | 'fqTotal' | null
  const [exportingFormat, setExportingFormat] = useState(null); // 'xlsx' | 'csv' | null
  const [exportMessage, setExportMessage] = useState(null);
  const [historicalTrends, setHistoricalTrends] = useState([]);

  // Auto-close open export menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenExportMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch Device 2 readings from the API
  const loadData = useCallback(async ({ background } = {}) => {
    try {
      const apiData = await fetchDeviceReadings(2, { background });
      setD(transformDpmResponse(apiData));
    } catch (err) {
      console.error('[DPM] API error:', err);
    }
  }, []);

  // Fetch dynamic historical power trends for the trend charts
  const loadTrendData = useCallback(async ({ background } = {}) => {
    try {
      const res = await fetchDevicePowerTrends(2, '24h', { background });
      if (res?.alignedRecords && res.alignedRecords.length > 0) {
        setHistoricalTrends(res.alignedRecords);
      }
    } catch (err) {
      // quiet fallback
    }
  }, []);

  // Load on mount, then refresh readings and trends every POLL_INTERVAL ms
  const loadAll = useCallback(
    (options) => Promise.all([loadData(options), loadTrendData(options)]),
    [loadData, loadTrendData]
  );
  usePolling(loadAll);

  // Handle individual trend export (Active Power, Apparent Power, or Reactive Power)
  const handleExportSingle = async (metricKey, format = 'xlsx') => {
    const range = trendRanges[metricKey] || '30d';
    const config = {
      pTotal: {
        label: 'Active Power (PTotal)',
        unit: 'kW',
        fileSlug: 'Active_Power_PTotal',
        currentVal: d.activePower.PTotal ?? 0,
      },
      sTotal: {
        label: 'Apparent Power (STotal)',
        unit: 'kVA',
        fileSlug: 'Apparent_Power_STotal',
        currentVal: d.apparentPower.STotal ?? 0,
      },
      fqTotal: {
        label: 'Reactive Power (FQTotal)',
        unit: 'kVar',
        fileSlug: 'Reactive_Power_FQTotal',
        currentVal: d.reactivePower.FQTotal ?? 0,
      },
    }[metricKey];

    if (!config) return;

    setExportingMetric(metricKey);
    setExportingFormat(format);
    setExportMessage(null);

    try {
      // 1. Fetch dynamic data from API for the selected range (up to 30d / 1 month)
      const res = await fetchDevicePowerTrends(2, range);
      let records = res?.alignedRecords || [];

      // 2. Fallback to current dynamic reading if database has no records yet
      if (records.length === 0) {
        const now = new Date();
        records = [
          {
            timestamp: now.toISOString(),
            isoTimestamp: now.toISOString(),
            [metricKey]: config.currentVal,
          },
        ];
        setExportMessage({
          type: 'info',
          text: `Exported latest dynamic snapshot for ${config.label} (1 record). Historical readings accumulate in the database over time.`,
        });
      } else {
        const rangeText = range === '30d' ? '1 Month (30 Days)' : range === '7d' ? '7 Days' : '24 Hours';
        setExportMessage({
          type: 'success',
          text: `Successfully exported ${records.length} historical readings for ${config.label} (${rangeText}) in ${format.toUpperCase()} format!`,
        });
      }

      const timestampSlug = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `DPM_${config.fileSlug}_${range.toUpperCase()}_${timestampSlug}.${format}`;

      if (format === 'csv') {
        const csvContent = generateSingleTrendCsv(records, {
          metricKey,
          metricLabel: config.label,
          metricUnit: config.unit,
          deviceName: 'AMF Board Outgoing DPM',
          deviceModel: 'ME631',
          deviceId: 2,
        });
        downloadExportFile(csvContent, filename, 'text/csv;charset=utf-8;');
      } else {
        const excelContent = generateSingleTrendExcel(records, {
          metricKey,
          metricLabel: config.label,
          metricUnit: config.unit,
          deviceName: 'AMF Board Outgoing DPM',
          deviceModel: 'ME631',
          deviceId: 2,
          timeRange: range,
        });
        downloadExportFile(excelContent, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }

      setOpenExportMenu(null);
    } catch (err) {
      console.error(`[DPM] Export error for ${metricKey}:`, err);
      setExportMessage({
        type: 'error',
        text: `Export failed for ${config.label}: ${err.message || 'Error communicating with server'}`,
      });
    } finally {
      setExportingMetric(null);
      setExportingFormat(null);
    }
  };

  // Dynamic trend data for charts
  const activeTrendData = historicalTrends.length > 0
    ? historicalTrends.map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: r.pTotal != null ? Number(r.pTotal) : 0,
      }))
    : pwrTrend.map(p => ({ time: p.time, value: d.activePower.PTotal || p.value }));

  const apparentTrendData = historicalTrends.length > 0
    ? historicalTrends.map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: r.sTotal != null ? Number(r.sTotal) : 0,
      }))
    : pwrTrend.map(p => ({ time: p.time, value: d.apparentPower.STotal || (p.value * 1.04) }));

  const reactiveTrendData = historicalTrends.length > 0
    ? historicalTrends.map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: r.fqTotal != null ? Number(r.fqTotal) : 0,
      }))
    : pwrTrend.map(p => ({ time: p.time, value: d.reactivePower.FQTotal || p.value }));

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Device header ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${d.status === 'online' ? 'status-online' : 'status-warning'}`} />
          <div>
            {/* <h2 className="text-sm font-bold text-white">ME631 — Digital Power Meter (Modbus RTU/TCP)</h2> */}
            <h2 className="text-sm font-bold text-white">AMF Board Outgoing DPM - ME631</h2>
            {/* <p className="text-xs text-dark-300">Register groups per MODBUS LIST MANUAL ME631.pdf — p.12+</p> */}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {[
            { lbl: 'Avg Freq', val: `${fmt(d.frequency.FreqAvg, 2)} Hz`, color: '#34d399' },
            { lbl: 'Avg PF', val: fmt(d.powerFactor.PFAvg), color: d.powerFactor.PFAvg > 0.9 ? '#34d399' : '#fbbf24' },
            { lbl: 'Total P', val: `${fmt(d.activePower.PTotal, 2)} kW`, color: '#818cf8' },
            { lbl: 'Avg I THD', val: `${fmt(d.currentHarmonics.ITHDAvg, 2)} %`, color: d.currentHarmonics.ITHDAvg > 8 ? '#fb7185' : '#fbbf24' },
          ].map(({ lbl, val, color }) => (
            <div key={lbl} className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(26,35,64,0.7)', border: '1px solid rgba(99,102,241,0.1)' }}>
              <span className="text-dark-100">{lbl}: </span>
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
                <p className="text-sm font-semibold tracking-wide text-dark-300 mb-2">{k}</p>
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
            <PR label="FreqAvg" value={d.frequency.FreqAvg} unit="Hz" color="#34d399" />
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
          <Kpi label="I1 (Phase 1)" value={d.current.I1} unit="A" color="#fbbf24" large labelLarge />
          <Kpi label="I2 (Phase 2)" value={d.current.I2} unit="A" color="#f59e0b" large labelLarge />
          <Kpi label="I3 (Phase 3)" value={d.current.I3} unit="A" color="#d97706" large labelLarge />
          <Kpi label="IAvg" value={d.current.IAvg} unit="A" color="#fbbf24" large labelLarge />
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
          <Kpi label="U1 (Phase A–N)" value={d.voltage.U1} unit="V" color="#818cf8" large />
          <Kpi label="U2 (Phase B–N)" value={d.voltage.U2} unit="V" color="#6366f1" large />
          <Kpi label="U3 (Phase C–N)" value={d.voltage.U3} unit="V" color="#4f46e5" large />
          <Kpi label="UAvg" value={d.voltage.UAvg} unit="V" color="#818cf8" large />
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
          <Kpi label="P1 (Phase 1)" value={d.activePower.P1} unit="kW" color="#34d399" large />
          <Kpi label="P2 (Phase 2)" value={d.activePower.P2} unit="kW" color="#10b981" large />
          <Kpi label="P3 (Phase 3)" value={d.activePower.P3} unit="kW" color="#059669" large />
          <Kpi label="P Total" value={d.activePower.PTotal} unit="kW" color="#34d399" large />
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 6 — Reactive & Apparent Power
      ════════════════════════════════════════════ */}
      <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(15,23,42,0.34)', border: '1px solid rgba(167,139,250,0.18)' }}>
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
      <div className='space-y-5'>
        <Sec title="Group 7 — Power Quality / Harmonics" subtitle="Current THD (I1/I2/I3 — x/y/z) and Voltage THD (U1/U2/U3 — x/y/z)" color="#f43f5e" icon={TbWaveSine} />

        {/* Summary THD cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {[
            { lbl: 'ITHD Avg', val: d.currentHarmonics.ITHDAvg, warn: 8, alarm: 12 },
            { lbl: 'UTHD Avg', val: d.voltageHarmonics.UTHDAvg, warn: 5, alarm: 8 },
            { lbl: 'I THDx Avg', val: d.currentHarmonics.ITHDxAvg, warn: 7, alarm: 10 },
            { lbl: 'U THDx Avg', val: d.voltageHarmonics.UTHDxAvg, warn: 4, alarm: 7 },
            { lbl: 'I1THx', val: d.currentHarmonics.I1THDx, warn: 7, alarm: 10 },
            { lbl: 'U1THx', val: d.voltageHarmonics.U1THDx, warn: 4, alarm: 7 },
          ].map(({ lbl, val, warn, alarm }) => {
            const color = val > alarm ? '#fb7185' : val > warn ? '#fbbf24' : '#34d399';
            return (
              <div key={lbl} className="glass-card p-4 text-center">
                <p className="section-label mb-2">{lbl}</p>
                <p className="metric-value text-2xl" style={{ color }}>{fmt(val, 2)}</p>
                <p className="unit-label text-[10px] mt-1">%</p>
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
              { label: 'Odd-Order (THDx)', keys: ['I1THDx', 'I2THDx', 'I3THDx', 'ITHDxAvg'], color: '#f43f5e', warn: 7, alarm: 10 },
              { label: 'Even-Order (THDy)', keys: ['I1THDy', 'I2THDy', 'I3THDy', 'ITHDyAvg'], color: '#f59e0b', warn: 2, alarm: 4 },
              { label: 'Sub-Harmonics (THDz)', keys: ['I1THDz', 'I2THDz', 'I3THDz', 'ITHDzAvg'], color: '#8b5cf6', warn: 1, alarm: 2 },
              { label: 'Total THD (I)', keys: ['I1THD', 'I2THD', 'I3THD', 'ITHDAvg'], color: '#fb7185', warn: 8, alarm: 12 },
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
              { label: 'Odd-Order (THDx)', keys: ['U1THDx', 'U2THDx', 'U3THDx', 'UTHDxAvg'], color: '#f43f5e', warn: 4, alarm: 7 },
              { label: 'Even-Order (THDy)', keys: ['U1THDy', 'U2THDy', 'U3THDy', 'UTHDyAvg'], color: '#f59e0b', warn: 1.5, alarm: 3 },
              { label: 'Sub-Harmonics (THDz)', keys: ['U1THDz', 'U2THDz', 'U3THDz', 'UTHDzAvg'], color: '#8b5cf6', warn: 0.5, alarm: 1 },
              { label: 'Total THD (U)', keys: ['U1THD', 'U2THD', 'U3THD', 'UTHDAvg'], color: '#fb7185', warn: 5, alarm: 8 },
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
          GROUP 8 — Energy
          Active kWh, Reactive kVarh, Apparent kVAh
      ════════════════════════════════════════════ */}
      <div className='space-y-5'>
        <Sec title="Group 8 — Energy" subtitle="Active, reactive and apparent energy per phase" color="#0ea5e9" icon={HiOutlineChartBar} />

        {/* Active energy */}
        <div className="mb-4">
          <p className="section-label mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Active Energy (kWh)
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <p className="section-label mb-3 text-amber-400">▲ Export</p>
              <PR label="Phase 1" value={fmt(d.energy.activeExport.P1, 2)} unit="kWh" color="#fbbf24" />
              <PR label="Phase 2" value={fmt(d.energy.activeExport.P2, 2)} unit="kWh" color="#f59e0b" />
              <PR label="Phase 3" value={fmt(d.energy.activeExport.P3, 2)} unit="kWh" color="#d97706" />
              <div className="param-row" style={{ borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: '8px', marginTop: '4px' }}>
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="metric-value-sm" style={{ color: '#fbbf24' }}>{fmt(d.energy.activeExport.Total, 2)} <span className="unit-label text-[10px] font-normal">kWh</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Reactive energy */}
        <Expandable title="Reactive Energy (kVarh) — Export per Phase">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <p className="section-label mb-3 text-rose-400">▲ Export</p>
              {['P1', 'P2', 'P3'].map(p => <PR key={p} label={`Phase ${p.slice(1)}`} value={fmt(d.energy.reactiveExport[p], 2)} unit="kVarh" color="#fb7185" />)}
              <div className="param-row" style={{ borderTop: '1px solid rgba(244,63,94,0.15)', paddingTop: '8px', marginTop: '4px' }}>
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="metric-value-sm" style={{ color: '#f43f5e' }}>{fmt(d.energy.reactiveExport.Total, 2)} <span className="unit-label text-[10px] font-normal">kVarh</span></span>
              </div>
            </div>
          </div>
        </Expandable>

        {/* Apparent energy */}
        <Expandable title="Apparent Energy (kVAh) — Export per Phase">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <p className="section-label mb-3 text-orange-400">▲ Export</p>
              {['P1', 'P2', 'P3'].map(p => <PR key={p} label={`Phase ${p.slice(1)}`} value={fmt(d.energy.apparentExport[p], 2)} unit="kVAh" color="#fb923c" />)}
              <div className="param-row" style={{ borderTop: '1px solid rgba(234,88,12,0.15)', paddingTop: '8px', marginTop: '4px' }}>
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="metric-value-sm" style={{ color: '#ea580c' }}>{fmt(d.energy.apparentExport.Total, 2)} <span className="unit-label text-[10px] font-normal">kVAh</span></span>
              </div>
            </div>
          </div>
        </Expandable>

        <div className="mt-4">
          <EnergyBarChart data={energyData} title="Monthly Energy — Active Export (kWh)" />
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
            { title: 'Active Power Demand', presentKey: 'activePresentDemand', peakKey: 'activePeakDemand', dtKey: 'activePeakDateTime', unit: 'kW', color: '#34d399' },
            { title: 'Reactive Power Demand', presentKey: 'reactivePresentDemand', peakKey: 'reactivePeakDemand', dtKey: 'reactivePeakDateTime', unit: 'kVar', color: '#a78bfa' },
            { title: 'Apparent Power Demand', presentKey: 'apparentPresentDemand', peakKey: 'apparentPeakDemand', dtKey: 'apparentPeakDateTime', unit: 'kVA', color: '#818cf8' },
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
                <p className="text-sm font-semibold tracking-wide text-amber-400 mb-2">{ph}</p>
                <p className="metric-value text-xl mb-1" style={{ color: '#fbbf24' }}>{fmt(d.demand[presentK], 2)} A</p>
                <p className="text-[10px] text-dark-400 mb-2">Present</p>
                <p className="text-xs font-bold" style={{ color: '#fb7185' }}>{fmt(d.demand[peakK], 2)} A</p>
                <p className="text-[10px] text-dark-400">Peak: {d.demand[dtK]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Power & Demand Historical Trends with Individual Export per Chart ── */}
      <div className="space-y-4">
        {/* Export Notification / Status Toast */}
        <AnimatePresence>
          {exportMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-md ${
                exportMessage.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-500/30 text-emerald-300'
                  : exportMessage.type === 'error'
                  ? 'bg-rose-950/70 border border-rose-500/30 text-rose-300'
                  : 'bg-indigo-950/70 border border-indigo-500/30 text-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  {exportMessage.type === 'success' ? '✓' : exportMessage.type === 'error' ? '⚠' : 'ℹ'}
                </span>
                <span>{exportMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setExportMessage(null)}
                className="text-dark-400 hover:text-white text-base font-bold leading-none px-1"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3 Trend Charts with Individual Export Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className={`relative ${openExportMenu === 'pTotal' ? 'z-40' : 'z-10'}`}>
            <TrendChart
              data={activeTrendData}
              title="Active Power (PTotal) — Trend"
              unit="kW"
              color="#34d399"
              headerAction={
                <TrendExportMenu
                  metricKey="pTotal"
                  metricLabel="Active Power (PTotal)"
                  metricUnit="kW"
                  color="#34d399"
                  currentRange={trendRanges.pTotal}
                  onRangeChange={(range) => setTrendRanges((prev) => ({ ...prev, pTotal: range }))}
                  isOpen={openExportMenu === 'pTotal'}
                  onToggle={() => setOpenExportMenu((prev) => (prev === 'pTotal' ? null : 'pTotal'))}
                  onExport={(fmt) => handleExportSingle('pTotal', fmt)}
                  isExporting={exportingMetric === 'pTotal'}
                  exportingFormat={exportingFormat}
                />
              }
            />
          </div>

          <div className={`relative ${openExportMenu === 'sTotal' ? 'z-40' : 'z-10'}`}>
            <TrendChart
              data={apparentTrendData}
              title="Apparent Power (STotal) — Trend"
              unit="kVA"
              color="#818cf8"
              headerAction={
                <TrendExportMenu
                  metricKey="sTotal"
                  metricLabel="Apparent Power (STotal)"
                  metricUnit="kVA"
                  color="#818cf8"
                  currentRange={trendRanges.sTotal}
                  onRangeChange={(range) => setTrendRanges((prev) => ({ ...prev, sTotal: range }))}
                  isOpen={openExportMenu === 'sTotal'}
                  onToggle={() => setOpenExportMenu((prev) => (prev === 'sTotal' ? null : 'sTotal'))}
                  onExport={(fmt) => handleExportSingle('sTotal', fmt)}
                  isExporting={exportingMetric === 'sTotal'}
                  exportingFormat={exportingFormat}
                />
              }
            />
          </div>

          <div className={`relative ${openExportMenu === 'fqTotal' ? 'z-40' : 'z-10'}`}>
            <TrendChart
              data={reactiveTrendData}
              title="Reactive Power (FQTotal) — Trend"
              unit="kVar"
              color="#a78bfa"
              headerAction={
                <TrendExportMenu
                  metricKey="fqTotal"
                  metricLabel="Reactive Power (FQTotal)"
                  metricUnit="kVar"
                  color="#a78bfa"
                  currentRange={trendRanges.fqTotal}
                  onRangeChange={(range) => setTrendRanges((prev) => ({ ...prev, fqTotal: range }))}
                  isOpen={openExportMenu === 'fqTotal'}
                  onToggle={() => setOpenExportMenu((prev) => (prev === 'fqTotal' ? null : 'fqTotal'))}
                  onExport={(fmt) => handleExportSingle('fqTotal', fmt)}
                  isExporting={exportingMetric === 'fqTotal'}
                  exportingFormat={exportingFormat}
                />
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DPM;
