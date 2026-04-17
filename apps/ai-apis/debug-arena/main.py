import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .api.coach_routes import router as coach_router
    from .api.heckler_routes import router as heckler_router
    from .api.debrief_routes import router as debrief_router
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from api.coach_routes import router as coach_router
    from api.heckler_routes import router as heckler_router
    from api.debrief_routes import router as debrief_router


def _docs_enabled() -> bool:
    node_env = os.getenv("NODE_ENV", "development").lower()
    raw = os.getenv("ENABLE_API_DOCS")
    if raw is None:
        return node_env != "production"
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGIN", "http://localhost:8080")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:8080"]


def create_app(enable_cors: bool = True, enable_docs: bool | None = None) -> FastAPI:
    show_docs = _docs_enabled() if enable_docs is None else enable_docs
    app = FastAPI(
        title="CodeContagion Debug Arena AI API",
        description="AI-powered Coach, Heckler, and Debrief endpoints for the Debug Arena game mode.",
        version="1.0.0",
        docs_url="/docs" if show_docs else None,
        redoc_url="/redoc" if show_docs else None,
        openapi_url="/openapi.json" if show_docs else None,
    )

    if enable_cors:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=_allowed_origins(),
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.get("/")
    async def root() -> dict[str, object]:
        return {
            "message": "CodeContagion Debug Arena AI API",
            "status": "online",
            "endpoints": ["/coach", "/heckler", "/debrief", *(['/docs'] if show_docs else [])],
        }

    app.include_router(coach_router)
    app.include_router(heckler_router)
    app.include_router(debrief_router)
    return app


app = create_app()
