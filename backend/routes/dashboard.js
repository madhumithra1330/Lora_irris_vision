import express from 'express';
import { db } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/dashboard/:gatewayId
 * Fetch full dashboard snapshot for a specific gateway.
 */
router.get('/:gatewayId', requireAuth, async (req, res, next) => {
  try {
    const { gatewayId } = req.params;

    const gw = await db.getGatewayById(gatewayId);
    if (!gw) {
      return res.status(404).json({
        success: false,
        error: 'Central Node (Gateway) not found'
      });
    }

    // Auth check
    if (gw.farmer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not own this gateway'
      });
    }

    const connectedNodes = await db.getNodesByGateway(gatewayId);

    // Build the expected response shape
    const responseData = {
      gateway: {
        gatewayId: gw.id,
        gatewayName: gw.name,
        status: gw.status,
        lastSeen: gw.last_seen
      },
      gatewayMetrics: {
        pumpStatus: gw.pump_status,
        waterLevel: gw.water_level,
        battery: gw.battery,
        gatewayStatus: gw.status,
        recordedAt: gw.updated_at
      },
      nodes: connectedNodes.map(node => ({
        nodeId: node.id,
        cropName: node.crop_name,
        status: node.status || 'online',
        soil_moisture: node.soil_moisture,
        temperature: node.temperature,
        humidity: node.humidity,
        valve_status: node.valve_status,
        battery: node.battery,
        recorded_at: node.updated_at
      })),
      nodeCount: connectedNodes.length
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (err) {
    next(err);
  }
});

export default router;
