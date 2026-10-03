#!/bin/bash
# 作業者の PIN を発行し直す。
#   ./scripts/reset-pin.sh --user-id 2
cd "$(dirname "$0")/.."
source scripts/_common.sh
args=$(printf '%q ' "$@")
run_on_server "docker exec api python -m app.cli reset-pin $args"
