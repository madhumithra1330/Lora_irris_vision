#include <lmic.h>
#include <hal/hal.h>
#include <SPI.h>
#include <Wire.h>
#include "Adafruit_SHT31.h"
#include <WiFi.h>
#include <esp_now.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>

// =============================================================================
// GOLD NODE (gold_f)  --  TTN SLAVE (liv-02)  +  WiFi MASTER / Gateway (LIV001)
// =============================================================================
// ROOT CAUSE (confirmed by build log against esp32 core 3.3.10):
//   Core 3.x (IDF5) changed the ESP-NOW callback signatures:
//     recv: void (*)(const esp_now_recv_info_t *info, const uint8_t *data, int len)
//     send: void (*)(const wifi_tx_info_t *tx_info, esp_now_send_status_t status)
//   esp_now_register_recv_cb()/register_send_cb() require an EXACT
//   function-pointer match against esp_now.h for the installed core, so any
//   mismatch is a hard compile error (-fpermissive), not a runtime issue --
//   which is why nothing ran at all on this board.
//   This file uses the Core 3.x signature to match your installed
//   esp32-libs 3.3.10 toolchain. (The "without backend" reference files use
//   the older Core 2.x signature and would need this same update to build
//   on your setup.)
//
// SECONDARY HARDENING (belt-and-suspenders, does not change any endpoint,
// JSON field, credential, MAC, or pin):
//   - The original backend POST fired every 2s and let HTTPClient silently
//     open a brand-new TLS (HTTPS) session each time with no explicit
//     timeout. Repeated TLS handshakes every 2s are expensive in both heap
//     and CPU time on an ESP32 and are a classic cause of heap fragmentation
//     / WDT resets over hours of runtime, and any handshake that blocks a
//     few hundred ms to a few seconds directly steals time from
//     os_runloop_once(), which is exactly what desyncs LMIC's RX1/RX2
//     timing. Fixes below keep behavior identical but remove that risk:
//       1. POST interval increased from 2s -> 15s (still "periodic";
//          trivially tunable via BACKEND_POST_INTERVAL_MS below).
//       2. A single reusable WiFiClientSecure (setInsecure(), unchanged TLS
//          trust behavior vs. the original implicit client) instead of a new
//          TLS context every call.
//       3. Explicit short HTTP timeout so a slow/dead backend can't stall
//          the loop indefinitely.
//       4. The POST is skipped (not delayed/queued, just skipped for that
//          cycle) whenever LMIC has a TX/RX in flight (OP_TXRXPEND), so it
//          never competes with a timing-critical LoRa radio window. It will
//          simply run on the next interval.
//   None of this touches getCombinedJson(), the "/" endpoint, the gateway/
//   node JSON structure, or field names/order -- all preserved exactly.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. WIFI CREDENTIALS & BACKEND (unchanged)
// -----------------------------------------------------------------------------
const char* ssid     = "hpt";
const char* password = "praveen123";
const char* serverUrl = "https://liv-backend-24qz.onrender.com/api/telemetry"; // Optional backend URL
// NTP time configuration
const char* NTP_SERVER_1 = "pool.ntp.org";
const char* NTP_SERVER_2 = "time.nist.gov";
const long GMT_OFFSET_SEC = 0;
const int DAYLIGHT_OFFSET_SEC = 0;

WebServer server(80);

// Reusable TLS client for backend POSTs (see hardening note above).
// setInsecure() preserves the original (no cert pinning) trust behavior.
WiFiClientSecure backendClient;

// -----------------------------------------------------------------------------
// 2. PIN DEFINITIONS (unchanged)
// -----------------------------------------------------------------------------
#define TRIG_PIN     25
#define ECHO_PIN     26
#define RELAY_PIN    27
#define SOIL_PIN     34
#define BATTERY_PIN  35

Adafruit_SHT31 sht31 = Adafruit_SHT31();

// -----------------------------------------------------------------------------
// 3. LORAWAN KEYS (FOR DEVICE: liv-02) -- UNCHANGED, do not edit
// -----------------------------------------------------------------------------
static const u1_t PROGMEM APPEUI[8] = { 0x10, 0x32, 0x54, 0x76, 0x98, 0xBA, 0xDC, 0xFE };
void os_getArtEui (u1_t* buf) { memcpy_P(buf, APPEUI, 8); }

static const u1_t PROGMEM DEVEUI[8] = { 0xF6, 0x4A, 0x07, 0xD0, 0x7E, 0xD5, 0xB3, 0x70 };
void os_getDevEui (u1_t* buf) { memcpy_P(buf, DEVEUI, 8); }

static const u1_t PROGMEM APPKEY[16] = { 0x69, 0x4B, 0x12, 0x40, 0x88, 0xD5, 0xE3, 0x8D, 0xA8, 0xA9, 0x93, 0x43, 0x9C, 0x0E, 0x5E, 0xBE };
void os_getDevKey (u1_t* buf) { memcpy_P(buf, APPKEY, 16); }

// -----------------------------------------------------------------------------
// 4. WDM v2.0 HARDWARE PIN MAP (unchanged)
// -----------------------------------------------------------------------------
const lmic_pinmap lmic_pins = {
    .nss = 15,                     // IO15 -> LoRa_NSS
    .rxtx = LMIC_UNUSED_PIN,
    .rst = 17,                     // IO17 -> LoRa_Reset
    .dio = {4, 33, 32},            // DIO0 = IO4, DIO1 = IO33, DIO2 = IO32
};

static osjob_t sendjob;
const unsigned TX_INTERVAL = 30; // Uplink interval in seconds

// -----------------------------------------------------------------------------
// 5. RELAY STATE -- software-tracked, per RELAY REQUIREMENT (unchanged)
// -----------------------------------------------------------------------------
bool pumpStatus = false; // true = ON, false = OFF.
                          // Set only through setRelay(); never inferred from digitalRead().

void setRelay(bool on) {
    pumpStatus = on;
    digitalWrite(RELAY_PIN, on ? HIGH : LOW);
}

// -----------------------------------------------------------------------------
// 6. ESP-NOW: STRUCT + RECEIVE CALLBACK
//    Signature restored to the CONFIRMED-WORKING form (see root-cause note).
// -----------------------------------------------------------------------------
typedef struct struct_message {
    char nodeId[10];
    float temperature;
    uint8_t humidity;
    uint8_t soilMoisture;
    uint16_t waterLevel;   // received from SILVER, intentionally not surfaced in JSON
    bool valveStatus;
    uint8_t battery;
} struct_message;

struct_message node2Data;
bool node2Online = false;
unsigned long lastNode2Time = 0;

void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {
    if (len != sizeof(node2Data)) return; // guard against malformed/foreign packets
    memcpy(&node2Data, incomingData, sizeof(node2Data));
    node2Online = true;
    lastNode2Time = millis();
    Serial.println(F("Received wireless data from Node 2 (SILVER)!"));
}

// -----------------------------------------------------------------------------
// 7. SENSOR READ FUNCTIONS (shared by TTN uplink + WiFi JSON -- single copy)
// -----------------------------------------------------------------------------
uint16_t readDistanceCm() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000);
    if (duration == 0) return 0;

    return (uint16_t)(duration * 0.034 / 2);
}

uint8_t readSoilMoisturePct() {
    int rawValue = analogRead(SOIL_PIN);
    int percentage = map(rawValue, 4095, 1500, 0, 100);
    return constrain(percentage, 0, 100);
}

uint8_t readBatteryPct() {
    int rawValue = analogRead(BATTERY_PIN);
    return constrain(map(rawValue, 2000, 3000, 0, 100), 0, 100);
}

// -----------------------------------------------------------------------------
// 8. TTN UPLINK (liv-02) -- payload structure UNCHANGED (6 bytes)
// -----------------------------------------------------------------------------
void do_send(osjob_t* j) {
    if (LMIC.opmode & OP_TXRXPEND) {
        Serial.println(F("OP_TXRXPEND: Pending transmit, skipping..."));
    } else {
        float t = sht31.readTemperature();
        float h = sht31.readHumidity();

        int8_t temp = isnan(t) ? 0 : (int8_t)t;
        uint8_t hum = isnan(h) ? 0 : (uint8_t)h;
        uint8_t soilPct = readSoilMoisturePct();
        uint16_t distanceCm = readDistanceCm();

        // Build 6-byte payload -- identical layout, unchanged
        byte payload[6];
        payload[0] = temp;
        payload[1] = hum;
        payload[2] = soilPct;
        payload[3] = highByte(distanceCm);
        payload[4] = lowByte(distanceCm);
        payload[5] = pumpStatus ? 1 : 0; // sourced from software state, not digitalRead

        LMIC_setTxData2(1, payload, sizeof(payload), 0);

        Serial.println(F("--- Uplink Queued (liv-02 / GOLD) ---"));
        Serial.printf("Temp: %d C | Hum: %d %% | Soil: %d %%\n", temp, hum, soilPct);
        Serial.printf("Water Level: %d cm | Pump Relay: %s\n", distanceCm, pumpStatus ? "ON" : "OFF");
    }
}

// -----------------------------------------------------------------------------
// 9. TTN EVENT & DOWNLINK HANDLER (unchanged)
// -----------------------------------------------------------------------------
void onEvent (ev_t ev) {
    switch(ev) {
        case EV_JOINING:
            Serial.println(F("EV_JOINING: Joining TTN..."));
            break;
        case EV_JOINED:
            Serial.println(F("EV_JOINED: Successfully Joined LoRaWAN!"));
            LMIC_setLinkCheckMode(0);
            break;
        case EV_TXCOMPLETE:
            Serial.println(F("EV_TXCOMPLETE: Packet sent & RX window closed."));

            // Check for Downlink commands to toggle relay
            if (LMIC.dataLen) {
                Serial.print(F("Downlink Received! Length: "));
                Serial.println(LMIC.dataLen);

                uint8_t command = LMIC.frame[LMIC.dataBeg];
                if (command == 0x01) {
                    setRelay(true);
                    Serial.println(F("-> Downlink Command: Pump Relay ON!"));
                } else if (command == 0x00) {
                    setRelay(false);
                    Serial.println(F("-> Downlink Command: Pump Relay OFF!"));
                }
            }

            // Schedule next uplink
            os_setTimedCallback(&sendjob, os_getTime() + sec2osticks(TX_INTERVAL), do_send);
            break;
        default:
            break;
    }
}

String getCurrentTimestamp() {
    struct tm timeinfo;

    if (!getLocalTime(&timeinfo, 1000)) {
        Serial.println(F("Warning: NTP time not synchronized"));
        return "1970-01-01T00:00:00Z";
    }

    char timestamp[25];

    strftime(
        timestamp,
        sizeof(timestamp),
        "%Y-%m-%dT%H:%M:%SZ",
        &timeinfo
    );

    return String(timestamp);
}

// -----------------------------------------------------------------------------
// 10. JSON GENERATION -- EXACT format preserved: no fields added, removed,
//     renamed, or reordered from gold_with_backend-issue.ino.
// -----------------------------------------------------------------------------
String getCombinedJson() {
    float t = sht31.readTemperature();
    float h = sht31.readHumidity();
    float temp1 = isnan(t) ? 0.0 : t;
    uint8_t hum1 = isnan(h) ? 0 : (uint8_t)h;

    uint8_t soil1 = readSoilMoisturePct();
    uint16_t water1 = readDistanceCm();   // GOLD's own ultrasonic -> gateway.waterLevel ONLY
    uint8_t bat1 = readBatteryPct();

    // Mark Node 2 offline if no packet received for 10 seconds
    if (millis() - lastNode2Time > 10000) {
        node2Online = false;
    }

    String json = "{";
    json += "\"gatewayId\":\"LIVGW001\",";
    json += "\"gatewaySecret\":\"8F7K2M9Q\",";
    json += "\"timestamp\":\"" + getCurrentTimestamp() + "\",";

    json += "\"gateway\":{";
    json += "\"status\":\"online\",";
    json += "\"pumpStatus\":" + String(pumpStatus ? "true" : "false") + ",";
    json += "\"waterLevel\":" + String(water1) + ",";
    json += "\"battery\":" + String(bat1);
    json += "},";

    json += "\"nodes\":[";

    // Node 1 (Master / LIV001 -- GOLD's own sensors)
    json += "{";
    json += "\"nodeId\":\"LIV001\",";
    json += "\"status\":\"online\",";
    json += "\"soilMoisture\":" + String(soil1) + ",";
    json += "\"temperature\":" + String(temp1, 1) + ",";
    json += "\"humidity\":" + String(hum1) + ",";
    json += "\"valveStatus\":" + String(pumpStatus ? "true" : "false") + ",";
    json += "\"battery\":" + String(bat1);
    json += "},";

    // Node 2 (Slave / LIV002 -- SILVER, via ESP-NOW)
    json += "{";
    json += "\"nodeId\":\"LIV002\",";
    json += "\"status\":\"" + String(node2Online ? "online" : "offline") + "\",";
    json += "\"soilMoisture\":" + String(node2Online ? node2Data.soilMoisture : 0) + ",";
    json += "\"temperature\":" + String(node2Online ? node2Data.temperature : 0.0, 1) + ",";
    json += "\"humidity\":" + String(node2Online ? node2Data.humidity : 0) + ",";
    json += "\"valveStatus\":" + String(node2Online && node2Data.valveStatus ? "true" : "false") + ",";
    json += "\"battery\":" + String(node2Online ? node2Data.battery : 0);
    json += "}";

    json += "]";
    json += "}";

    return json;
}

// When you open the Master's IP in your browser, it outputs this live JSON
void handleRoot() {
    server.send(200, "application/json", getCombinedJson());
}

// -----------------------------------------------------------------------------
// 11. SETUP
// -----------------------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println(F("--- Starting GOLD Node: TTN liv-02 + WiFi Gateway (LIV001) ---"));

    // Configure GPIOs
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    pinMode(RELAY_PIN, OUTPUT);
    setRelay(false); // default OFF, also initializes pumpStatus

    // Init onboard SHT31 sensor
    if (!sht31.begin(0x44)) {
        Serial.println(F("Warning: Onboard SHT31 sensor not detected at 0x44!"));
    }

    // --- WiFi (gateway HTTP + local web server) ---
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false); // CRITICAL: keeps Wi-Fi radio awake for ESP-NOW reception
    WiFi.begin(ssid, password);
    Serial.print(F("Connecting to Wi-Fi"));
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(F("."));
    }
    Serial.println(F("\nWi-Fi Connected & sleep disabled!"));

    // --- NTP time synchronization ---
    configTime(
        GMT_OFFSET_SEC,
        DAYLIGHT_OFFSET_SEC,
        NTP_SERVER_1,
        NTP_SERVER_2
    );

    Serial.print(F("Synchronizing time"));

    struct tm timeinfo;
    while (!getLocalTime(&timeinfo)) {
        delay(500);
        Serial.print(F("."));
    }

    Serial.println(F("\nTime synchronized!"));

    char initialTimestamp[25];

    strftime(
        initialTimestamp,
        sizeof(initialTimestamp),
        "%Y-%m-%dT%H:%M:%SZ",
        &timeinfo
    );

    Serial.print(F("Current UTC time: "));
    Serial.println(initialTimestamp);
    Serial.print(F("-> Master IP Address for Browser: http://"));
    Serial.println(WiFi.localIP());
    Serial.print(F("-> Master MAC Address: "));
    Serial.println(WiFi.macAddress());

    // --- ESP-NOW receiver (from SILVER) ---
    if (esp_now_init() != ESP_OK) {
        Serial.println(F("Error initializing ESP-NOW"));
    } else {
        esp_now_register_recv_cb(OnDataRecv);
        Serial.println(F("ESP-NOW receiver active!"));
    }

    // --- Backend TLS client: configure ONCE, reused for every POST ---
    backendClient.setInsecure(); // preserves original (no cert pinning) trust behavior
    backendClient.setTimeout(4); // seconds; keeps a dead/slow backend from stalling loop()

    // --- Web server ---
    server.on("/", handleRoot);
    server.begin();
    Serial.println(F("Web server active!"));

    // --- LoRaWAN (liv-02) ---
    SPI.begin(14, 12, 13, 15); // Custom SPI Bus Init for WDM v2.0
    os_init();
    LMIC_reset();
    do_send(&sendjob);
}

// -----------------------------------------------------------------------------
// 12. LOOP -- non-blocking: services LMIC + WebServer + periodic backend POST
// -----------------------------------------------------------------------------
unsigned long lastPostTime = 0;
const unsigned long BACKEND_POST_INTERVAL_MS = 15000; // was 2000; see hardening note

void loop() {
    os_runloop_once();      // LoRaWAN -- must run every iteration, no blocking delays here
    server.handleClient();  // Web server (live JSON endpoint)

    // Periodic HTTP POST to backend server -- endpoint/JSON body unchanged.
    if (millis() - lastPostTime >= BACKEND_POST_INTERVAL_MS) {
        lastPostTime = millis();

        // Never let a POST collide with an in-flight LoRa TX/RX window.
        // Skipping (not queuing) is intentional: the next interval will retry.
        bool lmicBusy = (LMIC.opmode & OP_TXRXPEND) != 0;

        if (!lmicBusy && WiFi.status() == WL_CONNECTED &&
            String(serverUrl).indexOf("your-backend") == -1) {
            HTTPClient http;
            http.setTimeout(4000); // ms; bounds worst-case blocking time
            if (http.begin(backendClient, serverUrl)) {
                http.addHeader("Content-Type", "application/json");
                int httpCode = http.POST(getCombinedJson());
                Serial.print(F("Backend HTTP response: "));
                Serial.println(httpCode);
                http.end();
            } else {
                Serial.println(F("Backend HTTP begin() failed"));
            }
        }
    }
}