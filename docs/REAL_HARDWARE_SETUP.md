# LIV Smart Irrigation Platform — Real Hardware Setup Guide

## 1. System Architecture

```
                     ┌───────────────┐
                     │      TTN      │
                     └───────▲───────┘
                             │
                     LoRaWAN │ (SX1276/RFM95, SPI)
                             │
                ┌────────────┴────────────┐
                │                         │
             GOLD ESP32               SILVER ESP32
             (LIV001)                 (LIV002)
                │                         │
                │ ESP-NOW (2.4 GHz)       │
                ├────────────────────────►│  (telemetry: SILVER → GOLD)
                │                         │
                │◄────────────────────────┤  (commands: GOLD → SILVER)
                │                         │
                │ HTTPS                   │
                ▼                         │
            Backend                      │
          (Render.com)                   │
                │                         │
          Supabase DB                    │
                │                         │
             Socket.IO                    │
                │                         │
                ▼                         │
             PWA                         │
          (Vercel)                       │
                                         │
                           GPIO 27 → Relay → Pump
                           (both nodes)
```

### Device Roles
| Device | Role | Communication | Node ID | TTN Device |
|--------|------|---------------|---------|------------|
| GOLD | Gateway + Sensor Node | Wi-Fi + ESP-NOW + LoRaWAN + HTTPS | LIV001 | liv-02 |
| SILVER | Remote Sensor Node | Wi-Fi (for ESP-NOW radio) + ESP-NOW + LoRaWAN | LIV002 | liv-01 |

### Communication Paths
1. **SILVER → GOLD**: ESP-NOW (sensor telemetry every 2 seconds)
2. **GOLD → Backend**: HTTPS POST (combined telemetry every 2 seconds)
3. **GOLD → SILVER**: ESP-NOW (relay commands from backend)
4. **Both → TTN**: LoRaWAN uplink (every 30 seconds)
5. **Backend → PWA**: Socket.IO (real-time telemetry updates)
6. **PWA → Backend → GOLD**: HTTP command → ESP-NOW relay control

---

## 2. Required Software

### Arduino IDE / ESP32 Core
| Component | Version | Notes |
|-----------|---------|-------|
| Arduino IDE | 2.x or 1.8.x | |
| ESP32 Arduino Core | **3.3.10** | Board Manager → esp32 by Espressif |

### Required Arduino Libraries
| Library | Purpose |
|---------|---------|
| MCCI LoRaWAN LMIC library | LoRaWAN/TTN communication |
| Adafruit SHT31 Library | Temperature/humidity sensor |
| Adafruit BusIO | I2C dependency for SHT31 |

### LMIC Configuration
Before compiling, you **must** configure the LMIC library for your region.

**File**: `<Arduino Libraries>/MCCI_LoRaWAN_LMIC_library/project_config/lmic_project_config.h`

```cpp
// Uncomment ONE of the following for your region:
// #define CFG_eu868 1    // Europe
// #define CFG_us915 1    // US
// #define CFG_au915 1    // Australia
#define CFG_in866 1       // India (most likely for this project)
// #define CFG_as923 1    // Asia

#define CFG_sx1276_radio 1  // RFM95 / SX1276 radio module
```

---

## 3. Hardware Configuration

### GOLD Node (LIV001 / Gateway)

#### File: `hardware/gold_firmware.ino`

| Variable | Line | Value | How to Get It |
|----------|------|-------|---------------|
| `WIFI_SSID` | 15 | `"hpt"` | Your Wi-Fi network name |
| `WIFI_PASSWORD` | 16 | `"praveen123"` | Your Wi-Fi password |
| `BACKEND_URL` | 18 | `"https://liv-backend-24qz.onrender.com"` | Your deployed backend URL |
| `GATEWAY_ID` | 19 | `"LIVGW001"` | Must match database gateway ID |
| `GATEWAY_SECRET` | 20 | `"8F7K2M9Q"` | Must match database gateway secret |
| `SILVER_MAC_ADDRESS` | 28 | `{0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}` | **Read from SILVER Serial output at boot** (see MAC Discovery below) |

#### LoRaWAN Keys (TTN Device: liv-02) — DO NOT CHANGE
| Key | Line | Value |
|-----|------|-------|
| `APPEUI` | 50 | `{ 0x10, 0x32, 0x54, 0x76, 0x98, 0xBA, 0xDC, 0xFE }` |
| `DEVEUI` | 53 | `{ 0xF6, 0x4A, 0x07, 0xD0, 0x7E, 0xD5, 0xB3, 0x70 }` |
| `APPKEY` | 56 | `{ 0x69, 0x4B, ... 0x5E, 0xBE }` |

#### LoRa SPI Pin Map — DO NOT CHANGE
| Pin | GPIO | Function |
|-----|------|----------|
| NSS | 15 | LoRa chip select |
| RST | 17 | LoRa reset |
| DIO0 | 4 | LoRa interrupt |
| DIO1 | 33 | LoRa interrupt |
| DIO2 | 32 | LoRa interrupt |
| SCK | 14 | SPI clock |
| MISO | 12 | SPI data in |
| MOSI | 13 | SPI data out |

---

### SILVER Node (LIV002 / Remote)

#### File: `hardware/silver_firmware.ino`

| Variable | Line | Value | How to Get It |
|----------|------|-------|---------------|
| `WIFI_SSID` | 31 | `"hpt"` | Same Wi-Fi as GOLD |
| `WIFI_PASSWORD` | 32 | `"praveen123"` | Same password as GOLD |
| `NODE_ID` | 33 | `"LIV002"` | Must match database node ID |
| `masterAddress` | 36 | `{0xE8, 0x9F, 0x6D, 0x5F, 0xE6, 0x70}` | **Read from GOLD Serial output at boot** |

#### LoRaWAN Keys (TTN Device: liv-01) — DO NOT CHANGE
| Key | Line | Value |
|-----|------|-------|
| `APPEUI` | 52 | `{ 0xEF, 0xCD, 0xAB, 0x89, 0x67, 0x45, 0x23, 0x01 }` |
| `DEVEUI` | 55 | `{ 0xF4, 0x4A, 0x07, 0xD0, 0x7E, 0xD5, 0xB3, 0x70 }` |
| `APPKEY` | 58 | `{ 0x75, 0x37, ... 0xDD, 0xA5 }` |

---

## 4. MAC Address Discovery Procedure

**This is the single most important step for ESP-NOW communication.**

### Step 1: Flash SILVER first
1. Open `silver_firmware.ino` in Arduino IDE
2. Select board: ESP32 Dev Module
3. Flash to SILVER ESP32
4. Open Serial Monitor at 115200 baud
5. Look for the line:
   ```
   -> SILVER MAC Address (give this to GOLD): XX:XX:XX:XX:XX:XX
   ```
6. Write down this 6-byte MAC address

### Step 2: Flash GOLD with SILVER's MAC
1. Open `gold_firmware.ino`
2. Update line 28 with SILVER's MAC:
   ```cpp
   uint8_t SILVER_MAC_ADDRESS[] = { 0xXX, 0xXX, 0xXX, 0xXX, 0xXX, 0xXX };
   ```
3. Flash to GOLD ESP32
4. Open Serial Monitor — confirm:
   ```
   -> GOLD MAC Address (give this to SILVER): YY:YY:YY:YY:YY:YY
   ```
5. Verify this matches `masterAddress` in SILVER firmware (line 36)

### Step 3: Verify both MACs match
| Config | Firmware File | Value Must Be |
|--------|--------------|---------------|
| GOLD's `SILVER_MAC_ADDRESS` | gold_firmware.ino:28 | SILVER's Wi-Fi MAC |
| SILVER's `masterAddress` | silver_firmware.ino:36 | GOLD's Wi-Fi MAC |

**Both devices must be on the same Wi-Fi network and will automatically use the same Wi-Fi channel.**

---

## 5. Backend Configuration

### Environment Variables (Render.com Dashboard)
| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |
| `JWT_SECRET` | (your secret) | Do NOT commit to repo |
| `SUPABASE_URL` | (your Supabase URL) | Do NOT commit to repo |
| `SUPABASE_SERVICE_ROLE_KEY` | (your key) | Do NOT commit to repo |
| `CORS_ORIGINS` | `https://your-frontend.vercel.app` | Frontend URL |
| `ENABLE_SOCKET_SIMULATOR` | `false` | **Must be false** for real hardware |
| `TANK_HEIGHT_CM` | `200` | Physical tank height |
| `TANK_MIN_DISTANCE_CM` | `10` | Sensor offset from top |

---

## 6. Frontend Configuration

### Environment Variables (Vercel Dashboard or `.env`)
| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://liv-backend-24qz.onrender.com` | Backend URL |
| `VITE_SOCKET_URL` | `https://liv-backend-24qz.onrender.com` | Same as API URL |
| `VITE_DEMO_MODE` | `false` | **Must be false** for real hardware |

---

## 7. TTN / LoRaWAN Configuration

### TTN Application Setup
Both GOLD and SILVER have their own TTN device registrations:

| Device | TTN Name | DevEUI (LSB) |
|--------|----------|---------------|
| GOLD | liv-02 | `F6:4A:07:D0:7E:D5:B3:70` |
| SILVER | liv-01 | `F4:4A:07:D0:7E:D5:B3:70` |

### TTN Payload Formatter (6 bytes — DO NOT CHANGE)
```
Byte 0: Temperature (int8_t, deg C)
Byte 1: Humidity (uint8_t, %)
Byte 2: Soil Moisture (uint8_t, %)
Byte 3: Water Level high byte (uint16_t, cm)
Byte 4: Water Level low byte
Byte 5: Relay/Pump state (0 or 1)
```

### LoRaWAN Parameters
| Parameter | Value |
|-----------|-------|
| Activation | OTAA |
| Region | IN866 (or configure as needed) |
| TX Interval | 30 seconds |
| Payload Size | 6 bytes |
| Downlink | 1 byte: 0x01 = Pump ON, 0x00 = Pump OFF |

---

## 8. Physical Wiring

### Both GOLD and SILVER
| Component | GPIO | Type |
|-----------|------|------|
| Relay (Pump) | 27 | OUTPUT, active-HIGH |
| Ultrasonic TRIG | 25 | OUTPUT |
| Ultrasonic ECHO | 26 | INPUT |
| Soil Moisture | 34 | ANALOG INPUT |
| Battery Monitor | 35 | ANALOG INPUT |
| SHT31 (I2C) | SDA/SCL | I2C, address 0x44 |
| LoRa Module | SPI (14,12,13,15) | See pin map above |

### Relay Safety
- GPIO 27 is explicitly set LOW at boot (relay OFF)
- Active-HIGH configuration: HIGH = relay ON = pump running
- Do NOT change relay polarity without verifying physical wiring

---

## 9. Flashing Procedure

1. Install Arduino IDE with ESP32 Core 3.3.10
2. Install required libraries (MCCI LMIC, Adafruit SHT31, Adafruit BusIO)
3. Configure LMIC region in `lmic_project_config.h`
4. Flash SILVER first (to get its MAC address)
5. Update GOLD's `SILVER_MAC_ADDRESS` with SILVER's MAC
6. Flash GOLD
7. Verify GOLD's printed MAC matches SILVER's `masterAddress`
8. If GOLD's MAC doesn't match, update SILVER's `masterAddress` and re-flash SILVER

---

## 10. Boot Verification

### GOLD Serial Output (expected)
```
--- Starting GOLD Node: TTN liv-02 + WiFi Gateway (LIV001) ---
Connecting to Wi-Fi.....
Wi-Fi Connected & sleep disabled!
-> Master IP Address for Browser: http://192.168.x.x
-> GOLD MAC Address (give this to SILVER): E8:9F:6D:5F:E6:70
-> Wi-Fi Channel: 6
[ESP-NOW] Initialized successfully
[ESP-NOW] SILVER peer added: XX:XX:XX:XX:XX:XX
Web server active!
--- Uplink Queued (liv-02 / GOLD) ---
EV_JOINING: Joining TTN...
```

### SILVER Serial Output (expected)
```
--- Starting SILVER Node: TTN liv-01 + WiFi Sensor Node ---
Node ID: LIV002
SILVER connecting to Wi-Fi.....
SILVER Wi-Fi connected & sleep disabled!
-> SILVER MAC Address (give this to GOLD): XX:XX:XX:XX:XX:XX
-> Wi-Fi Channel: 6
[ESP-NOW] GOLD peer added: E8:9F:6D:5F:E6:70
[ESP-NOW] SILVER broadcasting active!
--- Uplink Queued (liv-01 / SILVER) ---
EV_JOINING: Joining TTN...
```

---

## 11. Verification Checklist

### Test A — Firmware Compilation
- [ ] GOLD compiles without errors (ESP32 Core 3.3.10)
- [ ] SILVER compiles without errors (ESP32 Core 3.3.10)

### Test B — Wi-Fi
- [ ] GOLD connects to Wi-Fi (Serial shows IP address)
- [ ] SILVER connects to Wi-Fi (Serial shows MAC address)
- [ ] Both are on the same Wi-Fi channel

### Test C — ESP-NOW (SILVER to GOLD)
- [ ] GOLD shows `[ESP-NOW] Received data from SILVER (LIV002)`
- [ ] SILVER shows `ESP-NOW Delivery: SUCCESS`

### Test D — GOLD HTTP
- [ ] GOLD shows `[HTTP] Telemetry POST response: 200`

### Test E — LIV002 Online
- [ ] Backend shows LIV002 status: `"online"`
- [ ] Backend shows real sensor values (not zeros)

### Test F — TTN
- [ ] GOLD shows `EV_JOINED: Successfully Joined LoRaWAN!`
- [ ] SILVER shows `EV_JOINED: Successfully Joined LoRaWAN!`
- [ ] TTN console shows uplink data from both devices

### Test G — Manual GOLD Pump
- [ ] PWA -> Start Pump for LIV001 -> GPIO 27 relay activates

### Test H — Manual SILVER Pump
- [ ] PWA -> Start Pump for LIV002 -> GOLD forwards via ESP-NOW -> SILVER GPIO 27 activates

### Test I — Automatic Irrigation
- [ ] Existing soil threshold triggers relay automatically

### Test J — Real-time PWA
- [ ] Telemetry changes appear in PWA dashboard within seconds

---

## 12. Troubleshooting

### "SILVER Wi-Fi connected but LIV002 offline"
**Symptom**: SILVER boots and connects to Wi-Fi, but the backend shows LIV002 as offline with zero values.

**Possible Causes**:
1. **SILVER_MAC_ADDRESS in GOLD is wrong** — Most common cause. GOLD cannot receive ESP-NOW packets from SILVER.
2. **Wi-Fi channel mismatch** — Both must be on the same channel (automatic when using same SSID).
3. **ESP-NOW not initialized** — Check Serial for `[ESP-NOW] Initialized successfully`.

**What to Check**:
1. GOLD Serial: Look for `[ESP-NOW] Received data from SILVER` — if missing, MAC is wrong.
2. SILVER Serial: Look for `ESP-NOW Delivery: SUCCESS` or `FAIL`.
3. Compare MAC addresses: SILVER prints its MAC at boot, must match GOLD's `SILVER_MAC_ADDRESS`.
4. Both print Wi-Fi channel at boot, must be the same number.

**Expected Result**: GOLD should print received SILVER data every 2 seconds.

---

### "ESP-NOW send failed"
**Symptom**: SILVER Serial shows `ESP-NOW Delivery: FAIL`.

**Possible Causes**:
1. GOLD is not powered on or not on the same Wi-Fi channel.
2. `masterAddress` in SILVER does not match GOLD's actual MAC.
3. Distance between devices exceeds ESP-NOW range (~200m line-of-sight).

**What to Check**:
1. Verify GOLD is running and connected to the same Wi-Fi.
2. Compare GOLD's printed MAC with SILVER's `masterAddress`.
3. Move devices closer together for testing.

---

### "ESP-NOW peer not found"
**Symptom**: Serial shows `Failed to add SILVER peer` or `Failed to add GOLD peer`.

**Possible Causes**:
1. ESP-NOW initialization failed (Wi-Fi not properly set up).
2. MAC address array is malformed.

**What to Check**:
1. Ensure Wi-Fi connects before ESP-NOW init.
2. Verify MAC address is exactly 6 bytes.

---

### "TTN join failed"
**Symptom**: Serial shows `EV_JOINING: Joining TTN...` but never shows `EV_JOINED`.

**Possible Causes**:
1. **LMIC region not configured** — `lmic_project_config.h` must have the correct region defined.
2. **LoRa module not connected** — Check SPI wiring (GPIO 14, 12, 13, 15).
3. **TTN credentials wrong** — DevEUI/AppEUI/AppKey must match TTN console exactly.
4. **No LoRaWAN gateway in range** — Need a LoRaWAN gateway within ~5km.

**What to Check**:
1. Verify `lmic_project_config.h` has correct region and `CFG_sx1276_radio 1`.
2. Check physical SPI connections to LoRa module.
3. Verify TTN console shows the device with matching DevEUI.
4. Check TTN console for join requests.

---

### "TTN uplink failed"
**Symptom**: `EV_JOINED` appears but no data in TTN console.

**Possible Causes**:
1. Duty cycle limitation (LoRaWAN enforces 1% duty cycle).
2. `OP_TXRXPEND` appearing frequently — previous TX still in progress.

**What to Check**:
1. Wait 30+ seconds between uplinks (TX_INTERVAL = 30).
2. Check if Serial shows `OP_TXRXPEND: Pending transmit, skipping...`.

---

### "Wi-Fi connected but backend unavailable"
**Symptom**: GOLD connects to Wi-Fi but Serial shows `[HTTP] Telemetry POST failed`.

**Possible Causes**:
1. `BACKEND_URL` is incorrect or backend is down.
2. HTTPS certificate verification failing.
3. Backend CORS rejecting the request (unlikely for POST from ESP32).

**What to Check**:
1. Verify backend is running: `curl https://your-backend.onrender.com/health`
2. Check Serial for HTTP error messages.
3. Verify `BACKEND_URL` in firmware matches actual backend URL.

**Expected Result**: `[HTTP] Telemetry POST response: 200`

---

### "Backend receives GOLD but not SILVER"
**Symptom**: LIV001 data updates but LIV002 stays at zero.

**Root Cause**: ESP-NOW communication between SILVER and GOLD is not working.

**What to Check**:
1. Follow the "SILVER Wi-Fi connected but LIV002 offline" troubleshooting above.
2. The issue is between SILVER and GOLD, not between GOLD and backend.

---

### "Relay turns ON unexpectedly during boot"
**Symptom**: Pump activates briefly when ESP32 powers on.

**Possible Causes**:
1. GPIO 27 may float HIGH during ESP32 boot before `pinMode()` executes.
2. Relay module is active-LOW but firmware assumes active-HIGH.

**What to Check**:
1. Both firmware files set `digitalWrite(RELAY_PIN, LOW)` and `pinMode(RELAY_PIN, OUTPUT)` at the start of `setup()`.
2. Verify your relay module's active level matches the firmware (active-HIGH expected).
3. If using active-LOW relay, swap HIGH/LOW in `setRelay()` (GOLD) and command handler (SILVER).

---

### "Pump command acknowledged but relay does not change"
**Symptom**: PWA shows command sent/acknowledged, but physical pump does not activate.

**Possible Causes**:
1. For LIV001: Command reaches GOLD but `setRelay()` not called (check command string matching).
2. For LIV002: Command reaches GOLD but ESP-NOW delivery fails to SILVER.
3. Physical wiring issue: relay connected but pump circuit not completed.

**What to Check**:
1. GOLD Serial: Look for `Received Command: PUMP_ON` or `VALVE_ON`.
2. SILVER Serial: Look for `[ESP-NOW] Received Command: VALVE_ON`.
3. Check GPIO 27 voltage with multimeter.
4. Verify relay module clicks when toggled.

---

### "Relay changes but PWA does not update"
**Symptom**: Physical relay toggles but dashboard still shows old state.

**Possible Causes**:
1. Telemetry POST returning non-200 — data not reaching backend.
2. Socket.IO not connected — frontend not receiving real-time updates.
3. Frontend demo mode enabled (`VITE_DEMO_MODE=true`).

**What to Check**:
1. GOLD Serial: Verify `[HTTP] Telemetry POST response: 200`.
2. Browser DevTools Console: Check for Socket.IO connection.
3. Verify `VITE_DEMO_MODE=false` in frontend `.env`.
4. Wait 2-4 seconds for next telemetry cycle.

---

## 13. Security Notes

- Do **NOT** commit real Wi-Fi passwords, backend secrets, or Supabase keys to the repository.
- Firmware uses `client.setInsecure()` for HTTPS — this is acceptable for development but should use proper certificate pinning in production.
- Gateway secret is sent in the JSON body for telemetry and in HTTP headers for command polling.
- Serial output never prints Wi-Fi passwords, gateway secrets, or API keys.
- `VITE_DEMO_MODE=false` must remain set to ensure actual hardware telemetry is the source of truth.
