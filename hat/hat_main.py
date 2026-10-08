import asyncio
import json
import subprocess
import threading
import time
from pathlib import Path

from aiohttp import web, WSMsgType
from vosk import Model, KaldiRecognizer


PORT = 5000
SAMPLE_RATE = 16000

MODEL_PATH = (
    "/home/miyui/hat-project/models/"
    "vosk-model-small-ja-0.22"
)

GRAMMAR = ["お願い", "相談", "これ", "[unk]"]

current_ws = None
last_received_time = 0.0
main_loop = None

stop_event = threading.Event()
judge_lock = None

judge_mode = False

PCM_CHUNK = 3200
MAX_STREAM_SECONDS = 30

streaming = threading.Event()
mic_suspended = threading.Event()

stream_started = 0.0

current_player = None
current_play_id = None


# =========================
# カメラ
# =========================

def capture_camera_sync():
    output_path = Path("/tmp/hat_capture.jpg")

    try:
        result = subprocess.run(
            [
                "rpicam-still",
                "--nopreview",
                "--timeout", "1000",
                "--width", "1536",
                "--height", "1024",
                "-o", str(output_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            print("camera error:", flush=True)
            print(result.stderr, flush=True)
            return None

        return output_path.read_bytes()

    except subprocess.TimeoutExpired:
        print("camera timeout", flush=True)
        return None


async def capture_camera():
    return await asyncio.to_thread(
        capture_camera_sync
    )


# =========================
# HTTP API
# =========================

async def status_handler(request):
    return web.json_response(
        {
            "status": "ok",
            "device": "hat-pi",
            "websocket_connected": (
                current_ws is not None
                and not current_ws.closed
            ),
        }
    )


async def capture_handler(request):
    jpeg = await capture_camera()

    if jpeg is None:
        return web.json_response(
            {
                "status": "error",
                "message": "camera capture failed",
            },
            status=500,
        )

    return web.Response(
        body=jpeg,
        content_type="image/jpeg",
    )


async def command_handler(request):
    try:
        data = await request.json()

        print(
            "POST /command:",
            data,
            flush=True,
        )

        return web.json_response(
            {
                "status": "ok",
                "received": data,
            }
        )

    except Exception as e:
        return web.json_response(
            {
                "status": "error",
                "message": str(e),
            },
            status=400,
        )


# =========================
# judge
# =========================

async def send_judge():
    global current_ws

    async with judge_lock:

        if (
            current_ws is None
            or current_ws.closed
        ):
            print(
                "judge: WebSocket未接続",
                flush=True,
            )
            return

        print(
            "sending judge event",
            flush=True,
        )

        await current_ws.send_json(
            {
                "event": "judge",
            }
        )

        print(
            "capturing image",
            flush=True,
        )

        jpeg = await capture_camera()

        if jpeg is None:
            print(
                "camera capture failed",
                flush=True,
            )
            return

        print(
            "sending JPEG:",
            len(jpeg),
            "bytes",
            flush=True,
        )

        await current_ws.send_bytes(
            b"J" + jpeg
        )

        print(
            "judge send complete",
            flush=True,
        )


# =========================
# talk / PCM / playback
# =========================

async def play_warning():
    mic_suspended.set()
    await asyncio.sleep(0.1)

    try:
        await asyncio.to_thread(
            subprocess.run,
            ["aplay", "-q", "/home/miyui/unknown.wav"],
        )
    except Exception as e:
        print("warning sound error:", e, flush=True)

    await asyncio.sleep(0.5)
    mic_suspended.clear()


async def start_talk():
    global stream_started

    if (
        current_ws is None
        or current_ws.closed
    ):
        print("talk: WebSocket未接続", flush=True)
        await play_warning()
        return

    await current_ws.send_json(
        {"event": "talk"}
    )

    stream_started = time.monotonic()
    streaming.set()

    print("talk streaming started", flush=True)


async def send_audio_chunk(data):
    global stream_started

    if not streaming.is_set():
        return

    if time.monotonic() - stream_started >= MAX_STREAM_SECONDS:
        streaming.clear()
        print("talk streaming stopped: 30 sec", flush=True)
        return

    if (
        current_ws is not None
        and not current_ws.closed
    ):
        await current_ws.send_bytes(
            b"A" + data
        )


async def stop_playback():
    global current_player

    if current_player is not None:
        if current_player.returncode is None:
            current_player.terminate()

            try:
                await asyncio.wait_for(
                    current_player.wait(),
                    timeout=1,
                )
            except asyncio.TimeoutError:
                current_player.kill()
                await current_player.wait()

        current_player = None

    mic_suspended.clear()


async def play_received_wav(wav_data):
    global current_player

    streaming.clear()
    mic_suspended.set()

    path = "/tmp/phone_audio.wav"
    Path(path).write_bytes(wav_data)

    await asyncio.sleep(0.2)

    try:
        current_player = await asyncio.create_subprocess_exec(
            "aplay",
            "-q",
            path,
        )

        await current_player.wait()

    except Exception as e:
        print("playback error:", e, flush=True)

    finally:
        current_player = None

        # 要件: 再生後0.5秒はトリガーを聞かない
        await asyncio.sleep(0.5)

        mic_suspended.clear()

        if (
            current_ws is not None
            and not current_ws.closed
        ):
            await current_ws.send_json(
                {
                    "event": "played",
                    "id": current_play_id,
                }
            )


# =========================
# Vosk
# =========================

def vosk_worker():
    global judge_mode
    global stream_started

    print("Loading Vosk model...", flush=True)

    model = Model(MODEL_PATH)

    recognizer = KaldiRecognizer(
        model,
        SAMPLE_RATE,
        json.dumps(
            GRAMMAR,
            ensure_ascii=False,
        ),
    )

    print("Vosk ready", flush=True)

    def open_mic():
        print("Listening...", flush=True)

        return subprocess.Popen(
            [
                "arecord",
                "-q",
                "-D", "plughw:0,0",
                "-f", "S16_LE",
                "-r", "16000",
                "-c", "1",
                "-t", "raw",
            ],
            stdout=subprocess.PIPE,
        )

    arecord = None

    try:
        while not stop_event.is_set():

            # スピーカー再生中はマイクを完全に閉じる
            if mic_suspended.is_set():

                if arecord is not None:
                    arecord.terminate()

                    try:
                        arecord.wait(timeout=1)
                    except subprocess.TimeoutExpired:
                        arecord.kill()

                    arecord = None

                time.sleep(0.05)
                continue

            if arecord is None:
                arecord = open_mic()

            data = arecord.stdout.read(PCM_CHUNK)

            if not data:
                try:
                    arecord.terminate()
                except Exception:
                    pass

                arecord = None
                time.sleep(0.1)
                continue

            # 相談中はVoskではなくスマホへPCM送信
            if streaming.is_set():

                if time.monotonic() - stream_started >= MAX_STREAM_SECONDS:
                    streaming.clear()
                    print(
                        "talk streaming stopped: 30 sec",
                        flush=True,
                    )
                    continue

                if main_loop is not None:
                    asyncio.run_coroutine_threadsafe(
                        send_audio_chunk(bytes(data)),
                        main_loop,
                    )

                continue

            # 通常時だけウェイクワード認識
            if recognizer.AcceptWaveform(data):

                result = json.loads(
                    recognizer.Result()
                )

                text = result.get("text", "")

                if text:
                    print(
                        "認識:",
                        text,
                        flush=True,
                    )

                if "お願い" in text:

                    judge_mode = True

                    print(
                        ">>> 判定ワード検出",
                        flush=True,
                    )

                    if main_loop is not None:
                        asyncio.run_coroutine_threadsafe(
                            send_judge(),
                            main_loop,
                        )

                elif "相談" in text:

                    judge_mode = False

                    print(
                        ">>> 相談ワード検出",
                        flush=True,
                    )

                    if main_loop is not None:
                        asyncio.run_coroutine_threadsafe(
                            start_talk(),
                            main_loop,
                        )

                elif "これ" in text:

                    if judge_mode:

                        print(
                            ">>> 「これ？」検出",
                            flush=True,
                        )

                        if main_loop is not None:
                            asyncio.run_coroutine_threadsafe(
                                send_judge(),
                                main_loop,
                            )

                    else:
                        print(
                            "「これ」は判定モード外なので無視",
                            flush=True,
                        )

    except Exception as e:
        print(
            "Vosk error:",
            repr(e),
            flush=True,
        )

    finally:
        if arecord is not None:
            if arecord.poll() is None:
                arecord.terminate()


# =========================
# WebSocket ping
# =========================

async def ping_loop(ws):
    global last_received_time

    try:
        while not ws.closed:

            await asyncio.sleep(2)

            await ws.send_json(
                {
                    "event": "ping",
                }
            )

            elapsed = (
                time.monotonic()
                - last_received_time
            )

            if elapsed > 5:

                print(
                    "スマホから5秒以上応答なし",
                    flush=True,
                )

                await ws.close()
                break

    except asyncio.CancelledError:
        pass

    except Exception as e:
        print(
            "ping error:",
            e,
            flush=True,
        )


# =========================
# WebSocket /events
# =========================

async def events_handler(request):
    global current_ws
    global last_received_time
    global current_play_id
    global stream_started

    ws = web.WebSocketResponse()
    await ws.prepare(request)

    if (
        current_ws is not None
        and not current_ws.closed
    ):
        await current_ws.close()

    current_ws = ws
    last_received_time = time.monotonic()

    print(
        "=== WebSocket connected ===",
        flush=True,
    )

    ping_task = asyncio.create_task(
        ping_loop(ws)
    )

    try:
        async for msg in ws:

            last_received_time = time.monotonic()

            if msg.type == WSMsgType.TEXT:

                try:
                    data = json.loads(msg.data)
                except json.JSONDecodeError:
                    continue

                print(
                    "WS receive:",
                    data,
                    flush=True,
                )

                cmd = data.get("cmd")

                if cmd == "ping":
                    pass

                elif cmd == "listen":
                    stream_started = time.monotonic()
                    streaming.set()
                    print("listen started", flush=True)

                elif cmd == "listen_stop":
                    streaming.clear()
                    print("listen stopped", flush=True)

                elif cmd == "stop":
                    streaming.clear()
                    await stop_playback()
                    print("stop complete", flush=True)

                elif cmd == "volume":

                    try:
                        level = int(
                            data.get("level", 70)
                        )
                    except Exception:
                        level = 70

                    level = max(
                        0,
                        min(100, level),
                    )

                    await asyncio.to_thread(
                        subprocess.run,
                        [
                            "amixer",
                            "-q",
                            "-c", "0",
                            "sset",
                            "Speaker",
                            f"{level}%",
                        ],
                    )

                    print(
                        "volume:",
                        level,
                        flush=True,
                    )

                elif cmd == "play":
                    current_play_id = data.get("id")

                    print(
                        "play id:",
                        current_play_id,
                        flush=True,
                    )

            elif msg.type == WSMsgType.BINARY:

                if not msg.data:
                    continue

                prefix = msg.data[:1]
                payload = msg.data[1:]

                if prefix == b"W":

                    print(
                        "WAV received:",
                        len(payload),
                        "bytes",
                        flush=True,
                    )

                    await stop_playback()

                    asyncio.create_task(
                        play_received_wav(
                            payload
                        )
                    )

    finally:

        ping_task.cancel()
        streaming.clear()

        if current_ws is ws:
            current_ws = None

        print(
            "=== WebSocket disconnected ===",
            flush=True,
        )

    return ws


# =========================
# 起動
# =========================

async def on_startup(app):
    global main_loop
    global judge_lock

    main_loop = (
        asyncio.get_running_loop()
    )

    judge_lock = asyncio.Lock()

    stop_event.clear()

    thread = threading.Thread(
        target=vosk_worker,
        daemon=True,
    )

    thread.start()

    print()
    print("==========================")
    print("Hat Pi server starting")
    print("==========================")
    print()
    print(
        "HTTP:"
        " http://<PiのIP>:5000"
    )
    print(
        "WebSocket:"
        " ws://<PiのIP>:5000/events"
    )
    print()


async def on_cleanup(app):
    stop_event.set()


app = web.Application()

app.router.add_get(
    "/status",
    status_handler,
)

app.router.add_get(
    "/capture",
    capture_handler,
)

app.router.add_post(
    "/command",
    command_handler,
)

app.router.add_get(
    "/events",
    events_handler,
)

app.on_startup.append(
    on_startup
)

app.on_cleanup.append(
    on_cleanup
)


if __name__ == "__main__":

    web.run_app(
        app,
        host="0.0.0.0",
        port=PORT,
    )
