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

// -----------------------------------------------------------------------------
// 1. WIFI CREDENTIALS (needed for the ESP-NOW radio, unchanged)
// -----------------------------------------------------------------------------
const char* ssid     = "hpt";
const char* password = "praveen123";

uint8_t masterAddress[] = {0xE8, 0x9F, 0x6D, 0x5F, 0xE6, 0x70}; // GOLD's MAC -- unchanged

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
    Serial.println(F("--- Starting SILVER Node: TTN liv-01 + WiFi Sensor Node (LIV002) ---"));

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
    WiFi.begin(ssid, password);
    Serial.print(F("SILVER connecting to Wi-Fi"));
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(F("."));
    }
    Serial.println(F("\nSILVER Wi-Fi connected & sleep disabled!"));

    // --- ESP-NOW sender (to GOLD) ---
    if (esp_now_init() != ESP_OK) {
        Serial.println(F("ESP-NOW init failed"));
    } else {
        esp_now_register_send_cb(OnDataSent);

        esp_now_peer_info_t peerInfo = {};
        memcpy(peerInfo.peer_addr, masterAddress, 6);
        peerInfo.channel = 0;
        peerInfo.encrypt = false;

        if (esp_now_add_peer(&peerInfo) != ESP_OK) {
            Serial.println(F("Failed to add GOLD peer"));
        } else {
            Serial.println(F("SILVER ESP-NOW broadcasting active!"));
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

    if (millis() - lastEspNowSend >= ESPNOW_INTERVAL_MS) {
        lastEspNowSend = millis();
        sendEspNowUpdate();
    }
}
