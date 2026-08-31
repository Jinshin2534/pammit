from datetime import date, timedelta

from fastapi import APIRouter, Query

from app.api.v1._stub import now
from app.schemas.schedule import DayTask, DayWeather, Schedule, ScheduleDay

router = APIRouter(tags=["schedule"])


@router.get(
    "/plots/{plot_id}/schedule",
    response_model=Schedule,
    summary="週次スケジュール提案",
    description=(
        "課題は「今日何をするか」ではなく **「予定が立たないこと」**。\n\n"
        "タスク生成と日程調整は**ルール**で行い、**文章化だけLLM**に任せる。\n"
        "LLMに日程そのものを組ませると不安定になり、「なぜ木曜が防除なのか」に答えられない。\n\n"
        "`context_snapshot` を必ず返す。**「なぜこの予定か」を辿れることが、"
        "AIが適当に言っているという疑いを潰す。**"
    ),
)
async def get_schedule(
    plot_id: int,
    date_from: date | None = Query(default=None, alias="from"),
    days: int = Query(default=7, ge=1, le=31),
) -> Schedule:
    start = date_from or date(2026, 8, 17)
    return Schedule(
        plot_id=plot_id,
        generated_at=now(),
        today_advice="土壌水分が28%まで下がっています。午前中に灌水してください。",
        days=[
            ScheduleDay(
                date=start,
                tasks=[DayTask(work_type="摘果", source="progress", progress_pct=60, note="残り40%")],  # type: ignore[arg-type]
                weather=DayWeather(forecast="晴れ", temp_max=33, precip_mm=0),
            ),
            ScheduleDay(
                date=start + timedelta(days=2),
                tasks=[],
                weather=DayWeather(forecast="雨", temp_max=28, precip_mm=12),
                warning="雨予報。防除は避け、摘果を前倒し推奨",
            ),
        ],
        context_snapshot={
            "sensor": {"temp": 31.2, "soil_moisture": 28},
            "recent_works": ["8/14 摘果(3番ハウス)"],
            "calendar": "8月中旬：摘果仕上げ",
        },
    )
