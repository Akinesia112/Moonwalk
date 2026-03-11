from pathlib import Path
from typing import List

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompt"


def read_prompt(filename: str) -> str:
    """Read a prompt file and return as a single string."""
    path = PROMPT_DIR / f"{filename}.txt"
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8").strip()


def read_prompt_list(filename: str) -> List[str]:
    """Read a prompt file and return as list of non-empty lines."""
    text = read_prompt(filename)
    return [line.strip() for line in text.splitlines() if line.strip()]