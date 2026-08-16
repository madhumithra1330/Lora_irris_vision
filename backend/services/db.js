import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import bcryptjs from 'bcryptjs';

// In-memory OTP store for the Dummy OTP feature
export const otpStore = new Map();

export class DataStore {
  // ── User lookups ──
  async findUserByPhone(phone) {
    const { data, error } = await supabase.from('profiles').select('*').eq('phone', phone).single();
    if (error || !data) return null;
    return data;
  }

  async findUserByEmail(email) {
    if (!email) return null;
    const { data, error } = await supabase.from('profiles').select('*').ilike('email', email).single();
    if (error || !data) return null;
    return data;
  }

  async findUserById(id) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data;
  }

  async createUser(userData) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        phone: userData.phone,
        name: userData.name,
        email: userData.email,
        role: 'farmer'
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async createAdmin(adminData) {
    // Note: If you want to use this, profiles needs a password_hash column or similar, 
    // but the schema doesn't have it. We will ignore password for the dummy implementation.
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        phone: adminData.phone,
        name: adminData.name,
        email: adminData.email,
        role: 'admin'
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateUser(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return null;
    return data;
  }

  // ── Gateway lookups ──
  async getGatewaysByFarmer(farmerId) {
    const { data, error } = await supabase.from('gateways').select('*').eq('farmer_id', farmerId);
    if (error) return [];
    return data || [];
  }

  async getGatewayById(id) {
    const { data, error } = await supabase.from('gateways').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data;
  }

  async claimGateway(gatewayId, farmerId) {
    const { data, error } = await supabase
      .from('gateways')
      .update({ farmer_id: farmerId, updated_at: new Date().toISOString() })
      .eq('id', gatewayId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateGateway(id, updates) {
    const { data, error } = await supabase
      .from('gateways')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return null;
    return data;
  }

  // ── Node lookups ──
  async getNodesByGateway(gatewayId) {
    const { data, error } = await supabase.from('nodes').select('*').eq('gateway_id', gatewayId);
    if (error) return [];
    return data || [];
  }

  async getNodeById(id) {
    const { data, error } = await supabase.from('nodes').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data;
  }

  async updateNode(id, updates) {
    const { data, error } = await supabase
      .from('nodes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return null;
    return data;
  }

  // ── Sensor history ──
  async getNodeHistory(nodeId, { from, to, limit = 100 } = {}) {
    let query = supabase
      .from('sensor_history')
      .select('*')
      .eq('node_id', nodeId)
      .order('recorded_at', { ascending: false })
      .limit(Number(limit));

    if (from) query = query.gte('recorded_at', new Date(from).toISOString());
    if (to) query = query.lte('recorded_at', new Date(to).toISOString());

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  async insertSensorHistory(historyRecords) {
    const { error } = await supabase.from('sensor_history').insert(historyRecords);
    if (error) throw new Error(error.message);
  }

  // ── Gateway history ──
  async getGatewayHistory(gatewayId, { from, to, limit = 100 } = {}) {
    let query = supabase
      .from('gateway_history')
      .select('*')
      .eq('gateway_id', gatewayId)
      .order('recorded_at', { ascending: false })
      .limit(Number(limit));

    if (from) query = query.gte('recorded_at', new Date(from).toISOString());
    if (to) query = query.lte('recorded_at', new Date(to).toISOString());

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  async insertGatewayHistory(historyRecords) {
    const { error } = await supabase.from('gateway_history').insert(historyRecords);
    if (error) throw new Error(error.message);
  }

  // ── Commands ──
  async createCommand(cmdData) {
    const { data, error } = await supabase
      .from('commands')
      .insert({
        gateway_id: cmdData.gateway_id,
        node_id: cmdData.node_id || null,
        command: cmdData.command,
        status: cmdData.status || 'pending',
        issued_by: cmdData.issued_by
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);

    // Simulate acknowledgment after a brief delay for production? 
    // No, production should wait for real hardware. But for now we just return it.
    return data;
  }

  async updateCommand(id, status) {
     const { data, error } = await supabase
      .from('commands')
      .update({ status, completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
     if (error) throw new Error(error.message);
     return data;
  }

  async getCommandsByGateway(gatewayId) {
    const { data, error } = await supabase
      .from('commands')
      .select('*')
      .eq('gateway_id', gatewayId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  // ── Activity ──
  async addActivity(entry) {
    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        type: entry.type,
        gateway_id: entry.gateway_id || null,
        node_id: entry.node_id || null,
        farmer_id: entry.farmer_id || null,
        message: entry.message,
        metadata: entry.metadata || {}
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async getActivity({ type, limit = 50, offset = 0 } = {}) {
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
    if (error) return [];
    return data || [];
  }

  // ── Alerts ──
  async getAlerts({ resolved, severity, limit = 50 } = {}) {
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
    if (error) return [];
    return data || [];
  }

  async addAlert(alertData) {
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        type: alertData.type,
        severity: alertData.severity || 'warning',
        gateway_id: alertData.gateway_id || null,
        node_id: alertData.node_id || null,
        farmer_id: alertData.farmer_id || null,
        message: alertData.message
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  // ── Admin queries (GetAll) ──
  async getAllUsers() {
    const { data, error } = await supabase.from('profiles').select('*');
    return error ? [] : (data || []);
  }

  async getAllGateways() {
    const { data, error } = await supabase.from('gateways').select('*');
    return error ? [] : (data || []);
  }

  async getAllNodes() {
    const { data, error } = await supabase.from('nodes').select('*');
    return error ? [] : (data || []);
  }

  async getAllAlerts() {
    const { data, error } = await supabase.from('alerts').select('*');
    return error ? [] : (data || []);
  }
  
  async getAllGatewayHistory() {
    // Note: Admin route requires history to compute day aggregates. Limit to recent to save memory
    const { data, error } = await supabase.from('gateway_history').select('*').order('recorded_at', { ascending: false }).limit(5000);
    return error ? [] : (data || []);
  }

  async getAllSensorHistory() {
    const { data, error } = await supabase.from('sensor_history').select('*').order('recorded_at', { ascending: false }).limit(5000);
    return error ? [] : (data || []);
  }

  async getAllActivityLog() {
    const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(5000);
    return error ? [] : (data || []);
  }
}

// Export singleton
export const db = new DataStore();
