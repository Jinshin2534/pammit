"""DB のテーブル定義。現時点ではセンサーのみ実装。"""
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, SmallInteger, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


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
