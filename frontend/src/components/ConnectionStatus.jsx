import { useSocketContext } from '../context/SocketContext';
import { useTranslation } from 'react-i18next';

export default function ConnectionStatus() {
  const { t } = useTranslation();
  const { isConnected, isReconnecting } = useSocketContext();

  if (isReconnecting) {
    return (
      <span className="chip chip-warning text-xs" role="status" aria-live="polite" aria-label={t('status.reconnecting')}>
        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
        {t('status.reconnecting')}
      </span>
    );
  }

  if (isConnected) {
    return (
      <span className="chip chip-success text-xs" role="status" aria-live="polite" aria-label={t('status.live')}>
        <span className="w-2 h-2 rounded-full bg-success animate-pulse-live" />
        {t('status.live')}
      </span>
    );
  }

  return (
    <span className="chip chip-danger text-xs" role="status" aria-live="assertive" aria-label={t('status.connectionLost')}>
      <span className="w-2 h-2 rounded-full bg-danger" />
      {t('status.connectionLost')}
    </span>
  );
}
