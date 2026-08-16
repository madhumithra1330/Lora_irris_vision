import { useTranslation } from 'react-i18next';

export default function LoadingState({ count = 4, type = 'card' }) {
  const { t } = useTranslation();

  if (type === 'list') {
    return (
      <div className="space-y-4 p-4" role="status" aria-label={t('general.loadingContent')}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 bg-surface-800 rounded-xl border border-white/5 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-surface-700/50" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/4 rounded-lg bg-surface-700/50" />
              <div className="h-3 w-1/2 rounded-lg bg-surface-700/50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" role="status" aria-label={t('general.loadingContent')}>
      <div className="space-y-2 mb-6">
        <div className="h-8 w-48 rounded-lg bg-surface-800 animate-pulse border border-white/5" />
        <div className="h-4 w-32 rounded-lg bg-surface-800 animate-pulse border border-white/5" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-5 bg-surface-800 rounded-2xl border border-white/5 animate-pulse space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-5 w-24 rounded-lg bg-surface-700/50" />
              <div className="h-8 w-8 rounded-full bg-surface-700/50" />
            </div>
            <div className="space-y-3">
              <div className="h-12 w-32 rounded-lg bg-surface-700/50" />
              <div className="h-3 w-40 rounded-lg bg-surface-700/50" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">{t('general.loading')}</span>
    </div>
  );
}
