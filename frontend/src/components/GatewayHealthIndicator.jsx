import { HEALTH_LEVELS } from '../utils/constants';
import { useTranslation } from 'react-i18next';

export default function GatewayHealthIndicator({ health }) {
  const { t } = useTranslation();
  if (!health) return null;

  const labelKey = `status.${health.label.toLowerCase()}`;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ backgroundColor: `${health.color}20`, color: health.color }}
      role="status"
      aria-label={`${t('profile.gateway')} ${t('profile.connectionStatus')}: ${health.score}% ${t(labelKey)}`}
    >
      <span aria-hidden="true">{health.emoji}</span>
      <span>{health.score}%</span>
    </div>
  );
}
