#include <WiFi.h>
#include <HTTPClient.h>

// Replace with your network details
const char* ssid = "Your_SSID"; // ESP32 Soft AP SSID
const char* password = "Your_Password"; // ESP32 Soft AP Password

void setup() {
  Serial.begin(115200);
  connectWifi();
}

void loop() {
  delay(1000);
}

bool connectWifi() {
  Serial.println("Setting up access point...");
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("Access Point IP address: ");
  Serial.println(IP);
}

void connectToSoftAp() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.print("Connecting to Soft AP: ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
  }
}