import { THRESHOLDS, ALERT_TYPES, ALERT_SEVERITY } from './constants';

/**
 * Generate alerts from current dashboard data.
 * Returns new alerts that should be added (deduplication is done by the consumer).
 *
 * @param {{ gateway, gatewayMetrics, nodes }} dashboardData
 * @returns {Array<{ id: string, type: string, message: string, severity: string, timestamp: string }>}
 */
export function generateAlerts(dashboardData) {
  if (!dashboardData) return [];

  const alerts = [];
  const now = new Date().toISOString();
  const { gateway, gatewayMetrics, nodes } = dashboardData;

  // Low water level
  if (gatewayMetrics?.waterLevel != null && gatewayMetrics.waterLevel < THRESHOLDS.WATER_LEVEL_LOW) {
    alerts.push({
      id: `${ALERT_TYPES.LOW_WATER}-${Date.now()}`,
      type: ALERT_TYPES.LOW_WATER,
      message: `Water tank critically low at ${Math.round(gatewayMetrics.waterLevel)}%`,
      key: 'alerts.lowWater',
      params: { value: Math.round(gatewayMetrics.waterLevel) },
      severity: ALERT_SEVERITY.CRITICAL,
      timestamp: now,
      icon: '💧',
    });
  }

  // Gateway offline
  if (gateway?.status === 'offline') {
    alerts.push({
      id: `${ALERT_TYPES.GATEWAY_OFFLINE}-${Date.now()}`,
      type: ALERT_TYPES.GATEWAY_OFFLINE,
      message: 'Gateway is offline — check device connection',
      key: 'alerts.gatewayOffline',
      severity: ALERT_SEVERITY.CRITICAL,
      timestamp: now,
      icon: '📡',
    });
  }

  // Gateway low battery
  if (gatewayMetrics?.battery != null && gatewayMetrics.battery < THRESHOLDS.BATTERY_LOW) {
    alerts.push({
      id: `${ALERT_TYPES.LOW_BATTERY}-gw-${Date.now()}`,
      type: ALERT_TYPES.LOW_BATTERY,
      message: `Gateway battery low at ${Math.round(gatewayMetrics.battery)}%`,
      key: 'alerts.gatewayLowBattery',
      params: { value: Math.round(gatewayMetrics.battery) },
      severity: ALERT_SEVERITY.WARNING,
      timestamp: now,
      icon: '🔋',
    });
  }

  // High temperature (any node)
  if (nodes && nodes.length > 0) {
    for (const node of nodes) {
      const temp = node.temperature ?? node.soil_temperature;
      const name = node.cropName || node.nodeId;
      if (temp != null && temp > THRESHOLDS.TEMPERATURE_HIGH) {
        alerts.push({
          id: `${ALERT_TYPES.HIGH_TEMPERATURE}-${node.nodeId}-${Date.now()}`,
          type: ALERT_TYPES.HIGH_TEMPERATURE,
          message: `High temperature (${Math.round(temp)}°C) at ${name}`,
          key: 'alerts.highTemperature',
          params: { temp: Math.round(temp), target: name },
          severity: ALERT_SEVERITY.WARNING,
          timestamp: now,
          icon: '🌡️',
        });
      }

      // Node offline (no data in threshold minutes)
      const lastUpdate = node.recorded_at || node.timestamp;
      if (lastUpdate) {
        const ageMin = (Date.now() - new Date(lastUpdate).getTime()) / 60000;
        if (ageMin > THRESHOLDS.NODE_OFFLINE_MINUTES) {
          alerts.push({
            id: `${ALERT_TYPES.NODE_OFFLINE}-${node.nodeId}-${Date.now()}`,
            type: ALERT_TYPES.NODE_OFFLINE,
            message: `${name} sensor offline`,
            key: 'alerts.nodeOffline',
            params: { target: name },
            severity: ALERT_SEVERITY.CRITICAL,
            timestamp: now,
            icon: '🌱',
          });
        }
      }

      // Node low battery
      if (node.battery != null && node.battery < THRESHOLDS.BATTERY_LOW) {
        alerts.push({
          id: `${ALERT_TYPES.LOW_BATTERY}-${node.nodeId}-${Date.now()}`,
          type: ALERT_TYPES.LOW_BATTERY,
          message: `${name} battery low at ${Math.round(node.battery)}%`,
          key: 'alerts.nodeLowBattery',
          params: { target: name, value: Math.round(node.battery) },
          severity: ALERT_SEVERITY.WARNING,
          timestamp: now,
          icon: '🔋',
        });
      }

      // Low moisture
      const moisture = node.soil_moisture ?? node.soilMoisture;
      if (moisture != null && moisture < THRESHOLDS.MOISTURE_CRITICAL) {
        alerts.push({
          id: `${ALERT_TYPES.LOW_MOISTURE}-${node.nodeId}-${Date.now()}`,
          type: ALERT_TYPES.LOW_MOISTURE,
          message: `Low soil moisture (${Math.round(moisture)}%) at ${name}`,
          key: 'alerts.lowMoisture',
          params: { moisture: Math.round(moisture), target: name },
          severity: ALERT_SEVERITY.WARNING,
          timestamp: now,
          icon: '🏜️',
        });
      }
    }
  }

  return alerts;
}

/**
 * Deduplicate alerts — only keep the latest of each type per source.
 */
export function deduplicateAlerts(existingAlerts, newAlerts, windowMs = 60000) {
  const now = Date.now();
  const result = [...existingAlerts];

  for (const alert of newAlerts) {
    const isDuplicate = result.some(
      (a) =>
        a.type === alert.type &&
        a.message === alert.message &&
        now - new Date(a.timestamp).getTime() < windowMs
    );
    if (!isDuplicate) {
      result.unshift(alert);
    }
  }

  // Keep max 50 alerts
  return result.slice(0, 50);
}
