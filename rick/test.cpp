#include <WiFi.h>
#include <ESPAsyncWebServer.h>

const char *ssid = "ESP32_AP"; 
const char *password = "123456789";

AsyncWebServer server(80); // Web server running on port 80

void setup() {
  Serial.begin(115200);
  
  // Start the Access Point
  WiFi.softAP(ssid, password);
  Serial.println("Access Point Started");
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());
  
  // Define routes for different subdomains or paths
  server.on("/forward", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/plain", "You have reached /forward");
  });
  
  server.on("/backward", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/plain", "You have reached /backward");
  });
  
  // You can define other routes as needed
  server.on("/anotherroute", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/plain", "You have reached /anotherroute");
  });
  
  // Start the server
  server.begin();
}

void loop() {
  // Handle incoming requests
}
