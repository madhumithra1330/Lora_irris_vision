import { generateDashboardData, generateTimeSeries } from '../utils/demoDataGenerator';

let simulationInterval = null;
let currentPumpStatus = false;
let dashboardData = null;

// Track simulated valve statuses for the two nodes
let currentValveStatuses = {
  LIV001: false,
  LIV002: true,
};

/**
 * Check if demo mode is enabled.
 */
export function isDemoMode() {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

/**
 * Generate a fresh dashboard snapshot.
 */
export function generateDashboard() {
  dashboardData = generateDashboardData(currentPumpStatus);
  // Inject simulated valve statuses
  if (dashboardData?.nodes) {
    dashboardData.nodes = dashboardData.nodes.map((node) => ({
      ...node,
      valve_status: currentValveStatuses[node.nodeId] ?? false,
      valveStatus: currentValveStatuses[node.nodeId] ?? false,
      soilMoisture: node.soil_moisture,
      recordedAt: node.recorded_at,
    }));
  }
  return dashboardData;
}

/**
 * Generate mock gateways.
 */
export function generateGateways() {
  return [
    {
      id: 'demo-gw-uuid',
      gateway_id: 'LIVGW001',
      gateway_name: 'LIV Demo Farm',
      status: 'online',
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];
}

/**
 * Generate mock farmer profile.
 */
export function generateProfile() {
  return {
    id: 'demo-user-uuid',
    name: 'Suresh Kumar',
    phone: '+919876543210',
    email: 'suresh@farm.in',
    role: 'farmer',
    created_at: new Date().toISOString(),
  };
}

/**
 * Generate mock session.
 */
export function generateSession() {
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_at: Date.now() + 86400000, // 24h from now
  };
}

/**
 * Toggle pump status in demo mode.
 */
export function togglePump(command) {
  if (command === 'PUMP_ON') currentPumpStatus = true;
  else if (command === 'PUMP_OFF') currentPumpStatus = false;
  return {
    id: `demo-cmd-${Date.now()}`,
    gateway_id: 'LIVGW001',
    command,
    status: 'executed',
    created_at: new Date().toISOString(),
    executed_at: new Date().toISOString(),
  };
}

/**
 * Toggle valve status in demo mode.
 */
export function toggleValve(nodeId, command) {
  if (command === 'VALVE_ON') currentValveStatuses[nodeId] = true;
  else if (command === 'VALVE_OFF') currentValveStatuses[nodeId] = false;
  return {
    id: `demo-cmd-${Date.now()}`,
    gateway_id: 'LIVGW001',
    node_id: nodeId,
    command,
    status: 'executed',
    created_at: new Date().toISOString(),
    executed_at: new Date().toISOString(),
  };
}

/**
 * Start live simulation — generates updates every 5-8 seconds.
 *
 * @param {function} onUpdate - Called with { type: 'gateway:update'|'node:update', data }
 * @returns {function} stopSimulation
 */
export function startSimulation(onUpdate) {
  if (simulationInterval) return () => {};

  function tick() {
    dashboardData = generateDashboardData(currentPumpStatus);
    
    // Inject simulated valve statuses
    if (dashboardData?.nodes) {
      dashboardData.nodes = dashboardData.nodes.map((node) => ({
        ...node,
        valve_status: currentValveStatuses[node.nodeId] ?? false,
        valveStatus: currentValveStatuses[node.nodeId] ?? false,
        soilMoisture: node.soil_moisture,
        recordedAt: node.recorded_at,
      }));
    }

    // Emit gateway update
    onUpdate({
      type: 'gateway:update',
      data: {
        gatewayId: 'LIVGW001',
        status: 'online',
        pumpStatus: currentPumpStatus,
        waterLevel: dashboardData.gatewayMetrics.waterLevel,
        battery: dashboardData.gatewayMetrics.battery,
        lastSeen: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      },
    });

    // Emit node updates
    for (const node of dashboardData.nodes) {
      onUpdate({
        type: 'node:update',
        data: {
          gatewayId: 'LIVGW001',
          nodeId: node.nodeId,
          soilMoisture: node.soilMoisture,
          temperature: node.temperature,
          humidity: node.humidity,
          valveStatus: node.valveStatus,
          battery: node.battery,
          status: 'online',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // First tick immediately
  tick();

  // Then every 5-8 seconds
  simulationInterval = setInterval(tick, 5000 + Math.random() * 3000);

  return function stopSimulation() {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  };
}

/**
 * Generate historical data for analytics.
 */
export function generateHistory(nodeId, range) {
  const points = generateTimeSeries(nodeId, range);
  // Ensure fields match camelCase in history response if required, but keep compatibility
  return points.map(p => ({
    ...p,
    soilMoisture: p.soil_moisture,
    waterLevel: p.water_level,
    recordedAt: p.recorded_at
  }));
}

/**
 * Get current pump status.
 */
export function getPumpStatus() {
  return currentPumpStatus;
}
