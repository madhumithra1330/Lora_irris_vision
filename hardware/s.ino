#include <lmic.h>
#include <hal/hal.h>
#include <SPI.h>
#include <WiFi.h>
#include <esp_now.h>
#include <Wire.h>
#include "Adafruit_SHT31.h"

// -----------------------------------------------------------------------------
// 1. CREDENTIALS & SETTINGS
// -----------------------------------------------------------------------------
const char* ssid     = "hpt";
const char* password = "praveen123";

// MAC Address of GOLD Master
uint8_t masterAddress[] = {0xE8, 0x9F, 0x6D, 0x5F, 0xE6, 0x70}; 

// -----------------------------------------------------------------------------
// 2. PIN DEFINITIONS & SENSORS
// -----------------------------------------------------------------------------
#define TRIG_PIN     25
#define ECHO_PIN     26
#define RELAY_PIN    27
#define SOIL_PIN     34
#define BATTERY_PIN  35

Adafruit_SHT31 sht31 = Adafruit_SHT31();

// -----------------------------------------------------------------------------
// 3. LORAWAN KEYS (FOR DEVICE: liv-01 / SILVER)
// -----------------------------------------------------------------------------
static const u1_t PROGMEM APPEUI[8] = { 0xEF, 0xCD, 0xAB, 0x89, 0x67, 0x45, 0x23, 0x01 };
void os_getArtEui (u1_t* buf) { memcpy_P(buf, APPEUI, 8); }

static const u1_t PROGMEM DEVEUI[8] = { 0xF4, 0x4A, 0x07, 0xD0, 0x7E, 0xD5, 0xB3, 0x70 };
void os_getDevEui (u1_t* buf) { memcpy_P(buf, DEVEUI, 8); }

static const u1_t PROGMEM APPKEY[16] = { 0x75, 0x37, 0x05, 0x67, 0xB5, 0x8B, 0x08, 0x8C, 0xB8, 0xCA, 0x62, 0x69, 0xCD, 0xB7, 0xDD, 0xA5 };
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

struct_message myData;

void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
    if (status == ESP_NOW_SEND_SUCCESS) {
        Serial.println(F("ESP-NOW Delivery: SUCCESS"));
    } else {
        Serial.println(F("ESP-NOW Delivery: FAIL"));
    }
}

// -----------------------------------------------------------------------------
// 5. SENSOR READ FUNCTIONS
// -----------------------------------------------------------------------------
uint8_t readSoilMoisturePct() {
    int rawValue = analogRead(SOIL_PIN);
    return constrain(map(rawValue, 4095, 1500, 0, 100), 0, 100);
}

uint8_t readBatteryPct() {
    int rawValue = analogRead(BATTERY_PIN);
    return constrain(map(rawValue, 2000, 3000, 0, 100), 0, 100);
}

// -----------------------------------------------------------------------------
// 6. LORAWAN FUNCTIONS
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
        uint16_t distanceCm = 0; // Silver has no ultrasonic sensor, default to 0
        uint8_t relayState = digitalRead(RELAY_PIN); // Silver valve status

        // Send 6 bytes to maintain TTN formatter compatibility
        byte payload[6];
        payload[0] = temp;
        payload[1] = hum;
        payload[2] = soilPct;
        payload[3] = highByte(distanceCm);
        payload[4] = lowByte(distanceCm);
        payload[5] = relayState;

        LMIC_setTxData2(1, payload, sizeof(payload), 0);
        
        Serial.println(F("--- Uplink Queued (liv-01) ---"));
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
                    digitalWrite(RELAY_PIN, HIGH);
                } else if (command == 0x00) {
                    digitalWrite(RELAY_PIN, LOW);
                }
            }
            os_setTimedCallback(&sendjob, os_getTime() + sec2osticks(TX_INTERVAL), do_send);
            break;
        default:
            break;
    }
}

// -----------------------------------------------------------------------------
// 7. SETUP & MAIN LOOP
// -----------------------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);

    if (!sht31.begin(0x44)) {
        Serial.println(F("SHT31 error!"));
    }

    // Wi-Fi & ESP-NOW Setup
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.begin(ssid, password);
    Serial.print(F("Node 2 (SILVER) connecting to Wi-Fi"));
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(F("."));
    }
    Serial.println(F("\nNode 2 Wi-Fi connected & sleep disabled!"));

    if (esp_now_init() != ESP_OK) {
        Serial.println(F("ESP-NOW init failed"));
        return;
    }
    esp_now_register_send_cb(OnDataSent);
    
    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, masterAddress, 6);
    peerInfo.channel = 0;  
    peerInfo.encrypt = false;
    
    if (esp_now_add_peer(&peerInfo) != ESP_OK){
        Serial.println(F("Failed to add master peer"));
        return;
    }
    
    // LoRaWAN Setup (SPI)
    SPI.begin(14, 12, 13, 15);
    os_init();
    LMIC_reset();
    do_send(&sendjob);
}

unsigned long lastEspNowTime = 0;
void loop() {
    // 1. Non-blocking LoRaWAN background task
    os_runloop_once();

    // 2. Non-blocking ESP-NOW timer (previously a blocking delay)
    if (millis() - lastEspNowTime >= 2000) {
        lastEspNowTime = millis();
        
        float t = sht31.readTemperature();
        float h = sht31.readHumidity();
        
        strcpy(myData.nodeId, "LIV002");
        myData.temperature = isnan(t) ? 0.0 : t;
        myData.humidity = isnan(h) ? 0 : (uint8_t)h;
        myData.soilMoisture = readSoilMoisturePct();
        myData.waterLevel = 0; // Default to 0 for non-existent ultrasonic sensor
        myData.valveStatus = digitalRead(RELAY_PIN);
        myData.battery = readBatteryPct();

        esp_now_send(masterAddress, (uint8_t *) &myData, sizeof(myData));
    }
}
