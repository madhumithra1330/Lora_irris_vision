import api from './api';

/**
 * Get dashboard data for a gateway with fallback to telemetry snapshot.
 */
export async function getDashboard(gatewayId) {
  const targetId = gatewayId || 'LIVGW001';
  
  try {
    const { data } = await api.get(`/api/dashboard/${targetId}`);
    if (data?.data && Array.isArray(data.data.nodes) && data.data.nodes.length > 0) {
      return data.data;
    }
  } catch (err) {
    console.warn('[DashboardService] /api/dashboard failed, attempting telemetry fallback:', err.message);
  }

  // Telemetry fallback if /api/dashboard is empty or unauthorized
  try {
    const { data: telData } = await api.get(`/api/telemetry?gatewayId=${targetId}`);
    if (telData?.data) {
      const tel = telData.data;
      return {
        gateway: {
          gatewayId: tel.gatewayId || targetId,
          gatewayName: tel.gatewayName || 'Patel Farm - North Block',
          status: tel.gateway?.status || 'online',
          lastSeen: tel.timestamp || tel.gateway?.lastSeen,
        },
        gatewayMetrics: {
          pumpStatus: tel.gateway?.pumpStatus ?? false,
          waterLevel: tel.gateway?.waterLevel ?? 100,
          battery: tel.gateway?.battery ?? 0,
          gatewayStatus: tel.gateway?.status || 'online',
          recordedAt: tel.timestamp
        },
        nodes: (tel.nodes || []).map((n) => ({
          nodeId: n.nodeId || n.node_id,
          cropName: n.cropName || (n.nodeId === 'LIV001' ? 'Tomato Block A' : 'Wheat Field B'),
          status: n.status || 'online',
          soilMoisture: n.soilMoisture !== undefined ? n.soilMoisture : n.soil_moisture,
          temperature: n.temperature,
          humidity: n.humidity,
          valveStatus: n.valveStatus !== undefined ? n.valveStatus : n.valve_status,
          battery: n.battery,
          recordedAt: n.lastSeen || tel.timestamp,
        })),
        nodeCount: tel.nodes?.length || 0,
      };
    }
  } catch (telErr) {
    console.error('[DashboardService] Telemetry fallback failed:', telErr);
  }

  return null;
}

