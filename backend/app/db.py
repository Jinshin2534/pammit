"""DB 接続。

テーブルは起動時に `create_all` で作る（本選デモ向けの簡易方式）。
`create_all` は既存テーブルに列を足さないので、あとから足した列は `ADDED_COLUMNS` に書き、
起動時に `ensure_added_columns` で足す。列の型変更や削除はできないので、本番運用に入る前に Alembic へ移行する。
"""
from collections.abc import Iterator
from datetime import datetime, timezone

from sqlalchemy import DateTime, create_engine, inspect, text
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
    ensure_added_columns()


# あとから既存テーブルに足した列。(テーブル, 列, 型と既定値の DDL)。足すだけで、消したり変えたりはしない
ADDED_COLUMNS: list[tuple[str, str, str]] = [
    ("work_sessions", "uses_hat", "BOOLEAN NOT NULL DEFAULT TRUE"),
    ("voice_notes", "recorded_at", "TIMESTAMP WITH TIME ZONE"),
]


def ensure_added_columns() -> None:
    """`ADDED_COLUMNS` の列がなければ足す。何度呼んでも同じ結果になる。"""
    with engine.begin() as conn:
        if conn.dialect.name == "postgresql":
            for table, column, ddl in ADDED_COLUMNS:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {ddl}"))
            return
        inspector = inspect(conn)
        for table, column, ddl in ADDED_COLUMNS:
            if column not in {c["name"] for c in inspector.get_columns(table)}:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db
