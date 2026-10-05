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
        codes = [self.client.post("/api/v1/auth/login", json=body).status_code for _ in range(5)]
        # ロックがかかった5回目から 423 を返す
        self.assertEqual(codes, [401, 401, 401, 401, 423])
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

    def test_users_list_includes_owner_and_deactivated(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        self.client.patch(f"/api/v1/users/{farm.worker_id}", headers=owner, json={"active": False})
        users = {u["id"]: u for u in self.client.get("/api/v1/users", headers=owner).json()}
        self.assertEqual((users[farm.owner_id]["active"], users[farm.worker_id]["active"]), (True, False))
        # 停止中の人はログイン画面に出ない
        r = self.client.get("/api/v1/auth/users", params={"farm_code": farm.code})
        self.assertEqual([u["id"] for u in r.json()], [farm.owner_id])

    def test_assignee_candidates_are_active_users_of_own_farm(self) -> None:
        farm, _ = make_farm(), make_farm()
        owner = login(self.client, farm, farm.owner_id)
        stopped = self.client.post("/api/v1/users", headers=owner, json={"name": "停止する人"}).json()["user"]["id"]
        self.client.patch(f"/api/v1/users/{stopped}", headers=owner, json={"active": False})
        r = self.client.get("/api/v1/assignee-candidates", headers=login(self.client, farm, farm.worker_id))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [{"id": farm.owner_id, "name": "師匠", "role": "owner"},
                                    {"id": farm.worker_id, "name": "作業者", "role": "worker"}])

    def test_assignee_candidates_need_login(self) -> None:
        self.assertEqual(self.client.get("/api/v1/assignee-candidates").status_code, 401)

    def test_rejects_values_not_on_screen(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        for body in ({"name": "x", "gender": "女性"}, {"name": "x", "worker_type": "農家"},
                     {"name": "x", "worker_type": "後継者"}):
            self.assertEqual(self.client.post("/api/v1/users", headers=owner, json=body).status_code, 422, body)
        r = self.client.patch("/api/v1/users/me", headers=owner, json={"icon": "sudachi-1"})
        self.assertEqual(r.status_code, 422)
        r = self.client.post("/api/v1/users", headers=owner,
                             json={"name": "後継者", "gender": "回答しない", "worker_type": "後継者さん"})
        self.assertEqual((r.json()["user"]["gender"], r.json()["user"]["worker_type"]), ("回答しない", "後継者さん"))

    def test_update_me(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        r = self.client.patch("/api/v1/users/me", headers=headers, json={"name": "巣立 好喜子", "icon": "hat"})
        self.assertEqual((r.json()["name"], r.json()["icon"]), ("巣立 好喜子", "hat"))

    def test_users_of_other_farms_are_invisible(self) -> None:
        farm, other = make_farm(), make_farm()
        owner = login(self.client, farm, farm.owner_id)
        r = self.client.post(f"/api/v1/users/{other.worker_id}/reset-pin", headers=owner)
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main()
