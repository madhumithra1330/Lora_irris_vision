import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'liv-secret-key-12345';
const BASE_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('====================================================');
  console.log('  LIV INTEGRATION VERIFICATION: FARMER ↔ GATEWAY    ');
  console.log('====================================================\n');

  const farmerId = '202fa1a2-74b1-4a96-a967-a29a8abed9a7';
  const farmerPhone = '+919876540394';
  
  // 1. Verify OTP or login for Farmer_0394
  console.log('1. Authenticating as Farmer_0394...');
  const otpRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: farmerPhone, token: '123456' })
  });
  const otpData = await otpRes.json();
  console.log('   verify-otp response success:', otpData.success);
  
  const farmerToken = otpData.data.session.access_token;
  const loggedInFarmerId = otpData.data.user.id;
  console.log(`   Authenticated farmer ID: ${loggedInFarmerId}`);

  // 2. GET /api/auth/me
  console.log('\n2. Testing GET /api/auth/me...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${farmerToken}` }
  });
  const meData = await meRes.json();
  console.log('   GET /api/auth/me status:', meRes.status);
  console.log('   GET /api/auth/me data:', JSON.stringify(meData.data));
  if (meRes.status === 200 && meData.data.id === loggedInFarmerId) {
    console.log('   [PASS] Farmer authentication verified.');
  } else {
    console.error('   [FAIL] Farmer authentication failed.');
  }

  // 3. Post real hardware telemetry
  console.log('\n3. Hardware posting real telemetry (LIVGW001 with LIV001 and LIV002)...');
  const hardwareTelemetry = {
    gatewayId: "LIVGW001",
    gatewaySecret: "8F7K2M9Q",
    timestamp: new Date().toISOString(),
    gateway: {
      status: "online",
      pumpStatus: false,
      waterLevel: 0,
      battery: 0
    },
    nodes: [
      {
        nodeId: "LIV001",
        status: "online",
        soilMoisture: 29,
        temperature: 31.1,
        humidity: 58,
        valveStatus: false,
        battery: 0
      },
      {
        nodeId: "LIV002",
        status: "online",
        soilMoisture: 32,
        temperature: 31.4,
        humidity: 57,
        valveStatus: false,
        battery: 0
      }
    ]
  };

  const telemetryRes = await fetch(`${BASE_URL}/api/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hardwareTelemetry)
  });
  const telemetryData = await telemetryRes.json();
  console.log('   POST /api/telemetry status:', telemetryRes.status);
  console.log('   POST /api/telemetry response:', telemetryData);
  if (telemetryRes.status === 200 && telemetryData.success) {
    console.log('   [PASS] Hardware telemetry processed successfully.');
  } else {
    console.error('   [FAIL] Hardware telemetry ingestion failed.');
  }

  // 4. GET /api/gateways/my
  console.log('\n4. Testing GET /api/gateways/my for Farmer_0394...');
  const myGatewaysRes = await fetch(`${BASE_URL}/api/gateways/my`, {
    headers: { 'Authorization': `Bearer ${farmerToken}` }
  });
  const myGatewaysData = await myGatewaysRes.json();
  console.log('   GET /api/gateways/my status:', myGatewaysRes.status);
  console.log('   Gateways count:', myGatewaysData.data?.length);
  const foundGateway = myGatewaysData.data?.find(g => (g.id === 'LIVGW001' || g.gateway_id === 'LIVGW001'));
  if (myGatewaysRes.status === 200 && foundGateway) {
    console.log(`   [PASS] Found owned gateway LIVGW001 (farmer_id: ${foundGateway.farmer_id})`);
  } else {
    console.error('   [FAIL] Gateway LIVGW001 not returned by /api/gateways/my');
  }

  // 5. GET /api/dashboard/LIVGW001
  console.log('\n5. Testing GET /api/dashboard/LIVGW001 for Farmer_0394...');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard/LIVGW001`, {
    headers: { 'Authorization': `Bearer ${farmerToken}` }
  });
  const dashData = await dashRes.json();
  console.log('   GET /api/dashboard/LIVGW001 status:', dashRes.status);
  console.log('   Dashboard data:', JSON.stringify(dashData, null, 2));

  if (dashRes.status === 200 && dashData.success && dashData.data) {
    const nodes = dashData.data.nodes || [];
    const hasNode1 = nodes.find(n => n.nodeId === 'LIV001');
    const hasNode2 = nodes.find(n => n.nodeId === 'LIV002');

    console.log(`\n   Validating nodes in dashboard:`);
    console.log(`   Node LIV001 found:`, !!hasNode1);
    if (hasNode1) {
      console.log(`     LIV001 soilMoisture: ${hasNode1.soilMoisture}% (expected 29)`);
      console.log(`     LIV001 temperature: ${hasNode1.temperature}°C (expected 31.1)`);
      console.log(`     LIV001 humidity: ${hasNode1.humidity}% (expected 58)`);
    }

    console.log(`   Node LIV002 found:`, !!hasNode2);
    if (hasNode2) {
      console.log(`     LIV002 soilMoisture: ${hasNode2.soilMoisture}% (expected 32)`);
      console.log(`     LIV002 temperature: ${hasNode2.temperature}°C (expected 31.4)`);
      console.log(`     LIV002 humidity: ${hasNode2.humidity}% (expected 57)`);
    }

    if (hasNode1 && hasNode2) {
      console.log('\n   [PASS] Dashboard returns HTTP 200 with real telemetry for LIV001 and LIV002!');
    } else {
      console.error('\n   [FAIL] Expected both LIV001 and LIV002 in dashboard nodes.');
    }
  } else {
    console.error('   [FAIL] GET /api/dashboard/LIVGW001 failed:', dashData);
  }

  // 6. Test Authorization Isolation (Reject unauthorized farmer)
  console.log('\n6. Testing Authorization Isolation with another Farmer (Farmer_9999)...');
  const otherOtpRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876549999', token: '123456' })
  });
  const otherOtpData = await otherOtpRes.json();
  const otherToken = otherOtpData.data.session.access_token;
  console.log(`   Authenticated other farmer ID: ${otherOtpData.data.user.id}`);

  const unauthorizedDashRes = await fetch(`${BASE_URL}/api/dashboard/LIVGW001`, {
    headers: { 'Authorization': `Bearer ${otherToken}` }
  });
  const unauthorizedDashData = await unauthorizedDashRes.json();
  console.log('   Unauthorized GET /api/dashboard/LIVGW001 status:', unauthorizedDashRes.status);
  console.log('   Unauthorized response:', unauthorizedDashData);

  if (unauthorizedDashRes.status === 403 && unauthorizedDashData.error?.includes('Access denied')) {
    console.log('   [PASS] Authorization check verified: Unauthorized farmer is correctly rejected with HTTP 403!');
  } else {
    console.error('   [FAIL] Authorization isolation failed! Expected 403.');
  }

  console.log('\n====================================================');
  console.log('  ALL VERIFICATION TESTS COMPLETED                   ');
  console.log('====================================================');
}

runVerification();
