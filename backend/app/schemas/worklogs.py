"""作業ログ。作業セッションの終了時に自動で作る。"""
from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.plots import WorkType
from app.schemas.sessions import DetectionCounts


class WorkLog(BaseModel):
    id: int
    session_id: int
    plot_id: int
    plot_name: str
    user_id: int
    user_name: str
    work_type: WorkType
    worked_on: date
    started_at: datetime
    ended_at: datetime
    minutes: int
    counts: DetectionCounts
