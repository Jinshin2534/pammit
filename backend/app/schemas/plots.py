"""農地と作業の種類。"""
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class CultivationType(str, Enum):
    house = "house"
    open_field = "open_field"


class WorkType(str, Enum):
    """作業の種類。帽子で判定するのは「摘果・摘葉」と「収穫」。"""

    prune = "剪定"
    irrigate = "灌水"
    fertilize = "肥料"
    thinning = "摘果・摘葉"
    harvest = "収穫"
    spray = "防除"
    mow = "草刈り"
    other = "その他"


HAT_WORK_TYPES = {WorkType.thinning, WorkType.harvest}


class Plot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str = Field(examples=["三番ハウス"])
    municipality: str | None = Field(default=None, examples=["神山町"])
    latitude: float | None = None
    longitude: float | None = None
    cultivation_type: CultivationType
    soil_check_pct: float = Field(description="灌水の助言で使う土壌水分の目安（%）")
    soil_dry_raw: int | None = Field(default=None, description="土壌水分センサーの乾燥時の生値")
    soil_wet_raw: int | None = Field(default=None, description="土壌水分センサーの飽和時の生値")


class PlotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    municipality: str | None = Field(default=None, max_length=100)


class PlotUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    municipality: str | None = Field(default=None, max_length=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    cultivation_type: CultivationType | None = None
    soil_check_pct: float | None = Field(default=None, ge=0, le=100)
    soil_dry_raw: int | None = Field(default=None, ge=0)
    soil_wet_raw: int | None = Field(default=None, ge=0)
