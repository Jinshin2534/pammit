"""認証。作業者は4桁PINでログインする。"""
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Role(str, Enum):
    """ロール。"""

    owner = "owner"
    worker = "worker"


class SkillLevel(str, Enum):
    """習熟度。**農家さんが手動で設定する。**

    Realtime API のシステムプロンプトに渡し、説明の詳しさを変える。
    自動算出は本選までにデータが溜まらないため採用しない。
    """

    beginner = "beginner"
    intermediate = "intermediate"
    expert = "expert"


class LoginRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"farm_code": "kamiyama-01", "user_id": 7, "pin": "1234"}}
    )

    farm_code: str = Field(description="農園コード")
    user_id: int = Field(description="農家さんが事前登録した作業者のID")
    pin: str = Field(min_length=4, max_length=4, description="4桁PIN")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="有効期限（秒）", examples=[43200])


class Me(BaseModel):
    """ログイン中のユーザー。"""

    id: int
    farm_id: int
    name: str = Field(examples=["田中"])
    role: Role
    skill_level: SkillLevel
