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
            "project_name": "專案名稱", "client": "客戶",
            "director": "導演/創意總監", "supervisor": "Supervisor",
            "confidentiality": "密等", "selling_points": "產品賣點/重點訊息",
            "keywords": "情緒關鍵詞", "style": "風格關鍵字", "mood": "色調/氛圍",
        }
        OPTIONAL = {
            "restrictions": "禁忌事項", "worldview": "世界觀",
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
            brief_str += "【已填寫必填欄位】\n" + "\n".join(filled_req)
        if missing_req:
            brief_str += "\n【未填寫必填欄位】" + "、".join(missing_req)
        if filled_opt:
            brief_str += "\n【已填寫選填欄位】\n" + "\n".join(filled_opt)
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
        "Identify any inherent tensions (e.g. '寫實又抽象' suggests the tension between documentation and interpretation — "
        "like Terrence Malick's 《樹》 which uses handheld documentary texture to film surreal sequences). "
        "Quote the user's actual words.\n\n"
        "- ambiguous_items: List entries that are creatively DANGEROUS if left undefined in production. "
        "Format each as: '「[user's exact word]」— [specific production consequence if undefined]'. "
        "Examples of good ambiguous_items:\n"
        "  '「飄啊」— 未定義：是攝影機飄移（如《鳥人》長鏡頭）、角色動態飄（慢動作）、還是色彩飄（低飽和記憶感）？合成師無法決定'\n"
        "  '「溫暖而寒冷」— 矛盾未解：打光師在佈光時需要知道哪個優先。《讓子彈飛》是暖色調+冷敘事；《刺客聶隱娘》是冷光源+溫人物關係——這兩個方向完全不同'\n"
        "  '「寫實」— 未區分：是《奧本海默》的實拍質感（grain, no CG glow），還是《1917》那種高度設計但無縫的寫實？前者排斥特效，後者接受'\n\n"
        "- missing_items: Only list REQUIRED fields that are completely empty. Use the exact field label names.\n\n"
        "- suggestions: 2-4 suggestions that are PRODUCTION-SPECIFIC. Each must:\n"
        "  1. Quote the user's exact words\n"
        "  2. Name a specific film/scene as reference anchor\n"
        "  3. State which department (打光/動態/合成/剪輯) needs this clarified\n"
        "  Example: '「詭譎」建議定義為「現實邏輯慢慢崩解」（參考《遺傳厄運》的構圖節奏）而非jump scare式恐嚇，因為前者靠構圖和剪輯節奏執行，後者靠音效和攝影機快速移動——剪輯師需要明確方向'\n\n"
        "All text in Traditional Chinese."
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