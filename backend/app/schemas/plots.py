"""園地。`cultivation_type` がシステム全体の分岐の起点になる。"""
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class CultivationType(str, Enum):
    """栽培形態。ハウスと露地で収穫期が約2ヶ月ずれ、土壌水分の由来も違う。

    - `house` … 土壌水分は灌水のみ。気象APIの降水量は使わない
    - `open_field` … 降水＋灌水。気象APIを使う
    """

    house = "house"
    open_field = "open_field"


class Plot(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": 3,
                "farm_id": 1,
                "name": "3番ハウス",
                "area_a": 12.5,
                "latitude": 33.9705,
                "longitude": 134.3369,
                "cultivation_type": "house",
                "notes": None,
            }
        }
    )

    id: int
    farm_id: int
    name: str = Field(description="農家さんが普段呼んでいる名前", examples=["3番ハウス"])
    area_a: float | None = Field(default=None, description="面積（アール）")
    latitude: float | None = Field(default=None, description="気象データの取得に使う")
    longitude: float | None = None
    cultivation_type: CultivationType
    notes: str | None = None


class WorkType(str, Enum):
    """作業種別。

    帽子をかぶる作業（摘果・摘葉・収穫）はセッションから **完全自動で記録** される。
    それ以外は選択式UIで3タップ。
    """

    thinning_fruit = "摘果"
    thinning_leaf = "摘葉"
    harvest = "収穫"
    spray = "消毒"
    fertilize = "施肥"
    prune = "剪定"
    weed = "除草"
    irrigate = "灌水"
