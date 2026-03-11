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
    return {
        "ambiguous_items": ["風格描述較模糊，建議補充具體視覺參考", "節奏快慢需要更明確的定義"],
        "missing_items": ["色彩方向尚未指定", "目標受眾未說明"],
        "suggestions": ["建議加入 3-5 張視覺參考圖", "請確認 Supervisor Spec 與客戶期望一致"],
    }


# ── Modification: Artwork ────────────────────────────────────────

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
            replies.append(f"**{response.agent_name}**:\n{response.content}")
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


@router.post("/suggestion/chat/brief")
async def chat_brief(body: ChatBody):
    history_str = _build_history_str(body.history)

    # Format brief_context dict into readable lines
    if body.brief_context and isinstance(body.brief_context, dict):
        b = body.brief_context
        fields = {
            "project_name": "專案名稱", "client": "客戶", "director": "導演",
            "supervisor": "Supervisor", "confidentiality": "密等",
            "selling_points": "產品賣點", "keywords": "情緒關鍵詞",
            "restrictions": "禁忌事項", "style": "風格關鍵字",
            "mood": "色調/氛圍", "worldview": "世界觀",
            "rhythm": "節奏", "supervisor_spec": "Supervisor Spec",
        }
        filled, empty = [], []
        for key, label in fields.items():
            val = str(b.get(key, "")).strip()
            if val:
                filled.append(f"  {label}: {val}")
            else:
                empty.append(f"  {label}")
        brief_str = ""
        if filled:
            brief_str += "【已填寫】\n" + "\n".join(filled)
        if empty:
            brief_str += "\n【未填寫】" + "、".join(empty)
    else:
        brief_str = "（表單尚未填寫任何內容）"

    prompt = (
        "You are a Brief Clarification assistant for a VFX/CG production project.\n"
        "Help the director/supervisor refine and clarify their brief.\n\n"
        f"Current brief:\n{brief_str}\n"
        f"{history_str}\n\n"
        f"User message: {body.message}\n\n"
        "Instructions:\n"
        "- Reference the ACTUAL content the user filled in — quote their specific words\n"
        "- For empty fields, ask the user to fill them with concrete examples\n"
        "- For vague short entries (e.g. 'ss', 'sss'), ask for clarification\n"
        "- Identify ambiguous terms and ask for specific definitions\n"
        "- Max 3 follow-up questions per response, be concise\n"
        "- Respond in the same language as the user (Chinese if they wrote Chinese)"
    )
    reply = await _agent_chat(prompt, [DIRECTOR_TOPIC, SUPERVISOR_TOPIC])
    return {"reply": reply}


@router.post("/suggestion/chat/reference")
async def chat_reference(body: ChatBody):
    history_str = _build_history_str(body.history)
    refs_str = ""
    if body.all_refs_context:
        refs_str = "\nCurrent references:\n" + "\n".join(
            [f"- [{r.get('category','')}] {r.get('title','')}: {r.get('note','')}" for r in body.all_refs_context]
        )
    clicked_str = f"\nUser clicked on reference ID: {body.clicked_ref_id}" if body.clicked_ref_id else ""
    prompt = f"""You are a Reference Clarification assistant helping organize and clarify visual references.
{refs_str}{clicked_str}
{history_str}

User message: {body.message}

Help the user clarify what each reference should be used for, identify gaps, and suggest how to better organize references.
Respond in the same language as the user's message."""
    reply = await _agent_chat(prompt, [DIRECTOR_TOPIC, PROFESSIONAL_ARTIST_TOPIC])
    return {"reply": reply}


@router.post("/suggestion/chat/reflection")
async def chat_reflection(body: ChatBody):
    history_str = _build_history_str(body.history)
    specs_str = f"\nSpecs context: {body.specs_context}" if body.specs_context else ""
    refs_str = ""
    if body.refs_context:
        refs_str = "\nReferences: " + ", ".join([r.get("title", "") for r in body.refs_context])
    mode_str = f"\nResponse mode: {body.response_mode}" if body.response_mode else ""
    clicked_str = f"\nClicked spec field: {body.clicked_spec_field}" if body.clicked_spec_field else ""
    prompt = f"""You are a Creative Exploration assistant helping an artist understand and internalize the project brief.
{specs_str}{refs_str}{mode_str}{clicked_str}
{history_str}

User message: {body.message}

Help the artist deeply understand the creative intent, explore implications of the brief, and develop their creative direction.
{"Rephrase your answer in simpler terms." if body.response_mode == "rephrase" else ""}
{"Explain the logical reasoning behind the brief requirements." if body.response_mode == "logic" else ""}
{"Provide evidence and examples to support the creative direction." if body.response_mode == "evidence" else ""}
Respond in the same language as the user's message."""
    reply = await _agent_chat(prompt, [DIRECTOR_TOPIC, PROFESSIONAL_ARTIST_TOPIC, FANS_AGENT_TOPIC])
    return {"reply": reply}


@router.post("/suggestion/chat/analysis")
async def chat_analysis(body: ChatBody):
    history_str = _build_history_str(body.history)
    metrics_str = ""
    if body.metrics_context:
        metrics_str = "\nCurrent metrics:\n" + "\n".join(
            [f"- {m.get('name','')}: {m.get('status','')} - {m.get('consensus','')}" for m in body.metrics_context]
        )
    prompt = f"""You are an Analysis assistant helping interpret AI analysis results for an artwork.

Artwork ID: {body.artwork_id or "unknown"}
{metrics_str}
{history_str}

User message: {body.message}

Help the user understand the analysis results, prioritize issues, and determine next steps.
Respond in the same language as the user's message."""
    reply = await _agent_chat(prompt, [PROFESSIONAL_ARTIST_TOPIC, SENIOR_ARTIST_TOPIC, SUPERVISOR_TOPIC])
    return {"reply": reply}


@router.post("/suggestion/chat/compare")
async def chat_compare(body: ChatBody):
    history_str = _build_history_str(body.history)
    delta_str = ""
    if body.delta_context:
        delta_str = "\nCurrent deltas:\n" + "\n".join(
            [f"- [{d.get('severity','P1')}] {d.get('type','')}: {d.get('detail','')}" for d in body.delta_context]
        )
    pair_str = ""
    if body.artwork_ref_pair:
        pair_str = f"\nComparing artwork {body.artwork_ref_pair.get('artwork_id','')} vs ref {body.artwork_ref_pair.get('ref_id','')}"
    prompt = f"""You are a Comparison assistant helping analyze differences between artwork and reference images.
{pair_str}{delta_str}
{history_str}

User message: {body.message}

Help the user understand and prioritize the differences, determine which are intentional vs unintentional, and plan corrections.
Respond in the same language as the user's message."""
    reply = await _agent_chat(prompt, [PROFESSIONAL_ARTIST_TOPIC, SUPERVISOR_TOPIC])
    return {"reply": reply}


@router.post("/suggestion/chat/review")
async def chat_review(body: ChatBody):
    history_str = _build_history_str(body.history)
    feedback_str = ""
    if body.feedback_context:
        feedback_str = "\nExisting feedback:\n" + "\n".join(
            [f"- [{f.get('priority','P1')}] {f.get('text','')}" for f in body.feedback_context]
        )
    tone_str = f"\nTone style: {body.tone_style}" if body.tone_style else ""
    prompt = f"""You are a Review assistant helping a supervisor write and organize feedback for an artist.

Artwork ID: {body.artwork_id or "unknown"}
{feedback_str}{tone_str}
{history_str}

User message: {body.message}

Help clarify vague terms, convert observations into actionable feedback, and ensure feedback is constructive.
{"Use a professional tone." if body.tone_style == "professional" else ""}
{"Use an encouraging tone." if body.tone_style == "encouraging" else ""}
{"Be concise." if body.tone_style == "concise" else ""}
{"Be detailed and thorough." if body.tone_style == "detailed" else ""}
Respond in the same language as the user's message."""
    reply = await _agent_chat(prompt, [SUPERVISOR_TOPIC, DIRECTOR_TOPIC])
    return {"reply": reply}


@router.post("/suggestion/chat/decision")
async def chat_decision(body: ChatBody):
    history_str = _build_history_str(body.history)
    log_str = ""
    if body.decision_log:
        log_str = "\nDecision log:\n" + "\n".join(
            [f"- {d.get('issue','')}: {d.get('resolution','')}" for d in body.decision_log]
        )
    prompt = f"""You are a Decision Support assistant helping document and resolve creative disputes.
{log_str}
{history_str}

User message: {body.message}

Help clarify the decision, identify trade-offs, and suggest how to document the resolution clearly.
Respond in the same language as the user's message."""
    reply = await _agent_chat(prompt, [DIRECTOR_TOPIC, SUPERVISOR_TOPIC])
    return {"reply": reply}

@router.get("/suggestion/questions/{project_id}")
async def get_questions(project_id: str):
    return {
        "questions": [
            {"id": "q1", "text": "這個作品的主要光源方向是否符合 brief 的要求？"},
            {"id": "q2", "text": "色調與情緒目標是否一致？"},
            {"id": "q3", "text": "構圖的焦點是否清晰？"},
            {"id": "q4", "text": "材質細節是否達到要求的精細度？"},
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
        {"id": "delta_001", "type": "lighting", "severity": "P0", "detail": "主光方向與參考差異約 30 度"},
        {"id": "delta_002", "type": "color", "severity": "P1", "detail": "色溫偏冷，參考為暖色調"},
    ]

@router.post("/combination/deltas/{artwork_id}/{ref_id}")
async def rerun_deltas(artwork_id: str, ref_id: str, body: dict):
    return [
        {"id": "delta_001", "type": "lighting", "severity": "P0", "detail": "主光方向與參考差異約 30 度"},
    ]

@router.get("/combination/metrics/{artwork_id}")
async def get_metrics(artwork_id: str):
    return [
        {"id": "composition", "name": "Composition", "status": "green", "agent_opinions": [], "debate": "", "consensus": "構圖良好"},
        {"id": "lighting", "name": "Lighting", "status": "red", "agent_opinions": [], "debate": "", "consensus": "光影需調整"},
        {"id": "color", "name": "Color", "status": "yellow", "agent_opinions": [], "debate": "", "consensus": "色彩略偏"},
        {"id": "texture", "name": "Texture", "status": "green", "agent_opinions": [], "debate": "", "consensus": "材質細節佳"},
        {"id": "motion", "name": "Motion", "status": "green", "agent_opinions": [], "debate": "", "consensus": "動態自然"},
        {"id": "depth", "name": "Depth", "status": "yellow", "agent_opinions": [], "debate": "", "consensus": "景深可加強"},
        {"id": "exposure", "name": "Exposure", "status": "green", "agent_opinions": [], "debate": "", "consensus": "曝光正常"},
        {"id": "style", "name": "Style", "status": "green", "agent_opinions": [], "debate": "", "consensus": "風格一致"},
    ]

@router.get("/combination/metrics/{artwork_id}/{metric_id}")
async def get_metric_detail(artwork_id: str, metric_id: str):
    return {
        "analysis": f"{metric_id} 的詳細分析結果",
        "suggestions": ["調整主光角度", "提高對比度"],
        "agent_opinions": [],
        "debate": "",
        "consensus": "需要修正",
    }

@router.post("/combination/canvas/submit")
async def submit_canvas(body: dict):
    return {"summary": "Canvas 標註已分析", "key_points": ["標記區域需加強光影", "文字說明已記錄"]}

@router.post("/combination/analyze_feedback")
async def analyze_feedback(body: dict):
    return {
        "key_findings": ["主要問題集中在光影", "色彩有輕微偏差"],
        "conflicts": [],
        "suggested_order": ["先修光影", "再調色彩"],
    }