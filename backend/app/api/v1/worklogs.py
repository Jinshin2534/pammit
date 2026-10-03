from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.db import get_db
from app.models import User, WorkLog
from app.schemas.worklogs import WorkLog as WorkLogOut

router = APIRouter(prefix="/work-logs", tags=["work-logs"])


@router.get(
    "",
    response_model=list[WorkLogOut],
    summary="作業ログの一覧",
    description="作業ログは作業の終了時に自動で作られる。`from` / `to` は作業日（日本時間）。新しい順。",
)
def list_work_logs(
    plot_id: int | None = None,
    user_id: int | None = None,
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[WorkLogOut]:
    stmt = select(WorkLog).where(WorkLog.farm_id == user.farm_id).order_by(WorkLog.started_at.desc())
    if plot_id is not None:
        stmt = stmt.where(WorkLog.plot_id == plot_id)
    if user_id is not None:
        stmt = stmt.where(WorkLog.user_id == user_id)
    if date_from:
        stmt = stmt.where(WorkLog.worked_on >= date_from)
    if date_to:
        stmt = stmt.where(WorkLog.worked_on <= date_to)
    return [
        WorkLogOut(
            id=w.id, session_id=w.session_id, plot_id=w.plot_id, plot_name=w.plot.name, user_id=w.user_id,
            user_name=w.user.name, work_type=w.work_type, worked_on=w.worked_on, started_at=w.started_at,
            ended_at=w.ended_at, minutes=round((w.ended_at - w.started_at).total_seconds() / 60),
        )
        for w in db.scalars(stmt.limit(500))
    ]
