"""OpenAI の呼び出し。キーがない・失敗したときは None を返し、呼び出し側が代わりの文を使う。"""
import json
import logging

from app.core.config import settings

log = logging.getLogger(__name__)


def available() -> bool:
    return bool(settings.openai_api_key)


def client():
    from openai import OpenAI

    return OpenAI(api_key=settings.openai_api_key, timeout=30)


def complete_json(system: str, user: str) -> dict | None:
    if not available():
        return None
    try:
        res = client().chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
        )
        return json.loads(res.choices[0].message.content)
    except Exception:  # noqa: BLE001
        log.exception("OpenAI の呼び出しに失敗しました")
        return None
