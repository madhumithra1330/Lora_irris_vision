import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastOnline, setLastOnline] = useState(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setLastOnline(new Date());
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="sticky top-12 z-20 bg-amber-500/90 backdrop-blur text-white px-4 py-2 text-xs font-medium flex items-center justify-between">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>{t('errors.offlineMode')} - {t('errors.showingLastKnown')}</span>
      </div>
      <span className="opacity-80 text-[10px]">
        {lastOnline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
