import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app
from tests.helpers import login, make_farm

T0 = "2026-10-04T08:00:00+09:00"
T1 = "2026-10-04T11:30:00+09:00"


class PlotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def test_lists_only_own_farm_plots(self) -> None:
        farm, _ = make_farm(), make_farm()
        r = self.client.get("/api/v1/plots", headers=login(self.client, farm, farm.worker_id))
        self.assertEqual([p["id"] for p in r.json()], farm.plot_ids)

    def test_other_farm_plot_is_not_found(self) -> None:
        farm, other = make_farm(), make_farm()
        r = self.client.get(f"/api/v1/plots/{other.plot_ids[0]}", headers=login(self.client, farm, farm.worker_id))
        self.assertEqual(r.status_code, 404)

    def test_owner_creates_and_updates_plot(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        created = self.client.post("/api/v1/plots", headers=owner, json={"name": "豊作農園", "municipality": "神山町"}).json()
        self.assertEqual((created["cultivation_type"], created["soil_check_pct"]), ("open_field", 28.0))
        r = self.client.patch(f"/api/v1/plots/{created['id']}", headers=owner,
                              json={"cultivation_type": "house", "soil_dry_raw": 3000, "soil_wet_raw": 1200})
        self.assertEqual(r.json()["cultivation_type"], "house")

    def test_worker_cannot_create_plot(self) -> None:
        farm = make_farm()
        r = self.client.post("/api/v1/plots", headers=login(self.client, farm, farm.worker_id), json={"name": "x"})
        self.assertEqual(r.status_code, 403)


class SessionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def start(self, headers, plot_id, work_type="摘果・摘葉", event_id=None, **extra):
        return self.client.post("/api/v1/work-sessions", headers=headers, json={
            "client_event_id": event_id or str(uuid4()), "plot_id": plot_id, "work_type": work_type,
            "started_at": T0, **extra})

    def test_hat_work_returns_judgment_config(self) -> None:
        farm = make_farm()
        r = self.start(login(self.client, farm, farm.worker_id), farm.plot_ids[0])
        self.assertEqual(r.status_code, 201)
        config = r.json()["config"]
        self.assertEqual(config["confidence_thresholds"], {"high": 0.8, "low": 0.5})
        self.assertEqual(config["params"], {"dense_neighbor_count": 4})

    def test_work_without_hat_has_no_config(self) -> None:
        farm = make_farm()
        r = self.start(login(self.client, farm, farm.worker_id), farm.plot_ids[0], work_type="肥料")
        self.assertIsNone(r.json()["config"])

    def test_resent_start_returns_same_session(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        event_id = str(uuid4())
        first = self.start(headers, farm.plot_ids[0], event_id=event_id)
        second = self.start(headers, farm.plot_ids[0], event_id=event_id)
        self.assertEqual((second.status_code, second.json()["id"]), (200, first.json()["id"]))

    def test_finish_creates_one_work_log(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        sid = self.start(headers, farm.plot_ids[1], work_type="収穫").json()["id"]
        for _ in range(2):  # 送り直しても作業ログは1件
            r = self.client.post(f"/api/v1/work-sessions/{sid}/finish", headers=headers, json={"ended_at": T1})
            self.assertEqual(r.status_code, 200)
        logs = self.client.get("/api/v1/work-logs", headers=headers).json()
        self.assertEqual(len(logs), 1)
        self.assertEqual((logs[0]["worked_on"], logs[0]["minutes"], logs[0]["plot_name"]), ("2026-10-04", 210, "三番ハウス"))

    def test_session_times_keep_timezone(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        sid = self.start(headers, farm.plot_ids[0]).json()["id"]
        started = self.client.get(f"/api/v1/work-sessions/{sid}", headers=headers).json()["started_at"]
        self.assertTrue(started.endswith(("Z", "+00:00")), started)

    def test_cannot_finish_before_start(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        sid = self.start(headers, farm.plot_ids[0]).json()["id"]
        r = self.client.post(f"/api/v1/work-sessions/{sid}/finish", headers=headers,
                             json={"ended_at": "2026-10-04T07:00:00+09:00"})
        self.assertEqual(r.status_code, 422)

    def test_cannot_finish_someone_elses_session(self) -> None:
        farm = make_farm()
        sid = self.start(login(self.client, farm, farm.worker_id), farm.plot_ids[0]).json()["id"]
        r = self.client.post(f"/api/v1/work-sessions/{sid}/finish", headers=login(self.client, farm, farm.owner_id),
                             json={"ended_at": T1})
        self.assertEqual(r.status_code, 403)

    def test_active_filter(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        done = self.start(headers, farm.plot_ids[0]).json()["id"]
        running = self.start(headers, farm.plot_ids[0]).json()["id"]
        self.client.post(f"/api/v1/work-sessions/{done}/finish", headers=headers, json={"ended_at": T1})
        r = self.client.get("/api/v1/work-sessions", headers=headers, params={"active": "true"})
        self.assertEqual([s["id"] for s in r.json()], [running])


class ScheduleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def body(self, farm, **overrides):
        return {"client_event_id": str(uuid4()), "plot_id": farm.plot_ids[0], "date": "2026-10-10",
                "start_time": "08:00", "end_time": "11:30", "work_types": ["収穫", "防除"],
                "assignee_ids": [farm.worker_id, farm.owner_id], "note": "", **overrides}

    def test_create_list_update_delete(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        created = self.client.post("/api/v1/schedules", headers=headers, json=self.body(farm)).json()
        self.assertEqual([a["id"] for a in created["assignees"]], sorted([farm.worker_id, farm.owner_id]))

        listed = self.client.get("/api/v1/schedules", headers=headers, params={"from": "2026-10-10", "to": "2026-10-10"}).json()
        self.assertEqual([s["id"] for s in listed], [created["id"]])

        r = self.client.patch(f"/api/v1/schedules/{created['id']}", headers=headers,
                              json={"work_types": ["灌水"], "assignee_ids": [farm.worker_id]})
        self.assertEqual((r.json()["work_types"], len(r.json()["assignees"])), (["灌水"], 1))

        self.assertEqual(self.client.delete(f"/api/v1/schedules/{created['id']}", headers=headers).status_code, 204)
        self.assertEqual(self.client.get("/api/v1/schedules", headers=headers,
                                         params={"from": "2026-10-10", "to": "2026-10-10"}).json(), [])

    def test_rejects_end_before_start(self) -> None:
        farm = make_farm()
        r = self.client.post("/api/v1/schedules", headers=login(self.client, farm, farm.worker_id),
                             json=self.body(farm, start_time="12:00", end_time="09:00"))
        self.assertEqual(r.status_code, 422)

    def test_rejects_assignee_from_other_farm(self) -> None:
        farm, other = make_farm(), make_farm()
        r = self.client.post("/api/v1/schedules", headers=login(self.client, farm, farm.worker_id),
                             json=self.body(farm, assignee_ids=[other.worker_id]))
        self.assertEqual(r.status_code, 404)

    def test_session_can_start_from_schedule(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        schedule_id = self.client.post("/api/v1/schedules", headers=headers, json=self.body(farm)).json()["id"]
        r = self.client.post("/api/v1/work-sessions", headers=headers, json={
            "client_event_id": str(uuid4()), "plot_id": farm.plot_ids[0], "work_type": "収穫",
            "schedule_id": schedule_id, "started_at": T0})
        self.assertEqual(r.json()["schedule_id"], schedule_id)


if __name__ == "__main__":
    unittest.main()
