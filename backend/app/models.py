"""DB のテーブル定義。設計は docs/data-model.md。"""
from datetime import date, datetime, time
from typing import Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, UTCDateTime


class SensorDevice(Base):
    """センサー端末。園地に紐づく。

    Wi-Fi 直結は `key_hash`、LoRaWAN は `dev_eui` で端末を特定する。
    キーは平文で保存しない（DB が漏れても送信を偽装されないようにするため）。
    """

    __tablename__ = "sensor_devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    plot_id: Mapped[int | None] = mapped_column(Integer, index=True)
    key_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    dev_eui: Mapped[str | None] = mapped_column(String(16), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SensorReading(Base):
    """測定値。同じ端末・同じ測定時刻は1件だけ（再送を重複として捨てるため）。"""

    __tablename__ = "sensor_readings"
    __table_args__ = (UniqueConstraint("sensor_device_id", "measured_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    sensor_device_id: Mapped[int] = mapped_column(ForeignKey("sensor_devices.id"))
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    source: Mapped[str] = mapped_column(String(10))  # 'wifi' | 'lorawan'
    temperature: Mapped[float | None] = mapped_column(Float)
    humidity: Mapped[float | None] = mapped_column(Float)
    pressure: Mapped[float | None] = mapped_column(Float)
    soil_moisture_raw: Mapped[int | None] = mapped_column(Integer)
    # 校正式が決まるまで NULL。生値から後で再計算できる
    soil_moisture_pct: Mapped[float | None] = mapped_column(Float)
    battery_pct: Mapped[int | None] = mapped_column(SmallInteger)


# --- 組織・人 ---


class Farm(Base):
    """経営体。データはこの単位で分ける。"""

    __tablename__ = "farms"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(10))  # 'owner' | 'worker'
    gender: Mapped[str | None] = mapped_column(String(20))
    worker_type: Mapped[str | None] = mapped_column(String(30))
    weekly_max_hours: Mapped[float | None] = mapped_column(Float)
    icon: Mapped[str | None] = mapped_column(String(50))
    pin_hash: Mapped[str] = mapped_column(String(200))
    failed_pin_count: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(UTCDateTime)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())


# --- 園地 ---


class Plot(Base):
    """画面上の「農園」。"""

    __tablename__ = "plots"

    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    municipality: Mapped[str | None] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    cultivation_type: Mapped[str] = mapped_column(String(20), default="open_field")
    # 灌水の助言で使う目安（%）と、土壌水分の換算に使う乾燥時・飽和時の生値
    soil_check_pct: Mapped[float] = mapped_column(Float, default=28.0)
    soil_dry_raw: Mapped[int | None] = mapped_column(Integer)
    soil_wet_raw: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())


# --- 予定と作業 ---


class JudgmentParams(Base):
    """判定の閾値。作業の開始時にアプリへ配る。"""

    __tablename__ = "judgment_params"
    __table_args__ = (UniqueConstraint("farm_id", "work_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"))
    work_type: Mapped[str] = mapped_column(String(20))
    model_version_expected: Mapped[str] = mapped_column(String(50))
    confidence_high: Mapped[float] = mapped_column(Float)
    confidence_low: Mapped[float] = mapped_column(Float)
    params: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_event_id: Mapped[UUID] = mapped_column(Uuid, unique=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), index=True)
    plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"))
    date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time | None] = mapped_column(Time)
    end_time: Mapped[time | None] = mapped_column(Time)
    work_types: Mapped[list[str]] = mapped_column(JSON)
    note: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

    plot: Mapped[Plot] = relationship(lazy="joined")
    assignees: Mapped[list["User"]] = relationship(secondary="schedule_assignees", lazy="selectin", order_by="User.id")


class ScheduleAssignee(Base):
    __tablename__ = "schedule_assignees"

    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)


class WorkSession(Base):
    """作業1回分。帽子を使わない作業もセッションとして記録する。"""

    __tablename__ = "work_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_event_id: Mapped[UUID] = mapped_column(Uuid, unique=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), index=True)
    plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    schedule_id: Mapped[int | None] = mapped_column(ForeignKey("schedules.id", ondelete="SET NULL"))
    work_type: Mapped[str] = mapped_column(String(20))
    started_at: Mapped[datetime] = mapped_column(UTCDateTime)
    ended_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    # 開始時に配った判定の設定。あとから閾値を変えても、どの設定で判定したか分かる
    config_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    received_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())

    plot: Mapped[Plot] = relationship(lazy="joined")


class WorkLog(Base):
    """作業ログ。セッションの終了時に自動で作る。"""

    __tablename__ = "work_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("work_sessions.id"), unique=True)
    plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    work_type: Mapped[str] = mapped_column(String(20))
    worked_on: Mapped[date] = mapped_column(Date, index=True)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime)
    ended_at: Mapped[datetime] = mapped_column(UTCDateTime)

    plot: Mapped[Plot] = relationship(lazy="joined")
    user: Mapped[User] = relationship(lazy="joined")
