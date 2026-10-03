import unittest
from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


class ApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_create_session_rejects_unknown_plot(self) -> None:
        response = self.client.post(
            "/api/v1/work-sessions",
            json={
                "client_event_id": str(uuid4()),
                "plot_id": 999,
                "work_type": "摘果",
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
