#include <lmic.h>
#include <hal/hal.h>
#include <SPI.h>
#include <Wire.h>
#include "Adafruit_SHT31.h"
#include <WiFi.h>
#include <esp_now.h>

// =============================================================================
// SILVER NODE  --  TTN MASTER (liv-01)  +  WiFi SLAVE / Sensor Node
// =============================================================================
// Merges:
//   - master.txt (TTN LoRaWAN uplink/downlink for device liv-01)
//   - wifi.txt "silver" section (ESP-NOW sender to GOLD)
//
// Unchanged: DevEUI/AppEUI/AppKey, LoRa pin map, LMIC config, 6-byte payload
// structure, WiFi SSID/password, GOLD's ESP-NOW MAC address, relay pin logic.
//
// Changed: the original loop() used a blocking delay(2000) around the
// ESP-NOW send. That would stall LMIC's os_runloop_once() and break
// LoRaWAN timing once TTN and WiFi run on the same core, so it has been
// replaced with a non-blocking millis()-based timer. Duplicate sensor-read
// functions and the duplicate SHT31 object have been merged into single
// copies. A battery pin/read (from wifi.txt) was added since the ESP-NOW
// struct needs it; the TTN payload is unaffected.
// =============================================================================

// =============================================================================
// REQUIRED HARDWARE CONFIGURATION - YOU MUST FILL THESE BEFORE FLASHING
// =============================================================================
const char* WIFI_SSID     = "hpt";
const char* WIFI_PASSWORD = "praveen123";
const char* NODE_ID       = "LIV002"; // Must match node_id in backend

// MUST REPLACE WITH ACTUAL MAC ADDRESS OF GOLD NODE
uint8_t masterAddress[] = {0xE8, 0x9F, 0x6D, 0x5F, 0xE6, 0x70};

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
// 3. LORAWAN KEYS (FOR DEVICE: liv-01) -- UNCHANGED from master.txt
// -----------------------------------------------------------------------------
static const u1_t PROGMEM APPEUI[8] = { 0xEF, 0xCD, 0xAB, 0x89, 0x67, 0x45, 0x23, 0x01 };
void os_getArtEui (u1_t* buf) { memcpy_P(buf, APPEUI, 8); }

static const u1_t PROGMEM DEVEUI[8] = { 0xF4, 0x4A, 0x07, 0xD0, 0x7E, 0xD5, 0xB3, 0x70 };
void os_getDevEui (u1_t* buf) { memcpy_P(buf, DEVEUI, 8); }

static const u1_t PROGMEM APPKEY[16] = { 0x75, 0x37, 0x05, 0x67, 0xB5, 0x8B, 0x08, 0x8C, 0xB8, 0xCA, 0x62, 0x69, 0xCD, 0xB7, 0xDD, 0xA5 };
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
// 5. ESP-NOW: STRUCT + SEND CALLBACK (from wifi.txt silver section)
// -----------------------------------------------------------------------------
typedef struct struct_message {
    char nodeId[10];
    float temperature;
    uint8_t humidity;
    uint8_t soilMoisture;
    uint16_t waterLevel;   // sent to GOLD but intentionally unused in gateway JSON
    bool valveStatus;
    uint8_t battery;
} struct_message;

struct_message myData;

void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
    if (status == ESP_NOW_SEND_SUCCESS) {
        Serial.println(F("ESP-NOW Delivery: SUCCESS"));
    } else {
        Serial.println(F("ESP-NOW Delivery: FAIL"));
    }
}

// Command message from GOLD
typedef struct command_message {
    char nodeId[10];
    char command[16];
} command_message;

// ESP32 Core 3.x callback signature for ESP-NOW receive
void OnCommandRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {
    if (len == sizeof(command_message)) {
        command_message cmdData;
        memcpy(&cmdData, incomingData, sizeof(cmdData));
        Serial.print(F("[ESP-NOW] Received Command: "));
        Serial.print(cmdData.command);
        Serial.print(F(" for Node: "));
        Serial.println(cmdData.nodeId);
        
        if (strcmp(cmdData.nodeId, NODE_ID) != 0) {
            Serial.println(F("[ESP-NOW] Command ignored: wrong node"));
            return; // Do not execute valve relay
        }
        
        if (strcmp(cmdData.command, "VALVE_ON") == 0 || strcmp(cmdData.command, "VALVE_OPEN") == 0) {
            digitalWrite(RELAY_PIN, HIGH);
            Serial.println(F("[RELAY] Valve Relay turned ON"));
        } else if (strcmp(cmdData.command, "VALVE_OFF") == 0 || strcmp(cmdData.command, "VALVE_CLOSE") == 0) {
            digitalWrite(RELAY_PIN, LOW);
            Serial.println(F("[RELAY] Valve Relay turned OFF"));
        }
    } else {
        Serial.printf("[ESP-NOW] Unexpected data length: %d bytes (expected cmd: %d)\n", len, (int)sizeof(command_message));
    }
}

// -----------------------------------------------------------------------------
// 6. SENSOR READ FUNCTIONS (shared by TTN uplink + ESP-NOW send -- single copy)
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
// 7. TTN UPLINK (liv-01) -- payload structure UNCHANGED (6 bytes)
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
        uint8_t relayState = digitalRead(RELAY_PIN); // unchanged -- SILVER relay behavior preserved as-is

        // Build 6-byte payload -- identical layout to master.txt/slave.txt
        byte payload[6];
        payload[0] = temp;
        payload[1] = hum;
        payload[2] = soilPct;
        payload[3] = highByte(distanceCm);
        payload[4] = lowByte(distanceCm);
        payload[5] = relayState;

        LMIC_setTxData2(1, payload, sizeof(payload), 0);

        Serial.println(F("--- Uplink Queued (liv-01 / SILVER) ---"));
        Serial.printf("Temp: %d C | Hum: %d %% | Soil: %d %%\n", temp, hum, soilPct);
        Serial.printf("Water Level: %d cm | Pump Relay: %s\n", distanceCm, relayState ? "ON" : "OFF");
    }
}

// -----------------------------------------------------------------------------
// 8. TTN EVENT & DOWNLINK HANDLER (unchanged from master.txt)
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

            if (LMIC.dataLen) {
                Serial.print(F("Downlink Received! Length: "));
                Serial.println(LMIC.dataLen);

                uint8_t command = LMIC.frame[LMIC.dataBeg];
                if (command == 0x01) {
                    digitalWrite(RELAY_PIN, HIGH);
                    Serial.println(F("-> Downlink Command: Pump Relay ON!"));
                } else if (command == 0x00) {
                    digitalWrite(RELAY_PIN, LOW);
                    Serial.println(F("-> Downlink Command: Pump Relay OFF!"));
                }
            }

            os_setTimedCallback(&sendjob, os_getTime() + sec2osticks(TX_INTERVAL), do_send);
            break;
        default:
            break;
    }
}

// -----------------------------------------------------------------------------
// 9. ESP-NOW SEND -- non-blocking replacement for the original delay(2000) loop
// -----------------------------------------------------------------------------
unsigned long lastEspNowSend = 0;
const unsigned long ESPNOW_INTERVAL_MS = 2000;

void sendEspNowUpdate() {
    float t = sht31.readTemperature();
    float h = sht31.readHumidity();

    strcpy(myData.nodeId, "LIV002");
    myData.temperature = isnan(t) ? 0.0 : t;
    myData.humidity = isnan(h) ? 0 : (uint8_t)h;
    myData.soilMoisture = readSoilMoisturePct();
    myData.waterLevel = readDistanceCm(); // sent to GOLD, not used in the gateway JSON
    myData.valveStatus = digitalRead(RELAY_PIN);
    myData.battery = readBatteryPct();

    esp_now_send(masterAddress, (uint8_t *) &myData, sizeof(myData));
}

// -----------------------------------------------------------------------------
// 10. SETUP
// -----------------------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println(F("--- Starting SILVER Node: TTN liv-01 + WiFi Sensor Node ---"));
    Serial.print(F("Node ID: "));
    Serial.println(NODE_ID);

    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW); // Default OFF

    if (!sht31.begin(0x44)) {
        Serial.println(F("Warning: Onboard SHT31 sensor not detected at 0x44!"));
    }

    // --- WiFi (needed for the ESP-NOW radio) ---
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false); // CRITICAL: keeps Wi-Fi radio awake for ESP-NOW
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print(F("SILVER connecting to Wi-Fi"));
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(F("."));
    }
    Serial.println(F("\nSILVER Wi-Fi connected & sleep disabled!"));
    Serial.print(F("-> SILVER MAC Address (give this to GOLD): "));
    Serial.println(WiFi.macAddress());
    Serial.print(F("-> Wi-Fi Channel: "));
    Serial.println(WiFi.channel());

    // --- ESP-NOW sender/receiver (to/from GOLD) ---
    if (esp_now_init() != ESP_OK) {
        Serial.println(F("ESP-NOW init failed"));
    } else {
        esp_now_register_send_cb(OnDataSent);
        esp_now_register_recv_cb(OnCommandRecv);

        esp_now_peer_info_t peerInfo = {};
        memcpy(peerInfo.peer_addr, masterAddress, 6);
        peerInfo.channel = 0;
        peerInfo.encrypt = false;

        if (esp_now_add_peer(&peerInfo) != ESP_OK) {
            Serial.println(F("[ESP-NOW] Failed to add GOLD peer"));
        } else {
            Serial.printf("[ESP-NOW] GOLD peer added: %02X:%02X:%02X:%02X:%02X:%02X\n",
                          masterAddress[0], masterAddress[1], masterAddress[2],
                          masterAddress[3], masterAddress[4], masterAddress[5]);
            Serial.println(F("[ESP-NOW] SILVER broadcasting active!"));
        }
    }

    // --- LoRaWAN (liv-01) ---
    SPI.begin(14, 12, 13, 15); // Custom SPI Bus Init for WDM v2.0
    os_init();
    LMIC_reset();
    do_send(&sendjob);
}

// -----------------------------------------------------------------------------
// 11. LOOP -- non-blocking: services LMIC + periodic ESP-NOW send
// -----------------------------------------------------------------------------
void loop() {
    os_runloop_once(); // LoRaWAN -- must run every iteration, no blocking delays here

    // Wi-Fi reconnect logic (ESP-NOW depends on Wi-Fi radio being initialized)
    if (WiFi.status() != WL_CONNECTED) {
        static unsigned long lastReconnectAttempt = 0;
        if (millis() - lastReconnectAttempt >= 10000) {
            lastReconnectAttempt = millis();
            Serial.println(F("[WiFi] Disconnected. Attempting reconnect..."));
            WiFi.disconnect();
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        }
    }

    if (millis() - lastEspNowSend >= ESPNOW_INTERVAL_MS) {
        lastEspNowSend = millis();
        sendEspNowUpdate();
    }
}
