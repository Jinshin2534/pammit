#!/usr/bin/env bash
# 音声認識（modules/pammit-stt）のビルドに必要な外部ファイルを取得する。
# 取得済みのものは飛ばすので、何度実行してもよい。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STT_DIR="$ROOT/modules/pammit-stt/android"

SHERPA_VERSION="1.13.8"
SHERPA_AAR="sherpa-onnx-$SHERPA_VERSION.aar"
SHERPA_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/v$SHERPA_VERSION/$SHERPA_AAR"
SHERPA_SHA256="633c24321e06b1fe79feafa03ea16cbc0f8a286641e2da3559bac91bdb13bd96"

MODEL_NAME="sherpa-onnx-zipformer-ja-reazonspeech-2024-08-01"
MODEL_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/$MODEL_NAME.tar.bz2"
MODEL_DIR="$STT_DIR/src/main/assets/reazonspeech"
MODEL_FILES=(
  encoder-epoch-99-avg-1.int8.onnx
  decoder-epoch-99-avg-1.onnx
  joiner-epoch-99-avg-1.int8.onnx
  tokens.txt
)

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# sherpa-onnx の公式AAR
mkdir -p "$STT_DIR/libs"
AAR_PATH="$STT_DIR/libs/$SHERPA_AAR"
if [[ -f "$AAR_PATH" && "$(sha256 "$AAR_PATH")" == "$SHERPA_SHA256" ]]; then
  echo "sherpa-onnx $SHERPA_VERSION は取得済みです"
else
  echo "sherpa-onnx $SHERPA_VERSION を取得します: $SHERPA_URL"
  curl -fL --retry 3 -o "$TMP_DIR/$SHERPA_AAR" "$SHERPA_URL"
  actual="$(sha256 "$TMP_DIR/$SHERPA_AAR")"
  if [[ "$actual" != "$SHERPA_SHA256" ]]; then
    echo "AARのハッシュが一致しません: $actual" >&2
    exit 1
  fi
  mv "$TMP_DIR/$SHERPA_AAR" "$AAR_PATH"
fi

# ReazonSpeech モデル（必要な4ファイルだけ取り出す）
missing=0
for file in "${MODEL_FILES[@]}"; do
  [[ -s "$MODEL_DIR/$file" ]] || missing=1
done
if [[ "$missing" == 0 ]]; then
  echo "ReazonSpeech モデルは取得済みです"
else
  echo "ReazonSpeech モデルを取得します（約700MB）: $MODEL_URL"
  members=()
  for file in "${MODEL_FILES[@]}"; do members+=("$MODEL_NAME/$file"); done
  curl -fL --retry 3 "$MODEL_URL" | tar -xjf - -C "$TMP_DIR" "${members[@]}"
  mkdir -p "$MODEL_DIR"
  for file in "${MODEL_FILES[@]}"; do
    mv "$TMP_DIR/$MODEL_NAME/$file" "$MODEL_DIR/$file"
  done
fi

echo "完了しました"
du -sh "$AAR_PATH" "$MODEL_DIR"
