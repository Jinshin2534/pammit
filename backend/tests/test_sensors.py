import base64
import struct
import unittest

from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.main import app
from app.models import SensorDevice
from app.services.sensors import PayloadError, decode_lorawan_payload, generate_device_key, hash_device_key
from tests.helpers import login, make_farm

SECRET = "test-webhook-secret"


def register_device(plot_id: int, dev_eui: str | None = None) -> str:
    key = generate_device_key()
    with SessionLocal() as db:
        db.add(SensorDevice(name="test", plot_id=plot_id, key_hash=hash_device_key(key), dev_eui=dev_eui))
        db.commit()
    return key


def reading(measured_at: str, **overrides) -> dict:
    return {
        "measured_at": measured_at,
        "temperature": 31.2,
        "humidity": 68.4,
        "pressure": 1008.2,
        "soil_moisture_raw": 512,
        "battery_pct": 87,
        **overrides,
    }


def uplink(dev_eui: str, payload: bytes, received_at: str = "2026-10-01T00:00:03.123456789Z") -> dict:
    return {
        "end_device_ids": {"device_id": "sensor-01", "dev_eui": dev_eui},
        "received_at": received_at,
        "uplink_message": {"f_port": 1, "frm_payload": base64.b64encode(payload).decode()},
    }


class DecodeTests(unittest.TestCase):
    def test_decodes_documented_example(self) -> None:
        payload = bytes.fromhex("010C301AB808220200 57".replace(" ", ""))
        r = decode_lorawan_payload(payload)
        self.assertAlmostEqual(r.temperature, 31.2)
        self.assertAlmostEqual(r.humidity, 68.4)
        self.assertAlmostEqual(r.pressure, 1008.2)
        self.assertEqual(r.soil_moisture_raw, 512)
        self.assertEqual(r.battery_pct, 87)

    def test_negative_temperature(self) -> None:
        payload = struct.pack(">BhHHHB", 1, -350, 5000, 2000, 100, 50)
        self.assertAlmostEqual(decode_lorawan_payload(payload).temperature, -3.5)

    def test_missing_values_become_none(self) -> None:
        payload = struct.pack(">BhHHHB", 1, 0x7FFF, 0xFFFF, 0xFFFF, 0xFFFF, 0xFF)
        r = decode_lorawan_payload(payload)
        self.assertEqual(
            (r.temperature, r.humidity, r.pressure, r.soil_moisture_raw, r.battery_pct),
            (None, None, None, None, None),
        )

    def test_rejects_wrong_length_and_version(self) -> None:
        with self.assertRaises(PayloadError):
            decode_lorawan_payload(b"\x01\x02")
        with self.assertRaises(PayloadError):
            decode_lorawan_payload(struct.pack(">BhHHHB", 2, 0, 0, 0, 0, 0))


class IngestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def new_plot(self) -> int:
        """センサーを置く農地を作り、その農地の値を読めるようにログインしておく。"""
        farm = make_farm()
        self.headers = login(self.client, farm, farm.worker_id)
        return farm.plot_ids[0]

    def readings_of(self, plot_id: int, query: str = "") -> list[dict]:
        return self.client.get(f"/api/v1/plots/{plot_id}/sensor-readings{query}", headers=self.headers).json()

    def test_wifi_ingest_saves_and_ignores_resend(self) -> None:
        key = register_device(plot_id=(pid := self.new_plot()))
        body = {"readings": [reading("2026-10-01T09:00:00+09:00"), reading("2026-10-01T09:30:00+09:00")]}

        first = self.client.post("/api/v1/ingest/sensor", headers={"X-Device-Key": key}, json=body)
        again = self.client.post("/api/v1/ingest/sensor", headers={"X-Device-Key": key}, json=body)

        self.assertEqual(first.json(), {"accepted": 2, "duplicated": 0})
        self.assertEqual(again.json(), {"accepted": 0, "duplicated": 2})
        rows = self.readings_of(pid)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["source"], "wifi")
        self.assertEqual(rows[0]["soil_moisture_raw"], 512)

    def test_same_instant_in_other_timezone_is_duplicate(self) -> None:
        key = register_device(plot_id=(pid := self.new_plot()))
        headers = {"X-Device-Key": key}
        self.client.post("/api/v1/ingest/sensor", headers=headers,
                         json={"readings": [reading("2026-10-01T09:00:00+09:00")]})
        r = self.client.post("/api/v1/ingest/sensor", headers=headers,
                             json={"readings": [reading("2026-10-01T00:00:00Z")]})
        self.assertEqual(r.json(), {"accepted": 0, "duplicated": 1})

    def test_wifi_ingest_accepts_missing_battery(self) -> None:
        # USB 給電中は電池残量を測れないので、省略しても保存できる
        key = register_device(plot_id=(pid := self.new_plot()))
        row = reading("2026-10-01T09:00:00+09:00")
        del row["battery_pct"]
        r = self.client.post("/api/v1/ingest/sensor", headers={"X-Device-Key": key}, json={"readings": [row]})
        self.assertEqual(r.json(), {"accepted": 1, "duplicated": 0})
        saved = self.readings_of(pid)
        self.assertIsNone(saved[0]["battery_pct"])

    def test_wifi_ingest_rejects_unknown_key(self) -> None:
        r = self.client.post("/api/v1/ingest/sensor", headers={"X-Device-Key": "wrong"},
                             json={"readings": [reading("2026-10-01T09:00:00+09:00")]})
        self.assertEqual(r.status_code, 401)

    def test_wifi_ingest_rejects_naive_time(self) -> None:
        key = register_device(plot_id=(pid := self.new_plot()))
        r = self.client.post("/api/v1/ingest/sensor", headers={"X-Device-Key": key},
                             json={"readings": [reading("2026-10-01T09:00:00")]})
        self.assertEqual(r.status_code, 422)

    def test_lorawan_ingest_saves_decoded_values(self) -> None:
        register_device(plot_id=(pid := self.new_plot()), dev_eui="70B3D57ED0012345")
        payload = bytes.fromhex("010C301AB80822020057")
        body = uplink("70b3d57ed0012345", payload)

        first = self.client.post("/api/v1/ingest/lorawan", headers={"X-Webhook-Secret": SECRET}, json=body)
        again = self.client.post("/api/v1/ingest/lorawan", headers={"X-Webhook-Secret": SECRET}, json=body)

        self.assertEqual(first.json(), {"accepted": 1, "duplicated": 0})
        self.assertEqual(again.json(), {"accepted": 0, "duplicated": 1})
        rows = self.readings_of(pid)
        self.assertEqual(rows[0]["source"], "lorawan")
        self.assertAlmostEqual(rows[0]["temperature"], 31.2)
        self.assertAlmostEqual(rows[0]["pressure"], 1008.2)

    def test_lorawan_rejects_bad_secret_unknown_device_and_bad_payload(self) -> None:
        register_device(plot_id=(pid := self.new_plot()), dev_eui="70B3D57ED00ABCDE")
        good = bytes.fromhex("010C301AB80822020057")
        post = self.client.post
        self.assertEqual(
            post("/api/v1/ingest/lorawan", headers={"X-Webhook-Secret": "wrong"},
                 json=uplink("70B3D57ED00ABCDE", good)).status_code, 401)
        self.assertEqual(
            post("/api/v1/ingest/lorawan", headers={"X-Webhook-Secret": SECRET},
                 json=uplink("0000000000000000", good)).status_code, 404)
        self.assertEqual(
            post("/api/v1/ingest/lorawan", headers={"X-Webhook-Secret": SECRET},
                 json=uplink("70B3D57ED00ABCDE", b"\x01\x02")).status_code, 422)

    def test_readings_filtered_by_jst_date(self) -> None:
        key = register_device(plot_id=(pid := self.new_plot()))
        self.client.post("/api/v1/ingest/sensor", headers={"X-Device-Key": key}, json={"readings": [
            reading("2026-10-01T23:30:00+09:00"),
            reading("2026-10-02T00:30:00+09:00"),
        ]})
        rows = self.readings_of(pid, "?from=2026-10-02&to=2026-10-02")
        self.assertEqual(len(rows), 1)


if __name__ == "__main__":
    unittest.main()
