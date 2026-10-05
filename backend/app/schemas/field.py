"""農園画面と今日のひとこと。"""
from datetime import date, datetime

from pydantic import BaseModel, Field


class TomorrowWeather(BaseModel):
    date: date
    temp_max: float | None = None
    temp_min: float | None = None
    precip_mm: float | None = None
    weather: str | None = Field(default=None, examples=["晴れ"])


class AdviceOut(BaseModel):
    """農園画面の助言カード。上から区分ラベル・見出し・補足の3段で出す。"""

    rule: str = Field(description="not_calibrated / no_data / rain_expected / below_now / below_tomorrow / hot_and_drying / ok")
    category: str = Field(description="区分ラベル", examples=["水管理・様子を見ましょう"])
    headline: str = Field(description="見出し", examples=["今すぐの灌水は必要なさそうです"])
    detail: str = Field(description="補足", examples=["乾燥が進んでいます。明日午前に土の状態を確認しましょう。"])
    message: str = Field(
        description="見出しと補足をつないだ1文。互換のため残す。画面では category / headline / detail を使う",
        examples=["今すぐの灌水は必要なさそうです。乾燥が進んでいます。明日午前に土の状態を確認しましょう。"])


class SoilNote(BaseModel):
    """データ推移の土壌水分タブに出す解説。"""

    headline: str = Field(examples=["明日午前は、確認のタイミング"])
    body: str = Field(examples=["乾燥が続くと、目安の28%を下回る予測。土の状態を見て灌水を検討しましょう。"])


class SuggestedSchedule(BaseModel):
    """「確認を明日の予定に追加」で `POST /schedules` に送る中身（`client_event_id` と担当を足して送る）。"""

    plot_id: int
    date: date
    start_time: str
    end_time: str
    work_types: list[str]
    note: str


class FieldSummary(BaseModel):
    plot_id: int
    plot_name: str
    measured_at: datetime | None = Field(default=None, description="最新の測定時刻。直近30時間に測定がなければ null")
    last_measured_at: datetime | None = Field(
        default=None, description="最後の測定時刻（30時間より前も含む）。一度も測っていなければ null")
    has_sensor: bool = Field(description="農地にセンサー端末が登録されているか")
    soil_moisture_pct: float | None = Field(default=None, description="現在の土壌水分。校正値がない農地では null")
    soil_change_24h: float | None = Field(
        default=None, description="24時間前（前後2時間以内で一番近い測定）との差（ポイント）。その時間に測定がなければ null")
    soil_drying: bool = Field(description="乾燥傾向。24時間で3ポイント以上下がっているとき true")
    soil_forecast_tomorrow: float | None = Field(default=None, description="明日9時の予測。直近24時間の変化を直線で延ばす")
    soil_check_pct: float = Field(description="確認の目安（%）")
    calibrated: bool = Field(description="土壌水分の校正値が入っているか")
    temperature: float | None = None
    humidity: float | None = None
    pressure: float | None = None
    tomorrow: TomorrowWeather
    advice: AdviceOut
    soil_note: SoilNote | None = Field(default=None, description="データ推移の土壌水分タブの解説。土壌水分の値がないときは null")
    suggested_schedule: SuggestedSchedule | None = Field(
        default=None, description="null のときは「確認を明日の予定に追加」を出さない（明日すでに灌水の予定があるときも null）")


class DailyAdviceOut(BaseModel):
    date: date
    summary: str = Field(description="ホームに出す短い文")
    body: str = Field(description="「詳しく」で出す説明")
    generated_at: datetime
