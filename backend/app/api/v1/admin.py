from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/progress",
    summary="園地ごとの進捗",
    description="農家さんが「誰にどこを教えるべきか」を判断するための画面に使う。**最小限に留める。**",
)
async def get_progress(plot_id: int | None = None) -> dict:
    return {"plots": []}


@router.get(
    "/workers",
    summary="作業者ごとの実績",
    description="AI一致率を参考値として表示し、農家さんが `skill_level` を上げる判断材料にする。",
)
async def get_workers() -> dict:
    return {"workers": []}
