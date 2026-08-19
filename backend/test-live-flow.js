const API_URL = 'https://liv-backend-24qz.onrender.com/api';

async function testLiveFlow() {
  console.log('--- Logging in via live verify-otp ---');

  const otpRes = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876540394', token: '123456' })
  });
  const otpData = await otpRes.json();
  console.log('Login result:', JSON.stringify(otpData, null, 2));

  const token = otpData.data?.session?.access_token;
  const farmerId = otpData.data?.user?.id;
  console.log(`\nFarmer ID: ${farmerId}`);
  console.log(`JWT Token: ${token}`);

  console.log('\n--- 1. Calling GET /api/auth/me ---');
  const meRes = await fetch(`${API_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const meData = await meRes.json();
  console.log('Status:', meRes.status);
  console.log('Me:', JSON.stringify(meData, null, 2));

  console.log('\n--- 2. Calling GET /api/gateways/my ---');
  const gwRes = await fetch(`${API_URL}/gateways/my`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const gwData = await gwRes.json();
  console.log('Status:', gwRes.status);
  console.log('Gateways:', JSON.stringify(gwData, null, 2));

  console.log('\n--- 3. Calling GET /api/dashboard/LIVGW001 ---');
  const dashRes = await fetch(`${API_URL}/dashboard/LIVGW001`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dashData = await dashRes.json();
  console.log('Status:', dashRes.status);
  console.log('Dashboard:', JSON.stringify(dashData, null, 2));

  console.log('\n--- 4. Calling POST /api/commands (PUMP_ON for LIV001) ---');
  const cmdRes1 = await fetch(`${API_URL}/commands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      gateway_id: 'LIVGW001',
      node_id: 'LIV001',
      command: 'PUMP_ON'
    })
  });
  const cmdData1 = await cmdRes1.json();
  console.log('Status:', cmdRes1.status);
  console.log('Command 1:', JSON.stringify(cmdData1, null, 2));

  console.log('\n--- 5. Calling POST /api/commands (VALVE_ON for LIV002) ---');
  const cmdRes2 = await fetch(`${API_URL}/commands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      gateway_id: 'LIVGW001',
      node_id: 'LIV002',
      command: 'VALVE_ON'
    })
  });
  const cmdData2 = await cmdRes2.json();
  console.log('Status:', cmdRes2.status);
  console.log('Command 2:', JSON.stringify(cmdData2, null, 2));
}

testLiveFlow();
