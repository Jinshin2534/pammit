"""OpenAPI スキーマを openapi.json に書き出す。

アプリ担当が型を自動生成するときに使う。
    python scripts_export_openapi.py
"""
import json
from pathlib import Path

from app.main import app

out = Path("openapi.json")
out.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size:,} bytes)")
