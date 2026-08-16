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
  VALVE_OPEN: 'VALVE_OPEN',
  VALVE_CLOSE: 'VALVE_CLOSE',
};

// ============================
// Alert Types & Severity
// ============================
export const ALERT_TYPES = {
  LOW_WATER: 'low_water',
  GATEWAY_OFFLINE: 'offline',
  NODE_OFFLINE: 'node_offline',
  LOW_BATTERY: 'low_battery',
  HIGH_TEMPERATURE: 'high_temperature',
  LOW_MOISTURE: 'low_moisture',
};

export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};
