#!/bin/bash
# コードを変えたあとに実行する。イメージを作り直して ECR に上げ、EC2 のコンテナを入れ替える。
#   ./scripts/deploy.sh
cd "$(dirname "$0")/.."
source scripts/_common.sh
npx cdk deploy --outputs-file cdk-outputs.json
run_on_server /opt/pammit/deploy.sh
