from fastapi import APIRouter, status

from app.api.v1._stub import now
from app.schemas.evaluation import EvaluationRun, EvaluationRunCreate

router = APIRouter(prefix="/evaluation-runs", tags=["evaluation"])


@router.post(
    "",
    response_model=EvaluationRun,
    status_code=status.HTTP_201_CREATED,
    summary="評価結果を投入する",
    description=(
        "KPI「作業の質 95%」の根拠となる**唯一の**数字。\n\n"
        "判定フィードバック機能を実装しないため、運用中の修正データは存在しない。\n"
        "AI担当が評価用データセットで測った結果をここに入れる。\n\n"
        "**`sample_count` を必須にしている。**"
        "「95%」だけより「サンプル420件で92.4%」のほうが信頼される。"
    ),
)
async def create_evaluation_run(body: EvaluationRunCreate) -> EvaluationRun:
    return EvaluationRun(id=1, created_at=now(), **body.model_dump())


@router.get("", response_model=list[EvaluationRun], summary="モデルバージョン別の一致率一覧")
async def list_evaluation_runs() -> list[EvaluationRun]:
    return []
