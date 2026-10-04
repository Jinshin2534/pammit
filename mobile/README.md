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

## 主なディレクトリ

| パス | 内容 |
|---|---|
| `src/app/` | expo-routerの画面とレイアウト |
| `src/components/` | 共通コンポーネント |
| `src/api/` | API通信 |
| `src/hat/` | 帽子デバイスとの通信 |
| `src/native/` | 端末内のネイティブ処理（果実検出・音声認識・音声合成）の窓口 |
| `modules/` | Expoのローカルモジュール（`pammit-fruit-detector`、`pammit-stt`、`pammit-tts`） |
| `src/storage/` | 端末保存と未送信キュー |
| `src/providers/` | アプリ全体のProvider |
| `src/theme/` | 色、余白、フォントなどのトークン |
| `docs/` | モバイル実装内の設計資料 |

画面から直接`fetch`せず、通信処理は`src/api/`へ集約します。
