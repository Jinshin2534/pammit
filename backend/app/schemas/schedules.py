"""予定。人が1日ずつ入力する。"""
import datetime as dt

from pydantic import BaseModel, Field

from app.schemas.common import IdempotentCreate
from app.schemas.plots import WorkType


class UserRef(BaseModel):
    id: int
    name: str


class Assignee(UserRef):
    pass


class Schedule(BaseModel):
    id: int
    plot_id: int
    plot_name: str
    date: dt.date
    start_time: dt.time | None = Field(default=None, description="新しい予定では必ず入る。前の形で入れた予定だけ null がある")
    end_time: dt.time | None = Field(default=None, description="start_time と同じ")
    work_types: list[WorkType]
    assignees: list[Assignee] = Field(description="停止した作業者も、すでに担当になっている予定には残る")
    note: str | None = None
    created_by: UserRef = Field(description="予定を作った人。変更と削除は、この人と owner だけができる")


class ScheduleCreate(IdempotentCreate):
    plot_id: int
    date: dt.date
    start_time: dt.time = Field(examples=["08:00"])
    end_time: dt.time = Field(examples=["11:30"], description="start_time より後")
    work_types: list[WorkType] = Field(min_length=1)
    assignee_ids: list[int] = Field(default_factory=list, description="停止した作業者は選べない。owner も選べる")
    note: str | None = Field(default=None, max_length=1000)


class ScheduleUpdate(BaseModel):
    """送った項目だけを変える。時刻は null にできない。"""

    plot_id: int | None = None
    date: dt.date | None = None
    start_time: dt.time = Field(default=None, examples=["08:00"])
    end_time: dt.time = Field(default=None, examples=["11:30"])
    work_types: list[WorkType] | None = Field(default=None, min_length=1)
    assignee_ids: list[int] | None = Field(
        default=None, description="停止した作業者は、すでにこの予定の担当であれば残せる。新しくは加えられない")
    note: str | None = Field(default=None, max_length=1000)
