import unittest
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.jobs import seconds_until_next_run
from app.main import app
from app.models import Plot, SensorDevice, WeatherForecast
from app.services.field import decide_advice, is_drying, soil_note, soil_pct
from app.services.sensors import save_readings
from app.services.weather import refresh_forecasts
from tests.helpers import login, make_farm
from tests.test_sensors import register_device, reading

JST = timezone(timedelta(hours=9))


ADVICE_BASE = dict(current=40.0, forecast=38.0, change_24h=-1.0, check_pct=28.0, rain_mm=0.0, temp_max=25.0,
                   month=10, rain_skip_mm=10.0, hot_temp_c=33.0)


def advice(**overrides):
    return decide_advice(**{**ADVICE_BASE, **overrides}).rule


class AdviceRuleTests(unittest.TestCase):
    def test_rules_in_order(self) -> None:
        self.assertEqual(advice(current=None), "no_data")
        self.assertEqual(advice(calibrated=False, current=None), "not_calibrated")
        self.assertEqual(advice(rain_mm=12.0), "rain_expected")
        self.assertEqual(advice(rain_mm=12.0, current=20.0), "below_now")  # 乾いていれば雨の予報より優先
        self.assertEqual(advice(current=25.0), "below_now")
        self.assertEqual(advice(forecast=26.0), "below_tomorrow")
        self.assertEqual(advice(forecast=26.0, rain_mm=10.0), "rain_expected")
        self.assertEqual(advice(month=8, temp_max=34.0), "hot_and_drying")
        self.assertEqual(advice(month=10, temp_max=34.0), "ok")
        self.assertEqual(advice(), "ok")

    def test_advice_has_three_parts_and_never_states_amount(self) -> None:
        cases = [dict(calibrated=False, current=None), dict(current=None), dict(rain_mm=12.0), dict(current=25.0),
                 dict(forecast=26.0), dict(month=8, temp_max=34.0), dict(change_24h=-5.0), dict()]
        for case in cases:
            a = decide_advice(**{**ADVICE_BASE, **case})
            self.assertTrue(a.category.startswith("水管理"), a)
            self.assertTrue(a.headline and a.detail, a)
            self.assertFalse(a.headline.endswith("。"), a)
            self.assertEqual(a.message, f"{a.headline}。{a.detail}")
            self.assertNotRegex(a.headline + a.detail, r"\d+\s*(L|リットル|ml|分間)")

    def test_ok_while_drying_matches_figma(self) -> None:
        a = decide_advice(**{**ADVICE_BASE, "change_24h": -3.0})
        self.assertEqual((a.rule, a.category, a.headline, a.detail), (
            "ok", "水管理・様子を見ましょう", "今すぐの灌水は必要なさそうです",
            "乾燥が進んでいます。明日午前に土の状態を確認しましょう。"))
        self.assertEqual(decide_advice(**ADVICE_BASE).detail, "土壌水分は目安の28%を上回っています。")

    def test_drying_threshold(self) -> None:
        self.assertTrue(is_drying(-3.0))
        self.assertFalse(is_drying(-2.9))
        self.assertFalse(is_drying(None))

    def test_soil_note(self) -> None:
        def note(**case):
            a = decide_advice(**{**ADVICE_BASE, **case})
            return soil_note(a, drying=is_drying(case.get("change_24h", -1.0)), check_pct=28.0,
                             forecast=case.get("forecast", 38.0))
        self.assertEqual(note(forecast=26.0), {
            "headline": "明日午前は、確認のタイミング",
            "body": "乾燥が続くと、目安の28%を下回る予測。土の状態を見て灌水を検討しましょう。"})
        self.assertEqual(note(change_24h=-4.0)["headline"], "乾燥が進んでいます")
        self.assertEqual(note()["headline"], "落ち着いています")
        self.assertIsNone(note(current=None))
        self.assertIsNone(note(calibrated=False))

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
        self.assertEqual(s["advice"]["headline"], "明日午前に土の状態を確認しましょう")
        self.assertTrue(s["soil_drying"])
        self.assertEqual(s["soil_note"]["headline"], "明日午前は、確認のタイミング")
        self.assertTrue(s["has_sensor"])
        self.assertEqual(s["last_measured_at"], s["measured_at"])
        self.assertTrue(s["measured_at"].endswith(("Z", "+00:00")))
        self.assertEqual(s["tomorrow"]["weather"], "晴れ")
        self.assertEqual(s["suggested_schedule"]["date"], tomorrow.isoformat())

        # 明日すでに灌水の予定があれば、予定への追加は出さない
        self.client.post("/api/v1/schedules", headers=headers, json={
            "client_event_id": str(uuid4()), **s["suggested_schedule"], "assignee_ids": [farm.worker_id]})
        again = self.client.get(f"/api/v1/plots/{plot_id}/field-summary", headers=headers).json()
        self.assertIsNone(again["suggested_schedule"])

    def test_readings_include_converted_percent(self) -> None:
        farm, plot_id, _ = self.setup_drying_plot()
        rows = self.client.get(f"/api/v1/plots/{plot_id}/sensor-readings",
                               headers=login(self.client, farm, farm.worker_id)).json()
        self.assertEqual(rows[0]["soil_moisture_pct"], 32.0)
        self.assertTrue(rows[0]["measured_at"].endswith(("Z", "+00:00")))  # SQLite でもタイムゾーン付き

    def add_readings(self, plot_id: int, rows: list[dict]) -> None:
        with SessionLocal() as db:
            device = SensorDevice(name="test", plot_id=plot_id)
            db.add(device)
            db.flush()
            save_readings(db, device, rows, source="wifi")
            db.commit()

    def test_seven_days_of_raw_readings_fit(self) -> None:
        farm = make_farm()
        plot_id = farm.plot_ids[0]
        now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        self.add_readings(plot_id, [{"measured_at": now - timedelta(minutes=10 * i), "soil_moisture_raw": 2000}
                                    for i in range(1008)])
        rows = self.client.get(f"/api/v1/plots/{plot_id}/sensor-readings",
                               headers=login(self.client, farm, farm.worker_id)).json()
        self.assertEqual(len(rows), 1008)

    def test_hourly_means_merge_devices(self) -> None:
        farm = make_farm()
        plot_id = farm.plot_ids[0]
        with SessionLocal() as db:
            plot = db.get(Plot, plot_id)
            plot.soil_dry_raw, plot.soil_wet_raw = 3000, 1000
            db.commit()
        hour = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0) - timedelta(hours=3)
        self.add_readings(plot_id, [{"measured_at": hour + timedelta(minutes=10), "temperature": 20.0,
                                     "soil_moisture_raw": 2000},
                                    {"measured_at": hour + timedelta(minutes=50), "temperature": 22.0,
                                     "soil_moisture_raw": 2200}])
        self.add_readings(plot_id, [{"measured_at": hour + timedelta(minutes=20), "temperature": 24.0},
                                    {"measured_at": hour + timedelta(hours=2), "temperature": 30.0}])
        self.add_readings(plot_id, [{"measured_at": hour - timedelta(days=10), "temperature": 5.0}])  # 7日より前
        rows = self.client.get(f"/api/v1/plots/{plot_id}/sensor-readings", params={"interval": "hour"},
                               headers=login(self.client, farm, farm.worker_id)).json()
        self.assertEqual(len(rows), 2)  # 測定のない時間は返さない。新しい順
        self.assertEqual(rows[1], {"measured_at": hour.isoformat().replace("+00:00", "Z"), "temperature": 22.0,
                                   "humidity": None, "pressure": None, "soil_moisture_pct": 45.0, "count": 3})
        self.assertEqual(rows[0]["temperature"], 30.0)

    def test_stopped_sensor_is_distinguishable_from_no_data(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        stopped, empty = farm.plot_ids
        self.add_readings(stopped, [{"measured_at": datetime.now(timezone.utc) - timedelta(hours=40),
                                     "soil_moisture_raw": 2000}])
        s = self.client.get(f"/api/v1/plots/{stopped}/field-summary", headers=headers).json()
        self.assertEqual((s["has_sensor"], s["measured_at"]), (True, None))
        self.assertIsNotNone(s["last_measured_at"])
        e = self.client.get(f"/api/v1/plots/{empty}/field-summary", headers=headers).json()
        self.assertEqual((e["has_sensor"], e["last_measured_at"]), (False, None))

    def test_uncalibrated_plot_has_no_percent(self) -> None:
        farm = make_farm()
        s = self.client.get(f"/api/v1/plots/{farm.plot_ids[1]}/field-summary",
                            headers=login(self.client, farm, farm.worker_id)).json()
        self.assertEqual((s["calibrated"], s["advice"]["rule"]), (False, "not_calibrated"))
        self.assertIsNone(s["soil_note"])

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
            "start_time": "08:00", "work_types": ["収穫"], "assignee_ids": [farm.worker_id]})
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
