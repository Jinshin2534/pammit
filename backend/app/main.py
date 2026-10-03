import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import install_error_handlers
from app.db import init_db
from app.jobs import daily_loop

DESCRIPTION = """
すだち農家向けの作業支援システム「パミット」の API。資料はリポジトリの `docs/` にある。

| 項目 | 内容 |
|---|---|
| 認証 | アプリは `POST /api/v1/auth/login` で受け取ったトークンを `Authorization: Bearer <token>` で送る。センサーは `X-Device-Key` |
| 二重登録 | 書き込みには `client_event_id`（UUID v4）を付ける。同じ ID が再び届いたら、登録済みのものを返す |
| 時刻 | ISO 8601 のタイムゾーン付き |
| エラー | `{"error": {"code": "...", "message": "...", "detail": {...}}}` |

判定の計算はスマートフォンで行う。サーバーは作業の開始時に判定の設定を返し、結果を受け取って保存する。
"""

TAGS = [
    {"name": "auth", "description": "ログイン。作業者は管理者が登録し、4桁の PIN でログインする。"},
    {"name": "users", "description": "作業者の登録と変更。"},
    {"name": "plots", "description": "農園（園地）。"},
    {"name": "schedules", "description": "予定。人が1日ずつ入力する。"},
    {"name": "work-sessions", "description": "作業の開始から終了まで。帽子を使わない作業も記録する。"},
    {"name": "work-logs", "description": "作業ログ。作業の終了時に自動で作られる。"},
    {"name": "field", "description": "農園画面（土壌水分・天気・灌水の助言）と今日のひとこと。"},
    {"name": "sensors", "description": "園地センサーからの受信と、測定値の参照。"},
    {"name": "evaluation", "description": "判定精度の評価結果。"},
    {"name": "health", "description": "動作確認。"},
]


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    task = asyncio.create_task(daily_loop()) if settings.run_daily_job else None
    yield
    if task:
        task.cancel()


app = FastAPI(
    lifespan=lifespan,
    title=settings.app_name,
    version=settings.version,
    description=DESCRIPTION,
    openapi_tags=TAGS,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={"name": "パミット バックエンド"},
)

install_error_handlers(app)
app.include_router(api_router)


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse("/docs")


@app.get("/health", tags=["health"], summary="ヘルスチェック")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.version}
