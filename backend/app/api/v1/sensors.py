import base64
import binascii
import hmac
from datetime import date, datetime, time, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_plot_in_farm
from app.core.config import settings
from app.db import get_db
from app.models import SensorDevice, SensorReading, User
from app.services.field import soil_pct
from app.schemas.sensors import (
    LorawanUplink,
    SensorIngest,
    SensorHourlyOut,
    SensorIngestResult,
    SensorReadingOut,
)
from app.services.sensors import (
    PayloadError,
    decode_lorawan_payload,
    find_device_by_dev_eui,
    find_device_by_key,
    save_readings,
)

router = APIRouter(tags=["sensors"])

JST = timezone(timedelta(hours=9))


@router.post(
    "/ingest/sensor",
    response_model=SensorIngestResult,
    summary="Wi-Fi直結ユニットから測定値を受け取る",
    description=(
        "農地に常設したユニットから10〜30分間隔で送られる。\n\n"
        "**`soil_moisture_raw` は ADC の生値をそのまま送る。** 換算はサーバーで行う"
        "（校正式を直したとき、過去データを再計算できるようにするため）。\n\n"
        "**`battery_pct` は測れるなら必ず入れる。** 常設デバイスで電池切れに気づけないのは致命的。"
        "USB 給電などで測れない間は省略してよい（固定値は入れない）。\n\n"
        "同じ端末・同じ `measured_at` の再送は `duplicated` に数え、エラーにしない。\n\n"
        "キーが未登録なら 401。"
    ),
)
def ingest_sensor(
    body: SensorIngest,
    x_device_key: str = Header(description="デバイスごとのキー"),
    db: Session = Depends(get_db),
) -> SensorIngestResult:
    device = find_device_by_key(db, x_device_key)
    if device is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="デバイスキーが無効です")
    rows = [r.model_dump() for r in body.readings]
    accepted, duplicated = save_readings(db, device, rows, source="wifi")
    return SensorIngestResult(accepted=accepted, duplicated=duplicated)


@router.post(
    "/ingest/lorawan",
    response_model=SensorIngestResult,
    summary="The Things Network の Webhook を受け取る",
    description=(
        "露地展開時に使う。ペイロードは10バイト（形式は `LorawanUplink` を参照）。\n\n"
        "**デコードはサーバー側で行う。** TTN のペイロード整形機能は使わない"
        "（git管理でき、ユニットテストが書け、ChirpStack へ移行しても動くため）。\n\n"
        "**経路が変わってもサーバー側のドメインロジックは共通。**\n"
        "ハード担当は Wi-Fi 直結で開発を進め、後から LoRaWAN に切り替えられる。\n\n"
        "TTN の Webhook 設定で追加ヘッダー `X-Webhook-Secret` を付ける。"
        "端末は `dev_eui` で特定する（未登録なら 404）。"
    ),
)
def ingest_lorawan(
    body: LorawanUplink,
    x_webhook_secret: str = Header(),
    db: Session = Depends(get_db),
) -> SensorIngestResult:
    expected = settings.ttn_webhook_secret
    if not expected or not hmac.compare_digest(x_webhook_secret, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Webhookシークレットが無効です")

    dev_eui = body.end_device_ids.get("dev_eui")
    device = find_device_by_dev_eui(db, dev_eui) if dev_eui else None
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="端末が登録されていません")

    try:
        payload = base64.b64decode(body.uplink_message.get("frm_payload", ""), validate=True)
        decoded = decode_lorawan_payload(payload)
    except (binascii.Error, PayloadError) as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e)) from e

    measured_at = body.uplink_message.get("received_at") or body.received_at
    row = {"measured_at": _parse_time(measured_at), **decoded.__dict__}
    accepted, duplicated = save_readings(db, device, [row], source="lorawan")
    return SensorIngestResult(accepted=accepted, duplicated=duplicated)


RAW_LIMIT = 3000  # 10分間隔なら約3週間分。7日分（1008件）は必ず入る
HOURLY_DEFAULT_DAYS = 7
HOURLY_LIMIT = 24 * 62


@router.get(
    "/plots/{plot_id}/sensor-readings",
    response_model=list[SensorReadingOut] | list[SensorHourlyOut],
    summary="測定値を参照する",
    description=(
        "`from` / `to` は日本時間の日付。どちらも新しい順。\n\n"
        "- `interval=raw`（既定）: 測定値をそのまま返す。最大3000件\n"
        "- `interval=hour`: 1時間ごとの平均を返す（データ推移のグラフ用）。`from` を省くと今日を含む過去7日。"
        "測定のない時間は返さないので、隣り合う点が1時間より空いていたら線を途切れさせる\n\n"
        "農地に端末が複数あるときは区別せずまとめる。`raw` ではすべての端末の値を返し（`sensor_device_id` で見分けられる）、"
        "`hour` ではすべての端末の平均にする。\n\n"
        "`soil_moisture_pct` は農地の校正値（乾燥時・飽和時の生値）から換算する。校正値がなければ null。"
        "`measured_at` は UTC のタイムゾーン付き。"
    ),
)
def list_readings(
    plot_id: int,
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    interval: Literal["raw", "hour"] = Query(default="raw", description="raw: 測定値そのまま / hour: 1時間ごとの平均"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[SensorReadingOut] | list[SensorHourlyOut]:
    plot = get_plot_in_farm(db, plot_id, user.farm_id)
    if interval == "hour" and date_from is None:
        date_from = (date_to or datetime.now(JST).date()) - timedelta(days=HOURLY_DEFAULT_DAYS - 1)
    stmt = (
        select(SensorReading)
        .join(SensorDevice, SensorReading.sensor_device_id == SensorDevice.id)
        .where(SensorDevice.plot_id == plot_id)
        .order_by(SensorReading.measured_at.desc())
    )
    if date_from:
        stmt = stmt.where(SensorReading.measured_at >= _jst_day_start(date_from))
    if date_to:
        stmt = stmt.where(SensorReading.measured_at < _jst_day_start(date_to + timedelta(days=1)))
    if interval == "hour":
        return hourly_means(list(db.scalars(stmt)), plot)[:HOURLY_LIMIT]
    return [
        SensorReadingOut.model_validate(r, from_attributes=True).model_copy(
            update={"soil_moisture_pct": soil_pct(r.soil_moisture_raw, plot)})
        for r in db.scalars(stmt.limit(RAW_LIMIT))
    ]


def hourly_means(rows: list[SensorReading], plot) -> list[SensorHourlyOut]:
    """1時間ごとに平均する（日本時間とUTCは時差が整数時間なので、UTC の正時で区切ってよい）。新しい順。"""
    buckets: dict[datetime, list[SensorReading]] = {}
    for r in rows:
        at = r.measured_at.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
        buckets.setdefault(at, []).append(r)

    def mean(values: list[float | None]) -> float | None:
        vs = [v for v in values if v is not None]
        return round(sum(vs) / len(vs), 1) if vs else None

    return [
        SensorHourlyOut(
            measured_at=at,
            temperature=mean([r.temperature for r in rs]),
            humidity=mean([r.humidity for r in rs]),
            pressure=mean([r.pressure for r in rs]),
            soil_moisture_pct=mean([soil_pct(r.soil_moisture_raw, plot) for r in rs]),
            count=len(rs),
        )
        for at, rs in sorted(buckets.items(), reverse=True)
    ]


def _jst_day_start(d: date) -> datetime:
    return datetime.combine(d, time.min, JST).astimezone(timezone.utc)


def _parse_time(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    # TTN はナノ秒まで返すことがあるので、Python が読めるマイクロ秒に切り詰める
    head, _, frac = value.replace("Z", "+00:00").partition(".")
    if frac:
        digits = "".join(c for c in frac if c.isdigit())
        tz = frac[len(digits):]
        value = f"{head}.{digits[:6]}{tz}"
    return datetime.fromisoformat(value)
