"""センサー。園地に常設したユニットから送られる。

帽子には統合しない。土壌水分センサーは土に挿さないと測れず、
BME280 を帽子に載せると体温と呼気で測定値が汚染されるため。
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SensorReading(BaseModel):
    measured_at: datetime
    temperature: float | None = Field(default=None, description="BME280", examples=[31.2])
    humidity: float | None = Field(default=None, examples=[68.4])
    pressure: float | None = Field(default=None, description="hPa", examples=[1008.2])
    soil_moisture_raw: int | None = Field(
        default=None,
        description="**ADCの生値をそのまま送る。** 換算はサーバーで行う（校正式を直したとき過去データを再計算できるようにするため）",
        examples=[512],
    )
    battery_pct: int = Field(
        ge=0,
        le=100,
        description="**必ず入れる。** 常設デバイスで電池切れに気づけないのは致命的",
        examples=[87],
    )


class SensorIngest(BaseModel):
    """Wi-Fi 直結ユニットから。ヘッダ `X-Device-Key` で認証する。送信間隔は10〜30分でよい。"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "readings": [
                    {
                        "measured_at": "2026-08-16T09:00:00+09:00",
                        "temperature": 31.2,
                        "humidity": 68.4,
                        "pressure": 1008.2,
                        "soil_moisture_raw": 512,
                        "battery_pct": 87,
                    }
                ]
            }
        }
    )

    readings: list[SensorReading] = Field(max_length=100)


class LorawanUplink(BaseModel):
    """The Things Network の Webhook。

    ペイロードは10バイト。**デコードはサーバー側で行う。**
    TTN のペイロード整形機能は使わない（git管理でき、テストが書け、ChirpStack へ移行しても動くため）。

    | offset | 内容 | 型 | 単位 |
    |---|---|---|---|
    | 0 | フォーマット版 | uint8 | |
    | 1-2 | 気温 | int16 | 0.01℃ |
    | 3-4 | 湿度 | uint16 | 0.01% |
    | 5-6 | 気圧 | uint16 | (hPa-800)×10 |
    | 7-8 | 土壌水分 | uint16 | ADC生値 |
    | 9 | 電池残量 | uint8 | % |
    """

    end_device_ids: dict[str, Any]
    received_at: datetime
    uplink_message: dict[str, Any] = Field(description="frm_payload に base64 の10バイトが入る")


class SensorIngestResult(BaseModel):
    accepted: int
    duplicated: int


class SensorReadingOut(SensorReading):
    id: int
    sensor_device_id: int
    soil_moisture_pct: float | None = Field(default=None, description="サーバーで換算した値（0-100）")
