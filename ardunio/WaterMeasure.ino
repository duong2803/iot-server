#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

using namespace websockets;

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

#define trigPin D5        // RX - SR04M
#define echoPin D6        // TX - SR04M
#define ONE_WIRE_BUS D4   // DAT - DS18B20
#define relayPin D7       // IN1 - Relay

#define EEPROM_SIZE 512  // Kích thước EEPROM (có thể thay đổi)
#define EEPROM_ADDR 0    // Địa chỉ EEPROM để lưu biến

const char* ssid = "iPhone";          // Thay bằng tên Wi-Fi của bạn
const char* password = "12456789";  // Thay bằng mật khẩu Wi-Fi của bạn
const char* sendDataRoute = "http://172.20.10.2:3000/logs/addlog";
const char* getDataRoute = "ws://172.20.10.2:3000";

WiFiClient client;
WebsocketsClient wsClient;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

float temperature;

long duration;
int distance;
int lastDistance = -1;                       // Lưu giá trị khoảng cách trước đó
int threshold;                               // Ngưỡng thay đổi lớn được coi là nhiễu (cm)
const int minDistance = 25;                  // Khoảng cách tối thiểu (cm)
int maxDistance;                             // Khoảng cách tối đa (cm)
int tankHeight = -1;                              // Mực nước khi bể đầy tính từ đáy (cm)
int waterLevel = 0;                          // Mực nước hiện tại (cm)
int waterPercentage = 0;                     // % mực nước
int lowerThreshold = 15;                     // Ngưỡng bật bơm
int upperThreshold = 85;                     // Ngưỡng tắt bơm
String pumpState = "OFF";                    // Trạng thái bơm (tắt / bật)

unsigned long lastMeasureTime = 0;           // Thời điểm đo lần cuối
const unsigned long measureInterval = 50;    // Khoảng thời gian giữa hai lần đo (ms)

unsigned long lastUpdateTime = 0;           // Thời điểm đo lần cuối
const unsigned long updateInterval = 10000;    // Khoảng thời gian giữa hai lần đo (ms)

float lastTemperature = -1;

bool autoMode = true;

void ConnectWifi(){
  WiFi.begin(ssid, password);
  Serial.println("Đang kết nối Wi-Fi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi đã kết nối.");
  Serial.print("Địa chỉ IP: ");
  Serial.println(WiFi.localIP());
}

void getData(WebsocketsMessage message){
  Serial.println("Nhận tin nhắn:" + message.data());

  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message.data());

  if (error) {
    Serial.println("Lỗi phân tích JSON: " + String(error.c_str()));
    return;
  }

  String type = doc["type"];
  String ms = doc["message"];

  if(type == "auto") {
    autoMode = true;
    Serial.println("autoMode: " + String(autoMode));
  }
  else if(type == "manual"){
    autoMode = false;
    pumpState = ms;
    controlRelay();
    Serial.println("pumpState: " + String(pumpState));
    Serial.println("autoMode: " + String(autoMode));
  }
  else if(type == "tankHeight"){
    tankHeight = ms.toInt();
    // Ghi giá trị vào EEPROM
    EEPROM.write(EEPROM_ADDR, tankHeight);
    EEPROM.commit();  // Lưu thay đổi vào bộ nhớ thực tế
    Serial.println("tankHeight: " + String(tankHeight));
    delay(1000);
    ESP.restart();
  }
}

void onEventCallBack(WebsocketsEvent event, String data){
  if (event == WebsocketsEvent::ConnectionOpened) {
    Serial.println("WebSocket kết nối mở.");
  } else if (event == WebsocketsEvent::ConnectionClosed) {
    Serial.println("WebSocket kết nối đóng.");
  } else if (event == WebsocketsEvent::GotPing) {
    Serial.println("Ping nhận được.");
  } else if (event == WebsocketsEvent::GotPong) {
    Serial.println("Pong nhận được.");
  }
}

float getTemperatures() {
  sensors.requestTemperatures();
  float temp = sensors.getTempCByIndex(0); // Lấy nhiệt độ từ cảm biến đầu tiên
  if (temp == -127) {
    Serial.println("Error: Cannot read temperature!");
    return NAN; // Trả về giá trị không hợp lệ
  }
  return temp; // Trả về nhiệt độ hợp lệ
}

void ShowTempOnOLED(){
  display.fillRect(0, 30, SCREEN_WIDTH, 20, SSD1306_BLACK); // Xóa vùng hiển thị nhiệt độ
  display.setTextSize(1); // Kích thước chữ nhỏ hơn
  display.setCursor(0, 30); // Vị trí dòng thứ hai
  if (!isnan(temperature)) {
      display.print("Temp:");
      display.print(temperature);
      display.println("C");
  } else {
      display.print("Temp: -- C");
  }

  display.display();

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" *C");
}

void controlRelay() {
    if(autoMode){
      if (waterPercentage < lowerThreshold) {
          digitalWrite(relayPin, LOW); // Bật bơm
          pumpState = "ON";
      } else if (waterPercentage > upperThreshold) {
          digitalWrite(relayPin, HIGH); // Tắt bơm
          pumpState = "OFF";
      }
    }
    else{
      if(pumpState == "ON") digitalWrite(relayPin, LOW);
      else if(pumpState == "OFF") digitalWrite(relayPin, HIGH);
    }
}

void ShowWaterOnOLED(){
  display.fillRect(0, 0, SCREEN_WIDTH, 20, SSD1306_BLACK); // Xóa vùng hiển thị mực nước
  display.setTextSize(2); // Kích thước chữ lớn hơn cho % mực nước
  display.setCursor(0, 0); // Vị trí dòng đầu tiên
  display.print("Water: ");
  display.print(waterPercentage);
  display.println("%");

  display.display();

  Serial.print("Water Percentage: ");
  Serial.print(waterPercentage);
  Serial.println(" %");
}

void SendData(){
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(client, sendDataRoute); 		// URL API POST
    http.addHeader("Content-Type", "application/json"); // Định dạng JSON

    //Tạo chuỗi JSON
    String jsonPayload = "{\"temperature\":" + String(temperature, 2) +
                         ",\"waterLevel\":" + String(waterPercentage, 10) + 
                         ",\"pumpState\":" + "\"" + String(pumpState) + "\"" + "}";
    Serial.println(jsonPayload);
    // Gửi dữ liệu POST
    int httpCode = http.POST(jsonPayload);
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      String response = http.getString();
      Serial.println("Phản hồi từ server: " + response);
    } else {
      Serial.print("Lỗi khi gửi dữ liệu. HTTP code: ");
      Serial.println(httpCode);
    }
    http.end();
  } else {
    Serial.println("Wi-Fi không kết nối!");
  }
}

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, HIGH);

  Serial.begin(9600);
  // Khởi tạo màn hình OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }

  // Khởi tạo EEPROM
  EEPROM.begin(EEPROM_SIZE);

  // Đọc giá trị từ EEPROM
  tankHeight = EEPROM.read(EEPROM_ADDR);
  Serial.println("Giá trị sau khi reset: " + String(tankHeight));

  ConnectWifi();

  wsClient.onMessage(getData);
  wsClient.onEvent(onEventCallBack);
  if (wsClient.connect(getDataRoute)) {
    Serial.println("WebSocket kết nối thành công.");
  } else {
    Serial.println("WebSocket kết nối thất bại.");
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Starting...");
  display.display();
  delay(2000);

  sensors.begin();   // Khởi tạo DS18B20

  threshold = (int)(tankHeight * 0.15);
  maxDistance = (int)(tankHeight * 1.1 + minDistance);
}

void loop() {

  if (wsClient.available()) {
    wsClient.poll();
  }
  unsigned long currentTime = millis();

  if (currentTime - lastMeasureTime >= measureInterval) {
    lastMeasureTime = currentTime;

    // Đo nhiệt độ
    temperature = getTemperatures();

    if(temperature != lastTemperature){
      lastTemperature = temperature;
      ShowTempOnOLED();
    }
    
    // Đo khoảng cách
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    duration = pulseIn(echoPin, HIGH, 30000); // Chờ tối đa 30ms

    // Đảm bảo thời gian của HIGH đủ lâu
    if (duration > 0) {
      distance = duration * 0.034 / 2;
      if (distance != lastDistance && distance >= minDistance && distance <= maxDistance && (lastDistance == -1 || abs(distance - lastDistance) <= threshold)) {
        lastDistance = distance;              // Cập nhật giá trị mới nếu hợp lệ

        // Tính mực nước và phần trăm mực nước
        waterLevel = tankHeight - (distance - minDistance);
        if (waterLevel < 0) waterLevel = 0; // Đảm bảo không âm
        waterPercentage = (waterLevel * 100) / tankHeight;
        waterPercentage = constrain(waterPercentage, 0, 100);
        
        Serial.println(waterPercentage);
        controlRelay();
        ShowWaterOnOLED();
      }
    }
    else Serial.print("-");
  }

  if(currentTime - lastUpdateTime >= updateInterval){
    lastUpdateTime = currentTime;
    SendData();
  }
}