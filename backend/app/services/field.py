"""農園画面の中身。土壌水分の換算・予測と、灌水の助言。

助言は「確認を促す」言い方に限り、灌水量は断定しない。根拠は docs/requirements.md。
"""
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import IrrigationSettings, Plot, Schedule, SensorDevice, SensorReading
from app.services.weather import forecast_for, weather_word

JST = timezone(timedelta(hours=9))
IRRIGATION = "灌水"


def soil_pct(raw: int | None, plot: Plot) -> float | None:
    """生値を%にする。容量式のセンサーは乾くほど値が大きくなる。校正値がなければ None。"""
    if raw is None or plot.soil_dry_raw is None or plot.soil_wet_raw is None:
        return None
    span = plot.soil_dry_raw - plot.soil_wet_raw
    if span == 0:
        return None
    pct = (plot.soil_dry_raw - raw) / span * 100
    return round(min(max(pct, 0.0), 100.0), 1)


def recent_readings(db: Session, plot_id: int, since: datetime) -> list[SensorReading]:
    return list(db.scalars(
        select(SensorReading)
        .join(SensorDevice, SensorReading.sensor_device_id == SensorDevice.id)
        .where(SensorDevice.plot_id == plot_id, SensorReading.measured_at >= since)
        .order_by(SensorReading.measured_at)
    ))


def _aware(dt: datetime) -> datetime:
    # SQLite はタイムゾーンを落とすので UTC として読む（センサーの値は UTC で保存している）
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _forecast_pct(points: list[tuple[datetime, float]], at: datetime) -> float | None:
    """直近の値を最小二乗の直線で延ばす。3時間以上の幅がないと出さない。"""
    if len(points) < 2 or (points[-1][0] - points[0][0]) < timedelta(hours=3):
        return None
    t0 = points[0][0]
    xs = [(t - t0).total_seconds() / 3600 for t, _ in points]
    ys = [v for _, v in points]
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    value = my + slope * ((at - t0).total_seconds() / 3600 - mx)
    return round(min(max(value, 0.0), 100.0), 1)


@dataclass
class Advice:
    rule: str
    message: str
    suggest_check: bool  # 「確認を明日の予定に追加」を出すか


def decide_advice(
    *, current: float | None, forecast: float | None, change_24h: float | None, check_pct: float,
    rain_mm: float | None, temp_max: float | None, month: int, rain_skip_mm: float, hot_temp_c: float,
) -> Advice:
    """上から順に判定し、最初に当てはまったものを返す。"""
    if current is None:
        return Advice("no_data", "土壌水分のデータがまだありません。", False)
    if rain_mm is not None and rain_mm >= rain_skip_mm and current >= check_pct:
        return Advice("rain", "明日は雨の予報です。今すぐの灌水は必要なさそうです。", False)
    if current < check_pct:
        return Advice("below_now", "土が乾き気味です。今日中に土の状態を確認しましょう。", True)
    if forecast is not None and forecast < check_pct and (rain_mm is None or rain_mm < rain_skip_mm):
        return Advice("below_tomorrow", "明日には目安を下回りそうです。明日午前に土の状態を確認しましょう。", True)
    if 6 <= month <= 9 and change_24h is not None and change_24h < 0 and temp_max is not None and temp_max >= hot_temp_c:
        return Advice("hot_and_drying", "暑く乾きやすい日が続いています。晴天が1週間続く場合は灌水を検討しましょう。", True)
    return Advice("ok", "今すぐの灌水は必要なさそうです。", False)


def field_summary(db: Session, plot: Plot, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    today = now.astimezone(JST).date()
    tomorrow = today + timedelta(days=1)
    readings = recent_readings(db, plot.id, now - timedelta(hours=30))
    latest = readings[-1] if readings else None

    points = [(_aware(r.measured_at), p) for r in readings
              if _aware(r.measured_at) >= now - timedelta(hours=24)
              and (p := soil_pct(r.soil_moisture_raw, plot)) is not None]
    current = soil_pct(latest.soil_moisture_raw, plot) if latest else None
    change_24h = _change_24h(readings, plot, now, current)
    forecast = _forecast_pct(points, datetime.combine(tomorrow, time(9), JST))

    settings_row = db.get(IrrigationSettings, plot.id) or IrrigationSettings(rain_skip_mm=10.0, hot_temp_c=33.0)
    weather = forecast_for(db, plot.id, tomorrow)
    advice = decide_advice(
        current=current, forecast=forecast, change_24h=change_24h, check_pct=plot.soil_check_pct,
        rain_mm=weather.precip_mm if weather else None, temp_max=weather.temp_max if weather else None,
        month=today.month, rain_skip_mm=settings_row.rain_skip_mm, hot_temp_c=settings_row.hot_temp_c,
    )
    irrigation_planned = _irrigation_planned(db, plot.id, tomorrow)

    return {
        "plot_id": plot.id,
        "plot_name": plot.name,
        "measured_at": _aware(latest.measured_at) if latest else None,
        "soil_moisture_pct": current,
        "soil_change_24h": change_24h,
        "soil_forecast_tomorrow": forecast,
        "soil_check_pct": plot.soil_check_pct,
        "calibrated": plot.soil_dry_raw is not None and plot.soil_wet_raw is not None,
        "temperature": latest.temperature if latest else None,
        "humidity": latest.humidity if latest else None,
        "pressure": latest.pressure if latest else None,
        "tomorrow": {
            "date": tomorrow,
            "temp_max": weather.temp_max if weather else None,
            "temp_min": weather.temp_min if weather else None,
            "precip_mm": weather.precip_mm if weather else None,
            "weather": weather_word(weather.weather_code) if weather else None,
        },
        "advice": {"rule": advice.rule, "message": advice.message},
        "suggested_schedule": (
            {"plot_id": plot.id, "date": tomorrow, "start_time": time(8), "end_time": time(9),
             "work_types": [IRRIGATION], "note": "土の状態を確認し、灌水するか判断する"}
            if advice.suggest_check and not irrigation_planned else None
        ),
    }


def _change_24h(readings: list[SensorReading], plot: Plot, now: datetime, current: float | None) -> float | None:
    """24時間前に一番近い値（前後2時間以内）との差。"""
    if current is None:
        return None
    target = now - timedelta(hours=24)
    candidates = [(abs(_aware(r.measured_at) - target), r) for r in readings]
    candidates = [(d, r) for d, r in candidates if d <= timedelta(hours=2)]
    if not candidates:
        return None
    past = soil_pct(min(candidates, key=lambda c: c[0])[1].soil_moisture_raw, plot)
    return None if past is None else round(current - past, 1)


def _irrigation_planned(db: Session, plot_id: int, day: date) -> bool:
    for s in db.scalars(select(Schedule).where(Schedule.plot_id == plot_id, Schedule.date == day)):
        if IRRIGATION in s.work_types:
            return True
    return False
