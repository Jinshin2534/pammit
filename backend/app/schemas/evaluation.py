"""判定精度の集計。KPI「作業の質 95%」の根拠となる唯一の数字。

判定フィードバック機能を実装しないため、運用中の修正データは存在しない。
**評価用データセットに対する一致率だけが根拠になる。**
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.plots import WorkType


class EvaluationBreakdown(BaseModel):
    n: int
    correct: int


class EvaluationRunCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "model_version": "sudachi-v0.3",
                "dataset": "2026-09-摘果-評価用",
                "work_type": "摘果",
                "sample_count": 420,
                "agreement_rate": 0.924,
                "breakdown": {
                    "take": {"n": 210, "correct": 198},
                    "keep": {"n": 210, "correct": 190},
                },
                "note": "ベテラン農家の判定を正解とする",
            }
        }
    )

    model_version: str
    dataset: str = Field(description="評価用データセットの識別名")
    work_type: WorkType = Field(
        description="**測定対象は摘果・摘葉とする。** 収穫のサイズ判断は2日で慣れるため、"
        "そこで高い数値を出しても製品価値の証明にならない"
    )
    sample_count: int = Field(
        ge=1,
        description="**必須。** 「95%」より「サンプル420件で92.4%」のほうが信頼される",
    )
    agreement_rate: float = Field(ge=0.0, le=1.0, description="ベテラン判定との一致率")
    breakdown: dict[str, EvaluationBreakdown] | None = None
    note: str | None = None


class EvaluationRun(EvaluationRunCreate):
    id: int
    created_at: datetime
