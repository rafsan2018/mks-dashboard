import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell,
} from 'recharts';

/* ── Shared tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,14,26,0.97)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '10px 14px' }}>
      <p style={{ color: '#6b7e99', fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : entry.value}
        </p>
      ))}
    </div>
  );
};

const axisProps = { fill: '#6b7a8d', fontSize: 11 };
const gridProps = { strokeDasharray: '3 3', stroke: '#1a2332' };
const axisLine  = { stroke: '#243044' };

/* ── Area / Trend chart ── */
export const TrendChart = ({ data, dataKey = 'value', color = '#6366f1', title = '', unit = '', height = 220 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-card p-5">
    {title && (
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-dark-100">{title}</h3>
        {unit && <span className="text-xs text-dark-300 px-2 py-1 rounded-lg" style={{ background: 'rgba(26,35,64,0.7)' }}>{unit}</span>}
      </div>
    )}
    <ResponsiveContainer width="100%" minWidth={0} height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
        <defs>
          <linearGradient id={`tg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="time"  tick={axisProps} axisLine={axisLine} tickLine={false} />
        <YAxis                 tick={axisProps} axisLine={axisLine} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
          fill={`url(#tg-${color.replace('#', '')})`}
          dot={false} activeDot={{ r: 4, fill: color, stroke: '#111827', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  </motion.div>
);

/* ── Multi-line chart ── */
export const MultiLineChart = ({ data, lines, title = '', height = 260 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-card p-5">
    {title && <h3 className="text-sm font-semibold text-dark-100 mb-4">{title}</h3>}
    <ResponsiveContainer width="100%" minWidth={0} height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="time" tick={axisProps} axisLine={axisLine} tickLine={false} />
        <YAxis                tick={axisProps} axisLine={axisLine} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
        {lines.map((line, i) => (
          <Line key={i} type="monotone" dataKey={line.key} name={line.name} stroke={line.color}
            strokeWidth={2} dot={false} activeDot={{ r: 4, fill: line.color, stroke: '#111827', strokeWidth: 2 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </motion.div>
);

/* ── Energy import/export bar chart ── */
export const EnergyBarChart = ({ data, title = '', height = 260 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-card p-5">
    {title && <h3 className="text-sm font-semibold text-dark-100 mb-4">{title}</h3>}
    <ResponsiveContainer width="100%" minWidth={0} height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="month" tick={axisProps} axisLine={axisLine} tickLine={false} />
        <YAxis                 tick={axisProps} axisLine={axisLine} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
        <Bar dataKey="import"  name="Import"  fill="#34d399" radius={[4, 4, 0, 0]} barSize={12} />
        <Bar dataKey="export"  name="Export"  fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
);

/* ── Three-phase bar ── */
export const ThreePhaseBarChart = ({ data, title = '', unit = '', height = 200 }) => {
  const chartData = [
    { phase: 'L1', value: data.phaseA ?? data.L1 ?? 0 },
    { phase: 'L2', value: data.phaseB ?? data.L2 ?? 0 },
    { phase: 'L3', value: data.phaseC ?? data.L3 ?? 0 },
  ];
  const colors = ['#6366f1', '#0ea5e9', '#34d399'];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-card p-5">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-dark-100">{title}</h3>
          {unit && <span className="text-xs text-dark-300 px-2 py-1 rounded-lg" style={{ background: 'rgba(26,35,64,0.7)' }}>{unit}</span>}
        </div>
      )}
      <ResponsiveContainer width="100%" minWidth={0} height={height}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="phase" tick={axisProps} axisLine={axisLine} tickLine={false} />
          <YAxis                 tick={axisProps} axisLine={axisLine} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" name={title} radius={[6, 6, 0, 0]} barSize={36}>
            {chartData.map((entry, i) => <Cell key={i} fill={colors[i]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

/* ── Harmonic bar chart (THD per harmonic order) ── */
export const HarmonicBarChart = ({ data, title = '', height = 220 }) => {
  // data = [{ order: '3rd', L1: 2.1, L2: 1.9, L3: 2.0 }, ...]
  const colors = { L1: '#6366f1', L2: '#0ea5e9', L3: '#34d399' };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-card p-5">
      {title && <h3 className="text-sm font-semibold text-dark-100 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" minWidth={0} height={height}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="order" tick={axisProps} axisLine={axisLine} tickLine={false} />
          <YAxis                 tick={axisProps} axisLine={axisLine} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }} />
          {['L1', 'L2', 'L3'].map(ph => (
            <Bar key={ph} dataKey={ph} name={ph} fill={colors[ph]} radius={[3, 3, 0, 0]} barSize={10} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
