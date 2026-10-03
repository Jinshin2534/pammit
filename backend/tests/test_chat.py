import json
import unittest
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.main import app
from app.models import KnowledgeDocument, User
from app.services import chat, knowledge, voice_notes
from tests.helpers import login, make_farm

NOTE = ("摘果は7月から8月にかけて行う。\n\n"
        "実が密集しているところは、小さい実や傷のある実から摘む。葉の陰になっている実も摘果の候補になる。")


def add_knowledge(farm_id=None, body=NOTE):
    with SessionLocal() as db:
        knowledge.add_document(db, "摘果のこつ", body, "interview", farm_id=farm_id)


class KnowledgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()

    def test_split_keeps_paragraphs_and_cuts_long_ones(self) -> None:
        chunks = knowledge.split_chunks("一段落目。\n\n" + "長い文です。" * 100)
        self.assertEqual(chunks[0], "一段落目。")
        self.assertTrue(all(len(c) <= knowledge.CHUNK_CHARS for c in chunks))

    def test_search_finds_related_paragraph_and_respects_farm(self) -> None:
        farm, other = make_farm(), make_farm()
        add_knowledge(farm_id=other.farm_id, body="ほかの農園だけの秘密の密集した実の摘み方。")
        add_knowledge(farm_id=farm.farm_id)
        with SessionLocal() as db:
            hits = knowledge.search(db, farm.farm_id, "密集している実はどれから摘む？")
        self.assertIn("小さい実", hits[0]["content"])
        self.assertFalse(any("秘密" in h["content"] for h in hits))


class FakeOpenAI:
    """1回目は search_knowledge を呼び、2回目に答える。"""

    def __init__(self):
        self.calls = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if len(self.calls) == 1:
            call = SimpleNamespace(id="call_1", function=SimpleNamespace(
                name="search_knowledge", arguments=json.dumps({"query": "密集 摘果"})))
            msg = SimpleNamespace(content=None, tool_calls=[call])
        else:
            msg = SimpleNamespace(content="小さい実から摘みましょう。", tool_calls=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)])


class ChatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def test_without_key_returns_503_and_saves_nothing(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        thread = self.client.post("/api/v1/chat/threads", headers=headers, json={}).json()
        r = self.client.post(f"/api/v1/chat/threads/{thread['id']}/messages", headers=headers,
                             json={"content": "密集している実はどれから摘む？"})
        self.assertEqual((r.status_code, r.json()["error"]["code"]), (503, "ai_unavailable"))
        messages = self.client.get(f"/api/v1/chat/threads/{thread['id']}/messages", headers=headers).json()
        self.assertEqual(messages, [])

    def test_function_calling_loop(self) -> None:
        farm = make_farm()
        add_knowledge(farm_id=farm.farm_id)
        headers = login(self.client, farm, farm.worker_id)
        thread = self.client.post("/api/v1/chat/threads", headers=headers, json={}).json()
        fake = FakeOpenAI()
        with mock.patch.object(chat.llm, "available", return_value=True), \
                mock.patch.object(chat.llm, "client", return_value=fake):
            r = self.client.post(f"/api/v1/chat/threads/{thread['id']}/messages", headers=headers,
                                 json={"content": "混んでいるときは？"})
        self.assertEqual(r.json()["content"], "小さい実から摘みましょう。")
        threads = self.client.get("/api/v1/chat/threads", headers=headers).json()
        self.assertEqual(threads[0]["title"], "混んでいるときは？")
        tool_result = fake.calls[1]["messages"][-1]
        self.assertEqual(tool_result["role"], "tool")
        self.assertIn("小さい実", tool_result["content"])

    def test_threads_are_private(self) -> None:
        farm = make_farm()
        worker, owner = login(self.client, farm, farm.worker_id), login(self.client, farm, farm.owner_id)
        thread = self.client.post("/api/v1/chat/threads", headers=worker, json={}).json()
        r = self.client.get(f"/api/v1/chat/threads/{thread['id']}/messages", headers=owner)
        self.assertEqual(r.status_code, 404)

    def test_session_thread_filter(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        sid = self.client.post("/api/v1/work-sessions", headers=headers, json={
            "client_event_id": str(uuid4()), "plot_id": farm.plot_ids[0], "work_type": "肥料",
            "started_at": "2026-10-04T08:00:00+09:00"}).json()["id"]
        self.client.post("/api/v1/chat/threads", headers=headers, json={})
        in_work = self.client.post("/api/v1/chat/threads", headers=headers, json={"session_id": sid}).json()
        r = self.client.get("/api/v1/chat/threads", headers=headers, params={"session_id": sid}).json()
        self.assertEqual([t["id"] for t in r], [in_work["id"]])

    def test_tools_only_see_own_farm(self) -> None:
        farm, other = make_farm(), make_farm()
        with SessionLocal() as db:
            user = db.get(User, farm.worker_id)
            plots = chat.run_tool(db, user, "get_field_status", {})
            self.assertEqual({p["plot_id"] for p in plots}, set(farm.plot_ids))
            self.assertEqual(chat.run_tool(db, user, "get_work_history", {"days": 30}), [])

    def test_owner_registers_knowledge(self) -> None:
        farm = make_farm()
        owner = login(self.client, farm, farm.owner_id)
        r = self.client.post("/api/v1/knowledge", headers=owner, json={"title": "現地調査", "body": NOTE})
        self.assertEqual(r.status_code, 201)
        worker = login(self.client, farm, farm.worker_id)
        self.assertEqual(self.client.post("/api/v1/knowledge", headers=worker,
                                          json={"title": "x", "body": "y"}).status_code, 403)


class VoiceNoteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)

    def start(self, farm, headers):
        return self.client.post("/api/v1/work-sessions", headers=headers, json={
            "client_event_id": str(uuid4()), "plot_id": farm.plot_ids[1], "work_type": "摘果・摘葉",
            "started_at": "2026-10-04T08:00:00+09:00"}).json()["id"]

    def upload(self, headers, sid, event_id, content_type="audio/mp4"):
        return self.client.post(f"/api/v1/work-sessions/{sid}/voice-notes", headers=headers,
                                data={"client_event_id": event_id},
                                files={"file": ("note.m4a", b"fake-audio", content_type)})

    def test_upload_then_transcribe_later_adds_knowledge(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        sid = self.start(farm, headers)
        event_id = str(uuid4())
        first = self.upload(headers, sid, event_id)
        self.assertEqual(first.status_code, 201)
        self.assertIsNone(first.json()["transcript"])  # キーがないので、まだ文字起こしされない
        again = self.upload(headers, sid, event_id)
        self.assertEqual((again.status_code, again.json()["id"]), (200, first.json()["id"]))

        with mock.patch.object(voice_notes, "transcribe", return_value="奥の枝の実は日が当たりにくい。"), \
                SessionLocal() as db:
            self.assertGreaterEqual(voice_notes.transcribe_pending(db), 1)
            doc = db.query(KnowledgeDocument).filter_by(farm_id=farm.farm_id, source_type="voice_note").one()
            self.assertIn("三番ハウス", doc.title)
        notes = self.client.get(f"/api/v1/work-sessions/{sid}/voice-notes", headers=headers).json()
        self.assertEqual(notes[0]["transcript"], "奥の枝の実は日が当たりにくい。")

    def test_rejects_non_audio(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        r = self.upload(headers, self.start(farm, headers), str(uuid4()), content_type="image/png")
        self.assertEqual(r.status_code, 415)


if __name__ == "__main__":
    unittest.main()
