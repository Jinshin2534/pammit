"""PIN とログイン用トークン。"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings

_SCRYPT = {"n": 2**14, "r": 8, "p": 1}


def generate_pin() -> str:
    return f"{secrets.randbelow(10000):04d}"


def hash_pin(pin: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(pin.encode(), salt=salt, **_SCRYPT)
    return f"{salt.hex()}${digest.hex()}"


def verify_pin(pin: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split("$", 1)
    digest = hashlib.scrypt(pin.encode(), salt=bytes.fromhex(salt_hex), **_SCRYPT)
    return hmac.compare_digest(digest.hex(), digest_hex)


def create_token(user_id: int, farm_id: int, role: str) -> tuple[str, int]:
    """トークンと有効期間（秒）を返す。"""
    expires_in = settings.jwt_expires_days * 24 * 3600
    payload = {
        "sub": str(user_id),
        "farm_id": farm_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256"), expires_in


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
