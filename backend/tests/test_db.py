import tempfile
import unittest

from sqlalchemy import create_engine, inspect, text

from app.db import ADDED_COLUMNS, add_missing_columns


class AddMissingColumnsTests(unittest.TestCase):
    def test_adds_listed_columns_to_existing_tables_once(self) -> None:
        engine = create_engine(f"sqlite:///{tempfile.mkdtemp()}/old.db")
        self.addCleanup(engine.dispose)
        # 列を足す前の古い plots テーブル
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE plots (id INTEGER PRIMARY KEY, name VARCHAR(100))"))
            conn.execute(text("INSERT INTO plots (name) VALUES ('すだち農園')"))

        add_missing_columns(engine)
        add_missing_columns(engine)  # 2回目は何もしない

        columns = {c["name"] for c in inspect(engine).get_columns("plots")}
        self.assertIn("active", columns)
        with engine.connect() as conn:
            self.assertEqual(conn.execute(text("SELECT active FROM plots")).scalar(), 1)

    def test_skips_tables_that_do_not_exist_yet(self) -> None:
        engine = create_engine(f"sqlite:///{tempfile.mkdtemp()}/empty.db")
        self.addCleanup(engine.dispose)
        add_missing_columns(engine)
        self.assertEqual(inspect(engine).get_table_names(), [])

    def test_listed_columns_exist_in_models(self) -> None:
        from app.db import Base
        from app import models  # noqa: F401

        for table, column, _ in ADDED_COLUMNS:
            self.assertIn(column, Base.metadata.tables[table].columns, f"{table}.{column}")


if __name__ == "__main__":
    unittest.main()
