#!/bin/bash
# OpenAI の API キーを Secrets Manager に入れる。キーは画面に表示せず、履歴にも残さない。
# 入れたあと ./scripts/deploy.sh を実行すると、API が読み込み直す。
cd "$(dirname "$0")/.."
source scripts/_common.sh
read -r -s -p "OpenAI の API キー: " key
echo
[[ "$key" == sk-* ]] || { echo "sk- で始まるキーを入れてください"; exit 1; }
aws secretsmanager put-secret-value --secret-id pammit/openai --secret-string "$key" >/dev/null
echo "保存しました"
