import json

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "パミット API"
    version: str = "0.2.0"

    # DB。DATABASE_URL をそのまま使うか、DB_HOST 等の部品から組み立てる。
    # EC2 では RDS の Secrets Manager から部品を渡す（パスワードを URL エンコードせずに済むため）
    database_url: str = "sqlite:///./pammit.db"
    db_host: str | None = None
    db_port: int = 5432
    db_name: str = "pammit"
    db_user: str | None = None
    db_password: str | None = None

    # The Things Network の Webhook に設定する共有シークレット
    ttn_webhook_secret: str | None = None

    # ログイン
    jwt_secret: str | None = None
    jwt_expires_days: int = 30
    pin_max_failures: int = 5
    pin_lock_minutes: int = 15

    openai_api_key: str | None = None

    # AWS 上では、上の秘密情報を Secrets Manager から読む（サーバーの環境変数には置かない）
    aws_region: str = "ap-northeast-1"
    app_secret_id: str = "pammit/app"
    openai_secret_id: str = "pammit/openai"

    @property
    def on_aws(self) -> bool:
        # EC2 では RDS の接続情報を部品で渡している。ローカルとテストでは DATABASE_URL を使う
        return self.db_host is not None

    @property
    def sqlalchemy_url(self) -> str | URL:
        if self.db_host:
            return URL.create(
                "postgresql+psycopg",
                username=self.db_user,
                password=self.db_password,
                host=self.db_host,
                port=self.db_port,
                database=self.db_name,
            )
        return self.database_url


def load_aws_secrets(s: Settings) -> None:
    """EC2 上で、ログイン用の鍵と OpenAI のキーを Secrets Manager から読み込む。"""
    import boto3

    client = boto3.client("secretsmanager", region_name=s.aws_region)
    if s.jwt_secret is None:
        app_secret = json.loads(client.get_secret_value(SecretId=s.app_secret_id)["SecretString"])
        s.jwt_secret = app_secret["jwt_secret"]
    if s.openai_api_key is None:
        value = client.get_secret_value(SecretId=s.openai_secret_id)["SecretString"].strip()
        # キーが入るまでは CDK が作った仮の値が入っている
        s.openai_api_key = value if value.startswith("sk-") else None


settings = Settings()
if settings.on_aws:
    load_aws_secrets(settings)
if settings.jwt_secret is None:
    if settings.on_aws:
        raise RuntimeError("JWT の鍵が読み込めませんでした")
    settings.jwt_secret = "local-dev-only"
