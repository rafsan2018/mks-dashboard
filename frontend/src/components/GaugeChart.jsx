import { motion } from 'framer-motion';
import { useMemo } from 'react';

const GaugeChart = ({ value, min = 0, max = 100, unit = '', label = '', color = '#06b6d4', size = 140, centerZero = false, alarmZones = null }) => {
  const { angle, displayValue, percentage } = useMemo(() => {
    let pct, ang, dispVal;
    if (centerZero) {
      // Center-zero gauge: -1 to 1 → 0 to 180 degrees
      pct = ((value - min) / (max - min)) * 100;
      ang = ((value - min) / (max - min)) * 180 - 90;
      dispVal = value;
    } else {
      pct = ((value - min) / (max - min)) * 100;
      ang = (pct / 100) * 180 - 90;
      dispVal = value;
    }
    return { angle: ang, displayValue: dispVal, percentage: pct };
  }, [value, min, max, centerZero]);

  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2 + 8;

  const arcPath = (startAngle, endAngle, r) => {
    const start = {
      x: cx + r * Math.cos((Math.PI * startAngle) / 180),
      y: cy + r * Math.sin((Math.PI * startAngle) / 180),
    };
    const end = {
      x: cx + r * Math.cos((Math.PI * endAngle) / 180),
      y: cy + r * Math.sin((Math.PI * endAngle) / 180),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const needleEnd = {
    x: cx + (radius - 10) * Math.cos((Math.PI * angle) / 180),
    y: cy + (radius - 10) * Math.sin((Math.PI * angle) / 180),
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center"
    >
      <div className="w-full flex justify-center max-w-full overflow-hidden">
        <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`} className="max-w-full h-auto">
        {/* Background arc */}
        <path
          d={arcPath(-180, 0, radius)}
          fill="none"
          stroke="#1a2332"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Alarm zones or colored arc */}
        {alarmZones ? (
          alarmZones.map((zone, i) => {
            const startDeg = -180 + ((zone.start - min) / (max - min)) * 180;
            const endDeg = -180 + ((zone.end - min) / (max - min)) * 180;
            return (
              <path
                key={i}
                d={arcPath(startDeg, endDeg, radius)}
                fill="none"
                stroke={zone.color}
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.4"
              />
            );
          })
        ) : (
          <path
            d={arcPath(-180, -180 + (percentage / 100) * 180, radius)}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            filter={`drop-shadow(0 0 6px ${color})`}
          />
        )}

        {/* Center zero marker */}
        {centerZero && (
          <line
            x1={cx}
            y1={cy - radius + 4}
            x2={cx}
            y2={cy - radius - 4}
            stroke="#6b7a8d"
            strokeWidth="2"
          />
        )}

        {/* Needle */}
        <motion.line
          x1={cx}
          y1={cy}
          initial={{ x2: cx - radius + 10, y2: cy }}
          animate={{ x2: needleEnd.x, y2: needleEnd.y }}
          transition={{ duration: 1, ease: 'easeOut' }}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter={`drop-shadow(0 0 4px ${color})`}
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="5" fill={color} filter={`drop-shadow(0 0 4px ${color})`} />

        {/* Min label */}
        <text x={cx - radius + 2} y={cy + 18} fill="#6b7a8d" fontSize="10" textAnchor="middle">
          {centerZero ? min : min}
        </text>
        {/* Max label */}
        <text x={cx + radius - 2} y={cy + 18} fill="#6b7a8d" fontSize="10" textAnchor="middle">
          {max}
        </text>
        {/* Center label for center-zero */}
        {centerZero && (
          <text x={cx} y={cy + 18} fill="#6b7a8d" fontSize="10" textAnchor="middle">
            0
          </text>
        )}
      </svg>
      </div>
      <div className="text-center -mt-1">
        <span className="text-xl font-bold" style={{ color }}>{typeof displayValue === 'number' ? displayValue.toFixed(2) : displayValue}</span>
        {unit && <span className="text-xs text-dark-300 ml-1">{unit}</span>}
      </div>
      {label && <span className="text-xs text-dark-300 mt-1">{label}</span>}
    </motion.div>
  );
};

export default GaugeChart;
