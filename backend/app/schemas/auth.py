"""ログインと利用者。作業者は管理者が登録し、4桁の PIN でログインする。"""
from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Role(str, Enum):
    """`owner` は管理者画面を使える（ログイン画面では「師匠農家さん」）。"""

    owner = "owner"
    worker = "worker"


# 画面で選べる値。値の一覧は docs/data-model.md
Gender = Literal["女", "男", "回答しない"]
# 作業者の種別。owner は持たない（ログイン画面では役割の「師匠農家さん」で示す）
WorkerType = Literal["後継者さん", "アルバイト"]
# アプリに入っているアイコン。null は default と同じ
Icon = Literal["default", "hat", "scarf", "glasses"]


class LoginRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"farm_code": "kamiyama-01", "user_id": 2, "pin": "1234"}}
    )

    farm_code: str
    user_id: int
    pin: str = Field(pattern=r"^\d{4}$", description="4桁の数字")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="有効期間（秒）。30日")


class LoginCandidate(BaseModel):
    """ログイン画面で名前を選ぶための一覧。"""

    id: int
    name: str
    role: Role


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: Role
    gender: str | None = Field(default=None, examples=["女"])
    worker_type: str | None = Field(default=None, examples=["アルバイト"])
    weekly_max_hours: float | None = None
    icon: str | None = Field(default=None, examples=["hat"])
    active: bool = Field(description="false は停止中（ログインできず、新しい予定の担当者にも選べない）")


class Me(UserOut):
    farm_id: int
    farm_name: str


class MeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    icon: Icon | None = None


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    role: Role = Role.worker
    gender: Gender | None = None
    worker_type: WorkerType | None = None
    weekly_max_hours: float | None = Field(default=None, ge=0, le=168)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    role: Role | None = None
    gender: Gender | None = None
    worker_type: WorkerType | None = None
    weekly_max_hours: float | None = Field(default=None, ge=0, le=168)
    active: bool | None = Field(default=None, description="false にするとログインできなくなる")


class AssigneeCandidate(BaseModel):
    """予定の担当者に選べる人。"""

    id: int
    name: str
    role: Role


class UserWithPin(BaseModel):
    """登録・PIN の再発行の応答。PIN はこのときだけ返す。"""

    user: UserOut
    pin: str = Field(examples=["0381"])


class PinLocked(BaseModel):
    locked_until: datetime
