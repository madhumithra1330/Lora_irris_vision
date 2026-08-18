import { io } from 'socket.io-client';

const BACKEND_URL = 'https://liv-backend-24qz.onrender.com';
const API_URL = `${BACKEND_URL}/api`;
const FRONTEND_ORIGIN = 'https://lora-irris-vision.vercel.app';
const TEST_PHONE = '+919876543210';
const TEST_OTP = '123456';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyProduction() {
  console.log('==================================================');
  console.log('       LIV PRODUCTION VERIFICATION STARTED        ');
  console.log('==================================================\n');

  let farmerToken = '';
  let gatewayClaimed = false;
  let socketConnected = false;
  let socketEventsReceived = { gateway: false, node: false };

  // 1. Health Check
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      headers: { 'Origin': FRONTEND_ORIGIN }
    });
    const corsHeader = res.headers.get('access-control-allow-origin');
    const data = await res.json();
    console.log(`[PASS] GET /health: success=${data.success}, status=${data.status}`);
    if (corsHeader === FRONTEND_ORIGIN) {
      console.log(`[PASS] CORS Header Check: access-control-allow-origin="${corsHeader}"`);
    } else {
      console.log(`[FAIL] CORS Header Check: access-control-allow-origin="${corsHeader}"`);
    }
  } catch (e) {
    console.log('[FAIL] GET /health or CORS verification:', e.message);
  }

  // 2. Auth Flow: Send OTP
  try {
    const res = await fetch(`${API_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': FRONTEND_ORIGIN },
      body: JSON.stringify({ phone: TEST_PHONE })
    });
    const data = await res.json();
    if (data.success) {
      console.log(`[PASS] POST /api/auth/send-otp: success=true, message="${data.data.message}"`);
    } else {
      console.log(`[FAIL] POST /api/auth/send-otp:`, data);
    }
  } catch (e) {
    console.log('[FAIL] POST /api/auth/send-otp:', e.message);
  }

  // 3. Auth Flow: Verify OTP & JWT Session Creation
  try {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': FRONTEND_ORIGIN },
      body: JSON.stringify({ phone: TEST_PHONE, token: TEST_OTP })
    });
    const data = await res.json();
    if (data.success && data.data?.session?.access_token) {
      farmerToken = data.data.session.access_token;
      console.log(`[PASS] POST /api/auth/verify-otp: success=true, JWT token retrieved`);
    } else {
      console.log(`[FAIL] POST /api/auth/verify-otp:`, data);
    }
  } catch (e) {
    console.log('[FAIL] POST /api/auth/verify-otp:', e.message);
  }

  if (!farmerToken) {
    console.log('\nStopping verification: JWT authentication failed.');
    return;
  }

  // 4. Retrieve Farmer's Gateways
  try {
    const res = await fetch(`${API_URL}/gateways/my`, {
      headers: { 
        'Authorization': `Bearer ${farmerToken}`,
        'Origin': FRONTEND_ORIGIN 
      }
    });
    const data = await res.json();
    if (data.success) {
      const gatewaysList = data.data || [];
      console.log(`[PASS] GET /api/gateways/my: success=true, found ${gatewaysList.length} gateways`);
      const targetGw = gatewaysList.find(g => g.id === 'LIVGW001');
      if (targetGw) {
        gatewayClaimed = true;
        console.log(`[PASS] Gateway LIVGW001 ownership verified`);
      } else {
        console.log(`[WARNING] Gateway LIVGW001 not claimed by this user yet.`);
      }
    } else {
      console.log(`[FAIL] GET /api/gateways/my:`, data);
    }
  } catch (e) {
    console.log('[FAIL] GET /api/gateways/my:', e.message);
  }

  // 5. If Gateway is not claimed, let's claim it for testing (the database has secret 8F7K2M9Q)
  if (!gatewayClaimed) {
    try {
      console.log('Attempting to claim LIVGW001 for test farmer...');
      const res = await fetch(`${API_URL}/gateways/claim`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${farmerToken}`,
          'Origin': FRONTEND_ORIGIN 
        },
        body: JSON.stringify({ gateway_id: 'LIVGW001', gateway_secret: '8F7K2M9Q' })
      });
      const data = await res.json();
      if (data.success) {
        gatewayClaimed = true;
        console.log('[PASS] Claim Gateway LIVGW001: success=true');
      } else {
        console.log('[FAIL] Claim Gateway LIVGW001:', data.error || data);
      }
    } catch (e) {
      console.log('[FAIL] Claim Gateway LIVGW001:', e.message);
    }
  }

  // 6. Fetch Dashboard Gateway & Node Details
  try {
    const res = await fetch(`${API_URL}/dashboard/LIVGW001`, {
      headers: { 
        'Authorization': `Bearer ${farmerToken}`,
        'Origin': FRONTEND_ORIGIN 
      }
    });
    const data = await res.json();
    if (data.success) {
      console.log('[PASS] GET /api/dashboard/LIVGW001: success=true');
      const nodes = data.data.nodes || [];
      const hasNode1 = nodes.some(n => n.nodeId === 'LIV001');
      const hasNode2 = nodes.some(n => n.nodeId === 'LIV002');
      
      if (hasNode1) console.log('[PASS] Node LIV001 lookup in dashboard: success=true');
      else console.log('[FAIL] Node LIV001 lookup in dashboard: NOT found');
      
      if (hasNode2) console.log('[PASS] Node LIV002 lookup in dashboard: success=true');
      else console.log('[FAIL] Node LIV002 lookup in dashboard: NOT found');

      console.log('[INFO] Current telemetry readings from database:');
      console.log(`   - Gateway status: ${data.data.gateway?.status}`);
      console.log(`   - Gateway water level: ${data.data.gatewayMetrics?.waterLevel}%`);
      console.log(`   - Gateway pump status: ${data.data.gatewayMetrics?.pumpStatus}`);
      nodes.forEach(n => {
        console.log(`   - Node ${n.nodeId} (${n.cropName || 'Field'}): soil_moisture=${n.soil_moisture}%, valve_status=${n.valve_status}, status=${n.status}`);
      });
    } else {
      console.log('[FAIL] GET /api/dashboard/LIVGW001:', data);
    }
  } catch (e) {
    console.log('[FAIL] GET /api/dashboard/LIVGW001:', e.message);
  }

  // 7. Verify Commands Dispatch (Pump Control)
  try {
    const res = await fetch(`${API_URL}/commands`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`,
        'Origin': FRONTEND_ORIGIN 
      },
      body: JSON.stringify({ gateway_id: 'LIVGW001', command: 'PUMP_ON' })
    });
    const data = await res.json();
    if (data.success) {
      console.log(`[PASS] POST /api/commands (PUMP_ON): success=true, command status="${data.data.status}"`);
    } else {
      console.log(`[FAIL] POST /api/commands (PUMP_ON):`, data.error || data);
    }
  } catch (e) {
    console.log('[FAIL] POST /api/commands (PUMP_ON):', e.message);
  }

  // 8. Verify Socket.IO Connection & real-time messaging
  try {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      extraHeaders: {
        'Origin': FRONTEND_ORIGIN
      }
    });

    socket.on('connect', () => {
      socketConnected = true;
      console.log('[PASS] Socket.IO connection established to Render backend');
      socket.emit('join:gateway', 'LIVGW001');
    });

    socket.on('gateway:update', (payload) => {
      socketEventsReceived.gateway = true;
      console.log('[PASS] Socket.IO received gateway:update event:', payload);
    });

    socket.on('node:update', (payload) => {
      socketEventsReceived.node = true;
      console.log('[PASS] Socket.IO received node:update event:', payload);
    });

    // Send a telemetry payload to trigger events
    console.log('Sending mock telemetry to trigger socket updates...');
    await fetch(`${API_URL}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gatewayId: "LIVGW001",
        gatewaySecret: "8F7K2M9Q",
        timestamp: new Date().toISOString(),
        gateway: {
          status: "online",
          pumpStatus: true,
          waterLevel: 100, // will translate to 53%
          battery: 88
        },
        nodes: [
          {
            nodeId: "LIV001",
            status: "online",
            soilMoisture: 42,
            temperature: 29.5,
            humidity: 50,
            valveStatus: true,
            battery: 82
          },
          {
            nodeId: "LIV002",
            status: "online",
            soilMoisture: 58,
            temperature: 27.8,
            humidity: 65,
            valveStatus: false,
            battery: 79
          }
        ]
      })
    });

    await delay(3000);

    socket.disconnect();

    if (socketEventsReceived.gateway) {
      console.log('[PASS] Socket.IO gateway:update room event delivery');
    } else {
      console.log('[FAIL] Socket.IO gateway:update event NOT received');
    }

    if (socketEventsReceived.node) {
      console.log('[PASS] Socket.IO node:update room event delivery');
    } else {
      console.log('[FAIL] Socket.IO node:update event NOT received');
    }

  } catch (e) {
    console.log('[FAIL] Socket.IO verify failed:', e.message);
  }

  console.log('\n==================================================');
  console.log('       LIV PRODUCTION VERIFICATION COMPLETE       ');
  console.log('==================================================');
}

verifyProduction();
