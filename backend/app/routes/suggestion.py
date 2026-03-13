from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import os, asyncio
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

router = APIRouter(prefix="/suggestion", tags=["suggestion"])

# ── API clients (lazy-init so missing keys don't crash startup) ──
def get_openai():
    from openai import AsyncOpenAI
    return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_anthropic():
    import anthropic
    return anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def get_gemini():
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    return genai

# ── System prompts ───────────────────────────────────────────────
SYSTEM_BRIEF = """你是一位資深 VFX 視效製作顧問，專門協助 Artist 深入理解 Director 的 Brief 與 Spec。
規則：用繁體中文回應。不使用 ** 或 --- 等 markdown 符號，直接輸出純文字。提問具體、切入重點。"""

SYSTEM_REFLECTION = """你是 Creative Exploration Agent，幫助 Artist 在接到 Spec 與 Reference 後深入思考。
任務：找出 Spec 與 Reference 之間的張力或矛盾，追問 Artist 的創意決策。
規則：用繁體中文，不使用 markdown 符號，直接輸出純文字。"""

# ── Mode-specific prompts (per AI role in debate) ────────────────
MODE_PROMPTS = {
    "rephrase": {
        "task": "把以下這段 VFX 專業回覆，改寫成任何人都能理解的白話版本。去除術語，用日常比喻解釋每個概念。語氣像朋友解釋，不像教科書。",
        "openai_role":    "你擅長用簡單類比解釋技術概念，偏向用電影觀眾的視角來理解 VFX。",
        "gemini_role":    "你擅長找到跨領域的生活比喻，把複雜概念對應到日常經驗。",
        "anthropic_role": "你是最終整合者，把 OpenAI 和 Gemini 的解釋版本取長補短，輸出最容易理解的白話版本。",
    },
    "logic": {
        "task": "把以下這段回覆，用嚴格因果邏輯重新整理。每個論點用「因為...所以...」或「如果...那麼...」句式，最後列出 2-3 個可驗證的判斷標準。",
        "openai_role":    "你負責拆解因果鏈，找出每個論點背後的前提假設。",
        "gemini_role":    "你負責質疑論點的漏洞，提出反例或邊界條件。",
        "anthropic_role": "你是最終整合者，綜合 OpenAI 的因果分析和 Gemini 的質疑，輸出邏輯嚴密、有判斷標準的版本。",
    },
    "evidence": {
        "task": "把以下這段回覆，用具體證據支撐每個論點。優先引用提供的專案資料，不足時補充真實網路資源 URL。",
        "openai_role":    "你負責從專案資料（Spec 和 References）中找到最直接相關的引用，格式：「根據 [來源]：[內容]」。",
        "gemini_role":    "你負責找 1-2 個真實的業界參考資源 URL（VFX 相關網站、研究、案例），補充資料不足的論點，格式：「延伸參考：說明文字 https://...」。",
        "anthropic_role": "你是最終整合者，把 OpenAI 的內部引用和 Gemini 的外部資源合併，輸出每個論點都有具體來源的版本。",
    },
}


async def call_openai(system: str, user: str) -> str:
    try:
        client = get_openai()
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.7, max_tokens=600,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"[OpenAI 無回應: {e}]"


async def call_gemini(system: str, user: str) -> str:
    try:
        genai = get_gemini()
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system,
        )
        resp = await asyncio.to_thread(model.generate_content, user)
        return resp.text.strip()
    except Exception as e:
        return f"[Gemini 無回應: {e}]"


async def call_anthropic(system: str, user: str) -> str:
    try:
        client = get_anthropic()
        resp = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        return f"[Anthropic 無回應: {e}]"


# ── Pydantic models ──────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class BriefChatRequest(BaseModel):
    project_id: str = "proj_001"
    message: str
    history: List[ChatMessage] = []
    brief_context: Optional[dict] = None

class ModeChatRequest(BaseModel):
    mode: str
    content: str
    spec_and_refs: str = ""


# ── Routes ───────────────────────────────────────────────────────
@router.post("/chat/brief")
async def chat_brief(req: BriefChatRequest):
    messages = [{"role": "system", "content": SYSTEM_BRIEF}]
    for m in req.history[-10:]:
        role = "assistant" if m.role in ("assistant", "ai") else "user"
        messages.append({"role": role, "content": m.content})
    messages.append({"role": "user", "content": req.message})
    try:
        client = get_openai()
        resp = await client.chat.completions.create(
            model="gpt-4o-mini", messages=messages, temperature=0.7, max_tokens=800,
        )
        reply = resp.choices[0].message.content.strip()
        return {"response": reply, "reply": reply}
    except Exception as e:
        return {"response": f"AI 回應失敗：{e}", "reply": f"AI 回應失敗：{e}"}


@router.post("/chat/reflection")
async def chat_reflection(req: BriefChatRequest):
    messages = [{"role": "system", "content": SYSTEM_REFLECTION}]
    for m in req.history[-10:]:
        role = "assistant" if m.role in ("assistant", "ai") else "user"
        messages.append({"role": role, "content": m.content})
    messages.append({"role": "user", "content": req.message})
    try:
        client = get_openai()
        resp = await client.chat.completions.create(
            model="gpt-4o-mini", messages=messages, temperature=0.7, max_tokens=800,
        )
        reply = resp.choices[0].message.content.strip()
        return {"response": reply, "reply": reply}
    except Exception as e:
        return {"response": f"AI 回應失敗：{e}", "reply": f"AI 回應失敗：{e}"}


@router.post("/chat/mode")
async def chat_mode(req: ModeChatRequest):
    """3-AI debate: OpenAI + Gemini in parallel → Anthropic synthesizes"""
    if req.mode not in MODE_PROMPTS:
        return {"response": f"不支援的模式：{req.mode}", "reply": f"不支援的模式：{req.mode}"}

    cfg = MODE_PROMPTS[req.mode]
    spec_ctx = f"\n\n專案資料：\n{req.spec_and_refs}" if req.spec_and_refs else ""
    full_task = cfg["task"] + spec_ctx
    user_input = f"任務：{full_task}\n\n需要處理的內容：\n{req.content}"

    openai_system  = f"{cfg['openai_role']} 規則：用繁體中文，輸出純文字，不使用任何 markdown 符號。"
    gemini_system  = f"{cfg['gemini_role']} 規則：用繁體中文，輸出純文字，不使用任何 markdown 符號。"

    # Round 1: parallel
    openai_reply, gemini_reply = await asyncio.gather(
        call_openai(openai_system, user_input),
        call_gemini(gemini_system, user_input),
    )

    # Round 2: Anthropic synthesizes
    anthropic_system = (
        f"{cfg['anthropic_role']}\n"
        "規則：用繁體中文，輸出純文字，絕對禁止 ** 加粗或 --- 等任何 markdown 符號。"
    )
    synthesis_prompt = (
        f"兩位 AI 對同一任務的回應如下，請取長補短整合成最佳版本。\n\n"
        f"任務：{full_task}\n\n原始內容：\n{req.content}\n\n"
        f"OpenAI 版本：\n{openai_reply}\n\n"
        f"Gemini 版本：\n{gemini_reply}\n\n"
        f"直接輸出整合後的最終結果，不要說明整合過程。"
    )

    final = await call_anthropic(anthropic_system, synthesis_prompt)
    return {"response": final, "reply": final,
            "debate": {"openai": openai_reply, "gemini": gemini_reply, "synthesis": final}}