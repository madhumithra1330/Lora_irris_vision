import { motion, AnimatePresence } from 'framer-motion';

/**
 * Reusable sensor metric card.
 * Used in GatewayOverview 2x2 grid and elsewhere.
 */
export default function SensorCard({ icon, label, value, unit, status, subtitle }) {
  const statusColors = {
    ok: 'text-success',
    warning: 'text-warning',
    critical: 'text-danger',
    neutral: 'text-white/60',
  };

  const isNumeric = value != null && !isNaN(Number(value)) && String(value).trim() !== '' && !['true', 'false'].includes(String(value).toLowerCase());
  const valueClass = isNumeric 
    ? `sensor-value ${statusColors[status] || 'text-white'}` 
    : `text-[15px] sm:text-base leading-tight font-black ${statusColors[status] || 'text-white'} break-words line-clamp-2 min-h-[32px] flex items-center`;

  return (
    <div className="card flex flex-col gap-1 min-h-[100px] overflow-hidden" role="group" aria-label={label}>
      <div className="flex items-center justify-between">
        <span className="text-base" aria-hidden="true">{icon}</span>
        {status && (
          <span className={`w-2 h-2 rounded-full ${
            status === 'ok' ? 'bg-success' : status === 'warning' ? 'bg-warning' : status === 'critical' ? 'bg-danger' : 'bg-white/30'
          }`} aria-hidden="true" />
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={String(value)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className={valueClass}
          aria-label={`${label}: ${value}${unit || ''}`}
        >
          {value ?? '--'}{unit && <span className="text-lg font-medium text-white/50">{unit}</span>}
        </motion.div>
      </AnimatePresence>
      <span className="sensor-label">{label}</span>
      {subtitle && <span className="text-[11px] text-white/40">{subtitle}</span>}
    </div>
  );
}
