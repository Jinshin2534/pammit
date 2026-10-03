from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_plot_in_farm
from app.core.errors import api_error
from app.db import SessionLocal, get_db
from app.models import JudgmentParams, Schedule, User, VoiceNote, WorkLog, WorkSession
from app.schemas.chat import VoiceNote as VoiceNoteOut
from app.schemas.detections import DetectionBatch, DetectionBatchResult
from app.schemas.plots import HAT_WORK_TYPES, WorkType
from app.schemas.sessions import WorkSession as WorkSessionOut
from app.schemas.sessions import WorkSessionCreate, WorkSessionFinish
from app.services.voice_notes import save_audio, transcribe_note

router = APIRouter(prefix="/work-sessions", tags=["work-sessions"])

JST = timezone(timedelta(hours=9))
MAX_AUDIO_BYTES = 10 * 1024 * 1024


def _out(s: WorkSession) -> WorkSessionOut:
    return WorkSessionOut(
        id=s.id, plot_id=s.plot_id, plot_name=s.plot.name, work_type=s.work_type, user_id=s.user_id,
        schedule_id=s.schedule_id, started_at=s.started_at, ended_at=s.ended_at, config=s.config_snapshot,
    )


def _config(db: Session, farm_id: int, work_type: WorkType) -> dict | None:
    if work_type not in HAT_WORK_TYPES:
        return None
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


@router.post(
    "",
    response_model=WorkSessionOut,
    status_code=status.HTTP_201_CREATED,
    summary="作業を始める",
    description=(
        "帽子で判定する作業（摘果・摘葉、収穫）では、判定に使う設定を `config` で返す。\n\n"
        "同じ `client_event_id` で送り直した場合は、作成済みの作業を 200 で返す。"
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
        return _out(existing)

    plot = get_plot_in_farm(db, body.plot_id, user.farm_id)
    if body.schedule_id is not None:
        schedule = db.get(Schedule, body.schedule_id)
        if schedule is None or schedule.farm_id != user.farm_id:
            api_error(404, "schedule_not_found", "予定が見つかりません")

    s = WorkSession(
        client_event_id=body.client_event_id, farm_id=user.farm_id, plot_id=plot.id, user_id=user.id,
        schedule_id=body.schedule_id, work_type=body.work_type.value, started_at=body.started_at,
        config_snapshot=_config(db, user.farm_id, body.work_type),
    )
    db.add(s)
    db.commit()
    return _out(s)


@router.post(
    "/{session_id}/finish",
    response_model=WorkSessionOut,
    summary="作業を終える",
    description="作業ログを自動で作る。終了済みの作業に送り直しても、最初の終了時刻のまま 200 を返す。",
)
def finish_session(
    session_id: int, body: WorkSessionFinish, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> WorkSessionOut:
    s = _get_session(db, session_id, user)
    if s.user_id != user.id:
        api_error(403, "not_your_session", "ほかの人の作業は終了できません")
    if s.ended_at is None:
        if body.ended_at < s.started_at:
            api_error(422, "ended_before_start", "終了時刻が開始時刻より前です")
        s.ended_at = body.ended_at
        db.add(WorkLog(
            farm_id=s.farm_id, session_id=s.id, plot_id=s.plot_id, user_id=s.user_id, work_type=s.work_type,
            worked_on=s.started_at.astimezone(JST).date(), started_at=s.started_at, ended_at=s.ended_at,
        ))
        db.commit()
    return _out(s)


@router.get("/{session_id}", response_model=WorkSessionOut, summary="作業の詳細")
def get_session(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> WorkSessionOut:
    return _out(_get_session(db, session_id, user))


@router.get(
    "",
    response_model=list[WorkSessionOut],
    summary="作業の一覧",
    description="`from` / `to` は日本時間の日付。新しい順。`active=true` で終了していない作業だけを返す。",
)
def list_sessions(
    plot_id: int | None = None,
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    active: bool | None = None,
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
    return [_out(s) for s in db.scalars(stmt.limit(500))]


@router.post(
    "/{session_id}/detections",
    response_model=DetectionBatchResult,
    summary="判定結果を送る（仮）",
    description="判定データの形を AI 側と決めている途中のため、今は受け取った件数を返すだけで保存しない。",
)
def post_detections(
    session_id: int, body: DetectionBatch, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> DetectionBatchResult:
    _get_session(db, session_id, user)
    return DetectionBatchResult(accepted=len(body.detections), duplicated=0, rejected=0)


@router.post(
    "/{session_id}/voice-notes",
    response_model=VoiceNoteOut,
    status_code=status.HTTP_201_CREATED,
    summary="「今日の気づき」の音声を送る",
    description=(
        "`multipart/form-data` で `file`（音声ファイル、10MB まで）と `client_event_id` を送る。\n\n"
        "文字起こしは受け取ったあとで行う。済むまで `transcript` は null。"
        "同じ `client_event_id` で送り直した場合は、登録済みのものを 200 で返す。"
    ),
)
async def post_voice_note(
    session_id: int,
    background: BackgroundTasks,
    response: Response,
    file: UploadFile = File(),
    client_event_id: UUID = Form(),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> VoiceNoteOut:
    s = _get_session(db, session_id, user)
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
    await run_in_threadpool(save_audio, key, data, content_type)
    note = VoiceNote(client_event_id=client_event_id, farm_id=s.farm_id, session_id=s.id, user_id=user.id,
                     storage_key=key, content_type=content_type, created_at=datetime.now(timezone.utc))
    db.add(note)
    db.commit()
    background.add_task(_transcribe_in_background, note.id)
    return _voice_note(note)


@router.get("/{session_id}/voice-notes", response_model=list[VoiceNoteOut], summary="「今日の気づき」の一覧")
def list_voice_notes(session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[VoiceNoteOut]:
    s = _get_session(db, session_id, user)
    return [_voice_note(n) for n in db.scalars(select(VoiceNote).where(VoiceNote.session_id == s.id).order_by(VoiceNote.id))]


def _voice_note(n: VoiceNote) -> VoiceNoteOut:
    return VoiceNoteOut(id=n.id, session_id=n.session_id, transcript=n.transcript, created_at=n.created_at)


def _transcribe_in_background(note_id: int) -> None:
    with SessionLocal() as db:
        transcribe_note(db, db.get(VoiceNote, note_id))
