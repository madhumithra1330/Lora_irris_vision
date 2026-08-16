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

    // 2. Authenticate gateway
    const gw = await db.getGatewayById(gatewayId);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Unknown gateway' });
    }

    if (gw.secret !== gatewaySecret) {
      return res.status(401).json({ success: false, error: 'Invalid secret' });
    }

    // 3. Convert waterLevel (distance cm -> percentage)
    // We assume the ESP32 sends the raw ultrasonic distance reading as waterLevel.
    const waterLevelPercentage = distanceToPercentage(gateway.waterLevel);

    // 4. Validate Gateway metrics
    if (typeof gateway.pumpStatus !== 'boolean' || typeof gateway.battery !== 'number') {
       return res.status(400).json({ success: false, error: 'Invalid gateway metrics' });
    }

    // 5. Update Gateway state
    const gwUpdate = {
      status: gateway.status || 'online',
      pump_status: gateway.pumpStatus,
      water_level: waterLevelPercentage,
      battery: gateway.battery,
      last_seen: new Date(timestamp).toISOString()
    };
    
    // Check for pump status change to log activity
    if (gw.pump_status !== gateway.pumpStatus) {
      await db.addActivity({
        type: 'pump',
        gateway_id: gatewayId,
        message: `Pump state changed to ${gateway.pumpStatus ? 'ON' : 'OFF'} by hardware`,
        metadata: { pumpStatus: gateway.pumpStatus, timestamp }
      });
    }

    await db.updateGateway(gatewayId, gwUpdate);

    // 6. Insert Gateway History
    await db.insertGatewayHistory([{
      gateway_id: gatewayId,
      status: gateway.status || 'online',
      pump_status: gateway.pumpStatus,
      water_level: waterLevelPercentage,
      battery: gateway.battery,
      recorded_at: new Date(timestamp).toISOString()
    }]);

    // 7. Update Nodes and Insert Sensor History
    const io = req.app.get('io');
    const dbNodes = await db.getNodesByGateway(gatewayId);
    const historyToInsert = [];

    for (const nodeData of nodes) {
      // Validate node data
      if (!nodeData.nodeId || typeof nodeData.soilMoisture !== 'number' || typeof nodeData.temperature !== 'number' || typeof nodeData.humidity !== 'number' || typeof nodeData.valveStatus !== 'boolean') {
        continue; // Skip invalid nodes
      }

      const existingNode = dbNodes.find(n => n.id === nodeData.nodeId);
      if (existingNode) {
        const nodeUpdate = {
          status: nodeData.status || 'online',
          soil_moisture: nodeData.soilMoisture,
          temperature: nodeData.temperature,
          humidity: nodeData.humidity,
          valve_status: nodeData.valveStatus,
          battery: nodeData.battery,
          last_seen: new Date(timestamp).toISOString()
        };

        // Check for valve status change to log activity
        if (existingNode.valve_status !== nodeData.valveStatus) {
          await db.addActivity({
            type: 'valve',
            gateway_id: gatewayId,
            node_id: nodeData.nodeId,
            message: `Valve state changed to ${nodeData.valveStatus ? 'OPEN' : 'CLOSED'} by hardware`,
            metadata: { valveStatus: nodeData.valveStatus, timestamp }
          });
        }

        await db.updateNode(nodeData.nodeId, nodeUpdate);

        historyToInsert.push({
          node_id: nodeData.nodeId,
          soil_moisture: nodeData.soilMoisture,
          temperature: nodeData.temperature,
          humidity: nodeData.humidity,
          valve_status: nodeData.valveStatus,
          battery: nodeData.battery,
          recorded_at: new Date(timestamp).toISOString()
        });

        // Emit Socket.IO node update
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
            timestamp
          };
          io.to(`gateway:${gatewayId}`).emit('node:update', nodePayload);
          io.to('admin').emit('node:update', nodePayload);
        }
      }
    }

    if (historyToInsert.length > 0) {
      await db.insertSensorHistory(historyToInsert);
    }

    // 8. Emit Socket.IO gateway update
    if (io) {
      const gwPayload = {
        gatewayId,
        status: gateway.status || 'online',
        pumpStatus: gateway.pumpStatus,
        waterLevel: waterLevelPercentage,
        battery: gateway.battery,
        lastSeen: new Date(timestamp).toISOString(),
        timestamp
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
