import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function EmptyState({ icon: Icon, title, message, action, onAction }) {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-surface-800 border border-white/5 flex items-center justify-center mb-6 shadow-xl text-liv-400">
        {Icon ? <Icon className="w-10 h-10 opacity-80" /> : <div className="text-4xl">🌱</div>}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 font-[Outfit] tracking-wide">{title || t('general.noDataYet')}</h3>
      <p className="text-sm text-gray-400 mb-8 max-w-[280px] leading-relaxed">
        {message || t('general.defaultEmptyMessage')}
      </p>
      {action && onAction && (
        <button 
          className="px-6 py-3 rounded-xl font-semibold bg-surface-800 text-white border border-white/10 hover:bg-surface-700 active:scale-95 transition-all shadow-lg" 
          onClick={onAction} 
          aria-label={action}
        >
          {action}
        </button>
      )}
    </motion.div>
  );
}
