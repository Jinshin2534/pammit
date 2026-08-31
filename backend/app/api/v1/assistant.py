from datetime import timedelta

from fastapi import APIRouter, Query

from app.api.v1._stub import now
from app.schemas.assistant import (
    AssistantSession,
    KnowledgeChunk,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
)
from app.schemas.auth import SkillLevel

router = APIRouter(prefix="/assistant", tags=["assistant"])

TOOLS = [
    {
        "type": "function",
        "name": "search_knowledge",
        "description": "ベテラン農家の知識を検索する。出典付きで返る。",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "type": "function",
        "name": "get_work_history",
        "description": "その園地の過去の作業ログを取得する。",
        "parameters": {
            "type": "object",
            "properties": {"plot_id": {"type": "integer"}, "days": {"type": "integer"}},
            "required": ["plot_id"],
        },
    },
]


@router.post(
    "/session",
    response_model=AssistantSession,
    summary="Realtime API の一時トークンを発行する",
    description=(
        "**OpenAI の API キーをアプリに埋め込まない。** サーバーが一時トークンを発行する。\n\n"
        "`instructions` には `users.skill_level` を反映した内容を入れて返す。\n\n"
        "これは**二次応答**（「なんで?」への説明・2〜3秒）専用。\n"
        "一次応答（判定直後の定型音声・0.3秒）はオフラインで完結し、このAPIを使わない。\n\n"
        "Function Calling のうち `judge_current_frame()` は**アプリのローカル関数**。"
        "判定は端末内で済んでいるため、サーバー往復は無駄になる。"
    ),
)
async def create_assistant_session() -> AssistantSession:
    return AssistantSession(
        client_secret="ek_stub",
        expires_at=now() + timedelta(minutes=10),
        model="gpt-realtime",
        instructions=(
            "あなたはすだち農家のベテランです。相手は経験の浅い作業者です。"
            "専門用語を避け、短く、具体的に答えてください。"
        ),
        tools=TOOLS,
        skill_level=SkillLevel.beginner,
    )


@router.post(
    "/knowledge/search",
    response_model=KnowledgeSearchResponse,
    summary="ベテラン知識を検索する（Function Calling の実体）",
    description=(
        "pgvector によるベクトル検索。\n\n"
        "**出典を必ず返す。** 「誰の言葉か」を回答に添えられることが製品価値そのものである。"
    ),
)
async def search_knowledge(body: KnowledgeSearchRequest) -> KnowledgeSearchResponse:
    return KnowledgeSearchResponse(
        chunks=[
            KnowledgeChunk(
                content="摘果摘葉する前のすだちはブドウなりになっていて、初心者が迷いながら切るとすだちを傷つけてしまいます。",
                source_name="NPO法人里山みらい 永野裕介さん",
                source_type="interview",
                score=0.82,
            )
        ]
    )


@router.get(
    "/work-history",
    summary="過去の作業ログを照会する（Function Calling の実体）",
)
async def get_work_history(plot_id: int, days: int = Query(default=30, ge=1, le=365)) -> dict:
    return {"plot_id": plot_id, "days": days, "logs": []}
