
async function test() {
  const baseUrl = 'http://localhost:3000';
  console.log('Testing GET /api/telemetry...');
  try {
    const getRes = await fetch(`${baseUrl}/api/telemetry`);
    console.log('GET /api/telemetry status:', getRes.status);
    const getData = await getRes.json();
    console.log('GET /api/telemetry response:', JSON.stringify(getData, null, 2));

    console.log('\nTesting POST /api/telemetry (Hardware Payload)...');
    const postPayload = {
      gatewayId: "LIVGW001",
      gatewaySecret: "8F7K2M9Q",
      timestamp: new Date().toISOString(),
      gateway: {
        status: "online",
        pumpStatus: false,
        waterLevel: 45,
        battery: 92
      },
      nodes: [
        {
          nodeId: "LIV001",
          status: "online",
          soilMoisture: 48,
          temperature: 29.1,
          humidity: 62,
          valveStatus: false,
          battery: 90
        },
        {
          nodeId: "LIV002",
          status: "online",
          soilMoisture: 52,
          temperature: 28.3,
          humidity: 60,
          valveStatus: false,
          battery: 88
        }
      ]
    };

    const postRes = await fetch(`${baseUrl}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload)
    });
    console.log('POST /api/telemetry status:', postRes.status);
    const postData = await postRes.json();
    console.log('POST /api/telemetry response:', JSON.stringify(postData, null, 2));

    console.log('\nTesting GET /api/telemetry after POST...');
    const getRes2 = await fetch(`${baseUrl}/api/telemetry?gatewayId=LIVGW001`);
    console.log('GET /api/telemetry status:', getRes2.status);
    const getData2 = await getRes2.json();
    console.log('GET /api/telemetry response:', JSON.stringify(getData2, null, 2));

  } catch (err) {
    console.error('Test error:', err.message);
  }
}

test();
