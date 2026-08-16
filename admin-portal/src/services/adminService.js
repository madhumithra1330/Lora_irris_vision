import api from './api';
import { isDemoMode } from './authService';
import { mockFarmers, mockGateways, mockNodes, mockActivities, mockAlerts } from './demoService';

// Helper to generate mock time series data
function generateMockTimeSeries(label, min, max, points = 7) {
  const result = [];
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    result.push({
      name: dateStr,
      [label]: +(Math.random() * (max - min) + min).toFixed(1)
    });
  }
  return result;
}

export async function getOverview() {
  if (isDemoMode()) {
    const activeAlerts = mockAlerts.filter(a => !a.resolved);
    const onlineGateways = mockGateways.filter(g => g.status === 'online');
    const onlineNodes = mockNodes.filter(n => n.status === 'online');
    const pumpsOn = mockGateways.filter(g => g.pump_status).length;
    const valvesOpen = mockNodes.filter(n => n.valve_status).length;

    // Calculate health metrics
    let healthy = 0, warning = 0, critical = 0, offline = 0;
    mockGateways.forEach(g => {
      if (g.status === 'offline') offline++;
      else if (g.water_level < 30 || g.battery < 30) critical++;
      else if (g.water_level < 50 || g.battery < 50) warning++;
      else healthy++;
    });

    mockNodes.forEach(n => {
      if (n.status === 'offline') offline++;
      else if (n.soil_moisture < 30 || n.battery < 30) critical++;
      else if (n.soil_moisture < 50 || n.battery < 50) warning++;
      else healthy++;
    });

    return {
      farmers: { total: mockFarmers.length, active: mockFarmers.filter(f => f.status === 'active').length },
      gateways: { total: mockGateways.length, online: onlineGateways.length, offline: mockGateways.length - onlineGateways.length },
      nodes: { total: mockNodes.length, online: onlineNodes.length, offline: mockNodes.length - onlineNodes.length },
      water: { avgLevel: 68.5, lowWaterCount: mockGateways.filter(g => g.water_level < 20).length },
      irrigation: { pumpsOn, pumpsOff: mockGateways.length - pumpsOn, valvesOpen, valvesClosed: mockNodes.length - valvesOpen },
      health: { healthy, warning, critical, offline, lowBattery: mockGateways.filter(g => g.battery < 20).length + mockNodes.filter(n => n.battery < 20).length },
      alerts: { critical: activeAlerts.filter(a => a.severity === 'critical').length, warning: activeAlerts.filter(a => a.severity === 'warning').length, total: activeAlerts.length }
    };
  }

  const { data } = await api.get('/api/admin/overview');
  return data.data;
}

export async function getFarmers() {
  if (isDemoMode()) {
    return mockFarmers.map(f => {
      const gws = mockGateways.filter(g => g.farmer_id === f.id);
      const nds = mockNodes.filter(n => gws.some(g => g.id === n.gateway_id));
      return {
        ...f,
        gatewayCount: gws.length,
        nodeCount: nds.length,
        onlineDeviceCount: gws.filter(g => g.status === 'online').length + nds.filter(n => n.status === 'online').length,
        offlineDeviceCount: gws.filter(g => g.status === 'offline').length + nds.filter(n => n.status === 'offline').length,
        status: f.status
      };
    });
  }

  const { data } = await api.get('/api/admin/farmers');
  return data.data;
}

export async function getFarmerDetail(id) {
  if (isDemoMode()) {
    const farmer = mockFarmers.find(f => f.id === id);
    const gateways = mockGateways.filter(g => g.farmer_id === id);
    const nodes = mockNodes.filter(n => gateways.some(g => g.id === n.gateway_id));
    const activity = mockActivities.filter(a => a.farmer_id === id);

    return { farmer, gateways, nodes, activity };
  }

  const { data } = await api.get(`/api/admin/farmers/${id}`);
  return data.data;
}

export async function getGateways() {
  if (isDemoMode()) {
    return mockGateways.map(g => {
      const farmer = mockFarmers.find(f => f.id === g.farmer_id);
      const gwNodes = mockNodes.filter(n => n.gateway_id === g.id);
      return {
        ...g,
        farmer_name: farmer ? farmer.name : 'Unassigned',
        node_count: gwNodes.length,
        online_nodes: gwNodes.filter(n => n.status === 'online').length,
        health_score: g.status === 'offline' ? 0 : Math.round(g.battery * 0.4 + g.water_level * 0.6),
        health_status: g.status === 'offline' ? 'offline' : (g.water_level < 30 ? 'critical' : g.water_level < 50 ? 'warning' : 'healthy')
      };
    });
  }

  const { data } = await api.get('/api/admin/gateways');
  return data.data;
}

export async function getGatewayDetail(id) {
  if (isDemoMode()) {
    const gateway = mockGateways.find(g => g.id === id);
    const farmer = mockFarmers.find(f => f.id === gateway?.farmer_id);
    const nodes = mockNodes.filter(n => n.gateway_id === id);
    const activity = mockActivities.filter(a => a.gateway_id === id);
    
    // Generate a simple history
    const history = [];
    for (let i = 24; i >= 0; i--) {
      history.push({
        recorded_at: minutesAgo(i * 30).toISOString(),
        water_level: Math.max(10, Math.min(100, (gateway?.water_level || 50) + (Math.random() - 0.5) * 8)),
        battery: Math.max(10, Math.min(100, (gateway?.battery || 90) - i * 0.05)),
        pump_status: gateway?.pump_status || false
      });
    }

    return {
      gateway: {
        ...gateway,
        farmer_name: farmer ? farmer.name : 'Unassigned',
        health_score: gateway?.status === 'offline' ? 0 : 85,
        health_status: gateway?.status === 'offline' ? 'offline' : 'healthy'
      },
      nodes,
      activity,
      history
    };
  }

  const { data } = await api.get(`/api/admin/gateways/${id}`);
  return data.data;
}

export async function getNodes() {
  if (isDemoMode()) {
    return mockNodes.map(n => {
      const gw = mockGateways.find(g => g.id === n.gateway_id);
      const farmer = mockFarmers.find(f => f.id === gw?.farmer_id);
      return {
        ...n,
        gateway_name: gw ? gw.name : 'Unknown',
        farmer_name: farmer ? farmer.name : 'Unassigned',
        health_score: n.status === 'offline' ? 0 : Math.round(n.battery * 0.5 + n.soil_moisture * 0.5),
        health_status: n.status === 'offline' ? 'offline' : (n.soil_moisture < 30 ? 'critical' : n.soil_moisture < 50 ? 'warning' : 'healthy')
      };
    });
  }

  const { data } = await api.get('/api/admin/nodes');
  return data.data;
}

export async function getNodeDetail(id) {
  if (isDemoMode()) {
    const node = mockNodes.find(n => n.id === id);
    const gw = mockGateways.find(g => g.id === node?.gateway_id);
    const farmer = mockFarmers.find(f => f.id === gw?.farmer_id);
    const activity = mockActivities.filter(a => a.node_id === id);

    // Generate history
    const history = [];
    for (let i = 48; i >= 0; i--) {
      history.push({
        recorded_at: minutesAgo(i * 30).toISOString(),
        soil_moisture: Math.max(10, Math.min(100, (node?.soil_moisture || 50) + (Math.random() - 0.5) * 10)),
        temperature: +(28 + (Math.random() - 0.5) * 6).toFixed(1),
        humidity: Math.round(60 + (Math.random() - 0.5) * 20),
        battery: Math.max(10, (node?.battery || 80) - i * 0.05),
        valve_status: node?.valve_status || false
      });
    }

    return {
      node: {
        ...node,
        gateway_name: gw ? gw.name : 'Unknown',
        farmer_name: farmer ? farmer.name : 'Unassigned',
        health_score: node?.status === 'offline' ? 0 : 80,
        health_status: node?.status === 'offline' ? 'offline' : 'healthy'
      },
      history,
      activity
    };
  }

  const { data } = await api.get(`/api/admin/nodes/${id}`);
  return data.data;
}

export async function getDevices() {
  if (isDemoMode()) {
    const list = [];
    mockGateways.forEach(g => {
      const farmer = mockFarmers.find(f => f.id === g.farmer_id);
      list.push({
        id: g.id,
        type: 'Central Node',
        name: g.name,
        farmer_name: farmer ? farmer.name : 'Unassigned',
        parent_id: null,
        status: g.status,
        battery: g.battery,
        last_seen: g.last_seen,
        health_score: g.status === 'offline' ? 0 : 88,
        health_status: g.status === 'offline' ? 'offline' : 'healthy',
        alert_state: mockAlerts.some(a => a.gateway_id === g.id && !a.resolved) ? 'warning' : 'none'
      });
    });

    mockNodes.forEach(n => {
      const gw = mockGateways.find(g => g.id === n.gateway_id);
      const farmer = mockFarmers.find(f => f.id === gw?.farmer_id);
      list.push({
        id: n.id,
        type: 'Field Node',
        name: n.crop_name,
        farmer_name: farmer ? farmer.name : 'Unassigned',
        parent_id: n.gateway_id,
        status: n.status,
        battery: n.battery,
        last_seen: n.last_seen,
        health_score: n.status === 'offline' ? 0 : 79,
        health_status: n.status === 'offline' ? 'offline' : 'healthy',
        alert_state: mockAlerts.some(a => a.node_id === n.id && !a.resolved) ? 'warning' : 'none'
      });
    });

    return list;
  }

  const { data } = await api.get('/api/admin/devices');
  return data.data;
}

export async function getDeviceHealth() {
  if (isDemoMode()) {
    return {
      averageHealth: 82,
      statusDistribution: { healthy: 14, warning: 3, critical: 2, offline: 2 },
      lowBatteryDevices: [
        { id: 'LIVGW004', type: 'Central Node', battery: 18.4 },
        { id: 'LIV009', type: 'Field Node', battery: 18.5 }
      ]
    };
  }

  const { data } = await api.get('/api/admin/devices/health');
  return data.data;
}

export async function getAnalytics() {
  if (isDemoMode()) {
    return {
      temperature: { avg: 31.4, highest: { id: 'LIV011', name: 'Mango Orchard', value: 35.2 } },
      humidity: { avg: 64.8 },
      irrigationActivity: { pumpEventsCount: 22, valveEventsCount: 45 }
    };
  }

  const { data } = await api.get('/api/admin/analytics');
  return data.data;
}

export async function getWaterAnalytics() {
  if (isDemoMode()) {
    const list = mockGateways.map(g => g.water_level);
    const avg = list.reduce((a,b)=>a+b,0) / list.length;
    return {
      overview: {
        averageWaterLevel: +avg.toFixed(1),
        lowWaterCount: mockGateways.filter(g => g.water_level < 20).length,
        highestWaterLevel: { id: 'LIVGW005', name: 'Reddy Farm - Drip Section', level: 90.3 },
        lowestWaterLevel: { id: 'LIVGW004', name: 'Singh Farm', level: 15.8 }
      },
      timeSeries: generateMockTimeSeries('avgWaterLevel', 55, 80, 7),
      gateways: mockGateways.map(g => ({ id: g.id, name: g.name, waterLevel: g.water_level }))
    };
  }

  const { data } = await api.get('/api/admin/analytics/water');
  return data.data;
}

export async function getMoistureAnalytics() {
  if (isDemoMode()) {
    return {
      overview: {
        averageMoisture: 56.4,
        lowestMoisture: { id: 'LIV010', name: 'Maize Block', value: 33.7 },
        highestMoisture: { id: 'LIV004', name: 'Rice Paddy', value: 85.4 },
        nodesRequiringAttentionCount: mockNodes.filter(n => n.soil_moisture < 35).length
      },
      nodesRequiringAttention: mockNodes.filter(n => n.soil_moisture < 35),
      timeSeries: generateMockTimeSeries('avgMoisture', 48, 62, 7)
    };
  }

  const { data } = await api.get('/api/admin/analytics/moisture');
  return data.data;
}

export async function getActivity(filters = {}) {
  if (isDemoMode()) {
    let list = [...mockActivities];
    if (filters.farmer_id) list = list.filter(a => a.farmer_id === filters.farmer_id);
    if (filters.gateway_id) list = list.filter(a => a.gateway_id === filters.gateway_id);
    if (filters.node_id) list = list.filter(a => a.node_id === filters.node_id);
    return list;
  }

  const { data } = await api.get('/api/admin/activity', { params: filters });
  return data.data;
}

export async function getAlerts() {
  if (isDemoMode()) {
    return mockAlerts;
  }

  const { data } = await api.get('/api/admin/alerts');
  return data.data;
}
