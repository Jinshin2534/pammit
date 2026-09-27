"""管理コマンド。

    python -m app.cli create-device --name 3番ハウス-01 --plot-id 3
    python -m app.cli create-device --name 5番畑-lora --plot-id 5 --dev-eui 70B3D57ED0012345
    python -m app.cli list-devices

Wi-Fi 直結用のデバイスキーは作成時に一度だけ表示する（DB にはハッシュしか残らない）。
"""
import argparse

from sqlalchemy import select

from app.db import SessionLocal, init_db
from app.models import SensorDevice
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


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("create-device", help="センサー端末を登録し、デバイスキーを発行する")
    create.add_argument("--name", required=True)
    create.add_argument("--plot-id", type=int)
    create.add_argument("--dev-eui", help="LoRaWAN で使う場合の DevEUI（16桁の16進数）")
    sub.add_parser("list-devices", help="登録済みの端末を一覧する")
    args = parser.parse_args()

    init_db()
    if args.command == "create-device":
        create_device(args.name, args.plot_id, args.dev_eui)
    else:
        list_devices()


if __name__ == "__main__":
    main()
