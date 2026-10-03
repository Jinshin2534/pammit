# AWS とセンサー受信

クラウドの構成と操作手順、センサーから値を送るための接続情報。
構築コードは [`infra/`](../infra)（AWS CDK / TypeScript）にある。

## 送信の経路

| 経路 | 受け口 | 状態 |
|---|---|---|
| ESP32 → Wi-Fi（スマートフォンのテザリング） → サーバー | `POST /api/v1/ingest/sensor` | 実機で送信する |
| ESP32 + LoRa → ゲートウェイ → TTN → Webhook → サーバー | `POST /api/v1/ingest/lorawan` | サーバー側は実装・テスト済み。LoRa モジュールとゲートウェイは未購入 |

## 構成

```
インターネット ──443──> EC2 t4g.small（Caddy → FastAPI） ──5432──> RDS PostgreSQL 16（db.t4g.micro）
                           │                                    ※閉じたサブネット。EC2 からのみ
                           └──> S3（画像用。今は空）
```

| 項目 | 内容 |
|---|---|
| リージョン | 東京（ap-northeast-1） |
| HTTPS | Caddy が Let's Encrypt から自動取得。ドメインは `<固定IPのドットをハイフンに>.sslip.io` |
| 秘密情報 | DB パスワード・TTN シークレットは Secrets Manager。リポジトリには置かない |
| サーバーへの入り方 | SSH は開けていない。SSM（`infra/scripts/*.sh`）経由で操作する |
| 概算費用 | 月 4,000〜5,000円（EC2・RDS・固定IP・Secrets Manager） |

## 操作

前提: AWS CLI の認証が通っていること、Docker Desktop が起動していること。

```bash
cd infra
npm install

npx cdk diff                  # 変更点の確認。deploy の前に必ず見る（replace に注意）
./scripts/deploy.sh           # 構築・更新。コードを変えたらこれ
./scripts/create-device.sh --name 3番ハウス-01 --plot-id 3   # 端末登録。デバイスキーが表示される
./scripts/list-devices.sh     # 登録済み端末と最終受信時刻
./scripts/show-ttn-secret.sh  # TTN の Webhook に設定するシークレット
```

API の URL は `cdk-outputs.json` の `ApiUrl`、または `aws cloudformation describe-stacks --stack-name Pammit` で確認する。

### 片付け

```bash
npx cdk destroy
```

課金はほぼ止まる。ただし次の2つはデータ保護のため自動では消えない。不要なら手動で削除する。

- RDS の最終スナップショット（月100円程度）
- S3 バケット `pammit-uploads...`（空なら課金なし）

## Wi-Fi で送る

デバイスキーは `create-device.sh` で発行する。発行時に一度だけ表示され、あとから見ることはできない。

```http
POST https://<ApiUrl>/api/v1/ingest/sensor
X-Device-Key: <デバイスキー>
Content-Type: application/json

{
  "readings": [
    {
      "measured_at": "2026-10-01T09:00:00+09:00",
      "temperature": 31.2,
      "humidity": 68.4,
      "pressure": 1008.2,
      "soil_moisture_raw": 512,
      "battery_pct": 87
    }
  ]
}
```

| 応答 | 意味 |
|---|---|
| `200 {"accepted":1,"duplicated":0}` | 保存した |
| `200 {"accepted":0,"duplicated":1}` | 同じ端末・同じ時刻の値がすでにある（再送は安全） |
| `401` | デバイスキーが違う |
| `422` | JSON の形が違う。`measured_at` のタイムゾーン抜け、`battery_pct` 抜けが多い |

- `measured_at` はタイムゾーン付き。ESP32 は NTP で時刻を合わせる（`configTime(9 * 3600, 0, "ntp.nict.jp")`）。
- 送れなかった分は溜めておき、次回まとめて送ってよい（1回100件まで）。
- 取れなかった項目は `null` か省略。`battery_pct` だけは必須。

curl での確認:

```bash
curl -X POST "$API_URL/api/v1/ingest/sensor" \
  -H "X-Device-Key: $DEVICE_KEY" -H 'Content-Type: application/json' \
  -d '{"readings":[{"measured_at":"2026-10-01T09:00:00+09:00","temperature":31.2,"humidity":68.4,"pressure":1008.2,"soil_moisture_raw":512,"battery_pct":87}]}'
```

## 本番構成: LoRaWAN（TTN Webhook）

### ペイロード（10バイト・ビッグエンディアン・FPort 1）

| offset | 内容 | 型 | 単位 | 欠測 |
|---|---|---|---|---|
| 0 | フォーマット版（現在 1） | uint8 | | |
| 1-2 | 気温 | int16 | 0.01℃ | `0x7FFF` |
| 3-4 | 湿度 | uint16 | 0.01% | `0xFFFF` |
| 5-6 | 気圧 | uint16 | (hPa−800)×10 | `0xFFFF` |
| 7-8 | 土壌水分 | uint16 | ADC生値 | `0xFFFF` |
| 9 | 電池残量 | uint8 | % | `0xFF` |

例: 31.2℃ / 68.4% / 1008.2hPa / 512 / 87% → `01 0C 30 1A B8 08 22 02 00 57`（base64 `AQwwGrgIIgIAVw==`）

- 大きい桁から詰める（`0x0C30` なら `0C` → `30` の順）。
- 欠測は実際には出ない値で表す（327.67℃、655.35% など）。
- 測定時刻は TTN の受信時刻を使う。ペイロードには入れない。

### TTN 側の設定

1. TTN（The Things Stack Sandbox）でアプリケーションを作り、端末を登録する（周波数プラン AS923）。
2. 端末の DevEUI でサーバーに登録する: `./scripts/create-device.sh --name 5番畑-lora --plot-id 5 --dev-eui <DevEUI>`
3. Integrations → Webhooks → Custom webhook を追加する。
   - Base URL: `https://<ApiUrl>/api/v1/ingest/lorawan`
   - Additional headers: `X-Webhook-Secret` = `./scripts/show-ttn-secret.sh` の出力
   - Enabled event types: Uplink message のみ

### 部品がなくても確認できる

TTN と同じ形の JSON を送れば、サーバー側の動作を確かめられる。

```bash
curl -X POST "$API_URL/api/v1/ingest/lorawan" \
  -H "X-Webhook-Secret: $TTN_SECRET" -H 'Content-Type: application/json' \
  -d '{"end_device_ids":{"dev_eui":"70B3D57ED0012345"},"received_at":"2026-10-01T00:00:03Z","uplink_message":{"f_port":1,"frm_payload":"AQwwGrgIIgIAVw=="}}'
```

### 買う場合の部品（参考）

| 部品 | 候補 | 目安 |
|---|---|---|
| LoRaWAN モジュール（AS923・技適必須） | Wio-E5 mini、M5Stack Unit LoRaWAN-AS923 | 約4,000〜5,000円 |
| ゲートウェイ（AS923 Japan・技適あり） | SenseCAP M2 屋内ゲートウェイ ＋ 12V 2A アダプター | 約22,000円 |

モジュールは購入前に技適番号と、その番号で認められたアンテナを確認すること。
