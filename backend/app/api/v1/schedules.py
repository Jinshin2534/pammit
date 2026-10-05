from datetime import date, time, timedelta

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_plot_in_farm
from app.core.errors import api_error
from app.db import get_db
from app.models import Schedule, User
from app.schemas.schedules import Assignee, ScheduleCreate, ScheduleUpdate, UserRef
from app.schemas.schedules import Schedule as ScheduleOut

router = APIRouter(prefix="/schedules", tags=["schedules"])


def _out(s: Schedule) -> ScheduleOut:
    return ScheduleOut(
        id=s.id, plot_id=s.plot_id, plot_name=s.plot.name, date=s.date, start_time=s.start_time,
        end_time=s.end_time, work_types=s.work_types, note=s.note,
        assignees=[Assignee(id=u.id, name=u.name) for u in s.assignees],
        created_by=UserRef(id=s.creator.id, name=s.creator.name),
    )


def _assignees(db: Session, ids: list[int], farm_id: int, keep: list[User] | None = None) -> list[User]:
    """停止した作業者は新しく担当にできない。`keep`（今の担当）にいる人はそのまま残せる。"""
    unique = list(dict.fromkeys(ids))
    users = list(db.scalars(select(User).where(User.id.in_(unique), User.farm_id == farm_id)))
    if len(users) != len(unique):
        api_error(404, "user_not_found", "担当者が見つかりません")
    kept = {u.id for u in keep or []}
    inactive = [u.id for u in users if not u.active and u.id not in kept]
    if inactive:
        api_error(422, "inactive_assignee", "停止した作業者は担当にできません", {"user_ids": inactive})
    return users


def _check_time_range(start: time | None, end: time | None) -> None:
    if start is not None and end is not None and end <= start:
        api_error(422, "invalid_time_range", "終了時刻は開始時刻より後にしてください")


def _get(db: Session, schedule_id: int, user: User) -> Schedule:
    s = db.get(Schedule, schedule_id)
    if s is None or s.farm_id != user.farm_id:
        api_error(404, "schedule_not_found", "予定が見つかりません")
    return s


def _get_editable(db: Session, schedule_id: int, user: User) -> Schedule:
    """変更と削除は、予定を作った人と owner だけ。"""
    s = _get(db, schedule_id, user)
    if s.created_by != user.id and user.role != "owner":
        api_error(403, "not_your_schedule", "この予定を変えられるのは、作った人と管理者だけです")
    return s


@router.get(
    "",
    response_model=list[ScheduleOut],
    summary="予定の一覧",
    description="`from` / `to` は日付（両端を含む）。省略時は今日から31日分。日付・開始時刻の順。"
    "予定を作った人（`created_by`）も返す。",
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
    description="開始と終了の時刻は必須。停止した作業者は担当にできない（422 `inactive_assignee`）。"
    "同じ `client_event_id` で送り直した場合は、登録済みの予定を 200 で返す。",
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

    _check_time_range(body.start_time, body.end_time)
    plot = get_plot_in_farm(db, body.plot_id, user.farm_id)
    s = Schedule(
        client_event_id=body.client_event_id, farm_id=user.farm_id, plot_id=plot.id, date=body.date,
        start_time=body.start_time, end_time=body.end_time, work_types=[w.value for w in body.work_types],
        note=body.note, created_by=user.id, assignees=_assignees(db, body.assignee_ids, user.farm_id),
    )
    db.add(s)
    db.commit()
    return _out(s)


@router.patch(
    "/{schedule_id}",
    response_model=ScheduleOut,
    summary="予定を変える",
    description="送った項目だけを変える。作った人と owner だけができる（それ以外は 403 `not_your_schedule`）。"
    "時刻は null にできない。停止した作業者は、すでに担当であれば残せるが、新しくは加えられない。",
)
def update_schedule(
    schedule_id: int, body: ScheduleUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ScheduleOut:
    s = _get_editable(db, schedule_id, user)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("plot_id") is not None:
        s.plot = get_plot_in_farm(db, changes["plot_id"], user.farm_id)
    if changes.get("date") is not None:
        s.date = changes["date"]
    for field in ("start_time", "end_time", "note"):
        if field in changes:
            setattr(s, field, changes[field])
    if changes.get("work_types") is not None:
        s.work_types = [w.value for w in body.work_types]
    if changes.get("assignee_ids") is not None:
        s.assignees = _assignees(db, changes["assignee_ids"], user.farm_id, keep=s.assignees)
    _check_time_range(s.start_time, s.end_time)
    db.commit()
    return _out(s)


@router.delete(
    "/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="予定を消す",
    description="作った人と owner だけができる（それ以外は 403 `not_your_schedule`）。",
)
def delete_schedule(schedule_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    db.delete(_get_editable(db, schedule_id, user))
    db.commit()
