#!/bin/bash
# EC2 上で API と Caddy を（再）起動する。初回起動時と、デプロイのたびに実行される。
# 設定は /opt/pammit/config.env（CDK が書き込む）から読む。
set -euo pipefail
source /opt/pammit/config.env
export AWS_DEFAULT_REGION="$AWS_REGION"
cd /opt/pammit

# 固定IPが割り当たるまで待つ（割り当て前に証明書を取りに行くと失敗するため）
for _ in $(seq 1 60); do
  token=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
  ip=$(curl -s -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
  [ "$ip" = "$EXPECTED_IP" ] && break
  sleep 5
done

image=$(aws ssm get-parameter --name "$IMAGE_PARAM" --query Parameter.Value --output text)
db=$(aws secretsmanager get-secret-value --secret-id "$DB_SECRET_ARN" --query SecretString --output text)
ttn=$(aws secretsmanager get-secret-value --secret-id "$TTN_SECRET_ARN" --query SecretString --output text)

umask 077
cat > api.env <<ENV
STUB_MODE=true
DB_HOST=$(jq -r .host <<<"$db")
DB_PORT=$(jq -r .port <<<"$db")
DB_NAME=$(jq -r .dbname <<<"$db")
DB_USER=$(jq -r .username <<<"$db")
DB_PASSWORD=$(jq -r .password <<<"$db")
TTN_WEBHOOK_SECRET=$ttn
UPLOAD_BUCKET=$UPLOAD_BUCKET
ENV
umask 022

cat > Caddyfile <<CADDY
$DOMAIN {
  reverse_proxy api:8000
}
CADDY

aws ecr get-login-password | docker login --username AWS --password-stdin "${image%%/*}"
docker pull "$image"
docker network inspect pammit >/dev/null 2>&1 || docker network create pammit

docker rm -f api >/dev/null 2>&1 || true
docker run -d --name api --network pammit --restart unless-stopped --env-file api.env "$image"

docker rm -f caddy >/dev/null 2>&1 || true
docker run -d --name caddy --network pammit --restart unless-stopped \
  -p 80:80 -p 443:443 \
  -v /opt/pammit/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v /opt/pammit/caddy-data:/data \
  caddy:2

docker image prune -f >/dev/null
echo "deployed $image -> https://$DOMAIN"
