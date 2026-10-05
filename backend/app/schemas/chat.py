"""AI 相談と知識。"""
from datetime import datetime

from typing import Literal

from pydantic import BaseModel, Field


class ThreadCreate(BaseModel):
    session_id: int | None = Field(default=None, description="作業中の相談なら作業ID。作業画面の「AI相談ログ」に出る")
    title: str | None = Field(default=None, max_length=100, description="省くと最初の質問から付ける")


class Thread(BaseModel):
    id: int
    session_id: int | None
    title: str
    created_at: datetime
    updated_at: datetime


class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    mode: Literal["text", "voice"] = Field(
        default="text", description="voice にすると、読み上げ向けに2〜3文の短い答えにする（作業中の音声での相談）")


class Message(BaseModel):
    id: int
    role: str = Field(description="user / assistant")
    content: str
    created_at: datetime


class SessionChatMessage(Message):
    thread_id: int


class KnowledgeIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)
    source_type: str = Field(default="research", max_length=20, examples=["research", "interview"])


class KnowledgeOut(BaseModel):
    id: int
    title: str
    source_type: str
    created_at: datetime


class VoiceNote(BaseModel):
    id: int
    session_id: int
    transcript: str | None = Field(default=None, description="スマートフォンで文字に起こした内容")
    recorded_at: datetime = Field(description="端末で録音した時刻。送られなかったときはサーバーが受け取った時刻")
    created_at: datetime = Field(description="サーバーが受け取った時刻")
