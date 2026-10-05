import unittest
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.jobs import seconds_until_next_run
from app.main import app
from app.models import Plot, WeatherForecast
from app.services.field import decide_advice, soil_pct
from app.services.weather import refresh_forecasts
from tests.helpers import login, make_farm
from tests.test_sensors import register_device, reading

JST = timezone(timedelta(hours=9))


def advice(**overrides):
    base = dict(current=40.0, forecast=38.0, change_24h=-1.0, check_pct=28.0, rain_mm=0.0, temp_max=25.0,
                month=10, rain_skip_mm=10.0, hot_temp_c=33.0)
    return decide_advice(**{**base, **overrides}).rule


class AdviceRuleTests(unittest.TestCase):
    def test_rules_in_order(self) -> None:
        self.assertEqual(advice(current=None), "no_data")
        self.assertEqual(advice(rain_mm=12.0), "rain")
        self.assertEqual(advice(rain_mm=12.0, current=20.0), "below_now")  # 乾いていれば雨の予報より優先
        self.assertEqual(advice(current=25.0), "below_now")
        self.assertEqual(advice(forecast=26.0), "below_tomorrow")
        self.assertEqual(advice(forecast=26.0, rain_mm=10.0), "rain")
        self.assertEqual(advice(month=8, temp_max=34.0), "hot_and_drying")
        self.assertEqual(advice(month=10, temp_max=34.0), "ok")
        self.assertEqual(advice(), "ok")

    def test_soil_pct_uses_plot_calibration(self) -> None:
        plot = Plot(soil_dry_raw=3000, soil_wet_raw=1000)
        self.assertEqual(soil_pct(2000, plot), 50.0)
        self.assertEqual(soil_pct(3500, plot), 0.0)  # 範囲外は 0〜100 に収める
        self.assertIsNone(soil_pct(2000, Plot()))


class FieldApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def setup_drying_plot(self):
        """24時間で 50% → 32% まで乾いている農地。明日の朝には目安（28%）を下回る。"""
        farm = make_farm()
        plot_id = farm.plot_ids[0]
        with SessionLocal() as db:
            plot = db.get(Plot, plot_id)
            plot.soil_dry_raw, plot.soil_wet_raw = 3000, 1000
            tomorrow = datetime.now(JST).date() + timedelta(days=1)
            db.add(WeatherForecast(plot_id=plot_id, date=tomorrow, temp_max=24.0, temp_min=15.0, precip_mm=0.0,
                                   weather_code=0, fetched_at=datetime.now(timezone.utc)))
            db.commit()
        key = register_device(plot_id=plot_id)
        now = datetime.now(timezone.utc)
        rows = [reading((now - timedelta(hours=24 - h)).isoformat(), soil_moisture_raw=2000 + 15 * h)
                for h in range(0, 25, 3)]  # 生値 2000→2360 = 50%→32%
        self.client.post("/api/v1/ingest/sensor", headers={"X-Device-Key": key}, json={"readings": rows})
        return farm, plot_id, tomorrow

    def test_drying_plot_suggests_check_tomorrow(self) -> None:
        farm, plot_id, tomorrow = self.setup_drying_plot()
        headers = login(self.client, farm, farm.worker_id)
        s = self.client.get(f"/api/v1/plots/{plot_id}/field-summary", headers=headers).json()
        self.assertEqual(s["soil_moisture_pct"], 32.0)
        self.assertEqual(s["soil_change_24h"], -18.0)
        self.assertLess(s["soil_forecast_tomorrow"], 28.0)
        self.assertEqual(s["advice"]["rule"], "below_tomorrow")
        self.assertEqual(s["tomorrow"]["weather"], "晴れ")
        self.assertEqual(s["suggested_schedule"]["date"], tomorrow.isoformat())

        # 提案はそのまま予定の登録に使える形。担当は空で作る
        r = self.client.post("/api/v1/schedules", headers=headers, json={
            "client_event_id": str(uuid4()), **s["suggested_schedule"]})
        self.assertEqual((r.status_code, r.json()["assignees"]), (201, []))
        # 明日すでに灌水の予定があれば、予定への追加は出さない
        again = self.client.get(f"/api/v1/plots/{plot_id}/field-summary", headers=headers).json()
        self.assertIsNone(again["suggested_schedule"])

    def test_readings_include_converted_percent(self) -> None:
        farm, plot_id, _ = self.setup_drying_plot()
        rows = self.client.get(f"/api/v1/plots/{plot_id}/sensor-readings",
                               headers=login(self.client, farm, farm.worker_id)).json()
        self.assertEqual(rows[0]["soil_moisture_pct"], 32.0)

    def test_uncalibrated_plot_has_no_percent(self) -> None:
        farm = make_farm()
        s = self.client.get(f"/api/v1/plots/{farm.plot_ids[1]}/field-summary",
                            headers=login(self.client, farm, farm.worker_id)).json()
        self.assertEqual((s["calibrated"], s["advice"]["rule"]), (False, "no_data"))

    def test_summary_lists_all_plots(self) -> None:
        farm = make_farm()
        r = self.client.get("/api/v1/plots/summary", headers=login(self.client, farm, farm.worker_id))
        self.assertEqual([p["plot_id"] for p in r.json()], farm.plot_ids)

    def test_sensor_readings_need_login(self) -> None:
        farm = make_farm()
        self.assertEqual(self.client.get(f"/api/v1/plots/{farm.plot_ids[0]}/sensor-readings").status_code, 401)


class DailyAdviceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def test_without_openai_key_uses_template_once_per_day(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        today = datetime.now(JST).date()
        self.client.post("/api/v1/schedules", headers=headers, json={
            "client_event_id": str(uuid4()), "plot_id": farm.plot_ids[1], "date": today.isoformat(),
            "start_time": "08:00", "end_time": "11:00", "work_types": ["収穫"], "assignee_ids": [farm.worker_id]})
        first = self.client.get("/api/v1/daily-advice", headers=headers).json()
        second = self.client.get("/api/v1/daily-advice", headers=headers).json()
        self.assertEqual(first["summary"], "今日は三番ハウスで収穫の予定です。")
        self.assertEqual(first["generated_at"], second["generated_at"])


class WeatherJobTests(unittest.TestCase):
    def test_refresh_saves_forecasts_and_survives_failures(self) -> None:
        init_db()
        farm = make_farm()
        day = date(2026, 10, 4)

        def fake_fetch(lat, lon):
            return [{"date": day, "temp_max": 23.1, "temp_min": 16.9, "precip_mm": 0.0, "weather_code": 3}]

        with SessionLocal() as db:
            refresh_forecasts(db, fetch=fake_fetch)
            refresh_forecasts(db, fetch=lambda lat, lon: (_ for _ in ()).throw(OSError("offline")))
            row = db.query(WeatherForecast).filter_by(plot_id=farm.plot_ids[0], date=day).one()
            self.assertEqual(row.temp_max, 23.1)

    def test_next_run_is_5am_jst(self) -> None:
        now = datetime(2026, 10, 4, 4, 30, tzinfo=JST)
        self.assertEqual(seconds_until_next_run(now), 30 * 60)
        self.assertEqual(seconds_until_next_run(datetime(2026, 10, 4, 6, 0, tzinfo=JST)), 23 * 3600)


if __name__ == "__main__":
    unittest.main()
