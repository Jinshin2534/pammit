# API

ベース URL は `https://<サーバー>/api/v1`。型と最新の仕様は、起動したサーバーの `/docs`（Swagger UI）で確認できる。

## 共通ルール

| 項目 | 内容 |
|---|---|
| 認証 | アプリは `Authorization: Bearer <JWT>`。センサーは `X-Device-Key`。TTN の Webhook は `X-Webhook-Secret` |
| 権限 | ログイン中の人の農園のデータだけを返す。管理者向けの操作は `owner` だけ |
| 二重登録 | 書き込みには `client_event_id`（UUID v4）を付ける。同じ ID が再び届いたら、エラーにせず登録済みとして扱う |
| 時刻 | ISO 8601 のタイムゾーン付き（例: `2026-10-03T09:12:34+09:00`） |
| エラー | `{"error": {"code": "...", "message": "...", "detail": {...}}}` |

アプリが扱いを変える主なエラー。

| ステータス | `code` | アプリでの扱い |
|---|---|---|
| 400 | `cannot_demote_self` | 「自分の管理者権限は外せません」と出す |
| 401 | `invalid_pin` | 「名前か PIN が正しくありません」と出し、PIN を入れ直せるようにする |
| 401 | `token_expired` | 前回の人の名前を出した PIN 画面に戻る |
| 401 | `invalid_token` | 覚えていたログイン情報を消し、名前を選ぶ画面に戻る（停止された人もこれになる） |
| 401 | `not_logged_in` | 名前を選ぶ画面に戻る |
| 403 | `owner_only` | 管理者画面を閉じ、「管理者だけが使えます」と出す |
| 403 | `not_your_schedule` | 予定を変える・消すのは作った人と `owner` だけ。ほかの人には編集・削除を出さない |
| 404 | `farm_not_found` | 農園コードを入れ直してもらう |
| 404 | `plot_not_found` | 覚えていた農地を忘れ、一覧を取り直す |
| 404 | `user_not_found` | 作業者・担当者の一覧を取り直す |
| 422 | `inactive_assignee` | 停止した作業者を予定の担当にしようとした。担当者の候補を取り直す |
| 422 | `invalid_time_range` | 予定の終了時刻が開始時刻より前か同じ。入力画面で直してもらう |
| 423 | `pin_locked` | 残り時間（`detail.locked_until` まで）と「別の人でログイン」を出す。5回目に間違えたときから返る |
| 503 | `ai_unavailable` | 「AI相談は今使えません」と出す |

## エンドポイント

状態の欄は、実装済み / 仮（決まった形で仮の値を返す）/ 予定 の3つ。

### 認証・利用者

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/auth/users` | ログイン画面で選ぶ名前の一覧（`?farm_code=&role=`） | 実装済み |
| POST | `/auth/login` | PIN でログイン。5回間違えると15分ロック（5回目から 423） | 実装済み |
| GET | `/auth/me` | ログイン中の利用者 | 実装済み |
| PATCH | `/users/me` | 名前・アイコンの変更 | 実装済み |
| GET | `/users` | 作業者の一覧（owner）。owner と停止中の人も含め、`active` を返す。画面で絞る | 実装済み |
| POST | `/users` | 作業者の登録。PIN を発行して返す（owner） | 実装済み |
| PATCH | `/users/{id}` | 作業者の変更（owner）。削除は `active: false`（停止）で行う | 実装済み |
| POST | `/users/{id}/reset-pin` | PIN の再発行（owner） | 実装済み |
| GET | `/assignee-candidates` | 予定の担当者に選べる人（停止していない利用者。owner も含む）。`id`・`name`・`role` だけを返す。全員が使える | 実装済み |

### 農地

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/plots` | 農地の一覧。削除した農地は返さない | 実装済み |
| GET | `/plots/{id}` | 農地の詳細 | 実装済み |
| POST | `/plots` | 農地の登録（owner） | 実装済み |
| PATCH | `/plots/{id}` | 農地の変更（owner）。ハウス / 露地、土壌水分の目安と校正値も。削除は `active: false` で行う | 実装済み |
| GET | `/plots/summary` | 削除していない全農地の農園画面の中身をまとめて返す（切り替え用） | 実装済み |
| GET | `/plots/{id}/field-summary` | 農園画面の表示内容（土壌水分の現在値・前日差・明日の予測、助言、明日の天気） | 実装済み |
| GET | `/plots/{id}/sensor-readings` | 測定値の推移。土壌水分は農地の校正値で%に換算 | 実装済み |

削除した農地は、新しい予定・作業の開始・予定の農地の変更では 404 `plot_not_found` になる。
過去の予定・作業ログ・日誌には名前を残し、`GET /plots/{id}` などの個別の取得はそのまま使える。`active: true` に戻すと元に戻る。
停止した作業者も同じで、新しく予定の担当者にしようとすると 404 `user_not_found` になり、すでに担当の予定には名前を残す。

### 予定・今日のひとこと

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/schedules` | 予定の一覧（`?from=&to=&plot_id=`）。予定を作った人（`created_by` の `id`・`name`）も返す | 実装済み |
| POST | `/schedules` | 予定の登録。開始と終了の時刻は必須。停止した作業者は担当にできない（`owner` は担当にできる） | 実装済み |
| PATCH | `/schedules/{id}` | 予定の変更（作った人と `owner`）。時刻は消せない。停止した作業者は、すでに担当なら残せるが新しくは加えられない | 実装済み |
| DELETE | `/schedules/{id}` | 予定の削除（作った人と `owner`） | 実装済み |
| GET | `/daily-advice` | 今日のひとこと（`?date=`） | 実装済み |

### 作業

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| POST | `/work-sessions` | 作業の開始。帽子で判定する作業では判定の設定を返す | 実装済み |
| GET | `/work-sessions` | 作業の一覧（`?plot_id=&from=&to=&active=`） | 実装済み |
| GET | `/work-sessions/{id}` | 作業の詳細 | 実装済み |
| POST | `/work-sessions/{id}/finish` | 作業の終了。作業ログを作る | 実装済み |
| POST | `/work-sessions/{id}/detections` | 判定結果の登録。形を AI 側と決めている途中 | 仮 |
| POST | `/work-sessions/{id}/voice-notes` | 「今日の気づき」の音声と、スマートフォンで文字に起こした内容を登録（`multipart/form-data`） | 実装済み |
| GET | `/work-sessions/{id}/voice-notes` | 「今日の気づき」の一覧と文字起こし | 実装済み |
| GET | `/work-logs` | 作業ログの一覧（`?plot_id=&user_id=&from=&to=`） | 実装済み |

### AI 相談

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/chat/threads` | 過去の会話の一覧（`?session_id=` で作業中の会話だけ） | 実装済み |
| POST | `/chat/threads` | 会話を始める（作業中なら `session_id` を付ける） | 実装済み |
| GET | `/chat/threads/{id}/messages` | 会話の内容 | 実装済み |
| POST | `/chat/threads/{id}/messages` | 質問を送り、回答を受け取る。`mode: "voice"` で読み上げ向けの短い答え | 実装済み |
| GET | `/knowledge` | 相談に使う知識の一覧（owner） | 実装済み |
| POST | `/knowledge` | 知識の登録（owner） | 実装済み |

### 農園日誌

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| GET | `/journals` | 日ごとの日誌（`?from=&to=`、1年以内）。作業のない日も返す（owner） | 実装済み |
| PUT | `/journals/{date}/note` | 備考の保存。空にすると消す（owner） | 実装済み |
| POST | `/journals/export` | PDF を作り、10分間だけ開ける URL を返す（`?from=&to=`、owner）。アプリはこの URL をブラウザで開く | 実装済み |
| GET | `/journals/export.pdf` | PDF をそのまま返す（動作確認用、owner） | 実装済み |

### センサー

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| POST | `/ingest/sensor` | Wi-Fi で直接送るセンサーユニットから受信 | 実装済み |
| POST | `/ingest/lorawan` | The Things Network の Webhook から受信 | 実装済み |

センサーからの送り方は [aws.md](aws.md) にある。

### 評価

| メソッド | パス | 用途 | 状態 |
|---|---|---|---|
| POST | `/evaluation-runs` | 判定精度の評価結果の登録 | 仮 |
| GET | `/evaluation-runs` | 評価結果の一覧 | 仮 |

### 実装済みの API に予定している変更

| 対象 | 変更 |
|---|---|
| `GET /work-sessions/{id}` | サーバーが受け取った判定の件数（`take` / `keep` / `unknown`）を返す |
| `POST /work-sessions/{id}/detections` | 受け取った判定を保存する。最大200件ずつ受け、1件ごとに `accepted` / `duplicated` / `rejected` を返す。送れるのは作業を始めた本人だけ |

## 判定の設定の配り方

判定の計算はスマートフォンで行い、サーバーでは計算しない。
サーバーは作業の開始時に判定の設定（閾値など）を返し、判定の結果を受け取って保存する。
設定は DB の `judgment_params` に持ち、コードには書かない。

毎朝5時の処理（天気の取り込み、今日のひとことの生成）は API サーバーの中で動かす。

## AI 相談の仕組み

OpenAI の関数呼び出しを使う。モデルは gpt-6-luna（考える深さは none）。AI は質問に応じて次の関数を呼び、サーバーはログイン中の人の経営体のデータだけを返す。

| 関数 | 返すもの |
|---|---|
| `search_knowledge` | 現地調査・聞き取り・「今日の気づき」から、質問に近い段落 |
| `get_field_status` | 農地の土壌水分・天気・灌水の助言 |
| `get_schedules` | 期間内の予定 |
| `get_work_history` | 最近の作業の記録 |

音声（`mode: "voice"`）のときは速さを優先して関数を使わず、今いる農地の状態・今日と明日の予定・今日の作業・質問に近い知識をサーバーが先に集めて渡す（AI への問い合わせが1回で済む）。それ以外のことを聞かれたら、画面の AI 相談で聞くよう案内する。

判定の結果を引く関数は、判定データの形が決まってから足す。AI を使えないときは 503 `ai_unavailable` を返す。
