"""農園日誌。"""
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.plots import WorkType


class JournalWork(BaseModel):
    start: str = Field(examples=["08:00"])
    end: str = Field(examples=["11:30"])
    user_name: str
    plot_name: str
    work_type: WorkType


class JournalDay(BaseModel):
    date: date
    weather: str | None = Field(default=None, examples=["晴れ"])
    temp_max: float | None = Field(default=None, description="その日の全センサーの最高気温。センサーがなければ null")
    temp_min: float | None = None
    worker_count: int = Field(description="その日に作業した人の数")
    work_types: list[WorkType]
    note: str | None = None
    works: list[JournalWork] = Field(description="作業の明細（時刻は日本時間）")


class JournalNoteIn(BaseModel):
    note: str = Field(max_length=2000, description="空にすると備考を消す")


class JournalExport(BaseModel):
    url: str = Field(description="PDF を開く URL。ブラウザでそのまま開ける")
    expires_at: datetime
