import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import bcryptjs from 'bcryptjs';

// In-memory OTP store for the Dummy OTP feature
export const otpStore = new Map();

export class DataStore {
  constructor() {
    this.memoryGateways = new Map([
      ['LIVGW001', {
        id: 'LIVGW001',
        name: 'Patel Farm - North Block',
        secret: '8F7K2M9Q',
        farmer_id: null,
        status: 'online',
        pump_status: false,
        water_level: 80,
        battery: 95,
        firmware: '2.1.0',
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    ]);

    this.memoryNodes = new Map([
      ['LIV001', {
        id: 'LIV001',
        gateway_id: 'LIVGW001',
        crop_name: 'Tomato Block A',
        soil_moisture: 45,
        temperature: 28.5,
        humidity: 65,
        valve_status: false,
        battery: 90,
        status: 'online',
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }],
      ['LIV002', {
        id: 'LIV002',
        gateway_id: 'LIVGW001',
        crop_name: 'Wheat Field B',
        soil_moisture: 50,
        temperature: 27.0,
        humidity: 60,
        valve_status: false,
        battery: 88,
        status: 'online',
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    ]);

    this.memorySensorHistory = [];
    this.memoryGatewayHistory = [];
    this.memoryCommands = new Map();
    this.memoryActivity = [];
    this.memoryAlerts = [];
    this.memoryUsers = new Map();
  }

  // ── User lookups ──
  async findUserByPhone(phone) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('phone', phone).single();
      if (!error && data) return data;
    } catch (_) {}
    for (const u of this.memoryUsers.values()) {
      if (u.phone === phone) return u;
    }
    return null;
  }

  async findUserByEmail(email) {
    if (!email) return null;
    try {
      const { data, error } = await supabase.from('profiles').select('*').ilike('email', email).single();
      if (!error && data) return data;
    } catch (_) {}
    for (const u of this.memoryUsers.values()) {
      if (u.email && u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  async findUserById(id) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (!error && data) return data;
    } catch (_) {}
    return this.memoryUsers.get(id) || null;
  }

  async createUser(userData) {
    const newUser = {
      id: uuidv4(),
      phone: userData.phone,
      name: userData.name || 'Farmer',
      email: userData.email || null,
      role: 'farmer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase.from('profiles').insert(newUser).select().single();
      if (!error && data) {
        this.memoryUsers.set(data.id, data);
        return data;
      }
    } catch (_) {}
    this.memoryUsers.set(newUser.id, newUser);
    return newUser;
  }

  async createAdmin(adminData) {
    const newAdmin = {
      id: uuidv4(),
      phone: adminData.phone,
      name: adminData.name || 'Admin',
      email: adminData.email || null,
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase.from('profiles').insert(newAdmin).select().single();
      if (!error && data) {
        this.memoryUsers.set(data.id, data);
        return data;
      }
    } catch (_) {}
    this.memoryUsers.set(newAdmin.id, newAdmin);
    return newAdmin;
  }

  async updateUser(id, updates) {
    try {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (!error && data) {
        this.memoryUsers.set(id, data);
        return data;
      }
    } catch (_) {}
    const existing = this.memoryUsers.get(id);
    if (existing) {
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      this.memoryUsers.set(id, updated);
      return updated;
    }
    return null;
  }

  // ── Gateway lookups ──
  async getGatewaysByFarmer(farmerId) {
    try {
      const { data, error } = await supabase.from('gateways').select('*').eq('farmer_id', farmerId);
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    const matched = [];
    for (const gw of this.memoryGateways.values()) {
      if (gw.farmer_id === farmerId) matched.push(gw);
    }
    return matched;
  }

  async getGatewayById(id) {
    try {
      const { data, error } = await supabase.from('gateways').select('*').eq('id', id).single();
      if (!error && data) {
        this.memoryGateways.set(id, data);
        return data;
      }
    } catch (_) {}
    return this.memoryGateways.get(id) || null;
  }

  async claimGateway(gatewayId, farmerId) {
    const updates = { farmer_id: farmerId, updated_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('gateways').update(updates).eq('id', gatewayId).select().single();
      if (!error && data) {
        this.memoryGateways.set(gatewayId, data);
        return data;
      }
    } catch (_) {}
    const gw = this.memoryGateways.get(gatewayId);
    if (gw) {
      const updated = { ...gw, ...updates };
      this.memoryGateways.set(gatewayId, updated);
      return updated;
    }
    return null;
  }

  async createGateway(gatewayData) {
    const newGw = {
      id: gatewayData.id,
      name: gatewayData.name || `Gateway ${gatewayData.id}`,
      secret: gatewayData.secret,
      farmer_id: gatewayData.farmer_id || null,
      status: gatewayData.status || 'online',
      pump_status: gatewayData.pump_status !== undefined ? gatewayData.pump_status : false,
      water_level: gatewayData.water_level !== undefined ? gatewayData.water_level : 0,
      battery: gatewayData.battery !== undefined ? gatewayData.battery : 100,
      firmware: gatewayData.firmware || '1.0.0',
      location: gatewayData.location || null,
      last_seen: gatewayData.last_seen || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase.from('gateways').upsert(newGw).select().single();
      if (!error && data) {
        this.memoryGateways.set(data.id, data);
        return data;
      }
    } catch (_) {}
    this.memoryGateways.set(newGw.id, newGw);
    return newGw;
  }

  async updateGateway(id, updates) {
    const updatedPayload = { ...updates, updated_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('gateways').update(updatedPayload).eq('id', id).select().single();
      if (!error && data) {
        this.memoryGateways.set(id, data);
        return data;
      }
    } catch (_) {}
    const existing = this.memoryGateways.get(id);
    if (existing) {
      const updated = { ...existing, ...updatedPayload };
      this.memoryGateways.set(id, updated);
      return updated;
    }
    return null;
  }

  // ── Node lookups ──
  async getNodesByGateway(gatewayId) {
    try {
      const { data, error } = await supabase.from('nodes').select('*').eq('gateway_id', gatewayId);
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    const matched = [];
    for (const n of this.memoryNodes.values()) {
      if (n.gateway_id === gatewayId) matched.push(n);
    }
    return matched;
  }

  async getNodeById(id) {
    try {
      const { data, error } = await supabase.from('nodes').select('*').eq('id', id).single();
      if (!error && data) {
        this.memoryNodes.set(id, data);
        return data;
      }
    } catch (_) {}
    return this.memoryNodes.get(id) || null;
  }

  async createNode(nodeData) {
    const newNode = {
      id: nodeData.id,
      gateway_id: nodeData.gateway_id,
      crop_name: nodeData.crop_name || `Field ${nodeData.id}`,
      soil_moisture: nodeData.soil_moisture !== undefined ? nodeData.soil_moisture : 0,
      temperature: nodeData.temperature !== undefined ? nodeData.temperature : 0,
      humidity: nodeData.humidity !== undefined ? nodeData.humidity : 0,
      valve_status: nodeData.valve_status !== undefined ? nodeData.valve_status : false,
      battery: nodeData.battery !== undefined ? nodeData.battery : 100,
      status: nodeData.status || 'online',
      last_seen: nodeData.last_seen || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase.from('nodes').upsert(newNode).select().single();
      if (!error && data) {
        this.memoryNodes.set(data.id, data);
        return data;
      }
    } catch (_) {}
    this.memoryNodes.set(newNode.id, newNode);
    return newNode;
  }

  async updateNode(id, updates) {
    const updatedPayload = { ...updates, updated_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('nodes').update(updatedPayload).eq('id', id).select().single();
      if (!error && data) {
        this.memoryNodes.set(id, data);
        return data;
      }
    } catch (_) {}
    const existing = this.memoryNodes.get(id);
    if (existing) {
      const updated = { ...existing, ...updatedPayload };
      this.memoryNodes.set(id, updated);
      return updated;
    }
    return null;
  }

  // ── Sensor history ──
  async getNodeHistory(nodeId, { from, to, limit = 100 } = {}) {
    try {
      let query = supabase
        .from('sensor_history')
        .select('*')
        .eq('node_id', nodeId)
        .order('recorded_at', { ascending: false })
        .limit(Number(limit));

      if (from) query = query.gte('recorded_at', new Date(from).toISOString());
      if (to) query = query.lte('recorded_at', new Date(to).toISOString());

      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    return this.memorySensorHistory
      .filter(r => r.node_id === nodeId)
      .slice(0, Number(limit));
  }

  async insertSensorHistory(historyRecords) {
    try {
      await supabase.from('sensor_history').insert(historyRecords);
    } catch (_) {}
    for (const rec of historyRecords) {
      this.memorySensorHistory.unshift({ id: uuidv4(), ...rec });
    }
    if (this.memorySensorHistory.length > 2000) {
      this.memorySensorHistory = this.memorySensorHistory.slice(0, 2000);
    }
  }

  // ── Gateway history ──
  async getGatewayHistory(gatewayId, { from, to, limit = 100 } = {}) {
    try {
      let query = supabase
        .from('gateway_history')
        .select('*')
        .eq('gateway_id', gatewayId)
        .order('recorded_at', { ascending: false })
        .limit(Number(limit));

      if (from) query = query.gte('recorded_at', new Date(from).toISOString());
      if (to) query = query.lte('recorded_at', new Date(to).toISOString());

      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    return this.memoryGatewayHistory
      .filter(r => r.gateway_id === gatewayId)
      .slice(0, Number(limit));
  }

  async insertGatewayHistory(historyRecords) {
    try {
      await supabase.from('gateway_history').insert(historyRecords);
    } catch (_) {}
    for (const rec of historyRecords) {
      this.memoryGatewayHistory.unshift({ id: uuidv4(), ...rec });
    }
    if (this.memoryGatewayHistory.length > 2000) {
      this.memoryGatewayHistory = this.memoryGatewayHistory.slice(0, 2000);
    }
  }

  // ── Commands ──
  async createCommand(cmdData) {
    const newCmd = {
      id: uuidv4(),
      gateway_id: cmdData.gateway_id,
      node_id: cmdData.node_id || null,
      command: cmdData.command,
      status: cmdData.status || 'pending',
      issued_by: cmdData.issued_by || null,
      created_at: new Date().toISOString(),
      completed_at: null
    };
    try {
      const { data, error } = await supabase.from('commands').insert(newCmd).select().single();
      if (!error && data) {
        this.memoryCommands.set(data.id, data);
        return data;
      }
    } catch (_) {}
    this.memoryCommands.set(newCmd.id, newCmd);
    return newCmd;
  }

  async getCommandById(id) {
    try {
      const { data, error } = await supabase.from('commands').select('*').eq('id', id).single();
      if (!error && data) return data;
    } catch (_) {}
    return this.memoryCommands.get(id) || null;
  }

  async updateCommand(id, status) {
    const updates = { status, completed_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('commands').update(updates).eq('id', id).select().single();
      if (!error && data) {
        this.memoryCommands.set(id, data);
        return data;
      }
    } catch (_) {}
    const existing = this.memoryCommands.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.memoryCommands.set(id, updated);
      return updated;
    }
    return null;
  }

  async getCommandsByGateway(gatewayId) {
    try {
      const { data, error } = await supabase
        .from('commands')
        .select('*')
        .eq('gateway_id', gatewayId)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (_) {}
    const matched = [];
    for (const c of this.memoryCommands.values()) {
      if (c.gateway_id === gatewayId) matched.push(c);
    }
    return matched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async getPendingCommand(gatewayId) {
    try {
      const { data, error } = await supabase
        .from('commands')
        .select('*')
        .eq('gateway_id', gatewayId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!error && data) return data;
    } catch (_) {}
    for (const c of this.memoryCommands.values()) {
      if (c.gateway_id === gatewayId && c.status === 'pending') return c;
    }
    return null;
  }

  // ── Activity ──
  async addActivity(entry) {
    const newAct = {
      id: uuidv4(),
      type: entry.type,
      gateway_id: entry.gateway_id || null,
      node_id: entry.node_id || null,
      farmer_id: entry.farmer_id || null,
      message: entry.message,
      metadata: entry.metadata || {},
      created_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase.from('activity_log').insert(newAct).select().single();
      if (!error && data) {
        this.memoryActivity.unshift(data);
        return data;
      }
    } catch (_) {}
    this.memoryActivity.unshift(newAct);
    return newAct;
  }

  async getActivity({ type, limit = 50, offset = 0 } = {}) {
    try {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        const types = type.split(',');
        query = query.in('type', types);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    let list = this.memoryActivity;
    if (type) {
      const types = type.split(',');
      list = list.filter(a => types.includes(a.type));
    }
    return list.slice(offset, offset + limit);
  }

  // ── Alerts ──
  async getAlerts({ resolved, severity, limit = 50 } = {}) {
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (resolved !== undefined) {
        query = query.eq('resolved', resolved === 'true' || resolved === true);
      }
      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    let list = this.memoryAlerts;
    if (resolved !== undefined) {
      const isRes = resolved === 'true' || resolved === true;
      list = list.filter(a => a.resolved === isRes);
    }
    if (severity) {
      list = list.filter(a => a.severity === severity);
    }
    return list.slice(0, limit);
  }

  async addAlert(alertData) {
    const newAlert = {
      id: uuidv4(),
      type: alertData.type,
      severity: alertData.severity || 'warning',
      gateway_id: alertData.gateway_id || null,
      node_id: alertData.node_id || null,
      farmer_id: alertData.farmer_id || null,
      message: alertData.message,
      resolved: false,
      created_at: new Date().toISOString(),
      resolved_at: null
    };
    try {
      const { data, error } = await supabase.from('alerts').insert(newAlert).select().single();
      if (!error && data) {
        this.memoryAlerts.unshift(data);
        return data;
      }
    } catch (_) {}
    this.memoryAlerts.unshift(newAlert);
    return newAlert;
  }

  // ── Admin queries (GetAll) ──
  async getAllUsers() {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    return Array.from(this.memoryUsers.values());
  }

  async getAllGateways() {
    try {
      const { data, error } = await supabase.from('gateways').select('*');
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    return Array.from(this.memoryGateways.values());
  }

  async getAllNodes() {
    try {
      const { data, error } = await supabase.from('nodes').select('*');
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    return Array.from(this.memoryNodes.values());
  }

  async getAllAlerts() {
    try {
      const { data, error } = await supabase.from('alerts').select('*');
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    return this.memoryAlerts;
  }
  
  async getAllGatewayHistory() {
    try {
      const { data, error } = await supabase.from('gateway_history').select('*').order('recorded_at', { ascending: false }).limit(5000);
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    return this.memoryGatewayHistory;
  }

  async getAllSensorHistory() {
    try {
      const { data, error } = await supabase.from('sensor_history').select('*').order('recorded_at', { ascending: false }).limit(5000);
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    return this.memorySensorHistory;
  }

  async getAllActivityLog() {
    try {
      const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(5000);
      if (!error && data && data.length > 0) return data;
    } catch (_) {}
    return this.memoryActivity;
  }
}

// Export singleton
export const db = new DataStore();
