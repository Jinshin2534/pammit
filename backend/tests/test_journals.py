import unittest
from datetime import datetime, timezone
from unittest import mock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.main import app
from app.models import WeatherForecast
from app.services import storage
from tests.helpers import login, make_farm
from tests.test_sensors import register_device, reading

DAY = "2026-10-05"


class JournalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def work(self, headers, plot_id, work_type, start, end):
        sid = self.client.post("/api/v1/work-sessions", headers=headers, json={
            "client_event_id": str(uuid4()), "plot_id": plot_id, "work_type": work_type,
            "started_at": f"{DAY}T{start}:00+09:00"}).json()["id"]
        self.client.post(f"/api/v1/work-sessions/{sid}/finish", headers=headers, json={"ended_at": f"{DAY}T{end}:00+09:00"})

    def setup_day(self):
        farm = make_farm()
        worker, owner = login(self.client, farm, farm.worker_id), login(self.client, farm, farm.owner_id)
        self.work(worker, farm.plot_ids[0], "草刈り", "13:00", "14:30")
        self.work(worker, farm.plot_ids[1], "収穫", "08:00", "11:30")
        self.work(owner, farm.plot_ids[1], "収穫", "08:30", "11:00")
        key = register_device(plot_id=farm.plot_ids[0])
        self.client.post("/api/v1/ingest/sensor", headers={"X-Device-Key": key}, json={"readings": [
            reading(f"{DAY}T06:00:00+09:00", temperature=18.2),
            reading(f"{DAY}T14:00:00+09:00", temperature=31.5),
            reading("2026-10-06T00:30:00+09:00", temperature=40.0),  # 翌日の分は入れない
        ]})
        with SessionLocal() as db:
            db.add(WeatherForecast(plot_id=farm.plot_ids[0], date=datetime.fromisoformat(DAY).date(), weather_code=0,
                                   fetched_at=datetime.now(timezone.utc)))
            db.commit()
        return farm, owner

    def test_day_is_built_from_records(self) -> None:
        farm, owner = self.setup_day()
        self.client.put(f"/api/v1/journals/{DAY}/note", headers=owner, json={"note": "午後から風が強い"})
        days = self.client.get("/api/v1/journals", headers=owner, params={"from": "2026-10-04", "to": DAY}).json()
        empty, day = days
        self.assertEqual((empty["worker_count"], empty["works"]), (0, []))
        self.assertEqual(day["weather"], "晴れ")
        self.assertEqual((day["temp_max"], day["temp_min"]), (31.5, 18.2))
        self.assertEqual(day["worker_count"], 2)
        self.assertEqual(day["work_types"], ["収穫", "草刈り"])
        self.assertEqual(day["note"], "午後から風が強い")
        self.assertEqual([w["start"] for w in day["works"]], ["08:00", "08:30", "13:00"])

    def test_empty_note_removes_it(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        self.client.put(f"/api/v1/journals/{DAY}/note", headers=owner, json={"note": "メモ"})
        r = self.client.put(f"/api/v1/journals/{DAY}/note", headers=owner, json={"note": "  "})
        self.assertIsNone(r.json()["note"])

    def test_workers_cannot_see_journals(self) -> None:
        farm = make_farm()
        r = self.client.get("/api/v1/journals", headers=login(self.client, farm, farm.worker_id),
                            params={"from": DAY, "to": DAY})
        self.assertEqual(r.status_code, 403)

    def test_rejects_bad_range(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        self.assertEqual(self.client.get("/api/v1/journals", headers=owner,
                                         params={"from": DAY, "to": "2026-10-01"}).status_code, 422)
        self.assertEqual(self.client.get("/api/v1/journals", headers=owner,
                                         params={"from": "2025-01-01", "to": DAY}).status_code, 422)

    def test_pdf(self) -> None:
        farm, owner = self.setup_day()
        r = self.client.get("/api/v1/journals/export.pdf", headers=owner, params={"from": "2026-10-01", "to": "2026-10-31"})
        self.assertEqual(r.headers["content-type"], "application/pdf")
        self.assertTrue(r.content.startswith(b"%PDF"))

    def test_export_returns_url(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        params = {"from": DAY, "to": DAY}
        self.assertEqual(self.client.post("/api/v1/journals/export", headers=owner, params=params).status_code, 503)
        with mock.patch.object(storage, "presigned_url", return_value="https://example.com/journal.pdf"):
            r = self.client.post("/api/v1/journals/export", headers=owner, params=params)
        self.assertEqual(r.json()["url"], "https://example.com/journal.pdf")


if __name__ == "__main__":
    unittest.main()
