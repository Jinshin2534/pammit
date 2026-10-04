"""天気予報の取り込み。Open-Meteo の気象庁モデル（キー不要）を使う。

気象庁の予報 JSON は降水確率しかなく、灌水の助言に要る雨量（mm）が取れないため。
"""
import json
import urllib.parse
import urllib.request
from collections.abc import Callable
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Plot, WeatherForecast

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# WMO の天気コードを、画面と日誌で使う言葉にまとめる
_WEATHER_WORDS = [
    ((0, 1), "晴れ"), ((2,), "晴れ時々くもり"), ((3,), "くもり"), ((45, 48), "霧"),
    ((51, 53, 55, 56, 57), "霧雨"), ((61, 63, 65, 66, 67, 80, 81, 82), "雨"),
    ((71, 73, 75, 77, 85, 86), "雪"), ((95, 96, 99), "雷雨"),
]


def weather_word(code: int | None) -> str | None:
    if code is None:
        return None
    for codes, word in _WEATHER_WORDS:
        if code in codes:
            return word
    return None


def fetch_daily(latitude: float, longitude: float) -> list[dict]:
    query = urllib.parse.urlencode({
        "latitude": latitude, "longitude": longitude, "timezone": "Asia/Tokyo", "forecast_days": 3,
        "models": "jma_seamless",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    })
    with urllib.request.urlopen(f"{FORECAST_URL}?{query}", timeout=15) as res:
        daily = json.load(res)["daily"]
    return [
        {"date": date.fromisoformat(d), "temp_max": daily["temperature_2m_max"][i],
         "temp_min": daily["temperature_2m_min"][i], "precip_mm": daily["precipitation_sum"][i],
         "weather_code": daily["weather_code"][i]}
        for i, d in enumerate(daily["time"])
    ]


def refresh_forecasts(db: Session, fetch: Callable[[float, float], list[dict]] = fetch_daily) -> int:
    """全農地の予報を取り込み直し、取り込んだ日数を返す。取れなかった農地は前回の値を残す。"""
    count = 0
    now = datetime.now(timezone.utc)
    for plot in db.scalars(select(Plot)):
        lat = plot.latitude if plot.latitude is not None else settings.default_latitude
        lon = plot.longitude if plot.longitude is not None else settings.default_longitude
        try:
            days = fetch(lat, lon)
        except Exception:  # noqa: BLE001  天気が取れなくても他の処理は止めない
            continue
        for d in days:
            row = db.scalar(select(WeatherForecast).where(
                WeatherForecast.plot_id == plot.id, WeatherForecast.date == d["date"]))
            if row is None:
                row = WeatherForecast(plot_id=plot.id, date=d["date"])
                db.add(row)
            row.temp_max, row.temp_min = d["temp_max"], d["temp_min"]
            row.precip_mm, row.weather_code = d["precip_mm"], d["weather_code"]
            row.fetched_at = now
            count += 1
    db.commit()
    return count


def forecast_for(db: Session, plot_id: int, day: date) -> WeatherForecast | None:
    return db.scalar(select(WeatherForecast).where(WeatherForecast.plot_id == plot_id, WeatherForecast.date == day))
