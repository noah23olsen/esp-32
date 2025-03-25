#include <WiFi.h>
#include <WebSocketsClient.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "Noisebridge";
const char* password = "noisebridge";

// WebSocket server - Render config (secure WSS)
const char* websocket_host = "esp-32-zvv7.onrender.com"; // No https:// prefix, no trailing slash
const uint16_t websocket_port = 443; // 443 for secure connections
const char* websocket_path = "/";

// DHT setup
#define DHTPIN 23  // GPIO where DHT11 is connected
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// WebSocket client
WebSocketsClient webSocket;

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_DISCONNECTED) {
    Serial.println("WebSocket Disconnected");
  } else if (type == WStype_CONNECTED) {
    Serial.println("WebSocket Connected");
  } else if (type == WStype_TEXT) {
    Serial.printf("Received: %s\n", payload);
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // WebSocket setup - USING SSL for Render
  webSocket.beginSSL(websocket_host, websocket_port, websocket_path);
  webSocket.onEvent(webSocketEvent);
  
  // Optional: Set reconnect interval (helps with stability)
  webSocket.setReconnectInterval(5000);
  
  // For debugging
  Serial.println("Attempting to connect to WebSocket server at:");
  Serial.print("Host: ");
  Serial.println(websocket_host);
  Serial.print("Port: ");
  Serial.println(websocket_port);
  Serial.print("Path: ");
  Serial.println(websocket_path);
}

void loop() {
  webSocket.loop();

  static unsigned long lastSendTime = 0;
  if (millis() - lastSendTime > 2000) {  // Send every 2 seconds
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    if (!isnan(temp) && !isnan(hum)) {
      String message = "{\"temperature\":" + String(temp) + ",\"humidity\":" + String(hum) + "}";
      webSocket.sendTXT(message);
      Serial.println("Sent: " + message);
    } else {
      Serial.println("Failed to read from DHT sensor");
    }

    lastSendTime = millis();
  }
} 