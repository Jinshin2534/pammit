from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_plot_in_farm, owner_user
from app.db import get_db
from app.models import Plot as PlotRow
from app.models import User
from app.schemas.plots import Plot, PlotCreate, PlotUpdate

router = APIRouter(prefix="/plots", tags=["plots"])


@router.get("", response_model=list[Plot], summary="農園の一覧")
def list_plots(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[PlotRow]:
    return list(db.scalars(select(PlotRow).where(PlotRow.farm_id == user.farm_id).order_by(PlotRow.id)))


@router.get("/{plot_id}", response_model=Plot, summary="農園の詳細")
def get_plot(plot_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> PlotRow:
    return get_plot_in_farm(db, plot_id, user.farm_id)


@router.post("", response_model=Plot, status_code=status.HTTP_201_CREATED, summary="農園を登録する（管理者）")
def create_plot(body: PlotCreate, owner: User = Depends(owner_user), db: Session = Depends(get_db)) -> PlotRow:
    plot = PlotRow(farm_id=owner.farm_id, **body.model_dump())
    db.add(plot)
    db.commit()
    return plot


@router.patch(
    "/{plot_id}",
    response_model=Plot,
    summary="農園の情報を変える（管理者）",
    description="ハウス / 露地の区別、土壌水分の目安と校正値もここで変える。",
)
def update_plot(
    plot_id: int, body: PlotUpdate, owner: User = Depends(owner_user), db: Session = Depends(get_db)
) -> PlotRow:
    plot = get_plot_in_farm(db, plot_id, owner.farm_id)
    for field, value in body.model_dump(exclude_unset=True, mode="json").items():
        if value is None and field in ("name", "cultivation_type", "soil_check_pct"):
            continue
        setattr(plot, field, value)
    db.commit()
    return plot
