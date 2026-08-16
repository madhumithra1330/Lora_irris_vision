import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SensorHealth from './SensorHealth';
import { formatPercentage, formatTemperature, formatHumidity } from '../utils/formatters';

export default function NodeCard({ node, index }) {
  const { t } = useTranslation();
  if (!node) return null;

  const moisture = node.soil_moisture ?? node.soilMoisture;
  const moistureStatus = moisture < 30 ? 'critical' : moisture < 60 ? 'warning' : 'ok';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
      className="card space-y-3"
      role="region"
      aria-label={`${node.cropName || node.nodeId} sensor data`}
    >
      {/* Header: Name + Health */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">🌱</span>
          <h3 className="text-sm font-semibold text-white">{node.cropName || node.nodeId}</h3>
        </div>
        <SensorHealth node={node} />
      </div>

      {/* Sensor values in 3-column grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Soil Moisture */}
        <div className="flex flex-col gap-0.5">
          <div className={`sensor-value text-xl ${
            moistureStatus === 'ok' ? 'text-success' : moistureStatus === 'warning' ? 'text-warning' : 'text-danger'
          }`}>
            {formatPercentage(moisture)}
          </div>
          <span className="sensor-label text-[10px]">{t('analytics.chartMoisture')}</span>
        </div>

        {/* Temperature */}
        <div className="flex flex-col gap-0.5">
          <div className={`sensor-value text-xl ${
            node.temperature > 35 ? 'text-warning' : 'text-white'
          }`}>
            {formatTemperature(node.temperature)}
          </div>
          <span className="sensor-label text-[10px]">{t('node.temperature')}</span>
        </div>

        {/* Humidity */}
        <div className="flex flex-col gap-0.5">
          <div className="sensor-value text-xl text-white">
            {formatHumidity(node.humidity)}
          </div>
          <span className="sensor-label text-[10px]">{t('node.humidity')}</span>
        </div>
      </div>

      {/* Valve status bar */}
      <div className="flex items-center justify-between pt-2 border-t border-white/6">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className={`w-2 h-2 rounded-full ${node.valve_status ? 'bg-success' : 'bg-white/20'}`} />
          <span className="text-white/50">{node.valve_status ? t('node.valveOpen') : t('node.valveClosed')}</span>
        </div>
        <span className="text-[11px] text-white/30">{node.nodeId}</span>
      </div>
    </motion.div>
  );
}
