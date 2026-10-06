"""帽子の判定の保存と件数。判定はスマートフォンで行い、サーバーは受け取って保存するだけ。"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Detection, User, WorkSession
from app.schemas.detections import DetectionIn
from app.schemas.sessions import DetectionCounts


def save(db: Session, session: WorkSession, user: User, items: list[DetectionIn]) -> tuple[int, int]:
    """保存した件数と、client_event_id が重複していたため無視した件数を返す。"""
    ids = [d.client_event_id for d in items]
    existing = set(db.scalars(select(Detection.client_event_id).where(Detection.client_event_id.in_(ids)))) if ids else set()
    accepted = 0
    for d in items:
        if d.client_event_id in existing:
            continue
        existing.add(d.client_event_id)
        db.add(Detection(
            client_event_id=d.client_event_id, farm_id=session.farm_id, session_id=session.id, user_id=user.id,
            detected_at=d.detected_at, verdict=d.verdict.value, scene=d.scene, said=d.said,
            model_version=d.model_version))
        accepted += 1
    db.commit()
    return accepted, len(items) - accepted


def counts(db: Session, session_ids: list[int]) -> dict[int, DetectionCounts]:
    """作業ごとの件数。判定のない作業は 0 件。"""
    result = {sid: DetectionCounts() for sid in session_ids}
    if not session_ids:
        return result
    rows = db.execute(
        select(Detection.session_id, Detection.verdict, func.count())
        .where(Detection.session_id.in_(session_ids))
        .group_by(Detection.session_id, Detection.verdict))
    for sid, verdict, n in rows:
        setattr(result[sid], verdict, n)
    return result
