from fastapi import APIRouter, HTTPException, status

from app.api.v1._stub import PLOTS, SESSION_CONFIG, now
from app.schemas.detections import DetectionBatch, DetectionBatchResult
from app.schemas.sessions import WorkSession, WorkSessionCreate, WorkSessionFinish

router = APIRouter(prefix="/work-sessions", tags=["work-sessions"])


@router.post(
    "",
    response_model=WorkSession,
    status_code=status.HTTP_201_CREATED,
    summary="作業セッションを開始する",
    description=(
        "**レスポンスに判定設定を全部載せる。ここが要点。**\n\n"
        "アプリは開始時の1リクエストで、判定に必要なものを全部持てる。\n"
        "以降は**オフラインで判定が回る**（本選会場にネット環境はない）。\n"
        "判定結果の送信が失敗しても、端末に溜めて後で再送すればよい。"
    ),
)
async def create_session(body: WorkSessionCreate) -> WorkSession:
    plot = next((p for p in PLOTS if p["id"] == body.plot_id), None)
    if plot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="園地が見つかりません")
    return WorkSession(
        id=1024,
        plot_id=plot["id"],
        plot_name=plot["name"],
        cultivation_type=plot["cultivation_type"],
        work_type=body.work_type,
        user_id=7,
        started_at=body.started_at,
        config=SESSION_CONFIG,  # type: ignore[arg-type]
    )


@router.post("/{session_id}/finish", response_model=WorkSession, summary="作業セッションを終了する")
async def finish_session(session_id: int, body: WorkSessionFinish) -> WorkSession:
    plot = PLOTS[0]
    return WorkSession(
        id=session_id,
        plot_id=plot["id"],
        plot_name=plot["name"],
        cultivation_type=plot["cultivation_type"],
        work_type="摘果",  # type: ignore[arg-type]
        user_id=7,
        started_at=now(),
        ended_at=body.ended_at,
        config=SESSION_CONFIG,  # type: ignore[arg-type]
    )


@router.post(
    "/{session_id}/detections",
    response_model=DetectionBatchResult,
    summary="判定結果をまとめて送る",
    description=(
        "**30秒ごとにバッチで送る。** LTEが瞬断しても失われないようにするため。\n\n"
        "`client_event_id` に UNIQUE 制約がある。"
        "**重複はエラーにせず無視する**（再送を安全にするため）。\n\n"
        "1リクエストの上限は200件。"
    ),
)
async def post_detections(session_id: int, body: DetectionBatch) -> DetectionBatchResult:
    return DetectionBatchResult(accepted=len(body.detections), duplicated=0, rejected=0)
