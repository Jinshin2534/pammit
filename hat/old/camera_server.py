from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import subprocess
import threading
import time
import json
import os


# =========================
# 設定
# =========================

PORT = 5000

AUDIO_FILES = {
    "TAKE": "/home/miyui/take.wav",
    "KEEP": "/home/miyui/keep.wav",
    "UNKNOWN": "/home/miyui/unknown.wav"
}

AUDIO_DEVICE = "plughw:0,0"


# =========================
# 最新カメラ画像
# =========================

latest_image = None
image_lock = threading.Lock()

camera_process = None


def camera_loop():
    """
    rpicam-vid を常時起動し、
    MJPEGの最新1フレームをメモリに保持する
    """

    global latest_image
    global camera_process

    while True:

        print("カメラを起動します")

        try:
            camera_process = subprocess.Popen(
                [
                    "rpicam-vid",
                    "--nopreview",
                    "--codec", "mjpeg",
                    "--width", "1280",
                    "--height", "720",
                    "--framerate", "5",
                    "--timeout", "0",
                    "-o", "-"
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                bufsize=0
            )

            buffer = bytearray()

            while True:

                chunk = camera_process.stdout.read(4096)

                if not chunk:
                    break

                buffer.extend(chunk)

                while True:

                    start = buffer.find(b"\xff\xd8")

                    if start == -1:
                        break

                    end = buffer.find(b"\xff\xd9", start + 2)

                    if end == -1:
                        break

                    frame = bytes(
                        buffer[start:end + 2]
                    )

                    del buffer[:end + 2]

                    with image_lock:
                        latest_image = frame

        except Exception as e:
            print("カメラエラー:", e)

        print("カメラが停止しました。1秒後に再起動します")

        time.sleep(1)


# =========================
# 音声再生
# =========================

def play_audio(command):

    wav_path = AUDIO_FILES.get(command)

    if wav_path is None:
        return False

    if not os.path.exists(wav_path):
        print(
            f"音声ファイルがありません: {wav_path}"
        )
        return False

    result = subprocess.run(
        [
            "aplay",
            "-D", AUDIO_DEVICE,
            wav_path
        ]
    )

    return result.returncode == 0


# =========================
# HTTPサーバー
# =========================

class HatHandler(BaseHTTPRequestHandler):

    def send_json(self, status_code, data):

        body = json.dumps(
            data
        ).encode("utf-8")

        self.send_response(status_code)

        self.send_header(
            "Content-Type",
            "application/json"
        )

        self.send_header(
            "Content-Length",
            str(len(body))
        )

        self.end_headers()

        self.wfile.write(body)


    # -------------------------
    # GET
    # -------------------------

    def do_GET(self):

        # 状態確認
        if self.path == "/status":

            with image_lock:
                camera_ready = (
                    latest_image is not None
                )

            self.send_json(
                200,
                {
                    "status": "ok",
                    "device": "hat-pi",
                    "camera_ready": camera_ready
                }
            )

            return


        # 最新画像取得
        if self.path == "/capture":

            with image_lock:
                image = latest_image

            if image is None:

                self.send_json(
                    503,
                    {
                        "status": "error",
                        "message": "image_not_ready"
                    }
                )

                return


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

            print("最新画像を送信しました")

            return


        self.send_json(
            404,
            {
                "status": "error",
                "message": "not_found"
            }
        )


    # -------------------------
    # POST
    # -------------------------

    def do_POST(self):

        if self.path != "/command":

            self.send_json(
                404,
                {
                    "status": "error",
                    "message": "not_found"
                }
            )

            return


        content_length = int(
            self.headers.get(
                "Content-Length",
                0
            )
        )

        body = self.rfile.read(
            content_length
        )


        try:

            data = json.loads(
                body.decode("utf-8")
            )

        except Exception:

            self.send_json(
                400,
                {
                    "status": "error",
                    "message": "invalid_json"
                }
            )

            return


        command = str(
            data.get(
                "command",
                ""
            )
        ).upper()


        if command not in AUDIO_FILES:

            self.send_json(
                400,
                {
                    "status": "error",
                    "message": "invalid_command"
                }
            )

            return


        print(
            f"音声指示を受信: {command}"
        )


        success = play_audio(
            command
        )


        if not success:

            self.send_json(
                500,
                {
                    "status": "error",
                    "message": "audio_failed"
                }
            )

            return


        self.send_json(
            200,
            {
                "status": "ok",
                "command": command
            }
        )


# =========================
# カメラ開始
# =========================

camera_thread = threading.Thread(
    target=camera_loop,
    daemon=True
)

camera_thread.start()


# =========================
# Webサーバー開始
# =========================

server = ThreadingHTTPServer(
    ("0.0.0.0", PORT),
    HatHandler
)

print("Hat server started")
print(f"Port: {PORT}")


try:

    server.serve_forever()

except KeyboardInterrupt:

    print("\nサーバーを終了します")

finally:

    if camera_process is not None:

        camera_process.terminate()

    server.server_close()
