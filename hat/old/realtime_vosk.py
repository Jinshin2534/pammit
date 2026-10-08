import subprocess
import json
import time
import threading
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from vosk import Model, KaldiRecognizer

MODEL_PATH = "/home/miyui/hat-project/models/vosk-model-small-ja-0.22"
AUDIO_DEVICE = "plughw:0,0"

RESPONSE_AUDIO = "/home/miyui/take.wav"
RECORDED_AUDIO = "/home/miyui/hat-project/latest.wav"
LATEST_IMAGE = "/home/miyui/hat-project/latest.jpg"

WEB_PORT = 5001

status_data = {
    "status": "ok",
    "device": "hat-pi",
    "voice_ready": True,
    "trigger_detected": False,
    "trigger": "",
    "trigger_count": 0,
    "last_trigger": "",
    "audio_ready": False,
    "image_ready": False
}


class StatusHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/status":
            body = json.dumps(
                status_data,
                ensure_ascii=False
            ).encode("utf-8")

            self.send_response(200)
            self.send_header(
                "Content-Type",
                "application/json; charset=utf-8"
            )
            self.send_header(
                "Content-Length",
                str(len(body))
            )
            self.send_header(
                "Cache-Control",
                "no-store"
            )
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path == "/latest.jpg":
            if not os.path.exists(LATEST_IMAGE):
                self.send_response(404)
                self.end_headers()
                return

            with open(LATEST_IMAGE, "rb") as f:
                image = f.read()

            self.send_response(200)
            self.send_header(
                "Content-Type",
                "image/jpeg"
            )
            self.send_header(
                "Content-Length",
                str(len(image))
            )
            self.send_header(
                "Cache-Control",
                "no-store"
            )
            self.end_headers()
            self.wfile.write(image)
            return

        if self.path == "/latest.wav":
            if not os.path.exists(RECORDED_AUDIO):
                self.send_response(404)
                self.end_headers()
                return

            with open(RECORDED_AUDIO, "rb") as f:
                audio = f.read()

            self.send_response(200)
            self.send_header(
                "Content-Type",
                "audio/wav"
            )
            self.send_header(
                "Content-Length",
                str(len(audio))
            )
            self.send_header(
                "Cache-Control",
                "no-store"
            )
            self.end_headers()
            self.wfile.write(audio)
            return

        if self.path == "/":
            html = """
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="5">
<title>Hat Pi</title>
</head>
<body>

<h1>Hat Pi</h1>

<h2>Latest photo</h2>
<img src="/latest.jpg" style="max-width:95%; height:auto;">

<h2>Latest audio</h2>
<audio controls src="/latest.wav"></audio>

<h2>Status</h2>
<p><a href="/status">Open status</a></p>

</body>
</html>
"""

            body = html.encode("utf-8")

            self.send_response(200)
            self.send_header(
                "Content-Type",
                "text/html; charset=utf-8"
            )
            self.send_header(
                "Content-Length",
                str(len(body))
            )
            self.send_header(
                "Cache-Control",
                "no-store"
            )
            self.end_headers()
            self.wfile.write(body)
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        return


def start_web_server():
    server = ThreadingHTTPServer(
        ("0.0.0.0", WEB_PORT),
        StatusHandler
    )

    print("Android確認用サーバー開始")
    print("Port:", WEB_PORT)

    server.serve_forever()


def start_mic():
    return subprocess.Popen(
        [
            "arecord",
            "-D", AUDIO_DEVICE,
            "-f", "S16_LE",
            "-r", "16000",
            "-c", "1",
            "-t", "raw"
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL
    )


def stop_mic(mic):
    if mic.poll() is not None:
        return

    mic.terminate()

    try:
        mic.wait(timeout=2)
    except subprocess.TimeoutExpired:
        mic.kill()
        mic.wait()


web_thread = threading.Thread(
    target=start_web_server,
    daemon=True
)

web_thread.start()

model = Model(MODEL_PATH)

recognizer = KaldiRecognizer(
    model,
    16000
)

mic = start_mic()

trigger_words = [
    "お願いします",
    "願いします",
    "お願いし",
    "願いし",
    "お姉がいします",
    "お姉姉がいします",
    "姉がいいします"
]

print("音声認識開始")
print("「お願いします」と話してください")
print("終了: Ctrl+C")

try:
    while True:

        data = mic.stdout.read(4000)

        if not data:
            continue

        if not recognizer.AcceptWaveform(data):
            continue

        result = json.loads(
            recognizer.Result()
        )

        text = result.get(
            "text",
            ""
        )

        if not text:
            continue

        print(
            "認識:",
            text
        )

        compact_text = "".join(
            text.split()
        )

        triggered = any(
            word in compact_text
            for word in trigger_words
        )

        if not triggered:
            continue

        print(
            "=== お願いします TRIGGER ==="
        )

        status_data["trigger_detected"] = True
        status_data["trigger"] = "お願いします"
        status_data["trigger_count"] += 1
        status_data["last_trigger"] = datetime.now().isoformat(
            timespec="seconds"
        )

        stop_mic(mic)

        time.sleep(0.3)

        print(
            "写真を撮影します"
        )

        photo_result = subprocess.run(
            [
                "rpicam-still",
                "--nopreview",
                "--timeout", "1000",
                "--width", "1280",
                "--height", "720",
                "-o", LATEST_IMAGE
            ],
            check=False
        )

        if photo_result.returncode == 0:
            status_data["image_ready"] = True

            print(
                "写真保存完了:",
                LATEST_IMAGE
            )
        else:
            status_data["image_ready"] = False

            print(
                "写真撮影に失敗しました"
            )

        time.sleep(0.3)

        print(
            "5秒間録音します"
        )

        record_result = subprocess.run(
            [
                "arecord",
                "-D", AUDIO_DEVICE,
                "-f", "S16_LE",
                "-r", "16000",
                "-c", "1",
                "-d", "5",
                RECORDED_AUDIO
            ],
            check=False
        )

        if record_result.returncode == 0:
            status_data["audio_ready"] = True

            print(
                "録音完了:",
                RECORDED_AUDIO
            )
        else:
            status_data["audio_ready"] = False

            print(
                "録音に失敗しました"
            )

        time.sleep(0.3)

        print(
            "応答音声を再生します"
        )

        subprocess.run(
            [
                "aplay",
                "-D", AUDIO_DEVICE,
                RESPONSE_AUDIO
            ],
            check=False
        )

        time.sleep(0.5)

        recognizer = KaldiRecognizer(
            model,
            16000
        )

        mic = start_mic()

        print(
            "音声認識を再開しました"
        )

except KeyboardInterrupt:
    print(
        "\n終了します"
    )

finally:
    stop_mic(mic)
