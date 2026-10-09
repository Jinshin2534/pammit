#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#include <Wire.h>
#include <Adafruit_BME280.h>

// Wi-Fi、デバイスキー、送信先はローカルの secrets.h で設定する。
#include "secrets.h"

// ========================================
// センサー設定
// ========================================

// 土壌水分センサー
const int soilPin = 34;

// BME280
Adafruit_BME280 bme;


// ========================================
// 送信間隔
// ========================================

// 10分 = 600,000ミリ秒
const unsigned long SEND_INTERVAL = 10UL * 60UL * 1000UL;

unsigned long lastSendTime = 0;


// ========================================
// Wi-Fi接続
// ========================================

void connectWiFi() {

  // すでにつながっていたら何もしない
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("Connecting to WiFi...");

  WiFi.begin(ssid, password);

  // 最大20秒待つ
  unsigned long startTime = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startTime < 20000
  ) {

    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("WiFi connected");

    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());

  } else {

    Serial.println("WiFi connection failed");
  }
}


// ========================================
// センサー測定 → AWS送信
// ========================================

void sendReading() {

  Serial.println();
  Serial.println("========================");
  Serial.println("Starting new measurement");
  Serial.println("========================");


  // --------------------------------
  // ① Wi-Fi確認
  // --------------------------------

  connectWiFi();

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("Cannot send: WiFi disconnected");

    return;
  }


  // --------------------------------
  // ② 現在時刻取得
  // --------------------------------

  struct tm timeinfo;

  Serial.println("Getting time...");

  if (!getLocalTime(&timeinfo)) {

    Serial.println("Failed to obtain time");

    return;
  }


  // --------------------------------
  // ③ measured_at作成
  // --------------------------------

  char measuredAt[30];

  strftime(
    measuredAt,
    sizeof(measuredAt),
    "%Y-%m-%dT%H:%M:%S",
    &timeinfo
  );

  String measuredAtWithTimezone =
    String(measuredAt) + "+09:00";

  Serial.print("Measured at: ");
  Serial.println(measuredAtWithTimezone);


  // --------------------------------
  // ④ 土壌水分測定
  // --------------------------------

  int soilValue = analogRead(soilPin);

  Serial.print("Soil value: ");
  Serial.println(soilValue);


  // --------------------------------
  // ⑤ BME280測定
  // --------------------------------

  float temperature =
    bme.readTemperature();

  float humidity =
    bme.readHumidity();

  float pressure =
    bme.readPressure() / 100.0;


  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" C");

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("Pressure: ");
  Serial.print(pressure);
  Serial.println(" hPa");


  // --------------------------------
  // ⑥ JSON作成
  // --------------------------------

  String json = "{";

  json += "\"readings\":[{";

  json += "\"measured_at\":\"";
  json += measuredAtWithTimezone;
  json += "\",";

  json += "\"temperature\":";
  json += String(temperature, 2);
  json += ",";

  json += "\"humidity\":";
  json += String(humidity, 2);
  json += ",";

  json += "\"pressure\":";
  json += String(pressure, 2);
  json += ",";

  json += "\"soil_moisture_raw\":";
  json += String(soilValue);

  json += "}]}";


  Serial.println();
  Serial.println("JSON:");
  Serial.println(json);


  // --------------------------------
  // ⑦ HTTPS準備
  // --------------------------------

  WiFiClientSecure client;

  // 現在は動作確認用
  client.setInsecure();

  HTTPClient https;


  Serial.println();
  Serial.println("Connecting to server...");


  if (!https.begin(client, serverUrl)) {

    Serial.println("HTTPS begin failed");

    return;
  }


  // --------------------------------
  // ⑧ HTTPヘッダー
  // --------------------------------

  https.addHeader(
    "Content-Type",
    "application/json"
  );

  https.addHeader(
    "X-Device-Key",
    deviceKey
  );


  // --------------------------------
  // ⑨ AWSへPOST
  // --------------------------------

  Serial.println("Sending POST...");

  int httpCode =
    https.POST(json);


  // --------------------------------
  // ⑩ 結果確認
  // --------------------------------

  Serial.print("HTTP status: ");
  Serial.println(httpCode);


  if (httpCode > 0) {

    String response =
      https.getString();

    Serial.println("Server response:");
    Serial.println(response);

  } else {

    Serial.print("POST failed: ");

    Serial.println(
      https.errorToString(httpCode)
    );
  }


  https.end();

  Serial.println("========================");
  Serial.println("Measurement finished");
  Serial.println("========================");
}


// ========================================
// setup
// ========================================

void setup() {

  Serial.begin(115200);

  delay(1000);


  // --------------------------------
  // ① I2C開始
  // --------------------------------

  // SDA = GPIO21
  // SCL = GPIO22

  Wire.begin(21, 22);


  // --------------------------------
  // ② BME280開始
  // --------------------------------

  Serial.println("Starting BME280...");


  if (!bme.begin(0x76)) {

    Serial.println("BME280 not found at 0x76");
    Serial.println("Trying 0x77...");


    if (!bme.begin(0x77)) {

      Serial.println("BME280 not found.");

      // センサーが見つからない場合は停止
      while (true) {
        delay(1000);
      }
    }
  }


  Serial.println("BME280 found!");


  // --------------------------------
  // ③ Wi-Fi
  // --------------------------------

  connectWiFi();


  // --------------------------------
  // ④ NTP時刻同期
  // --------------------------------

  configTime(
    9 * 3600,
    0,
    "ntp.nict.jp"
  );


  // --------------------------------
  // ⑤ 起動直後に1回送信
  // --------------------------------

  sendReading();

  lastSendTime = millis();
}


// ========================================
// loop
// ========================================

void loop() {

  // 前回送信から10分経過したか確認
  if (millis() - lastSendTime >= SEND_INTERVAL) {

    sendReading();

    lastSendTime = millis();
  }

  // ESP32に少し休ませる
  delay(100);
}
