import { motion } from 'framer-motion';

const StatusChip = ({ label, active = false, color = 'indigo' }) => {
  const colorMap = {
    indigo:  { on: 'bg-indigo-500',  glow: 'shadow-indigo-500/50',  text: 'text-indigo-400'  },
    cyan:    { on: 'bg-cyan-500',    glow: 'shadow-cyan-500/50',    text: 'text-cyan-400'    },
    emerald: { on: 'bg-emerald-500', glow: 'shadow-emerald-500/50', text: 'text-emerald-400' },
    amber:   { on: 'bg-amber-500',   glow: 'shadow-amber-500/50',   text: 'text-amber-400'   },
    rose:    { on: 'bg-rose-500',    glow: 'shadow-rose-500/50',    text: 'text-rose-400'    },
    violet:  { on: 'bg-violet-500',  glow: 'shadow-violet-500/50',  text: 'text-violet-400'  },
    sky:     { on: 'bg-sky-500',     glow: 'shadow-sky-500/50',     text: 'text-sky-400'     },
  };

  const c = colorMap[color] || colorMap.indigo;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all duration-300 ${
        active
          ? `border-dark-500 shadow-sm ${c.glow}`
          : 'border-dark-600/30'
      }`}
      style={{
        background: active
          ? 'rgba(26,35,64,0.8)'
          : 'rgba(15,23,42,0.5)',
      }}
    >
      <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
        active ? `${c.on} shadow-md ${c.glow}` : 'bg-dark-500'
      }`} />
      <span className={`text-sm font-medium ${active ? c.text : 'text-dark-400'}`}>{label}</span>
    </motion.div>
  );
};

export default StatusChip;
