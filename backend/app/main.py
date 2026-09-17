from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from . import catalog, files, orders
from .config import Settings, settings
from .database import create_database
from .middleware import BodySizeLimitMiddleware


def create_app(config: Settings = settings):
    @asynccontextmanager
    async def lifespan(application):
        engine, sessions = create_database(config.data_dir)
        application.state.sessions = sessions
        application.state.settings = config
        yield
        engine.dispose()

    application = FastAPI(title="PrintHub API", lifespan=lifespan)

    @application.exception_handler(HTTPException)
    async def http_error(_request: Request, error: HTTPException):
        return JSONResponse({"code": error.status_code, "message": str(error.detail)}, status_code=error.status_code)

    @application.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, error: RequestValidationError):
        # 只回错误说明，别把密码或令牌原样带回去。
        message = "；".join(f"{'.'.join(map(str, item['loc'][1:]))}: {item['msg']}" for item in error.errors())
        return JSONResponse({"code": 422, "message": message}, status_code=422)

    @application.middleware("http")
    async def no_store(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    application.include_router(catalog.router)
    application.include_router(files.router)
    application.include_router(orders.router)
    application.add_middleware(BodySizeLimitMiddleware, max_file_size=config.max_file_size)
    return application


app = create_app()
