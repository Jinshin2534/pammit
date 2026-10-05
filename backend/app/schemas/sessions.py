"""作業セッション。作業を始めてから終えるまでの1回分。"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import IdempotentCreate
from app.schemas.plots import WorkType


class ConfidenceThresholds(BaseModel):
    high: float = Field(description="これ以上なら言い切る", examples=[0.8])
    low: float = Field(description="これ未満は unknown にする", examples=[0.5])


class SessionConfig(BaseModel):
    """判定に使う設定。帽子を使って判定する作業（摘果・摘葉、収穫）のときだけ返す。

    値は DB の `judgment_params` から作る。アプリは作業の間これを使って判定する。
    """

    model_version_expected: str = Field(examples=["sudachi-v0.3"])
    confidence_thresholds: ConfidenceThresholds
    params: dict[str, Any] = Field(default_factory=dict, description="閾値など。中身はAIの判定方式に合わせて決める")


class WorkSessionCreate(IdempotentCreate):
    plot_id: int
    work_type: WorkType
    schedule_id: int | None = Field(
        default=None, description="予定から始めたときの予定ID。担当者が何人いても、作業は1人ずつ同じ予定IDで始める")
    uses_hat: bool = Field(
        default=True, description="帽子を使うか。偽なら判定する作業（摘果・摘葉、収穫）でも判定の設定を返さない")
    started_at: datetime


class WorkSession(BaseModel):
    id: int
    plot_id: int
    plot_name: str
    work_type: WorkType
    user_id: int
    schedule_id: int | None = None
    uses_hat: bool
    started_at: datetime
    ended_at: datetime | None = None
    config: SessionConfig | None = Field(default=None, description="判定しない作業と、帽子を使わない作業では null")


class WorkSessionFinish(BaseModel):
    ended_at: datetime
