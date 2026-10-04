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
| `src/theme/` | 色、余白、フォントなどのトークン |
| `docs/` | モバイル実装内の設計資料 |

画面から直接`fetch`せず、通信処理は`src/api/`へ集約します。
