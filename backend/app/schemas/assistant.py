"""AI相談・判定の理由説明（二次応答）。

一次応答（判定直後の定型音声・0.3秒・オフライン）とは別系統。
判断は速く、説明はゆっくりでよい。人間のベテランもそうである。
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.auth import SkillLevel


class AssistantSession(BaseModel):
    """**OpenAI の API キーをアプリに埋め込まない。** サーバーが一時トークンを発行する。

    `instructions` は `users.skill_level` を反映した内容を返す。

    Function Calling の実体の置き場所:

    | 関数 | 実体 |
    |---|---|
    | `judge_current_frame()` | **アプリのローカル関数**（判定は端末内で済んでいる） |
    | `search_knowledge(query)` | サーバー（pgvector） |
    | `get_work_history(plot_id)` | サーバー |
    """

    client_secret: str = Field(description="Realtime API 用の一時トークン")
    expires_at: datetime
    model: str = Field(examples=["gpt-realtime"])
    instructions: str = Field(description="skill_level を反映したシステムプロンプト")
    tools: list[dict[str, Any]]
    skill_level: SkillLevel


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(examples=["かいよう病が出たらどうする"])
    plot_id: int | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class KnowledgeChunk(BaseModel):
    """**出典を必ず持つ。** 「誰の言葉か」を回答に添えられることが製品価値そのものである。"""

    content: str
    source_name: str = Field(examples=["加茂谷すだちパーク 井出雅文さん"])
    source_type: str = Field(description="interview / calendar / manual", examples=["interview"])
    score: float


class KnowledgeSearchResponse(BaseModel):
    chunks: list[KnowledgeChunk]
