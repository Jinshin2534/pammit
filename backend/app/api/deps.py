"""ログイン中の利用者を取り出す。"""
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.core.security import decode_token
from app.db import get_db
from app.models import Plot, User

_bearer = HTTPBearer(auto_error=False)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        api_error(401, "not_logged_in", "ログインしてください")
    try:
        payload = decode_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        api_error(401, "token_expired", "ログインの有効期限が切れました。もう一度ログインしてください")
    except jwt.InvalidTokenError:
        api_error(401, "invalid_token", "ログイン情報が正しくありません")
    user = db.get(User, int(payload["sub"]))
    if user is None or not user.active:
        api_error(401, "invalid_token", "ログイン情報が正しくありません")
    return user


def owner_user(user: User = Depends(current_user)) -> User:
    if user.role != "owner":
        api_error(403, "owner_only", "この操作は管理者だけができます")
    return user


def get_plot_in_farm(db: Session, plot_id: int, farm_id: int) -> Plot:
    """ほかの農園（経営体）の農地は、存在しないものとして扱う。"""
    plot = db.get(Plot, plot_id)
    if plot is None or plot.farm_id != farm_id:
        api_error(404, "plot_not_found", "農園が見つかりません")
    return plot
