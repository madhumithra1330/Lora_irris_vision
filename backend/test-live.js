const API_URL = 'https://liv-backend-24qz.onrender.com/api';

async function testClaim() {
  console.log('Testing Claim on live backend...\n');

  const otpRes = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876540394', token: '123456' })
  });
  const otpData = await otpRes.json();
  const token = otpData.data?.session?.access_token;
  console.log('Token obtained.');

  console.log('Attempting POST /api/gateways/claim with secret 8F7K2M9Q...');
  const claimRes = await fetch(`${API_URL}/gateways/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ gateway_id: 'LIVGW001', gateway_secret: '8F7K2M9Q' })
  });
  const claimData = await claimRes.json();
  console.log('Claim response status:', claimRes.status);
  console.log('Claim response body:', JSON.stringify(claimData, null, 2));

  console.log('\nChecking GET /api/gateways/my again...');
  const gwRes = await fetch(`${API_URL}/gateways/my`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const gwData = await gwRes.json();
  console.log('Gateways/my status:', gwRes.status);
  console.log('Gateways/my body:', JSON.stringify(gwData, null, 2));

  console.log('\nChecking GET /api/dashboard/LIVGW001 again...');
  const dashRes = await fetch(`${API_URL}/dashboard/LIVGW001`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dashData = await dashRes.json();
  console.log('Dashboard status:', dashRes.status);
  console.log('Dashboard body:', JSON.stringify(dashData, null, 2));
}

testClaim();
