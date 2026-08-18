# LIV Smart Irrigation Platform - Real Hardware Setup Guide

This guide describes how to configure and deploy the LIV Smart Irrigation Platform using real hardware, ensuring end-to-end functionality across the ESP32 nodes, backend, and PWA frontend.

## 1. System Architecture

The LIV system consists of:
- **GOLD Node (LIV001):** The master gateway. It connects to the internet via Wi-Fi/HTTPS to communicate with the backend, and uses ESP-NOW to communicate with the SILVER node. It controls **Pump 1** via its local GPIO 27 relay.
- **SILVER Node (LIV002):** The secondary node. It communicates exclusively with GOLD via ESP-NOW. It controls **Pump 2** via its local GPIO 27 relay.
- **Backend:** Node.js/Express application hosted on Render, using Supabase for the database, and providing HTTPS APIs and Socket.IO for real-time telemetry.
- **Frontend:** React PWA hosted on Vercel, providing a user interface to monitor telemetry and manually control the pumps.
- **TTN / LoRaWAN:** Existing functionality runs parallel to HTTP. Do not modify the LoRaWAN configuration.

## 2. Backend Configuration

Deploy the backend to a hosting provider (e.g., Render).

Ensure the following environment variables are set in the deployed environment (do **not** commit these to source control):

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=YOUR_JWT_SECRET
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
CORS_ORIGINS=https://YOUR_FRONTEND_URL.vercel.app
ENABLE_SOCKET_SIMULATOR=false
```

## 3. Frontend Configuration

Deploy the frontend PWA to a hosting provider (e.g., Vercel).

Set the following environment variables in your deployment dashboard:

```env
VITE_API_URL=https://YOUR-BACKEND.onrender.com
VITE_SOCKET_URL=https://YOUR-BACKEND.onrender.com
VITE_DEMO_MODE=false
```

*Note: Ensure `VITE_DEMO_MODE` is explicitly set to `false` so that actual hardware telemetry is the source of truth.*

## 4. Hardware Configuration & Flashing

### GOLD Node (LIV001)

Open `hardware/gold_firmware.ino` and locate the configuration section. Update the following values:

- **Wi-Fi Credentials:**
  - `const char* ssid = "YOUR_WIFI_SSID";`
  - `const char* password = "YOUR_WIFI_PASSWORD";`
- **Backend URL:**
  - `const char* serverUrl = "https://YOUR-BACKEND.onrender.com";`
- **Gateway Authentication:**
  - `const String GATEWAY_ID = "YOUR_GATEWAY_ID";`
  - `const String GATEWAY_SECRET = "YOUR_GATEWAY_SECRET";`
- **SILVER MAC Address:**
  - `uint8_t silverAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};` *(Replace with the actual MAC address of the SILVER ESP32)*

**Flashing:** Connect the GOLD ESP32 to your computer and flash `gold_firmware.ino`.

### SILVER Node (LIV002)

Open `hardware/silver_firmware.ino` and locate the configuration section. Update the following values:

- **Wi-Fi Credentials (if required for base setup):**
  - `const char* ssid = "YOUR_WIFI_SSID";`
  - `const char* password = "YOUR_WIFI_PASSWORD";`
- **Node ID:**
  - `const String NODE_ID = "LIV002";`
- **GOLD MAC Address:**
  - `uint8_t masterAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};` *(Replace with the actual MAC address of the GOLD ESP32)*

**Flashing:** Connect the SILVER ESP32 to your computer and flash `silver_firmware.ino`.

## 5. Physical Wiring & Connections

- **GOLD (LIV001):**
  - Connect the relay control pin to **GPIO 27**.
  - Connect the relay output to the power circuit for **Pump 1**.
  - Connect soil moisture, temperature, and humidity sensors to their respective pins as defined in the firmware.
- **SILVER (LIV002):**
  - Connect the relay control pin to **GPIO 27**.
  - Connect the relay output to the power circuit for **Pump 2**.
  - Connect its sensors similarly.

## 6. Verification Checklist

After deploying the backend, frontend, and flashing both nodes, perform the following physical verification:

- [ ] **Initial State:** Both GOLD and SILVER boot with their relays OFF.
- [ ] **Telemetry:** SILVER successfully transmits telemetry to GOLD via ESP-NOW. GOLD successfully transmits combined telemetry to the backend via HTTPS.
- [ ] **PWA Display:** The frontend dashboard displays real telemetry data without any "Demo" terminology.
- [ ] **LIV001 Manual Control:** Clicking "Start Pump" for LIV001 turns ON the GOLD GPIO 27 relay and Pump 1. Clicking "Stop Pump" turns it OFF. The UI updates to reflect the telemetry confirmation.
- [ ] **LIV002 Manual Control:** Clicking "Start Pump" for LIV002 sends a command through GOLD via ESP-NOW to SILVER, turning ON the SILVER GPIO 27 relay and Pump 2. Clicking "Stop Pump" turns it OFF. The UI updates to reflect the telemetry confirmation.
- [ ] **Automatic Irrigation:** The existing firmware soil-moisture thresholds correctly trigger the relays automatically without frontend intervention.
- [ ] **LoRaWAN / TTN:** The existing LoRaWAN uplinks and downlinks continue to function normally.

## 7. Security Notes

- Do **not** commit real Wi-Fi passwords, backend URLs, or Supabase keys to the repository.
- Use HTTPS for all communications between GOLD and the backend. The hardware uses `WiFiClientSecure`, which handles encrypted traffic.
- The `VITE_DEMO_MODE=false` flag must remain to ensure actual telemetry is the single source of truth for the farmer's dashboard.
