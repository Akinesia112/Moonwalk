"""
shared.py
Holds shared mutable state and singleton objects used across the app.
"""
import threading
import asyncio
import os
from typing import Dict, Optional

from autogen_core import AgentRuntime
from autogen_ext.models.openai import OpenAIChatCompletionClient
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# --- Model config ---
model_general = "gpt-4o"
model_agent = os.getenv("MODEL_AGENT", "gpt-4o-mini")
model_image_generation = "gpt-4o"

model_client = OpenAIChatCompletionClient(
    model=model_agent,
    temperature=1,
)

model_client_light = OpenAIChatCompletionClient(
    model="gpt-4o-mini",
    temperature=1,
)

# --- Runtime ---
runtime: Optional[AgentRuntime] = None
response_queues: Dict[str, asyncio.Queue] = {}

# --- Language ---
current_language: str = "en"

def set_current_project_language(language: str):
    global current_language
    current_language = language

def get_current_project_language() -> str:
    return current_language

# --- Background task tracking ---
task_status: Dict[str, str] = {}
task_events: Dict[str, asyncio.Event] = {}
lock = threading.Lock()

# --- Misc globals ---
iteration_id: int = -1
generation_type: str = "environment"
data_path: str = "data"