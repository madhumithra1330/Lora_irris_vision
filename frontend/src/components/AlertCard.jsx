import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '../utils/formatters';

export default function AlertCard({ alert, onMarkRead }) {
  const { t } = useTranslation();
  const severityStyles = {
    critical: 'border-l-danger bg-danger/5',
    warning: 'border-l-warning bg-warning/5',
    info: 'border-l-info bg-info/5',
  };

  const message = alert.key ? t(alert.key, alert.params) : alert.message;
  const timeAgo = formatRelativeTime(alert.timestamp, t);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${
        severityStyles[alert.severity] || severityStyles.info
      } ${alert.read ? 'opacity-50' : ''} transition-all duration-300`}
      role="alert"
    >
      <span className="text-lg shrink-0" aria-hidden="true">{alert.icon || '⚠️'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{message}</p>
        <p className="text-[11px] text-white/40 mt-0.5">{timeAgo}</p>
      </div>
      {!alert.read && onMarkRead && (
        <button
          onClick={() => onMarkRead(alert.id)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label={t('general.markAsRead')}
        >
          <span className="text-xs text-white/40">✕</span>
        </button>
      )}
    </div>
  );
}
