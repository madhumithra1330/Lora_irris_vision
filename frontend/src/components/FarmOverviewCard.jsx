import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function FarmOverviewCard({ dashboard }) {
  const { t } = useTranslation();
  if (!dashboard) return null;

  const { gateway, nodes } = dashboard;

  const isOnline = gateway?.status === 'online';
  
  // Calculate active nodes based on normalized node status field
  const activeNodesCount = nodes?.filter((n) => n.status === 'online').length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="card"
      role="region"
      aria-label={t('dashboard.farmOverview')}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg" aria-hidden="true">🌾</span>
        <h2 className="text-sm font-semibold text-white">{t('dashboard.farmOverview')}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 divide-x divide-white/6">
        {/* Gateway Status */}
        <div className="flex flex-col items-center justify-center py-2">
          <span className="text-2xl mb-1" aria-hidden="true">📡</span>
          <span className="text-[11px] text-white/50 mb-1">{t('dashboard.gateway')}</span>
          <span className={`chip text-xs font-semibold ${isOnline ? 'chip-success' : 'chip-danger'}`}>
            {isOnline ? t('status.online') : t('status.offline')}
          </span>
        </div>

        {/* Active Nodes */}
        <div className="flex flex-col items-center justify-center py-2 font-[Outfit]">
          <span className="text-2xl mb-1" aria-hidden="true">🌱</span>
          <span className="text-[11px] text-white/50 mb-1">{t('dashboard.nodes')}</span>
          <span className={`chip text-xs font-semibold ${
            activeNodesCount > 0 ? 'chip-success' : 'chip-danger'
          }`}>
            {t('dashboard.activeCount', { count: activeNodesCount })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
