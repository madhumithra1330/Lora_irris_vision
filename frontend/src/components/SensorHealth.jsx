import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '../utils/formatters';
import { calculateSensorHealth } from '../utils/healthCalculator';

export default function SensorHealth({ node }) {
  const { t } = useTranslation();
  const health = calculateSensorHealth(node);
  const statusKey = `status.${health.status.toLowerCase()}`;

  return (
    <div className="flex items-center gap-2 text-[11px]" role="status" aria-label={`${t('node.sensorBattery')}: ${health.status}`}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: health.statusColor }} aria-hidden="true" />
      <span style={{ color: health.statusColor }} className="font-semibold">{t(statusKey)}</span>
      <span className="text-white/30">·</span>
      <span className="text-white/50">{formatRelativeTime(node.recorded_at || node.timestamp, t)}</span>
      <span className="text-white/30">·</span>
      <span className="text-white/50">🔋{health.battery}%</span>
    </div>
  );
}
