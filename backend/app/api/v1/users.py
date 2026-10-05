from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import owner_user
from app.core.errors import api_error
from app.core.security import generate_pin, hash_pin
from app.db import get_db
from app.models import User
from app.schemas.auth import UserCreate, UserOut, UserUpdate, UserWithPin

router = APIRouter(prefix="/users", tags=["users"])


def _get_user_in_farm(db: Session, user_id: int, farm_id: int) -> User:
    user = db.get(User, user_id)
    if user is None or user.farm_id != farm_id:
        api_error(404, "user_not_found", "作業者が見つかりません")
    return user


@router.get(
    "",
    response_model=list[UserOut],
    summary="作業者の一覧（管理者）",
    description="owner と停止中の人も含めて返す。画面に出す人は `role`・`active` で絞る。",
)
def list_users(owner: User = Depends(owner_user), db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).where(User.farm_id == owner.farm_id).order_by(User.id)))


@router.post(
    "",
    response_model=UserWithPin,
    status_code=status.HTTP_201_CREATED,
    summary="作業者を登録する（管理者）",
    description="4桁の PIN をサーバーが決めて返す。PIN はこの応答でしか見られないので、登録完了の画面で本人に伝える。",
)
def create_user(body: UserCreate, owner: User = Depends(owner_user), db: Session = Depends(get_db)) -> UserWithPin:
    pin = generate_pin()
    user = User(farm_id=owner.farm_id, pin_hash=hash_pin(pin), **body.model_dump(mode="json"))
    db.add(user)
    db.commit()
    return UserWithPin(user=UserOut.model_validate(user), pin=pin)


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    summary="作業者の情報を変える（管理者）",
    description=(
        "作業者の削除は `active: false`（停止）で行う。ログインできなくなり、新しい予定の担当者にも選べなくなる。"
        "過去の予定・作業ログには名前を残す。"
    ),
)
def update_user(
    user_id: int, body: UserUpdate, owner: User = Depends(owner_user), db: Session = Depends(get_db)
) -> User:
    user = _get_user_in_farm(db, user_id, owner.farm_id)
    changes = body.model_dump(exclude_unset=True, mode="json")
    if user.id == owner.id and (changes.get("role", "owner") != "owner" or changes.get("active") is False):
        api_error(400, "cannot_demote_self", "自分の管理者権限は外せません")
    for field, value in changes.items():
        if value is None and field in ("name", "role", "active"):
            continue
        setattr(user, field, value)
    db.commit()
    return user


@router.post(
    "/{user_id}/reset-pin",
    response_model=UserWithPin,
    summary="PIN を再発行する（管理者）",
    description="PIN を忘れたときに使う。ロックも解除する。",
)
def reset_pin(user_id: int, owner: User = Depends(owner_user), db: Session = Depends(get_db)) -> UserWithPin:
    user = _get_user_in_farm(db, user_id, owner.farm_id)
    pin = generate_pin()
    user.pin_hash = hash_pin(pin)
    user.failed_pin_count = 0
    user.locked_until = None
    db.commit()
    return UserWithPin(user=UserOut.model_validate(user), pin=pin)
