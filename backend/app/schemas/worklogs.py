"""作業ログ。栽培暦の元データになる。"""
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import IdempotentCreate
from app.schemas.plots import WorkType


class WorkLogSource(str, Enum):
    """記録の入り方。

    - `device` … 帽子のセッションから完全自動。**「記入忘れ」が構造的に消滅する**
    - `manual` … 選択式UI（園地 → 作業種別 → 保存）の3タップ
    """

    device = "device"
    manual = "manual"


class WorkLogDetail(BaseModel):
    """防除などの詳細。**全項目が任意。**

    必須にすると入力が止まり、手書きに戻る。それが最悪の結末である。
    未補完のものは `GET /work-logs?incomplete=true` で拾い、あとから PATCH で埋める。
    """

    pesticide: str | None = Field(default=None, description="薬剤名", examples=[None])
    dilution: int | None = Field(default=None, description="希釈倍率", examples=[None])
    amount_l: float | None = Field(default=None, description="使用量（L）", examples=[None])
    memo: str | None = None


class WorkLogCreate(IdempotentCreate):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "client_event_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
                "plot_id": 3,
                "work_type": "消毒",
                "worked_on": "2026-08-16",
                "detail": {"pesticide": None, "dilution": None, "amount_l": None},
            }
        }
    )

    plot_id: int
    work_type: WorkType
    worked_on: date
    detail: WorkLogDetail = Field(default_factory=WorkLogDetail)


class WorkLogUpdate(BaseModel):
    """あとから薬剤名などを補完する。"""

    detail: WorkLogDetail


class WorkLog(BaseModel):
    id: int
    plot_id: int
    user_id: int
    work_type: WorkType
    worked_on: date
    started_at: datetime | None = None
    ended_at: datetime | None = None
    source: WorkLogSource
    detail: WorkLogDetail
    incomplete: bool = Field(description="detail に未入力の項目があるか")
