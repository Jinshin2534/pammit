from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_plot_in_farm
from app.db import get_db
from app.models import Farm, Plot, User
from app.schemas.field import DailyAdviceOut, FieldSummary
from app.services.daily_advice import get_or_generate
from app.services.field import field_summary

router = APIRouter(tags=["field"])

JST = timezone(timedelta(hours=9))


@router.get(
    "/plots/summary",
    response_model=list[FieldSummary],
    summary="全農園の状態をまとめて返す",
    description="農園画面で農園を切り替えるときに使う。",
)
def list_field_summaries(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[dict]:
    plots = db.scalars(select(Plot).where(Plot.farm_id == user.farm_id).order_by(Plot.id))
    return [field_summary(db, p) for p in plots]


@router.get(
    "/plots/{plot_id}/field-summary",
    response_model=FieldSummary,
    summary="農園画面の中身",
    description=(
        "土壌水分の現在値・24時間前との差・乾燥傾向・明日の予測、明日の天気、灌水の助言、"
        "データ推移の土壌水分タブの解説を返す。\n\n"
        "助言は上から順に判定する: 校正値がない → 土壌水分の値がない → 明日の雨が多い → 今の値が目安未満 → "
        "明日の予測が目安未満 → 6〜9月で乾いていて暑い → それ以外。\n\n"
        "`has_sensor` が false か `last_measured_at` が null なら「測定データがありません」。"
        "`last_measured_at` があって `measured_at` が null なら、30時間以上測定が届いていない（センサーが止まった）。"
    ),
)
def get_field_summary(plot_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    return field_summary(db, get_plot_in_farm(db, plot_id, user.farm_id))


@router.get(
    "/daily-advice",
    response_model=DailyAdviceOut,
    summary="今日のひとこと",
    description="毎朝5時に作る。まだ作られていない日は、呼ばれたときに作る。",
)
def get_daily_advice(
    day: date | None = Query(default=None, alias="date"), user: User = Depends(current_user), db: Session = Depends(get_db)
) -> DailyAdviceOut:
    day = day or datetime.now(JST).date()
    advice = get_or_generate(db, db.get(Farm, user.farm_id), day)
    return DailyAdviceOut(date=advice.date, summary=advice.summary, body=advice.body, generated_at=advice.generated_at)
