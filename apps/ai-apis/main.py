"""Unified ASGI entrypoint for all AI API services."""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path
from types import ModuleType
from typing import Any, Callable

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi


BASE_DIR = Path(__file__).resolve().parent
DEBUG_ARENA_DIR = BASE_DIR / "debug-arena"
MISINFOSIM_DIR = BASE_DIR / "misinfosim"


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


def _load_module(module_name: str, module_path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from path: {module_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _load_package(package_name: str, package_dir: Path) -> None:
    if package_name in sys.modules:
        return

    init_file = package_dir / "__init__.py"
    spec = importlib.util.spec_from_file_location(
        package_name,
        init_file,
        submodule_search_locations=[str(package_dir)],
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to initialize package from path: {init_file}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[package_name] = module
    spec.loader.exec_module(module)


def _load_app_factory(package_dir: Path, package_alias: str) -> Callable[[], FastAPI]:
    _load_package(package_alias, package_dir)

    module_name = f"{package_alias}.main"
    main_path = package_dir / "main.py"
    module = sys.modules.get(module_name)
    if module is None:
        module = _load_module(module_name, main_path)

    create_app = getattr(module, "create_app", None)
    if create_app is None:
        raise RuntimeError(f"Missing create_app() in module: {main_path}")
    return create_app


def create_app() -> FastAPI:
    load_dotenv(BASE_DIR / ".env", override=True)
    load_dotenv(override=True)
    show_docs = _docs_enabled()

    app = FastAPI(
        title="CodeContagion Unified AI APIs",
        description="Single ASGI server exposing Debug Arena and MisinfoSim AI endpoints.",
        version="1.0.0",
        docs_url="/docs" if show_docs else None,
        redoc_url="/redoc" if show_docs else None,
        openapi_url="/openapi.json" if show_docs else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    debug_arena_create_app = _load_app_factory(
        DEBUG_ARENA_DIR, "codecontagion_debug_arena"
    )
    misinfosim_create_app = _load_app_factory(
        MISINFOSIM_DIR, "codecontagion_misinfosim"
    )

    debug_arena_app = debug_arena_create_app(enable_cors=False, enable_docs=show_docs)
    misinfosim_app = misinfosim_create_app(enable_cors=False, enable_docs=show_docs)

    app.state.debug_arena_app = debug_arena_app
    app.state.misinfosim_app = misinfosim_app

    app.mount("/debug-arena", debug_arena_app)
    app.mount("/misinfosim", misinfosim_app)

    @app.get("/", tags=["system"])
    async def root() -> dict[str, object]:
        return {
            "message": "CodeContagion Unified AI APIs",
            "status": "online",
            "services": {
                "debug_arena": {
                    "base_path": "/debug-arena",
                    "endpoints": ["/coach", "/heckler", "/debrief"],
                    **({"docs": "/debug-arena/docs"} if show_docs else {}),
                },
                "misinfosim": {
                    "base_path": "/misinfosim",
                    "endpoints": ["/chat"],
                    **({"docs": "/misinfosim/docs"} if show_docs else {}),
                },
            },
        }

    @app.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema

        merged_schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )

        def _rewrite_refs(value: object, mount_namespace: str) -> object:
            if isinstance(value, dict):
                for key, nested_value in value.items():
                    if key == "$ref" and isinstance(nested_value, str):
                        parts = nested_value.split("/")
                        if len(parts) == 4 and parts[1] == "components":
                            component_type = parts[2]
                            name = parts[3]
                            value[key] = (
                                f"#/components/{component_type}/{mount_namespace}__{name}"
                            )
                    else:
                        _rewrite_refs(nested_value, mount_namespace)
            elif isinstance(value, list):
                for item in value:
                    _rewrite_refs(item, mount_namespace)
            return value

        for mount_path, sub_app in (
            ("/debug-arena", app.state.debug_arena_app),
            ("/misinfosim", app.state.misinfosim_app),
        ):
            sub_schema = sub_app.openapi()
            mount_namespace = mount_path.strip("/").replace("-", "_")

            rewritten_paths: dict[str, Any] = {}
            for path, path_item in sub_schema.get("paths", {}).items():
                rewritten_paths[f"{mount_path}{path}"] = _rewrite_refs(
                    path_item, mount_namespace
                )

            merged_schema["paths"].update(rewritten_paths)

            components = sub_schema.get("components", {})
            if not components:
                continue

            merged_components = merged_schema.setdefault("components", {})
            for component_type, values in components.items():
                target = merged_components.setdefault(component_type, {})
                for name, definition in values.items():
                    prefixed_name = f"{mount_namespace}__{name}"
                    target[prefixed_name] = definition

        app.openapi_schema = merged_schema
        return app.openapi_schema

    if show_docs:
        app.openapi = custom_openapi  # type: ignore[method-assign]

    return app


app = create_app()
