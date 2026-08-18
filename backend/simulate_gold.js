import fetch from 'node-fetch';

const GATEWAY_ID = 'LIVGW001';
const GATEWAY_SECRET = '8F7K2M9Q';
const API_URL = 'http://localhost:3000/api';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateGold() {
  console.log(`Starting GOLD ESP32 Simulation for ${GATEWAY_ID}...`);

  while (true) {
    try {
      // 1. Poll for pending commands
      const pollResponse = await fetch(`${API_URL}/commands/pending?gateway_id=${GATEWAY_ID}`, {
        headers: {
          'x-gateway-secret': GATEWAY_SECRET
        }
      });

      if (!pollResponse.ok) {
        console.error(`Polling failed with status ${pollResponse.status}`);
        await delay(5000);
        continue;
      }

      const pollResult = await pollResponse.json();

      if (pollResult.success && pollResult.data) {
        const { commandId, command, nodeId } = pollResult.data;
        console.log(`\n[ESP32] Received Command: ${command} for Node: ${nodeId || 'GATEWAY'}`);

        // 2. Simulate Execution Delay
        console.log(`[ESP32] Executing command...`);
        await delay(2000); // simulate hardware action

        let success = true;
        
        if (command === 'VALVE_ON' || command === 'VALVE_OFF') {
             console.log(`[ESP32] Forwarding ${command} to SILVER via ESP-NOW`);
             // simulate 10% chance of ESP-NOW failure
             if (Math.random() < 0.1) success = false;
        } else {
             console.log(`[ESP32] Toggling local pump relay`);
        }

        // 3. Acknowledge Command
        const ackResponse = await fetch(`${API_URL}/commands/${commandId}/ack`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gateway-secret': GATEWAY_SECRET
          },
          body: JSON.stringify({
              status: success ? 'acknowledged' : 'failed'
          })
        });

        const ackResult = await ackResponse.json();
        console.log(`[ESP32] ACK Sent: ${success ? 'acknowledged' : 'failed'}, Result:`, ackResult);

        // 4. Simulate Telemetry update for new state
        if (success) {
            console.log(`[ESP32] Sending updated telemetry to reflect new state...`);
            const telemetryBody = {
              gatewayId: GATEWAY_ID,
              gatewaySecret: GATEWAY_SECRET,
              timestamp: new Date().toISOString(),
              gateway: {
                status: 'online',
                pumpStatus: command === 'PUMP_ON' ? true : (command === 'PUMP_OFF' ? false : false),
                waterLevel: 50,
                battery: 90
              },
              nodes: [
                {
                  nodeId: 'LIV002',
                  status: 'online',
                  soilMoisture: 45,
                  temperature: 28.5,
                  humidity: 60,
                  valveStatus: command === 'VALVE_ON' ? true : (command === 'VALVE_OFF' ? false : false),
                  battery: 85
                }
              ]
            };

            await fetch(`${API_URL}/telemetry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(telemetryBody)
            });
            console.log(`[ESP32] Telemetry sent!`);
        }
      } else {
         // No command
         process.stdout.write('.');
      }
    } catch (err) {
      console.error('Simulation error:', err.message);
    }

    // Wait 5 seconds before next poll
    await delay(5000);
  }
}

simulateGold();
