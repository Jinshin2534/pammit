# 農地センサー（ESP32）

`field-sensor.ino` は ESP32、容量式土壌水分センサー、BME280 の測定値を10分ごとに Pammit API へ送ります。

1. `secrets.example.h` を同じフォルダの `secrets.h` にコピーし、Wi-Fi、デバイスキー、送信先URLを入力します。`secrets.h` は Git に追加されません。
2. Arduino IDE に ESP32 ボードパッケージと `Adafruit BME280 Library`（依存する `Adafruit Unified Sensor` を含む）を導入します。
3. `field-sensor.ino` を開き、対象の ESP32 ボードと現在表示されているシリアルポートを選択して書き込みます。
4. シリアルモニターを **115200 baud** で開き、Wi-Fi 接続、測定値、HTTP status を確認します。

配線は土壌水分センサーのアナログ出力が GPIO34、BME280 の SDA が GPIO21、SCL が GPIO22 です。BME280 の I2C アドレスは `0x76`、見つからなければ `0x77` を試します。

このスケッチは貼り付けられた実機コードを元にしています。HTTPS の証明書検証は現在無効（`setInsecure()`）なので、本番運用前にサーバー証明書を検証する設定に変更してください。
