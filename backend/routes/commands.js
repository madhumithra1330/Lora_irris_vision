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

/**
 * GET /api/commands/pending
 * Hardware endpoint for GOLD ESP32 to poll for pending commands.
 * Query: ?gateway_id=LIVGW001
 */
router.get('/pending', async (req, res, next) => {
  try {
    const { gateway_id } = req.query;
    const gatewaySecret = req.headers['x-gateway-secret'];

    if (!gateway_id) {
      return res.status(400).json({ success: false, error: 'gateway_id is required' });
    }
    
    if (!gatewaySecret) {
      return res.status(401).json({ success: false, error: 'x-gateway-secret header is required' });
    }

    const gateway = await db.getGatewayById(gateway_id);
    if (!gateway) {
      return res.status(404).json({ success: false, error: 'Gateway not found' });
    }

    if (gateway.secret !== gatewaySecret) {
      return res.status(401).json({ success: false, error: 'Invalid gateway secret' });
    }

    const command = await db.getPendingCommand(gateway_id);
    if (!command) {
      return res.json({ success: true, data: null });
    }
    
    // Update status to 'sent'
    await db.updateCommand(command.id, 'sent');

    res.json({
      success: true,
      data: {
        commandId: command.id,
        gatewayId: command.gateway_id,
        nodeId: command.node_id,
        command: command.command
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/commands/:commandId/ack
 * Hardware endpoint for GOLD ESP32 to acknowledge command receipt.
 */
router.post('/:commandId/ack', async (req, res, next) => {
  try {
    const { commandId } = req.params;
    const gatewaySecret = req.headers['x-gateway-secret'];
    const status = req.body.status || 'acknowledged'; // support 'acknowledged' or 'failed'
    
    if (!gatewaySecret) {
      return res.status(401).json({ success: false, error: 'x-gateway-secret header is required' });
    }
    
    const command = await db.getCommandById(commandId);
    if (!command) {
      return res.status(404).json({ success: false, error: 'Command not found' });
    }
    
    const gateway = await db.getGatewayById(command.gateway_id);
    if (!gateway || gateway.secret !== gatewaySecret) {
      return res.status(401).json({ success: false, error: 'Invalid gateway secret' });
    }
    
    // Update command status to 'acknowledged' or 'failed'
    const updatedCommand = await db.updateCommand(commandId, status);
    if (!updatedCommand) {
      return res.status(404).json({ success: false, error: 'Command not found' });
    }
    
    // Add activity log for successful execution
    if (status === 'acknowledged') {
      let actionMessage = '';
      let activityType = '';
      
      if (command.command === 'PUMP_ON' || command.command === 'PUMP_OFF') {
        actionMessage = `Pump successfully turned ${command.command === 'PUMP_ON' ? 'ON' : 'OFF'} by hardware`;
        activityType = 'pump';
      } else if (command.command === 'VALVE_ON' || command.command === 'VALVE_OFF' || command.command === 'VALVE_OPEN' || command.command === 'VALVE_CLOSE') {
        actionMessage = `Valve successfully turned ${command.command === 'VALVE_ON' || command.command === 'VALVE_OPEN' ? 'ON' : 'OFF'} by hardware`;
        activityType = 'valve';
      }
      
      if (actionMessage) {
        await db.addActivity({
          type: activityType,
          gateway_id: command.gateway_id,
          node_id: command.node_id,
          message: actionMessage,
          metadata: { command: command.command, status }
        });
      }
    }

    // Optionally emit socket update for the admin/dashboard
    const io = req.app.get('io');
    if (io) {
      io.to(`gateway:${updatedCommand.gateway_id}`).emit('command:ack', { commandId, status });
      io.to('admin').emit('command:ack', { commandId, status });
    }

    res.json({ success: true, message: `Command ${status}` });
  } catch (err) {
    next(err);
  }
});

export default router;
