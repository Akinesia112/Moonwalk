# app.py
from __future__ import annotations

import argparse
import os
from pathlib import Path
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from autogen_core import SingleThreadedAgentRuntime
from core.registor_agent import register_evaluation_agents
import shared
from shared import model_client
from config import Config
from routes.auth import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Starting up application...")
    
    # Initialize runtime
    shared.runtime = SingleThreadedAgentRuntime()

    # Set project language
    shared.set_current_project_language(os.environ.get("PROJECT_LANGUAGE", "en"))
    print(f"using project_language {shared.get_current_project_language()}")

    # Register evaluation agents
    await register_evaluation_agents(shared.runtime, model_client)
    shared.runtime.start()
    print("AutoGen Runtime started.")
    
    # Optional: seed mock data if needed
    # from dev_seed import seed_mock_current_project
    # seed_mock_current_project(project_id="123", user_image_id=1, generated_image_id=3)
    
    yield
    
    # Shutdown logic
    print("Shutting down application...")
    if shared.runtime:
        await shared.runtime.stop_when_idle()
    print("AutoGen Runtime stopped.")

def create_app(config_class=Config) -> FastAPI:
    # disable_docs = os.getenv("DISABLE_DOCS", "false").lower() == "true"
    app = FastAPI(
        lifespan=lifespan,
        docs_url=None, redoc_url=None, openapi_url=None
        # docs_url="/docs" if not disable_docs else None,
        # redoc_url="/redoc" if not disable_docs else None,
        # openapi_url="/openapi.json" if not disable_docs else None,
    )
    app.state.config = config_class

    # --- CORS middleware -------------------------------------------------- #
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Ensure folders exist --------------------------------------------- #
    for key in ("DATA_DIR", "OUTPUT_FOLDER"):
        Path(getattr(config_class, key)).mkdir(parents=True, exist_ok=True)

    setattr(config_class, "METADATA_FILE", getattr(config_class, "METADATA_FILE", "metadata.json"))

    # --- Register routers ------------------------------------------------- #
    from routes.style import router as style_router
    app.include_router(auth_router)
    app.include_router(style_router)

    return app

app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=app.state.config.HOST,
        port=app.state.config.PORT,
        reload=True
    )