"""「今日の気づき」の音声。保存して文字に起こし、相談に使う知識に加える。

文字起こしは OpenAI を使う。キーがないときや失敗したときは音声だけ残し、毎朝の処理でやり直す。
"""
import io
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import VoiceNote, WorkSession
from app.services import knowledge, llm

log = logging.getLogger(__name__)
JST = timezone(timedelta(hours=9))


def save_audio(key: str, data: bytes, content_type: str) -> None:
    if settings.upload_bucket:
        import boto3

        boto3.client("s3", region_name=settings.aws_region).put_object(
            Bucket=settings.upload_bucket, Key=key, Body=data, ContentType=content_type)
    else:
        path = Path(settings.local_upload_dir) / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def load_audio(key: str) -> bytes:
    if settings.upload_bucket:
        import boto3

        obj = boto3.client("s3", region_name=settings.aws_region).get_object(Bucket=settings.upload_bucket, Key=key)
        return obj["Body"].read()
    return (Path(settings.local_upload_dir) / key).read_bytes()


def transcribe(data: bytes, filename: str) -> str | None:
    if not llm.available():
        return None
    try:
        res = llm.client().audio.transcriptions.create(
            model=settings.openai_transcribe_model, file=(filename, io.BytesIO(data)), language="ja")
        return res.text.strip() or None
    except Exception:  # noqa: BLE001
        log.exception("文字起こしに失敗しました")
        return None


def transcribe_note(db: Session, note: VoiceNote) -> bool:
    """文字起こしできたら知識にも加える。できなければ False。"""
    text = transcribe(load_audio(note.storage_key), Path(note.storage_key).name)
    if text is None:
        return False
    session = db.get(WorkSession, note.session_id)
    day = session.started_at.astimezone(JST)
    doc = knowledge.add_document(
        db, title=f"{day:%Y-%m-%d} {session.plot.name} {session.work_type} の気づき", body=text,
        source_type="voice_note", farm_id=note.farm_id)
    note.transcript = text
    note.transcribed_at = datetime.now(timezone.utc)
    note.knowledge_document_id = doc.id
    db.commit()
    return True


def transcribe_pending(db: Session) -> int:
    done = 0
    for note in db.scalars(select(VoiceNote).where(VoiceNote.transcript.is_(None))):
        if transcribe_note(db, note):
            done += 1
    return done
