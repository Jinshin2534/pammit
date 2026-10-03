"""相談に使う知識の登録と検索。

日本語は単語の区切りがないため、2文字ずつの重なり（バイグラム）の多さで近さを測る。
資料が数百件程度なら十分に速く、埋め込みの API も要らない。
"""
import re
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import KnowledgeChunk, KnowledgeDocument

CHUNK_CHARS = 400


def split_chunks(body: str) -> list[str]:
    """段落ごとに区切り、長すぎる段落は文の切れ目で分ける。"""
    chunks: list[str] = []
    for para in re.split(r"\n\s*\n", body):
        para = para.strip()
        if not para:
            continue
        while len(para) > CHUNK_CHARS:
            cut = max(para.rfind("。", 0, CHUNK_CHARS), para.rfind("\n", 0, CHUNK_CHARS))
            cut = cut + 1 if cut > 0 else CHUNK_CHARS
            chunks.append(para[:cut].strip())
            para = para[cut:].strip()
        if para:
            chunks.append(para)
    return chunks


def add_document(db: Session, title: str, body: str, source_type: str, farm_id: int | None = None) -> KnowledgeDocument:
    doc = KnowledgeDocument(title=title, body=body, source_type=source_type, farm_id=farm_id,
                            created_at=datetime.now(timezone.utc))
    db.add(doc)
    db.flush()
    for text in split_chunks(body):
        db.add(KnowledgeChunk(document_id=doc.id, farm_id=farm_id, content=text))
    db.commit()
    return doc


def _bigrams(text: str) -> set[str]:
    text = re.sub(r"\s+", "", text)
    return {text[i:i + 2] for i in range(len(text) - 1)}


def search(db: Session, farm_id: int, query: str, limit: int = 5) -> list[dict]:
    q = _bigrams(query)
    if not q:
        return []
    rows = db.execute(
        select(KnowledgeChunk, KnowledgeDocument.title)
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeChunk.document_id)
        .where(or_(KnowledgeChunk.farm_id.is_(None), KnowledgeChunk.farm_id == farm_id))
    ).all()
    scored = []
    for chunk, title in rows:
        overlap = len(q & _bigrams(chunk.content))
        if overlap:
            scored.append((overlap / len(q), title, chunk.content))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"title": t, "content": c} for _, t, c in scored[:limit]]
