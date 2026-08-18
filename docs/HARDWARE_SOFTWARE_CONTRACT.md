# LIV Smart Irrigation Platform — Hardware-Software Interface Contract

> **FIRMWARE IMMUTABILITY NOTICE**: This document represents the exact contract derived directly from the immutable firmware files `hardware/gold_firmware.ino` and `hardware/silver_firmware.ino`. The hardware firmware is the absolute source of truth.

---

## 1. GOLD (Gateway) → BACKEND Telemetry

### Protocol & Endpoint
- **Protocol**: HTTPS / HTTP POST
- **Endpoint**: `/api/telemetry`
- **Headers**: `Content-Type: application/json`
- **Interval**: 2000 ms (2 seconds)
- **Authentication**: `gatewaySecret` embedded in JSON body

### Request Body JSON Schema
```json
{
  "gatewayId": "LIVGW001",
  "gatewaySecret": "8F7K2M9Q",
  "timestamp": "uptime:NNNN",
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
      "soilMoisture": 30,
      "temperature": 30.8,
      "humidity": 55,
      "valveStatus": false,
      "battery": 95
    },
    {
      "nodeId": "LIV002",
      "status": "online",
      "soilMoisture": 45,
      "temperature": 29.5,
      "humidity": 60,
      "valveStatus": false,
      "battery": 80
    }
  ]
}
```

### Backend Response
- **200 OK**: `{"success": true, "message": "Telemetry processed successfully"}`
- **400 Bad Request**: Malformed payload
- **401 Unauthorized**: Invalid `gatewaySecret`
- **404 Not Found**: Unknown `gatewayId`

---

## 2. GOLD (Gateway) ← BACKEND Command Polling & ACK

### Pending Command Polling
- **Protocol**: HTTP GET
- **Endpoint**: `/api/commands/pending?gateway_id=LIVGW001`
- **Headers**: `x-gateway-secret: 8F7K2M9Q`
- **Interval**: 5000 ms (5 seconds)

#### Response when command pending:
```json
{
  "success": true,
  "data": {
    "commandId": "cmd_12345",
    "gatewayId": "LIVGW001",
    "nodeId": "LIV001",
    "command": "PUMP_ON"
  }
}
```
*When no command pending:* `{"success": true, "data": null}`

### Command Acknowledgement
- **Protocol**: HTTP POST
- **Endpoint**: `/api/commands/{commandId}/ack`
- **Headers**:
  - `Content-Type: application/json`
  - `x-gateway-secret: 8F7K2M9Q`
- **Body on success**: `{"status": "acknowledged"}`
- **Body on failure**: `{"status": "failed", "error": "ESP-NOW MAC delivery failed"}`

---

## 3. SILVER (Remote Node) → GOLD (Gateway) via ESP-NOW

### Telemetry Packet (2.4 GHz ESP-NOW)
- **Sender**: SILVER Node (MAC: `masterAddress` peer)
- **Receiver**: GOLD Node
- **Interval**: 2000 ms (2 seconds)

```cpp
typedef struct struct_message {
    char nodeId[10];       // "LIV002"
    float temperature;     // SHT31 sensor (deg C)
    uint8_t humidity;      // SHT31 sensor (%)
    uint8_t soilMoisture;   // Analog soil sensor (0-100%)
    uint16_t waterLevel;   // Ultrasonic distance (cm, internal)
    bool valveStatus;      // Relay state (digitalRead GPIO 27)
    uint8_t battery;       // Battery percentage (0-100%)
} struct_message;
```

---

## 4. GOLD (Gateway) → SILVER (Remote Node) via ESP-NOW

### Command Packet (2.4 GHz ESP-NOW)
- **Sender**: GOLD Node
- **Receiver**: SILVER Node (MAC: `SILVER_MAC_ADDRESS`)
- **Trigger**: Received `VALVE_ON`, `VALVE_OPEN`, `VALVE_OFF`, or `VALVE_CLOSE` for `LIV002` from backend

```cpp
typedef struct command_message {
    char nodeId[10];   // "LIV002"
    char command[16];  // "VALVE_ON" or "VALVE_OFF"
} command_message;
```

---

## 5. Field Mapping Matrix

| Hardware Field (Firmware) | Backend Body Field | Database Column | Frontend Property | UI Label |
|---------------------------|-------------------|-----------------|-------------------|----------|
| `gatewayId` | `gatewayId` | `gateways.id` | `gateway.gatewayId` | Gateway ID |
| `gateway.status` | `gateway.status` | `gateways.status` | `gateway.status` | Connection Status |
| `gateway.pumpStatus` | `gateway.pumpStatus` | `gateways.pump_status` | `gateway.pumpStatus` | Gateway Pump Status |
| `gateway.waterLevel` | `gateway.waterLevel` | `gateways.water_level` | `gateway.waterLevel` | Tank Level (%) |
| `gateway.battery` | `gateway.battery` | `gateways.battery` | `gateway.battery` | Gateway Battery |
| `nodes[0].nodeId` | `nodes[0].nodeId` | `nodes.id` (`LIV001`) | `node.nodeId` | Field Node ID |
| `nodes[0].status` | `nodes[0].status` | `nodes.status` | `node.status` | Node Status |
| `nodes[0].soilMoisture` | `nodes[0].soilMoisture` | `nodes.soil_moisture` | `node.soilMoisture` | Soil Moisture (%) |
| `nodes[0].temperature` | `nodes[0].temperature` | `nodes.temperature` | `node.temperature` | Temperature (°C) |
| `nodes[0].humidity` | `nodes[0].humidity` | `nodes.humidity` | `node.humidity` | Air Humidity (%) |
| `nodes[0].valveStatus` | `nodes[0].valveStatus` | `nodes.valve_status` | `node.valveStatus` | Pump / Relay Status |
| `nodes[0].battery` | `nodes[0].battery` | `nodes.battery` | `node.battery` | Sensor Battery (%) |
| `nodes[1].nodeId` | `nodes[1].nodeId` | `nodes.id` (`LIV002`) | `node.nodeId` | Field Node ID |
| `nodes[1].status` | `nodes[1].status` | `nodes.status` | `node.status` | Node Status |
| `nodes[1].soilMoisture` | `nodes[1].soilMoisture` | `nodes.soil_moisture` | `node.soilMoisture` | Soil Moisture (%) |
| `nodes[1].temperature` | `nodes[1].temperature` | `nodes.temperature` | `node.temperature` | Temperature (°C) |
| `nodes[1].humidity` | `nodes[1].humidity` | `nodes.humidity` | `node.humidity` | Air Humidity (%) |
| `nodes[1].valveStatus` | `nodes[1].valveStatus` | `nodes.valve_status` | `node.valveStatus` | Pump / Relay Status |
| `nodes[1].battery` | `nodes[1].battery` | `nodes.battery` | `node.battery` | Sensor Battery (%) |

---

## 6. Physical Actuator Clarification
- Both physical nodes feature a single **1-channel Relay (GPIO 27)** controlling an irrigation **Pump**.
- Telemetry carries `valveStatus` for node compatibility; in the software model and user interface, `valveStatus` represents the physical Relay / Pump state of that node.
