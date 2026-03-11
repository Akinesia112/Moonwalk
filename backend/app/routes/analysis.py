from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime
import asyncio
import uuid

from autogen_core import TopicId
from .. import shared
from ..agents.agentbase import EvaluationMessage, EvaluationResponse
from ..agents.registor_agent import (
    PROFESSIONAL_ARTIST_TOPIC,
    TRENDING_ARTIST_TOPIC,
    FANS_AGENT_TOPIC,
    DIRECTOR_TOPIC,
    JUNIOR_ARTIST_TOPIC,
    SENIOR_ARTIST_TOPIC,
    SUPERVISOR_TOPIC,
)

router = APIRouter(prefix="/combination", tags=["combination"])


class AnalyzeRequest(BaseModel):
    artwork_id: str
    reference_ids: List[str]
    brief_context: Optional[Any] = None
    artwork_url: Optional[str] = ""
    reference_urls: Optional[List[str]] = []


class CompareRequest(BaseModel):
    artwork_id: str
    reference_id: str
    mode: Optional[str] = "side_by_side"


ALL_AGENT_TOPICS = [
    PROFESSIONAL_ARTIST_TOPIC,
    TRENDING_ARTIST_TOPIC,
    FANS_AGENT_TOPIC,
    DIRECTOR_TOPIC,
    JUNIOR_ARTIST_TOPIC,
    SENIOR_ARTIST_TOPIC,
    SUPERVISOR_TOPIC,
]


async def run_agents(prompt: str, session_id: str, topics: List[str], timeout: float = 60.0):
    """Publish a message to all specified agent topics and collect responses."""
    if shared.runtime is None:
        raise HTTPException(status_code=503, detail="Agent runtime not initialized")

    shared.response_queues[session_id] = asyncio.Queue()

    message = EvaluationMessage(content=prompt, session_id=session_id)

    for topic in topics:
        await shared.runtime.publish_message(
            message,
            topic_id=TopicId(type=topic, source="api"),
        )

    results = []
    try:
        for _ in topics:
            response: EvaluationResponse = await asyncio.wait_for(
                shared.response_queues[session_id].get(),
                timeout=timeout,
            )
            results.append({
                "agent": response.agent_name,
                "opinion": response.content,
                "confidence": 1.0,
            })
    except asyncio.TimeoutError:
        pass
    finally:
        shared.response_queues.pop(session_id, None)

    return results


@router.post("/analyze")
async def analyze_artwork(request: AnalyzeRequest):
    """Run multi-agent AI analysis on artwork vs references."""
    session_id = str(uuid.uuid4())

    prompt = f"""Please analyze this artwork against the provided references.

Artwork ID: {request.artwork_id}
Reference IDs: {', '.join(request.reference_ids)}
{"Artwork URL: " + request.artwork_url if request.artwork_url else ""}
{"Reference URLs: " + ', '.join(request.reference_urls) if request.reference_urls else ""}
{"Brief context: " + str(request.brief_context) if request.brief_context else ""}

Evaluate the following 8 dimensions and provide specific, actionable feedback:
1. Composition
2. Lighting
3. Color
4. Texture
5. Motion
6. Depth
7. Exposure
8. Style

For each issue found, indicate severity (P0=critical, P1=important, P2=minor) and suggest specific corrections."""

    agent_opinions = await run_agents(prompt, session_id, ALL_AGENT_TOPICS)

    # Build structured metrics from agent responses
    metric_names = ["Composition", "Lighting", "Color", "Texture", "Motion", "Depth", "Exposure", "Style"]
    metrics = []
    for name in metric_names:
        # Determine status from agent opinions mentioning this metric
        relevant = [a for a in agent_opinions if name.lower() in a["opinion"].lower()]
        if any("critical" in a["opinion"].lower() or "P0" in a["opinion"] or "serious" in a["opinion"].lower() for a in relevant):
            status = "red"
        elif any("issue" in a["opinion"].lower() or "adjust" in a["opinion"].lower() or "improve" in a["opinion"].lower() for a in relevant):
            status = "yellow"
        else:
            status = "green"

        metrics.append({
            "id": name.lower(),
            "name": name,
            "status": status,
            "ref_basis": f"Based on provided references",
            "agent_opinions": relevant or agent_opinions[:2],
            "debate": "",
            "consensus": f"{name} analysis complete" if relevant else f"No major {name} issues detected",
        })

    # Extract issues from agent opinions
    issues = []
    for i, opinion in enumerate(agent_opinions):
        if any(word in opinion["opinion"].lower() for word in ["issue", "problem", "incorrect", "wrong", "adjust", "fix", "critical"]):
            issues.append({
                "id": f"issue_{i:03d}",
                "type": "general",
                "severity": "P1",
                "title": f"Feedback from {opinion['agent']}",
                "summary": opinion["opinion"][:200],
                "recommended_edit": {
                    "action": "Review and adjust based on agent feedback",
                    "rationale": opinion["opinion"],
                    "acceptance_criteria": "Meets reference standards",
                    "estimated_cost": "medium",
                }
            })

    return {
        "artwork_id": request.artwork_id,
        "reference_ids": request.reference_ids,
        "metrics": metrics,
        "issues": issues,
        "agent_opinions": agent_opinions,
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/compare")
async def compare_artwork(request: CompareRequest):
    """Compare artwork to a reference using agents."""
    session_id = str(uuid.uuid4())

    prompt = f"""Compare this artwork against the reference image and identify specific differences (deltas).

Artwork ID: {request.artwork_id}
Reference ID: {request.reference_id}
Comparison mode: {request.mode}

For each difference found, classify it by type (composition/lighting/color/texture/depth/motion/style/exposure) and severity (P0/P1/P2).
Be specific about what differs and how to close the gap."""

    agent_opinions = await run_agents(prompt, session_id, [PROFESSIONAL_ARTIST_TOPIC, SUPERVISOR_TOPIC])

    deltas = []
    for i, opinion in enumerate(agent_opinions):
        deltas.append({
            "id": f"delta_{i:03d}",
            "type": "general",
            "severity": "P1",
            "detail": opinion["opinion"],
        })

    return {
        "artwork_url": f"/artworks/{request.artwork_id}",
        "reference_url": f"/references/{request.reference_id}",
        "deltas": deltas,
        "agent_opinions": agent_opinions,
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/analyze_feedback")
async def analyze_feedback(body: dict):
    """Synthesize feedback items using agents."""
    session_id = str(uuid.uuid4())
    feedback_items = body.get("feedback_items", [])

    prompt = f"""Synthesize the following feedback items and identify key findings, conflicts, and suggested priority order:

Feedback items:
{chr(10).join([f"- [{f.get('priority','P1')}] {f.get('text','')}" for f in feedback_items])}

Provide:
1. Key findings (most important issues)
2. Conflicts between feedback items
3. Suggested order to address them"""

    agent_opinions = await run_agents(prompt, session_id, [DIRECTOR_TOPIC, SUPERVISOR_TOPIC])

    combined = "\n".join([a["opinion"] for a in agent_opinions])
    return {
        "key_findings": [combined[:300]] if combined else [],
        "conflicts": [],
        "suggested_order": ["Address P0 issues first", "Then P1", "Finally P2"],
        "agent_opinions": agent_opinions,
    }


@router.post("/canvas/submit")
async def submit_canvas(body: dict):
    """Submit canvas annotations for AI summary."""
    session_id = str(uuid.uuid4())
    annotations = body.get("canvas_annotations", [])
    text_annotations = body.get("text_annotations", [])

    prompt = f"""Summarize the following canvas review annotations made by a supervisor:

Text annotations: {text_annotations}
Canvas markings: {len(annotations)} annotation(s) recorded
Labels: {body.get('labels', [])}
Inline specs: {body.get('inline_specs', [])}

Provide a concise summary of the key review points and action items."""

    agent_opinions = await run_agents(prompt, session_id, [SUPERVISOR_TOPIC])

    combined = agent_opinions[0]["opinion"] if agent_opinions else "Canvas annotations recorded."
    return {
        "summary": combined,
        "key_points": [combined[:200]],
    }