import unittest
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.main import app
from app.models import User
from tests.helpers import login, make_farm


class AuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def test_login_candidates_can_be_filtered_by_role(self) -> None:
        farm = make_farm()
        r = self.client.get("/api/v1/auth/users", params={"farm_code": farm.code, "role": "worker"})
        self.assertEqual([u["id"] for u in r.json()], [farm.worker_id])

    def test_login_and_me(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        me = self.client.get("/api/v1/auth/me", headers=headers).json()
        self.assertEqual(me["id"], farm.worker_id)
        self.assertEqual(me["farm_name"], "テスト農園")

    def test_wrong_pin_returns_401_in_common_error_shape(self) -> None:
        farm = make_farm()
        r = self.client.post("/api/v1/auth/login", json={"farm_code": farm.code, "user_id": farm.worker_id, "pin": "0000"})
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.json()["error"]["code"], "invalid_pin")

    def test_five_failures_lock_the_pin(self) -> None:
        farm = make_farm()
        body = {"farm_code": farm.code, "user_id": farm.worker_id, "pin": "0000"}
        for _ in range(5):
            self.client.post("/api/v1/auth/login", json=body)
        # ロック中は正しい PIN でも入れない
        r = self.client.post("/api/v1/auth/login", json={**body, "pin": "1234"})
        self.assertEqual(r.status_code, 423)
        self.assertIn("locked_until", r.json()["error"]["detail"])

    def test_lock_expires(self) -> None:
        farm = make_farm()
        with SessionLocal() as db:
            db.get(User, farm.worker_id).locked_until = datetime.now(timezone.utc) - timedelta(minutes=1)
            db.commit()
        login(self.client, farm, farm.worker_id)

    def test_requests_without_token_are_rejected(self) -> None:
        r = self.client.get("/api/v1/plots")
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.json()["error"]["code"], "not_logged_in")

    def test_owner_registers_worker_and_pin_works(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        r = self.client.post("/api/v1/users", headers=owner,
                             json={"name": "新人", "gender": "女", "worker_type": "アルバイト", "weekly_max_hours": 20})
        self.assertEqual(r.status_code, 201)
        created = r.json()
        self.assertRegex(created["pin"], r"^\d{4}$")
        login(self.client, farm, created["user"]["id"], created["pin"])

    def test_worker_cannot_register_users(self) -> None:
        farm = make_farm()
        worker = login(self.client, farm, farm.worker_id)
        r = self.client.post("/api/v1/users", headers=worker, json={"name": "x"})
        self.assertEqual(r.status_code, 403)

    def test_owner_cannot_demote_self(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        r = self.client.patch(f"/api/v1/users/{farm.owner_id}", headers=owner, json={"role": "worker"})
        self.assertEqual(r.status_code, 400)

    def test_deactivated_user_cannot_login(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        self.client.patch(f"/api/v1/users/{farm.worker_id}", headers=owner, json={"active": False})
        r = self.client.post("/api/v1/auth/login", json={"farm_code": farm.code, "user_id": farm.worker_id, "pin": "1234"})
        self.assertEqual(r.status_code, 401)

    def test_update_me(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        r = self.client.patch("/api/v1/users/me", headers=headers, json={"name": "巣立 好喜子", "icon": "sudachi-1"})
        self.assertEqual((r.json()["name"], r.json()["icon"]), ("巣立 好喜子", "sudachi-1"))

    def test_users_of_other_farms_are_invisible(self) -> None:
        farm, other = make_farm(), make_farm()
        owner = login(self.client, farm, farm.owner_id)
        r = self.client.post(f"/api/v1/users/{other.worker_id}/reset-pin", headers=owner)
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main()
