from typing import Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field

from app.api.deps import current_user
from app.core.errors import api_error
from app.models import User
from app.services import speech

router = APIRouter(tags=["speech"])


class SpeechIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    speed: Literal["fast", "normal", "slow", "verySlow"] = "normal"


@router.post(
    "/speech",
    response_class=Response,
    responses={200: {"content": {"audio/wav": {}}, "description": "16kHz・16bit・モノラルの wav"}},
    summary="帽子で鳴らす声をつくる",
    description=(
        "文を読み上げた wav を返す（Amazon Polly のニューラル音声 Kazuha）。帽子の要件の `play` でそのまま送れる形。\n\n"
        "`speed` はアプリの「話す速さ」の設定。音声をつくれないときは 503 `speech_unavailable`。"
        "スマートフォンはそのとき端末の読み上げに切り替える。"
    ),
)
def create_speech(body: SpeechIn, user: User = Depends(current_user)) -> Response:
    try:
        wav = speech.synthesize(body.text, body.speed)
    except Exception:
        api_error(503, "speech_unavailable", "音声をつくれません")
    return Response(content=wav, media_type="audio/wav")
