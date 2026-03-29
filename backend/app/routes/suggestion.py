"""
suggestion.py  —  /suggestion/*

Architecture:
  Every chat endpoint runs a 3-AI debate:
  - OpenAI: provides opinions from a technical/execution perspective
  - Gemini: provides opinions from a creative/strategy perspective
  - Claude: leads the synthesis, outputs unified suggestions (no role names, no 'A thinks/B thinks')

  Output principles:
  - Suggestions first: give 2-3 specific actionable suggestions; only ask follow-up questions when info is truly insufficient
  - Never mention role names in responses (Director, Supervisor, Agent A/B, etc.)
  - No ** bold or --- separators or any markdown
  - English
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import os, asyncio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

router = APIRouter(prefix="/suggestion", tags=["suggestion"])


# ── Lazy clients ──────────────────────────────────────────────────
def get_openai():
    from openai import AsyncOpenAI
    return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_anthropic():
    import anthropic
    return anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


# ── Low-level call helpers ────────────────────────────────────────
async def _call_openai(system: str, msgs: list, max_tokens: int = 500) -> str:
    try:
        client = get_openai()
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system}] + msgs,
            temperature=0.7, max_tokens=max_tokens,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"[Technical observation temporarily unavailable: {e}]"


async def _call_gemini(system: str, user: str) -> str:
    try:
        from google import genai
        from google.genai import types
        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        resp = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.0-flash",
            contents=user,
            config=types.GenerateContentConfig(system_instruction=system),
        )
        return resp.text.strip()
    except Exception as e:
        return f"[Creative observation temporarily unavailable: {e}]"


async def _call_claude(system: str, msgs: list, max_tokens: int = 800) -> str:
    try:
        client = get_anthropic()
        resp = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system,
            messages=msgs,
        )
        return resp.content[0].text.strip()
    except Exception as e:
        # Fallback to OpenAI
        try:
            client_oai = get_openai()
            # Strip image blocks for OpenAI fallback (only pass text)
            text_msgs = []
            for m in msgs:
                if isinstance(m.get("content"), list):
                    text_parts = " ".join(p["text"] for p in m["content"] if p.get("type") == "text")
                    text_msgs.append({"role": m["role"], "content": text_parts})
                else:
                    text_msgs.append(m)
            resp = await client_oai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": system}] + text_msgs,
                temperature=0.7, max_tokens=max_tokens,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e2:
            return f"AI response failed: {e2}"


def _build_ref_image_blocks(refs: list) -> list:
    """Convert all_refs_context previews (base64) into Claude vision content blocks."""
    blocks = []
    for r in refs or []:
        preview = r.get("preview", "")
        if not preview or not preview.startswith("data:image"):
            continue
        try:
            header, b64data = preview.split(",", 1)
            # Extract media type: data:image/jpeg;base64 → image/jpeg
            media_type = header.split(":")[1].split(";")[0]
            if media_type not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
                media_type = "image/jpeg"
            title = r.get("title", "untitled")
            cat = r.get("category", "")
            note = r.get("note", "")
            label = "Main" if r.get("is_pinned") or r.get("priority") == "Main" else "Secondary"
            note_part = (" | note: " + note) if note else ""
            blocks.append({"type": "text", "text": "[Image: " + title + " | " + cat + " | " + label + note_part + "]"})
            blocks.append({"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64data}})
        except Exception:
            continue
    return blocks


# ── Core debate engine ────────────────────────────────────────────
NO_MD = "Respond in English. Output plain text only. Do not use ** bold, --- separators, or any markdown symbols."

async def debate_and_synthesize(
    context: str,          # Current page background data (brief/refs/etc)
    user_message: str,     # User input
    history: list,         # Conversation history [{role, content}]
    page_focus: str,       # This page's analysis focus
) -> str:
    """
    Round 1: OpenAI (technical/execution) + Gemini (creative/strategy) in parallel
    Round 2: Claude integrates both perspectives, outputs unified suggestions, no role names
    """
    # ── Round 1 ───────────────────────────────────────────────────
    NO_HALLUCINATE = "Never fabricate or assume any filenames. Use only names that appear in the user-provided data. If none exist, refer to 'your reference image'."
    sys_tech = (
        f"You are a senior VFX technical expert, analyzing problems from a technical execution perspective. {page_focus}\n"
        f"Rules: Provide direct, specific technical observations and suggestions. {NO_HALLUCINATE} {NO_MD}"
    )
    sys_creative = (
        f"You are a senior VFX creative strategy consultant, analyzing problems from the perspective of creativity and visual language. {page_focus}\n"
        f"Rules: Provide direct, specific creative observations and directional suggestions. {NO_HALLUCINATE} {NO_MD}"
    )

    # Build user content for parallel calls
    full_user = f"[RESPOND ONLY IN ENGLISH — do not use any other language regardless of the input language]\n\nBackground:\n{context}\n\nUser message: {user_message}" if context else f"[RESPOND ONLY IN ENGLISH — do not use any other language regardless of the input language]\n\n{user_message}"

    tech_view, creative_view = await asyncio.gather(
        _call_openai(sys_tech, history + [{"role": "user", "content": full_user}]),
        _call_gemini(sys_creative, full_user),
    )

    # ── Round 2: Claude synthesizes ───────────────────────────────
    ADVICE_RULE = (
        "Core principle: lead with suggestions; follow-up questions are the exception."
        "Start with 2–3 specific, actionable improvement suggestions, each explaining how to execute in the VFX workflow."
        "Only ask one critical follow-up question when information is so insufficient that no meaningful suggestions can be given."
        "Do not repeat the problem description. Go straight to 'Here's what you can do'."
    )

    sys_claude = (
        f"You are a senior VFX advisory assistant integrating both technical and creative analysis to deliver unified suggestions.\n"
        f"{ADVICE_RULE}\n"
        f"Format rules: Output plain text. Do not use ** bold or --- separators. Do not mention any AI roles or model names."
        f"Do not use phrases like 'based on the analysis' or 'there are two perspectives'. Go directly to the suggestion.\n"
        f"Important: Never fabricate or assume any filenames (e.g. Tokyo.jpg, test.png)."
        f"Use only filenames that actually appear in user-provided data. If none, refer to 'your reference image'. {NO_MD}"
    )

    synthesis_prompt = (
        f"The following is an analysis of this issue from two different perspectives:\n\n"
        f"Technical Execution:\n{tech_view}\n\n"
        f"Creative Strategy:\n{creative_view}\n\n"
        f"[RESPOND ONLY IN ENGLISH]\nUser's original message: {user_message}\n"
        f"Background: {context[:500] if context else '(none)'}\n\n"
        f"Integrate the above analysis and output a direct suggestion reply to the user."
    )

    return await _call_claude(sys_claude, history + [{"role": "user", "content": synthesis_prompt}])


# ── Page-specific focus descriptions ─────────────────────────────
FOCUS = {
    "brief": (
        "Page focus: Help understand the Director's Brief and Spec, translating the director's intent into specific directions the Artist can execute."
        "Focus on: Clarity of creative direction, completeness of technical specs, and potentially missing important details."
    ),
    "reference": (
        "Page focus: Extract actionable visual language from Reference images."
        "Focus on: Lighting logic, color structure, compositional principles, and the alignment and gaps between Reference and Spec."
    ),
    "reflection": (
        "Page focus: Deepen the Artist's creative thinking and identify actionable directions."
        "Focus on: Logical coherence of creative intent, tension with Spec/Reference, and technical details that can be improved."
    ),
    "analysis": (
        "Page focus: Understand the AI analysis results and extract the most important action items from per-metric feedback."
        "Focus on: Which issues must be fixed immediately, which can be iterated later, and VFX pipeline-compatible operation suggestions."
    ),
}


# ── Pydantic ──────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class BriefChatRequest(BaseModel):
    project_id: str = "proj_001"
    message: str
    history: List[ChatMessage] = []
    brief_context: Optional[dict] = None
    context: Optional[str] = None
    all_refs_context: Optional[List[dict]] = None   # from reference-hub
    clicked_ref_id: Optional[str] = None

class ModeChatRequest(BaseModel):
    mode: str
    content: str
    spec_and_refs: str = ""


def _history_msgs(req: BriefChatRequest) -> list:
    return [
        {"role": "assistant" if m.role in ("assistant", "ai") else "user", "content": m.content}
        for m in req.history[-8:]
    ]

def _context_str(req: BriefChatRequest) -> str:
    parts = []
    if req.context:
        parts.append(req.context)
    if req.brief_context and isinstance(req.brief_context, dict):
        parts.append("\n".join(f"{k}: {v}" for k, v in req.brief_context.items() if v))
    if req.all_refs_context:
        lines = []
        for i, r in enumerate(req.all_refs_context):
            title   = r.get("title", "untitled")
            cat     = r.get("category", "")
            note    = r.get("note", "").strip()
            pinned  = "Main Ref" if r.get("is_pinned") or r.get("priority") == "main" else "Secondary"
            note_str = f'note: "{note}"' if note else "note: (not filled)"
            clicked = " ← User is asking about this image" if r.get("id") == req.clicked_ref_id else ""
            lines.append(f"  [{i+1}] {title} | {cat} | {pinned} | {note_str}{clicked}")
        parts.append("Reference list (real filenames only — no fabrication):\n" + "\n".join(lines))
    return "\n\n".join(parts) if parts else ""


# ── Routes ────────────────────────────────────────────────────────
@router.post("/chat/brief")
async def chat_brief(req: BriefChatRequest):
    reply = await debate_and_synthesize(
        context=_context_str(req),
        user_message=req.message,
        history=_history_msgs(req),
        page_focus=FOCUS["brief"],
    )
    return {"response": reply, "reply": reply}


@router.post("/chat/reference")
async def chat_reference(req: BriefChatRequest):
    """Reference analysis with Claude vision — Claude sees the actual images."""
    image_blocks = _build_ref_image_blocks(req.all_refs_context or [])

    if image_blocks:
        # Build text metadata list for context
        ref_meta = []
        for i, r in enumerate(req.all_refs_context or []):
            title = r.get("title", "untitled")
            cat = r.get("category", "")
            note = r.get("note", "").strip()
            label = "Main" if r.get("is_pinned") or r.get("priority") == "Main" else "Secondary"
            clicked = " ← User is asking about this image" if r.get("id") == req.clicked_ref_id else ""
            ref_meta.append(f"[{i+1}] {title} | {cat} | {label}{f' | note: {note}' if note else ''}{clicked}")
        meta_text = "Reference list:\n" + "\n".join(ref_meta)

        # Extra context (brief etc)
        extra = _context_str(req)

        sys_vision = (
            "You are a senior VFX consultant who can directly view all reference images."
            "Provide specific analysis based on the actual visual content of the images (lighting direction, color tone, composition, texture, etc.)."
            "Never say 'I cannot see the image'. You have already seen the images. Describe what you see directly."
            "Output plain text. Do not use ** or --- markdown. Respond in English."
        )

        # Build multimodal user message: images + text question
        user_content = image_blocks + [
            {"type": "text", "text": meta_text + "\n\n" + extra + "\n\nUser question: " + req.message}
        ]

        # Use Claude vision directly (no debate, images can't go through OpenAI/Gemini here)
        reply = await _call_claude(sys_vision, [{"role": "user", "content": user_content}], max_tokens=1000)
    else:
        # No images — fall back to text debate
        reply = await debate_and_synthesize(
            context=_context_str(req),
            user_message=req.message,
            history=_history_msgs(req),
            page_focus=FOCUS["reference"],
        )
    return {"response": reply, "reply": reply}


@router.post("/chat/reflection")
async def chat_reflection(req: BriefChatRequest):
    """Artist reflection — uses Claude vision when ref images are available."""
    image_blocks = _build_ref_image_blocks(req.all_refs_context or [])
    if image_blocks:
        ref_meta = []
        for i, r in enumerate(req.all_refs_context or []):
            title = r.get("title", "untitled")
            cat = r.get("category", "")
            note = r.get("note", "").strip()
            label = "Main" if r.get("is_pinned") or r.get("priority") == "Main" else "Secondary"
            ref_meta.append(f"[{i+1}] {title} | {cat} | {label}" + (f" | note: {note}" if note else ""))
        meta_text = "Reference list:\n" + "\n".join(ref_meta)
        extra = _context_str(req)
        sys_vision = (
            "You are the Creative Exploration Agent, helping VFX Artists deepen creative thinking."
            "You can directly view all reference images. Provide specific analysis based on the actual visual content."
            "Never say 'I cannot see the image'. Describe what you see directly and give suggestions."
            "Output plain text. Do not use ** or --- markdown. Respond in English."
        )
        user_content = image_blocks + [
            {"type": "text", "text": meta_text + "\n\n" + extra + "\n\nUser said: " + req.message}
        ]
        reply = await _call_claude(sys_vision, _history_msgs(req) + [{"role": "user", "content": user_content}], max_tokens=1000)
    else:
        reply = await debate_and_synthesize(
            context=_context_str(req),
            user_message=req.message,
            history=_history_msgs(req),
            page_focus=FOCUS["reflection"],
        )
    return {"response": reply, "reply": reply}


@router.post("/chat/analysis")
async def chat_analysis(req: BriefChatRequest):
    reply = await debate_and_synthesize(
        context=_context_str(req),
        user_message=req.message,
        history=_history_msgs(req),
        page_focus=FOCUS["analysis"],
    )
    return {"response": reply, "reply": reply}


@router.post("/chat/compare")
async def chat_compare(req: BriefChatRequest):
    """Reference Compare — find gaps, give actionable fixes."""
    reply = await debate_and_synthesize(
        context=_context_str(req),
        user_message=req.message,
        history=_history_msgs(req),
        page_focus=(
            "Page focus: Compare Artist artwork with Reference, identify specific metric gaps, and provide actionable revision suggestions."
            "Focus on: Lighting direction/intensity differences, compositional proportion gaps, color temperature deviations, texture quality, depth of field and exposure gaps."
            "Suggestions must be specific enough to be directly actionable in VFX software."
        ),
    )
    return {"response": reply, "reply": reply}

@router.post("/chat/mode")
async def chat_mode(req: ModeChatRequest):
    """Rephrase / Logic Mode / Evidence Binding — 3-AI debate."""
    MODE_CONFIGS = {
        "rephrase": {
            "task": "Rewrite the following VFX professional response in plain language. Remove jargon, use everyday analogies, and write as if explaining to a friend.",
            "tech": "Your task: identify technical jargon and replace it with simple technical analogies.",
            "creative": "Your task: find cross-domain everyday analogies so that someone with no VFX knowledge can understand.",
        },
        "logic": {
            "task": "Reorganize the following response using strict causal logic. Frame each argument with 'because...therefore...', and end with 2–3 verifiable judgment criteria.",
            "tech": "Your task: break down the causal chain and identify the underlying assumptions and technical basis of each argument.",
            "creative": "Your task: challenge logical gaps, propose counterexamples or edge cases to make the reasoning more rigorous.",
        },
        "evidence": {
            "task": "Support the following response with concrete evidence. Prioritize project data; supplement with real web resource URLs when needed.",
            "tech": f"Your task: find the most directly relevant references from project data:\n{req.spec_and_refs or '(none)'}",
            "creative": "Your task: find 1–2 real industry resource URLs, format: 'Further reading: description https://...'.",
        },
    }

    if req.mode not in MODE_CONFIGS:
        return {"response": f"Unsupported mode: {req.mode}", "reply": f"Unsupported mode: {req.mode}"}

    cfg = MODE_CONFIGS[req.mode]
    user_input = f"Task: {cfg['task']}\n\nContent to process:\n{req.content}"

    tech_view, creative_view = await asyncio.gather(
        _call_openai(f"{cfg['tech']} {NO_MD}", [{"role": "user", "content": user_input}]),
        _call_gemini(f"{cfg['creative']} {NO_MD}", user_input),
    )

    sys_claude = (
        f"Integrate analysis from both perspectives and output the final version for the user."
        f"Do not mention role names or say 'based on the analysis'. Output the result directly. {NO_MD}"
    )
    final = await _call_claude(sys_claude, [{"role": "user", "content": (
        f"Task: {cfg['task']}\n\nOriginal content:\n{req.content}\n\n"
        f"Perspective 1:\n{tech_view}\n\nPerspective 2:\n{creative_view}\n\n"
        f"Please integrate the above and output the final version directly."
    )}])

    return {"response": final, "reply": final,
            "debate": {"view_1": tech_view, "view_2": creative_view, "synthesis": final}}