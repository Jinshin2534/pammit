from fastapi import APIRouter

from app.api.v1 import auth, evaluation, plots, schedules, sensors, sessions, users, worklogs

api_router = APIRouter(prefix="/api/v1")
# auth は users より先に登録する（PATCH /users/me を /users/{user_id} より先に当てるため）
for r in (auth.router, users.router, plots.router, schedules.router, sessions.router, worklogs.router,
          sensors.router, evaluation.router):
    api_router.include_router(r)
