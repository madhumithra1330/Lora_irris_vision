// ============================
// Date & Time Formatters
// ============================

/**
 * Format ISO date to relative time string ("12 sec ago", "2 min ago", etc.)
 */
export function formatRelativeTime(isoDate, t) {
  if (!isoDate) return t ? t('status.offline') : 'Offline';
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return t ? t('general.justNow') : 'Now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 15) return t ? t('general.justNow') : 'Now';
  if (seconds < 60) return t ? t('general.secAgo', { count: seconds }) : `${seconds} sec ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t ? t('general.minAgo', { count: minutes }) : `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t ? t('general.hourAgo', { count: hours }) : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return t ? t('general.dayAgo', { count: days }) : `${days}d ago`;
}

/**
 * Format ISO date to full readable date ("Sunday, 15 June 2026")
 */
export function formatDate(isoDate, locale = 'en-IN') {
  const date = isoDate ? new Date(isoDate) : new Date();
  const localeMap = {
    en: 'en-IN',
    ta: 'ta-IN',
    hi: 'hi-IN'
  };
  const targetLocale = localeMap[locale] || locale || 'en-IN';
  return date.toLocaleDateString(targetLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format ISO date to time string ("10:15 AM")
 */
export function formatTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format ISO date to full timestamp ("10:15:32 AM")
 */
export function formatTimestamp(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

// ============================
// Greeting
// ============================

/**
 * Time-aware greeting ("Good Morning, Suresh")
 */
export function formatGreeting(name, t) {
  const hour = new Date().getHours();
  let greetingKey;
  let greetingEng;
  if (hour < 12) {
    greetingKey = 'general.goodMorning';
    greetingEng = 'Good Morning';
  } else if (hour < 17) {
    greetingKey = 'general.goodAfternoon';
    greetingEng = 'Good Afternoon';
  } else {
    greetingKey = 'general.goodEvening';
    greetingEng = 'Good Evening';
  }

  if (t) {
    const greetingText = t(greetingKey);
    return name ? `${greetingText}, ${name}` : greetingText;
  }
  return name ? `${greetingEng}, ${name}` : greetingEng;
}

// ============================
// Value Formatters
// ============================

/**
 * Format percentage value
 */
export function formatPercentage(value) {
  if (value == null || isNaN(value)) return '--';
  return `${Math.round(value)}%`;
}

/**
 * Format temperature value
 */
export function formatTemperature(value) {
  if (value == null || isNaN(value)) return '--';
  return `${Math.round(value * 10) / 10}°C`;
}

/**
 * Format humidity value
 */
export function formatHumidity(value) {
  if (value == null || isNaN(value)) return '--';
  return `${Math.round(value)}%`;
}

/**
 * Human-friendly command name
 */
export function formatCommand(command, t) {
  if (t) {
    const map = {
      PUMP_ON: t('activity.pumpStarted'),
      PUMP_OFF: t('activity.pumpStopped'),
      VALVE_ON: t('activity.valveOpened'),
      VALVE_OFF: t('activity.valveClosed'),
    };
    return map[command] || command;
  }
  const map = {
    PUMP_ON: 'Pump ON',
    PUMP_OFF: 'Pump OFF',
    VALVE_ON: 'Valve ON',
    VALVE_OFF: 'Valve OFF',
  };
  return map[command] || command;
}

/**
 * Format pump status
 */
export function formatPumpStatus(status, t) {
  if (status === true || status === 'on') return t ? t('status.running') : 'ON';
  if (status === false || status === 'off') return t ? t('status.stopped') : 'OFF';
  return t ? t('status.lost') : 'Unknown';
}

/**
 * Format duration in minutes to human-readable
 */
export function formatDuration(minutes) {
  if (!minutes || minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
