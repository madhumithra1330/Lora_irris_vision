/**
 * LIV Smart Irrigation Platform - Seed Data
 * 
 * Generates realistic in-memory data for development:
 * - 2 admins, 5 farmers
 * - 6 gateways (1-2 per farmer)
 * - 15 field nodes (2-3 per gateway)
 * - 30 days of sensor telemetry history
 * - Command history & activity logs
 * - Active alerts
 */

import { v4 as uuidv4 } from 'uuid';
import bcryptjs from 'bcryptjs';

// ─── Helpers ────────────────────────────────────────────
const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
const minutesAgo = (m) => new Date(now.getTime() - m * 60 * 1000);
const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── Users ──────────────────────────────────────────────
const adminId1 = uuidv4();
const adminId2 = uuidv4();
const farmerId1 = uuidv4();
const farmerId2 = uuidv4();
const farmerId3 = uuidv4();
const farmerId4 = uuidv4();
const farmerId5 = uuidv4();

export const users = [
  {
    id: adminId1,
    phone: '+919999999999',
    name: 'Rajesh Kumar',
    email: 'admin@liv.com',
    role: 'admin',
    password_hash: bcryptjs.hashSync('admin123', 10),
    created_at: daysAgo(90).toISOString(),
    updated_at: daysAgo(2).toISOString(),
  },
  {
    id: adminId2,
    phone: '+919999999998',
    name: 'Priya Sharma',
    email: 'priya.admin@liv.com',
    role: 'admin',
    password_hash: bcryptjs.hashSync('admin123', 10),
    created_at: daysAgo(80).toISOString(),
    updated_at: daysAgo(5).toISOString(),
  },
  {
    id: farmerId1,
    phone: '+919876543210',
    name: 'Suresh Patel',
    email: 'suresh.patel@farm.com',
    role: 'farmer',
    created_at: daysAgo(60).toISOString(),
    updated_at: daysAgo(1).toISOString(),
  },
  {
    id: farmerId2,
    phone: '+919876543211',
    name: 'Anita Desai',
    email: 'anita.desai@farm.com',
    role: 'farmer',
    created_at: daysAgo(55).toISOString(),
    updated_at: daysAgo(3).toISOString(),
  },
  {
    id: farmerId3,
    phone: '+919876543212',
    name: 'Vikram Singh',
    email: 'vikram.singh@farm.com',
    role: 'farmer',
    created_at: daysAgo(45).toISOString(),
    updated_at: daysAgo(7).toISOString(),
  },
  {
    id: farmerId4,
    phone: '+919876543213',
    name: 'Lakshmi Reddy',
    email: 'lakshmi.reddy@farm.com',
    role: 'farmer',
    created_at: daysAgo(30).toISOString(),
    updated_at: daysAgo(2).toISOString(),
  },
  {
    id: farmerId5,
    phone: '+919876543214',
    name: 'Mohan Yadav',
    email: 'mohan.yadav@farm.com',
    role: 'farmer',
    created_at: daysAgo(20).toISOString(),
    updated_at: daysAgo(1).toISOString(),
  },
];

// ─── Gateways ───────────────────────────────────────────
export const gateways = [
  {
    id: 'LIVGW001',
    name: 'Patel Farm - North Block',
    secret: 'SEC-GW001-XYZ',
    farmer_id: farmerId1,
    status: 'online',
    pump_status: true,
    water_level: 82.5,
    battery: 94.3,
    firmware: '2.1.0',
    location: { lat: 23.0225, lng: 72.5714, address: 'Ahmedabad, Gujarat' },
    last_seen: minutesAgo(2).toISOString(),
    created_at: daysAgo(58).toISOString(),
    updated_at: minutesAgo(2).toISOString(),
  },
  {
    id: 'LIVGW002',
    name: 'Patel Farm - South Block',
    secret: 'SEC-GW002-XYZ',
    farmer_id: farmerId1,
    status: 'online',
    pump_status: false,
    water_level: 65.0,
    battery: 88.1,
    firmware: '2.1.0',
    location: { lat: 23.0125, lng: 72.5614, address: 'Ahmedabad, Gujarat' },
    last_seen: minutesAgo(5).toISOString(),
    created_at: daysAgo(50).toISOString(),
    updated_at: minutesAgo(5).toISOString(),
  },
  {
    id: 'LIVGW003',
    name: 'Desai Organic Farm',
    secret: 'SEC-GW003-XYZ',
    farmer_id: farmerId2,
    status: 'online',
    pump_status: true,
    water_level: 71.2,
    battery: 91.7,
    firmware: '2.0.5',
    location: { lat: 19.076, lng: 72.8777, address: 'Mumbai, Maharashtra' },
    last_seen: minutesAgo(3).toISOString(),
    created_at: daysAgo(53).toISOString(),
    updated_at: minutesAgo(3).toISOString(),
  },
  {
    id: 'LIVGW004',
    name: 'Singh Farm',
    secret: 'SEC-GW004-XYZ',
    farmer_id: farmerId3,
    status: 'offline',
    pump_status: false,
    water_level: 45.8,
    battery: 22.4,
    firmware: '1.9.2',
    location: { lat: 28.7041, lng: 77.1025, address: 'Delhi NCR' },
    last_seen: hoursAgo(6).toISOString(),
    created_at: daysAgo(43).toISOString(),
    updated_at: hoursAgo(6).toISOString(),
  },
  {
    id: 'LIVGW005',
    name: 'Reddy Farm - Drip Section',
    secret: 'SEC-GW005-XYZ',
    farmer_id: farmerId4,
    status: 'online',
    pump_status: false,
    water_level: 90.3,
    battery: 97.8,
    firmware: '2.1.0',
    location: { lat: 17.385, lng: 78.4867, address: 'Hyderabad, Telangana' },
    last_seen: minutesAgo(1).toISOString(),
    created_at: daysAgo(28).toISOString(),
    updated_at: minutesAgo(1).toISOString(),
  },
  {
    id: 'LIVGW006',
    name: 'Yadav Farm',
    secret: 'SEC-GW006-XYZ',
    farmer_id: farmerId5,
    status: 'online',
    pump_status: true,
    water_level: 55.6,
    battery: 78.9,
    firmware: '2.0.5',
    location: { lat: 26.9124, lng: 75.7873, address: 'Jaipur, Rajasthan' },
    last_seen: minutesAgo(4).toISOString(),
    created_at: daysAgo(18).toISOString(),
    updated_at: minutesAgo(4).toISOString(),
  },
];

// ─── Nodes ──────────────────────────────────────────────
const crops = ['Tomato', 'Rice Paddy', 'Cotton', 'Wheat', 'Sugarcane', 'Maize', 'Chilli', 'Onion', 'Potato', 'Groundnut', 'Soybean', 'Mango Orchard', 'Banana', 'Turmeric', 'Brinjal'];

export const nodes = [
  // Gateway LIVGW001 — 3 nodes
  { id: 'LIV001', gateway_id: 'LIVGW001', crop_name: 'Tomato Field A', soil_moisture: 62.3, temperature: 31.5, humidity: 68.2, valve_status: false, battery: 89.4, status: 'online',  last_seen: minutesAgo(2).toISOString(), created_at: daysAgo(57).toISOString(), updated_at: minutesAgo(2).toISOString() },
  { id: 'LIV002', gateway_id: 'LIVGW001', crop_name: 'Cotton Block 1',  soil_moisture: 45.1, temperature: 33.2, humidity: 55.9, valve_status: true,  battery: 76.2, status: 'online',  last_seen: minutesAgo(3).toISOString(), created_at: daysAgo(57).toISOString(), updated_at: minutesAgo(3).toISOString() },
  { id: 'LIV003', gateway_id: 'LIVGW001', crop_name: 'Wheat Section',   soil_moisture: 71.8, temperature: 29.1, humidity: 72.4, valve_status: false, battery: 92.1, status: 'online',  last_seen: minutesAgo(2).toISOString(), created_at: daysAgo(56).toISOString(), updated_at: minutesAgo(2).toISOString() },

  // Gateway LIVGW002 — 2 nodes
  { id: 'LIV004', gateway_id: 'LIVGW002', crop_name: 'Rice Paddy',      soil_moisture: 85.4, temperature: 30.0, humidity: 80.1, valve_status: false, battery: 81.3, status: 'online',  last_seen: minutesAgo(5).toISOString(), created_at: daysAgo(49).toISOString(), updated_at: minutesAgo(5).toISOString() },
  { id: 'LIV005', gateway_id: 'LIVGW002', crop_name: 'Sugarcane',       soil_moisture: 58.9, temperature: 32.4, humidity: 65.7, valve_status: true,  battery: 67.5, status: 'online',  last_seen: minutesAgo(6).toISOString(), created_at: daysAgo(48).toISOString(), updated_at: minutesAgo(6).toISOString() },

  // Gateway LIVGW003 — 3 nodes
  { id: 'LIV006', gateway_id: 'LIVGW003', crop_name: 'Organic Tomato',  soil_moisture: 55.2, temperature: 28.7, humidity: 74.3, valve_status: false, battery: 95.0, status: 'online',  last_seen: minutesAgo(3).toISOString(), created_at: daysAgo(52).toISOString(), updated_at: minutesAgo(3).toISOString() },
  { id: 'LIV007', gateway_id: 'LIVGW003', crop_name: 'Chilli Garden',   soil_moisture: 42.7, temperature: 34.1, humidity: 51.2, valve_status: true,  battery: 83.6, status: 'online',  last_seen: minutesAgo(4).toISOString(), created_at: daysAgo(51).toISOString(), updated_at: minutesAgo(4).toISOString() },
  { id: 'LIV008', gateway_id: 'LIVGW003', crop_name: 'Onion Bed',       soil_moisture: 38.1, temperature: 30.5, humidity: 59.8, valve_status: false, battery: 71.2, status: 'online',  last_seen: minutesAgo(3).toISOString(), created_at: daysAgo(50).toISOString(), updated_at: minutesAgo(3).toISOString() },

  // Gateway LIVGW004 — 2 nodes (offline gateway)
  { id: 'LIV009', gateway_id: 'LIVGW004', crop_name: 'Potato Field',    soil_moisture: 50.3, temperature: 26.8, humidity: 62.0, valve_status: false, battery: 18.5, status: 'offline', last_seen: hoursAgo(6).toISOString(),  created_at: daysAgo(42).toISOString(), updated_at: hoursAgo(6).toISOString()  },
  { id: 'LIV010', gateway_id: 'LIVGW004', crop_name: 'Maize Block',     soil_moisture: 33.7, temperature: 27.5, humidity: 58.4, valve_status: false, battery: 25.1, status: 'offline', last_seen: hoursAgo(7).toISOString(),  created_at: daysAgo(41).toISOString(), updated_at: hoursAgo(7).toISOString()  },

  // Gateway LIVGW005 — 3 nodes
  { id: 'LIV011', gateway_id: 'LIVGW005', crop_name: 'Mango Orchard',   soil_moisture: 68.5, temperature: 35.2, humidity: 70.1, valve_status: false, battery: 96.3, status: 'online',  last_seen: minutesAgo(1).toISOString(), created_at: daysAgo(27).toISOString(), updated_at: minutesAgo(1).toISOString() },
  { id: 'LIV012', gateway_id: 'LIVGW005', crop_name: 'Groundnut',       soil_moisture: 52.1, temperature: 33.8, humidity: 63.5, valve_status: false, battery: 88.7, status: 'online',  last_seen: minutesAgo(2).toISOString(), created_at: daysAgo(26).toISOString(), updated_at: minutesAgo(2).toISOString() },
  { id: 'LIV013', gateway_id: 'LIVGW005', crop_name: 'Turmeric Plot',   soil_moisture: 74.9, temperature: 31.0, humidity: 76.8, valve_status: true,  battery: 90.2, status: 'online',  last_seen: minutesAgo(1).toISOString(), created_at: daysAgo(25).toISOString(), updated_at: minutesAgo(1).toISOString() },

  // Gateway LIVGW006 — 2 nodes
  { id: 'LIV014', gateway_id: 'LIVGW006', crop_name: 'Soybean Field',   soil_moisture: 41.6, temperature: 36.5, humidity: 48.3, valve_status: true,  battery: 73.4, status: 'online',  last_seen: minutesAgo(4).toISOString(), created_at: daysAgo(17).toISOString(), updated_at: minutesAgo(4).toISOString() },
  { id: 'LIV015', gateway_id: 'LIVGW006', crop_name: 'Brinjal Patch',   soil_moisture: 57.3, temperature: 34.8, humidity: 55.1, valve_status: false, battery: 82.0, status: 'online',  last_seen: minutesAgo(5).toISOString(), created_at: daysAgo(16).toISOString(), updated_at: minutesAgo(5).toISOString() },
];

// ─── Sensor History (30 days, ~4 readings/day per node) ─
export const sensorHistory = [];

for (const node of nodes) {
  for (let day = 30; day >= 0; day--) {
    const readingsPerDay = 4;
    for (let r = 0; r < readingsPerDay; r++) {
      const hoursOffset = day * 24 - r * 6;
      const timestamp = new Date(now.getTime() - hoursOffset * 60 * 60 * 1000);
      // Simulate gradual variation around the node's baseline
      const moistureBase = node.soil_moisture + rand(-15, 15);
      sensorHistory.push({
        id: uuidv4(),
        node_id: node.id,
        soil_moisture: Math.max(10, Math.min(100, moistureBase)),
        temperature: node.temperature + rand(-4, 4),
        humidity: node.humidity + rand(-8, 8),
        valve_status: Math.random() > 0.7,
        battery: Math.max(10, node.battery - day * 0.3 + rand(-2, 2)),
        recorded_at: timestamp.toISOString(),
      });
    }
  }
}

// ─── Gateway History (30 days, ~4 readings/day per gw) ──
export const gatewayHistory = [];

for (const gw of gateways) {
  for (let day = 30; day >= 0; day--) {
    for (let r = 0; r < 4; r++) {
      const hoursOffset = day * 24 - r * 6;
      const timestamp = new Date(now.getTime() - hoursOffset * 60 * 60 * 1000);
      gatewayHistory.push({
        id: uuidv4(),
        gateway_id: gw.id,
        pump_status: Math.random() > 0.5,
        water_level: Math.max(10, Math.min(100, gw.water_level + rand(-15, 15))),
        battery: Math.max(10, gw.battery - day * 0.2 + rand(-2, 2)),
        status: day > 1 || gw.status === 'online' ? 'online' : gw.status,
        recorded_at: timestamp.toISOString(),
      });
    }
  }
}

// ─── Commands History ───────────────────────────────────
const commandTypes = ['PUMP_ON', 'PUMP_OFF', 'VALVE_OPEN', 'VALVE_CLOSE'];
const commandStatuses = ['acknowledged', 'acknowledged', 'acknowledged', 'failed'];

export const commands = [];

for (const gw of gateways) {
  const gwNodes = nodes.filter(n => n.gateway_id === gw.id);
  for (let i = 0; i < randInt(5, 12); i++) {
    const cmd = pick(commandTypes);
    const isNodeCmd = cmd.startsWith('VALVE');
    const targetNode = isNodeCmd ? pick(gwNodes) : null;
    const dAgo = randInt(0, 25);
    const farmer = users.find(u => u.id === gw.farmer_id);
    commands.push({
      id: uuidv4(),
      gateway_id: gw.id,
      node_id: targetNode?.id || null,
      command: cmd,
      status: pick(commandStatuses),
      issued_by: farmer?.id || null,
      created_at: daysAgo(dAgo).toISOString(),
      completed_at: daysAgo(dAgo).toISOString(),
    });
  }
}

// ─── Activity Log ───────────────────────────────────────
export const activityLog = [];

// Generate pump/valve/connectivity activity
for (const cmd of commands) {
  const gw = gateways.find(g => g.id === cmd.gateway_id);
  const farmer = users.find(u => u.id === cmd.issued_by);
  let type, message;
  if (cmd.command.startsWith('PUMP')) {
    type = 'pump';
    message = `Pump ${cmd.command === 'PUMP_ON' ? 'turned ON' : 'turned OFF'} at ${gw.name}`;
  } else {
    type = 'valve';
    const nd = nodes.find(n => n.id === cmd.node_id);
    message = `Valve ${cmd.command === 'VALVE_OPEN' ? 'opened' : 'closed'} on ${nd?.crop_name || cmd.node_id} at ${gw.name}`;
  }
  activityLog.push({
    id: uuidv4(),
    type,
    gateway_id: cmd.gateway_id,
    node_id: cmd.node_id,
    farmer_id: cmd.issued_by,
    message,
    metadata: { command: cmd.command, status: cmd.status },
    created_at: cmd.created_at,
  });
}

// Add connectivity events
for (const gw of gateways) {
  for (let i = 0; i < randInt(3, 6); i++) {
    const dAgo = randInt(0, 28);
    const event = pick(['connected', 'disconnected', 'reconnected']);
    activityLog.push({
      id: uuidv4(),
      type: 'connectivity',
      gateway_id: gw.id,
      node_id: null,
      farmer_id: gw.farmer_id,
      message: `Gateway ${gw.id} ${event}`,
      metadata: { event },
      created_at: daysAgo(dAgo).toISOString(),
    });
  }
}

// Sort activity by date descending
activityLog.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// ─── Alerts ─────────────────────────────────────────────
export const alerts = [
  {
    id: uuidv4(),
    type: 'low_battery',
    severity: 'critical',
    gateway_id: 'LIVGW004',
    node_id: 'LIV009',
    farmer_id: farmerId3,
    message: 'Node LIV009 battery critically low (18.5%)',
    resolved: false,
    created_at: hoursAgo(5).toISOString(),
    resolved_at: null,
  },
  {
    id: uuidv4(),
    type: 'offline',
    severity: 'critical',
    gateway_id: 'LIVGW004',
    node_id: null,
    farmer_id: farmerId3,
    message: 'Gateway LIVGW004 is offline for over 6 hours',
    resolved: false,
    created_at: hoursAgo(6).toISOString(),
    resolved_at: null,
  },
  {
    id: uuidv4(),
    type: 'low_moisture',
    severity: 'warning',
    gateway_id: 'LIVGW004',
    node_id: 'LIV010',
    farmer_id: farmerId3,
    message: 'Soil moisture critically low on Maize Block (33.7%)',
    resolved: false,
    created_at: hoursAgo(4).toISOString(),
    resolved_at: null,
  },
  {
    id: uuidv4(),
    type: 'low_moisture',
    severity: 'warning',
    gateway_id: 'LIVGW003',
    node_id: 'LIV008',
    farmer_id: farmerId2,
    message: 'Soil moisture low on Onion Bed (38.1%)',
    resolved: false,
    created_at: hoursAgo(3).toISOString(),
    resolved_at: null,
  },
  {
    id: uuidv4(),
    type: 'low_water',
    severity: 'warning',
    gateway_id: 'LIVGW004',
    node_id: null,
    farmer_id: farmerId3,
    message: 'Water level low at Singh Farm (45.8%)',
    resolved: false,
    created_at: hoursAgo(5).toISOString(),
    resolved_at: null,
  },
  {
    id: uuidv4(),
    type: 'low_battery',
    severity: 'warning',
    gateway_id: 'LIVGW004',
    node_id: 'LIV010',
    farmer_id: farmerId3,
    message: 'Node LIV010 battery low (25.1%)',
    resolved: false,
    created_at: hoursAgo(6).toISOString(),
    resolved_at: null,
  },
  {
    id: uuidv4(),
    type: 'low_battery',
    severity: 'info',
    gateway_id: 'LIVGW002',
    node_id: 'LIV005',
    farmer_id: farmerId1,
    message: 'Node LIV005 battery below 70% (67.5%)',
    resolved: false,
    created_at: hoursAgo(8).toISOString(),
    resolved_at: null,
  },
  // Some resolved alerts
  {
    id: uuidv4(),
    type: 'offline',
    severity: 'warning',
    gateway_id: 'LIVGW006',
    node_id: null,
    farmer_id: farmerId5,
    message: 'Gateway LIVGW006 was temporarily offline',
    resolved: true,
    created_at: daysAgo(3).toISOString(),
    resolved_at: daysAgo(3).toISOString(),
  },
  {
    id: uuidv4(),
    type: 'low_moisture',
    severity: 'warning',
    gateway_id: 'LIVGW006',
    node_id: 'LIV014',
    farmer_id: farmerId5,
    message: 'Soil moisture low on Soybean Field - resolved after irrigation',
    resolved: true,
    created_at: daysAgo(5).toISOString(),
    resolved_at: daysAgo(5).toISOString(),
  },
];

// ─── OTP Store (in-memory) ──────────────────────────────
export const otpStore = new Map();

// ─── Data Store Class ───────────────────────────────────
export class DataStore {
  constructor() {
    this.users = [...users];
    this.gateways = [...gateways];
    this.nodes = [...nodes];
    this.sensorHistory = [...sensorHistory];
    this.gatewayHistory = [...gatewayHistory];
    this.commands = [...commands];
    this.activityLog = [...activityLog];
    this.alerts = [...alerts];
    this.otpStore = otpStore;
  }

  // ── User lookups ──
  findUserByPhone(phone) {
    return this.users.find(u => u.phone === phone);
  }

  findUserByEmail(email) {
    return this.users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
  }

  findUserById(id) {
    return this.users.find(u => u.id === id);
  }

  createUser(userData) {
    const user = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role: 'farmer',
      ...userData,
    };
    this.users.push(user);
    return user;
  }

  createAdmin(adminData) {
    const user = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role: 'admin',
      ...adminData,
      password_hash: adminData.password ? bcryptjs.hashSync(adminData.password, 10) : undefined
    };
    if (user.password) delete user.password;
    this.users.push(user);
    return user;
  }

  updateUser(id, updates) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates, updated_at: new Date().toISOString() };
    return this.users[idx];
  }

  // ── Gateway lookups ──
  getGatewaysByFarmer(farmerId) {
    return this.gateways.filter(g => g.farmer_id === farmerId);
  }

  getGatewayById(id) {
    return this.gateways.find(g => g.id === id);
  }

  claimGateway(gatewayId, farmerId) {
    const gw = this.gateways.find(g => g.id === gatewayId);
    if (!gw) return null;
    gw.farmer_id = farmerId;
    gw.updated_at = new Date().toISOString();
    return gw;
  }

  // ── Node lookups ──
  getNodesByGateway(gatewayId) {
    return this.nodes.filter(n => n.gateway_id === gatewayId);
  }

  getNodeById(id) {
    return this.nodes.find(n => n.id === id);
  }

  updateNode(id, updates) {
    const idx = this.nodes.findIndex(n => n.id === id);
    if (idx === -1) return null;
    this.nodes[idx] = { ...this.nodes[idx], ...updates, updated_at: new Date().toISOString() };
    return this.nodes[idx];
  }

  // ── Sensor history ──
  getNodeHistory(nodeId, { from, to, limit = 100 } = {}) {
    let records = this.sensorHistory
      .filter(h => h.node_id === nodeId)
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

    if (from) records = records.filter(h => new Date(h.recorded_at) >= new Date(from));
    if (to) records = records.filter(h => new Date(h.recorded_at) <= new Date(to));

    return records.slice(0, Number(limit));
  }

  // ── Gateway history ──
  getGatewayHistory(gatewayId, { from, to, limit = 100 } = {}) {
    let records = this.gatewayHistory
      .filter(h => h.gateway_id === gatewayId)
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

    if (from) records = records.filter(h => new Date(h.recorded_at) >= new Date(from));
    if (to) records = records.filter(h => new Date(h.recorded_at) <= new Date(to));

    return records.slice(0, Number(limit));
  }

  // ── Commands ──
  createCommand(cmdData) {
    const cmd = {
      id: uuidv4(),
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
      ...cmdData,
    };
    this.commands.push(cmd);

    // Simulate acknowledgment after a brief delay
    setTimeout(() => {
      cmd.status = 'acknowledged';
      cmd.completed_at = new Date().toISOString();
    }, 1500);

    return cmd;
  }

  getCommandsByGateway(gatewayId) {
    return this.commands
      .filter(c => c.gateway_id === gatewayId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // ── Activity ──
  addActivity(entry) {
    const activity = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      ...entry,
    };
    this.activityLog.unshift(activity);
    return activity;
  }

  getActivity({ type, limit = 50, offset = 0 } = {}) {
    let records = [...this.activityLog];
    if (type) {
      const types = type.split(',');
      records = records.filter(a => types.includes(a.type));
    }
    return records.slice(offset, offset + limit);
  }

  // ── Alerts ──
  getAlerts({ resolved, severity, limit = 50 } = {}) {
    let records = [...this.alerts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (resolved !== undefined) records = records.filter(a => a.resolved === (resolved === 'true' || resolved === true));
    if (severity) records = records.filter(a => a.severity === severity);
    return records.slice(0, limit);
  }

  addAlert(alertData) {
    const alert = {
      id: uuidv4(),
      resolved: false,
      resolved_at: null,
      created_at: new Date().toISOString(),
      ...alertData,
    };
    this.alerts.unshift(alert);
    return alert;
  }
}

// Export singleton
export const db = new DataStore();
