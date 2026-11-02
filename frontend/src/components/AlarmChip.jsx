import { motion } from 'framer-motion';
import { ALARM_TYPES } from '../constants/alarmConstants';

const AlarmChip = ({ name, type = 1, compact = false }) => {
  const alarm = ALARM_TYPES[type] || ALARM_TYPES[1];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${compact ? 'text-xs' : 'text-sm'}`}
      style={{
        backgroundColor: alarm.bg,
        borderColor: alarm.border,
      }}
    >
      <div
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${type === 1 ? '' : 'animate-pulse'}`}
        style={{ backgroundColor: alarm.color, boxShadow: `0 0 6px ${alarm.color}` }}
      />
      <span className="text-dark-100 truncate">{name}</span>
      <span
        className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0"
        style={{ color: alarm.color, backgroundColor: alarm.bg }}
      >
        {alarm.label}
      </span>
    </motion.div>
  );
};

export default AlarmChip;
