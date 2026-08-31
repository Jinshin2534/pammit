"""判定結果。

**判定計算はスマートフォン側で行う。** サーバーは閾値を配り、結果を受け取って保存するだけで、
再計算も検証もしない。ロジックの二重化を避けるため。
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import IdempotentCreate


class Verdict(str, Enum):
    """判定結果。摘果と収穫で同じ enum を使う。どちらも「今それを取るか否か」であるため。"""

    take = "take"
    keep = "keep"
    unknown = "unknown"


class ReasonCode(str, Enum):
    """判定の理由。音声文をこのコードから生成する。

    集計して「どの理由で判定されたか」をベテランの判断と突き合わせられる。
    """

    too_small = "too_small"
    too_dense = "too_dense"
    shaded = "shaded"
    damaged = "damaged"
    low_confidence = "low_confidence"


class TriggerType(str, Enum):
    """対象の特定方法。

    - `center` … トリガー時に画面中央付近の実を判定する（**主案**）
    - `auto` … 手を検出して接触判定する（将来案）
    """

    center = "center"
    auto = "auto"


class TargetClass(str, Enum):
    fruit = "fruit"
    leaf = "leaf"
    branch = "branch"
    calyx = "calyx"
    scissors = "scissors"
    hand = "hand"


class DetectionTarget(BaseModel):
    target_class: TargetClass = Field(alias="class")
    bbox: list[float] = Field(
        min_length=4, max_length=4, description="正規化座標 [x, y, w, h]", examples=[[0.42, 0.51, 0.08, 0.09]]
    )
    relative_size: float | None = Field(
        default=None,
        description="周囲の実の面積の中央値に対する比。1.0が平均的。**絶対サイズ(mm)は持たない**",
        examples=[0.62],
    )
    neighbor_count: int | None = Field(
        default=None, description="一定距離内にある fruit の数。密集度の根拠", examples=[5]
    )

    model_config = ConfigDict(populate_by_name=True)


class DetectionIn(IdempotentCreate):
    detected_at: datetime = Field(description="端末側の時刻")
    trigger_type: TriggerType
    verdict: Verdict
    reason_code: ReasonCode | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    target: DetectionTarget
    model_version: str = Field(
        description="どのモデルの判断か。**モデル改善の効果測定に必須**", examples=["sudachi-v0.3"]
    )
    image_key: str | None = Field(
        default=None, description="S3キー。Wi-Fi接続時のみアップロードするため通常は null"
    )


class DetectionBatch(BaseModel):
    """**30秒ごとにまとめて送る。** 瞬断しても失われないようにするため。"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detections": [
                    {
                        "client_event_id": "550e8400-e29b-41d4-a716-446655440000",
                        "detected_at": "2026-08-16T09:12:34+09:00",
                        "trigger_type": "center",
                        "verdict": "take",
                        "reason_code": "too_dense",
                        "confidence": 0.87,
                        "target": {
                            "class": "fruit",
                            "bbox": [0.42, 0.51, 0.08, 0.09],
                            "relative_size": 0.62,
                            "neighbor_count": 5,
                        },
                        "model_version": "sudachi-v0.3",
                        "image_key": None,
                    }
                ]
            }
        }
    )

    detections: list[DetectionIn] = Field(max_length=200, description="1リクエストの上限は200件")


class DetectionBatchResult(BaseModel):
    accepted: int = Field(description="新規に保存した件数")
    duplicated: int = Field(description="client_event_id が重複していたため無視した件数")
    rejected: int = Field(description="バリデーションで弾いた件数")
