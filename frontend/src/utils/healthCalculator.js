import { THRESHOLDS, HEALTH_WEIGHTS, HEALTH_LEVELS } from './constants';

/**
 * Calculate gateway health score (0-100) from multiple factors.
 *
 * @param {{ status: string, lastSeen: string }} gateway
 * @param {{ battery: number }} gatewayMetrics
 * @param {Array} nodes - Array of node readings
 * @returns {{ score: number, label: string, color: string, emoji: string }}
 */
export function calculateGatewayHealth(gateway, gatewayMetrics, nodes) {
  let score = 0;

  // 1. Gateway Status (30%)
  const statusScore = gateway?.status === 'online' ? 100 : 0;
  score += statusScore * HEALTH_WEIGHTS.GATEWAY_STATUS;

  // 2. Battery Level (25%)
  const battery = gatewayMetrics?.battery ?? 0;
  score += Math.min(battery, 100) * HEALTH_WEIGHTS.BATTERY;

  // 3. Last Seen Recency (25%)
  const lastSeenScore = calculateRecencyScore(gateway?.lastSeen);
  score += lastSeenScore * HEALTH_WEIGHTS.LAST_SEEN;

  // 4. Active Node Ratio (20%)
  const nodeRatio = calculateNodeRatio(nodes);
  score += nodeRatio * HEALTH_WEIGHTS.NODE_RATIO;

  score = Math.round(Math.max(0, Math.min(100, score)));

  const level = HEALTH_LEVELS.find((l) => score >= l.min) || HEALTH_LEVELS[HEALTH_LEVELS.length - 1];

  return {
    score,
    label: level.label,
    color: level.color,
    emoji: level.emoji,
  };
}

/**
 * Calculate recency score from lastSeen timestamp.
 */
function calculateRecencyScore(lastSeen) {
  if (!lastSeen) return 0;
  const diffMin = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (diffMin < 1) return 100;
  if (diffMin < 5) return 80;
  if (diffMin < 15) return 50;
  if (diffMin < 30) return 20;
  return 0;
}

/**
 * Calculate ratio of active nodes (recent data within threshold).
 */
function calculateNodeRatio(nodes) {
  if (!nodes || nodes.length === 0) return 0;
  const threshold = THRESHOLDS.NODE_OFFLINE_MINUTES * 60000;
  const now = Date.now();
  const active = nodes.filter((n) => {
    const ts = n.recorded_at || n.timestamp;
    if (!ts) return false;
    return now - new Date(ts).getTime() < threshold;
  }).length;
  return (active / nodes.length) * 100;
}

/**
 * Calculate sensor health for a single node.
 *
 * @param {{ battery: number, recorded_at: string }} node
 * @returns {{ status: string, color: string, batteryStatus: string, signalStrength: string, lastUpdateAge: number }}
 */
export function calculateSensorHealth(node) {
  const now = Date.now();
  const lastUpdate = node.recorded_at || node.timestamp;
  const ageSec = lastUpdate ? (now - new Date(lastUpdate).getTime()) / 1000 : Infinity;

  // Signal strength heuristic based on update recency
  let signalStrength, signalColor;
  if (ageSec < 60) {
    signalStrength = 'Strong';
    signalColor = '#22c55e';
  } else if (ageSec < 300) {
    signalStrength = 'Weak';
    signalColor = '#f59e0b';
  } else {
    signalStrength = 'Lost';
    signalColor = '#ef4444';
  }

  // Battery status
  const battery = node.battery ?? 0;
  let batteryStatus, batteryColor;
  if (battery > 50) {
    batteryStatus = 'Good';
    batteryColor = '#22c55e';
  } else if (battery > 20) {
    batteryStatus = 'Low';
    batteryColor = '#f59e0b';
  } else {
    batteryStatus = 'Critical';
    batteryColor = '#ef4444';
  }

  // Overall health
  let status, statusColor;
  if (ageSec > 300 || battery < 20) {
    status = 'Offline';
    statusColor = '#ef4444';
  } else if (ageSec > 60 || battery < 50) {
    status = 'Degraded';
    statusColor = '#f59e0b';
  } else {
    status = 'Healthy';
    statusColor = '#22c55e';
  }

  return {
    status,
    statusColor,
    batteryStatus,
    batteryColor,
    battery,
    signalStrength,
    signalColor,
    lastUpdateAge: Math.round(ageSec),
  };
}
