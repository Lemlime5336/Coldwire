#include "secrets.h"
#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "board_config.h"


// WiFi credentials
const char *ssid = WIFI_SSID;
const char *password = WIFI_PASS;

// HiveMQ Cloud MQTT
const char* mqtt_server = MQTT_HOST; //simply paste the url for the cluster here as it is shown in the site
const int mqtt_port = 8883;
const char* mqtt_user = MQTT_USER;
const char* mqtt_pass = MQTT_PASS;

//  MQTT TOPICS 
const char* topic_status = "cams/cam1/status";


// MQTT client
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);


// Forward declarations
void startCameraServer();
void setupLedFlash();
void connectMQTT();
void publishStatus(const char* status);


// Setup
void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

  //  Camera config 
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA; // stable for streaming
  config.fb_count = 2;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.jpeg_quality = 12;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera init failed!");
    return;
  }

  sensor_t* s = esp_camera_sensor_get();
  s->set_framesize(s, FRAMESIZE_QVGA); // ensure stable streaming
  s->set_vflip(s, 1);

#if defined(LED_GPIO_NUM)
  setupLedFlash();
#endif

  //  WiFi 
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");

  //  MQTT 
  secureClient.setInsecure(); // OK for HiveMQ Cloud TLS
  mqttClient.setServer(mqtt_server, mqtt_port);
  connectMQTT();

  //  Start MJPEG stream 
  startCameraServer();

  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");
}


// Loop
void loop() {
  // Keep MQTT alive
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();
  delay(1000);
}


// MQTT Connect

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqttClient.connect("cam1", mqtt_user, mqtt_pass)) {
      Serial.println("connected");
      publishStatus("online");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 2s");
      delay(2000);
    }
  }
}


// Publish status
void publishStatus(const char* status) {
  if (mqttClient.connected()) {
    mqttClient.publish(topic_status, status, true); // retain=true
  }
}
