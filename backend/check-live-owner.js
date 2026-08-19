const API_URL = 'https://liv-backend-24qz.onrender.com/api';

async function checkLive() {
  console.log('--- Inspecting live backend state ---');

  // Let's create a JWT for the exact farmer ID from the user browser:
  // "202fa1a2-74b1-4a96-a967-a29a8abed9a7"
  import('jsonwebtoken').then(async (jwtModule) => {
    const jwt = jwtModule.default;
    const JWT_SECRET = process.env.JWT_SECRET || 'liv-secret-key-12345';
    
    // We can also test multiple possible JWT secrets or the token from verify-otp
    const farmerToken = jwt.sign(
      { id: '202fa1a2-74b1-4a96-a967-a29a8abed9a7', role: 'farmer' },
      JWT_SECRET,
      { expiresIn: 30 * 24 * 3600 }
    );

    console.log('\n1. Testing GET /api/dashboard/LIVGW001 with user 202fa1a2-74b1-4a96-a967-a29a8abed9a7...');
    const dashRes = await fetch(`${API_URL}/dashboard/LIVGW001`, {
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const dashData = await dashRes.json();
    console.log('Status:', dashRes.status);
    console.log('Response:', JSON.stringify(dashData, null, 2));

    console.log('\n2. Testing POST /api/commands for LIV001 with user 202fa1a2-74b1-4a96-a967-a29a8abed9a7...');
    const cmdRes = await fetch(`${API_URL}/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        gateway_id: 'LIVGW001',
        node_id: 'LIV001',
        command: 'PUMP_ON'
      })
    });
    const cmdData = await cmdRes.json();
    console.log('Status:', cmdRes.status);
    console.log('Response:', JSON.stringify(cmdData, null, 2));

    console.log('\n3. Testing POST /api/gateways/claim with user 202fa1a2-74b1-4a96-a967-a29a8abed9a7 and secret 8F7K2M9Q...');
    const claimRes = await fetch(`${API_URL}/gateways/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        gateway_id: 'LIVGW001',
        gateway_secret: '8F7K2M9Q'
      })
    });
    const claimData = await claimRes.json();
    console.log('Status:', claimRes.status);
    console.log('Response:', JSON.stringify(claimData, null, 2));

    console.log('\n4. Re-testing GET /api/dashboard/LIVGW001 after claim...');
    const dashRes2 = await fetch(`${API_URL}/dashboard/LIVGW001`, {
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    const dashData2 = await dashRes2.json();
    console.log('Status:', dashRes2.status);
    console.log('Response:', JSON.stringify(dashData2, null, 2));

    console.log('\n5. Re-testing POST /api/commands for LIV001 after claim...');
    const cmdRes2 = await fetch(`${API_URL}/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        gateway_id: 'LIVGW001',
        node_id: 'LIV001',
        command: 'PUMP_ON'
      })
    });
    const cmdData2 = await cmdRes2.json();
    console.log('Status:', cmdRes2.status);
    console.log('Response:', JSON.stringify(cmdData2, null, 2));
  });
}

checkLive();
