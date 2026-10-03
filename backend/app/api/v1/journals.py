from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import owner_user
from app.core.errors import api_error
from app.db import get_db
from app.models import Farm, JournalNote, User
from app.schemas.journals import JournalDay, JournalExport, JournalNoteIn
from app.services import storage
from app.services.journals import build_days, render_pdf

router = APIRouter(prefix="/journals", tags=["journals"])

MAX_DAYS = 366
URL_SECONDS = 10 * 60


def _range(start: date, end: date) -> tuple[date, date]:
    if end < start:
        api_error(422, "invalid_range", "終わりの日は始まりの日より後にしてください")
    if (end - start).days >= MAX_DAYS:
        api_error(422, "range_too_long", "期間は1年以内にしてください")
    return start, end


@router.get(
    "",
    response_model=list[JournalDay],
    summary="日ごとの日誌（管理者）",
    description="作業ログ・センサー・天気予報から組み立てる。作業のない日も1日1件返す。",
)
def list_journals(
    date_from: date = Query(alias="from"), date_to: date = Query(alias="to"),
    owner: User = Depends(owner_user), db: Session = Depends(get_db),
) -> list[dict]:
    return build_days(db, owner.farm_id, *_range(date_from, date_to))


@router.put("/{day}/note", response_model=JournalDay, summary="備考を書く（管理者）")
def put_note(day: date, body: JournalNoteIn, owner: User = Depends(owner_user), db: Session = Depends(get_db)) -> dict:
    row = db.scalar(select(JournalNote).where(JournalNote.farm_id == owner.farm_id, JournalNote.date == day))
    text = body.note.strip()
    if not text:
        if row is not None:
            db.delete(row)
    else:
        if row is None:
            row = JournalNote(farm_id=owner.farm_id, date=day)
            db.add(row)
        row.note, row.updated_by, row.updated_at = text, owner.id, datetime.now(timezone.utc)
    db.commit()
    return build_days(db, owner.farm_id, day, day)[0]


def _pdf(db: Session, owner: User, start: date, end: date) -> bytes:
    farm = db.get(Farm, owner.farm_id)
    return render_pdf(farm.name, start, end, build_days(db, owner.farm_id, start, end))


@router.post(
    "/export",
    response_model=JournalExport,
    summary="PDF を作って URL を返す（管理者）",
    description="URL は10分間だけ開ける。アプリはこの URL をブラウザで開く。",
)
async def export_journals(
    date_from: date = Query(alias="from"), date_to: date = Query(alias="to"),
    owner: User = Depends(owner_user), db: Session = Depends(get_db),
) -> JournalExport:
    start, end = _range(date_from, date_to)
    data = await run_in_threadpool(_pdf, db, owner, start, end)
    key = f"journals/{owner.farm_id}/{start:%Y%m%d}-{end:%Y%m%d}-{uuid4().hex[:8]}.pdf"
    await run_in_threadpool(storage.put, key, data, "application/pdf")
    url = storage.presigned_url(key, URL_SECONDS)
    if url is None:
        api_error(503, "storage_not_configured", "この環境では URL を発行できません。export.pdf を使ってください")
    return JournalExport(url=url, expires_at=datetime.now(timezone.utc) + timedelta(seconds=URL_SECONDS))


@router.get(
    "/export.pdf",
    summary="PDF をそのまま返す（管理者）",
    description="動作確認用。アプリからは `POST /journals/export` の URL を開く。",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
async def export_pdf(
    date_from: date = Query(alias="from"), date_to: date = Query(alias="to"),
    owner: User = Depends(owner_user), db: Session = Depends(get_db),
) -> Response:
    start, end = _range(date_from, date_to)
    data = await run_in_threadpool(_pdf, db, owner, start, end)
    return Response(data, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="journal-{start:%Y%m%d}-{end:%Y%m%d}.pdf"'})
