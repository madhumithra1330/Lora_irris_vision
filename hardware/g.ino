#include <lmic.h>
#include <hal/hal.h>
#include <SPI.h>
#include <WiFi.h>
#include <esp_now.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "Adafruit_SHT31.h"

// -----------------------------------------------------------------------------
// 1. CREDENTIALS & SETTINGS
// -----------------------------------------------------------------------------
const char* ssid     = "hpt";
const char* password = "praveen123";
const char* serverUrl = "http://your-backend-server-ip:port/api/telemetry"; 

WebServer server(80); 

// -----------------------------------------------------------------------------
// 2. PIN DEFINITIONS & SENSORS
// -----------------------------------------------------------------------------
#define TRIG_PIN     25
#define ECHO_PIN     26
#define RELAY_PIN    27
#define SOIL_PIN     34
#define BATTERY_PIN  35

Adafruit_SHT31 sht31 = Adafruit_SHT31();

// Software State for Relay
bool pumpStatus = false;

// -----------------------------------------------------------------------------
// 3. LORAWAN KEYS (FOR DEVICE: liv-02 / GOLD)
// -----------------------------------------------------------------------------
static const u1_t PROGMEM APPEUI[8] = { 0x10, 0x32, 0x54, 0x76, 0x98, 0xBA, 0xDC, 0xFE };
void os_getArtEui (u1_t* buf) { memcpy_P(buf, APPEUI, 8); }

static const u1_t PROGMEM DEVEUI[8] = { 0xF6, 0x4A, 0x07, 0xD0, 0x7E, 0xD5, 0xB3, 0x70 };
void os_getDevEui (u1_t* buf) { memcpy_P(buf, DEVEUI, 8); }

static const u1_t PROGMEM APPKEY[16] = { 0x69, 0x4B, 0x12, 0x40, 0x88, 0xD5, 0xE3, 0x8D, 0xA8, 0xA9, 0x93, 0x43, 0x9C, 0x0E, 0x5E, 0xBE };
void os_getDevKey (u1_t* buf) { memcpy_P(buf, APPKEY, 16); }

const lmic_pinmap lmic_pins = {
    .nss = 15,
    .rxtx = LMIC_UNUSED_PIN,
    .rst = 17,
    .dio = {4, 33, 32},
};

static osjob_t sendjob;
const unsigned TX_INTERVAL = 30; // Uplink interval in seconds

// -----------------------------------------------------------------------------
// 4. ESP-NOW CONFIG
// -----------------------------------------------------------------------------
typedef struct struct_message {
    char nodeId[10];
    float temperature;
    uint8_t humidity;
    uint8_t soilMoisture;
    uint16_t waterLevel;
    bool valveStatus;
    uint8_t battery;
} struct_message;

struct_message node2Data;
bool node2Online = false;
unsigned long lastNode2Time = 0;

void OnDataRecv(const uint8_t *mac, const uint8_t *incomingData, int len) {
    memcpy(&node2Data, incomingData, sizeof(node2Data));
    node2Online = true;
    lastNode2Time = millis();
    Serial.println(F("Received wireless data from Node 2 (SILVER)!"));
}

// -----------------------------------------------------------------------------
// 5. SENSOR READ FUNCTIONS
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
    return constrain(map(rawValue, 4095, 1500, 0, 100), 0, 100);
}

uint8_t readBatteryPct() {
    int rawValue = analogRead(BATTERY_PIN);
    return constrain(map(rawValue, 2000, 3000, 0, 100), 0, 100);
}

// -----------------------------------------------------------------------------
// 6. JSON GENERATOR
// -----------------------------------------------------------------------------
String getCombinedJson() {
    float t = sht31.readTemperature();
    float h = sht31.readHumidity();
    float temp1 = isnan(t) ? 0.0 : t;
    uint8_t hum1 = isnan(h) ? 0 : (uint8_t)h;
    
    uint8_t soil1 = readSoilMoisturePct();
    uint16_t water1 = readDistanceCm();
    uint8_t bat1 = readBatteryPct();

    if (millis() - lastNode2Time > 10000) {
        node2Online = false;
    }

    String json = "{";
    json += "\"gatewayId\":\"LIVGW001\",";
    json += "\"gatewaySecret\":\"8F7K2M9Q\",";
    json += "\"timestamp\":\"2026-06-11T15:30:00Z\",";
    
    json += "\"gateway\":{";
    json += "\"status\":\"online\",";
    json += "\"pumpStatus\":" + String(pumpStatus ? "true" : "false") + ",";
    json += "\"waterLevel\":" + String(water1) + ",";
    json += "\"battery\":" + String(bat1);
    json += "},";

    json += "\"nodes\":[";
    
    // Node 1 (Master / LIV001)
    json += "{";
    json += "\"nodeId\":\"LIV001\",";
    json += "\"status\":\"online\",";
    json += "\"soilMoisture\":" + String(soil1) + ",";
    json += "\"temperature\":" + String(temp1, 1) + ",";
    json += "\"humidity\":" + String(hum1) + ",";
    json += "\"valveStatus\":" + String(pumpStatus ? "true" : "false") + ",";
    json += "\"battery\":" + String(bat1);
    json += "},";

    // Node 2 (Slave / LIV002)
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

void handleRoot() {
    server.send(200, "application/json", getCombinedJson());
}

// -----------------------------------------------------------------------------
// 7. LORAWAN FUNCTIONS
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
        uint8_t relayState = pumpStatus ? 1 : 0; // Use software state

        byte payload[6];
        payload[0] = temp;
        payload[1] = hum;
        payload[2] = soilPct;
        payload[3] = highByte(distanceCm);
        payload[4] = lowByte(distanceCm);
        payload[5] = relayState;

        LMIC_setTxData2(1, payload, sizeof(payload), 0);
        
        Serial.println(F("--- Uplink Queued (liv-02) ---"));
        Serial.printf("Temp: %d C | Hum: %d %% | Soil: %d %%\n", temp, hum, soilPct);
        Serial.printf("Water Level: %d cm | Pump Relay: %s\n", distanceCm, pumpStatus ? "ON" : "OFF");
    }
}

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
                uint8_t command = LMIC.frame[LMIC.dataBeg];
                if (command == 0x01) {
                    pumpStatus = true;
                    digitalWrite(RELAY_PIN, HIGH);
                    Serial.println(F("-> Downlink Command: Pump Relay ON!"));
                } else if (command == 0x00) {
                    pumpStatus = false;
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
// 8. SETUP & MAIN LOOP
// -----------------------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println(F("\n--- Starting Master Gateway Node (GOLD / liv-02) ---"));

    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    pinMode(RELAY_PIN, OUTPUT);
    
    pumpStatus = false;
    digitalWrite(RELAY_PIN, LOW); 

    if (!sht31.begin(0x44)) {
        Serial.println(F("Warning: Onboard SHT31 sensor not detected at 0x44!"));
    }

    // Wi-Fi Setup
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false); // CRITICAL: Keeps Wi-Fi radio awake for ESP-NOW
    WiFi.begin(ssid, password);
    Serial.print(F("Connecting to Wi-Fi"));
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(F("."));
    }
    Serial.println(F("\nWi-Fi Connected & sleep disabled!"));
    
    // ESP-NOW Setup
    if (esp_now_init() != ESP_OK) {
        Serial.println(F("Error initializing ESP-NOW"));
        return;
    }
    esp_now_register_recv_cb(OnDataRecv);

    // Web Server Setup
    server.on("/", handleRoot);
    server.begin();

    // LoRaWAN Setup (SPI)
    SPI.begin(14, 12, 13, 15);
    os_init();
    LMIC_reset();
    do_send(&sendjob);
}

unsigned long lastPostTime = 0;
void loop() {
    // 1. Non-blocking LoRaWAN background task
    os_runloop_once();

    // 2. Web Server task
    server.handleClient(); 

    // 3. HTTP POST Non-blocking timer
    if (millis() - lastPostTime >= 2000) {
        lastPostTime = millis();
        
        if (WiFi.status() == WL_CONNECTED && String(serverUrl).indexOf("your-backend") == -1) {
            HTTPClient http;
            http.begin(serverUrl);
            http.addHeader("Content-Type", "application/json");
            http.POST(getCombinedJson());
            http.end();
        }
    }
}
