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

    prompt = f"""You are a senior VFX Creative Director conducting a brief clarification session. Pure text only — no images at this stage.

Current brief:
{brief_str}
{history_str}

User message: {body.message}

---
REFERENCE EXAMPLES — use these to calibrate your questions:

EMOTIONAL ARCHITECTURE examples:
- If brief says「哀傷」→ ask: 是《異形：契約》那種角色沉默承受的哀傷（觀眾看出來但角色不說），還是《鬼滅之刃》那種角色當場崩潰的外顯哀傷？
- If brief says「壓迫」→ ask: 是《囚徒》那種封閉空間的物理壓迫（低天花板、窄景框），還是《黑天鵝》那種從內部滋生的心理壓迫（失真鏡頭、聲音設計）？
- If brief says「詭譎」→ ask: 是《遺傳厄運》那種現實邏輯慢慢崩解的詭譎，還是《牠》那種直接打你臉的恐嚇式詭譎？前者靠構圖節奏，後者靠jump cut和音效。

VISUAL CONTRADICTION examples:
- If brief says「寫實又抽象」→ ask: 像《樹》（Terrence Malick）那樣用紀錄片手持鏡頭拍超現實序列（寫實執行、抽象邏輯），還是像《沈默的羔羊》那樣寫實場景裡一個構圖角度讓人感到不對？
- If brief says「溫暖而寒冷」→ ask: 像《讓子彈飛》的暖色調配冰冷敘事，還是像《刺客聶隱娘》的冷色光源但溫熱的人物關係？打光師需要一個明確答案。

PRODUCTION ANCHOR examples:
- If brief says「寫實」→ ask: 是《奧本海默》那種實拍質感（grain, lens flare, no CG glow），還是《1917》那種在視覺上無縫但其實高度設計的寫實？
- If brief says「飄」→ ask: 是攝影機在飄（《鳥人》的長鏡頭漂移），是角色動態在飄（《悲情城市》的行走節奏），還是色彩在飄（褪色、低飽和像記憶中的畫面）？

REJECTION CRITERIA examples:
- 如果做出來像《咒》那樣的偽紀錄片風格，導演會接受嗎？
- 如果場景出現直接的超自然視覺特效（發光、煙霧），還是要保持一切可以被「理性解釋」的模糊空間？

---
Your task: Based on the brief above and the user's message, ask 2 questions ONLY.

Rules:
- Each question must DIRECTLY reference their exact words from the brief
- Model your questions after the examples above — anchor abstract words to specific films, scenes, or technical decisions
- Every question must produce a production-actionable answer (打光師/動態師/合成師 can use it immediately)
- No generic questions. No suggestions. No advice. Questions only.
- Respond entirely in Traditional Chinese."""
    reply = await _agent_chat(prompt, [DIRECTOR_TOPIC, SUPERVISOR_TOPIC])
    return {"reply": reply}


@router.post("/suggestion/chat/reference")
async def chat_reference(body: ChatBody):
    history_str = _build_history_str(body.history)

    # Format refs with index
    refs_str = ""
    if body.all_refs_context:
        lines = []
        for i, r in enumerate(body.all_refs_context):
            title = r.get("title", "untitled")
            cat = r.get("category", "")
            note = r.get("note", "").strip()
            pinned = "⭐ Main Ref" if r.get("is_pinned") else "Secondary"
            note_str = f'  Note: "{note}"' if note else "  Note: （未填寫）"
            lines.append(f"  [{i+1}] {title} | {cat} | {pinned}\n{note_str}")
        refs_str = "Current reference set:\n" + "\n".join(lines)

    clicked_str = ""
    if body.clicked_ref_id and body.all_refs_context:
        clicked = next((r for r in body.all_refs_context if r.get("id") == body.clicked_ref_id), None)
        if clicked:
            clicked_str = f'\nUser is asking specifically about: "{clicked.get("title","")}" ({clicked.get("category","")}) — Note: "{clicked.get("note","")}"'

    prompt = f"""You are a senior VFX Art Director helping a team organize and sharpen their visual reference set.

{refs_str}{clicked_str}
{history_str}

User message: {body.message}

---
REFERENCE ANALYSIS FRAMEWORK — use these to guide your responses:

NOTE QUALITY — When a note is vague or empty, ask for specifics:
- Bad note: "光影參考" → Ask: 是主光方向（key light angle）、還是光質（硬光/軟光）、還是光源色溫？
- Bad note: "氛圍" → Ask: 是整體色調、還是特定場景的情緒、還是景深與霧感的設計？
- Good note example: "主光從右側45度，硬光，陰影邊緣銳利，類似《教父》的倫勃朗打光"
- Good note example: "參考這個構圖的前中後景分離方式，不是要抄光影"

CATEGORY GAPS — Assess if the ref set covers all needed dimensions:
- Lighting ref without Color ref = 打光師知道方向，但調色師沒有目標
- Mood ref without Composition ref = 氛圍對了，但鏡頭語言沒有依據
- Style ref without Texture ref = 整體風格有了，但材質細節沒有標準

MAIN REF vs SECONDARY logic:
- Main Ref = 整個作品要對齊的核心視覺標準，通常1-3張，每個 department 最多2張
- Secondary = 某個局部細節的參考，例如「只看這張的金屬材質，其他不管」
- Red flag: 10張都是 Main Ref = 沒有優先順序，team 會迷失

CONFLICT DETECTION:
- 如果有兩張 Lighting refs 方向矛盾（一張強調硬光、一張強調柔光），要指出並問哪個優先
- 如果 Style ref 是寫實主義但 Color ref 是高飽和動漫色，要問這個反差是刻意的嗎？

SPECIFIC EXAMPLES for common situations:
- "這張 ref 我想看的是構圖" → 問: 是前中後景的空間感（如《英雄》的空間層次），還是主體在畫面中的位置（如《2001》的中心構圖），還是鏡頭焦距帶來的壓縮感？
- "幫我找缺口" → 逐一檢查 category，找出哪些 VFX 製作環節（打光/合成/動態/材質）沒有對應的 ref
- "這張要 Main 還是 Secondary" → 問: 這張的哪個部分是你要對齊的？如果只有一個局部，應該是 Secondary 並在 note 寫清楚

Rules:
- Always reference the user's ACTUAL ref titles and notes in your response
- Max 2 questions per response
- Be specific enough that a junior artist can act on the answer immediately
- Respond in Traditional Chinese"""
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