import tempfile
import unittest
from unittest import mock

from sqlalchemy import create_engine, inspect, text

from app import db


class AddedColumnTests(unittest.TestCase):
    def test_adds_missing_columns_once(self) -> None:
        engine = create_engine(f"sqlite:///{tempfile.mkdtemp()}/old.db")
        with engine.begin() as conn:  # 列を足す前のテーブル
            conn.execute(text("CREATE TABLE work_sessions (id INTEGER PRIMARY KEY)"))
            conn.execute(text("CREATE TABLE voice_notes (id INTEGER PRIMARY KEY)"))
            conn.execute(text("INSERT INTO work_sessions (id) VALUES (1)"))
        with mock.patch.object(db, "engine", engine):
            db.ensure_added_columns()
            db.ensure_added_columns()  # 2回目は何もしない
        columns = {t: {c["name"] for c in inspect(engine).get_columns(t)} for t in ("work_sessions", "voice_notes")}
        self.assertIn("uses_hat", columns["work_sessions"])
        self.assertIn("recorded_at", columns["voice_notes"])
        with engine.connect() as conn:  # 既存の作業は帽子ありとして扱う
            self.assertEqual(conn.execute(text("SELECT uses_hat FROM work_sessions")).scalar(), 1)


if __name__ == "__main__":
    unittest.main()
