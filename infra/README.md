# パミット インフラ（AWS CDK）

構成・操作手順・費用・片付け方は [docs/aws.md](../docs/aws.md) を参照。

```bash
npm install
npx jest          # 構成のテスト（DB が非公開か、SSH を開けていないか など）
npx cdk diff      # deploy 前に必ず確認
./scripts/deploy.sh
```
