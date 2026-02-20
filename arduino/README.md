# ColdWire Arduino Firmware

This folder contains the firmware for the two ESP32 devices used in the ColdWire cold chain monitoring system.

---

## Devices

### 1. ESP32 Sensor Node (`esp32_sensors/`)
Handles environmental sensing, RFID scanning, and GPS tracking. Publishes data to HiveMQ via MQTT.

### 2. ESP32-CAM (`esp32_cam/`)
Handles live camera streaming and tamper detection. Publishes camera events to HiveMQ via MQTT.

---

## ESP32 Sensor Node

### Hardware Components
| Component | Description |
|-----------|-------------|
| ESP32 Dev Board | Main microcontroller |
| DHT22 | Temperature and humidity sensor |
| MQ135 | Air quality / gas sensor (ppm) |
| MFRC522 | RFID reader for batch scanning |
| NEO-6M GPS | GPS module for truck location |

### Pin Connections
| Component | Pin |
|-----------|-----|
| RFID SS | GPIO 5 |
| RFID RST | GPIO 22 |
| DHT22 | GPIO 4 |
| MQ135 | GPIO 34 (Analog) |
| GPS RX | GPIO 16 |
| GPS TX | GPIO 17 |

### MQTT Topics Published
| Topic | Description |
|-------|-------------|
| `coldwire/M001/IM001/environmental_logs` | Temperature, humidity, gas, GPS every 5 seconds |
| `coldwire/M001/IM001/batch_delivery_events` | RFID scan events (loading/unloading) |

### Environmental Log Payload
```json
{
  "temperature": 23.5,
  "humidity": 60.2,
  "air_quality": 412,
  "latitude": 3.139003,
  "longitude": 101.686855,
  "timestamp": "2026-02-18 10:30:00"
}
```

### Batch Delivery Event Payload
```json
{
  "rfid_tag": "A1B2C3D4",
  "batch_id": "BATCH123",
  "status": "loading",
  "timestamp": "2026-02-18 10:30:00"
}
```

### RFID Logic
- First scan of a tag → status set to `loading`
- Second scan of same tag (after 30 second timeout) → status toggled to `unloading`
- Duplicate scans within 30 seconds are ignored

### Required Libraries
Install these via Arduino IDE → Library Manager:
- `MFRC522` by GithubCommunity
- `DHT sensor library` by Adafruit
- `PubSubClient` by Nick O'Leary
- `TinyGPS++` by Mikal Hart

### Environment Variables
Update these directly in the `.ino` file before flashing:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_HIVEMQ_HOST";
const char* mqtt_user = "YOUR_MQTT_USER";
const char* mqtt_pass = "YOUR_MQTT_PASS";
```

### Arduino IDE Board Settings
| Setting | Value |
|---------|-------|
| Board | ESP32 Dev Module |
| Upload Speed | 115200 |
| Flash Size | 4MB |
| Partition Scheme | Default |
| CPU Frequency | 240MHz |

---

## ESP32-CAM

### Hardware Components
| Component | Description |
|-----------|-------------|
| ESP32-CAM (AI-Thinker) | Camera module with built-in flash LED |

### Camera Model
This firmware is configured for the **AI-Thinker ESP32-CAM** board. To use a different camera model, open `board_config.h` and uncomment the relevant `#define`:

```cpp
// Uncomment ONE of these:
// #define CAMERA_MODEL_WROVER_KIT
// #define CAMERA_MODEL_ESP_EYE
#define CAMERA_MODEL_AI_THINKER   // ← currently selected
// #define CAMERA_MODEL_M5STACK_PSRAM
```

### Files
| File | Description |
|------|-------------|
| `ESP32Camcode_MQTT.ino` | Main camera code and MQTT publishing |
| `board_config.h` | Camera model selection |
| `camera_pins.h` | Pin definitions for all supported camera models |
| `app_httpd.cpp` | HTTP camera stream server |
| `camera_index.h` | Web interface for live camera stream |
| `partitions.csv` | Custom flash memory partition table |
| `ci.yml` | Arduino CI build configuration |

### MQTT Topics Published
| Topic | Description |
|-------|-------------|
| `coldwire/M001/IM001/camera_feed` | Camera capture URL and tamper detection events |

### Required Libraries
Install these via Arduino IDE → Library Manager:
- `PubSubClient` by Nick O'Leary
- `esp32` board package by Espressif (includes `esp_camera.h`)

### Arduino IDE Board Settings
| Setting | Value |
|---------|-------|
| Board | AI Thinker ESP32-CAM |
| Upload Speed | 115200 |
| Flash Size | 4MB |
| Partition Scheme | Huge APP (3MB No OTA) |
| PSRAM | Enabled |

> **Note:** You must select a partition scheme with at least 3MB APP space, otherwise the camera firmware will not fit. Use the included `partitions.csv` for custom partitioning.

### Flashing the ESP32-CAM
The AI-Thinker ESP32-CAM does not have a built-in USB port. You need an **FTDI adapter** to flash it:

1. Connect FTDI adapter to ESP32-CAM:
   - FTDI TX → ESP32-CAM RX (GPIO 3)
   - FTDI RX → ESP32-CAM TX (GPIO 1)
   - FTDI GND → ESP32-CAM GND
   - FTDI 5V → ESP32-CAM 5V
2. Short **GPIO 0 to GND** to enter flash mode
3. Press reset button
4. Upload the sketch from Arduino IDE
5. Remove the GPIO 0 to GND wire after flashing
6. Press reset again to run normally

---

## Network Requirements

Both devices require:
- **2.4 GHz Wi-Fi** — ESP32 does not support 5 GHz
- Access to HiveMQ Cloud broker over port **8883** (MQTTS)
- NTP access for time sync (`pool.ntp.org`)
