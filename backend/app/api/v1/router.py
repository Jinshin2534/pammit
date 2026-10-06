from fastapi import APIRouter

from app.api.v1 import auth, chat, evaluation, field, journals, plots, schedules, sensors, sessions, speech, users, worklogs

api_router = APIRouter(prefix="/api/v1")
# 固定のパスを先に登録する（/users/me を /users/{user_id} より、/plots/summary を /plots/{plot_id} より先に当てるため）
for r in (auth.router, users.router, field.router, plots.router, schedules.router, sessions.router, worklogs.router,
          chat.router, journals.router, sensors.router, evaluation.router, speech.router):
    api_router.include_router(r)
