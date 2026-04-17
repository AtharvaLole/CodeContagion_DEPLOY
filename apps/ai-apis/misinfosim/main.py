import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

try:
    from .api.chat_routes import router as chat_router
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from api.chat_routes import router as chat_router

load_dotenv(override=True)


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
        title="CodeContagion Misinfo Analysis API",
        description="Context-aware AI backend for critical news evaluation.",
        version="2.0.0",
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
            "message": "Welcome to CodeContagion Misinfo Simulation API",
            "status": "online",
            "endpoints": ["/chat", *(['/docs'] if show_docs else [])],
        }

    app.include_router(chat_router)
    return app


app = create_app()
