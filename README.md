# ESP32 Temperature & Humidity Monitor

A real-time temperature and humidity monitoring system using an ESP32 with DHT11 sensor and WebSocket communication.

## Features

- Real-time temperature and humidity readings from ESP32 + DHT11 sensor
- WebSocket communication for instant data updates
- Responsive web interface
- Automatic reconnection if connection is lost

## Setup Instructions

### Server Setup

1. Clone this repository
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Access the web interface at `http://localhost:8080`

### ESP32 Setup

1. Install the following libraries in Arduino IDE:
   - WebSocketsClient
   - ArduinoJson
   - DHT sensor library by Adafruit
2. Update the WiFi credentials and WebSocket server address in the ESP32 code
3. Upload the code to your ESP32
4. Connect a DHT11 sensor to GPIO pin 23 (or update the pin in the code)

## Deployment Notes

This application can be deployed to Render or similar services. Make sure to update the WebSocket server address in the ESP32 code to match your deployed server.

## License

ISC 