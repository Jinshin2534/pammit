from datetime import date

from fastapi import APIRouter, Header, Query

from app.schemas.sensors import (
    LorawanUplink,
    SensorIngest,
    SensorIngestResult,
    SensorReadingOut,
)

router = APIRouter(tags=["sensors"])


@router.post(
    "/ingest/sensor",
    response_model=SensorIngestResult,
    summary="Wi-Fi直結ユニットから測定値を受け取る",
    description=(
        "園地に常設したユニットから10〜30分間隔で送られる。\n\n"
        "**`soil_moisture_raw` は ADC の生値をそのまま送る。** 換算はサーバーで行う"
        "（校正式を直したとき、過去データを再計算できるようにするため）。\n\n"
        "**`battery_pct` を必ず入れる。** 常設デバイスで電池切れに気づけないのは致命的。"
    ),
)
async def ingest_sensor(
    body: SensorIngest,
    x_device_key: str = Header(description="デバイスごとのキー"),
) -> SensorIngestResult:
    return SensorIngestResult(accepted=len(body.readings), duplicated=0)


@router.post(
    "/ingest/lorawan",
    response_model=SensorIngestResult,
    summary="The Things Network の Webhook を受け取る",
    description=(
        "露地展開時に使う。ペイロードは10バイト。\n\n"
        "**デコードはサーバー側で行う。** TTN のペイロード整形機能は使わない"
        "（git管理でき、ユニットテストが書け、ChirpStack へ移行しても動くため）。\n\n"
        "**経路が変わってもサーバー側のドメインロジックは共通。**\n"
        "ハード担当は Wi-Fi 直結で開発を進め、後から LoRaWAN に切り替えられる。"
    ),
)
async def ingest_lorawan(
    body: LorawanUplink,
    x_webhook_secret: str = Header(),
) -> SensorIngestResult:
    return SensorIngestResult(accepted=1, duplicated=0)


@router.get(
    "/plots/{plot_id}/sensor-readings",
    response_model=list[SensorReadingOut],
    summary="測定値を参照する",
)
async def list_readings(
    plot_id: int,
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
) -> list[SensorReadingOut]:
    return []
