import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import gatewaysRouter from './routes/gateways.js';
import dashboardRouter from './routes/dashboard.js';
import nodesRouter from './routes/nodes.js';
import commandsRouter from './routes/commands.js';
import adminRouter from './routes/admin.js';
import telemetryRouter from './routes/telemetry.js';
import { initSocketServer } from './socket/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Simple request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Initialize Socket.IO Server
const io = initSocketServer(server);

// Share Socket.IO server instance with routers via Express app variables
app.set('io', io);

// Public API Health Check (expected by ConnectionDiagnostics.jsx)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/gateways', gatewaysRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/commands', commandsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/telemetry', telemetryRouter);

// Nodes router has top-level prefixes like /api/node/... and /api/nodes/...
app.use('/api', nodesRouter);

// Global Error Handler
app.use(errorHandler);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.url}`
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`   LIV Smart Irrigation Platform Backend API     `);
  console.log(`   Server running on http://localhost:${PORT}      `);
  console.log(`=================================================`);
});
