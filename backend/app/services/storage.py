"""ファイルの置き場所。AWS では S3、ローカルとテストではフォルダに置く。"""
from pathlib import Path

from app.core.config import settings


def _s3():
    import boto3

    return boto3.client("s3", region_name=settings.aws_region)


def put(key: str, data: bytes, content_type: str) -> None:
    if settings.upload_bucket:
        _s3().put_object(Bucket=settings.upload_bucket, Key=key, Body=data, ContentType=content_type)
    else:
        path = Path(settings.local_upload_dir) / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def presigned_url(key: str, expires_in: int) -> str | None:
    """一時的に開ける URL。S3 がない環境では None。"""
    if not settings.upload_bucket:
        return None
    return _s3().generate_presigned_url(
        "get_object", Params={"Bucket": settings.upload_bucket, "Key": key}, ExpiresIn=expires_in)
