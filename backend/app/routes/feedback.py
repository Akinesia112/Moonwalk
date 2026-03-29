from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime
import uuid

router = APIRouter(tags=["Modification & Suggestion"])

# ── Shared storage (imported from spec via shared state) ─────────
# We use module-level dicts here; in production use a DB
_REFERENCES: dict = {}
_FEEDBACKS: dict = {}
_BRIEFS: dict = {}
_REFLECTIONS: dict = {}
_DECISIONS: dict = {}
_CANVAS: dict = {}


# ── Pydantic models ──────────────────────────────────────────────

class ReferenceUpdateBody(BaseModel):
    priority: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    is_pinned: Optional[bool] = None
    confidentiality: Optional[str] = None

class BatchRefItem(BaseModel):
    id: str
    priority: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None

class BatchUpdateBody(BaseModel):
    references: List[BatchRefItem]

class SeedItem(BaseModel):
    file_url: Optional[str] = None
    priority: Optional[str] = "secondary"
    category: Optional[str] = "Lighting"
    note: Optional[str] = ""

class SeedToRefBody(BaseModel):
    project_id: str
    seeds: List[SeedItem]

class BriefBody(BaseModel):
    project_id: Optional[str] = None
    selling_points: Optional[str] = ""
    keywords: Optional[str] = ""
    restrictions: Optional[str] = ""
    style: Optional[str] = ""
    mood: Optional[str] = ""
    worldview: Optional[str] = ""
    rhythm: Optional[str] = "medium"
    supervisor_spec: Optional[str] = ""

class BriefAnalyzeBody(BaseModel):
    project_id: Optional[str] = None
    brief: Optional[Any] = None

class ArtworkUpdateBody(BaseModel):
    artist_note: Optional[str] = None
    tags: Optional[List[str]] = None

class FeedbackBody(BaseModel):
    text: str
    source: Optional[str] = "Supervisor"
    priority: Optional[str] = "P1"

class FeedbackUpdateBody(BaseModel):
    addressed: Optional[bool] = None
    supplement: Optional[str] = None
    priority: Optional[str] = None

class AnnotationBody(BaseModel):
    text: str

class LabelsBody(BaseModel):
    labels: List[str]

class InlineSpecBody(BaseModel):
    text: str

class ReflectionNotesBody(BaseModel):
    project_id: Optional[str] = None
    notes: str

class WorkflowNode(BaseModel):
    id: str
    text: str
    priority: int = 0
    done: bool = False

class WorkflowUpdateBody(BaseModel):
    project_id: Optional[str] = None
    nodes: List[WorkflowNode]

class WorkflowAddBody(BaseModel):
    project_id: Optional[str] = None
    text: str

class ReflectionSubmitBody(BaseModel):
    project_id: Optional[str] = None
    notes: Optional[str] = ""
    workflow_nodes: Optional[List[Any]] = []
    chat_history: Optional[List[Any]] = []
    checked_questions: Optional[List[str]] = []
    status: Optional[str] = "submitted"

class DecisionBody(BaseModel):
    project_id: Optional[str] = None
    issue: str
    parties: Optional[List[str]] = []
    resolution: str
    final_authority: Optional[str] = ""
    rationale: Optional[str] = ""

class ChatBody(BaseModel):
    project_id: Optional[str] = None
    message: str
    history: Optional[List[Any]] = []
    clicked_ref_id: Optional[str] = None
    all_refs_context: Optional[List[Any]] = []
    brief_context: Optional[Any] = None
    specs_context: Optional[Any] = None
    refs_context: Optional[List[Any]] = []
    artwork_id: Optional[str] = None
    metrics_context: Optional[List[Any]] = []
    delta_context: Optional[List[Any]] = []
    feedback_context: Optional[List[Any]] = []
    decision_log: Optional[List[Any]] = []
    response_mode: Optional[str] = None
    tone_style: Optional[str] = None
    clicked_spec_field: Optional[str] = None
    artwork_ref_pair: Optional[Any] = None

class PolishBody(BaseModel):
    raw_text: str
    tone_style: Optional[str] = "professional"

class FinalFeedbackBody(BaseModel):
    project_id: Optional[str] = None
    shot_id: Optional[str] = None
    synthesis_text: Optional[str] = ""
    status: Optional[str] = "draft"


# ── Modification: References ─────────────────────────────────────

@router.put("/Modification/reference/{ref_id}")
async def update_reference(ref_id: str, body: ReferenceUpdateBody):
    return {"id": ref_id, **body.dict(exclude_none=True), "updated_at": datetime.now().isoformat()}

@router.delete("/Modification/reference/{ref_id}")
async def delete_reference(ref_id: str):
    return {"deleted": ref_id}

@router.put("/Modification/references/batch")
async def batch_update_references(body: BatchUpdateBody):
    return {"updated": len(body.references), "timestamp": datetime.now().isoformat()}

@router.post("/Modification/references/seed_to_ref")
async def seed_to_ref(body: SeedToRefBody):
    results = []
    for seed in body.seeds:
        new_id = f"ref_{uuid.uuid4().hex[:8]}"
        ref = {
            "id": new_id,
            "project_id": body.project_id,
            "title": f"Client Seed - {seed.category}",
            "category": seed.category,
            "confidentiality": "client-sensitive",
            "file_url": seed.file_url or "",
            "thumbnail_url": "",
            "note": seed.note or "",
            "is_pinned": seed.priority == "main",
            "priority": seed.priority,
            "uploaded_by": "Director",
            "created_at": datetime.now().isoformat(),
        }
        results.append(ref)
    return results


# ── Modification: Project / Brief ────────────────────────────────

@router.post("/Modification/project")
async def create_project(body: dict):
    new_id = f"proj_{uuid.uuid4().hex[:8]}"
    return {"id": new_id, **body, "created_at": datetime.now().isoformat()}

@router.put("/Modification/project")
async def update_project(body: dict):
    return {"updated": True, **body}

@router.post("/Modification/project/brief")
async def save_brief(body: BriefBody):
    _BRIEFS[body.project_id or "proj_001"] = body.dict()
    return {"status": "saved", "timestamp": datetime.now().isoformat()}

@router.put("/Modification/project/brief")
async def update_brief(body: BriefBody):
    _BRIEFS[body.project_id or "proj_001"] = body.dict()
    return {"status": "updated", "timestamp": datetime.now().isoformat()}

@router.post("/Modification/project/brief/analyze")
async def analyze_brief(body: BriefAnalyzeBody):
    brief = body.brief or {}
    if isinstance(brief, dict):
        REQUIRED = {
            "project_name": "Project Name", "client": "Client",
            "director": "Director/Creative Director", "supervisor": "Supervisor",
            "confidentiality": "Confidentiality Level", "selling_points": "Key Selling Points / Key Messages",
            "keywords": "Emotional Keywords", "style": "Style Keywords", "mood": "Color Tone / Atmosphere",
        }
        OPTIONAL = {
            "restrictions": "Restrictions / Taboos", "worldview": "World Concept",
            "supervisor_spec": "Supervisor Spec",
        }
        filled_req, missing_req, filled_opt = [], [], []
        for key, label in REQUIRED.items():
            val = str(brief.get(key, "")).strip()
            if val:
                filled_req.append(f"  {label}: {val}")
            else:
                missing_req.append(label)
        for key, label in OPTIONAL.items():
            val = str(brief.get(key, "")).strip()
            if val:
                filled_opt.append(f"  {label}: {val}")

        brief_str = ""
        if filled_req:
            brief_str += "[Required fields filled]\n" + "\n".join(filled_req)
        if missing_req:
            brief_str += "\n[Required fields missing]: " + ", ".join(missing_req)
        if filled_opt:
            brief_str += "\n[Optional fields filled]\n" + "\n".join(filled_opt)
    else:
        brief_str = str(brief)
        missing_req = []

    prompt = (
        "You are a senior VFX Creative Director analyzing a project brief. Pure text stage — no images yet.\n\n"
        f"Brief:\n{brief_str}\n\n"
        "Return ONLY a valid JSON object (no markdown, no extra text, no code fences):\n"
        '{"summary": "...", "ambiguous_items": [...], "missing_items": [...], "suggestions": [...]}\n\n'
        "Rules for each field:\n\n"
        "- summary: 2-3 sentences. Describe the CREATIVE INTENT and EMOTIONAL CORE. "
        "Identify any inherent tensions (e.g. 'realistic yet abstract' suggests the tension between documentation and interpretation — "
        "like Terrence Malick's The Tree of Life which uses handheld documentary texture to film surreal sequences). "
        "Quote the user's actual words.\n\n"
        "- ambiguous_items: List entries that are creatively DANGEROUS if left undefined in production. "
        "Format each as: '「[user's exact word]」— [specific production consequence if undefined]'. "
        "Examples of good ambiguous_items:\n"
        "  ''Drift' — undefined: is it camera drift (like Birdman long take), character movement drift (slow motion), or color drift (desaturated memory feel)? The compositor cannot decide'\n"
        "  ''Warm yet cold' — unresolved contradiction: the lighting artist needs to know which takes priority. Let the Bullets Fly uses warm tones + cold narrative; The Assassin uses cool light sources + warm relationships — these are completely different directions'\n"
        "  ''Realistic' — not differentiated: is it Oppenheimer's raw texture (grain, no CG glow), or 1917's highly designed yet seamless realism? The former rejects effects; the latter embraces them'\n\n"
        "- missing_items: Only list REQUIRED fields that are completely empty. Use the exact field label names.\n\n"
        "- suggestions: 2-4 suggestions that are PRODUCTION-SPECIFIC. Each must:\n"
        "  1. Quote the user's exact words\n"
        "  2. Name a specific film/scene as reference anchor\n"
        "  3. State which department (Lighting / Motion / Compositing / Editing) needs this clarified\n"
        "  Example: ''Eerie' is recommended to be defined as 'gradual breakdown of reality logic' (reference: Hereditary's compositional rhythm) rather than jump-scare horror, because the former is executed through composition and editing rhythm, while the latter relies on sound design and fast camera movement — the editor needs a clear direction'\n\n"
        "IMPORTANT: All output text must be in English only. Do not use any other language regardless of the input language."
    )
    raw = await _agent_chat(prompt, [DIRECTOR_TOPIC])

    import json, re as _re
    ambiguous, missing, suggestions, summary = [], missing_req, [], ""
    try:
        match = _re.search(r"\{[\s\S]*\}", raw)
        if match:
            parsed = json.loads(match.group())
            ambiguous = parsed.get("ambiguous_items", [])
            missing = parsed.get("missing_items", missing_req)
            suggestions = parsed.get("suggestions", [])
            summary = parsed.get("summary", "")
    except Exception:
        suggestions = [raw[:400]] if raw else []

    return {
        "ambiguous_items": ambiguous,
        "missing_items": missing,
        "suggestions": suggestions,
        "summary": summary,
    }

@router.put("/Modification/artwork/{artwork_id}")
async def update_artwork(artwork_id: str, body: ArtworkUpdateBody):
    return {"id": artwork_id, **body.dict(exclude_none=True), "updated_at": datetime.now().isoformat()}

@router.delete("/Modification/artwork/{artwork_id}")
async def delete_artwork(artwork_id: str):
    return {"deleted": artwork_id}

@router.post("/Modification/artwork/{artwork_id}/ref")
async def link_ref(artwork_id: str, body: dict):
    return {"linked": True, "artwork_id": artwork_id, "reference_id": body.get("reference_id")}

@router.delete("/Modification/artwork/{artwork_id}/ref")
async def unlink_ref(artwork_id: str):
    return {"unlinked": True}

@router.put("/Modification/artwork/{artwork_id}/reflection")
async def save_artwork_reflection(artwork_id: str, body: dict):
    return {"saved": True, "artwork_id": artwork_id}

@router.post("/Modification/artwork/{artwork_id}/feedback")
async def add_feedback(artwork_id: str, body: FeedbackBody):
    fid = f"fb_{uuid.uuid4().hex[:8]}"
    item = {
        "id": fid,
        "artwork_id": artwork_id,
        "text": body.text,
        "source": body.source,
        "priority": body.priority,
        "addressed": False,
        "supplement": "",
        "ai_draft": "",
        "timestamp": datetime.now().isoformat(),
    }
    _FEEDBACKS[fid] = item
    return item

@router.post("/Modification/artwork/{artwork_id}/canvas")
async def save_canvas(artwork_id: str, body: dict):
    _CANVAS[artwork_id] = body.get("annotations", [])
    return {"saved": True}

@router.post("/Modification/artwork/{artwork_id}/canvas/snapshot")
async def save_canvas_snapshot(artwork_id: str):
    return {"saved": True}

@router.post("/Modification/artwork/{artwork_id}/annotations")
async def add_annotation(artwork_id: str, body: AnnotationBody):
    return {"id": uuid.uuid4().hex[:8], "text": body.text, "artwork_id": artwork_id}

@router.put("/Modification/artwork/{artwork_id}/labels")
async def update_labels(artwork_id: str, body: LabelsBody):
    return {"labels": body.labels}

@router.post("/Modification/artwork/{artwork_id}/inline_specs")
async def add_inline_spec(artwork_id: str, body: InlineSpecBody):
    return {"id": uuid.uuid4().hex[:8], "text": body.text}


# ── Modification: Feedback ───────────────────────────────────────

@router.put("/Modification/feedback/{feedback_id}")
async def update_feedback(feedback_id: str, body: FeedbackUpdateBody):
    if feedback_id in _FEEDBACKS:
        _FEEDBACKS[feedback_id].update(body.dict(exclude_none=True))
        return _FEEDBACKS[feedback_id]
    return {"id": feedback_id, **body.dict(exclude_none=True)}

@router.delete("/Modification/feedback/{feedback_id}")
async def delete_feedback(feedback_id: str):
    _FEEDBACKS.pop(feedback_id, None)
    return {"deleted": feedback_id}


# ── Modification: Delta ──────────────────────────────────────────

@router.put("/Modification/delta/{delta_id}/annotation")
async def save_delta_annotation(delta_id: str, body: dict):
    return {"saved": True, "delta_id": delta_id}

@router.post("/Modification/delta/{delta_id}/escalate")
async def escalate_delta(delta_id: str, body: dict):
    return {"escalation_id": uuid.uuid4().hex[:8], "status": "escalated"}


# ── Modification: Reflection ─────────────────────────────────────

@router.put("/Modification/reflection/notes")
async def save_reflection_notes(body: ReflectionNotesBody):
    _REFLECTIONS[f"{body.project_id}_notes"] = body.notes
    return {"saved": True}

@router.put("/Modification/reflection/workflow")
async def update_workflow(body: WorkflowUpdateBody):
    _REFLECTIONS[f"{body.project_id}_workflow"] = [n.dict() for n in body.nodes]
    return {"saved": True}

@router.post("/Modification/reflection/workflow")
async def add_workflow_node(body: WorkflowAddBody):
    new_node = {"id": uuid.uuid4().hex[:8], "text": body.text, "priority": 0, "done": False}
    key = f"{body.project_id}_workflow"
    if key not in _REFLECTIONS:
        _REFLECTIONS[key] = []
    _REFLECTIONS[key].append(new_node)
    return new_node

@router.post("/Modification/reflection/submit")
async def submit_reflection(body: ReflectionSubmitBody):
    return {"status": "submitted", "timestamp": datetime.now().isoformat()}


# ── Modification: Compare / Review / Decision ────────────────────

@router.post("/Modification/compare/submit")
async def submit_compare(body: dict):
    return {"status": "submitted", "timestamp": datetime.now().isoformat()}

@router.post("/Modification/review/submit")
async def submit_review(body: dict):
    return {"status": "submitted", "timestamp": datetime.now().isoformat()}

@router.post("/Modification/decision")
async def record_decision(body: DecisionBody):
    did = uuid.uuid4().hex[:8]
    decision = {
        "id": did,
        **body.dict(),
        "date": datetime.now().isoformat(),
        "status": "recorded",
    }
    _DECISIONS[did] = decision
    return decision

@router.post("/Modification/feedback/final")
async def send_final_feedback(body: FinalFeedbackBody):
    return {"status": "sent", "timestamp": datetime.now().isoformat()}

@router.put("/Modification/feedback/draft")
async def save_feedback_draft(body: FinalFeedbackBody):
    return {"status": "draft", "timestamp": datetime.now().isoformat()}


# ── Suggestion: Chat endpoints (real agent calls) ────────────────

import asyncio
import uuid as _uuid
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


async def _agent_chat(prompt: str, topics: list, timeout: float = 45.0) -> str:
    """Send a prompt to specified agents and return combined reply."""
    if shared.runtime is None:
        return "Agent runtime not initialized."

    session_id = str(_uuid.uuid4())
    shared.response_queues[session_id] = asyncio.Queue()

    message = EvaluationMessage(content=prompt, session_id=session_id)
    for topic in topics:
        await shared.runtime.publish_message(
            message,
            topic_id=TopicId(type=topic, source="api"),
        )

    replies = []
    try:
        for _ in topics:
            response: EvaluationResponse = await asyncio.wait_for(
                shared.response_queues[session_id].get(),
                timeout=timeout,
            )
            # Strip any leading "AgentName:" or "**AgentName**:" the agent may have
            # written itself, to avoid "**Director**:\nDirector:" duplication
            import re as _re
            content = response.content.strip()
            content = _re.sub(
                r'^(\*{0,2}' + _re.escape(response.agent_name) + r'\*{0,2})\s*:\s*',
                '',
                content,
                flags=_re.IGNORECASE
            )
            replies.append(f"**{response.agent_name}**:\n{content}")
    except asyncio.TimeoutError:
        if not replies:
            replies.append("Agent response timed out.")
    finally:
        shared.response_queues.pop(session_id, None)

    return "\n\n---\n\n".join(replies)


def _build_history_str(history: list) -> str:
    if not history:
        return ""
    lines = []
    for h in history[-6:]:  # last 6 turns for context
        role = h.get("role", "user")
        content = h.get("content", "")
        lines.append(f"{role}: {content}")
    return "\nConversation history:\n" + "\n".join(lines)


@router.get("/suggestion/questions/{project_id}")
async def get_questions(project_id: str):
    return {
        "questions": [
            {"id": "q1", "text": "Does the main light source direction of this artwork match the brief requirements?"},
            {"id": "q2", "text": "Is the color tone consistent with the emotional target?"},
            {"id": "q3", "text": "Is the compositional focus clear?"},
            {"id": "q4", "text": "Does the texture detail meet the required level of refinement?"},
        ]
    }

@router.post("/suggestion/questions/{project_id}")
async def regenerate_questions(project_id: str):
    return {"status": "regenerated"}

@router.post("/suggestion/polish")
async def polish_feedback(body: PolishBody):
    prompt = f"""Polish the following feedback text to be more professional and actionable.

Original text: {body.raw_text}
Tone style: {body.tone_style or "professional"}

Rewrite it to be clear, specific, and constructive. Keep the same meaning but improve the wording.
Respond in the same language as the input."""
    reply = await _agent_chat(prompt, [SUPERVISOR_TOPIC])
    return {"polished_text": reply}


@router.post("/suggestion/synthesize_feedback")
async def synthesize_feedback(body: dict):
    feedback_items = body.get("feedback_items", [])
    prompt = f"""Synthesize and prioritize the following feedback items:

{chr(10).join([f"- [{f.get('priority','P1')}] ({f.get('source','')}) {f.get('text','')}" for f in feedback_items])}

Provide:
1. Key findings (top 3-5 most important issues)
2. Any conflicts between feedback items
3. Suggested order to address them (most critical first)

Be concise and actionable. Respond in the same language as the feedback."""
    reply = await _agent_chat(prompt, [DIRECTOR_TOPIC, SUPERVISOR_TOPIC])
    return {
        "key_findings": [reply],
        "conflicts": [],
        "suggested_order": ["See agent analysis above"],
        "raw_synthesis": reply,
    }


# ── Combination extras ───────────────────────────────────────────

@router.get("/combination/deltas/{artwork_id}/{ref_id}")
async def get_deltas(artwork_id: str, ref_id: str):
    return [
        {"id": "delta_001", "type": "lighting", "severity": "P0", "detail": "Main light direction differs from reference by approximately 30 degrees"},
        {"id": "delta_002", "type": "color", "severity": "P1", "detail": "Color temperature too cool; reference uses warm tones"},
    ]

@router.post("/combination/deltas/{artwork_id}/{ref_id}")
async def rerun_deltas(artwork_id: str, ref_id: str, body: dict):
    return [
        {"id": "delta_001", "type": "lighting", "severity": "P0", "detail": "Main light direction differs from reference by approximately 30 degrees"},
    ]

@router.get("/combination/metrics/{artwork_id}")
async def get_metrics(artwork_id: str):
    return [
        {"id": "composition", "name": "Composition", "status": "green", "agent_opinions": [], "debate": "", "consensus": "Composition good"},
        {"id": "lighting", "name": "Lighting", "status": "red", "agent_opinions": [], "debate": "", "consensus": "Lighting needs adjustment"},
        {"id": "color", "name": "Color", "status": "yellow", "agent_opinions": [], "debate": "", "consensus": "Color slightly off"},
        {"id": "texture", "name": "Texture", "status": "green", "agent_opinions": [], "debate": "", "consensus": "Texture detail good"},
        {"id": "motion", "name": "Motion", "status": "green", "agent_opinions": [], "debate": "", "consensus": "Natural motion"},
        {"id": "depth", "name": "Depth", "status": "yellow", "agent_opinions": [], "debate": "", "consensus": "Depth of field can be improved"},
        {"id": "exposure", "name": "Exposure", "status": "green", "agent_opinions": [], "debate": "", "consensus": "Exposure normal"},
        {"id": "style", "name": "Style", "status": "green", "agent_opinions": [], "debate": "", "consensus": "Style consistent"},
    ]

@router.get("/combination/metrics/{artwork_id}/{metric_id}")
async def get_metric_detail(artwork_id: str, metric_id: str):
    return {
        "analysis": f"Detailed analysis of {metric_id}",
        "suggestions": ["Adjust main light angle", "Increase contrast"],
        "agent_opinions": [],
        "debate": "",
        "consensus": "Needs correction",
    }

@router.post("/combination/canvas/submit")
async def submit_canvas(body: dict):
    return {"summary": "Canvas annotations analyzed", "key_points": ["Marked areas need stronger lighting", "Text notes recorded"]}

@router.post("/combination/analyze_feedback")
async def analyze_feedback(body: dict):
    return {
        "key_findings": ["Main issues concentrated in lighting", "Color has slight deviation"],
        "conflicts": [],
        "suggested_order": ["Fix lighting first", "Then adjust color"],
    }