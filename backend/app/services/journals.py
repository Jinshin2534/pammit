"""農園日誌。作業ログ・センサー・天気予報から日ごとの記録を組み立て、PDF にする。"""
import io
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import JournalNote, Plot, SensorDevice, SensorReading, WeatherForecast, WorkLog
from app.schemas.plots import WorkType
from app.services.weather import weather_word

JST = timezone(timedelta(hours=9))
WORK_ORDER = [w.value for w in WorkType]


def build_days(db: Session, farm_id: int, start: date, end: date) -> list[dict]:
    plot_ids = list(db.scalars(select(Plot.id).where(Plot.farm_id == farm_id).order_by(Plot.id)))
    logs = list(db.scalars(
        select(WorkLog).where(WorkLog.farm_id == farm_id, WorkLog.worked_on >= start, WorkLog.worked_on <= end)
        .order_by(WorkLog.started_at)))
    notes = {n.date: n.note for n in db.scalars(select(JournalNote).where(
        JournalNote.farm_id == farm_id, JournalNote.date >= start, JournalNote.date <= end))}
    weather = {}
    for f in db.scalars(select(WeatherForecast).where(
            WeatherForecast.plot_id.in_(plot_ids), WeatherForecast.date >= start, WeatherForecast.date <= end)
            .order_by(WeatherForecast.plot_id)):
        weather.setdefault(f.date, weather_word(f.weather_code))

    days = []
    day = start
    while day <= end:
        day_logs = [w for w in logs if w.worked_on == day]
        temp_max, temp_min = _sensor_temps(db, plot_ids, day)
        days.append({
            "date": day,
            "weather": weather.get(day),
            "temp_max": temp_max,
            "temp_min": temp_min,
            "worker_count": len({w.user_id for w in day_logs}),
            "work_types": sorted({w.work_type for w in day_logs}, key=WORK_ORDER.index),
            "note": notes.get(day),
            "works": [
                {"start": w.started_at.astimezone(JST).strftime("%H:%M"),
                 "end": w.ended_at.astimezone(JST).strftime("%H:%M"),
                 "user_name": w.user.name, "plot_name": w.plot.name, "work_type": w.work_type}
                for w in day_logs
            ],
        })
        day += timedelta(days=1)
    return days


def _sensor_temps(db: Session, plot_ids: list[int], day: date) -> tuple[float | None, float | None]:
    """その日（日本時間）の全センサーの最高・最低気温。"""
    start = datetime.combine(day, time.min, JST).astimezone(timezone.utc)
    row = db.execute(
        select(func.max(SensorReading.temperature), func.min(SensorReading.temperature))
        .join(SensorDevice, SensorReading.sensor_device_id == SensorDevice.id)
        .where(SensorDevice.plot_id.in_(plot_ids), SensorReading.measured_at >= start,
               SensorReading.measured_at < start + timedelta(days=1))
    ).one()
    return row[0], row[1]


def render_pdf(farm_name: str, start: date, end: date, days: list[dict]) -> bytes:
    """1日1行の表と、作業のあった日の明細を A4 の PDF にする。"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    font = "HeiseiKakuGo-W5"
    pdfmetrics.registerFont(UnicodeCIDFont(font))
    title = ParagraphStyle("title", fontName=font, fontSize=16, leading=22)
    heading = ParagraphStyle("heading", fontName=font, fontSize=12, leading=18, spaceBefore=6)
    cell = ParagraphStyle("cell", fontName=font, fontSize=8.5, leading=11)
    grid = TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 8.5),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF3E8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ])

    def temp(v: float | None) -> str:
        return "" if v is None else f"{v:.1f}"

    story = [Paragraph(f"農園日誌　{farm_name}", title),
             Paragraph(f"{start:%Y年%m月%d日} 〜 {end:%Y年%m月%d日}", cell), Spacer(0, 5 * mm)]
    rows = [["日付", "天気", "最高℃", "最低℃", "人数", "作業内容", "備考"]]
    for d in days:
        rows.append([f"{d['date']:%m/%d}", Paragraph(d["weather"] or "", cell), temp(d["temp_max"]), temp(d["temp_min"]),
                     str(d["worker_count"]) if d["worker_count"] else "",
                     Paragraph(" / ".join(d["work_types"]), cell), Paragraph(d["note"] or "", cell)])
    widths = [14 * mm, 28 * mm, 14 * mm, 14 * mm, 10 * mm, 46 * mm, 54 * mm]
    story.append(Table(rows, colWidths=widths, repeatRows=1, style=grid))

    worked = [d for d in days if d["works"]]
    if worked:
        story += [Spacer(0, 6 * mm), Paragraph("作業の明細", heading)]
        for d in worked:
            story.append(Paragraph(f"{d['date']:%Y年%m月%d日}", cell))
            detail = [["時間", "作業者", "農園", "作業"]] + [
                [f"{w['start']}〜{w['end']}", w["user_name"], w["plot_name"], w["work_type"]] for w in d["works"]]
            story += [Table(detail, colWidths=[28 * mm, 50 * mm, 50 * mm, 52 * mm], style=grid), Spacer(0, 3 * mm)]

    buffer = io.BytesIO()
    SimpleDocTemplate(buffer, pagesize=A4, leftMargin=12 * mm, rightMargin=12 * mm,
                      topMargin=14 * mm, bottomMargin=14 * mm, title=f"農園日誌 {farm_name}").build(story)
    return buffer.getvalue()
