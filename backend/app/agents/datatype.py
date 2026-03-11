from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class AnalysisResult:
    """Result of analyzing an artwork."""
    artwork_id: str
    reference_ids: List[str]
    metrics: dict = field(default_factory=dict)
    agent_opinions: list = field(default_factory=list)
    issues: list = field(default_factory=list)
    timestamp: str = ""

@dataclass
class ComparisonResult:
    """Result of comparing artwork to reference."""
    artwork_id: str
    reference_id: str
    deltas: list = field(default_factory=list)
    similarities: list = field(default_factory=list)
    differences: list = field(default_factory=list)

@dataclass
class FeedbackItem:
    """Feedback on an artwork."""
    id: str
    artwork_id: str
    text: str
    priority: str  # P0, P1, P2
    source: str  # who gave feedback
    timestamp: str = ""
    addressed: bool = False