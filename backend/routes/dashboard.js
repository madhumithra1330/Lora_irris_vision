import express from 'express';
import { db } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Stale timeout for online/offline determination (45 seconds = 3x firmware transmission rate)
const STALE_TIMEOUT_MS = 45 * 1000;

function computeStatus(lastSeen, reportedStatus) {
  if (!lastSeen) return 'offline';
  const lastSeenMs = new Date(lastSeen).getTime();
  if (isNaN(lastSeenMs)) return 'offline';
  if (Date.now() - lastSeenMs > STALE_TIMEOUT_MS) {
    return 'offline';
  }
  return reportedStatus === 'offline' ? 'offline' : 'online';
}

/**
 * GET /api/dashboard/:gatewayId
 * Fetch full dashboard snapshot for a specific gateway.
 */
router.get('/:gatewayId', requireAuth, async (req, res, next) => {
  try {
    const { gatewayId } = req.params;

    let gw = await db.getGatewayById(gatewayId);
    if (!gw) {
      return res.status(404).json({
        success: false,
        error: 'Central Node (Gateway) not found'
      });
    }

    // Ownership check & session reconciliation
    let isAuthorized = (gw.farmer_id === req.user.id || req.user.role === 'admin');
    if (!isAuthorized && gw.farmer_id) {
      const existingOwner = await db.findUserById(gw.farmer_id);
      const reqUser = await db.findUserById(req.user.id);
      const isSameFarmer = !existingOwner || (existingOwner.phone && reqUser?.phone && existingOwner.phone.replace(/\D/g, '').endsWith(reqUser.phone.replace(/\D/g, '').slice(-10)));
      if (isSameFarmer) {
        await db.claimGateway(gatewayId, req.user.id);
        gw = await db.getGatewayById(gatewayId);
        isAuthorized = true;
      }
    } else if (!gw.farmer_id) {
      await db.claimGateway(gatewayId, req.user.id);
      gw = await db.getGatewayById(gatewayId);
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not own this gateway'
      });
    }

    const connectedNodes = await db.getNodesByGateway(gatewayId);
    const gwStatus = computeStatus(gw.last_seen, gw.status);

    // Build the expected response shape
    const responseData = {
      gateway: {
        gatewayId: gw.id,
        gatewayName: gw.name,
        status: gwStatus,
        lastSeen: gw.last_seen
      },
      gatewayMetrics: {
        pumpStatus: gw.pump_status !== undefined ? gw.pump_status : false,
        waterLevel: gw.water_level !== undefined ? gw.water_level : 0,
        battery: gw.battery !== undefined ? gw.battery : 100,
        gatewayStatus: gwStatus,
        recordedAt: gw.last_seen || gw.updated_at
      },
      nodes: connectedNodes.map(node => ({
        nodeId: node.id,
        cropName: node.crop_name,
        status: computeStatus(node.last_seen, node.status),
        soilMoisture: node.soil_moisture !== undefined ? node.soil_moisture : node.soilMoisture,
        soil_moisture: node.soil_moisture !== undefined ? node.soil_moisture : node.soilMoisture,
        temperature: node.temperature !== undefined ? node.temperature : 0,
        humidity: node.humidity !== undefined ? node.humidity : 0,
        valveStatus: node.valve_status !== undefined ? node.valve_status : node.valveStatus,
        valve_status: node.valve_status !== undefined ? node.valve_status : node.valveStatus,
        battery: node.battery !== undefined ? node.battery : 100,
        recordedAt: node.last_seen || node.updated_at,
        recorded_at: node.last_seen || node.updated_at,
        lastSeen: node.last_seen
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
