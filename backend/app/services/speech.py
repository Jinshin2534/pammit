"""帽子で鳴らす声。Amazon Polly のニューラル音声（Kazuha）で、16kHz・16bit・モノラルの wav を作る。"""
import struct
from xml.sax.saxutils import escape

from app.core.config import settings

SAMPLE_RATE = 16000
VOICE_ID = "Kazuha"
# アプリの「話す速さ」の設定ごとの速さ（Polly の標準を100%とする）
RATES = {"fast": 130, "normal": 115, "slow": 100, "verySlow": 85}


def _polly():
    import boto3

    return boto3.client("polly", region_name=settings.aws_region)


def synthesize(text: str, speed: str) -> bytes:
    ssml = f'<speak><prosody rate="{RATES[speed]}%">{escape(text)}</prosody></speak>'
    res = _polly().synthesize_speech(
        Engine="neural", VoiceId=VOICE_ID, LanguageCode="ja-JP", TextType="ssml",
        OutputFormat="pcm", SampleRate=str(SAMPLE_RATE), Text=ssml)
    return to_wav(res["AudioStream"].read())


def to_wav(pcm: bytes) -> bytes:
    header = b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVE"
    header += b"fmt " + struct.pack("<IHHIIHH", 16, 1, 1, SAMPLE_RATE, SAMPLE_RATE * 2, 2, 16)
    header += b"data" + struct.pack("<I", len(pcm))
    return header + pcm
