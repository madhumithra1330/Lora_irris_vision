import express from 'express';
import { db } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/commands
 * Send a pump or valve command.
 * Body: { gateway_id, node_id, command }
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { gateway_id, node_id, command } = req.body;

    if (!gateway_id || !command) {
      return res.status(400).json({
        success: false,
        error: 'gateway_id and command are required'
      });
    }

    const gateway = await db.getGatewayById(gateway_id);
    if (!gateway) {
      return res.status(404).json({
        success: false,
        error: 'Central Node (Gateway) not found'
      });
    }

    // Auth check
    if (gateway.farmer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not own this gateway'
      });
    }

    let targetNode = null;
    if (node_id) {
      targetNode = await db.getNodeById(node_id);
      if (!targetNode) {
        return res.status(404).json({
          success: false,
          error: 'Field Node not found'
        });
      }
      if (targetNode.gateway_id !== gateway_id) {
        return res.status(400).json({
          success: false,
          error: 'Field Node does not belong to specified gateway'
        });
      }
    }

    let actionMessage = '';
    let activityType = '';
    const io = req.app.get('io');

    if (command === 'PUMP_ON' || command === 'PUMP_OFF') {
      const isStart = command === 'PUMP_ON';
      actionMessage = `Pump command ${isStart ? 'ON' : 'OFF'} sent to ${gateway.name}`;
      activityType = 'pump';
    } else if (command === 'VALVE_ON' || command === 'VALVE_OFF' || command === 'VALVE_OPEN' || command === 'VALVE_CLOSE') {
      if (!node_id || !targetNode) {
        return res.status(400).json({
          success: false,
          error: 'node_id is required for valve commands'
        });
      }
      const isOpen = command === 'VALVE_ON' || command === 'VALVE_OPEN';
      actionMessage = `Valve command ${isOpen ? 'OPEN' : 'CLOSE'} sent for ${targetNode.crop_name} at ${gateway.name}`;
      activityType = 'valve';
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported command: ${command}`
      });
    }

    // Add command execution log
    const cmdLog = await db.createCommand({
      gateway_id,
      node_id: node_id || null,
      command,
      status: 'pending',
      issued_by: req.user.id
    });

    // Add activity log
    await db.addActivity({
      type: activityType,
      gateway_id,
      node_id: node_id || null,
      farmer_id: req.user.id,
      message: actionMessage,
      metadata: { command, status: 'sent' }
    });

    // Trigger admin activity updates if connected
    if (io) {
      io.to('admin').emit('activity:new', {
        id: cmdLog.id,
        type: activityType,
        gateway_id,
        node_id: node_id || null,
        farmer_id: req.user.id,
        message: actionMessage,
        created_at: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        id: cmdLog.id,
        gateway_id,
        node_id: node_id || null,
        command,
        status: 'sent',
        created_at: cmdLog.created_at,
        executed_at: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
