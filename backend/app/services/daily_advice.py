"""今日のひとこと。予定・農園の状態・天気をまとめ、LLM に短い文にしてもらう。

LLM が使えないときは、同じ材料から決まった形の文を作る。
"""
import json
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DailyAdvice, Farm, Plot, Schedule
from app.services import llm
from app.services.field import field_summary
from app.services.weather import forecast_for, weather_word

SYSTEM = (
    "あなたはすだち農家の作業を手伝うアシスタントです。"
    "渡された材料だけを使い、今日の作業についてのひとことを日本語で書きます。"
    "材料にないことは書きません。灌水の量や農薬の名前は断定しません。"
    'JSON で {"summary": "40字以内のひとこと", "body": "200字以内の説明"} を返します。'
    "body の最後に、最終的な判断は畑の様子と農家さんの判断を優先するよう一文添えます。"
    "経験のある人を指すときは「農家さん」と呼びます。"
)


def build_context(db: Session, farm: Farm, day: date) -> dict:
    plots = list(db.scalars(select(Plot).where(Plot.farm_id == farm.id).order_by(Plot.id)))
    schedules = list(db.scalars(
        select(Schedule).where(Schedule.farm_id == farm.id, Schedule.date == day).order_by(Schedule.start_time)))
    weather = forecast_for(db, plots[0].id, day) if plots else None
    return {
        "date": day.isoformat(),
        "weather_today": {
            "weather": weather_word(weather.weather_code), "temp_max": weather.temp_max,
            "precip_mm": weather.precip_mm,
        } if weather else None,
        "schedules": [
            {"time": f"{s.start_time:%H:%M}" if s.start_time else None, "plot": s.plot.name,
             "work_types": s.work_types, "assignees": [u.name for u in s.assignees]}
            for s in schedules
        ],
        "fields": [
            {"plot": f["plot_name"], "soil_moisture_pct": f["soil_moisture_pct"], "advice": f["advice"]["message"]}
            for f in (field_summary(db, p) for p in plots)
        ],
    }


def fallback_text(context: dict) -> tuple[str, str]:
    schedules = context["schedules"]
    needs_check = [f for f in context["fields"] if "確認" in f["advice"]]
    if schedules:
        first = schedules[0]
        summary = f"今日は{first['plot']}で{'・'.join(first['work_types'])}の予定です。"
    else:
        summary = "今日の予定はまだ入っていません。"
    lines = [summary]
    for f in needs_check:
        lines.append(f"{f['plot']}: {f['advice']}")
    w = context["weather_today"]
    if w and w["weather"]:
        lines.append(f"今日の天気は{w['weather']}、最高気温は{w['temp_max']}℃の予報です。")
    lines.append("最終的な判断は、畑の様子と農家さんの判断を優先してください。")
    return summary, "\n".join(lines)


def generate(db: Session, farm: Farm, day: date) -> DailyAdvice:
    """その日のひとことを作って保存する。すでにあれば作り直す。"""
    context = build_context(db, farm, day)
    result = llm.complete_json(SYSTEM, json.dumps(context, ensure_ascii=False, default=str))
    if result and result.get("summary") and result.get("body"):
        summary, body, model = result["summary"], result["body"], settings.openai_model
    else:
        (summary, body), model = fallback_text(context), "template"

    advice = db.scalar(select(DailyAdvice).where(DailyAdvice.farm_id == farm.id, DailyAdvice.date == day))
    if advice is None:
        advice = DailyAdvice(farm_id=farm.id, date=day)
        db.add(advice)
    advice.summary, advice.body, advice.context, advice.model = summary, body, json.loads(
        json.dumps(context, ensure_ascii=False, default=str)), model
    advice.generated_at = datetime.now(timezone.utc)
    db.commit()
    return advice


def get_or_generate(db: Session, farm: Farm, day: date) -> DailyAdvice:
    advice = db.scalar(select(DailyAdvice).where(DailyAdvice.farm_id == farm.id, DailyAdvice.date == day))
    return advice or generate(db, farm, day)
