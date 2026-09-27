"""DB 接続。

テーブルは起動時に `create_all` で作る（本選デモ向けの簡易方式）。
既存テーブルの列変更は反映されないので、本番運用に入る前に Alembic へ移行する。
"""
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.sqlalchemy_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db() -> None:
    from app import models  # noqa: F401  テーブル定義を Base に登録する

    Base.metadata.create_all(engine)


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db
