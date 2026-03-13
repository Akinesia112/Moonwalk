from __future__ import annotations
import os
from pathlib import Path
from contextlib import asynccontextmanager
import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from autogen_core import SingleThreadedAgentRuntime
from .agents.registor_agent import register_evaluation_agents
from . import shared as shared
from .shared import model_client
from .config import Config
from .routes.analysis import router as analysis_router
from .routes.feedback import router as feedback_router
from .routes.spec import router as spec_router
from .routes.auth import router as auth_router
from .routes.suggestion import router as suggestion_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up application...")
    shared.runtime = SingleThreadedAgentRuntime()
    shared.set_current_project_language(os.environ.get("PROJECT_LANGUAGE", "en"))
    print(f"using project_language {shared.get_current_project_language()}")
    await register_evaluation_agents(shared.runtime, model_client)
    shared.runtime.start()
    print("AutoGen Runtime started.")
    yield
    print("Shutting down application...")
    if shared.runtime:
        await shared.runtime.stop_when_idle()
    print("AutoGen Runtime stopped.")


def create_app(config_class=Config) -> FastAPI:
    app = FastAPI(
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url=None,
        openapi_url="/openapi.json",
    )
    app.state.config = config_class

    # CORS — allow frontend dev server
    allowed_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for key in ("DATA_DIR", "OUTPUT_FOLDER"):
        Path(getattr(config_class, key)).mkdir(parents=True, exist_ok=True)

    setattr(config_class, "METADATA_FILE", getattr(config_class, "METADATA_FILE", "metadata.json"))

    app.include_router(auth_router)
    app.include_router(spec_router)
    app.include_router(analysis_router)
    app.include_router(feedback_router)
    app.include_router(suggestion_router)

    # Serve uploaded files
    from fastapi.staticfiles import StaticFiles
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

    return app


app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=app.state.config.HOST,
        port=app.state.config.PORT,
        reload=True,
    )