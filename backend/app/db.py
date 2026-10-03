"""DB 接続。

テーブルは起動時に `create_all` で作る（本選デモ向けの簡易方式）。
既存テーブルの列変更は反映されないので、本番運用に入る前に Alembic へ移行する。
"""
from collections.abc import Iterator
from datetime import datetime, timezone

from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import TypeDecorator

from app.core.config import settings


class Base(DeclarativeBase):
    pass


class UTCDateTime(TypeDecorator):
    """UTC にそろえて保存し、読み出すときもタイムゾーン付きで返す。

    SQLite はタイムゾーンを保持しないため、テストでも本番と同じ値が返るようにする。
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("タイムゾーンのない時刻は保存できません")
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


engine = create_engine(settings.sqlalchemy_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db() -> None:
    from app import models  # noqa: F401  テーブル定義を Base に登録する

    Base.metadata.create_all(engine)


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db
