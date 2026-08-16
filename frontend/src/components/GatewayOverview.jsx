import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SensorCard from './SensorCard';
import { formatPercentage, formatRelativeTime } from '../utils/formatters';

export default function GatewayOverview({ gatewayMetrics, gateway }) {
  const { t } = useTranslation();
  if (!gatewayMetrics) return null;

  const waterLevel = gatewayMetrics.waterLevel;
  const waterStatus = waterLevel > 50 ? 'ok' : waterLevel > 20 ? 'warning' : 'critical';
  const batteryStatus = gatewayMetrics.battery > 50 ? 'ok' : gatewayMetrics.battery > 20 ? 'warning' : 'critical';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      role="region"
      aria-label={t('dashboard.gatewayMetrics')}
    >
      <h2 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
        <span aria-hidden="true">📊</span> {t('dashboard.gatewayMetrics')}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <SensorCard
          icon="💧"
          label={t('gateway.waterTank')}
          value={Math.round(waterLevel ?? 0)}
          unit="%"
          status={waterStatus}
        />
        <SensorCard
          icon="⚡"
          label={t('gateway.pump')}
          value={gatewayMetrics.pumpStatus ? t('status.running') : t('status.stopped')}
          status={gatewayMetrics.pumpStatus ? 'ok' : 'neutral'}
        />
        <SensorCard
          icon="🔋"
          label={t('gateway.battery')}
          value={Math.round(gatewayMetrics.battery ?? 0)}
          unit="%"
          status={batteryStatus}
        />
        <SensorCard
          icon="⏱️"
          label={t('gateway.lastSeen')}
          value={formatRelativeTime(gateway?.lastSeen, t)}
          status={gateway?.status === 'online' ? 'ok' : 'critical'}
        />
      </div>
    </motion.div>
  );
}
