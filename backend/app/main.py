from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from app.api.v1.router import api_router
from app.core.config import settings

DESCRIPTION = """
すだち農家向け技能継承システム **パミット** のバックエンドAPI。

**このページが API 仕様の正です。** 設計の背景は `docs/` を参照してください。

---

### システム構成

```
帽子（Raspberry Pi Zero 2 W）  I/O のみ — カメラ / マイク / スピーカー
      ↕ Wi-Fi（スマホのテザリング）
スマートフォン（Android）      YOLO推論 / 判定計算 / 一次応答 / Realtime API 仲介
      ↕ LTE
AWS（EC2 + RDS + S3）          記録 / 週次スケジュール生成 / RAG   ← ここ
```

### 判定ロジックはサーバーに置きません

判定計算は**スマートフォン側**で行います（応答1秒以内という要件のため）。
サーバーの役割は2つだけです。

1. **閾値を配信する** — セッション開始時に一括で渡す
2. **判定結果を受け取って保存する** — 再計算も検証もしない

これでロジックの二重化を避けています。

### 共通の約束

| 項目 | 決め |
|---|---|
| 冪等性 | 書き込み系は `client_event_id`（UUID v4）必須。**重複は無視して 200 を返す** |
| 時刻 | ISO 8601、タイムゾーン付き。端末時刻とサーバー受信時刻を両方保存する |
| 認証 | `Authorization: Bearer <JWT>`（アプリ） / `X-Device-Key`（センサー） |

### 現在の状態

**スタブ応答を返しています。** DB接続前でも、アプリ担当・ハード担当が繋ぎ込みを始められます。
"""

TAGS = [
    {"name": "auth", "description": "認証。作業者は農家さんが事前登録し、**4桁PIN**でログインする。"},
    {"name": "masters", "description": "園地などのマスタ。`cultivation_type`（ハウス／露地）が全体の分岐の起点。"},
    {
        "name": "work-sessions",
        "description": (
            "作業セッションと判定結果。**最優先で実装する。**\n\n"
            "開始レスポンスに判定設定を全部載せるため、"
            "**以降はオフラインで判定が回る**（本選会場にネット環境はない）。"
        ),
    },
    {
        "name": "work-logs",
        "description": (
            "作業ログ。摘果・摘葉・収穫は**セッションから自動記録**されるため入力不要。\n"
            "それ以外は選択式UIで3タップ。薬剤名などは**すべて任意入力**。"
        ),
    },
    {
        "name": "schedule",
        "description": (
            "週次スケジュール提案。課題は「今日何をするか」ではなく**「予定が立たないこと」**。\n"
            "日程はルールで組み、**文章化だけLLM**に任せる。"
        ),
    },
    {
        "name": "sensors",
        "description": (
            "園地に常設したセンサーユニットからの受信。\n"
            "Wi-Fi直結とLoRaWANの**両方の口を用意**しているため、"
            "ハード担当は先にWi-Fiで開発を進められる。"
        ),
    },
    {
        "name": "assistant",
        "description": (
            "AI相談と判定の理由説明（**二次応答**・2〜3秒）。\n"
            "一次応答（判定直後の定型音声・0.3秒）はオフラインで完結し、ここを通らない。"
        ),
    },
    {
        "name": "evaluation",
        "description": "判定精度。**KPI「作業の質 95%」の根拠となる唯一の数字。**",
    },
    {"name": "admin", "description": "管理者画面向けの集計。最小限に留める。"},
]

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=DESCRIPTION,
    openapi_tags=TAGS,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={"name": "パミット バックエンド"},
)

app.include_router(api_router)


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse("/docs")


@app.get("/health", tags=["admin"], summary="ヘルスチェック")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.version}
