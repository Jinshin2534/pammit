"""「今日の気づき」の音声。文字起こしはスマートフォンで行い、音声と文字の両方を受け取る。

文字は相談に使う知識に加える。音声は聞き直せるように保存する。
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import VoiceNote, WorkSession
from app.services import knowledge

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


def attach_transcript(db: Session, note: VoiceNote, text: str) -> None:
    """文字を保存し、相談に使う知識にも加える。"""
    session = db.get(WorkSession, note.session_id)
    day = session.started_at.astimezone(JST)
    doc = knowledge.add_document(
        db, title=f"{day:%Y-%m-%d} {session.plot.name} {session.work_type} の気づき", body=text,
        source_type="voice_note", farm_id=note.farm_id)
    note.transcript = text
    note.transcribed_at = datetime.now(timezone.utc)
    note.knowledge_document_id = doc.id
    db.commit()
