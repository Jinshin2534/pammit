"""全エンドポイント共通の型。"""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(description="機械可読なエラーコード", examples=["plot_not_found"])
    message: str = Field(description="人間向けの説明", examples=["園地が見つかりません"])
    detail: dict[str, Any] | None = Field(default=None, description="追加情報")


class ErrorResponse(BaseModel):
    """エラー時の共通レスポンス。"""

    error: ErrorDetail


class IdempotentCreate(BaseModel):
    """書き込み系リクエストの共通部分。

    `client_event_id` は端末が生成する UUID v4。
    通信が瞬断して再送された場合、サーバーは重複を **エラーにせず無視** する。
    """

    client_event_id: UUID = Field(
        description="冪等キー。端末側で UUID v4 を生成する",
        examples=["550e8400-e29b-41d4-a716-446655440000"],
    )


class Timestamped(BaseModel):
    """端末時刻とサーバー受信時刻の両方を返す。

    端末の時計はずれるため、片方だけでは後から辻褄が合わなくなる。
    """

    occurred_at: datetime = Field(description="端末側の時刻")
    received_at: datetime = Field(description="サーバーが受信した時刻")
