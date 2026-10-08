import subprocess
from datetime import datetime

while True:
    input("Enterを押すと撮影します。終了は Ctrl+C：")

    filename = datetime.now().strftime("capture_%Y%m%d_%H%M%S.jpg")

    # 1. 写真を撮る
    subprocess.run([
        "rpicam-still",
        "--autofocus-mode", "auto",
        "-o", filename
    ])

    print(f"撮影しました: {filename}")

    # 2. 今はAI判定の代わりに仮で take にする
    result = "take"

    print(f"判定結果: {result}")

    # 3. 判定結果に応じて音声を再生
    if result == "take":
        subprocess.run([
            "aplay",
            "-D", "plughw:0,0",
            "take.wav"
        ])

    elif result == "keep":
        subprocess.run([
            "aplay",
            "-D", "plughw:0,0",
            "keep.wav"
        ])

    else:
        subprocess.run([
            "aplay",
            "-D", "plughw:0,0",
            "unknown.wav"
        ])
import subprocess
from datetime import datetime

while True:
    input("Enterを押すと撮影します。終了は Ctrl+C：")

    filename = datetime.now().strftime("capture_%Y%m%d_%H%M%S.jpg")

    subprocess.run([
        "rpicam-still",
        "--autofocus-mode", "auto",
        "-o", filename
    ])

    print(f"撮影しました: {filename}")



