# API 仕様

アプリ担当・ハード担当への受け渡し用。**FastAPI の `/docs` が常に最新の正。**
このファイルは全体像と設計意図を示す。

ベースURL: `/api/v1`

## 方針

| 項目 | 決め |
|---|---|
| 認証 | JWT（アプリ）/ デバイスキー（センサー）/ 共有シークレット（内部ジョブ） |
| 冪等性 | 書き込み系は `client_event_id`（UUID v4）必須。重複は無視して 200 を返す |
| 時刻 | ISO 8601、タイムゾーン付き（`2026-08-16T09:12:34+09:00`）。端末時刻とサーバー受信時刻を両方保存 |
| エラー | `{ "error": { "code": "...", "message": "...", "detail": {...} } }` |
| ページング | `?limit=&cursor=`。デフォルト 50件 |

### 判定ロジックはサーバーに置かない

**判定計算はスマートフォン側で行う**（N-01: 1秒以内）。サーバーの役割は2つ。

1. **閾値を配信する**（セッション開始時に一括で渡す）
2. **判定結果を受け取って保存する**（再計算も検証もしない）

これでロジックの二重化を避ける。
ただし `detections` に `relative_size` と `neighbor_count` を保存するため、
**後から閾値を変えて過去データを再評価することは可能**。実装は後回しでよい。

---

## エンドポイント一覧

### 認証

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/auth/login` | PIN でログイン |
| GET | `/auth/me` | 自分の情報（role / skill_level） |

### マスタ

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/plots` | 園地一覧 |
| GET | `/plots/{id}` | 園地詳細（`cultivation_type` を含む） |
| GET | `/users` | 作業者一覧（owner のみ） |
| PATCH | `/users/{id}` | skill_level の変更（owner のみ） |
| GET | `/work-types` | 作業種別マスタ |

### F-01 作業セッション

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/work-sessions` | 開始。**判定設定を一括で返す** |
| POST | `/work-sessions/{id}/finish` | 終了 |
| GET | `/work-sessions/{id}` | 詳細 |
| GET | `/work-sessions` | 一覧（`?plot_id=&from=&to=`） |

### F-02 判定結果

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/work-sessions/{id}/detections` | **バッチ受信**（30秒ごとにまとめて送る） |
| GET | `/work-sessions/{id}/detections` | 一覧 |
| POST | `/uploads/presign` | 画像アップロード用の S3 署名付きURL |

### F-03 作業ログ

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/work-logs` | 選択式UIから記録 |
| GET | `/work-logs` | 一覧（`?plot_id=&from=&to=&incomplete=true`） |
| PATCH | `/work-logs/{id}` | 薬剤名などの後補完 |

### F-04 週次スケジュール

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/plots/{id}/schedule` | 週次の予定（`?from=&days=7`） |
| GET | `/plots/{id}/daily-advice` | 今日のひとこと（`?date=`） |
| POST | `/internal/jobs/generate-schedule` | バッチ起動口（共有シークレット） |

### F-05 精度集計

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/evaluation-runs` | 評価結果の投入（AI担当がバッチで入れる） |
| GET | `/evaluation-runs` | モデルバージョン別の一致率一覧 |

### F-06 AI相談・理由説明

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/assistant/session` | **Realtime API の一時トークン発行** |
| POST | `/assistant/knowledge/search` | RAG検索（Function Calling の実体） |
| GET | `/assistant/work-history` | 過去ログ照会（Function Calling の実体） |

### F-10 センサー

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/ingest/sensor` | Wi-Fi直結ユニットから（`X-Device-Key`） |
| POST | `/ingest/lorawan` | The Things Network の Webhook |
| GET | `/plots/{id}/sensor-readings` | 測定値の参照 |

### F-09 管理者画面

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/admin/progress` | 園地ごとの進捗 |
| GET | `/admin/workers` | 作業者ごとの実績 |

---

## 主要フロー

### 1. 作業セッション

```
アプリ                                    サーバー
  │  POST /work-sessions                     │
  │  { plot_id, work_type, client_event_id } │
  │─────────────────────────────────────────>│
  │  { id, config: { 閾値・規格・信頼度境界 } }  │
  │<─────────────────────────────────────────│
  │                                          │
  │  … 端末内で推論・判定（オフライン）…        │
  │                                          │
  │  POST /work-sessions/{id}/detections     │  30秒ごとにまとめて
  │  { detections: [ …12件… ] }               │
  │─────────────────────────────────────────>│
  │  { accepted: 11, duplicated: 1 }         │
  │<─────────────────────────────────────────│
  │                                          │
  │  POST /work-sessions/{id}/finish         │
  │─────────────────────────────────────────>│
  │            → work_logs が自動生成される     │
```

**セッション開始のレスポンスに判定設定を全部載せる。** これが要点。

- アプリは開始時の1リクエストで、判定に必要なものを全部持てる
- **以降はオフラインで判定が回る**（N-07: 会場にネットがない）
- 判定結果の送信が失敗しても、端末に溜めて後で再送すればよい

### 2. センサー

```
常設ユニット ──(Wi-Fi直結)──> POST /ingest/sensor      X-Device-Key
     or
LoRaWAN ─> TTN ──(Webhook)──> POST /ingest/lorawan     base64 をサーバーでデコード
```

**経路が変わってもサーバー側のドメインロジックは共通。**
ハード担当が Wi-Fi 直結で開発を進め、後から LoRaWAN に切り替えられる。

### 3. AI相談（Realtime API）

```
アプリ                          サーバー                    OpenAI
  │ POST /assistant/session        │                          │
  │───────────────────────────────>│  一時トークンを発行         │
  │                                │─────────────────────────>│
  │  { client_secret, instructions, tools }                   │
  │<───────────────────────────────│                          │
  │                                                           │
  │  WebSocket で直接接続（音声の往復）                          │
  │<─────────────────────────────────────────────────────────>│
  │                                                           │
  │  Function Calling が来たら                                  │
  │  POST /assistant/knowledge/search                          │
  │───────────────────────────────>│                          │
```

**OpenAI の API キーをアプリに埋め込まない。** サーバーが一時トークンを発行する。
`instructions` には `users.skill_level` を反映した内容を入れて返す。

Function Calling の実体の置き場所:

| 関数 | 実体 | 理由 |
|---|---|---|
| `judge_current_frame()` | **アプリのローカル関数** | 判定は端末内で済んでいる。サーバー往復は不要 |
| `search_knowledge(query)` | サーバー（pgvector） | 知識はDBにある |
| `get_work_history(plot_id)` | サーバー | ログはDBにある |
| `get_schedule(plot_id)` | サーバー | 予定はDBにある |

---

## 主要エンドポイントの詳細

### POST /work-sessions

```json
// request
{
  "client_event_id": "550e8400-e29b-41d4-a716-446655440000",
  "plot_id": 3,
  "work_type": "摘果",
  "started_at": "2026-08-16T08:30:00+09:00"
}
```

```json
// response 201
{
  "id": 1024,
  "plot_id": 3,
  "plot_name": "3番ハウス",
  "cultivation_type": "house",
  "work_type": "摘果",
  "user_id": 7,
  "started_at": "2026-08-16T08:30:00+09:00",

  "config": {
    "model_version_expected": "sudachi-v0.3",
    "confidence_thresholds": { "high": 0.8, "low": 0.5 },
    "judgment_params": {
      "dense_neighbor_count": 4,
      "small_relative_size": 0.7,
      "shaded_overlap_ratio": 0.6
    }
  }
}
```

`config` の中身は **DBの `judgment_params` から動的に生成**する。
コードに埋め込まない。

**絶対サイズ（mm）は扱わない。** スケール基準となる手袋マーカーを採用しないため、
判定はすべて画像内の相対比較で行う。

`judgment_params` の初期値は**撮影データで検証してから埋める**。上記は仮の値。

### POST /work-sessions/{id}/detections

```json
// request
{
  "detections": [
    {
      "client_event_id": "…",
      "detected_at": "2026-08-16T09:12:34+09:00",
      "trigger_type": "center",
      "verdict": "take",
      "reason_code": "too_dense",
      "confidence": 0.87,
      "target": {
        "class": "fruit",
        "bbox": [0.42, 0.51, 0.08, 0.09],
        "relative_size": 0.62,
        "neighbor_count": 5
      },
      "model_version": "sudachi-v0.3",
      "image_key": null
    }
  ]
}
```

```json
// response 200
{ "accepted": 11, "duplicated": 1, "rejected": 0 }
```

- `client_event_id` に UNIQUE 制約。**重複はエラーにせず無視する**（再送を安全にするため）
- 1リクエストの上限は 200件
- `image_key` は Wi-Fi 接続時のみ埋まる。通常は `null`

各フィールドの定義は [03-labels.md](03-labels.md) を参照。

### POST /work-logs

```json
// request
{
  "client_event_id": "…",
  "plot_id": 3,
  "work_type": "消毒",
  "worked_on": "2026-08-16",
  "detail": {
    "pesticide": null,
    "dilution": null,
    "amount_l": null
  }
}
```

**`detail` は全項目が任意。** 空でも保存できる。
未補完のものは `GET /work-logs?incomplete=true` で拾い、あとから `PATCH` で埋める。

必須にすると入力が止まり、手書きに戻る。

### GET /plots/{id}/schedule

```json
// response 200
{
  "plot_id": 3,
  "generated_at": "2026-08-16T05:00:00+09:00",
  "today_advice": "土壌水分が28%まで下がっています。午前中に灌水してください。",
  "days": [
    {
      "date": "2026-08-17",
      "tasks": [
        { "work_type": "摘果", "source": "progress", "progress_pct": 60, "note": "残り40%" }
      ],
      "weather": { "forecast": "晴れ", "temp_max": 33 },
      "warning": null
    },
    {
      "date": "2026-08-19",
      "tasks": [],
      "weather": { "forecast": "雨", "precip_mm": 12 },
      "warning": "雨予報。防除は避け、摘果を前倒し推奨"
    }
  ],
  "context_snapshot": {
    "sensor": { "temp": 31.2, "soil_moisture": 28 },
    "recent_works": ["8/14 摘果(3番ハウス)"],
    "calendar": "8月中旬：摘果仕上げ"
  }
}
```

**`context_snapshot` を必ず返す。** 「なぜこの予定か」を辿れることが、
AIが適当に言っているという疑いを潰す。

タスク生成・日程調整はルール、文章化のみLLM。

### POST /ingest/sensor

```
Header: X-Device-Key: <デバイスごとのキー>
```

```json
// request
{
  "readings": [
    {
      "measured_at": "2026-08-16T09:00:00+09:00",
      "temperature": 31.2,
      "humidity": 68.4,
      "pressure": 1008.2,
      "soil_moisture_raw": 512,
      "battery_pct": 87
    }
  ]
}
```

- **`soil_moisture_raw` は ADC の生値をそのまま送る。** 換算はサーバーで行う
  （校正式を直したとき、過去データを再計算できるようにするため）
- **`battery_pct` を必ず入れる。** 常設デバイスで電池切れに気づけないのは致命的
- 送信間隔は10〜30分でよい

### POST /ingest/lorawan

The Things Network の Webhook を受ける。ペイロードは 10 バイト。

| offset | 内容 | 型 | 単位 |
|---|---|---|---|
| 0 | フォーマット版 | uint8 | |
| 1-2 | 気温 | int16 | 0.01℃ |
| 3-4 | 湿度 | uint16 | 0.01% |
| 5-6 | 気圧 | uint16 | (hPa-800)×10 |
| 7-8 | 土壌水分 | uint16 | ADC生値 |
| 9 | 電池残量 | uint8 | % |

**デコードはサーバー側で行う。** TTN のペイロード整形機能は使わない。
git で管理でき、ユニットテストが書け、ChirpStack へ移行しても動くため。

### POST /assistant/session

```json
// response 200
{
  "client_secret": "ek_…",
  "expires_at": "2026-08-16T09:15:00+09:00",
  "model": "gpt-realtime",
  "instructions": "あなたはすだち農家のベテランです。相手は経験の浅い作業者です。…",
  "tools": [
    { "name": "search_knowledge", "description": "…" },
    { "name": "get_work_history", "description": "…" }
  ]
}
```

`instructions` は `users.skill_level` に応じて内容を変える。

### POST /evaluation-runs

KPI（作業の質 95%）の根拠となる数字を投入する口。

```json
// request
{
  "model_version": "sudachi-v0.3",
  "dataset": "2026-09-摘果-評価用",
  "work_type": "摘果",
  "sample_count": 420,
  "agreement_rate": 0.924,
  "breakdown": { "take": { "n": 210, "correct": 198 }, "keep": { "n": 210, "correct": 190 } },
  "note": "ベテラン農家の判定を正解とする"
}
```

**`sample_count` を必須にする。** 「95%」だけより「サンプル420件で92.4%」のほうが信頼される。

---

## 認証方式

| クライアント | 方式 |
|---|---|
| スマホアプリ | `Authorization: Bearer <JWT>` |
| センサーユニット | `X-Device-Key: <デバイスキー>` |
| TTN Webhook | `X-Webhook-Secret` |
| 内部ジョブ | `X-Internal-Secret` |

### ログイン

```json
// POST /auth/login
{ "farm_code": "kamiyama-01", "user_id": 7, "pin": "1234" }
```

農家さんが作業者を事前登録し、4桁PINでログインする。

**アルバイトにアカウント登録とパスワード管理をさせるのは現実的でない。**

---

## 実装順序

バックエンドの着手順。**上から順に、それだけで動作確認できる単位で進める。**

| 順 | 内容 | これができると |
|---|---|---|
| 1 | マイグレーション・認証・マスタ（plots / users） | ログインして園地が取れる |
| 2 | **F-01 セッション + F-02 判定受信** | **アプリ担当が繋ぎ込みを始められる** |
| 3 | F-03 作業ログ | 記録が溜まる |
| 4 | F-10 センサー受信 | **ハード担当が繋ぎ込みを始められる** |
| 5 | F-11 気象取り込み | スケジュールの材料が揃う |
| 6 | F-04 週次スケジュール | 中核機能が動く |
| 7 | F-06 RAG + Realtime トークン | 二次応答が動く |
| 8 | F-05 評価結果 / F-09 管理者画面 | 数字が出せる |

**2 と 4 を早く出すことが最優先。** 他メンバーのブロッカーを外せる。

### 未確定でも進められること

| 未確定 | 影響しない理由 |
|---|---|
| インタラクション方式（center / auto） | `trigger_type` で受けるだけ |
| センサーの通信方式（Wi-Fi / LoRaWAN） | 受け口を2つ用意すれば同じドメインに落ちる |
| 摘果データが撮れるか | `work_type` が変わるだけでAPIは同じ |

**API設計は、残っている未確定事項のどれにもブロックされていない。**

## 未確定のまま残すもの

| 項目 | 埋めるタイミング |
|---|---|
| `judgment_params` の初期値 | 撮影データで検証してから |
| `instructions` の文面 | Realtime API の実装時 |
| F-07 年間カレンダーのエンドポイント | ヒアリングで要否を確認してから |
