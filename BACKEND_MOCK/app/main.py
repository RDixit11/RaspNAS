"""Uruchomienie: uvicorn app.main:create_app --factory --reload"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import RedirectResponse

from app.auth import user_from_request
from app.config import Settings
from app.deps import get_current_user
from app.models import Database, User
from app.routers import account, auth, backups, files, logs, nodes, shares, users
from app.seed import clear_files, seed
from app.storage import PoolStorage
from app.store import Store


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    store = Store(settings.db_path)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        # Mock niczego nie przechowuje: każdy start (np. docker compose up) zaczyna od czystych danych
        # przykładowych, a zatrzymanie (docker compose stop/down) czyści tempPliki.
        clear_files(settings)
        settings.nodes_dir.mkdir(parents=True, exist_ok=True)
        store.replace(seed(settings) if settings.seed_sample_data else Database())
        yield
        clear_files(settings)

    # dokumentacja API też tylko po zalogowaniu — wbudowane /docs i /openapi.json są wyłączone
    app = FastAPI(title="NAS — koordynator (BACKEND_MOCK)", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.settings = settings
    app.state.store = store
    app.state.storage = PoolStorage(settings.nodes_dir)

    for module in (auth, account, nodes, shares, files, users, logs, backups):
        app.include_router(module.router, prefix="/api")

    @app.get("/api/health", tags=["system"])
    def health():
        return {"status": "ok"}

    @app.get("/api/openapi.json", include_in_schema=False)
    def openapi_schema(_: User = Depends(get_current_user)):
        return app.openapi()

    @app.get("/api/docs", include_in_schema=False)
    def docs(request: Request):
        try:
            user_from_request(request, store.read())
        except HTTPException:
            return RedirectResponse("/login")
        return get_swagger_ui_html(openapi_url="/api/openapi.json", title="NAS — koordynator")

    return app
