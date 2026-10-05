"""管理コマンド。

    python -m app.cli create-device --name 3番ハウス-01 --plot-id 3
    python -m app.cli create-device --name 5番畑-lora --plot-id 5 --dev-eui 70B3D57ED0012345
    python -m app.cli list-devices
    python -m app.cli seed
    python -m app.cli reset-pin --user-id 2

Wi-Fi 直結用のデバイスキーと PIN は、作成時に一度だけ表示する（DB にはハッシュしか残らない）。
"""
import argparse

from sqlalchemy import select

from app.db import SessionLocal, init_db
from app.core.security import generate_pin, hash_pin
from app.models import Farm, JudgmentParams, Plot, SensorDevice, User
from app.services.sensors import generate_device_key, hash_device_key


def create_device(name: str, plot_id: int | None, dev_eui: str | None) -> None:
    key = generate_device_key()
    with SessionLocal() as db:
        device = SensorDevice(
            name=name,
            plot_id=plot_id,
            key_hash=hash_device_key(key),
            dev_eui=dev_eui.upper() if dev_eui else None,
        )
        db.add(device)
        db.commit()
        print(f"id={device.id} name={device.name} plot_id={device.plot_id} dev_eui={device.dev_eui}")
        print(f"X-Device-Key: {key}")
        print("※ このキーは再表示できません。ハード担当に安全な方法で渡してください。")


def list_devices() -> None:
    with SessionLocal() as db:
        for d in db.scalars(select(SensorDevice).order_by(SensorDevice.id)):
            print(f"id={d.id} name={d.name} plot_id={d.plot_id} dev_eui={d.dev_eui} last_seen_at={d.last_seen_at}")


SEED_FARM_CODE = "kamiyama-01"
SEED_PLOTS = [
    {"name": "すだち農園", "municipality": "神山町", "cultivation_type": "open_field"},
    {"name": "ましろん農園", "municipality": "神山町", "cultivation_type": "open_field"},
    {"name": "三番ハウス", "municipality": "神山町", "cultivation_type": "house"},
]
# worker_type は画面で選べる値（app/schemas/auth.py の WorkerType）にそろえる。owner は持たない
SEED_USERS = [
    {"name": "近未来 すだち子", "role": "owner"},
    {"name": "長谷川 真白", "role": "worker", "worker_type": "後継者さん"},
    {"name": "野﨑 仁心", "role": "worker", "worker_type": "アルバイト"},
    {"name": "永田 雄也", "role": "worker", "worker_type": "アルバイト"},
    {"name": "大久保 杏南", "role": "worker", "worker_type": "アルバイト"},
]


def seed() -> None:
    """デモ用の農園・作業者・判定設定を入れる。すでに入っていれば何もしない。"""
    with SessionLocal() as db:
        if db.scalar(select(Farm).where(Farm.code == SEED_FARM_CODE)):
            print(f"農園コード {SEED_FARM_CODE} はすでにあります。何もしません。")
            return
        farm = Farm(code=SEED_FARM_CODE, name="神山すだち園")
        db.add(farm)
        db.flush()
        for p in SEED_PLOTS:
            db.add(Plot(farm_id=farm.id, **p))
        for work_type in ("摘果・摘葉", "収穫"):
            # 閾値は仮の値。AI の評価が済んだら DB の値を書き換える
            db.add(JudgmentParams(farm_id=farm.id, work_type=work_type, model_version_expected="sudachi-v0.3",
                                  confidence_high=0.8, confidence_low=0.5, params={}))
        pins = []
        for u in SEED_USERS:
            pin = generate_pin()
            user = User(farm_id=farm.id, pin_hash=hash_pin(pin), **u)
            db.add(user)
            pins.append((user, pin))
        db.commit()
        print(f"農園コード: {farm.code}")
        for user, pin in pins:
            print(f"id={user.id} {user.name}（{user.role}）PIN: {pin}")
        print("※ PIN は再表示できません。忘れたら reset-pin で発行し直してください。")


def reset_pin(user_id: int) -> None:
    pin = generate_pin()
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if user is None:
            raise SystemExit(f"id={user_id} の作業者はいません")
        user.pin_hash = hash_pin(pin)
        user.failed_pin_count = 0
        user.locked_until = None
        db.commit()
        print(f"id={user.id} {user.name} PIN: {pin}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("create-device", help="センサー端末を登録し、デバイスキーを発行する")
    create.add_argument("--name", required=True)
    create.add_argument("--plot-id", type=int)
    create.add_argument("--dev-eui", help="LoRaWAN で使う場合の DevEUI（16桁の16進数）")
    sub.add_parser("list-devices", help="登録済みの端末を一覧する")
    sub.add_parser("seed", help="デモ用の農園・作業者・判定設定を入れる")
    reset = sub.add_parser("reset-pin", help="作業者の PIN を発行し直す")
    reset.add_argument("--user-id", type=int, required=True)
    args = parser.parse_args()

    init_db()
    if args.command == "create-device":
        create_device(args.name, args.plot_id, args.dev_eui)
    elif args.command == "seed":
        seed()
    elif args.command == "reset-pin":
        reset_pin(args.user_id)
    else:
        list_devices()


if __name__ == "__main__":
    main()
