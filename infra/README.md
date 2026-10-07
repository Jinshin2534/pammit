# パミット インフラ（AWS CDK）

EC2（Caddy + FastAPI）・RDS PostgreSQL・S3 を東京リージョンに作る。

```bash
npm install
npx jest          # 構成のテスト（DB が非公開か、SSH を開けていないか など）
npx cdk diff      # deploy 前に必ず確認
./scripts/deploy.sh
```

サーバーの操作は `scripts/` のスクリプト（SSM 経由）で行う。
