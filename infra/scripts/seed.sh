#!/bin/bash
# デモ用の農園・作業者・判定設定を入れ、作業者の PIN を表示する（一度しか表示されない）。
# すでに入っていれば何もしない。
# 注意: 出力は SSM のコマンド履歴にも残る（このAWSアカウントの管理者だけが見られる）。
cd "$(dirname "$0")/.."
source scripts/_common.sh
run_on_server "docker exec api python -m app.cli seed"
