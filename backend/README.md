# パミット バックエンド

FastAPI。`/docs` が API 仕様の正。

## 動かす

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --reload
```

| URL | 内容 |
|---|---|
| http://localhost:8000/docs | Swagger UI — その場で叩ける。アプリ担当・ハード担当はこれを見る |
| http://localhost:8000/redoc | ReDoc — 読み物として見やすい。仕様を通読するとき |
| http://localhost:8000/openapi.json | OpenAPI スキーマ |

Docker で動かす場合:

```bash
docker compose up
```

## アプリ担当へ

型は手で書かず、OpenAPI スキーマから生成できます。

```bash
./.venv/bin/python scripts_export_openapi.py     # openapi.json を書き出す
npx openapi-typescript openapi.json -o src/api/schema.d.ts
```

## 現在の状態

センサー受信（`sensors` タグ）だけ実装済みで、DB に保存します。それ以外はスタブ応答です。
AWS 上の構成は [docs/aws.md](../docs/aws.md) を参照。

- テーブルは起動時に自動で作る（`create_all`）。既存テーブルに列を足すときは、`app/db.py` の `ADDED_COLUMNS` にも書く（起動時に、なければ足す）。列の型変更や削除は扱わないので、本番運用前に Alembic へ移行する
- DB は `DATABASE_URL`（既定はローカルの SQLite `pammit.db`）。docker compose では PostgreSQL を使う

```bash
./.venv/bin/pip install -r requirements-dev.txt
./.venv/bin/python -m unittest discover -s tests -t .                 # テスト
./.venv/bin/python -m app.cli create-device --name test --plot-id 3   # 端末登録（デバイスキー発行）
```

エンドポイントごとの実装状況は [docs/api.md](../docs/api.md) にある。

## 構成

```
app/
  main.py          FastAPI アプリ。OpenAPI のメタデータとタグ説明
  core/config.py   設定
  db.py / models.py  DB 接続とテーブル定義（現在はセンサーのみ）
  services/        ドメインロジック（LoRaWAN ペイロードの復号など）
  cli.py           管理コマンド（端末登録）
  schemas/         Pydantic モデル。仕様の実体
  api/v1/          ルーター
```

スキーマの docstring と Field の description が、そのまま `/docs` に出ます。
仕様を変えるときは `schemas/` を直してください。
