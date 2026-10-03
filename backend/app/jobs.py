"""毎朝の処理。API サーバーの中で動かす（外部のタイマーを置かずに済むように）。

天気予報を取り込み、文字起こしが済んでいない「今日の気づき」をやり直し、各経営体の今日のひとことを作る。
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.db import SessionLocal
from app.models import Farm
from app.services.daily_advice import generate
from app.services.voice_notes import transcribe_pending
from app.services.weather import refresh_forecasts

log = logging.getLogger(__name__)
JST = timezone(timedelta(hours=9))


def run_daily_job() -> None:
    today = datetime.now(JST).date()
    with SessionLocal() as db:
        log.info("天気予報を %d 日分取り込みました", refresh_forecasts(db))
        try:
            log.info("「今日の気づき」を %d 件文字に起こしました", transcribe_pending(db))
        except Exception:  # noqa: BLE001
            db.rollback()
            log.exception("文字起こしのやり直しに失敗しました")
        for farm in db.scalars(select(Farm)):
            try:
                generate(db, farm, today)
            except Exception:  # noqa: BLE001  1つの経営体の失敗で他を止めない
                db.rollback()
                log.exception("今日のひとことを作れませんでした（farm_id=%s）", farm.id)


def seconds_until_next_run(now: datetime) -> float:
    run = now.astimezone(JST).replace(hour=settings.daily_job_hour, minute=0, second=0, microsecond=0)
    if run <= now:
        run += timedelta(days=1)
    return (run - now).total_seconds()


async def daily_loop() -> None:
    # 起動直後に一度、天気だけ取り込んでおく（ひとことは表示時に無ければ作る）
    await asyncio.to_thread(_refresh_weather_safely)
    while True:
        await asyncio.sleep(seconds_until_next_run(datetime.now(timezone.utc)))
        try:
            await asyncio.to_thread(run_daily_job)
        except Exception:  # noqa: BLE001
            log.exception("毎朝の処理に失敗しました")


def _refresh_weather_safely() -> None:
    try:
        with SessionLocal() as db:
            refresh_forecasts(db)
    except Exception:  # noqa: BLE001
        log.exception("天気予報を取り込めませんでした")
