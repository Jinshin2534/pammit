# API

ベース URL は `https://<サーバー>/api/v1`。型と最新の仕様は、起動したサーバーの `/docs`（Swagger UI）で確認できる。

## 共通ルール

| 項目 | 内容 |
|---|---|
| 認証 | アプリは `Authorization: Bearer <JWT>`。センサーは `X-Device-Key`。TTN の Webhook は `X-Webhook-Secret`。定期実行は `X-Internal-Secret` |
| 権限 | ログイン中の人の農園のデータだけを返す。管理者向けの操作は `owner` だけ |
| 二重登録 | 書き込みには `client_event_id`（UUID v4）を付ける。同じ ID が再び届いたら、エラーにせず登録済みとして扱う |
| 時刻 | ISO 8601 のタイムゾーン付き（例: `2026-10-03T09:12:34+09:00`） |
| エラー | `{"error": {"code": "...", "message": "...", "detail": {...}}}` |

## エンドポイント

状態の欄は、実装済み / 仮（決まった形で仮の値を返す）/ 予定 の3つ。

### 認証・利用者

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/auth/users` | ログイン画面で選ぶ名前の一覧（農園コード指定） | 予定 |
| POST | `/auth/login` | PIN でログイン | 仮 |
| GET | `/auth/me` | ログイン中の利用者 | 仮 |
| PATCH | `/users/me` | 名前・アイコンの変更 | 予定 |
| GET | `/users` | 作業者の一覧（owner） | 予定 |
| POST | `/users` | 作業者の登録。PIN を発行して返す（owner） | 予定 |
| PATCH | `/users/{id}` | 作業者の変更（owner） | 予定 |

### 園地

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/plots` | 園地の一覧 | 仮 |
| GET | `/plots/{id}` | 園地の詳細 | 仮 |
| POST | `/plots` | 園地の登録（owner） | 予定 |
| PATCH | `/plots/{id}` | 園地の変更（owner） | 予定 |
| GET | `/plots/{id}/field-summary` | 農園画面の表示内容（土壌水分の現在値・前日差・明日の予測、助言、明日の天気） | 予定 |
| GET | `/plots/{id}/sensor-readings` | 測定値の推移 | 実装済み |

### 予定・今日のひとこと

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/schedules` | 予定の一覧（`?from=&to=`） | 予定 |
| POST | `/schedules` | 予定の登録 | 予定 |
| PATCH | `/schedules/{id}` | 予定の変更 | 予定 |
| DELETE | `/schedules/{id}` | 予定の削除 | 予定 |
| GET | `/daily-advice` | 今日のひとこと（`?date=`） | 予定 |

### 作業

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| POST | `/work-sessions` | 作業の開始。判定に使う設定を返す | 仮 |
| POST | `/work-sessions/{id}/finish` | 作業の終了。判定の件数を返し、作業ログを作る | 仮 |
| POST | `/work-sessions/{id}/detections` | 判定結果の登録 | 仮 |
| POST | `/work-sessions/{id}/voice-notes` | 「今日の気づき」の音声を登録 | 予定 |
| GET | `/work-logs` | 作業ログの一覧 | 仮 |

### AI 相談

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/chat/threads` | 過去の会話の一覧 | 予定 |
| POST | `/chat/threads` | 会話を始める（作業中なら `session_id` を付ける） | 予定 |
| GET | `/chat/threads/{id}/messages` | 会話の内容 | 予定 |
| POST | `/chat/threads/{id}/messages` | 質問を送り、回答を受け取る | 予定 |

### 農園日誌

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/journals` | 日ごとの日誌（`?from=&to=`） | 予定 |
| PUT | `/journals/{date}/note` | 備考の保存 | 予定 |
| GET | `/journals/export.pdf` | PDF の出力（`?from=&to=`） | 予定 |

### センサー

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| POST | `/ingest/sensor` | Wi-Fi で直接送るセンサーユニットから受信 | 実装済み |
| POST | `/ingest/lorawan` | The Things Network の Webhook から受信 | 実装済み |

センサーからの送り方は [aws.md](aws.md) にある。

### 評価・定期実行

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| POST | `/evaluation-runs` | 判定精度の評価結果の登録 | 仮 |
| GET | `/evaluation-runs` | 評価結果の一覧 | 仮 |
| POST | `/internal/jobs/daily` | 毎朝の処理（天気の取り込み、今日のひとことの生成） | 予定 |

## 判定の設定の配り方

判定の計算はスマートフォンで行い、サーバーでは計算しない。
サーバーは作業の開始時に判定の設定（閾値など）を返し、判定の結果を受け取って保存する。
設定は DB の `judgment_params` に持ち、コードには書かない。
