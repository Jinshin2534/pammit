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
```

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
| `src/storage/` | 端末保存と未送信キュー |
| `src/providers/` | アプリ全体のProvider |
| `src/theme/` | 色、余白、フォント、作業の種類ごとの色などのトークン |
| `src/judge.ts` | 切る・残す・判断不可の判定 |
| `docs/` | モバイル実装内の設計資料（共通コンポーネントは [docs/component-contracts.md](docs/component-contracts.md)） |

画面から直接`fetch`せず、通信処理は`src/api/`へ集約します。帽子との通信は`src/hat/`から呼びます。
果実検出・文字起こし・音声合成のネイティブ部品がまだないときは、同じ型とエラー形式のダミーを使います。

画面の動きと通信が切れたときの扱いは [docs/requirements.md](../docs/requirements.md)、APIは [docs/api.md](../docs/api.md) にあります。

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
