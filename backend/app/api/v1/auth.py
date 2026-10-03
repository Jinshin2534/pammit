from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.config import settings
from app.core.errors import api_error
from app.core.security import create_token, verify_pin
from app.db import get_db
from app.models import Farm, User
from app.schemas.auth import LoginCandidate, LoginRequest, Me, MeUpdate, Role, TokenResponse, UserOut

router = APIRouter(tags=["auth"])


@router.get(
    "/auth/users",
    response_model=list[LoginCandidate],
    summary="ログイン画面で選ぶ名前の一覧",
    description="初めてログインする端末で、自分の名前を選ぶために使う。ログイン前に呼べる。",
)
def list_login_candidates(
    farm_code: str,
    role: Role | None = Query(default=None, description="役割を選んだあとに絞り込む"),
    db: Session = Depends(get_db),
) -> list[LoginCandidate]:
    farm = db.scalar(select(Farm).where(Farm.code == farm_code))
    if farm is None:
        api_error(404, "farm_not_found", "農園コードが見つかりません")
    stmt = select(User).where(User.farm_id == farm.id, User.active.is_(True)).order_by(User.id)
    if role:
        stmt = stmt.where(User.role == role.value)
    return [LoginCandidate(id=u.id, name=u.name, role=u.role) for u in db.scalars(stmt)]


@router.post(
    "/auth/login",
    response_model=TokenResponse,
    summary="PIN でログインする",
    description=(
        f"PIN を{settings.pin_max_failures}回続けて間違えると、{settings.pin_lock_minutes}分間ログインできなくなる"
        "（423 `pin_locked`）。"
    ),
)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(
        select(User).join(Farm, Farm.id == User.farm_id).where(Farm.code == body.farm_code, User.id == body.user_id)
    )
    if user is None or not user.active:
        api_error(401, "invalid_pin", "名前か PIN が正しくありません")

    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        api_error(423, "pin_locked", "PIN を続けて間違えたため、しばらくログインできません",
                  {"locked_until": user.locked_until.isoformat()})

    if not verify_pin(body.pin, user.pin_hash):
        user.failed_pin_count += 1
        if user.failed_pin_count >= settings.pin_max_failures:
            user.failed_pin_count = 0
            user.locked_until = now + timedelta(minutes=settings.pin_lock_minutes)
        db.commit()
        api_error(401, "invalid_pin", "名前か PIN が正しくありません")

    user.failed_pin_count = 0
    user.locked_until = None
    db.commit()
    token, expires_in = create_token(user.id, user.farm_id, user.role)
    return TokenResponse(access_token=token, expires_in=expires_in)


def _me(db: Session, user: User) -> Me:
    farm = db.get(Farm, user.farm_id)
    return Me(**UserOut.model_validate(user).model_dump(), farm_id=user.farm_id, farm_name=farm.name)


@router.get("/auth/me", response_model=Me, summary="ログイン中の利用者")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)) -> Me:
    return _me(db, user)


@router.patch("/users/me", response_model=Me, summary="自分の名前・アイコンを変える", tags=["users"])
def update_me(body: MeUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Me:
    for field, value in body.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    return _me(db, user)
