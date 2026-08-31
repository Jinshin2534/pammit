from fastapi import APIRouter

from app.schemas.auth import LoginRequest, Me, Role, SkillLevel, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="PINでログインする",
    description=(
        "農家さんが作業者を事前登録し、作業者は4桁PINでログインする。\n\n"
        "**アルバイトにアカウント登録とパスワード管理をさせるのは現実的でない。**"
    ),
)
async def login(body: LoginRequest) -> TokenResponse:
    return TokenResponse(access_token="stub.jwt.token", expires_in=43200)


@router.get("/me", response_model=Me, summary="ログイン中のユーザーを取得する")
async def me() -> Me:
    return Me(id=7, farm_id=1, name="田中", role=Role.worker, skill_level=SkillLevel.beginner)
