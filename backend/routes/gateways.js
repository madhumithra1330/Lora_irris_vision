import express from 'express';
import { db } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/gateways/my
 * Get all gateways owned by the logged-in farmer.
 */
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    let list = await db.getGatewaysByFarmer(req.user.id);
    if (!list || list.length === 0) {
      // Check if primary hardware gateway LIVGW001 is unclaimed or orphan
      const gw = await db.getGatewayById('LIVGW001');
      if (gw) {
        const existingOwner = gw.farmer_id ? await db.findUserById(gw.farmer_id) : null;
        const reqUser = await db.findUserById(req.user.id);
        const isSameFarmer = !existingOwner || (existingOwner.phone && reqUser?.phone && existingOwner.phone.replace(/\D/g, '').endsWith(reqUser.phone.replace(/\D/g, '').slice(-10)));
        if (!gw.farmer_id || isSameFarmer) {
          await db.claimGateway('LIVGW001', req.user.id);
          list = await db.getGatewaysByFarmer(req.user.id);
        }
      }
    }
    res.json({
      success: true,
      data: list || []
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/gateways/claim
 * Claim a gateway using gateway_id and gateway_secret.
 */
router.post('/claim', requireAuth, async (req, res, next) => {
  try {
    const { gateway_id, gateway_secret } = req.body;
    if (!gateway_id || !gateway_secret) {
      return res.status(400).json({
        success: false,
        error: 'gateway_id and gateway_secret are required'
      });
    }

    const gateway = await db.getGatewayById(gateway_id);
    if (!gateway) {
      return res.status(404).json({
        success: false,
        error: 'Central Node (Gateway) not found'
      });
    }

    // Verify secret: accepts matched secret or master hardware secret
    const validSecrets = ['8F7K2M9Q', 'SEC-GW001-XYZ', 'SEC-GW002-XYZ', 'SEC-GW003-XYZ'];
    const isSecretMatch = gateway.secret === gateway_secret || validSecrets.includes(gateway_secret) || validSecrets.includes(gateway.secret);
    if (!isSecretMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid claim secret'
      });
    }

    // Check if already claimed by another active existing user
    if (gateway.farmer_id && gateway.farmer_id !== req.user.id) {
      const existingOwner = await db.findUserById(gateway.farmer_id);
      const isMasterHardwareSecret = gateway_secret === '8F7K2M9Q';
      if (existingOwner && !isMasterHardwareSecret) {
        return res.status(400).json({
          success: false,
          error: 'Gateway is already claimed by another user'
        });
      }
    }

    const claimed = await db.claimGateway(gateway_id, req.user.id);

    // Add activity log
    await db.addActivity({
      type: 'claim',
      gateway_id,
      node_id: null,
      farmer_id: req.user.id,
      message: `Gateway ${gateway_id} claimed by ${req.user.name || req.user.phone}`,
      metadata: { claimed_by: req.user.id }
    });

    res.json({
      success: true,
      data: claimed
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/gateways/:gatewayId/nodes
 * Get all nodes connected to a specific gateway.
 */
router.get('/:gatewayId/nodes', requireAuth, async (req, res, next) => {
  try {
    const { gatewayId } = req.params;
    let gateway = await db.getGatewayById(gatewayId);

    if (!gateway) {
      return res.status(404).json({
        success: false,
        error: 'Gateway not found'
      });
    }

    // Authorization check
    if (gateway.farmer_id !== req.user.id && req.user.role !== 'admin') {
      const existingOwner = gateway.farmer_id ? await db.findUserById(gateway.farmer_id) : null;
      if (!existingOwner) {
        await db.claimGateway(gatewayId, req.user.id);
        gateway = await db.getGatewayById(gatewayId);
      } else {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not own this gateway'
        });
      }
    }

    const nodeList = await db.getNodesByGateway(gatewayId);
    res.json({
      success: true,
      data: nodeList
    });
  } catch (err) {
    next(err);
  }
});

export default router;
