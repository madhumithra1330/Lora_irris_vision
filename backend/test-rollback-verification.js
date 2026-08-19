import express from 'express';
import http from 'http';
import telemetryRoutes from './routes/telemetry.js';
import { db } from './services/db.js';

const app = express();
app.use(express.json());
app.use('/api/telemetry', telemetryRoutes);

const server = http.createServer(app);

async function runRollbackVerification() {
  console.log('======================================================');
  console.log('       TELEMETRY ROLLBACK VERIFICATION TEST           ');
  console.log('======================================================\n');

  await new Promise(resolve => server.listen(3099, '127.0.0.1', resolve));
  const BASE_URL = 'http://127.0.0.1:3099';

  // 1. Post real hardware packet
  console.log('1. POSTing exact real hardware packet from GOLD...');
  const hardwarePacket = {
    gatewayId: "LIVGW001",
    gatewaySecret: "8F7K2M9Q",
    timestamp: new Date().toISOString(),
    gateway: {
      status: "online",
      pumpStatus: false,
      waterLevel: 100,
      battery: 0
    },
    nodes: [
      {
        nodeId: "LIV001",
        status: "online",
        soilMoisture: 30,
        temperature: 31.5,
        humidity: 57,
        valveStatus: false,
        battery: 0
      },
      {
        nodeId: "LIV002",
        status: "online",
        soilMoisture: 32,
        temperature: 31.2,
        humidity: 58,
        valveStatus: false,
        battery: 0
      }
    ]
  };

  const postRes = await fetch(`${BASE_URL}/api/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hardwarePacket)
  });
  const postData = await postRes.json();
  console.log('   POST status:', postRes.status);
  console.log('   POST response:', postData);

  // 2. GET /api/telemetry
  console.log('\n2. Calling GET /api/telemetry to verify stored canonical snapshot...');
  const getRes = await fetch(`${BASE_URL}/api/telemetry?gatewayId=LIVGW001`);
  const getData = await getRes.json();
  console.log('   GET status:', getRes.status);
  console.log('   GET response body:', JSON.stringify(getData, null, 2));

  server.close();

  console.log('\n3. Validating canonical fields and absence of duplicate or seeded values:');
  const node1 = getData.data.nodes.find(n => n.nodeId === 'LIV001');
  const node2 = getData.data.nodes.find(n => n.nodeId === 'LIV002');

  const hasDuplicate1 = ('soil_moisture' in node1) || ('valve_status' in node1);
  const hasDuplicate2 = ('soil_moisture' in node2) || ('valve_status' in node2);
  const hasSeedValues = node1.soilMoisture === 45 || node2.soilMoisture === 50;

  console.log(`   - LIV001 soilMoisture: ${node1.soilMoisture}% (Expected: 30) -> ${node1.soilMoisture === 30 ? 'PASS' : 'FAIL'}`);
  console.log(`   - LIV001 temperature: ${node1.temperature}°C (Expected: 31.5) -> ${node1.temperature === 31.5 ? 'PASS' : 'FAIL'}`);
  console.log(`   - LIV002 soilMoisture: ${node2.soilMoisture}% (Expected: 32) -> ${node2.soilMoisture === 32 ? 'PASS' : 'FAIL'}`);
  console.log(`   - LIV002 temperature: ${node2.temperature}°C (Expected: 31.2) -> ${node2.temperature === 31.2 ? 'PASS' : 'FAIL'}`);
  console.log(`   - Duplicate aliases (soil_moisture/valve_status) absent: ${!hasDuplicate1 && !hasDuplicate2 ? 'PASS' : 'FAIL'}`);
  console.log(`   - Hardcoded seed values (45/50) absent: ${!hasSeedValues ? 'PASS' : 'FAIL'}`);

  if (node1.soilMoisture === 30 && node2.soilMoisture === 32 && !hasDuplicate1 && !hasSeedValues) {
    console.log('\n======================================================');
    console.log('  ALL ROLLBACK VERIFICATIONS PASSED SUCCESSFULLY!    ');
    console.log('======================================================');
  } else {
    console.error('\nVerification failed.');
    process.exit(1);
  }
}

runRollbackVerification();
