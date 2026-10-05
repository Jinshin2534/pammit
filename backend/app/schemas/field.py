"""農園画面と今日のひとこと。"""
from datetime import date, datetime, time

from pydantic import BaseModel, Field

from app.schemas.plots import WorkType


class TomorrowWeather(BaseModel):
    date: date
    temp_max: float | None = None
    temp_min: float | None = None
    precip_mm: float | None = None
    weather: str | None = Field(default=None, examples=["晴れ"])


class AdviceOut(BaseModel):
    rule: str = Field(description="no_data / rain / below_now / below_tomorrow / hot_and_drying / ok")
    message: str = Field(examples=["今すぐの灌水は必要なさそうです。"])


class SuggestedSchedule(BaseModel):
    """「確認を明日の予定に追加」で開く予定入力画面の初期値。担当は空にしておく。

    型は `POST /schedules` と同じ。アプリは入力画面で確かめてもらってから、`client_event_id` を足して送る。
    """

    plot_id: int
    date: date
    start_time: time = Field(examples=["08:00"])
    end_time: time = Field(examples=["09:00"])
    work_types: list[WorkType]
    note: str


class FieldSummary(BaseModel):
    plot_id: int
    plot_name: str
    measured_at: datetime | None = Field(default=None, description="最新の測定時刻")
    soil_moisture_pct: float | None = Field(default=None, description="現在の土壌水分。校正値がない農地では null")
    soil_change_24h: float | None = Field(default=None, description="24時間前との差（ポイント）")
    soil_forecast_tomorrow: float | None = Field(default=None, description="明日9時の予測。直近24時間の変化を直線で延ばす")
    soil_check_pct: float = Field(description="確認の目安（%）")
    calibrated: bool = Field(description="土壌水分の校正値が入っているか")
    temperature: float | None = None
    humidity: float | None = None
    pressure: float | None = None
    tomorrow: TomorrowWeather
    advice: AdviceOut
    suggested_schedule: SuggestedSchedule | None = Field(
        default=None, description="null のときは「確認を明日の予定に追加」を出さない（明日すでに灌水の予定があるときも null）")


class DailyAdviceOut(BaseModel):
    date: date
    summary: str = Field(description="ホームに出す短い文")
    body: str = Field(description="「詳しく」で出す説明")
    generated_at: datetime
