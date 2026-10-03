"""仮の応答で使う共通部品。実装が済んだら消す。"""
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))


def now() -> datetime:
    return datetime.now(JST)
