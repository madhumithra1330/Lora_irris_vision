# LIV Smart Irrigation Platform — Hardware-to-Frontend Data Flow Guide

This document describes the end-to-end telemetry and command flow from physical hardware sensors to the PWA user interface.

---

## 1. Hardware Architecture
The physical system consists of two ESP32 microcontrollers:
- **GOLD ESP32 (LIVGW001 / LIV001)**: Central gateway node connected to local Wi-Fi, onboard SHT31, analog soil sensor, ultrasonic distance sensor (water level), 1-channel pump relay (GPIO 27), and SX1276 LoRaWAN radio.
- **SILVER ESP32 (LIV002)**: Remote field sensor node connected via ESP-NOW to GOLD, onboard SHT31, analog soil sensor, 1-channel pump relay (GPIO 27), and SX1276 LoRaWAN radio.

---

## 2. GOLD Role
GOLD acts as the central hub:
1. Reads its own local sensors (soil, temp, hum, water level distance, battery, relay state).
2. Receives ESP-NOW telemetry packets from SILVER (LIV002).
3. Assembles combined JSON payload containing gateway metrics, LIV001 metrics, and LIV002 metrics.
4. HTTP POSTs combined JSON to Backend (`/api/telemetry`) every 2 seconds.
5. Polls Backend (`/api/commands/pending?gateway_id=LIVGW001`) every 5 seconds for pending user commands.
6. Executes local relay commands for LIV001 or dispatches ESP-NOW commands to SILVER for LIV002.
7. Posts execution ACK back to Backend (`/api/commands/{id}/ack`).

---

## 3. SILVER Role
SILVER acts as a remote sensor node:
1. Reads local sensors every 2 seconds.
2. Sends struct payload to GOLD via ESP-NOW.
3. Listens for ESP-NOW command packets from GOLD.
4. Toggles local relay (GPIO 27) when `"VALVE_ON"` or `"VALVE_OFF"` command is received for `LIV002`.

---

## 4. ESP-NOW Data Flow
```
[ SILVER ESP32 ] --(ESP-NOW struct_message, 2s)--> [ GOLD ESP32 ]
```
- Struct contents: `nodeId` ("LIV002"), `temperature`, `humidity`, `soilMoisture`, `waterLevel`, `valveStatus`, `battery`.
- Timeout: If GOLD does not receive an ESP-NOW packet from SILVER for > 10 seconds, GOLD flags `node2Online = false` and sends `"status": "offline"` in JSON.

---

## 5. HTTP Telemetry Flow
```
[ GOLD ESP32 ] --(HTTPS POST /api/telemetry, 2s)--> [ Backend Server (Render) ]
```

---

## 6. Backend Telemetry Endpoint
- **URL**: `POST /api/telemetry`
- **Controller**: `backend/routes/telemetry.js`

---

## 7. Request Headers
```http
Content-Type: application/json
```

---

## 8. Exact Hardware JSON
```json
{
  "gatewayId": "LIVGW001",
  "gatewaySecret": "8F7K2M9Q",
  "timestamp": "uptime:1240",
  "gateway": {
    "status": "online",
    "pumpStatus": false,
    "waterLevel": 120,
    "battery": 95
  },
  "nodes": [
    {
      "nodeId": "LIV001",
      "status": "online",
      "soilMoisture": 32,
      "temperature": 30.5,
      "humidity": 58,
      "valveStatus": false,
      "battery": 95
    },
    {
      "nodeId": "LIV002",
      "status": "online",
      "soilMoisture": 45,
      "temperature": 29.2,
      "humidity": 62,
      "valveStatus": false,
      "battery": 82
    }
  ]
}
```

---

## 9. Backend Validation
1. Verifies payload structure (`gatewayId`, `gatewaySecret`, `timestamp`, `gateway`, `nodes` array).
2. Authenticates `gatewaySecret` against database (`gateways` table).
3. Converts ultrasonic distance (`gateway.waterLevel` in cm) to percentage (0–100%).
4. Generates server ISO timestamp (`new Date().toISOString()`) for consistent record keeping.

---

## 10. Database Mapping
- Updates `gateways` row (`status`, `pump_status`, `water_level`, `battery`, `last_seen`).
- Inserts row into `gateway_history`.
- Updates `nodes` rows for LIV001 and LIV002 (`status`, `soil_moisture`, `temperature`, `humidity`, `valve_status`, `battery`, `last_seen`).
- Inserts rows into `sensor_history`.

---

## 11. REST API Response
- Initial PWA load requests `GET /api/dashboard/{gatewayId}`.
- Returns current snapshot of gateway metrics and node array.

---

## 12. Socket.IO Event
Immediately after DB update, backend emits real-time events to connected PWA clients:
- `gateway:update` room `gateway:LIVGW001` with gateway payload.
- `node:update` room `gateway:LIVGW001` with node payload.

---

## 13. Frontend State Update
- PWA `useDashboard` hook receives Socket.IO events (`gateway:update`, `node:update`).
- Dynamically updates React Query cache (`['dashboard', 'LIVGW001']`).

---

## 14. Dashboard Rendering
- `WelcomeHeader`: Shows connection state and last sync timestamp.
- `FarmOverviewCard`: Renders summary statistics.
- `GatewayOverview`: Renders Tank Water Level (%), Gateway Battery (%), and Gateway Status.
- `DashboardPage` Node Selector: Renders selectable grid cards for LIV001 and LIV002.
- `NodeDetail`: Displays detailed metrics (Soil Moisture %, Temp °C, Humidity %, Battery %) for selected node.

---

## 15. Pump State Rendering
- Gateway Pump: Displayed in `GatewayOverview` & `PumpControl`. Displays ON (Running) or OFF (Stopped).
- Node Pump/Relay: Displayed in `NodeDetail`. Displays ON or OFF for selected node (LIV001 or LIV002).

---

## 16. Manual Command Flow
```
[ User clicks Start/Stop Pump in PWA ]
       │
       ▼
[ POST /api/commands ] --> DB inserts command with status='pending'
       │
       ▼
[ GOLD GET /api/commands/pending ] --> GOLD receives pending command
       │
       ├── If LIV001: setRelay(ON/OFF) locally
       └── If LIV002: esp_now_send(SILVER_MAC_ADDRESS, VALVE_ON/OFF)
       │
       ▼
[ POST /api/commands/{id}/ack ] --> DB updates command status='acknowledged'
       │
       ▼
[ Next Telemetry POST (2s) ] --> Firmware sends updated pumpStatus/valveStatus
       │
       ▼
[ Socket.IO node:update / gateway:update ] --> PWA UI reflects verified hardware state
```

---

## 17. Automatic Irrigation Flow
- Hardware firmware contains autonomous threshold logic.
- When soil moisture drops below threshold, firmware automatically calls `setRelay(true)` or toggles GPIO 27.
- On next telemetry post (within 2 seconds), firmware reports `pumpStatus: true` / `valveStatus: true`.
- Backend logs activity event ("Pump state changed to ON by hardware").
- Socket.IO broadcasts update -> PWA UI automatically turns green and displays ON.

---

## 18. Error Handling
- Invalid/malformed JSON: Backend returns 400 without crashing.
- Invalid secret: Backend returns 401.
- ESP-NOW MAC delivery failure: GOLD sends `{"status":"failed","error":"ESP-NOW MAC delivery failed"}` to ACK endpoint.
- Socket.IO disconnect: Frontend automatically reconnects and falls back to REST API polling / IndexedDB cache.

---

## 19. Offline Detection
- **Gateway Offline**: Backend checks `last_seen` timestamp. If > 5 minutes old, gateway is marked offline.
- **Node Offline**: GOLD firmware tracks `millis() - lastNode2Time`. If > 10 seconds without ESP-NOW packet from SILVER, GOLD sends `"status": "offline"` for LIV002.

---

## 20. Troubleshooting Guide
1. **LIV002 appears OFFLINE**:
   - Verify SILVER ESP32 is powered on.
   - Verify `SILVER_MAC_ADDRESS` in `gold_firmware.ino` matches SILVER's actual Wi-Fi STA MAC address.
2. **Commands not executing**:
   - Check GOLD Serial Monitor for `Received Command`.
   - Verify GOLD is connected to Wi-Fi and reaching backend URL.
3. **PWA shows Demo Mode**:
   - Ensure `VITE_DEMO_MODE=false` in `frontend/.env`.
   - Ensure `ENABLE_SOCKET_SIMULATOR=false` in `backend/.env`.
