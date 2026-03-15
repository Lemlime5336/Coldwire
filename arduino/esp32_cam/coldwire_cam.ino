#include "secrets.h"
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include <WebServer.h>


//  CONFIG
const char* WIFI_SSID = WIFI_SSID;
const char* WIFI_PASS = WIFI_PASS;
const char* MQTT_HOST = MQTT_HOST;
const int   MQTT_PORT = 8883;
const char* MQTT_USER = MQTT_USER;
const char* MQTT_PASS = MQTT_PASS;

const char* IMID      = "IM-001";
const char* MANU_ID   = "MANU-00001";


//  AI-THINKER PIN MAP 
#define PWDN_GPIO_NUM   32
#define RESET_GPIO_NUM  -1
#define XCLK_GPIO_NUM    0
#define SIOD_GPIO_NUM   26
#define SIOC_GPIO_NUM   27
#define Y9_GPIO_NUM     35
#define Y8_GPIO_NUM     34
#define Y7_GPIO_NUM     39
#define Y6_GPIO_NUM     36
#define Y5_GPIO_NUM     21
#define Y4_GPIO_NUM     19
#define Y3_GPIO_NUM     18
#define Y2_GPIO_NUM      5
#define VSYNC_GPIO_NUM  25
#define HREF_GPIO_NUM   23
#define PCLK_GPIO_NUM   22

//  STATE
WiFiClientSecure wifiSecure;
PubSubClient     mqtt(wifiSecure);
WebServer        streamServer(80);

bool          isRecording = false;
unsigned long lastPing    = 0;

//  TOPICS
String T_STATUS()  { return "coldwire/" + String(MANU_ID) + "/" + String(IMID) + "/camera_status"; }
String T_EVENT()   { return "coldwire/" + String(MANU_ID) + "/" + String(IMID) + "/camera_events"; }
String T_CONTROL() { return "coldwire/" + String(MANU_ID) + "/" + String(IMID) + "/camera_control"; }
String T_SNAP()    { return "coldwire/" + String(MANU_ID) + "/" + String(IMID) + "/camera_snapshot"; }

//  HELPERS
void publishStatus(const char* state) {
  StaticJsonDocument<128> doc;
  doc["imid"]      = IMID;
  doc["state"]     = state;
  doc["recording"] = isRecording;
  doc["ms"]        = millis();
  char buf[256];
  serializeJson(doc, buf);
  mqtt.publish(T_STATUS().c_str(), buf, true);
  Serial.println("[STATUS] " + String(state));
}

void publishEvent(const char* event, const char* detail) {
  StaticJsonDocument<200> doc;
  doc["imid"]   = IMID;
  doc["event"]  = event;
  doc["detail"] = detail;
  doc["ms"]     = millis();
  char buf[400];
  serializeJson(doc, buf);
  mqtt.publish(T_EVENT().c_str(), buf, false);
  Serial.println("[EVENT] " + String(event));
}

//  CAMERA
bool initCamera() {
  camera_config_t cfg;
  cfg.ledc_channel = LEDC_CHANNEL_0; cfg.ledc_timer = LEDC_TIMER_0;
  cfg.pin_d0=Y2_GPIO_NUM; cfg.pin_d1=Y3_GPIO_NUM;
  cfg.pin_d2=Y4_GPIO_NUM; cfg.pin_d3=Y5_GPIO_NUM;
  cfg.pin_d4=Y6_GPIO_NUM; cfg.pin_d5=Y7_GPIO_NUM;
  cfg.pin_d6=Y8_GPIO_NUM; cfg.pin_d7=Y9_GPIO_NUM;
  cfg.pin_xclk=XCLK_GPIO_NUM; cfg.pin_pclk=PCLK_GPIO_NUM;
  cfg.pin_vsync=VSYNC_GPIO_NUM; cfg.pin_href=HREF_GPIO_NUM;
  cfg.pin_sscb_sda=SIOD_GPIO_NUM; cfg.pin_sscb_scl=SIOC_GPIO_NUM;
  cfg.pin_pwdn=PWDN_GPIO_NUM; cfg.pin_reset=RESET_GPIO_NUM;
  cfg.xclk_freq_hz  = 20000000;
  cfg.pixel_format  = PIXFORMAT_JPEG;
  cfg.frame_size    = FRAMESIZE_QVGA;
  cfg.jpeg_quality  = 12;
  cfg.fb_count      = 1;

  if (esp_camera_init(&cfg) != ESP_OK) {
    Serial.println("[CAM] Init failed");
    return false;
  }
  Serial.println("[CAM] Ready");
  return true;
}

void handleStream() {
  WiFiClient client = streamServer.client();
  streamServer.sendContent(
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n"
  );
  Serial.println("[CAM] Stream client connected");

  while (client.connected()) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
      mqtt.loop();   // tick MQTT even on missed frame
      delay(10);
      continue;
    }

    char hdr[80];
    snprintf(hdr, sizeof(hdr),
      "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n",
      fb->len);
    streamServer.sendContent(hdr);
    client.write(fb->buf, fb->len);
    streamServer.sendContent("\r\n");
    esp_camera_fb_return(fb);

    mqtt.loop();  // tick after every frame
    delay(100);   // ~10fps
  }

  Serial.println("[CAM] Stream client disconnected");
  if (!mqtt.connected()) mqttConnect();  // reconnect immediately if dropped
}

void publishSnapshot() {
  sensor_t* s = esp_camera_sensor_get();
  s->set_framesize(s, FRAMESIZE_QQVGA);
  delay(150);

  camera_fb_t* fb = esp_camera_fb_get();
  if (fb) {
    mqtt.setBufferSize(40000);
    mqtt.beginPublish(T_SNAP().c_str(), fb->len, false);
    mqtt.write(fb->buf, fb->len);
    mqtt.endPublish();
    esp_camera_fb_return(fb);
    Serial.println("[CAM] Snapshot sent");
  }
  s->set_framesize(s, FRAMESIZE_QVGA);
}

//  MQTT COMMANDS
void mqttCallback(char* topic, byte* payload, unsigned int len) {
  String msg;
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];
  Serial.println("[MQTT IN] " + String(topic) + ": " + msg);

  if (msg == "cam_on") {
    if (!isRecording) {
      isRecording = true;
      publishStatus("recording");
      publishEvent("recording_started", "Recording started from dashboard");
    }
    return;
  }

  if (msg == "cam_off") {
    if (isRecording) {
      isRecording = false;
      publishStatus("idle");
      publishEvent("recording_stopped", "Recording stopped from dashboard");
    }
    return;
  }

  if (msg == "snapshot") {
    publishSnapshot();
    return;
  }

  if (msg == "reboot") {
    publishEvent("rebooting", "Reboot requested from dashboard");
    delay(500);
    ESP.restart();
  }
}

//  MQTT CONNECTION
void mqttConnect() {
  String lwt = "{\"imid\":\"" + String(IMID) + "\",\"state\":\"offline\",\"recording\":false}";

  while (!mqtt.connected()) {
    Serial.print("[MQTT] Connecting...");
    if (mqtt.connect(
          IMID,
          MQTT_USER, MQTT_PASS,
          T_STATUS().c_str(), 1, true, lwt.c_str()
        )) {
      Serial.println(" connected");
      mqtt.subscribe(T_CONTROL().c_str());
      publishStatus("online");
    } else {
      Serial.printf(" failed (%d), retry 5s\n", mqtt.state());
      delay(5000);
    }
  }
}

//  SETUP
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ColdWire ESP32-CAM Starting ===");
  Serial.printf("Module: %s | Manufacturer: %s\n", IMID, MANU_ID);

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println(" connected: " + WiFi.localIP().toString());

  // Force Google DNS
  WiFi.setDNS(IPAddress(8,8,8,8), IPAddress(8,8,4,4));
  delay(500);

  // DNS debug — remove once stable
  Serial.println("Resolving broker...");
  IPAddress brokerIP;
  if (WiFi.hostByName(MQTT_HOST, brokerIP)) {
    Serial.println("Resolved: " + brokerIP.toString());
  } else {
    Serial.println("DNS FAILED — broker hostname unresolvable");
  }

  // MQTT
  wifiSecure.setInsecure();
  wifiSecure.setHandshakeTimeout(60); 
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(40000);
  mqtt.setSocketTimeout(60);           
  mqtt.setKeepAlive(60);            
  mqttConnect();

  // Camera + stream server
  if (initCamera()) {
    streamServer.on("/stream", handleStream);
    streamServer.on("/", []() {
      streamServer.send(200, "text/plain",
        "ColdWire Cam " + String(IMID) + " — stream at /stream");
    });
    streamServer.begin();
    Serial.println("Stream: http://" + WiFi.localIP().toString() + "/stream");
  }

  Serial.println("=== Ready ===");
}

//  LOOP
void loop() {
  if (!mqtt.connected()) mqttConnect();
  mqtt.loop();
  streamServer.handleClient();

  // Status ping every 10 seconds
  if (millis() - lastPing > 10000) {
    lastPing = millis();
    publishStatus(isRecording ? "recording" : "online");
  }
}
