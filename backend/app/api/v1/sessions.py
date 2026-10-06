from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from pydantic import AwareDatetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_active_plot_in_farm
from app.core.errors import api_error
from app.db import get_db
from app.models import JudgmentParams, Schedule, User, VoiceNote, WorkLog, WorkSession
from app.schemas.chat import VoiceNote as VoiceNoteOut
from app.schemas.detections import DetectionBatch, DetectionBatchResult
from app.schemas.plots import HAT_WORK_TYPES, WorkType
from app.schemas.sessions import WorkSession as WorkSessionOut
from app.schemas.sessions import WorkSessionCreate, WorkSessionFinish
from app.services import detections, storage
from app.services.voice_notes import attach_transcript

router = APIRouter(prefix="/work-sessions", tags=["work-sessions"])

JST = timezone(timedelta(hours=9))
MAX_AUDIO_BYTES = 10 * 1024 * 1024


def _out(db: Session, s: WorkSession, counts=None) -> WorkSessionOut:
    if counts is None:
        counts = detections.counts(db, [s.id])[s.id]
    return WorkSessionOut(
        id=s.id, plot_id=s.plot_id, plot_name=s.plot.name, work_type=s.work_type, user_id=s.user_id,
        schedule_id=s.schedule_id, uses_hat=s.uses_hat, started_at=s.started_at, ended_at=s.ended_at,
        config=s.config_snapshot, counts=counts,
    )


def _config(db: Session, farm_id: int, work_type: WorkType) -> dict | None:
    p = db.scalar(select(JudgmentParams).where(
        JudgmentParams.farm_id == farm_id, JudgmentParams.work_type == work_type.value))
    if p is None:
        return None
    return {
        "model_version_expected": p.model_version_expected,
        "confidence_thresholds": {"high": p.confidence_high, "low": p.confidence_low},
        "params": p.params,
    }


def _get_session(db: Session, session_id: int, user: User) -> WorkSession:
    s = db.get(WorkSession, session_id)
    if s is None or s.farm_id != user.farm_id:
        api_error(404, "session_not_found", "作業が見つかりません")
    return s


def _get_own_session(db: Session, session_id: int, user: User, message: str) -> WorkSession:
    s = _get_session(db, session_id, user)
    if s.user_id != user.id:
        api_error(403, "not_your_session", message)
    return s


def _check_schedule(db: Session, schedule_id: int, user: User, plot_id: int, work_type: WorkType) -> None:
    schedule = db.get(Schedule, schedule_id)
    if schedule is None or schedule.farm_id != user.farm_id:
        api_error(404, "schedule_not_found", "予定が見つかりません")
    if schedule.assignees and user.id not in {a.id for a in schedule.assignees}:
        api_error(403, "not_schedule_assignee", "担当になっていない予定からは始められません")
    if schedule.plot_id != plot_id:
        api_error(422, "schedule_plot_mismatch", "予定の農地と違います")
    if work_type.value not in schedule.work_types:
        api_error(422, "work_type_not_in_schedule", "予定にない作業です")


@router.post(
    "",
    response_model=WorkSessionOut,
    status_code=status.HTTP_201_CREATED,
    summary="作業を始める",
    description=(
        "作業はログイン中の人のものになる。1人が同時に進められる作業は1つで、終わっていない作業があれば "
        "409 `session_already_active` を返す（`detail.session_id` に進めている作業のID）。\n\n"
        "帽子を使って判定する作業（摘果・摘葉、収穫）では、判定に使う設定を `config` で返す。"
        "設定がサーバーにないときは 409 `judgment_config_missing` を返す。"
        "`uses_hat: false` なら設定を返さず、設定がなくても始められる。\n\n"
        "`schedule_id` を付けるときは、本人が担当（担当者のない予定は誰でも）で、農地と作業が予定と合っていること。"
        "担当者が複数いる予定は、それぞれが同じ `schedule_id` で自分の作業を始める。\n\n"
        "同じ `client_event_id` で送り直した場合は、作成済みの作業を 200 で返す（ほかの確認より先に行う）。"
    ),
)
def start_session(
    body: WorkSessionCreate, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> WorkSessionOut:
    existing = db.scalar(select(WorkSession).where(WorkSession.client_event_id == body.client_event_id))
    if existing is not None:
        if existing.user_id != user.id:
            api_error(409, "duplicate_event_id", "この client_event_id はすでに使われています")
        response.status_code = status.HTTP_200_OK
        return _out(db, existing)

    active = db.scalar(select(WorkSession).where(WorkSession.user_id == user.id, WorkSession.ended_at.is_(None))
                       .order_by(WorkSession.started_at.desc()).limit(1))
    if active is not None:
        api_error(409, "session_already_active", "終わっていない作業があります", {"session_id": active.id})

    plot = get_active_plot_in_farm(db, body.plot_id, user.farm_id)
    if body.schedule_id is not None:
        _check_schedule(db, body.schedule_id, user, plot.id, body.work_type)

    config = None
    if body.uses_hat and body.work_type in HAT_WORK_TYPES:
        config = _config(db, user.farm_id, body.work_type)
        if config is None:
            api_error(409, "judgment_config_missing", "判定の設定がないため、帽子を使って始められません")

    s = WorkSession(
        client_event_id=body.client_event_id, farm_id=user.farm_id, plot_id=plot.id, user_id=user.id,
        schedule_id=body.schedule_id, work_type=body.work_type.value, uses_hat=body.uses_hat,
        started_at=body.started_at, config_snapshot=config,
    )
    db.add(s)
    db.commit()
    return _out(db, s)


@router.post(
    "/{session_id}/finish",
    response_model=WorkSessionOut,
    summary="作業を終える",
    description="作業ログを自動で作る。終了済みの作業に送り直しても、最初の終了時刻のまま 200 を返す。",
)
def finish_session(
    session_id: int, body: WorkSessionFinish, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> WorkSessionOut:
    s = _get_own_session(db, session_id, user, "ほかの人の作業は終了できません")
    if s.ended_at is None:
        if body.ended_at < s.started_at:
            api_error(422, "ended_before_start", "終了時刻が開始時刻より前です")
        s.ended_at = body.ended_at
        db.add(WorkLog(
            farm_id=s.farm_id, session_id=s.id, plot_id=s.plot_id, user_id=s.user_id, work_type=s.work_type,
            worked_on=s.started_at.astimezone(JST).date(), started_at=s.started_at, ended_at=s.ended_at,
        ))
        db.commit()
    return _out(db, s)


@router.get("/{session_id}", response_model=WorkSessionOut, summary="作業の詳細")
def get_session(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> WorkSessionOut:
    return _out(db, _get_session(db, session_id, user))


@router.get(
    "",
    response_model=list[WorkSessionOut],
    summary="作業の一覧",
    description=(
        "`from` / `to` は日本時間の日付。新しい順。`active=true` で終了していない作業だけ、"
        "`mine=true` でログイン中の人の作業だけを返す。"
        "ログイン直後に `mine=true&active=true` で、進めている自分の作業を探す。"
    ),
)
def list_sessions(
    plot_id: int | None = None,
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    active: bool | None = None,
    mine: bool | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[WorkSessionOut]:
    stmt = select(WorkSession).where(WorkSession.farm_id == user.farm_id).order_by(WorkSession.started_at.desc())
    if plot_id is not None:
        stmt = stmt.where(WorkSession.plot_id == plot_id)
    if date_from:
        stmt = stmt.where(WorkSession.started_at >= datetime.combine(date_from, time.min, JST))
    if date_to:
        stmt = stmt.where(WorkSession.started_at < datetime.combine(date_to + timedelta(days=1), time.min, JST))
    if active is True:
        stmt = stmt.where(WorkSession.ended_at.is_(None))
    if mine is True:
        stmt = stmt.where(WorkSession.user_id == user.id)
    sessions = list(db.scalars(stmt.limit(500)))
    counts = detections.counts(db, [s.id for s in sessions])
    return [_out(db, s, counts[s.id]) for s in sessions]


@router.post(
    "/{session_id}/detections",
    response_model=DetectionBatchResult,
    summary="判定結果を送る",
    description=(
        "帽子の判定のたびにその場で送る。通信が切れていたあいだの分は端末に残し、戻ったら200件ずつ送る。"
        "送れるのは作業を始めた本人だけ。同じ `client_event_id` は保存し直さない。\n\n"
        "件数は作業の `counts`（切る・残す・判断不可）と作業ログに出る。"
    ),
)
def post_detections(
    session_id: int, body: DetectionBatch, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> DetectionBatchResult:
    s = _get_own_session(db, session_id, user, "ほかの人の作業には判定を送れません")
    accepted, duplicated = detections.save(db, s, user, body.detections)
    return DetectionBatchResult(accepted=accepted, duplicated=duplicated, rejected=0)


@router.post(
    "/{session_id}/voice-notes",
    response_model=VoiceNoteOut,
    status_code=status.HTTP_201_CREATED,
    summary="「今日の気づき」の音声を送る",
    description=(
        "`multipart/form-data` で `file`（音声ファイル、10MB まで）、`client_event_id`、"
        "`transcript`（スマートフォンで文字に起こした内容）、`recorded_at`（端末で録音した時刻。省くとサーバーが受け取った時刻）"
        "を送る。送れるのは作業を始めた本人だけ。\n\n"
        "`transcript` は相談に使う知識にも加える。同じ `client_event_id` で送り直した場合は、登録済みのものを 200 で返す。"
    ),
)
async def post_voice_note(
    session_id: int,
    response: Response,
    file: UploadFile = File(),
    client_event_id: UUID = Form(),
    transcript: str = Form(min_length=1, max_length=5000),
    recorded_at: AwareDatetime | None = Form(default=None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> VoiceNoteOut:
    s = _get_own_session(db, session_id, user, "ほかの人の作業には残せません")
    existing = db.scalar(select(VoiceNote).where(VoiceNote.client_event_id == client_event_id))
    if existing is not None:
        response.status_code = status.HTTP_200_OK
        return _voice_note(existing)
    content_type = file.content_type or ""
    if not content_type.startswith("audio/"):
        api_error(415, "not_audio", "音声ファイルを送ってください")
    data = await file.read()
    if len(data) > MAX_AUDIO_BYTES:
        api_error(413, "too_large", "音声ファイルが大きすぎます（10MB まで）")

    suffix = Path(file.filename or "").suffix or ".m4a"
    key = f"voice-notes/{s.farm_id}/{s.id}/{client_event_id}{suffix}"
    await run_in_threadpool(storage.put, key, data, content_type)
    now = datetime.now(timezone.utc)
    note = VoiceNote(client_event_id=client_event_id, farm_id=s.farm_id, session_id=s.id, user_id=user.id,
                     storage_key=key, content_type=content_type, recorded_at=recorded_at or now, created_at=now)
    db.add(note)
    db.commit()
    attach_transcript(db, note, transcript.strip())
    return _voice_note(note)


@router.get("/{session_id}/voice-notes", response_model=list[VoiceNoteOut], summary="「今日の気づき」の一覧")
def list_voice_notes(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[VoiceNoteOut]:
    s = _get_session(db, session_id, user)
    return [_voice_note(n) for n in db.scalars(select(VoiceNote).where(VoiceNote.session_id == s.id).order_by(VoiceNote.id))]


def _voice_note(n: VoiceNote) -> VoiceNoteOut:
    return VoiceNoteOut(id=n.id, session_id=n.session_id, transcript=n.transcript,
                        recorded_at=n.recorded_at or n.created_at, created_at=n.created_at)
