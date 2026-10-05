from collections.abc import Iterable
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_active_plot_in_farm
from app.core.errors import api_error
from app.db import get_db
from app.models import Schedule, User
from app.schemas.schedules import Assignee, ScheduleCreate, ScheduleUpdate
from app.schemas.schedules import Schedule as ScheduleOut

router = APIRouter(prefix="/schedules", tags=["schedules"])


def _out(s: Schedule) -> ScheduleOut:
    return ScheduleOut(
        id=s.id, plot_id=s.plot_id, plot_name=s.plot.name, date=s.date, start_time=s.start_time,
        end_time=s.end_time, work_types=s.work_types, note=s.note,
        assignees=[Assignee(id=u.id, name=u.name) for u in s.assignees],
    )


def _assignees(db: Session, ids: list[int], farm_id: int, current: Iterable[User] = ()) -> list[User]:
    """停止中の人は新しく担当者にできない。すでに担当になっている人はそのまま残せる。"""
    unique = list(dict.fromkeys(ids))
    kept = {u.id for u in current}
    users = list(db.scalars(select(User).where(User.id.in_(unique), User.farm_id == farm_id)))
    if len(users) != len(unique) or any(not u.active and u.id not in kept for u in users):
        api_error(404, "user_not_found", "担当者が見つかりません")
    return users


def _get(db: Session, schedule_id: int, user: User) -> Schedule:
    s = db.get(Schedule, schedule_id)
    if s is None or s.farm_id != user.farm_id:
        api_error(404, "schedule_not_found", "予定が見つかりません")
    return s


@router.get(
    "",
    response_model=list[ScheduleOut],
    summary="予定の一覧",
    description="`from` / `to` は日付（両端を含む）。省略時は今日から31日分。日付・開始時刻の順。",
)
def list_schedules(
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    plot_id: int | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[ScheduleOut]:
    date_from = date_from or date.today()
    date_to = date_to or date_from + timedelta(days=30)
    stmt = (
        select(Schedule)
        .where(Schedule.farm_id == user.farm_id, Schedule.date >= date_from, Schedule.date <= date_to)
        .order_by(Schedule.date, Schedule.start_time, Schedule.id)
    )
    if plot_id is not None:
        stmt = stmt.where(Schedule.plot_id == plot_id)
    return [_out(s) for s in db.scalars(stmt)]


@router.post(
    "",
    response_model=ScheduleOut,
    status_code=status.HTTP_201_CREATED,
    summary="予定を登録する",
    description="同じ `client_event_id` で送り直した場合は、登録済みの予定を 200 で返す。",
)
def create_schedule(
    body: ScheduleCreate, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ScheduleOut:
    existing = db.scalar(select(Schedule).where(Schedule.client_event_id == body.client_event_id))
    if existing is not None:
        if existing.farm_id != user.farm_id:
            api_error(409, "duplicate_event_id", "この client_event_id はすでに使われています")
        response.status_code = status.HTTP_200_OK
        return _out(existing)

    plot = get_active_plot_in_farm(db, body.plot_id, user.farm_id)
    s = Schedule(
        client_event_id=body.client_event_id, farm_id=user.farm_id, plot_id=plot.id, date=body.date,
        start_time=body.start_time, end_time=body.end_time, work_types=[w.value for w in body.work_types],
        note=body.note, created_by=user.id, assignees=_assignees(db, body.assignee_ids, user.farm_id),
    )
    db.add(s)
    db.commit()
    return _out(s)


@router.patch("/{schedule_id}", response_model=ScheduleOut, summary="予定を変える")
def update_schedule(
    schedule_id: int, body: ScheduleUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ScheduleOut:
    s = _get(db, schedule_id, user)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("plot_id") is not None and changes["plot_id"] != s.plot_id:
        s.plot = get_active_plot_in_farm(db, changes["plot_id"], user.farm_id)
    if changes.get("date") is not None:
        s.date = changes["date"]
    for field in ("start_time", "end_time", "note"):
        if field in changes:
            setattr(s, field, changes[field])
    if changes.get("work_types") is not None:
        s.work_types = [w.value for w in body.work_types]
    if changes.get("assignee_ids") is not None:
        s.assignees = _assignees(db, changes["assignee_ids"], user.farm_id, s.assignees)
    if s.start_time and s.end_time and s.end_time <= s.start_time:
        api_error(422, "invalid_time_range", "終了時刻は開始時刻より後にしてください")
    db.commit()
    return _out(s)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT, summary="予定を消す")
def delete_schedule(schedule_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    db.delete(_get(db, schedule_id, user))
    db.commit()
