from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "パミット API"
    version: str = "0.1.0"
    # 実装が進むまでスタブ応答を返す（センサー受信は実装済み）
    stub_mode: bool = True

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


settings = Settings()
