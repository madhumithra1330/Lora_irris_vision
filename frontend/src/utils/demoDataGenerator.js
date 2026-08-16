/**
 * Generates realistic sensor data for demo mode and analytics fallback.
 */

/**
 * Generate a noisy sinusoidal value.
 */
function sinNoise(t, min, max, periodHours, noise = 0.05) {
  const mid = (min + max) / 2;
  const amp = (max - min) / 2;
  const val = mid + amp * Math.sin((2 * Math.PI * t) / (periodHours * 3600000));
  const jitter = (Math.random() - 0.5) * 2 * noise * amp;
  return Math.max(min, Math.min(max, val + jitter));
}

/**
 * Generate a soil moisture value that slowly drifts down (evaporation).
 */
export function generateMoisture(t) {
  return sinNoise(t, 30, 75, 12, 0.08);
}

/**
 * Generate a temperature value following time-of-day curve.
 */
export function generateTemperature(t) {
  const hour = new Date(t).getHours();
  // Peak around 14:00, low around 04:00
  const base = 25 + 10 * Math.sin(((hour - 4) / 24) * 2 * Math.PI);
  const noise = (Math.random() - 0.5) * 3;
  return Math.max(18, Math.min(42, base + noise));
}

/**
 * Generate humidity inversely correlated with temperature.
 */
export function generateHumidity(t) {
  const temp = generateTemperature(t);
  // Higher temp → lower humidity
  const base = 90 - temp * 1.2;
  const noise = (Math.random() - 0.5) * 8;
  return Math.max(30, Math.min(95, base + noise));
}

/**
 * Generate water level with drain/fill simulation.
 */
export function generateWaterLevel(t, pumpOn = false) {
  const base = sinNoise(t, 40, 90, 24, 0.05);
  // If pump is on, water level trends slightly lower
  return pumpOn ? Math.max(15, base - 15) : base;
}

/**
 * Generate battery level (slow discharge 70-95%).
 */
export function generateBattery(t) {
  return sinNoise(t, 70, 95, 48, 0.02);
}

/**
 * Generate a complete time-series array for Recharts.
 *
 * @param {string} nodeId
 * @param {'24h'|'7d'|'30d'} range
 * @param {number} [pointCount] - Number of data points
 * @returns {Array<{ timestamp, soil_moisture, temperature, humidity }>}
 */
export function generateTimeSeries(nodeId, range, pointCount) {
  const now = Date.now();
  const rangeMs = {
    '24h': 24 * 3600000,
    '7d': 7 * 24 * 3600000,
    '30d': 30 * 24 * 3600000,
  }[range] || 24 * 3600000;

  const count = pointCount || (range === '24h' ? 48 : range === '7d' ? 84 : 120);
  const interval = rangeMs / count;

  // Seed offset based on nodeId for variety
  const seed = nodeId ? nodeId.charCodeAt(nodeId.length - 1) * 1000 : 0;

  const data = [];
  for (let i = 0; i < count; i++) {
    const t = now - rangeMs + i * interval + seed;
    data.push({
      timestamp: new Date(t).toISOString(),
      recorded_at: new Date(t).toISOString(),
      soil_moisture: Math.round(generateMoisture(t) * 10) / 10,
      temperature: Math.round(generateTemperature(t) * 10) / 10,
      humidity: Math.round(generateHumidity(t) * 10) / 10,
      water_level: Math.round(generateWaterLevel(t) * 10) / 10,
    });
  }
  return data;
}

/**
 * Generate a complete dashboard data object for demo mode.
 */
export function generateDashboardData(pumpStatus = false) {
  const now = new Date().toISOString();
  return {
    gateway: {
      gatewayId: 'LIVGW001',
      gatewayName: 'LIV Demo Farm',
      status: 'online',
      lastSeen: now,
    },
    gatewayMetrics: {
      pumpStatus: pumpStatus,
      waterLevel: Math.round(generateWaterLevel(Date.now(), pumpStatus) * 10) / 10,
      battery: Math.round(generateBattery(Date.now()) * 10) / 10,
      gatewayStatus: 'online',
      recordedAt: now,
    },
    nodes: [
      {
        nodeId: 'LIV001',
        cropName: 'Tomato Field',
        soil_moisture: Math.round(generateMoisture(Date.now()) * 10) / 10,
        temperature: Math.round(generateTemperature(Date.now()) * 10) / 10,
        humidity: Math.round(generateHumidity(Date.now()) * 10) / 10,
        valve_status: false,
        battery: Math.round(generateBattery(Date.now() + 5000) * 10) / 10,
        recorded_at: now,
      },
      {
        nodeId: 'LIV002',
        cropName: 'Rice Paddy',
        soil_moisture: Math.round(generateMoisture(Date.now() + 20000) * 10) / 10,
        temperature: Math.round(generateTemperature(Date.now() + 20000) * 10) / 10,
        humidity: Math.round(generateHumidity(Date.now() + 20000) * 10) / 10,
        valve_status: true,
        battery: Math.round(generateBattery(Date.now() + 30000) * 10) / 10,
        recorded_at: now,
      },
    ],
    nodeCount: 2,
  };
}
