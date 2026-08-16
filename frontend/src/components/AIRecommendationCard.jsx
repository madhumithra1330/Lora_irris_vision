import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Info, CheckCircle2 } from 'lucide-react';
import { ruleBasedProvider } from '../utils/recommendation/RuleBasedProvider';
import { formatTime } from '../utils/formatters';

export default function AIRecommendationCard({ dashboard }) {
  const { t } = useTranslation();
  
  const recommendation = useMemo(() => {
    return ruleBasedProvider.analyze(dashboard);
  }, [dashboard]);

  if (!recommendation) return null;

  const priorityConfig = {
    high: { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/20', label: t('recommendation.urgent', 'Urgent'), icon: <Info className="w-5 h-5 text-red-500" /> },
    normal: { color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: t('recommendation.advisory', 'Advisory'), icon: <Lightbulb className="w-5 h-5 text-amber-500" /> },
    low: { color: '#22c55e', bg: 'bg-liv-500/10', border: 'border-liv-500/20', label: t('recommendation.optimal', 'Optimal'), icon: <CheckCircle2 className="w-5 h-5 text-liv-500" /> },
  };

  const config = priorityConfig[recommendation.priority] || priorityConfig.normal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className={`p-5 rounded-2xl border ${config.border} ${config.bg} shadow-lg backdrop-blur-sm`}
      role="region"
      aria-label={t('recommendation.title')}
    >
      <div className="flex items-center gap-2 mb-4">
        {config.icon}
        <h2 className="text-sm font-bold text-white font-[Outfit] tracking-wide">{t('recommendation.title')}</h2>
      </div>

      <div className="space-y-4">
        <div>
          <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider block mb-1">{t('recommendation.title')}</span>
          <div className="text-base font-medium text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: config.color }} />
            {t(recommendation.recommendationKey, recommendation.recommendationParams || {}) || recommendation.recommendation}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider block mb-1">{t('recommendation.reason')}</span>
          <p className="text-sm text-gray-300 leading-snug">{t(recommendation.reasonKey, recommendation.reasonParams || {}) || recommendation.reason}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10 font-[Outfit]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">{t('recommendation.confidence')}:</span>
          <span className="text-sm font-bold bg-surface-900/50 px-2 py-0.5 rounded-full" style={{ color: config.color }}>
            {recommendation.confidence}%
          </span>
        </div>
        <span className="text-[10px] text-gray-500 font-medium">{formatTime(recommendation.timestamp)}</span>
      </div>
    </motion.div>
  );
}
