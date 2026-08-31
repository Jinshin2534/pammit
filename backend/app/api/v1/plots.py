from fastapi import APIRouter, HTTPException

from app.api.v1._stub import PLOTS
from app.schemas.plots import Plot

router = APIRouter(tags=["masters"])


@router.get("/plots", response_model=list[Plot], summary="園地一覧")
async def list_plots() -> list[Plot]:
    return [Plot(**p) for p in PLOTS]


@router.get(
    "/plots/{plot_id}",
    response_model=Plot,
    summary="園地詳細",
    description="`cultivation_type` を含む。これがシステム全体の分岐の起点になる。",
)
async def get_plot(plot_id: int) -> Plot:
    for p in PLOTS:
        if p["id"] == plot_id:
            return Plot(**p)
    raise HTTPException(status_code=404, detail="園地が見つかりません")
