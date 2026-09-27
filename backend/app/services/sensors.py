"""センサー受信のドメインロジック。

Wi-Fi 直結と LoRaWAN のどちらの経路も、最後は `save_readings` に落ちる。
"""
import hashlib
import secrets
import struct
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects import postgresql, sqlite
from sqlalchemy.orm import Session

from app.models import SensorDevice, SensorReading

LORAWAN_PAYLOAD_VERSION = 1

# 欠測を表す「ありえない値」
_MISSING_I16 = 0x7FFF
_MISSING_U16 = 0xFFFF
_MISSING_U8 = 0xFF


def generate_device_key() -> str:
    return secrets.token_urlsafe(32)


def hash_device_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def find_device_by_key(db: Session, key: str) -> SensorDevice | None:
    return db.scalar(select(SensorDevice).where(SensorDevice.key_hash == hash_device_key(key)))


def find_device_by_dev_eui(db: Session, dev_eui: str) -> SensorDevice | None:
    return db.scalar(select(SensorDevice).where(SensorDevice.dev_eui == dev_eui.upper()))


@dataclass
class DecodedReading:
    temperature: float | None
    humidity: float | None
    pressure: float | None
    soil_moisture_raw: int | None
    battery_pct: int | None


class PayloadError(ValueError):
    pass


def decode_lorawan_payload(payload: bytes) -> DecodedReading:
    """10バイトのペイロードを復号する。ビッグエンディアン。

    | offset | 内容 | 型 | 単位 | 欠測 |
    |---|---|---|---|---|
    | 0 | フォーマット版 | uint8 | | |
    | 1-2 | 気温 | int16 | 0.01℃ | 0x7FFF |
    | 3-4 | 湿度 | uint16 | 0.01% | 0xFFFF |
    | 5-6 | 気圧 | uint16 | (hPa-800)×10 | 0xFFFF |
    | 7-8 | 土壌水分 | uint16 | ADC生値 | 0xFFFF |
    | 9 | 電池残量 | uint8 | % | 0xFF |
    """
    if len(payload) != 10:
        raise PayloadError(f"ペイロード長が10バイトではありません（{len(payload)}バイト）")
    version, temp, hum, pres, soil, batt = struct.unpack(">BhHHHB", payload)
    if version != LORAWAN_PAYLOAD_VERSION:
        raise PayloadError(f"未対応のフォーマット版です（{version}）")
    return DecodedReading(
        temperature=None if temp == _MISSING_I16 else temp / 100,
        humidity=None if hum == _MISSING_U16 else hum / 100,
        pressure=None if pres == _MISSING_U16 else pres / 10 + 800,
        soil_moisture_raw=None if soil == _MISSING_U16 else soil,
        battery_pct=None if batt == _MISSING_U8 else batt,
    )


def save_readings(db: Session, device: SensorDevice, rows: list[dict], source: str) -> tuple[int, int]:
    """測定値を保存し、(accepted, duplicated) を返す。

    同じ端末・同じ `measured_at` はすでにあれば無視する（再送はエラーにしない）。
    """
    dialect = db.get_bind().dialect.name
    insert = postgresql.insert if dialect == "postgresql" else sqlite.insert
    accepted = 0
    for row in rows:
        # UTC にそろえて保存する（SQLite はタイムゾーンを保持しないため）
        row = {**row, "measured_at": row["measured_at"].astimezone(timezone.utc)}
        stmt = (
            insert(SensorReading)
            .values(sensor_device_id=device.id, source=source, **row)
            .on_conflict_do_nothing(index_elements=["sensor_device_id", "measured_at"])
            # rowcount は PostgreSQL の ORM 経由だと -1 になるため、挿入できた行を RETURNING で数える
            .returning(SensorReading.id)
        )
        accepted += len(db.execute(stmt).all())
    device.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    return accepted, len(rows) - accepted
