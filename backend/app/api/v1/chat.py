from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, owner_user
from app.core.errors import api_error
from app.db import get_db
from app.models import ChatMessage, ChatThread, KnowledgeDocument, User, WorkSession
from app.schemas.chat import (
    KnowledgeIn,
    KnowledgeOut,
    Message,
    MessageIn,
    SessionChatMessage,
    Thread,
    ThreadCreate,
)
from app.services import chat, knowledge

router = APIRouter(tags=["chat"])


def _thread(t: ChatThread) -> Thread:
    return Thread(id=t.id, session_id=t.session_id, title=t.title, created_at=t.created_at, updated_at=t.updated_at)


def _message(m: ChatMessage) -> Message:
    return Message(id=m.id, role=m.role, content=m.content, created_at=m.created_at)


def _own_thread(db: Session, thread_id: int, user: User) -> ChatThread:
    t = db.get(ChatThread, thread_id)
    if t is None or t.user_id != user.id:
        api_error(404, "thread_not_found", "会話が見つかりません")
    return t


@router.get(
    "/chat/threads",
    response_model=list[Thread],
    summary="過去の会話の一覧",
    description=(
        "自分の会話だけを、最後に話した順（`updated_at` の新しい順）に100件まで返す。"
        "作業中の会話（`session_id` あり）も混ぜて返す。古い会話にも続けて質問できる。\n\n"
        "メッセージが1件もない会話（最初の質問が 503 などで失敗した会話）は返さない。\n\n"
        "`session_id` を付けると、その作業中の会話だけを返す。"
    ),
)
def list_threads(
    session_id: int | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[Thread]:
    has_messages = select(ChatMessage.id).where(ChatMessage.thread_id == ChatThread.id).exists()
    stmt = (select(ChatThread).where(ChatThread.user_id == user.id, has_messages)
            .order_by(ChatThread.updated_at.desc(), ChatThread.id.desc()))
    if session_id is not None:
        stmt = stmt.where(ChatThread.session_id == session_id)
    return [_thread(t) for t in db.scalars(stmt.limit(100))]


@router.post("/chat/threads", response_model=Thread, status_code=status.HTTP_201_CREATED, summary="会話を始める")
def create_thread(body: ThreadCreate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Thread:
    if body.session_id is not None:
        s = db.get(WorkSession, body.session_id)
        if s is None or s.farm_id != user.farm_id:
            api_error(404, "session_not_found", "作業が見つかりません")
    now = datetime.now(timezone.utc)
    t = ChatThread(farm_id=user.farm_id, user_id=user.id, session_id=body.session_id,
                   title=body.title or "新しい相談", created_at=now, updated_at=now)
    db.add(t)
    db.commit()
    return _thread(t)


@router.get("/chat/threads/{thread_id}/messages", response_model=list[Message], summary="会話の中身")
def list_messages(thread_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[Message]:
    t = _own_thread(db, thread_id, user)
    rows = db.scalars(select(ChatMessage).where(ChatMessage.thread_id == t.id).order_by(ChatMessage.id))
    return [_message(m) for m in rows]


@router.get(
    "/work-sessions/{session_id}/chat-messages",
    response_model=list[SessionChatMessage],
    summary="作業中の AI 相談ログ",
    description=(
        "作業1回分の AI 相談（画面と音声の両方）を、古い順にまとめて返す。作業画面の「AI相談ログ」に使う。\n\n"
        "会話は本人のものだけを返す（ほかの人の会話は、同じ作業でも返さない）。"
        "どの会話の発言かは `thread_id` で見分ける。作業が見つからなければ 404 `session_not_found`。"
    ),
)
def list_session_messages(
    session_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[SessionChatMessage]:
    s = db.get(WorkSession, session_id)
    if s is None or s.farm_id != user.farm_id:
        api_error(404, "session_not_found", "作業が見つかりません")
    rows = db.scalars(
        select(ChatMessage).join(ChatThread, ChatMessage.thread_id == ChatThread.id)
        .where(ChatThread.session_id == session_id, ChatThread.user_id == user.id)
        .order_by(ChatMessage.created_at, ChatMessage.id))
    return [SessionChatMessage(thread_id=m.thread_id, **_message(m).model_dump()) for m in rows]


@router.post(
    "/chat/threads/{thread_id}/messages",
    response_model=Message,
    summary="質問して回答を受け取る",
    description=(
        "AI が質問に応じて、知識・農園の状態・予定・作業の記録を調べて答える。数秒かかる。\n\n"
        "`mode` を `voice` にすると、読み上げ向けに2〜3文の短い答えにする。\n\n"
        "AI を使えないときは 503 `ai_unavailable` を返し、質問も保存しない。"
    ),
)
def post_message(
    thread_id: int, body: MessageIn, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Message:
    t = _own_thread(db, thread_id, user)
    if t.title == "新しい相談":
        t.title = body.content[:30]
    return _message(chat.answer(db, user, t, body.content, voice=body.mode == "voice"))


@router.get("/knowledge", response_model=list[KnowledgeOut], summary="登録済みの知識の一覧（管理者）")
def list_knowledge(owner: User = Depends(owner_user), db: Session = Depends(get_db)) -> list[KnowledgeOut]:
    rows = db.scalars(select(KnowledgeDocument).where(
        (KnowledgeDocument.farm_id.is_(None)) | (KnowledgeDocument.farm_id == owner.farm_id)
    ).order_by(KnowledgeDocument.id))
    return [KnowledgeOut(id=d.id, title=d.title, source_type=d.source_type, created_at=d.created_at) for d in rows]


@router.post(
    "/knowledge",
    response_model=KnowledgeOut,
    status_code=status.HTTP_201_CREATED,
    summary="知識を登録する（管理者）",
    description="現地調査の記録や聞き取りの内容など。段落ごとに分けて検索できるようにする。",
)
def create_knowledge(body: KnowledgeIn, owner: User = Depends(owner_user), db: Session = Depends(get_db)) -> KnowledgeOut:
    d = knowledge.add_document(db, body.title, body.body, body.source_type, farm_id=owner.farm_id)
    return KnowledgeOut(id=d.id, title=d.title, source_type=d.source_type, created_at=d.created_at)
