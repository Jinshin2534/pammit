"""ログインと利用者。作業者は管理者が登録し、4桁の PIN でログインする。"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Role(str, Enum):
    """`owner` は管理者画面を使える（ログイン画面では「師匠農家さん」）。"""

    owner = "owner"
    worker = "worker"


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
    gender: str | None = None
    worker_type: str | None = Field(default=None, examples=["アルバイト"])
    weekly_max_hours: float | None = None
    icon: str | None = None


class Me(UserOut):
    farm_id: int
    farm_name: str


class MeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    icon: str | None = Field(default=None, max_length=50)


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    role: Role = Role.worker
    gender: str | None = Field(default=None, max_length=20)
    worker_type: str | None = Field(default=None, max_length=30)
    weekly_max_hours: float | None = Field(default=None, ge=0, le=168)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    role: Role | None = None
    gender: str | None = Field(default=None, max_length=20)
    worker_type: str | None = Field(default=None, max_length=30)
    weekly_max_hours: float | None = Field(default=None, ge=0, le=168)
    active: bool | None = Field(default=None, description="false にするとログインできなくなる")


class UserWithPin(BaseModel):
    """登録・PIN の再発行の応答。PIN はこのときだけ返す。"""

    user: UserOut
    pin: str = Field(examples=["0381"])


class PinLocked(BaseModel):
    locked_until: datetime
