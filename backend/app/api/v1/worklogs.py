from datetime import date

from fastapi import APIRouter, Query, status

from app.schemas.worklogs import WorkLog, WorkLogCreate, WorkLogDetail, WorkLogSource, WorkLogUpdate

router = APIRouter(prefix="/work-logs", tags=["work-logs"])


@router.post(
    "",
    response_model=WorkLog,
    status_code=status.HTTP_201_CREATED,
    summary="作業ログを記録する",
    description=(
        "選択式UI（園地 → 作業種別 → 保存）の3タップから呼ぶ。\n\n"
        "摘果・摘葉・収穫は帽子のセッションから**自動記録**されるため、このAPIは使わない。\n\n"
        "**`detail` は全項目が任意。** 空でも保存できる。"
        "必須にすると入力が止まり、手書きに戻る。"
    ),
)
async def create_work_log(body: WorkLogCreate) -> WorkLog:
    d = body.detail
    return WorkLog(
        id=1, plot_id=body.plot_id, user_id=7, work_type=body.work_type,
        worked_on=body.worked_on, source=WorkLogSource.manual, detail=d,
        incomplete=any(v is None for v in (d.pesticide, d.dilution, d.amount_l)),
    )


@router.get("", response_model=list[WorkLog], summary="作業ログ一覧")
async def list_work_logs(
    plot_id: int | None = None,
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    incomplete: bool | None = Query(default=None, description="未補完のものだけ絞り込む"),
) -> list[WorkLog]:
    return []


@router.patch(
    "/{work_log_id}",
    response_model=WorkLog,
    summary="薬剤名などをあとから補完する",
    description="その場では「消毒した」だけ記録し、詳細は帰宅後に埋める運用を想定している。",
)
async def update_work_log(work_log_id: int, body: WorkLogUpdate) -> WorkLog:
    d = body.detail
    return WorkLog(
        id=work_log_id, plot_id=3, user_id=7, work_type="消毒",  # type: ignore[arg-type]
        worked_on=date(2026, 8, 16), source=WorkLogSource.manual, detail=d,
        incomplete=any(v is None for v in (d.pesticide, d.dilution, d.amount_l)),
    )
