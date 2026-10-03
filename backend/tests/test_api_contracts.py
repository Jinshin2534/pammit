import unittest
from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app
from tests.helpers import login, make_farm


class ApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def test_create_session_rejects_unknown_plot(self) -> None:
        farm = make_farm()
        response = self.client.post(
            "/api/v1/work-sessions",
            headers=login(self.client, farm, farm.worker_id),
            json={
                "client_event_id": str(uuid4()),
                "plot_id": 999,
                "work_type": "摘果・摘葉",
                "started_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        self.assertEqual(response.status_code, 404)

    def test_sensor_reading_rejects_battery_out_of_range(self) -> None:
        response = self.client.post(
            "/api/v1/ingest/sensor",
            headers={"X-Device-Key": "stub-device-key"},
            json={
                "readings": [
                    {"measured_at": datetime.now(timezone.utc).isoformat(), "battery_pct": 150}
                ]
            },
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
