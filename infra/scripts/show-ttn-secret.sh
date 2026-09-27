#!/bin/bash
# TTN の Webhook 設定に入れる X-Webhook-Secret を表示する。
cd "$(dirname "$0")/.."
source scripts/_common.sh
aws secretsmanager get-secret-value --secret-id "$(output TtnWebhookSecretArn)" --query SecretString --output text
