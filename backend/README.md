# パミット バックエンド

FastAPI。**`/docs` が API 仕様の正。**

## 動かす

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --reload
```

| URL | 内容 |
|---|---|
| http://localhost:8000/docs | **Swagger UI** — その場で叩ける。アプリ担当・ハード担当はこれを見る |
| http://localhost:8000/redoc | **ReDoc** — 読み物として見やすい。仕様を通読するとき |
| http://localhost:8000/openapi.json | OpenAPI スキーマ |

Docker で動かす場合:

```bash
docker compose up
```

## アプリ担当へ

**型の手書きは不要です。** OpenAPI スキーマから生成できます。

```bash
./.venv/bin/python scripts_export_openapi.py     # openapi.json を書き出す
npx openapi-typescript openapi.json -o src/api/schema.d.ts
```

## 現在の状態

**全エンドポイントがスタブ応答を返します。** DB接続前でも繋ぎ込みを始められます。

実装順序（[docs/requirements/04-api.md](../docs/requirements/04-api.md)）:

| 順 | 内容 | これができると |
|---|---|---|
| 1 | 認証・マスタ | ログインして園地が取れる |
| **2** | **セッション + 判定受信** | **アプリ担当が繋ぎ込みを始められる** |
| 3 | 作業ログ | 記録が溜まる |
| **4** | **センサー受信** | **ハード担当が繋ぎ込みを始められる** |
| 5〜8 | 気象 → スケジュール → RAG → 集計 | |

## 構成

```
app/
  main.py          FastAPI アプリ。OpenAPI のメタデータとタグ説明
  core/config.py   設定
  schemas/         Pydantic モデル。★ここが仕様の実体
  api/v1/          ルーター
```

**スキーマの docstring と Field の description が、そのまま `/docs` に出ます。**
仕様を変えるときは `schemas/` を直してください。
