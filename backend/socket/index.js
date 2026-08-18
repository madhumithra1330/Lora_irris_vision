import { Server } from 'socket.io';
import { db } from '../services/db.js';

export function initSocketServer(httpServer) {
  let allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
  allowedOrigins = allowedOrigins.map(origin => origin.replace(/\/$/, ''));
  if (!allowedOrigins.includes('https://lora-irris-vision.vercel.app')) {
    allowedOrigins.push('https://lora-irris-vision.vercel.app');
  }
  if (!allowedOrigins.includes('http://localhost:5173')) {
    allowedOrigins.push('http://localhost:5173');
  }
  
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join gateway-specific room
    socket.on('join:gateway', (gatewayId) => {
      socket.join(`gateway:${gatewayId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined gateway:${gatewayId}`);
    });

    // Leave gateway room
    socket.on('leave:gateway', (gatewayId) => {
      socket.leave(`gateway:${gatewayId}`);
      console.log(`[Socket.IO] Client ${socket.id} left gateway:${gatewayId}`);
    });

    // Join admin-wide room
    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(`[Socket.IO] Client ${socket.id} joined admin room`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  // Start live network telemetry simulator only if explicitly enabled
  if (process.env.ENABLE_SOCKET_SIMULATOR === 'true') {
    startLiveTelemetrySimulator(io);
  } else {
    console.log('[Socket.IO Simulator] Live telemetry updates disabled by ENABLE_SOCKET_SIMULATOR');
  }

  return io;
}

/**
 * Background simulator to periodically drift sensor values
 * and broadcast real-time updates to connected clients.
 */
function startLiveTelemetrySimulator(io) {
  console.log('[Socket.IO Simulator] Starting live telemetry updates...');

  setInterval(() => {
    try {
      // Loop through all gateways and randomly update some values
      db.gateways.forEach(gw => {
        // Skip offline gateway LIVGW004 sometimes, but occasionally simulate recovery or keep it offline
        if (gw.id === 'LIVGW004' && Math.random() > 0.05) {
          return; // Stay offline 95% of time
        }

        // Randomly drift water level +/- 0.5% (downwards trend if pump is running)
        const waterDrift = gw.pump_status ? -0.8 : (Math.random() > 0.7 ? 0.3 : -0.1);
        gw.water_level = Math.max(10, Math.min(100, +(gw.water_level + waterDrift).toFixed(1)));
        
        // Randomly drift battery slowly
        gw.battery = Math.max(5, +(gw.battery - 0.01).toFixed(2));
        gw.last_seen = new Date().toISOString();
        gw.updated_at = new Date().toISOString();

        // Broadcast gateway update
        const gatewayPayload = {
          gatewayId: gw.id,
          status: gw.status,
          pumpStatus: gw.pump_status,
          waterLevel: gw.water_level,
          battery: gw.battery,
          lastSeen: gw.last_seen,
          timestamp: gw.updated_at
        };

        io.to(`gateway:${gw.id}`).emit('gateway:update', gatewayPayload);
        io.to('admin').emit('gateway:update', gatewayPayload);

        // Also check for low water alerts dynamically
        if (gw.water_level < 20) {
          const alertType = 'low_water';
          const message = `Water level critically low at ${gw.name} (${gw.water_level}%)`;
          const alertExists = db.alerts.some(a => a.gateway_id === gw.id && a.type === alertType && !a.resolved);
          if (!alertExists) {
            const newAlert = db.addAlert({
              type: alertType,
              severity: 'critical',
              gateway_id: gw.id,
              node_id: null,
              farmer_id: gw.farmer_id,
              message
            });
            io.to('admin').emit('alert:new', newAlert);
          }
        }

        // Drift nodes belonging to this gateway
        const gwNodes = db.nodes.filter(n => n.gateway_id === gw.id);
        gwNodes.forEach(node => {
          if (node.status === 'offline') return;

          // Soil moisture goes up if valve is open, down slowly if closed
          const moistureDrift = node.valve_status ? 2.5 : -0.4;
          node.soil_moisture = Math.max(12, Math.min(98, +(node.soil_moisture + moistureDrift).toFixed(1)));
          
          // Temperature and humidity variations
          node.temperature = +(node.temperature + (Math.random() - 0.5) * 0.4).toFixed(1);
          node.humidity = Math.max(20, Math.min(100, +(node.humidity + (Math.random() - 0.5) * 0.8).toFixed(1)));
          
          node.battery = Math.max(5, +(node.battery - 0.02).toFixed(2));
          node.last_seen = new Date().toISOString();
          node.updated_at = new Date().toISOString();

          const nodePayload = {
            gatewayId: gw.id,
            nodeId: node.id,
            soilMoisture: node.soil_moisture,
            temperature: node.temperature,
            humidity: node.humidity,
            valveStatus: node.valve_status,
            battery: node.battery,
            status: node.status,
            timestamp: node.updated_at
          };

          io.to(`gateway:${gw.id}`).emit('node:update', nodePayload);
          io.to('admin').emit('node:update', nodePayload);

          // Dynamic alerting for critical conditions
          if (node.soil_moisture < 30) {
            const alertType = 'low_moisture';
            const message = `Soil moisture low on ${node.crop_name} (${node.soil_moisture}%)`;
            const alertExists = db.alerts.some(a => a.node_id === node.id && a.type === alertType && !a.resolved);
            if (!alertExists) {
              const newAlert = db.addAlert({
                type: alertType,
                severity: 'warning',
                gateway_id: gw.id,
                node_id: node.id,
                farmer_id: gw.farmer_id,
                message
              });
              io.to('admin').emit('alert:new', newAlert);
            }
          }
        });
      });
    } catch (e) {
      console.error('[Socket.IO Simulator] Error during tick:', e);
    }
  }, 6000); // Trigger every 6 seconds
}
