"""週次スケジュール提案。

課題は「今日何をするか」ではなく **「予定が立たないこと」** である。
タスク生成と日程調整はルールで書き、**文章化だけ LLM に任せる。**
LLM に日程そのものを組ませると不安定になり、説明もできない。
"""
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.plots import WorkType


class DayTask(BaseModel):
    work_type: WorkType
    source: str = Field(description="calendar（栽培暦）/ progress（進捗から）/ manual", examples=["progress"])
    progress_pct: int | None = Field(default=None, ge=0, le=100)
    note: str | None = None


class DayWeather(BaseModel):
    forecast: str | None = Field(default=None, examples=["晴れ"])
    temp_max: float | None = None
    precip_mm: float | None = None


class ScheduleDay(BaseModel):
    date: date
    tasks: list[DayTask] = Field(default_factory=list)
    weather: DayWeather | None = None
    warning: str | None = Field(default=None, examples=["雨予報。防除は避け、摘果を前倒し推奨"])


class Schedule(BaseModel):
    """`context_snapshot` を必ず返す。

    **「なぜこの予定か」を辿れることが、AIが適当に言っているという疑いを潰す。**
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "plot_id": 3,
                "generated_at": "2026-08-16T05:00:00+09:00",
                "today_advice": "土壌水分が28%まで下がっています。午前中に灌水してください。",
                "days": [
                    {
                        "date": "2026-08-17",
                        "tasks": [
                            {"work_type": "摘果", "source": "progress", "progress_pct": 60, "note": "残り40%"}
                        ],
                        "weather": {"forecast": "晴れ", "temp_max": 33, "precip_mm": 0},
                        "warning": None,
                    },
                    {
                        "date": "2026-08-19",
                        "tasks": [],
                        "weather": {"forecast": "雨", "temp_max": 28, "precip_mm": 12},
                        "warning": "雨予報。防除は避け、摘果を前倒し推奨",
                    },
                ],
                "context_snapshot": {
                    "sensor": {"temp": 31.2, "soil_moisture": 28},
                    "recent_works": ["8/14 摘果(3番ハウス)"],
                    "calendar": "8月中旬：摘果仕上げ",
                },
            }
        }
    )

    plot_id: int
    generated_at: datetime
    today_advice: str | None = Field(default=None, description="いわゆる「今日のひとこと」")
    days: list[ScheduleDay]
    context_snapshot: dict[str, Any] = Field(description="生成に使った材料。説明可能性のために必ず返す")
