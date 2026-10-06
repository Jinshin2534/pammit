#!/usr/bin/env bash
# 果実検出（modules/pammit-fruit-detector）のビルドに必要な外部ファイルを用意する。
# 先に scripts/fetch-native-models.sh を実行しておくこと（sherpa-onnx のAARを使う）。
# 用意済みのものは飛ばすので、何度実行してもよい。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODULE_DIR="$ROOT/modules/pammit-fruit-detector/android"
ASSETS_DIR="$MODULE_DIR/src/main/assets/fruit"

AI_DIR="$HOME/orca/workspaces/pammit/AI実装計画/ai"
MODELS_SRC="${PAMMIT_AI_MODELS_DIR:-$AI_DIR/models/mobile}"
SAMPLE_SRC="${PAMMIT_AI_SAMPLE_IMAGE:-$AI_DIR/data/pilot/P01_0817_0400_frame.jpg}"
MODEL_FILES=(fruit-yolo11n.onnx scene_encoder.onnx shade70.onnx)

# sherpa-onnx 1.13.8 が同梱する ONNX Runtime と同じ版
ORT_VERSION="1.28.2"
ORT_COMMIT="33ca9628233dc8f002435e868d4c2e9f82766ca1"
ORT_DIR="$MODULE_DIR/libs/onnxruntime-$ORT_VERSION"
SHERPA_AAR="$ROOT/modules/pammit-stt/android/libs/sherpa-onnx-1.13.8.aar"
SHERPA_ORT_SHA256="33847ad43bffe204699fd4a27f7f3603452a8cdaf2f9a44983a0bc31ffcf2da1"

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# モデルと試験用の写真
mkdir -p "$ASSETS_DIR"
for file in "${MODEL_FILES[@]}"; do
  if [[ ! -s "$MODELS_SRC/$file" ]]; then
    echo "モデルがありません: $MODELS_SRC/$file（PAMMIT_AI_MODELS_DIR で場所を指定できます）" >&2
    exit 1
  fi
  if ! cmp -s "$MODELS_SRC/$file" "$ASSETS_DIR/$file"; then
    cp "$MODELS_SRC/$file" "$ASSETS_DIR/$file"
  fi
done
if [[ -s "$SAMPLE_SRC" ]]; then
  cmp -s "$SAMPLE_SRC" "$ASSETS_DIR/sample.jpg" || cp "$SAMPLE_SRC" "$ASSETS_DIR/sample.jpg"
else
  echo "試験用の写真がないため飛ばします: $SAMPLE_SRC"
fi

# リンク用に sherpa-onnx の libonnxruntime.so を取り出す（APKには sherpa 側のものが入る）
ORT_LIB="$ORT_DIR/jni/arm64-v8a/libonnxruntime.so"
if [[ ! -f "$ORT_LIB" || "$(sha256 "$ORT_LIB")" != "$SHERPA_ORT_SHA256" ]]; then
  if [[ ! -f "$SHERPA_AAR" ]]; then
    echo "sherpa-onnx のAARがありません。先に scripts/fetch-native-models.sh を実行してください" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$ORT_LIB")"
  unzip -p "$SHERPA_AAR" jni/arm64-v8a/libonnxruntime.so > "$TMP_DIR/libonnxruntime.so"
  actual="$(sha256 "$TMP_DIR/libonnxruntime.so")"
  if [[ "$actual" != "$SHERPA_ORT_SHA256" ]]; then
    echo "libonnxruntime.so のハッシュが一致しません: $actual" >&2
    exit 1
  fi
  mv "$TMP_DIR/libonnxruntime.so" "$ORT_LIB"
fi

# ONNX Runtime の Java API と JNI のソース（必要な部分だけ取得する）
if [[ -f "$ORT_DIR/.complete" ]]; then
  echo "ONNX Runtime $ORT_VERSION のソースは取得済みです"
else
  echo "ONNX Runtime $ORT_VERSION のソースを取得します"
  JAVAC="${JAVA_HOME:+$JAVA_HOME/bin/}javac"
  if ! "$JAVAC" -version >/dev/null 2>&1; then
    echo "javac が見つかりません。JAVA_HOME に JDK 17 を指定してください" >&2
    exit 1
  fi
  src="$TMP_DIR/onnxruntime"
  git -c advice.detachedHead=false clone -q --depth 1 --branch "v$ORT_VERSION" --filter=blob:none --sparse \
    https://github.com/microsoft/onnxruntime.git "$src"
  git -C "$src" sparse-checkout set --no-cone \
    /java/src/main /include/onnxruntime/core/session /include/onnxruntime/core/providers \
    /orttraining/orttraining/training_api/include /LICENSE
  if [[ "$(git -C "$src" rev-parse HEAD)" != "$ORT_COMMIT" ]]; then
    echo "ONNX Runtime のコミットが一致しません" >&2
    exit 1
  fi
  rm -rf "$ORT_DIR/java" "$ORT_DIR/include" "$ORT_DIR/orttraining" "$ORT_DIR/generated"
  mkdir -p "$ORT_DIR/java/src/main" "$ORT_DIR/orttraining/orttraining/training_api" "$ORT_DIR/generated/headers"
  cp -R "$src/java/src/main/java" "$src/java/src/main/android" "$src/java/src/main/native" "$ORT_DIR/java/src/main/"
  cp -R "$src/include" "$ORT_DIR/"
  cp -R "$src/orttraining/orttraining/training_api/include" "$ORT_DIR/orttraining/orttraining/training_api/"
  cp "$src/LICENSE" "$ORT_DIR/"
  # CMake が作る設定ヘッダーの代わり
  printf '#pragma once\n#define ORT_VERSION "%s"\n' "$ORT_VERSION" > "$ORT_DIR/generated/headers/onnxruntime_config.h"
  # JNI のヘッダーを作る（Android 用の Fp16Conversions は android.jar が要るため、PC 用で代用する）
  "$JAVAC" -h "$ORT_DIR/generated/headers" -d "$TMP_DIR/classes" \
    $(find "$src/java/src/main/java" "$src/java/src/main/jvm" -name '*.java')
  touch "$ORT_DIR/.complete"
fi

echo "完了しました"
for file in "${MODEL_FILES[@]}"; do
  echo "$(sha256 "$ASSETS_DIR/$file")  $file"
done
[[ -f "$ASSETS_DIR/sample.jpg" ]] && echo "$(sha256 "$ASSETS_DIR/sample.jpg")  sample.jpg"
du -sh "$ASSETS_DIR" "$ORT_DIR"
