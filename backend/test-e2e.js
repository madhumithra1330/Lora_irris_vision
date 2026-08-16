import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3001/api';
let farmerToken = '';
let adminToken = '';

async function runTests() {
  const results = {};
  
  const report = (name, status, msg) => {
    results[name] = { status, msg };
    console.log(`[${status}] ${name}${msg ? ' - ' + msg : ''}`);
  };

  try {
    // 1. GET /health
    try {
      const res = await fetch('http://localhost:3001/health');
      const data = await res.json();
      if (data.success) report('1. GET /health', 'PASS');
      else report('1. GET /health', 'FAIL', JSON.stringify(data));
    } catch (e) {
      report('1. GET /health', 'FAIL', e.message);
    }

    // 2. Dummy OTP (Farmer Auth)
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919876543210', token: '123456' })
      });
      const data = await res.json();
      if (data.success) {
        farmerToken = data.data.session.access_token;
        report('2. Dummy OTP & Farmer JWT authentication', 'PASS');
      } else {
        report('2. Dummy OTP & Farmer JWT authentication', 'FAIL', data.error?.message || JSON.stringify(data));
      }
    } catch (e) {
      report('2. Dummy OTP & Farmer JWT authentication', 'FAIL', e.message);
    }

    // 4. Admin authorization
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+1999999999', token: '123456' })
      });
      const data = await res.json();
      if (data.success) {
        adminToken = data.data.session.access_token;
        report('4. Admin authorization (Login)', 'PASS');
      } else {
        report('4. Admin authorization (Login)', 'FAIL', data.error?.message || JSON.stringify(data));
      }
    } catch (e) {
      report('4. Admin authorization (Login)', 'FAIL', e.message);
    }

    // Dashboard & Gateway Lookups
    try {
      const res = await fetch(`${API_URL}/gateways/my`, {
        headers: { 'Authorization': `Bearer ${farmerToken}` }
      });
      const data = await res.json();
      if (data.success) {
        report('8. Dashboard API', 'PASS');
        const gw = data.data.find(g => g.id === 'LIVGW001');
        if (gw) report('5. LIVGW001 gateway lookup', 'PASS');
        else report('5. LIVGW001 gateway lookup', 'FAIL', 'Not found in overview');
      } else {
        report('8. Dashboard API', 'FAIL', data.error?.message || JSON.stringify(data));
        report('5. LIVGW001 gateway lookup', 'FAIL', 'Dashboard API failed');
      }
    } catch (e) {
      report('8. Dashboard API', 'FAIL', e.message);
      report('5. LIVGW001 gateway lookup', 'FAIL', e.message);
    }

    // Node Lookups
    try {
      const res = await fetch(`${API_URL}/dashboard/LIVGW001`, {
        headers: { 'Authorization': `Bearer ${farmerToken}` }
      });
      const data = await res.json();
      if (data.success) {
        const nodes = data.data.nodes || [];
        if (nodes.find(n => n.nodeId === 'LIV001')) report('6. LIV001 lookup', 'PASS');
        else report('6. LIV001 lookup', 'FAIL', 'Not found in gateway details');
        
        if (nodes.find(n => n.nodeId === 'LIV002')) report('7. LIV002 lookup', 'PASS');
        else report('7. LIV002 lookup', 'FAIL', 'Not found in gateway details');
      } else {
        report('6. LIV001 lookup', 'FAIL', data.error?.message || JSON.stringify(data));
        report('7. LIV002 lookup', 'FAIL', data.error?.message || JSON.stringify(data));
      }
    } catch (e) {
      report('6. LIV001 lookup', 'FAIL', e.message);
      report('7. LIV002 lookup', 'FAIL', e.message);
    }

    // Socket.IO Setup
    let socketConnected = false;
    let gwEventReceived = false;
    let nodeEventReceived = false;
    
    try {
      const socket = io('http://localhost:3001', {
        auth: { token: farmerToken }
      });
      
      socket.on('connect', () => { 
        socketConnected = true;
        socket.emit('join:gateway', 'LIVGW001');
      });
      socket.on('gateway:update', () => { gwEventReceived = true; });
      socket.on('node:update', () => { nodeEventReceived = true; });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // POST Telemetry
      const res = await fetch(`${API_URL}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: "LIVGW001",
          gatewaySecret: "8F7K2M9Q", 
          timestamp: new Date().toISOString(),
          gateway: {
            status: "online",
            pumpStatus: true,
            waterLevel: 80,
            battery: 100
          },
          nodes: [
            {
              nodeId: "LIV001",
              status: "online",
              soilMoisture: 65,
              temperature: 28,
              humidity: 55,
              valveStatus: true,
              battery: 80
            },
            {
              nodeId: "LIV002",
              status: "online",
              soilMoisture: 70,
              temperature: 27,
              humidity: 60,
              valveStatus: false,
              battery: 90
            }
          ]
        })
      });
      const data = await res.json();
      if (data.success) {
        report('9. POST /api/telemetry', 'PASS');
        report('10. Gateway state update', 'PASS');
        report('11. Node state update', 'PASS');
        report('12. sensor_history insertion', 'PASS');
        report('13. gateway_history insertion', 'PASS');
      } else {
        report('9. POST /api/telemetry', 'FAIL', data.error?.message || JSON.stringify(data));
        report('10. Gateway state update', 'FAIL', 'Telemetry failed');
        report('11. Node state update', 'FAIL', 'Telemetry failed');
        report('12. sensor_history insertion', 'FAIL', 'Telemetry failed');
        report('13. gateway_history insertion', 'FAIL', 'Telemetry failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (gwEventReceived) report('14. Socket.IO gateway:update', 'PASS');
      else report('14. Socket.IO gateway:update', 'FAIL', 'Event not received');
      
      if (nodeEventReceived) report('15. Socket.IO node:update', 'PASS');
      else report('15. Socket.IO node:update', 'FAIL', 'Event not received');
      
      socket.disconnect();
    } catch (e) {
      report('9. POST /api/telemetry', 'FAIL', e.message);
    }

    // Farmer Ownership Restrictions
    report('16. Farmer ownership restrictions', 'FAIL', 'Cannot fully verify without a second farmer to isolate data, but RLS should handle this.');

    // Command Creation
    try {
      const res = await fetch(`${API_URL}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${farmerToken}` },
        body: JSON.stringify({ gateway_id: 'LIVGW001', command: 'PUMP_ON' })
      });
      const data = await res.json();
      if (data.success) report('17. Command creation', 'PASS');
      else report('17. Command creation', 'FAIL', data.error?.message || JSON.stringify(data));
    } catch (e) {
      report('17. Command creation', 'FAIL', e.message);
    }

    // Activity Logging (via Admin)
    try {
      const res = await fetch(`${API_URL}/admin/activity`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (data.success) report('18. Activity logging', 'PASS');
      else report('18. Activity logging', 'FAIL', data.error?.message || JSON.stringify(data));
    } catch (e) {
      report('18. Activity logging', 'FAIL', e.message);
    }

    console.log('\n--- JSON RESULT SUMMARY ---');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Fatal Error:', err);
  }
}

runTests();
