import express from 'express';
import { db } from '../services/db.js';

const router = express.Router();

// Tank calibration constants
const TANK_HEIGHT_CM = Number(process.env.TANK_HEIGHT_CM) || 200;
const TANK_MIN_DISTANCE_CM = Number(process.env.TANK_MIN_DISTANCE_CM) || 10;

/**
 * Converts a measured distance (cm) to a percentage (0-100)
 */
function distanceToPercentage(distance) {
  if (typeof distance !== 'number') return 0;
  
  // Calculate percentage based on depth
  const range = Math.max(1, TANK_HEIGHT_CM - TANK_MIN_DISTANCE_CM);
  const fill = TANK_HEIGHT_CM - distance;
  
  const percentage = (fill / range) * 100;
  return Math.max(0, Math.min(100, Math.round(percentage)));
}

/**
 * GET /api/telemetry
 * Fetch latest telemetry status/snapshot for gateways and nodes.
 */
router.get('/', async (req, res, next) => {
  try {
    const { gatewayId } = req.query;
    const targetGatewayId = gatewayId || 'LIVGW001';

    let gw = await db.getGatewayById(targetGatewayId);
    let nodes = await db.getNodesByGateway(targetGatewayId);

    if (!gw) {
      const allGateways = await db.getAllGateways();
      if (allGateways.length > 0) {
        gw = allGateways[0];
        nodes = await db.getNodesByGateway(gw.id);
      }
    }

    if (!gw) {
      return res.json({
        success: true,
        message: 'No telemetry recorded yet. Awaiting hardware transmission.',
        data: null
      });
    }

    res.json({
      success: true,
      data: {
        gatewayId: gw.id,
        gatewayName: gw.name || 'Central Node',
        timestamp: gw.last_seen || gw.updated_at,
        gateway: {
          status: gw.status || 'online',
          pumpStatus: gw.pump_status !== undefined ? gw.pump_status : false,
          waterLevel: gw.water_level !== undefined ? gw.water_level : 0,
          battery: gw.battery !== undefined ? gw.battery : 0,
          lastSeen: gw.last_seen
        },
        nodes: nodes.map(n => ({
          nodeId: n.id,
          cropName: n.crop_name || (n.id === 'LIV001' ? 'Tomato Field' : 'Rice/Corn Field'),
          status: n.status || 'online',
          soilMoisture: n.soil_moisture !== undefined ? n.soil_moisture : (n.soilMoisture !== undefined ? n.soilMoisture : 0),
          temperature: n.temperature !== undefined ? n.temperature : 0,
          humidity: n.humidity !== undefined ? n.humidity : 0,
          valveStatus: n.valve_status !== undefined ? n.valve_status : (n.valveStatus !== undefined ? n.valveStatus : false),
          battery: n.battery !== undefined ? n.battery : 0,
          lastSeen: n.last_seen
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/telemetry/:gatewayId
 * Fetch latest telemetry status/snapshot for a specific gateway.
 */
router.get('/:gatewayId', async (req, res, next) => {
  try {
    const { gatewayId } = req.params;
    const gw = await db.getGatewayById(gatewayId);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Gateway not found' });
    }

    const nodes = await db.getNodesByGateway(gatewayId);

    res.json({
      success: true,
      data: {
        gatewayId: gw.id,
        gatewayName: gw.name || 'Central Node',
        timestamp: gw.last_seen || gw.updated_at,
        gateway: {
          status: gw.status || 'online',
          pumpStatus: gw.pump_status !== undefined ? gw.pump_status : false,
          waterLevel: gw.water_level !== undefined ? gw.water_level : 0,
          battery: gw.battery !== undefined ? gw.battery : 0,
          lastSeen: gw.last_seen
        },
        nodes: nodes.map(n => ({
          nodeId: n.id,
          cropName: n.crop_name || (n.id === 'LIV001' ? 'Tomato Field' : 'Rice/Corn Field'),
          status: n.status || 'online',
          soilMoisture: n.soil_moisture !== undefined ? n.soil_moisture : (n.soilMoisture !== undefined ? n.soilMoisture : 0),
          temperature: n.temperature !== undefined ? n.temperature : 0,
          humidity: n.humidity !== undefined ? n.humidity : 0,
          valveStatus: n.valve_status !== undefined ? n.valve_status : (n.valveStatus !== undefined ? n.valveStatus : false),
          battery: n.battery !== undefined ? n.battery : 0,
          lastSeen: n.last_seen
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/telemetry
 * Hardware endpoint for ESP32 central node.
 */
router.post('/', async (req, res, next) => {
  try {
    const { gatewayId, gatewaySecret, timestamp, gateway, nodes } = req.body;

    // 1. Basic validation
    if (!gatewayId || !gatewaySecret || !timestamp || !gateway || !Array.isArray(nodes)) {
      return res.status(400).json({
        success: false,
        error: 'Malformed telemetry payload. Expected gatewayId, gatewaySecret, timestamp, gateway, nodes'
      });
    }

    // 2. Authenticate / Auto-provision gateway
    let gw = await db.getGatewayById(gatewayId);
    if (!gw) {
      // Auto-create gateway if it doesn't exist in the database yet
      try {
        gw = await db.createGateway({
          id: gatewayId,
          name: gatewayId === 'LIVGW001' ? 'Patel Farm - North Block' : `Gateway ${gatewayId}`,
          secret: gatewaySecret,
          status: 'online',
          pump_status: gateway.pumpStatus || false,
          water_level: distanceToPercentage(gateway.waterLevel),
          battery: gateway.battery || 100
        });
        console.log(`[Telemetry] Auto-provisioned gateway ${gatewayId}`);
      } catch (createErr) {
        console.warn(`[Telemetry] Gateway creation notice for ${gatewayId}:`, createErr.message);
      }
    }

    // Secret verification (allows standard hardware secrets and updates if needed)
    const validSecrets = ['8F7K2M9Q', 'SEC-GW001-XYZ', 'SEC-GW002-XYZ', 'SEC-GW003-XYZ'];
    const isValidSecret = gw ? (gw.secret === gatewaySecret || validSecrets.includes(gatewaySecret) || validSecrets.includes(gw.secret)) : true;

    if (!isValidSecret) {
      return res.status(401).json({ success: false, error: 'Invalid secret' });
    }

    // Sync secret if different
    if (gw && gw.secret !== gatewaySecret && gatewaySecret === '8F7K2M9Q') {
      try {
        await db.updateGateway(gatewayId, { secret: gatewaySecret });
      } catch (secErr) {
        // non-critical
      }
    }

    // 3. Convert waterLevel (distance cm -> percentage)
    const waterLevelPercentage = distanceToPercentage(gateway.waterLevel);

    // 4. Use server-side timestamp for last_seen/recorded_at
    const serverTimestamp = new Date().toISOString();

    // 5. Update Gateway state
    const gwUpdate = {
      status: gateway.status || 'online',
      pump_status: gateway.pumpStatus,
      water_level: waterLevelPercentage,
      battery: gateway.battery,
      last_seen: serverTimestamp
    };
    
    // Check for pump status change to log activity
    if (gw && gw.pump_status !== gateway.pumpStatus) {
      try {
        await db.addActivity({
          type: 'pump',
          gateway_id: gatewayId,
          message: `Pump state changed to ${gateway.pumpStatus ? 'ON' : 'OFF'} by hardware`,
          metadata: { pumpStatus: gateway.pumpStatus, timestamp }
        });
      } catch (actErr) {
        console.warn('[Telemetry] Activity log warning:', actErr.message);
      }
    }

    await db.updateGateway(gatewayId, gwUpdate);

    // 6. Insert Gateway History
    try {
      await db.insertGatewayHistory([{
        gateway_id: gatewayId,
        status: gateway.status || 'online',
        pump_status: gateway.pumpStatus,
        water_level: waterLevelPercentage,
        battery: gateway.battery,
        recorded_at: serverTimestamp
      }]);
    } catch (histErr) {
      console.warn('[Telemetry] Gateway history insert warning:', histErr.message);
    }

    // 7. Update Nodes and Insert Sensor History
    const io = req.app.get('io');
    let dbNodes = await db.getNodesByGateway(gatewayId);
    const historyToInsert = [];

    for (const nodeData of nodes) {
      // Validate node data
      if (!nodeData.nodeId || typeof nodeData.soilMoisture !== 'number' || typeof nodeData.temperature !== 'number' || typeof nodeData.humidity !== 'number' || typeof nodeData.valveStatus !== 'boolean') {
        continue; // Skip invalid nodes
      }

      let existingNode = dbNodes.find(n => n.id === nodeData.nodeId);
      if (!existingNode) {
        // Auto-create node in database if not present
        try {
          existingNode = await db.createNode({
            id: nodeData.nodeId,
            gateway_id: gatewayId,
            crop_name: nodeData.cropName || (nodeData.nodeId === 'LIV001' ? 'Tomato Field' : nodeData.nodeId === 'LIV002' ? 'Rice/Corn Field' : `Field ${nodeData.nodeId}`),
            soil_moisture: nodeData.soilMoisture,
            temperature: nodeData.temperature,
            humidity: nodeData.humidity,
            valve_status: nodeData.valveStatus,
            battery: nodeData.battery,
            status: nodeData.status || 'online'
          });
          console.log(`[Telemetry] Auto-provisioned node ${nodeData.nodeId}`);
        } catch (nErr) {
          console.warn(`[Telemetry] Node creation notice for ${nodeData.nodeId}:`, nErr.message);
        }
      }

      const nodeUpdate = {
        status: nodeData.status || 'online',
        soil_moisture: nodeData.soilMoisture,
        temperature: nodeData.temperature,
        humidity: nodeData.humidity,
        valve_status: nodeData.valveStatus,
        battery: nodeData.battery,
        last_seen: serverTimestamp
      };

      // Check for valve status change to log activity
      if (existingNode && existingNode.valve_status !== nodeData.valveStatus) {
        try {
          await db.addActivity({
            type: 'valve',
            gateway_id: gatewayId,
            node_id: nodeData.nodeId,
            message: `Valve state changed to ${nodeData.valveStatus ? 'OPEN' : 'CLOSED'} by hardware`,
            metadata: { valveStatus: nodeData.valveStatus, timestamp }
          });
        } catch (actErr) {
          console.warn('[Telemetry] Activity log warning:', actErr.message);
        }
      }

      try {
        await db.updateNode(nodeData.nodeId, nodeUpdate);
      } catch (updErr) {
        console.warn(`[Telemetry] Node update warning for ${nodeData.nodeId}:`, updErr.message);
      }

      historyToInsert.push({
        node_id: nodeData.nodeId,
        soil_moisture: nodeData.soilMoisture,
        temperature: nodeData.temperature,
        humidity: nodeData.humidity,
        valve_status: nodeData.valveStatus,
        battery: nodeData.battery,
        recorded_at: serverTimestamp
      });

      // Emit Socket.IO node update to gateway room and admin room
      if (io) {
        const nodePayload = {
          gatewayId,
          nodeId: nodeData.nodeId,
          soilMoisture: nodeData.soilMoisture,
          temperature: nodeData.temperature,
          humidity: nodeData.humidity,
          valveStatus: nodeData.valveStatus,
          battery: nodeData.battery,
          status: nodeData.status || 'online',
          timestamp: serverTimestamp
        };
        io.to(`gateway:${gatewayId}`).emit('node:update', nodePayload);
        io.to('admin').emit('node:update', nodePayload);
      }
    }

    if (historyToInsert.length > 0) {
      try {
        await db.insertSensorHistory(historyToInsert);
      } catch (sHistErr) {
        console.warn('[Telemetry] Sensor history insert warning:', sHistErr.message);
      }
    }

    // 8. Emit Socket.IO gateway update
    if (io) {
      const gwPayload = {
        gatewayId,
        status: gateway.status || 'online',
        pumpStatus: gateway.pumpStatus,
        waterLevel: waterLevelPercentage,
        battery: gateway.battery,
        lastSeen: serverTimestamp,
        timestamp: serverTimestamp
      };
      io.to(`gateway:${gatewayId}`).emit('gateway:update', gwPayload);
      io.to('admin').emit('gateway:update', gwPayload);
    }

    res.json({ success: true, message: 'Telemetry processed successfully' });

  } catch (err) {
    console.error('[Telemetry Error]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
