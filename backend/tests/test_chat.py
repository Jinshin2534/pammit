import json
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.main import app
from app.models import KnowledgeDocument, User
from app.services import chat, knowledge
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
    """1回目は search_knowledge を呼び、2回目に答える。answer_first なら1回目で答える。"""

    def __init__(self, answer_first: bool = False):
        self.answer_first = answer_first
        self.calls = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if len(self.calls) == 1 and not self.answer_first:
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

    def test_voice_mode_answers_in_one_call_with_prefetched_facts(self) -> None:
        farm = make_farm()
        add_knowledge(farm_id=farm.farm_id)
        headers = login(self.client, farm, farm.worker_id)
        sid = self.client.post("/api/v1/work-sessions", headers=headers, json={
            "client_event_id": str(uuid4()), "plot_id": farm.plot_ids[1], "work_type": "摘果・摘葉",
            "started_at": "2026-10-04T08:00:00+09:00"}).json()["id"]
        thread = self.client.post("/api/v1/chat/threads", headers=headers, json={"session_id": sid}).json()
        fake = FakeOpenAI(answer_first=True)
        with mock.patch.object(chat.llm, "available", return_value=True), \
                mock.patch.object(chat.llm, "client", return_value=fake):
            r = self.client.post(f"/api/v1/chat/threads/{thread['id']}/messages", headers=headers,
                                 json={"content": "混んでいる実はどれから摘む？", "mode": "voice"})
        self.assertEqual(r.json()["content"], "小さい実から摘みましょう。")
        self.assertEqual(len(fake.calls), 1)          # 問い合わせは1回だけ
        self.assertNotIn("tools", fake.calls[0])      # 関数は使わない
        system = fake.calls[0]["messages"][0]["content"]
        self.assertIn("音声で読み上げます", system)
        self.assertIn("三番ハウス", system)            # 今いる農園の状態
        self.assertIn("小さい実", system)              # 質問に近い知識

    def test_text_mode_keeps_tools(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        thread = self.client.post("/api/v1/chat/threads", headers=headers, json={}).json()
        fake = FakeOpenAI()
        with mock.patch.object(chat.llm, "available", return_value=True), \
                mock.patch.object(chat.llm, "client", return_value=fake):
            self.client.post(f"/api/v1/chat/threads/{thread['id']}/messages", headers=headers,
                             json={"content": "混んでいるときは？"})
        self.assertIn("tools", fake.calls[0])
        self.assertNotIn("音声で読み上げます", fake.calls[0]["messages"][0]["content"])

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

    def upload(self, headers, sid, event_id, content_type="audio/mp4", transcript="奥の枝の実は日が当たりにくい。", **extra):
        return self.client.post(f"/api/v1/work-sessions/{sid}/voice-notes", headers=headers,
                                data={"client_event_id": event_id, "transcript": transcript, **extra},
                                files={"file": ("note.m4a", b"fake-audio", content_type)})

    def test_keeps_recorded_at_from_device(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        sid = self.start(farm, headers)
        r = self.upload(headers, sid, str(uuid4()), recorded_at="2026-10-04T11:40:00+09:00")
        self.assertEqual(r.status_code, 201)
        listed = self.client.get(f"/api/v1/work-sessions/{sid}/voice-notes", headers=headers).json()
        expected = datetime.fromisoformat("2026-10-04T11:40:00+09:00")
        for note in (r.json(), listed[0]):
            self.assertEqual(datetime.fromisoformat(note["recorded_at"]), expected)

    def test_recorded_at_defaults_to_server_time(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        r = self.upload(headers, self.start(farm, headers), str(uuid4())).json()
        self.assertEqual(r["recorded_at"], r["created_at"])

    def test_rejects_recorded_at_without_timezone(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        r = self.upload(headers, self.start(farm, headers), str(uuid4()), recorded_at="2026-10-04T11:40:00")
        self.assertEqual(r.status_code, 422)

    def test_only_session_owner_can_upload(self) -> None:
        farm = make_farm()
        sid = self.start(farm, login(self.client, farm, farm.worker_id))
        r = self.upload(login(self.client, farm, farm.owner_id), sid, str(uuid4()))
        self.assertEqual((r.status_code, r.json()["error"]["code"]), (403, "not_your_session"))

    def test_upload_saves_transcript_and_adds_knowledge(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        sid = self.start(farm, headers)
        event_id = str(uuid4())
        first = self.upload(headers, sid, event_id)
        self.assertEqual((first.status_code, first.json()["transcript"]), (201, "奥の枝の実は日が当たりにくい。"))
        again = self.upload(headers, sid, event_id)
        self.assertEqual((again.status_code, again.json()["id"]), (200, first.json()["id"]))
        with SessionLocal() as db:
            docs = db.query(KnowledgeDocument).filter_by(farm_id=farm.farm_id, source_type="voice_note").all()
            self.assertEqual(len(docs), 1)  # 送り直しても知識は1件
            self.assertIn("三番ハウス", docs[0].title)
            self.assertIn("日が当たりにくい", knowledge.search(db, farm.farm_id, "日が当たらない枝")[0]["content"])

    def test_requires_transcript(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        r = self.upload(headers, self.start(farm, headers), str(uuid4()), transcript="")
        self.assertEqual(r.status_code, 422)

    def test_rejects_non_audio(self) -> None:
        farm = make_farm()
        headers = login(self.client, farm, farm.worker_id)
        r = self.upload(headers, self.start(farm, headers), str(uuid4()), content_type="image/png")
        self.assertEqual(r.status_code, 415)


if __name__ == "__main__":
    unittest.main()
