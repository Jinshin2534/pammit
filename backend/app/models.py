"""DB のテーブル定義。"""
from datetime import date, datetime, time
from typing import Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
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
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, UTCDateTime


class SensorDevice(Base):
    """センサー端末。農地に紐づく。

    Wi-Fi 直結は `key_hash`、LoRaWAN は `dev_eui` で端末を特定する。
    キーは平文で保存しない（DB が漏れても送信を偽装されないようにするため）。
    """

    __tablename__ = "sensor_devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    plot_id: Mapped[int | None] = mapped_column(Integer, index=True)
    key_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    dev_eui: Mapped[str | None] = mapped_column(String(16), unique=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
    last_seen_at: Mapped[datetime | None] = mapped_column(UTCDateTime)


class SensorReading(Base):
    """測定値。同じ端末・同じ測定時刻は1件だけ（再送を重複として捨てるため）。"""

    __tablename__ = "sensor_readings"
    __table_args__ = (UniqueConstraint("sensor_device_id", "measured_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    sensor_device_id: Mapped[int] = mapped_column(ForeignKey("sensor_devices.id"))
    measured_at: Mapped[datetime] = mapped_column(UTCDateTime)
    received_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
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


# --- 農地 ---


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
    # 偽にすると一覧から消え、新しい予定・作業には使えない。過去の予定・作業ログには名前を残す
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
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
    creator: Mapped["User"] = relationship(foreign_keys=[created_by], lazy="joined")


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
    # 帽子を使わずに始めた作業は偽。判定の設定は配らない
    uses_hat: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
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


# --- 農園画面・今日のひとこと ---


class IrrigationSettings(Base):
    """灌水の助言で使う農地ごとの目安。行がなければ既定値を使う。"""

    __tablename__ = "irrigation_settings"

    plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), primary_key=True)
    rain_skip_mm: Mapped[float] = mapped_column(Float, default=10.0)
    hot_temp_c: Mapped[float] = mapped_column(Float, default=33.0)


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"
    __table_args__ = (UniqueConstraint("plot_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    plot_id: Mapped[int] = mapped_column(ForeignKey("plots.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    temp_max: Mapped[float | None] = mapped_column(Float)
    temp_min: Mapped[float | None] = mapped_column(Float)
    precip_mm: Mapped[float | None] = mapped_column(Float)
    weather_code: Mapped[int | None] = mapped_column(Integer)
    fetched_at: Mapped[datetime] = mapped_column(UTCDateTime)


class DailyAdvice(Base):
    """今日のひとこと。経営体ごとに1日1件。"""

    __tablename__ = "daily_advices"
    __table_args__ = (UniqueConstraint("farm_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"))
    date: Mapped[date] = mapped_column(Date)
    summary: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    # 生成に使った材料。あとから「なぜこの文になったか」を確かめられるようにする
    context: Mapped[dict[str, Any]] = mapped_column(JSON)
    model: Mapped[str] = mapped_column(String(50))
    generated_at: Mapped[datetime] = mapped_column(UTCDateTime)


# --- AI 相談 ---


class ChatThread(Base):
    __tablename__ = "chat_threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    # 作業中の相談のときだけ入る。作業画面の「AI相談ログ」に使う
    session_id: Mapped[int | None] = mapped_column(ForeignKey("work_sessions.id"), index=True)
    title: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("chat_threads.id"), index=True)
    role: Mapped[str] = mapped_column(String(10))  # 'user' | 'assistant'
    content: Mapped[str] = mapped_column(Text)
    # 回答を作るときに AI が呼んだ関数の名前（あとから確かめるため）
    tools_used: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())


class KnowledgeDocument(Base):
    """相談に使う知識の原本。`farm_id` が空なら全経営体で共有する。"""

    __tablename__ = "knowledge_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int | None] = mapped_column(ForeignKey("farms.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    source_type: Mapped[str] = mapped_column(String(20))  # 'research' | 'interview' | 'voice_note' など
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="CASCADE"), index=True)
    farm_id: Mapped[int | None] = mapped_column(Integer, index=True)
    content: Mapped[str] = mapped_column(Text)


class VoiceNote(Base):
    """作業の終わりに残す「今日の気づき」。文字起こしはあとから埋まることがある。"""

    __tablename__ = "voice_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_event_id: Mapped[UUID] = mapped_column(Uuid, unique=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("work_sessions.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    storage_key: Mapped[str] = mapped_column(String(300))
    content_type: Mapped[str] = mapped_column(String(50))
    transcript: Mapped[str | None] = mapped_column(Text)
    transcribed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    knowledge_document_id: Mapped[int | None] = mapped_column(ForeignKey("knowledge_documents.id"))
    # 端末で録音した時刻。通信が切れていたときは created_at（受け取った時刻）より前になる
    recorded_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now())


# --- 農園日誌 ---


class JournalNote(Base):
    """日誌の備考。ほかの欄（天気・気温・作業）は表示のたびに記録から組み立てる。"""

    __tablename__ = "journal_notes"
    __table_args__ = (UniqueConstraint("farm_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"))
    date: Mapped[date] = mapped_column(Date)
    note: Mapped[str] = mapped_column(Text)
    updated_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime)
