from fastapi import APIRouter

from app.api.v1 import admin, assistant, auth, evaluation, plots, schedule, sensors, sessions, worklogs

api_router = APIRouter(prefix="/api/v1")
for r in (auth.router, plots.router, sessions.router, worklogs.router,
          schedule.router, sensors.router, assistant.router,
          evaluation.router, admin.router):
    api_router.include_router(r)
