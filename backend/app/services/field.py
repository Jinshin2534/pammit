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


# 24時間でこれ以上下がっていたら「乾燥傾向」とする（ポイント）。仮の値
DRYING_DROP_PT = 3.0


def is_drying(change_24h: float | None) -> bool:
    return change_24h is not None and change_24h <= -DRYING_DROP_PT


def _n(v: float) -> str:
    return f"{v:g}"


@dataclass
class Advice:
    rule: str
    category: str  # 区分ラベル（例: 水管理・様子を見ましょう）
    headline: str  # 見出し。助言の結論
    detail: str  # 補足。理由と、いつ何を確かめるか
    suggest_check: bool  # 「確認を明日の予定に追加」を出すか

    @property
    def message(self) -> str:
        """見出しと補足をつないだ1文。互換のため残す（AI 相談と今日のひとことの材料）。"""
        return f"{self.headline}。{self.detail}"


WAIT = "水管理・様子を見ましょう"


def decide_advice(
    *, current: float | None, forecast: float | None, change_24h: float | None, check_pct: float,
    rain_mm: float | None, temp_max: float | None, month: int, rain_skip_mm: float, hot_temp_c: float,
    calibrated: bool = True,
) -> Advice:
    """上から順に判定し、最初に当てはまったものを返す。言い方は確認を促す形に限り、灌水量は断定しない。"""
    c = _n(check_pct)
    if not calibrated:
        return Advice("not_calibrated", "水管理・設定が必要", "土壌水分が校正されていません",
                      "農地の設定で乾燥時と飽和時の値を入れると、灌水の目安を出します。", False)
    if current is None:
        return Advice("no_data", "水管理・データなし", "土壌水分のデータがまだありません",
                      "センサーから測定値が届くと、灌水の目安を出します。", False)
    if rain_mm is not None and rain_mm >= rain_skip_mm and current >= check_pct:
        return Advice("rain_expected", WAIT, "今すぐの灌水は必要なさそうです",
                      f"明日は{_n(rain_mm)}mmの雨の予報です。雨のあとに土の状態を確認しましょう。", False)
    if current < check_pct:
        return Advice("below_now", "水管理・今日中に確認", "今日中に土の状態を確認しましょう",
                      f"土が乾き気味です。目安の{c}%を下回っています。", True)
    # 明日の雨が多い場合は上の rain_expected で返しているので、ここでは雨を見ない
    if forecast is not None and forecast < check_pct:
        return Advice("below_tomorrow", "水管理・明日確認", "明日午前に土の状態を確認しましょう",
                      f"乾燥が進んでいます。明日には目安の{c}%を下回りそうです。", True)
    if 6 <= month <= 9 and change_24h is not None and change_24h < 0 and temp_max is not None and temp_max >= hot_temp_c:
        return Advice("hot_and_drying", "水管理・暑さに注意", "晴天が1週間続く場合は灌水を検討しましょう",
                      f"明日の最高気温は{_n(temp_max)}℃の予報で、土が乾いてきています。土の状態を確認しましょう。", True)
    if is_drying(change_24h):
        return Advice("ok", WAIT, "今すぐの灌水は必要なさそうです",
                      "乾燥が進んでいます。明日午前に土の状態を確認しましょう。", False)
    return Advice("ok", WAIT, "今すぐの灌水は必要なさそうです", f"土壌水分は目安の{c}%を上回っています。", False)


def soil_note(advice: Advice, *, drying: bool, check_pct: float, forecast: float | None) -> dict | None:
    """データ推移の土壌水分タブに出す解説。土壌水分の値がないときは出さない。"""
    c = _n(check_pct)
    if advice.rule in ("no_data", "not_calibrated"):
        return None
    if advice.rule == "below_now":
        return {"headline": "今日のうちに、確認のタイミング",
                "body": f"目安の{c}%を下回っています。土の状態を見て灌水を検討しましょう。"}
    if advice.rule == "below_tomorrow":
        return {"headline": "明日午前は、確認のタイミング",
                "body": f"乾燥が続くと、目安の{c}%を下回る予測。土の状態を見て灌水を検討しましょう。"}
    if advice.rule == "rain_expected":
        return {"headline": "明日は雨の予報",
                "body": "雨のあとに土の状態を見て、灌水するか決めましょう。"}
    if advice.rule == "hot_and_drying":
        return {"headline": "暑さで乾きやすい時期",
                "body": "晴天が1週間続く場合は、土の状態を見て灌水を検討しましょう。"}
    if drying:
        tail = f"明日も目安の{c}%は上回る予測。" if forecast is not None else f"今は目安の{c}%を上回っています。"
        return {"headline": "乾燥が進んでいます", "body": tail + "明日午前に土の状態を確認しましょう。"}
    return {"headline": "落ち着いています", "body": f"目安の{c}%を上回っています。いつもどおり様子を見ましょう。"}


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
    calibrated = plot.soil_dry_raw is not None and plot.soil_wet_raw is not None
    advice = decide_advice(
        current=current, forecast=forecast, change_24h=change_24h, check_pct=plot.soil_check_pct,
        rain_mm=weather.precip_mm if weather else None, temp_max=weather.temp_max if weather else None,
        month=today.month, rain_skip_mm=settings_row.rain_skip_mm, hot_temp_c=settings_row.hot_temp_c,
        calibrated=calibrated,
    )
    drying = is_drying(change_24h)
    has_sensor = db.scalar(select(SensorDevice.id).where(SensorDevice.plot_id == plot.id).limit(1)) is not None
    last_measured_at = latest.measured_at if latest else _last_measured_at(db, plot.id)
    irrigation_planned = _irrigation_planned(db, plot.id, tomorrow)

    return {
        "plot_id": plot.id,
        "plot_name": plot.name,
        "measured_at": _aware(latest.measured_at) if latest else None,
        "soil_moisture_pct": current,
        "soil_change_24h": change_24h,
        "soil_forecast_tomorrow": forecast,
        "soil_check_pct": plot.soil_check_pct,
        "soil_drying": drying,
        "calibrated": calibrated,
        "has_sensor": has_sensor,
        "last_measured_at": _aware(last_measured_at) if last_measured_at else None,
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
        "advice": {"rule": advice.rule, "category": advice.category, "headline": advice.headline,
                   "detail": advice.detail, "message": advice.message},
        "soil_note": soil_note(advice, drying=drying, check_pct=plot.soil_check_pct, forecast=forecast),
        "suggested_schedule": (
            {"plot_id": plot.id, "date": tomorrow, "start_time": "08:00", "end_time": "09:00",
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


def _last_measured_at(db: Session, plot_id: int) -> datetime | None:
    """30時間より前も含めた最後の測定時刻。センサーが止まったかを見分けるのに使う。"""
    return db.scalar(
        select(SensorReading.measured_at)
        .join(SensorDevice, SensorReading.sensor_device_id == SensorDevice.id)
        .where(SensorDevice.plot_id == plot_id)
        .order_by(SensorReading.measured_at.desc())
        .limit(1)
    )


def _irrigation_planned(db: Session, plot_id: int, day: date) -> bool:
    for s in db.scalars(select(Schedule).where(Schedule.plot_id == plot_id, Schedule.date == day)):
        if IRRIGATION in s.work_types:
            return True
    return False
