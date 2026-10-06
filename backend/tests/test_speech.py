import io
import unittest
from unittest import mock

from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app
from app.services import speech
from tests.helpers import login, make_farm


class SpeechTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db()
        cls.client = TestClient(app)
        farm = make_farm()
        cls.headers = login(cls.client, farm, farm.worker_id)

    def test_returns_wav_with_speed(self):
        polly = mock.Mock()
        polly.synthesize_speech.return_value = {"AudioStream": io.BytesIO(b"\x01\x00" * 1600)}
        with mock.patch.object(speech, "_polly", return_value=polly):
            res = self.client.post("/api/v1/speech", headers=self.headers, json={"text": "取ってください", "speed": "slow"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "audio/wav")
        self.assertEqual(res.content[:4], b"RIFF")
        self.assertEqual(len(res.content), 44 + 3200)
        kwargs = polly.synthesize_speech.call_args.kwargs
        self.assertEqual(kwargs["VoiceId"], "Kazuha")
        self.assertIn('rate="100%"', kwargs["Text"])

    def test_escapes_text(self):
        polly = mock.Mock()
        polly.synthesize_speech.return_value = {"AudioStream": io.BytesIO(b"")}
        with mock.patch.object(speech, "_polly", return_value=polly):
            self.client.post("/api/v1/speech", headers=self.headers, json={"text": "A<B&C"})
        self.assertIn("A&lt;B&amp;C", polly.synthesize_speech.call_args.kwargs["Text"])
        self.assertIn('rate="115%"', polly.synthesize_speech.call_args.kwargs["Text"])

    def test_unavailable(self):
        with mock.patch.object(speech, "_polly", side_effect=RuntimeError("no credentials")):
            res = self.client.post("/api/v1/speech", headers=self.headers, json={"text": "取ってください"})
        self.assertEqual(res.status_code, 503)
        self.assertEqual(res.json()["error"]["code"], "speech_unavailable")

    def test_requires_login(self):
        res = self.client.post("/api/v1/speech", json={"text": "取ってください"})
        self.assertEqual(res.status_code, 401)
