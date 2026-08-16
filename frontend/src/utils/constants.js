// ============================
// Alert & Sensor Thresholds
// ============================

export const THRESHOLDS = {
  MOISTURE_CRITICAL: 30,
  MOISTURE_OPTIMAL: 70,
  TEMPERATURE_HIGH: 35,
  WATER_LEVEL_LOW: 20,
  WATER_LEVEL_MID: 50,
  BATTERY_LOW: 20,
  BATTERY_MID: 50,
  NODE_OFFLINE_MINUTES: 5,
};

// ============================
// Health Score Weights
// ============================

export const HEALTH_WEIGHTS = {
  GATEWAY_STATUS: 0.30,
  BATTERY: 0.25,
  LAST_SEEN: 0.25,
  NODE_RATIO: 0.20,
};

// ============================
// Health Levels
// ============================

export const HEALTH_LEVELS = [
  { min: 90, label: 'Excellent', color: '#22c55e', emoji: '🟢' },
  { min: 70, label: 'Good', color: '#84cc16', emoji: '🟡' },
  { min: 40, label: 'Warning', color: '#f59e0b', emoji: '🟠' },
  { min: 0, label: 'Critical', color: '#ef4444', emoji: '🔴' },
];

// ============================
// Command Types
// ============================

export const COMMANDS = {
  PUMP_ON: 'PUMP_ON',
  PUMP_OFF: 'PUMP_OFF',
  VALVE_ON: 'VALVE_ON',
  VALVE_OFF: 'VALVE_OFF',
};

// ============================
// Alert Types
// ============================

export const ALERT_TYPES = {
  LOW_WATER: 'LOW_WATER',
  GATEWAY_OFFLINE: 'GATEWAY_OFFLINE',
  NODE_OFFLINE: 'NODE_OFFLINE',
  PUMP_FAULT: 'PUMP_FAULT',
  LOW_BATTERY: 'LOW_BATTERY',
  HIGH_TEMPERATURE: 'HIGH_TEMPERATURE',
  LOW_MOISTURE: 'LOW_MOISTURE',
};

export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};

// ============================
// Timeline Event Types
// ============================

export const TIMELINE_EVENTS = {
  COMMAND: 'command',
  NODE_UPDATE: 'node_update',
  GATEWAY_STATUS: 'gateway_status',
  ALERT: 'alert',
};

// ============================
// Time Ranges for Analytics
// ============================

export const TIME_RANGES = [
  { key: '24h', label: '24 Hours', hours: 24 },
  { key: '7d', label: '7 Days', hours: 168 },
  { key: '30d', label: '30 Days', hours: 720 },
];

// ============================
// App Info
// ============================

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'LIV Smart Irrigation';

// ============================
// Storage Keys
// ============================

export const STORAGE_KEYS = {
  SESSION: 'session',
  DASHBOARD: 'dashboard',
  GATEWAYS: 'gateways',
  SELECTED_GATEWAY: 'selectedGateway',
  LAST_SYNC: 'lastSync',
  ONBOARDING_COMPLETE: 'onboardingComplete',
  INSTALL_DISMISSED: 'installDismissed',
};
