import express from 'express';
import { db } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/node/:nodeId/history
 * Get sensor history for a field node.
 * Query params: from, to, limit
 */
router.get('/node/:nodeId/history', requireAuth, async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const { from, to, limit } = req.query;

    const node = await db.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Field Node not found'
      });
    }

    const gateway = await db.getGatewayById(node.gateway_id);
    if (!gateway) {
      return res.status(404).json({
        success: false,
        error: 'Parent Central Node not found'
      });
    }

    // Auth check
    if (gateway.farmer_id !== req.user.id && req.user.role !== 'admin') {
      const existingOwner = gateway.farmer_id ? await db.findUserById(gateway.farmer_id) : null;
      if (!existingOwner) {
        await db.claimGateway(gateway.id, req.user.id);
      } else {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not own this node'
        });
      }
    }

    const history = await db.getNodeHistory(nodeId, { from, to, limit: limit || 100 });
    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/nodes/:nodeId
 * Update node (crop_name)
 */
router.patch('/nodes/:nodeId', requireAuth, async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const { crop_name, cropName } = req.body;

    const node = await db.getNodeById(nodeId);
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Field Node not found'
      });
    }

    const gateway = await db.getGatewayById(node.gateway_id);
    if (!gateway) {
      return res.status(404).json({
        success: false,
        error: 'Parent Central Node not found'
      });
    }

    // Auth check
    if (gateway.farmer_id !== req.user.id && req.user.role !== 'admin') {
      const existingOwner = gateway.farmer_id ? await db.findUserById(gateway.farmer_id) : null;
      if (!existingOwner) {
        await db.claimGateway(gateway.id, req.user.id);
      } else {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not own this node'
        });
      }
    }

    // Support both snake_case and camelCase
    const updateVal = crop_name || cropName;
    if (updateVal === undefined) {
      return res.status(400).json({
        success: false,
        error: 'crop_name (or cropName) is required'
      });
    }

    const updatedNode = await db.updateNode(nodeId, { crop_name: updateVal });

    res.json({
      success: true,
      data: updatedNode
    });
  } catch (err) {
    next(err);
  }
});

export default router;
