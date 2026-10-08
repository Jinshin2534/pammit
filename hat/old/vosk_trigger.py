import json
import subprocess
from vosk import Model, KaldiRecognizer

SAMPLE_RATE = 16000

MODEL_PATH = (
    "/home/miyui/hat-project/models/"
    "vosk-model-small-ja-0.22"
)

GRAMMAR = ["お願い", "相談", "これ", "[unk]"]

print("Loading Vosk model...")

model = Model(MODEL_PATH)

recognizer = KaldiRecognizer(
    model,
    SAMPLE_RATE,
    json.dumps(GRAMMAR, ensure_ascii=False)
)

print("Vosk ready")
print()
print("待機中...")
print("「パミっとお願いします」→ 判定")
print("「これ？」→ 次の判定")
print("「パミっと相談」→ 相談")
print()

arecord = subprocess.Popen(
    [
        "arecord",
        "-D", "plughw:0,0",
        "-f", "S16_LE",
        "-r", "16000",
        "-c", "1",
        "-t", "raw"
    ],
    stdout=subprocess.PIPE
)

try:
    while True:
        data = arecord.stdout.read(8000)

        if len(data) == 0:
            continue

        if recognizer.AcceptWaveform(data):
            result = json.loads(recognizer.Result())
            text = result.get("text", "")

            if text:
                print("認識:", text)

            if "お願い" in text:
                print(">>> 判定ワード検出")
                print(">>> 判定モード開始")

            elif "相談" in text:
                print(">>> 相談ワード検出")
                print(">>> 相談モード開始")

            elif "これ" in text:
                print(">>> 「これ？」検出")

except KeyboardInterrupt:
    print()
    print("終了します")

finally:
    if arecord.poll() is None:
        arecord.terminate()
        try:
            arecord.wait(timeout=2)
        except subprocess.TimeoutExpired:
            arecord.kill()
