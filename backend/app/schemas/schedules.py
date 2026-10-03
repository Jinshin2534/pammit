"""予定。人が1日ずつ入力する。"""
import datetime as dt

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import IdempotentCreate
from app.schemas.plots import WorkType


class Assignee(BaseModel):
    id: int
    name: str


class Schedule(BaseModel):
    id: int
    plot_id: int
    plot_name: str
    date: dt.date
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    work_types: list[WorkType]
    assignees: list[Assignee]
    note: str | None = None


class _TimeRange(BaseModel):
    @model_validator(mode="after")
    def _check_time_range(self):
        start, end = getattr(self, "start_time", None), getattr(self, "end_time", None)
        if start is not None and end is not None and end <= start:
            raise ValueError("終了時刻は開始時刻より後にしてください")
        return self


class ScheduleCreate(IdempotentCreate, _TimeRange):
    plot_id: int
    date: dt.date
    start_time: dt.time | None = Field(default=None, examples=["08:00"])
    end_time: dt.time | None = Field(default=None, examples=["11:30"])
    work_types: list[WorkType] = Field(min_length=1)
    assignee_ids: list[int] = Field(default_factory=list)
    note: str | None = Field(default=None, max_length=1000)


class ScheduleUpdate(_TimeRange):
    plot_id: int | None = None
    date: dt.date | None = None
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    work_types: list[WorkType] | None = Field(default=None, min_length=1)
    assignee_ids: list[int] | None = None
    note: str | None = Field(default=None, max_length=1000)
