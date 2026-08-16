// ==========================================
// LIV Smart Irrigation Platform - Admin Demo Service
// ==========================================

const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
const minutesAgo = (m) => new Date(now.getTime() - m * 60 * 1000);
const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);

// 1. Demo Farmers
export const mockFarmers = [
  { id: 'f1', name: 'Suresh Patel', phone: '+919876543210', email: 'suresh.patel@farm.com', created_at: daysAgo(60).toISOString(), status: 'active' },
  { id: 'f2', name: 'Anita Desai', phone: '+919876543211', email: 'anita.desai@farm.com', created_at: daysAgo(55).toISOString(), status: 'active' },
  { id: 'f3', name: 'Vikram Singh', phone: '+919876543212', email: 'vikram.singh@farm.com', created_at: daysAgo(45).toISOString(), status: 'inactive' },
  { id: 'f4', name: 'Lakshmi Reddy', phone: '+919876543213', email: 'lakshmi.reddy@farm.com', created_at: daysAgo(30).toISOString(), status: 'active' },
  { id: 'f5', name: 'Mohan Yadav', phone: '+919876543214', email: 'mohan.yadav@farm.com', created_at: daysAgo(20).toISOString(), status: 'active' }
];

// 2. Demo Gateways (Central Nodes)
export const mockGateways = [
  { id: 'LIVGW001', name: 'Patel Farm - North Block', secret: 'SEC-GW001-XYZ', farmer_id: 'f1', status: 'online', pump_status: true, water_level: 82.5, battery: 94.3, firmware: '2.1.0', last_seen: minutesAgo(2).toISOString(), created_at: daysAgo(58).toISOString(), updated_at: minutesAgo(2).toISOString() },
  { id: 'LIVGW002', name: 'Patel Farm - South Block', secret: 'SEC-GW002-XYZ', farmer_id: 'f1', status: 'online', pump_status: false, water_level: 65.0, battery: 88.1, firmware: '2.1.0', last_seen: minutesAgo(5).toISOString(), created_at: daysAgo(50).toISOString(), updated_at: minutesAgo(5).toISOString() },
  { id: 'LIVGW003', name: 'Desai Organic Farm', secret: 'SEC-GW003-XYZ', farmer_id: 'f2', status: 'online', pump_status: false, water_level: 71.2, battery: 91.7, firmware: '2.0.5', last_seen: minutesAgo(3).toISOString(), created_at: daysAgo(53).toISOString(), updated_at: minutesAgo(3).toISOString() },
  { id: 'LIVGW004', name: 'Singh Farm', secret: 'SEC-GW004-XYZ', farmer_id: 'f3', status: 'offline', pump_status: false, water_level: 15.8, battery: 18.4, firmware: '1.9.2', last_seen: hoursAgo(6).toISOString(), created_at: daysAgo(43).toISOString(), updated_at: hoursAgo(6).toISOString() },
  { id: 'LIVGW005', name: 'Reddy Farm - Drip Section', secret: 'SEC-GW005-XYZ', farmer_id: 'f4', status: 'online', pump_status: false, water_level: 90.3, battery: 97.8, firmware: '2.1.0', last_seen: minutesAgo(1).toISOString(), created_at: daysAgo(28).toISOString(), updated_at: minutesAgo(1).toISOString() },
  { id: 'LIVGW006', name: 'Yadav Farm', secret: 'SEC-GW006-XYZ', farmer_id: 'f5', status: 'online', pump_status: true, water_level: 55.6, battery: 78.9, firmware: '2.0.5', last_seen: minutesAgo(4).toISOString(), created_at: daysAgo(18).toISOString(), updated_at: minutesAgo(4).toISOString() }
];

// 3. Demo Nodes (Field Nodes)
export const mockNodes = [
  { id: 'LIV001', gateway_id: 'LIVGW001', crop_name: 'Tomato Field A', soil_moisture: 62.3, temperature: 31.5, humidity: 68.2, valve_status: false, battery: 89.4, status: 'online', last_seen: minutesAgo(2).toISOString(), created_at: daysAgo(57).toISOString(), updated_at: minutesAgo(2).toISOString() },
  { id: 'LIV002', gateway_id: 'LIVGW001', crop_name: 'Cotton Block 1', soil_moisture: 45.1, temperature: 33.2, humidity: 55.9, valve_status: true, battery: 76.2, status: 'online', last_seen: minutesAgo(3).toISOString(), created_at: daysAgo(57).toISOString(), updated_at: minutesAgo(3).toISOString() },
  { id: 'LIV003', gateway_id: 'LIVGW001', crop_name: 'Wheat Section', soil_moisture: 71.8, temperature: 29.1, humidity: 72.4, valve_status: false, battery: 92.1, status: 'online', last_seen: minutesAgo(2).toISOString(), created_at: daysAgo(56).toISOString(), updated_at: minutesAgo(2).toISOString() },

  { id: 'LIV004', gateway_id: 'LIVGW002', crop_name: 'Rice Paddy', soil_moisture: 85.4, temperature: 30.0, humidity: 80.1, valve_status: false, battery: 81.3, status: 'online', last_seen: minutesAgo(5).toISOString(), created_at: daysAgo(49).toISOString(), updated_at: minutesAgo(5).toISOString() },
  { id: 'LIV005', gateway_id: 'LIVGW002', crop_name: 'Sugarcane', soil_moisture: 58.9, temperature: 32.4, humidity: 65.7, valve_status: true, battery: 67.5, status: 'online', last_seen: minutesAgo(6).toISOString(), created_at: daysAgo(48).toISOString(), updated_at: minutesAgo(6).toISOString() },

  { id: 'LIV006', gateway_id: 'LIVGW003', crop_name: 'Organic Tomato', soil_moisture: 55.2, temperature: 28.7, humidity: 74.3, valve_status: false, battery: 95.0, status: 'online', last_seen: minutesAgo(3).toISOString(), created_at: daysAgo(52).toISOString(), updated_at: minutesAgo(3).toISOString() },
  { id: 'LIV007', gateway_id: 'LIVGW003', crop_name: 'Chilli Garden', soil_moisture: 42.7, temperature: 34.1, humidity: 51.2, valve_status: true, battery: 83.6, status: 'online', last_seen: minutesAgo(4).toISOString(), created_at: daysAgo(51).toISOString(), updated_at: minutesAgo(4).toISOString() },
  { id: 'LIV008', gateway_id: 'LIVGW003', crop_name: 'Onion Bed', soil_moisture: 38.1, temperature: 30.5, humidity: 59.8, valve_status: false, battery: 71.2, status: 'online', last_seen: minutesAgo(3).toISOString(), created_at: daysAgo(50).toISOString(), updated_at: minutesAgo(3).toISOString() },

  { id: 'LIV009', gateway_id: 'LIVGW004', crop_name: 'Potato Field', soil_moisture: 50.3, temperature: 26.8, humidity: 62.0, valve_status: false, battery: 18.5, status: 'offline', last_seen: hoursAgo(6).toISOString(), created_at: daysAgo(42).toISOString(), updated_at: hoursAgo(6).toISOString() },
  { id: 'LIV010', gateway_id: 'LIVGW004', crop_name: 'Maize Block', soil_moisture: 33.7, temperature: 27.5, humidity: 58.4, valve_status: false, battery: 25.1, status: 'offline', last_seen: hoursAgo(7).toISOString(), created_at: daysAgo(41).toISOString(), updated_at: hoursAgo(7).toISOString() },

  { id: 'LIV011', gateway_id: 'LIVGW005', crop_name: 'Mango Orchard', soil_moisture: 68.5, temperature: 35.2, humidity: 70.1, valve_status: false, battery: 96.3, status: 'online', last_seen: minutesAgo(1).toISOString(), created_at: daysAgo(27).toISOString(), updated_at: minutesAgo(1).toISOString() },
  { id: 'LIV012', gateway_id: 'LIVGW005', crop_name: 'Groundnut', soil_moisture: 52.1, temperature: 33.8, humidity: 63.5, valve_status: false, battery: 88.7, status: 'online', last_seen: minutesAgo(2).toISOString(), created_at: daysAgo(26).toISOString(), updated_at: minutesAgo(2).toISOString() },
  { id: 'LIV013', gateway_id: 'LIVGW005', crop_name: 'Turmeric Plot', soil_moisture: 74.9, temperature: 31.0, humidity: 76.8, valve_status: true, battery: 90.2, status: 'online', last_seen: minutesAgo(1).toISOString(), created_at: daysAgo(25).toISOString(), updated_at: minutesAgo(1).toISOString() },

  { id: 'LIV014', gateway_id: 'LIVGW006', crop_name: 'Soybean Field', soil_moisture: 41.6, temperature: 36.5, humidity: 48.3, valve_status: true, battery: 73.4, status: 'online', last_seen: minutesAgo(4).toISOString(), created_at: daysAgo(17).toISOString(), updated_at: minutesAgo(4).toISOString() },
  { id: 'LIV015', gateway_id: 'LIVGW006', crop_name: 'Brinjal Patch', soil_moisture: 57.3, temperature: 34.8, humidity: 55.1, valve_status: false, battery: 82.0, status: 'online', last_seen: minutesAgo(5).toISOString(), created_at: daysAgo(16).toISOString(), updated_at: minutesAgo(5).toISOString() }
];

// 4. Demo Activities
export const mockActivities = [
  { id: 'a1', type: 'pump', message: 'Pump turned ON at Patel Farm - North Block', gateway_id: 'LIVGW001', node_id: null, farmer_id: 'f1', farmer_name: 'Suresh Patel', gateway_name: 'Patel Farm - North Block', created_at: minutesAgo(15).toISOString() },
  { id: 'a2', type: 'valve', message: 'Valve opened on Cotton Block 1 at Patel Farm - North Block', gateway_id: 'LIVGW001', node_id: 'LIV002', farmer_id: 'f1', farmer_name: 'Suresh Patel', gateway_name: 'Patel Farm - North Block', node_name: 'Cotton Block 1', created_at: minutesAgo(45).toISOString() },
  { id: 'a3', type: 'connectivity', message: 'Gateway LIVGW005 connected', gateway_id: 'LIVGW005', node_id: null, farmer_id: 'f4', farmer_name: 'Lakshmi Reddy', gateway_name: 'Reddy Farm - Drip Section', created_at: hoursAgo(1).toISOString() },
  { id: 'a4', type: 'pump', message: 'Pump turned OFF at Desai Organic Farm', gateway_id: 'LIVGW003', node_id: null, farmer_id: 'f2', farmer_name: 'Anita Desai', gateway_name: 'Desai Organic Farm', created_at: hoursAgo(2).toISOString() },
  { id: 'a5', type: 'connectivity', message: 'Gateway LIVGW004 disconnected', gateway_id: 'LIVGW004', node_id: null, farmer_id: 'f3', farmer_name: 'Vikram Singh', gateway_name: 'Singh Farm', created_at: hoursAgo(6).toISOString() },
  { id: 'a6', type: 'valve', message: 'Valve closed on Soybean Field at Yadav Farm', gateway_id: 'LIVGW006', node_id: 'LIV014', farmer_id: 'f5', farmer_name: 'Mohan Yadav', gateway_name: 'Yadav Farm', node_name: 'Soybean Field', created_at: hoursAgo(12).toISOString() },
  { id: 'a7', type: 'pump', message: 'Pump turned ON at Yadav Farm', gateway_id: 'LIVGW006', node_id: null, farmer_id: 'f5', farmer_name: 'Mohan Yadav', gateway_name: 'Yadav Farm', created_at: daysAgo(1).toISOString() }
];

// 5. Demo Alerts
export const mockAlerts = [
  { id: 'al1', type: 'offline', severity: 'critical', gateway_id: 'LIVGW004', node_id: null, farmer_id: 'f3', farmer_name: 'Vikram Singh', gateway_name: 'Singh Farm', node_name: 'Unknown', message: 'Gateway LIVGW004 is offline for over 6 hours', resolved: false, created_at: hoursAgo(6).toISOString() },
  { id: 'al2', type: 'low_battery', severity: 'critical', gateway_id: 'LIVGW004', node_id: 'LIV009', farmer_id: 'f3', farmer_name: 'Vikram Singh', gateway_name: 'Singh Farm', node_name: 'Potato Field', message: 'Node LIV009 battery critically low (18.5%)', resolved: false, created_at: hoursAgo(5).toISOString() },
  { id: 'al3', type: 'low_water', severity: 'warning', gateway_id: 'LIVGW004', node_id: null, farmer_id: 'f3', farmer_name: 'Vikram Singh', gateway_name: 'Singh Farm', node_name: 'Unknown', message: 'Water level low at Singh Farm (15.8%)', resolved: false, created_at: hoursAgo(5).toISOString() },
  { id: 'al4', type: 'low_moisture', severity: 'warning', gateway_id: 'LIVGW004', node_id: 'LIV010', farmer_id: 'f3', farmer_name: 'Vikram Singh', gateway_name: 'Singh Farm', node_name: 'Maize Block', message: 'Soil moisture critically low on Maize Block (33.7%)', resolved: false, created_at: hoursAgo(4).toISOString() },
  { id: 'al5', type: 'low_moisture', severity: 'warning', gateway_id: 'LIVGW003', node_id: 'LIV008', farmer_id: 'f2', farmer_name: 'Anita Desai', gateway_name: 'Desai Organic Farm', node_name: 'Onion Bed', message: 'Soil moisture low on Onion Bed (38.1%)', resolved: false, created_at: hoursAgo(3).toISOString() }
];

// Simulation engine for frontend updates in Demo Mode
let demoInterval = null;

export function startDemoSimulation(onUpdate) {
  if (demoInterval) return () => {};

  const tick = () => {
    // Pick a random online gateway to update
    const onlineGws = mockGateways.filter(g => g.status === 'online');
    if (onlineGws.length === 0) return;

    const gw = onlineGws[Math.floor(Math.random() * onlineGws.length)];
    
    // Drift water level
    const waterDrift = gw.pump_status ? -0.4 : (Math.random() > 0.6 ? 0.2 : -0.1);
    gw.water_level = Math.max(10, Math.min(100, +(gw.water_level + waterDrift).toFixed(1)));
    gw.battery = Math.max(10, +(gw.battery - 0.01).toFixed(2));
    gw.updated_at = new Date().toISOString();

    onUpdate({
      type: 'gateway:update',
      data: {
        gatewayId: gw.id,
        status: gw.status,
        pumpStatus: gw.pump_status,
        waterLevel: gw.water_level,
        battery: gw.battery,
        lastSeen: gw.last_seen,
        timestamp: gw.updated_at
      }
    });

    // Update nodes under this gateway
    const gwNodes = mockNodes.filter(n => n.gateway_id === gw.id && n.status === 'online');
    gwNodes.forEach(node => {
      // Drift moisture
      const moistureDrift = node.valve_status ? 1.8 : -0.3;
      node.soil_moisture = Math.max(10, Math.min(99, +(node.soil_moisture + moistureDrift).toFixed(1)));
      node.temperature = +(node.temperature + (Math.random() - 0.5) * 0.2).toFixed(1);
      node.humidity = Math.max(20, Math.min(100, +(node.humidity + (Math.random() - 0.5) * 0.4).toFixed(1)));
      node.battery = Math.max(10, +(node.battery - 0.02).toFixed(2));
      node.updated_at = new Date().toISOString();

      onUpdate({
        type: 'node:update',
        data: {
          gatewayId: gw.id,
          nodeId: node.id,
          soilMoisture: node.soil_moisture,
          temperature: node.temperature,
          humidity: node.humidity,
          valveStatus: node.valve_status,
          battery: node.battery,
          status: node.status,
          timestamp: node.updated_at
        }
      });
    });
  };

  demoInterval = setInterval(tick, 5000);
  return () => {
    if (demoInterval) {
      clearInterval(demoInterval);
      demoInterval = null;
    }
  };
}
