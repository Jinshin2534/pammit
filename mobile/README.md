# パミット モバイルアプリ

Android向けのExpo + React Nativeアプリです。Pixel 7aで表示と動作を確認します。

## 技術構成

- Expo SDK 57
- React Native / TypeScript
- expo-router
- TanStack Query
- expo-secure-store
- AsyncStorage
- expo-sqlite

## セットアップ

```bash
npm install
./scripts/fetch-native-models.sh
./scripts/fetch-fruit-detector.sh
```

`fetch-native-models.sh`は音声認識に使うsherpa-onnxのAARとReazonSpeechモデル（約700MBを取得し、必要な約175MBだけ残す）を`modules/pammit-stt/android/`以下へ置きます。Androidのビルド前に一度実行してください。

`fetch-fruit-detector.sh`は果実検出のモデル3つと試験用の写真を`AI実装計画/ai/`から`modules/pammit-fruit-detector/android/src/main/assets/fruit/`へ写します（場所は`PAMMIT_AI_MODELS_DIR`で変えられます）。あわせてONNX Runtime 1.28.2のJava APIのソースを取得します。sherpa-onnxのAARを使うため、`fetch-native-models.sh`の後に実行してください。JDK 17が必要です。

## 開発時の確認

```bash
npm run typecheck
npm run lint
npm run doctor
```

## Pixel実機で起動する

ネイティブ機能を使うため、Expo Goではなく開発ビルドを使用します。

初回、またはネイティブ依存関係と`app.json`を変更した後：

```bash
npx expo prebuild --clean
npx expo run:android --device
```

開発ビルドを端末へインストールした後：

```bash
npx expo start
```

接続先は`EXPO_PUBLIC_API_BASE_URL`で切り替えます。未設定なら`src/config/app.ts`の値です。ローカルのバックエンドにUSBの実機からつなぐとき：

```bash
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 npx expo start --dev-client --port 8081
```

## 主なディレクトリ

| パス | 内容 |
|---|---|
| `src/app/` | expo-routerの画面とレイアウト |
| `src/components/` | 共通コンポーネント |
| `src/api/` | API通信。`schema.d.ts`はOpenAPIから作った型 |
| `src/hat/` | 帽子デバイスとの通信 |
| `src/native/` | 端末内のネイティブ処理（果実検出・音声認識・音声合成）の窓口 |
| `modules/` | Expoのローカルモジュール（`pammit-fruit-detector`、`pammit-stt`、`pammit-tts`） |
| `src/storage/` | 端末保存と未送信キュー |
| `src/providers/` | アプリ全体のProvider（ログインの状態は`auth.tsx`） |
| `src/lib/` | UUID v4、作業の種類の変換、日時の変換 |
| `src/theme/` | 色、余白、フォント、作業の種類ごとの色などのトークン |
| `src/judge.ts` | 切る・残す・判断不可の判定 |
| `docs/` | モバイル実装内の設計資料（共通コンポーネントは [docs/component-contracts.md](docs/component-contracts.md)） |

画面から直接`fetch`せず、通信処理は`src/api/`へ集約します。帽子との通信は`src/hat/`から呼びます。
果実検出・文字起こし・音声合成のネイティブ部品がまだないときは、同じ型とエラー形式のダミーを使います。

画面の動きと通信が切れたときの扱いは [docs/requirements.md](../docs/requirements.md)、APIは [docs/api.md](../docs/api.md) にあります。

## API のつなぎ方

手本は`src/api/auth.ts`です。リソースごとに1ファイル（`schedules.ts`、`plots.ts`など）を作り、次の順に置きます。

1. キー: `xxxKeys`。`invalidateQueries`や`setQueryData`で使う
2. 関数: `apiRequest<型>(パス, { method, query, body, signal })`を呼ぶだけにする。型は`src/api/types.ts`に`Schemas['Schedule']`のような短い名前を足して使う
3. フック: 読むものは`useQuery`、書くものは`useMutation`で包む。書いたあとは関係するキーを`invalidateQueries`する

作ったら`src/api/index.ts`から`export`し、画面は`@/api`から読みます。

- ログイン中の人は`useCurrentUser()`（`@/providers/auth`）で取ります。`id`・`name`・`role`・`icon`・`farm_name`などが入っています。`role`は`user?.role ?? 'worker'`のように使います
- トークンは`apiRequest`が付けます。`401 token_expired`などと`403 owner_only`は`AuthProvider`がまとめて受け、PIN画面・役割の選択・ホームへ戻すので、画面で扱う必要はありません
- エラーはすべて`ApiError`（`status`・`code`・`message`・`detail`）になります。`isApiError(error, 'plot_not_found')`で見分け、通信できなかったときは`isOfflineError(error)`が真です（`status`は0）。画面に出す文は`errorMessage(error)`で、通信が切れているときは「この機能には通信が必要です」になります
- 待ち時間は既定15秒です。AI相談は`timeoutMs: appConfig.aiRequestTimeoutMs`（60秒）を渡します
- 書き込みの`client_event_id`は`uuidV4()`（`@/lib/uuid`）で作ります。同じ操作を送り直すときは同じIDを使います
- 作業の種類は、画面と色は英語キー（`thinning`など）、APIは日本語（`摘果・摘葉`など）です。`toApiWorkType`・`fromApiWorkType`（`@/lib/work-types`）で変換します
- 日時はAPIがタイムゾーン付き（多くはUTC）、画面は日本時間です。`toJstDate`・`toJstTime`・`todayJst`・`jstToIso`、時刻だけの値は`fromApiTime`（"HH:MM:SS"→"HH:MM"）と`toApiTime`を使います（`@/lib/datetime`）
- 端末に残すものは`src/storage/`に関数を足します。読み書きは`try/catch`で包み、失敗してもアプリが止まらないようにします
- `src/providers/app-state.tsx`はまだつないでいない画面のためのダミーです。つないだ画面から使わなくし、最後に消します

バックエンドのスキーマが変わったら型を作り直します（`backend/.venv`が必要です）。

```bash
npm run api:types
```

## 画面の作り方

- Figmaの幅360を基準にします。実機では左右の余白を固定し、本文の幅を伸ばします。文字の大きさは変えません。幅を360に制限するのはWebだけです
- 画面は`SafeAreaView`の中にヘッダー、スクロールする本文、`BottomNav`または`FlowFooter`を置きます。下のバーの下には、システムの操作領域に10を足した余白を取ります
- 色、余白、角丸、線の太さは`src/theme/tokens.ts`の値を使います。フォントはZen Maru GothicのMedium/Boldを`fontFamily`で指定し、`fontWeight`は使いません
- ライトモードだけに対応します。文字の拡大は`maxFontSizeMultiplier={1.2}`までにします
- ボタンは押しているあいだ不透明度70%、使えないときは灰色にします
- 保存の知らせは入力欄の近くに2秒ほど小さく出し、エラーは画面上部の赤い`Banner`で出します
- ぼかし、点線、カレンダーの円は`react-native-svg`で描きます
- アイコンはSVGで`assets/icons/`、画像はPNG（2x・3x）で`assets/images/`に置きます

## ネイティブ部品のエラー

| コード | 意味 |
|---|---|
| `HAT_UNREACHABLE` | スマートフォンから帽子へ接続できない |
| `MODEL_LOAD_FAILED` | モデルがない、壊れている、または期待するバージョンと違う |
| `CAPTURE_FAILED` | 帽子のカメラで撮れない、またはJPEGを受け取れない |
| `INFERENCE_FAILED` | 画像の前処理・推論・後処理に失敗した |
| `TRANSCRIPTION_FAILED` | 文字起こしに失敗した |
| `AUDIO_PLAYBACK_FAILED` | 音声を出せない、または帽子へ送れない |
| `UNKNOWN_ERROR` | 上のどれにも当てはまらない |

作業中の知らせは、エラーの種類ごとに文言を変えます。
