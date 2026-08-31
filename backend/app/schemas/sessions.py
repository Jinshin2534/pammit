"""作業セッション。開始レスポンスに判定設定を全部載せるのが要点。"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import IdempotentCreate
from app.schemas.plots import CultivationType, WorkType


class ConfidenceThresholds(BaseModel):
    """信頼度の境界。低いときは「判断できません」と返す。

    初心者向けの道具が自信満々に間違えるのが、最も避けたい状態である。
    """

    high: float = Field(description="これ以上なら言い切る", examples=[0.8])
    low: float = Field(description="これ未満は unknown にする", examples=[0.5])


class JudgmentParams(BaseModel):
    """判定閾値。**コードに埋め込まず DB に持つ。**

    絶対サイズ（mm）は扱わない。スケール基準となる手袋マーカーを採用しないため、
    判定はすべて画像内の相対比較で行う。
    """

    dense_neighbor_count: int = Field(
        description="近傍にこの数以上の実があれば「混んでいる」", examples=[4]
    )
    small_relative_size: float = Field(
        description="周囲の中央値に対する面積比がこれ未満なら「小さい」", examples=[0.7]
    )
    shaded_overlap_ratio: float = Field(
        description="葉との重なり率がこれ以上なら「日が当たっていない」", examples=[0.6]
    )


class SessionConfig(BaseModel):
    """セッション開始時に一括で配る判定設定。

    **アプリは開始時の1リクエストで、判定に必要なものを全部持てる。**
    以降はオフラインで判定が回る（本選会場にネット環境はない）。
    """

    model_version_expected: str = Field(examples=["sudachi-v0.3"])
    confidence_thresholds: ConfidenceThresholds
    judgment_params: JudgmentParams


class WorkSessionCreate(IdempotentCreate):
    plot_id: int
    work_type: WorkType
    started_at: datetime


class WorkSession(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": 1024,
                "plot_id": 3,
                "plot_name": "3番ハウス",
                "cultivation_type": "house",
                "work_type": "摘果",
                "user_id": 7,
                "started_at": "2026-08-16T08:30:00+09:00",
                "ended_at": None,
                "config": {
                    "model_version_expected": "sudachi-v0.3",
                    "confidence_thresholds": {"high": 0.8, "low": 0.5},
                    "judgment_params": {
                        "dense_neighbor_count": 4,
                        "small_relative_size": 0.7,
                        "shaded_overlap_ratio": 0.6,
                    },
                },
            }
        }
    )

    id: int
    plot_id: int
    plot_name: str
    cultivation_type: CultivationType
    work_type: WorkType
    user_id: int
    started_at: datetime
    ended_at: datetime | None = None
    config: SessionConfig


class WorkSessionFinish(BaseModel):
    ended_at: datetime
