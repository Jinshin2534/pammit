#!/bin/bash
# センサー端末を登録し、デバイスキーを発行する（キーは一度しか表示されない）。
#   ./scripts/create-device.sh --name 3番ハウス-01 --plot-id 3
#   ./scripts/create-device.sh --name 5番畑-lora --plot-id 5 --dev-eui 70B3D57ED0012345
# 注意: 出力は SSM のコマンド履歴にも残る（このAWSアカウントの管理者だけが見られる）。
cd "$(dirname "$0")/.."
source scripts/_common.sh
args=$(printf '%q ' "$@")
run_on_server "docker exec api python -m app.cli create-device $args"
