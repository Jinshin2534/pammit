"""エラー応答の形をそろえる。

    {"error": {"code": "...", "message": "...", "detail": {...}}}
"""
from typing import Any, NoReturn

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

_DEFAULT_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "invalid_request",
    423: "locked",
}


def api_error(status: int, code: str, message: str, detail: dict[str, Any] | None = None) -> NoReturn:
    raise HTTPException(status_code=status, detail={"code": code, "message": message, "detail": detail})


def _body(code: str, message: str, detail: Any = None) -> dict:
    return {"error": {"code": code, "message": message, "detail": detail}}


async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        body = _body(exc.detail["code"], exc.detail["message"], exc.detail.get("detail"))
    else:
        body = _body(_DEFAULT_CODES.get(exc.status_code, "error"), str(exc.detail))
    return JSONResponse(body, status_code=exc.status_code, headers=exc.headers)


async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    return JSONResponse(_body("invalid_request", "リクエストの形が正しくありません", {"errors": errors}), status_code=422)


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
