#!/bin/bash
# 登録済みの端末と、最後に受信した時刻を表示する。
cd "$(dirname "$0")/.."
source scripts/_common.sh
run_on_server "docker exec api python -m app.cli list-devices"
