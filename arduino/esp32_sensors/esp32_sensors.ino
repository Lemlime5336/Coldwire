#include "secrets.h"
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <time.h>
#include <TinyGPS++.h>

//  PIN DEFINITIONS 
#define SS_PIN 5
#define RST_PIN 22
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ135_PIN 34

//  GPS PINS 
#define RXD2 16
#define TXD2 17
#define GPS_BAUD 9600

MFRC522 rfid(SS_PIN, RST_PIN);
DHT dht(DHTPIN, DHTTYPE);

// GPS
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

// Store latest GPS values
float gps_lat = 0.0;
float gps_lng = 0.0;
bool gps_valid = false;

//  WIFI 
const char* ssid = WIFI_SSID; //// ESP32 supports 2.4 GHz Wi-Fi only (not 5 GHz)
const char* password = WIFI_PASS;

//  MQTT 
const char* mqtt_server = MQTT_HOST; //simply paste the url for the cluster here as it is shown in the site
const int mqtt_port = 8883;
const char* mqtt_user = MQTT_USER;
const char* mqtt_pass = MQTT_PASS;

//  MQTT TOPICS 
const char* topic_sensors = "coldwire/M001/IM001/environmental_logs";
const char* topic_bde = "coldwire/M001/IM001/batch_delivery_events";

//  MQTT CLIENT 
WiFiClientSecure secureClient;
PubSubClient client(secureClient);

//  BATCH TRACKING 
struct Batch {
  String rfid_tag;
  String status;
  unsigned long lastScan;
};

Batch currentBatches[20];
int batchCount = 0;
const unsigned long scanTimeout = 30000; // 30s

//  SENSOR TIMING 
unsigned long lastSensorPublish = 0;
const unsigned long sensorInterval = 5000; // 5s

//  SETUP 
void setup() {
  Serial.begin(115200);
  
  // Initialize sensors and RFID
  dht.begin();
  SPI.begin();
  rfid.PCD_Init();

  // Start GPS serial
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, RXD2, TXD2);
  Serial.println("GPS started");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP: "); Serial.println(WiFi.localIP());

  // MQTT setup
  secureClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);

  // NTP time
  configTime(28800, 0, "pool.ntp.org"); // GMT+8
}

//  MQTT RECONNECT 
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to HiveMQ...");
    if (client.connect("ESP32Client", mqtt_user, mqtt_pass)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(2000);
    }
  }
}

//  MAIN LOOP 
void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // --- GPS handling ---
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isUpdated()) {
    gps_lat = gps.location.lat();
    gps_lng = gps.location.lng();
    gps_valid = true;

    Serial.print("GPS: ");
    Serial.print(gps_lat, 6);
    Serial.print(", ");
    Serial.println(gps_lng, 6);
  }

  // --- RFID handling ---
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String rfid_tag = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 16) rfid_tag += "0";
      rfid_tag += String(rfid.uid.uidByte[i], HEX);
    }
    rfid_tag.toUpperCase();

    processRFID(rfid_tag);
    rfid.PICC_HaltA();
  }

  // --- Sensor readings ---
  unsigned long now = millis();
  if (now - lastSensorPublish >= sensorInterval) {
    lastSensorPublish = now;
    readAndPublishSensors();
  }
}

//  READ AND PUBLISH SENSORS 
void readAndPublishSensors() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int air = analogRead(MQ135_PIN);

  if (!isnan(temp) && !isnan(hum)) {
    publishSensors(temp, hum, air);
  } else {
    Serial.println("DHT read failed");
  }
}

//  PUBLISH SENSORS FUNCTION 
void publishSensors(float temp, float hum, int air) {
  time_t nowTime;
  time(&nowTime);
  struct tm timeinfo;
  localtime_r(&nowTime, &timeinfo);

  char timestamp[25];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", &timeinfo);

  String payload = "{";
  payload += "\"temperature\":" + String(temp) + ",";
  payload += "\"humidity\":" + String(hum) + ",";
  payload += "\"air_quality\":" + String(air) + ",";

  if (gps_valid) {
    payload += "\"latitude\":" + String(gps_lat, 6) + ",";
    payload += "\"longitude\":" + String(gps_lng, 6) + ",";
  } else {
    payload += "\"latitude\":null,";
    payload += "\"longitude\":null,";
  }

  payload += "\"timestamp\":\"" + String(timestamp) + "\"";
  payload += "}";

  client.publish(topic_sensors, payload.c_str());
  Serial.println("Sensor payload: " + payload);
}

//  PROCESS RFID 
void processRFID(String rfid_tag) {
  unsigned long now = millis();

  // Check if tag already exists
  for (int i = 0; i < batchCount; i++) {
    if (currentBatches[i].rfid_tag == rfid_tag) {
      if (now - currentBatches[i].lastScan >= scanTimeout) {
        currentBatches[i].status = (currentBatches[i].status == "loading") ? "unloading" : "loading";
        currentBatches[i].lastScan = now;
        publishRFID(currentBatches[i].rfid_tag, currentBatches[i].status);
      } else {
        Serial.println("Duplicate RFID scan ignored (timeout)");
      }
      return;
    }
  }

  // New tag
  if (batchCount < 20) {
    currentBatches[batchCount].rfid_tag = rfid_tag;
    currentBatches[batchCount].status = "loading";
    currentBatches[batchCount].lastScan = now;
    batchCount++;
    publishRFID(rfid_tag, "loading");
  } else {
    Serial.println("Batch table full!");
  }
}

//  PUBLISH RFID FUNCTION 
void publishRFID(String tag, String status) {
  time_t nowTime;
  time(&nowTime);
  struct tm timeinfo;
  localtime_r(&nowTime, &timeinfo);

  char timestamp[25];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", &timeinfo);

  String payload = "{";
  payload += "\"rfid_tag\":\"" + tag + "\",";
  payload += "\"batch_id\":\"BATCH123\",";
  payload += "\"status\":\"" + status + "\",";
  payload += "\"timestamp\":\"" + String(timestamp) + "\"";
  payload += "}";

  client.publish(topic_bde, payload.c_str());
  Serial.println("RFID payload: " + payload);
}

