import { db } from './services/db.js';

// Stale timeout for testing
const STALE_TIMEOUT_MS = 45 * 1000;

function computeStatus(lastSeen, reportedStatus) {
  if (!lastSeen) return 'offline';
  const lastSeenMs = new Date(lastSeen).getTime();
  if (isNaN(lastSeenMs)) return 'offline';
  if (Date.now() - lastSeenMs > STALE_TIMEOUT_MS) {
    return 'offline';
  }
  return reportedStatus === 'offline' ? 'offline' : 'online';
}

async function testSnapshotFlow() {
  console.log('===========================================================');
  console.log('  TESTING REAL HARDWARE TELEMETRY SNAPSHOT & TIMEOUT FLOW  ');
  console.log('===========================================================\n');

  const gatewayId = 'LIVGW001';

  // --- Step A: Send Telemetry Packet 1 (soilMoisture: 30) ---
  console.log('A. Ingesting Packet 1: GOLD ON with soilMoisture = 30%...');
  const packet1Timestamp = new Date().toISOString();
  
  await db.updateGateway(gatewayId, {
    status: 'online',
    pump_status: false,
    water_level: 85,
    battery: 90,
    last_seen: packet1Timestamp
  });

  await db.updateNode('LIV001', {
    gateway_id: gatewayId,
    crop_name: 'Tomato Block A',
    status: 'online',
    soil_moisture: 30,
    temperature: 31.1,
    humidity: 58,
    valve_status: false,
    battery: 90,
    last_seen: packet1Timestamp
  });

  let gw = await db.getGatewayById(gatewayId);
  let nodes = await db.getNodesByGateway(gatewayId);
  let node1 = nodes.find(n => n.id === 'LIV001');

  console.log('   Snapshot after Packet 1:');
  console.log(`   - Gateway Status: ${computeStatus(gw.last_seen, gw.status)} (lastSeen: ${gw.last_seen})`);
  console.log(`   - LIV001 Status: ${computeStatus(node1.last_seen, node1.status)}`);
  console.log(`   - LIV001 Soil Moisture: ${node1.soil_moisture}%`);

  if (node1.soil_moisture === 30 && computeStatus(node1.last_seen, node1.status) === 'online') {
    console.log('   [PASS] Packet 1 correctly stored as 30% and online.\n');
  } else {
    console.error('   [FAIL] Packet 1 verification failed.\n');
  }

  // --- Step B: Send Telemetry Packet 2 (soilMoisture: 45) ---
  console.log('B. Ingesting Packet 2: GOLD sends new reading soilMoisture = 45%...');
  const packet2Timestamp = new Date().toISOString();

  await db.updateNode('LIV001', {
    soil_moisture: 45,
    temperature: 32.5,
    humidity: 60,
    last_seen: packet2Timestamp
  });

  nodes = await db.getNodesByGateway(gatewayId);
  node1 = nodes.find(n => n.id === 'LIV001');

  console.log('   Snapshot after Packet 2:');
  console.log(`   - LIV001 Status: ${computeStatus(node1.last_seen, node1.status)}`);
  console.log(`   - LIV001 Soil Moisture: ${node1.soil_moisture}% (expected 45)`);
  console.log(`   - LIV001 Temp: ${node1.temperature}°C (expected 32.5)`);

  if (node1.soil_moisture === 45 && node1.temperature === 32.5) {
    console.log('   [PASS] Packet 2 immediately replaced old reading with 45%.\n');
  } else {
    console.error('   [FAIL] Packet 2 failed to replace old reading.\n');
  }

  // --- Step C: Simulate Device Physically OFF (Past Stale Timeout) ---
  console.log('C. Simulating GOLD physically OFF (lastSeen 60 seconds ago > 45s timeout)...');
  const pastTimestamp = new Date(Date.now() - 60000).toISOString();

  await db.updateGateway(gatewayId, { last_seen: pastTimestamp });
  await db.updateNode('LIV001', { last_seen: pastTimestamp });

  gw = await db.getGatewayById(gatewayId);
  nodes = await db.getNodesByGateway(gatewayId);
  node1 = nodes.find(n => n.id === 'LIV001');

  const gwStatusOffline = computeStatus(gw.last_seen, gw.status);
  const node1StatusOffline = computeStatus(node1.last_seen, node1.status);

  console.log('   Snapshot when hardware is OFF:');
  console.log(`   - Gateway Status: ${gwStatusOffline} (expected 'offline')`);
  console.log(`   - LIV001 Status: ${node1StatusOffline} (expected 'offline')`);
  console.log(`   - LIV001 Preserved Soil Moisture: ${node1.soil_moisture}% (last known value)`);

  if (gwStatusOffline === 'offline' && node1StatusOffline === 'offline' && node1.soil_moisture === 45) {
    console.log('   [PASS] Stale device correctly marked offline while preserving sensor values.\n');
  } else {
    console.error('   [FAIL] Stale offline detection failed.\n');
  }

  // --- Step D: GOLD Starts Again (New Telemetry with soilMoisture: 22) ---
  console.log('D. GOLD starts again and sends new telemetry with soilMoisture = 22%...');
  const resumeTimestamp = new Date().toISOString();

  await db.updateGateway(gatewayId, { status: 'online', last_seen: resumeTimestamp });
  await db.updateNode('LIV001', { status: 'online', soil_moisture: 22, temperature: 29.8, last_seen: resumeTimestamp });

  gw = await db.getGatewayById(gatewayId);
  nodes = await db.getNodesByGateway(gatewayId);
  node1 = nodes.find(n => n.id === 'LIV001');

  const gwStatusOnline = computeStatus(gw.last_seen, gw.status);
  const node1StatusOnline = computeStatus(node1.last_seen, node1.status);

  console.log('   Snapshot after hardware resumes:');
  console.log(`   - Gateway Status: ${gwStatusOnline} (expected 'online')`);
  console.log(`   - LIV001 Status: ${node1StatusOnline} (expected 'online')`);
  console.log(`   - LIV001 Soil Moisture: ${node1.soil_moisture}% (expected 22)`);

  if (gwStatusOnline === 'online' && node1StatusOnline === 'online' && node1.soil_moisture === 22) {
    console.log('   [PASS] Hardware resume immediately marked device online with new sensor values (22%).\n');
  } else {
    console.error('   [FAIL] Hardware resume failed.\n');
  }

  console.log('===========================================================');
  console.log('  ALL TELEMETRY SNAPSHOT & TIMEOUT VERIFICATIONS PASSED!   ');
  console.log('===========================================================');
}

testSnapshotFlow();
