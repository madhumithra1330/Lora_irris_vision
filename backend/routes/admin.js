import express from 'express';
import { db } from '../services/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to calculate gateway health score (0-100)
function getGatewayHealthScore(gw, gwNodes) {
  let score = 0;
  // 1. Status (30%)
  score += (gw.status === 'online' ? 100 : 0) * 0.3;
  // 2. Battery (25%)
  score += (gw.battery || 0) * 0.25;
  // 3. Recency (25%)
  const lastSeenAgeMin = gw.last_seen ? (Date.now() - new Date(gw.last_seen).getTime()) / 60000 : Infinity;
  let recencyScore = 0;
  if (lastSeenAgeMin < 5) recencyScore = 100;
  else if (lastSeenAgeMin < 15) recencyScore = 80;
  else if (lastSeenAgeMin < 60) recencyScore = 50;
  score += recencyScore * 0.25;
  // 4. Node ratio (20%)
  if (gwNodes && gwNodes.length > 0) {
    const activeNodes = gwNodes.filter(n => n.status === 'online').length;
    score += (activeNodes / gwNodes.length) * 100 * 0.2;
  } else {
    score += 100 * 0.2;
  }
  return Math.round(score);
}

// Helper to classify health state
function getHealthCategory(score, status) {
  if (status === 'offline') return 'offline';
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'warning';
  return 'critical';
}

/**
 * GET /api/admin/overview
 */
router.get('/overview', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await db.getAllUsers();
    const farmersList = users.filter(u => u.role === 'farmer');
    const gatewaysList = await db.getAllGateways();
    const nodesList = await db.getAllNodes();
    const allAlerts = await db.getAllAlerts();
    const activeAlerts = allAlerts.filter(a => !a.resolved);

    const onlineGateways = gatewaysList.filter(g => g.status === 'online');
    const offlineGateways = gatewaysList.filter(g => g.status === 'offline');

    const onlineNodes = nodesList.filter(n => n.status === 'online');
    const offlineNodes = nodesList.filter(n => n.status === 'offline');

    const totalWaterLevel = gatewaysList.reduce((acc, g) => acc + g.water_level, 0);
    const avgWaterLevel = gatewaysList.length > 0 ? +(totalWaterLevel / gatewaysList.length).toFixed(1) : 0;
    const lowWaterGateways = gatewaysList.filter(g => g.water_level < 20).length;

    const pumpsOn = gatewaysList.filter(g => g.pump_status === true).length;
    const pumpsOff = gatewaysList.filter(g => g.pump_status === false).length;
    const valvesOpen = nodesList.filter(n => n.valve_status === true).length;
    const valvesClosed = nodesList.filter(n => n.valve_status === false).length;

    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let offlineCount = 0;
    let lowBatteryCount = 0;

    gatewaysList.forEach(g => {
      if (g.status === 'offline') {
        offlineCount++;
      } else {
        const gwNodes = nodesList.filter(n => n.gateway_id === g.id);
        const score = getGatewayHealthScore(g, gwNodes);
        const cat = getHealthCategory(score, g.status);
        if (cat === 'healthy') healthyCount++;
        else if (cat === 'warning') warningCount++;
        else criticalCount++;
      }
      if (g.battery < 20) lowBatteryCount++;
    });

    nodesList.forEach(n => {
      if (n.status === 'offline') {
        offlineCount++;
      } else {
        let nodeScore = n.battery; 
        if (n.soil_moisture < 30) nodeScore -= 20;
        if (n.battery < 50) nodeScore -= 20;

        const score = Math.max(0, nodeScore);
        if (score >= 70) healthyCount++;
        else if (score >= 40) warningCount++;
        else criticalCount++;
      }
      if (n.battery < 20) lowBatteryCount++;
    });

    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = activeAlerts.filter(a => a.severity === 'warning').length;

    res.json({
      success: true,
      data: {
        farmers: {
          total: farmersList.length,
          active: farmersList.filter(f => gatewaysList.some(g => g.farmer_id === f.id && g.status === 'online')).length
        },
        gateways: {
          total: gatewaysList.length,
          online: onlineGateways.length,
          offline: offlineGateways.length
        },
        nodes: {
          total: nodesList.length,
          online: onlineNodes.length,
          offline: offlineNodes.length
        },
        water: {
          avgLevel: avgWaterLevel,
          lowWaterCount: lowWaterGateways
        },
        irrigation: {
          pumpsOn,
          pumpsOff,
          valvesOpen,
          valvesClosed
        },
        health: {
          healthy: healthyCount,
          warning: warningCount,
          critical: criticalCount,
          offline: offlineCount,
          lowBattery: lowBatteryCount
        },
        alerts: {
          critical: criticalAlerts,
          warning: warningAlerts,
          total: activeAlerts.length
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/farmers
 */
router.get('/farmers', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allUsers = await db.getAllUsers();
    const list = allUsers.filter(u => u.role === 'farmer');
    const allGateways = await db.getAllGateways();
    const allNodes = await db.getAllNodes();

    const result = list.map(f => {
      const gws = allGateways.filter(g => g.farmer_id === f.id);
      const nds = allNodes.filter(n => gws.some(g => g.id === n.gateway_id));
      const onlineDevices = gws.filter(g => g.status === 'online').length + nds.filter(n => n.status === 'online').length;
      const offlineDevices = gws.filter(g => g.status === 'offline').length + nds.filter(n => n.status === 'offline').length;

      return {
        ...f,
        gatewayCount: gws.length,
        nodeCount: nds.length,
        onlineDeviceCount: onlineDevices,
        offlineDeviceCount: offlineDevices,
        status: gws.some(g => g.status === 'online') ? 'active' : 'inactive'
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/farmers/:farmerId
 */
router.get('/farmers/:farmerId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const allUsers = await db.getAllUsers();
    const farmer = allUsers.find(u => u.id === farmerId);
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Farmer not found' });
    }

    const allGateways = await db.getAllGateways();
    const gatewaysList = allGateways.filter(g => g.farmer_id === farmerId);
    const allNodes = await db.getAllNodes();
    const nodesList = allNodes.filter(n => gatewaysList.some(g => g.id === n.gateway_id));
    const allActivity = await db.getAllActivityLog();
    const activity = allActivity.filter(a => a.farmer_id === farmerId).slice(0, 15);

    res.json({
      success: true,
      data: {
        farmer,
        gateways: gatewaysList,
        nodes: nodesList,
        activity
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/gateways
 */
router.get('/gateways', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const gatewaysList = await db.getAllGateways();
    const allUsers = await db.getAllUsers();
    const allNodes = await db.getAllNodes();

    const result = gatewaysList.map(g => {
      const farmer = allUsers.find(u => u.id === g.farmer_id);
      const gwNodes = allNodes.filter(n => n.gateway_id === g.id);
      const score = getGatewayHealthScore(g, gwNodes);

      return {
        ...g,
        farmer_name: farmer ? farmer.name : 'Unassigned',
        node_count: gwNodes.length,
        online_nodes: gwNodes.filter(n => n.status === 'online').length,
        health_score: score,
        health_status: getHealthCategory(score, g.status)
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/gateways/:gatewayId
 */
router.get('/gateways/:gatewayId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { gatewayId } = req.params;
    const gw = await db.getGatewayById(gatewayId);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Gateway not found' });
    }

    const allUsers = await db.getAllUsers();
    const farmer = allUsers.find(u => u.id === gw.farmer_id);
    const allNodes = await db.getAllNodes();
    const gwNodes = allNodes.filter(n => n.gateway_id === gw.id);
    
    const allActivity = await db.getAllActivityLog();
    const activity = allActivity.filter(a => a.gateway_id === gatewayId).slice(0, 15);
    const history = await db.getGatewayHistory(gatewayId, { limit: 24 });

    const score = getGatewayHealthScore(gw, gwNodes);

    res.json({
      success: true,
      data: {
        gateway: {
          ...gw,
          farmer_name: farmer ? farmer.name : 'Unassigned',
          health_score: score,
          health_status: getHealthCategory(score, gw.status)
        },
        nodes: gwNodes,
        activity,
        history
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/nodes
 */
router.get('/nodes', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const nodesList = await db.getAllNodes();
    const allGateways = await db.getAllGateways();
    const allUsers = await db.getAllUsers();

    const result = nodesList.map(n => {
      const gw = allGateways.find(g => g.id === n.gateway_id);
      const farmer = gw ? allUsers.find(u => u.id === gw.farmer_id) : null;

      let score = n.battery;
      if (n.soil_moisture < 30) score -= 25;
      if (n.battery < 50) score -= 20;

      return {
        ...n,
        gateway_name: gw ? gw.name : 'Unknown',
        farmer_name: farmer ? farmer.name : 'Unassigned',
        health_score: Math.max(0, score),
        health_status: getHealthCategory(Math.max(0, score), n.status)
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/nodes/:nodeId
 */
router.get('/nodes/:nodeId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const node = await db.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }

    const gw = await db.getGatewayById(node.gateway_id);
    const allUsers = await db.getAllUsers();
    const farmer = gw ? allUsers.find(u => u.id === gw.farmer_id) : null;
    const history = await db.getNodeHistory(nodeId, { limit: 48 });
    const allActivity = await db.getAllActivityLog();
    const activity = allActivity.filter(a => a.node_id === nodeId).slice(0, 10);

    let score = node.battery;
    if (node.soil_moisture < 30) score -= 25;

    res.json({
      success: true,
      data: {
        node: {
          ...node,
          gateway_name: gw ? gw.name : 'Unknown',
          farmer_name: farmer ? farmer.name : 'Unassigned',
          health_score: Math.max(0, score),
          health_status: getHealthCategory(Math.max(0, score), node.status)
        },
        history,
        activity
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/devices
 */
router.get('/devices', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const gatewaysList = await db.getAllGateways();
    const nodesList = await db.getAllNodes();
    const allUsers = await db.getAllUsers();
    const allAlerts = await db.getAllAlerts();

    const devices = [];

    gatewaysList.forEach(g => {
      const farmer = allUsers.find(u => u.id === g.farmer_id);
      const gwNodes = nodesList.filter(n => n.gateway_id === g.id);
      const score = getGatewayHealthScore(g, gwNodes);
      const healthStatus = getHealthCategory(score, g.status);

      devices.push({
        id: g.id,
        type: 'Central Node',
        name: g.name,
        farmer_name: farmer ? farmer.name : 'Unassigned',
        parent_id: null,
        status: g.status,
        battery: g.battery,
        last_seen: g.last_seen,
        health_score: score,
        health_status: healthStatus,
        alert_state: allAlerts.some(a => a.gateway_id === g.id && !a.resolved) ? 'warning' : 'none'
      });
    });

    nodesList.forEach(n => {
      const gw = gatewaysList.find(g => g.id === n.gateway_id);
      const farmer = gw ? allUsers.find(u => u.id === gw.farmer_id) : null;
      let score = n.battery;
      if (n.soil_moisture < 30) score -= 25;
      const healthStatus = getHealthCategory(Math.max(0, score), n.status);

      devices.push({
        id: n.id,
        type: 'Field Node',
        name: n.crop_name,
        farmer_name: farmer ? farmer.name : 'Unassigned',
        parent_id: n.gateway_id,
        status: n.status,
        battery: n.battery,
        last_seen: n.last_seen,
        health_score: Math.max(0, score),
        health_status: healthStatus,
        alert_state: allAlerts.some(a => a.node_id === n.id && !a.resolved) ? 'warning' : 'none'
      });
    });

    res.json({
      success: true,
      data: devices
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/devices/health
 */
router.get('/devices/health', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const gatewaysList = await db.getAllGateways();
    const nodesList = await db.getAllNodes();

    let totalScore = 0;
    let deviceCount = 0;
    const statusDistribution = { healthy: 0, warning: 0, critical: 0, offline: 0 };
    const lowBatteryDevices = [];

    gatewaysList.forEach(g => {
      const gwNodes = nodesList.filter(n => n.gateway_id === g.id);
      const score = getGatewayHealthScore(g, gwNodes);
      const status = getHealthCategory(score, g.status);

      statusDistribution[status]++;
      if (g.status !== 'offline') {
        totalScore += score;
        deviceCount++;
      }
      if (g.battery < 25) {
        lowBatteryDevices.push({ id: g.id, type: 'Central Node', battery: g.battery });
      }
    });

    nodesList.forEach(n => {
      let score = n.battery;
      if (n.soil_moisture < 30) score -= 25;
      const finalScore = Math.max(0, score);
      const status = getHealthCategory(finalScore, n.status);

      statusDistribution[status]++;
      if (n.status !== 'offline') {
        totalScore += finalScore;
        deviceCount++;
      }
      if (n.battery < 25) {
        lowBatteryDevices.push({ id: n.id, type: 'Field Node', battery: n.battery });
      }
    });

    const averageHealth = deviceCount > 0 ? Math.round(totalScore / deviceCount) : 0;

    res.json({
      success: true,
      data: {
        averageHealth,
        statusDistribution,
        lowBatteryDevices
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/analytics/water
 */
router.get('/analytics/water', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const gatewaysList = await db.getAllGateways();
    
    const levels = gatewaysList.map(g => g.water_level);
    const avgWater = levels.length > 0 ? +(levels.reduce((a,b)=>a+b,0)/levels.length).toFixed(1) : 0;
    const lowWaterCount = gatewaysList.filter(g => g.water_level < 20).length;

    let highest = null;
    let lowest = null;
    gatewaysList.forEach(g => {
      if (!highest || g.water_level > highest.water_level) highest = g;
      if (!lowest || g.water_level < lowest.water_level) lowest = g;
    });

    const timeSeries = [];
    const allGwHistory = await db.getAllGatewayHistory();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      let daySum = 0;
      let dayCount = 0;
      allGwHistory.forEach(h => {
        const histDate = new Date(h.recorded_at);
        if (histDate.toDateString() === date.toDateString()) {
          daySum += h.water_level;
          dayCount++;
        }
      });

      timeSeries.push({
        name: dateStr,
        avgWaterLevel: dayCount > 0 ? +(daySum / dayCount).toFixed(1) : (50 + Math.random() * 30)
      });
    }

    res.json({
      success: true,
      data: {
        overview: {
          averageWaterLevel: avgWater,
          lowWaterCount,
          highestWaterLevel: highest ? { id: highest.id, name: highest.name, level: highest.water_level } : null,
          lowestWaterLevel: lowest ? { id: lowest.id, name: lowest.name, level: lowest.water_level } : null
        },
        timeSeries,
        gateways: gatewaysList.map(g => ({ id: g.id, name: g.name, waterLevel: g.water_level }))
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/analytics/moisture
 */
router.get('/analytics/moisture', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const nodesList = await db.getAllNodes();
    const moistures = nodesList.map(n => n.soil_moisture);
    
    const avgMoisture = moistures.length > 0 ? +(moistures.reduce((a,b)=>a+b,0)/moistures.length).toFixed(1) : 0;
    
    let highest = null;
    let lowest = null;
    nodesList.forEach(n => {
      if (!highest || n.soil_moisture > highest.soil_moisture) highest = n;
      if (!lowest || n.soil_moisture < lowest.soil_moisture) lowest = n;
    });

    const lowMoistureNodes = nodesList.filter(n => n.soil_moisture < 30);

    const timeSeries = [];
    const allSensorHistory = await db.getAllSensorHistory();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      let daySum = 0;
      let dayCount = 0;
      allSensorHistory.forEach(h => {
        const histDate = new Date(h.recorded_at);
        if (histDate.toDateString() === date.toDateString()) {
          daySum += h.soil_moisture;
          dayCount++;
        }
      });

      timeSeries.push({
        name: dateStr,
        avgMoisture: dayCount > 0 ? +(daySum / dayCount).toFixed(1) : (45 + Math.random() * 20)
      });
    }

    res.json({
      success: true,
      data: {
        overview: {
          averageMoisture: avgMoisture,
          lowestMoisture: lowest ? { id: lowest.id, name: lowest.crop_name, value: lowest.soil_moisture } : null,
          highestMoisture: highest ? { id: highest.id, name: highest.crop_name, value: highest.soil_moisture } : null,
          nodesRequiringAttentionCount: lowMoistureNodes.length
        },
        nodesRequiringAttention: lowMoistureNodes,
        timeSeries
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/analytics
 */
router.get('/analytics', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const nodesList = await db.getAllNodes();
    const temps = nodesList.map(n => n.temperature);
    const hums = nodesList.map(n => n.humidity);

    const avgTemp = temps.length > 0 ? +(temps.reduce((a,b)=>a+b,0)/temps.length).toFixed(1) : 0;
    const avgHum = hums.length > 0 ? +(hums.reduce((a,b)=>a+b,0)/hums.length).toFixed(1) : 0;

    let highestTempNode = null;
    nodesList.forEach(n => {
      if (!highestTempNode || n.temperature > highestTempNode.temperature) highestTempNode = n;
    });

    const allActivity = await db.getAllActivityLog();

    res.json({
      success: true,
      data: {
        temperature: {
          avg: avgTemp,
          highest: highestTempNode ? { id: highestTempNode.id, name: highestTempNode.crop_name, value: highestTempNode.temperature } : null
        },
        humidity: {
          avg: avgHum
        },
        irrigationActivity: {
          pumpEventsCount: allActivity.filter(a => a.type === 'pump').length,
          valveEventsCount: allActivity.filter(a => a.type === 'valve').length
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/activity
 */
router.get('/activity', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { type, farmer_id, gateway_id, node_id, limit, offset } = req.query;

    let list = await db.getActivity({ type, limit: Number(limit) || 50, offset: Number(offset) || 0 });

    if (farmer_id) list = list.filter(a => a.farmer_id === farmer_id);
    if (gateway_id) list = list.filter(a => a.gateway_id === gateway_id);
    if (node_id) list = list.filter(a => a.node_id === node_id);

    const allUsers = await db.getAllUsers();
    const allGateways = await db.getAllGateways();
    const allNodes = await db.getAllNodes();

    const result = list.map(a => {
      const farmer = allUsers.find(u => u.id === a.farmer_id);
      const gw = allGateways.find(g => g.id === a.gateway_id);
      const nd = allNodes.find(n => n.id === a.node_id);

      return {
        ...a,
        farmer_name: farmer ? farmer.name : 'Unknown',
        gateway_name: gw ? gw.name : 'Unknown',
        node_name: nd ? nd.crop_name : (a.node_id || '')
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/alerts
 */
router.get('/alerts', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { resolved, severity, limit } = req.query;
    const list = await db.getAlerts({ resolved, severity, limit: Number(limit) || 100 });

    const allUsers = await db.getAllUsers();
    const allGateways = await db.getAllGateways();
    const allNodes = await db.getAllNodes();

    const result = list.map(a => {
      const farmer = allUsers.find(u => u.id === a.farmer_id);
      const gw = allGateways.find(g => g.id === a.gateway_id);
      const nd = allNodes.find(n => n.id === a.node_id);

      return {
        ...a,
        farmer_name: farmer ? farmer.name : 'Unknown',
        gateway_name: gw ? gw.name : 'Unknown',
        node_name: nd ? nd.crop_name : 'Unknown'
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

export default router;
