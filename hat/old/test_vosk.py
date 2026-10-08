import wave
import json
from vosk import Model, KaldiRecognizer

MODEL_PATH = "/home/miyui/hat-project/models/vosk-model-small-ja-0.22"
WAV_PATH = "/home/miyui/test.wav"

model = Model(MODEL_PATH)

wf = wave.open(WAV_PATH, "rb")

print("channels:", wf.getnchannels())
print("sample width:", wf.getsampwidth())
print("sample rate:", wf.getframerate())

recognizer = KaldiRecognizer(model, wf.getframerate())

print("認識開始")

while True:
    data = wf.readframes(4000)

    if len(data) == 0:
        break

    if recognizer.AcceptWaveform(data):
        result = json.loads(recognizer.Result())

        if result.get("text"):
            print("認識:", result["text"])

final_result = json.loads(recognizer.FinalResult())

if final_result.get("text"):
    print("認識:", final_result["text"])

print("認識終了")
