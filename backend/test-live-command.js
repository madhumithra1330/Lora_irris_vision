const API_URL = 'https://liv-backend-24qz.onrender.com/api';

async function testCommand() {
  console.log('Testing Command on live backend...\n');

  // 1. Authenticate as Farmer_0394
  const otpRes = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919876540394', token: '123456' })
  });
  const otpData = await otpRes.json();
  const token = otpData.data?.session?.access_token;
  console.log('Token obtained for farmer:', otpData.data?.user?.id);

  // 2. Test send command PUMP_ON for LIV001
  console.log('\n2. Testing POST /api/commands for LIV001 with PUMP_ON...');
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
  console.log('Command 1 response status:', cmdRes1.status);
  console.log('Command 1 response body:', JSON.stringify(cmdData1, null, 2));

  // 3. Test send command VALVE_ON for LIV002
  console.log('\n3. Testing POST /api/commands for LIV002 with VALVE_ON...');
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
  console.log('Command 2 response status:', cmdRes2.status);
  console.log('Command 2 response body:', JSON.stringify(cmdData2, null, 2));

  // 4. Test polling pending commands (as hardware GOLD does)
  console.log('\n4. Polling GET /api/commands/pending?gateway_id=LIVGW001 (as hardware)...');
  const pollRes = await fetch(`${API_URL}/commands/pending?gateway_id=LIVGW001`, {
    headers: {
      'x-gateway-secret': '8F7K2M9Q'
    }
  });
  const pollData = await pollRes.json();
  console.log('Poll response status:', pollRes.status);
  console.log('Poll response body:', JSON.stringify(pollData, null, 2));

  // 5. If pending command exists, test ACK
  if (pollData.data && pollData.data.commandId) {
    const cmdId = pollData.data.commandId;
    console.log(`\n5. Testing POST /api/commands/${cmdId}/ack...`);
    const ackRes = await fetch(`${API_URL}/commands/${cmdId}/ack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-secret': '8F7K2M9Q'
      },
      body: JSON.stringify({
        status: 'executed',
        gateway_secret: '8F7K2M9Q'
      })
    });
    const ackData = await ackRes.json();
    console.log('ACK response status:', ackRes.status);
    console.log('ACK response body:', JSON.stringify(ackData, null, 2));
  }
}

testCommand();
