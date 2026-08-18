import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart3, Droplet, Wind, ThermometerSun, Database } from 'lucide-react';
import { useGateway } from '../context/GatewayContext';
import { useDashboard } from '../hooks/useDashboard';
import { useNodeHistory } from '../hooks/useNodeHistory';
import { TIME_RANGES } from '../utils/constants';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="bg-surface-800 px-3 py-2 rounded-xl border border-white/10 shadow-xl text-xs backdrop-blur-md">
      <p className="text-gray-400 mb-1 font-medium">{timeStr}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: {typeof p.value === 'number' ? Math.round(p.value * 10) / 10 : p.value}{p.unit || ''}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { selectedGateway, hasNone, isLoading: gwLoading } = useGateway();
  const { dashboard } = useDashboard();
  const nodes = dashboard?.nodes || [];
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedRange, setSelectedRange] = useState('24h');

  const activeNode = selectedNode || nodes[0];
  const { history, insights, isLoading, isDemo } = useNodeHistory(activeNode?.nodeId, selectedRange);

  // Summary insight cards
  const summaryCards = useMemo(() => {
    if (!insights) return [];
    return [
      { label: t('analytics.avgMoisture'), value: insights.avgMoisture != null ? `${Math.round(insights.avgMoisture)}%` : '--', icon: <Droplet className="w-5 h-5" />, color: '#22c55e' },
      { label: t('analytics.avgHumidity'), value: insights.avgHumidity != null ? `${Math.round(insights.avgHumidity)}%` : '--', icon: <Wind className="w-5 h-5" />, color: '#3b82f6' },
      { label: t('analytics.avgTemp'), value: insights.maxTemperature != null ? `${Math.round(insights.maxTemperature)}°C` : '--', icon: <ThermometerSun className="w-5 h-5" />, color: '#f59e0b' },
      { label: t('analytics.waterUsage'), value: insights.minWaterLevel != null ? `${Math.round(insights.minWaterLevel)}%` : '--', icon: <Database className="w-5 h-5" />, color: '#ef4444' },
    ];
  }, [insights, t]);

  if (gwLoading) return <LoadingState count={3} />;
  if (hasNone) {
    return (
      <div className="px-4 pt-6 pb-safe">
        <EmptyState icon={BarChart3} title={t('empty.noAnalytics')} message={t('empty.noAnalyticsDesc')} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-safe space-y-4">
      {/* Page title */}
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-xl font-bold font-[Outfit] text-white tracking-wide">{t('nav.analytics')}</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {t('analytics.sensorTrends', { name: activeNode?.cropName || t('analytics.field') })}
        </p>
      </div>

      {/* Summary Insight Cards */}
      {summaryCards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          {summaryCards.map((card) => (
            <div key={card.label} className="p-3 bg-surface-800 rounded-2xl border border-white/5 flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold font-[Outfit] text-white truncate">{card.value}</div>
                <div className="text-[9px] text-gray-400 uppercase tracking-widest truncate">{card.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Node selector (if multiple) */}
      {nodes.length > 1 && (
        <div className="flex gap-2">
          {nodes.map((node) => (
            <button
              key={node.nodeId}
              onClick={() => setSelectedNode(node)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
                activeNode?.nodeId === node.nodeId
                  ? 'bg-liv-500 text-white border-liv-500 shadow-liv-500/20'
                  : 'bg-surface-800 text-gray-400 border border-white/5 hover:bg-surface-700'
              }`}
            >
              {node.cropName || node.nodeId}
            </button>
          ))}
        </div>
      )}

      {/* Time range selector */}
      <div className="flex gap-1 bg-surface-800 rounded-xl p-1 shadow-inner border border-white/5">
        {TIME_RANGES.map((range) => {
          const rangeKey = `analytics.ranges.${range.key}`;
          return (
            <button
              key={range.key}
              onClick={() => setSelectedRange(range.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedRange === range.key
                  ? 'bg-liv-500 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label={t(rangeKey)}
            >
              {t(rangeKey)}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingState count={2} />
      ) : (
        <>
          {/* Soil Moisture Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-surface-800 rounded-2xl border border-white/5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-[Outfit] tracking-wide">
              <Droplet className="w-4 h-4 text-liv-400" /> {t('analytics.soilMoisture')}
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(t) => new Date(t).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Area
                    type="monotone"
                    dataKey="soil_moisture"
                    name={t('analytics.chartMoisture')}
                    stroke="#22c55e"
                    fill="url(#moistureGradient)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: '#22c55e', stroke: '#0a0f0d', strokeWidth: 2 }}
                    unit="%"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Temperature & Humidity Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="p-4 bg-surface-800 rounded-2xl border border-white/5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-[Outfit] tracking-wide">
              <ThermometerSun className="w-4 h-4 text-amber-500" /> {t('analytics.tempHumidity')}
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(t) => new Date(t).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name={t('analytics.chartTemp')}
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: '#f59e0b', stroke: '#0a0f0d', strokeWidth: 2 }}
                    unit="°C"
                    animationDuration={1500}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    name={t('analytics.chartHumidity')}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: '#3b82f6', stroke: '#0a0f0d', strokeWidth: 2 }}
                    unit="%"
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 text-xs font-medium text-gray-400 pt-2">
              <span className="flex items-center gap-2"><span className="w-3 h-3 bg-[#f59e0b] rounded-full" /> {t('analytics.chartTemperature')}</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 bg-[#3b82f6] rounded-full" /> {t('analytics.chartHumidity')}</span>
            </div>
          </motion.div>

          {/* Water Level Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="p-4 bg-surface-800 rounded-2xl border border-white/5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-[Outfit] tracking-wide">
              <Database className="w-4 h-4 text-blue-500" /> {t('analytics.waterTankLevel')}
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(t) => new Date(t).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="rgba(255,255,255,0.2)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Area
                    type="monotone"
                    dataKey="water_level"
                    name={t('analytics.chartWaterLevel')}
                    stroke="#3b82f6"
                    fill="url(#waterGradient)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: '#3b82f6', stroke: '#0a0f0d', strokeWidth: 2 }}
                    unit="%"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
