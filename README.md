# パミット（pammit）

すだち農家の作業判断を、帽子型のデバイスとスマートフォンで支援するシステムです。
帽子のカメラで撮った実を判定して、摘むか残すかを音声で伝えます。作業の記録は自動で溜まります。

第37回全国高専プログラミングコンテスト 課題部門（神山まるごと高専）の作品です。

## 構成

```text
帽子（Raspberry Pi Zero 2 W）   撮影・音声の再生
        │ Wi-Fi（スマートフォンのテザリング）
スマートフォン（Android）        画面・果実検出・判定
        │ インターネット
AWS（EC2 + RDS + S3）            記録・予定・AI相談・センサーデータ
        ↑
園地センサー（ESP32）            土壌水分・気温・湿度・気圧
```

## ディレクトリ

| パス | 内容 |
|---|---|
| `backend/` | API サーバー（FastAPI） |
| `infra/` | AWS の構成（CDK） |
| `docs/` | 仕様と運用の資料 |

## 動かし方

API サーバーをローカルで起動する手順は [backend/README.md](backend/README.md) にあります。
AWS への構築とデプロイの手順は [docs/aws.md](docs/aws.md) にあります。

## 資料

| 資料 | 内容 |
|---|---|
| [docs/overview.md](docs/overview.md) | 背景・対象者・課題・KPI |
| [docs/requirements.md](docs/requirements.md) | 画面と機能、非機能要件 |
| [docs/data-model.md](docs/data-model.md) | テーブル設計 |
| [docs/api.md](docs/api.md) | API の一覧と共通ルール |
| [docs/labels.md](docs/labels.md) | 画像のラベル定義 |
| [docs/ai.md](docs/ai.md) | 果実検出と判定の構成、評価 |
| [docs/hardware.md](docs/hardware.md) | 帽子と園地センサーの構成 |
| [docs/aws.md](docs/aws.md) | AWS の構成と操作、センサーの送信方法 |
