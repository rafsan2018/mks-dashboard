import { motion } from 'framer-motion';

const colorMap = {
  indigo:  { text: '#818cf8', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)',  glow: 'rgba(99,102,241,0.15)' },
  sky:     { text: '#38bdf8', bg: 'rgba(14,165,233,0.1)',  border: 'rgba(14,165,233,0.2)',  glow: 'rgba(14,165,233,0.15)' },
  cyan:    { text: '#22d3ee', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.2)',   glow: 'rgba(6,182,212,0.15)' },
  emerald: { text: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  glow: 'rgba(16,185,129,0.15)' },
  amber:   { text: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  glow: 'rgba(245,158,11,0.15)' },
  rose:    { text: '#fb7185', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.2)',   glow: 'rgba(244,63,94,0.15)' },
  violet:  { text: '#a78bfa', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.2)',  glow: 'rgba(139,92,246,0.15)' },
  blue:    { text: '#60a5fa', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)',  glow: 'rgba(59,130,246,0.15)' },
};

const StatCard = ({ title, value, unit, icon: Icon, color = 'indigo', trend, delay = 0, size = 'md' }) => {
  const c = colorMap[color] || colorMap.indigo;
  const isLarge = size === 'lg';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="glass-card p-5 flex flex-col gap-3"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="section-label">{title}</p>
        {Icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}
          >
            <Icon style={{ color: c.text, fontSize: '1.1rem' }} />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-2">
        <span
          className={isLarge ? 'metric-value text-3xl' : 'metric-value'}
          style={{ color: c.text }}
        >
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
        </span>
        {unit && (
          <span className="text-sm text-dark-300 mb-1 font-medium">{unit}</span>
        )}
      </div>

      {/* Trend badge */}
      {trend !== undefined && (
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-md"
            style={{
              color: trend >= 0 ? '#34d399' : '#fb7185',
              background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
            }}
          >
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
          <span className="text-[11px] text-dark-400">vs. last hour</span>
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
