"""テスト用の農園・作業者を作る。"""
from dataclasses import dataclass
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.security import hash_pin
from app.db import SessionLocal
from app.models import Farm, JudgmentParams, Plot, User

PIN = "1234"


@dataclass
class TestFarm:
    code: str
    farm_id: int
    plot_ids: list[int]
    owner_id: int
    worker_id: int


def make_farm(with_params: bool = True) -> TestFarm:
    code = f"test-{uuid4().hex[:8]}"
    with SessionLocal() as db:
        farm = Farm(code=code, name="テスト農園")
        db.add(farm)
        db.flush()
        plots = [Plot(farm_id=farm.id, name=n) for n in ("すだち農園", "三番ハウス")]
        owner = User(farm_id=farm.id, name="師匠", role="owner", pin_hash=hash_pin(PIN))
        worker = User(farm_id=farm.id, name="作業者", role="worker", pin_hash=hash_pin(PIN))
        db.add_all([*plots, owner, worker])
        if with_params:
            for work_type in ("摘果・摘葉", "収穫"):
                db.add(JudgmentParams(farm_id=farm.id, work_type=work_type, model_version_expected="v-test",
                                      confidence_high=0.8, confidence_low=0.5, params={"dense_neighbor_count": 4}))
        db.commit()
        return TestFarm(code, farm.id, [p.id for p in plots], owner.id, worker.id)


def login(client: TestClient, farm: TestFarm, user_id: int, pin: str = PIN) -> dict[str, str]:
    r = client.post("/api/v1/auth/login", json={"farm_code": farm.code, "user_id": user_id, "pin": pin})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
