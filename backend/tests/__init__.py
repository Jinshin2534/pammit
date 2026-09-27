import os
import tempfile

# テストは一時ファイルの SQLite で動かす。app を import する前に設定する必要がある
os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.mkdtemp()}/test.db")
os.environ.setdefault("TTN_WEBHOOK_SECRET", "test-webhook-secret")
