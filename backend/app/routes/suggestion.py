"""
suggestion.py  —  /suggestion/*

架構：
  每個 chat endpoint 都走 3-AI debate：
  - OpenAI：從技術/執行面給意見
  - Gemini：從創意/策略面給意見
  - Claude：主導整合，輸出統一建議（不提角色名稱，不說「A認為/B認為」）

  輸出原則：
  - 建議優先：先給 2-3 個具體可執行建議，資訊不足才追問
  - 不在回覆裡提及任何角色名稱（Director, Supervisor, Agent A/B 等）
  - 不使用 ** 加粗、--- 分隔線等 markdown
  - 繁體中文
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
        return f"[技術面觀察暫時無法取得: {e}]"


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
        return f"[創意面觀察暫時無法取得: {e}]"


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
            resp = await client_oai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": system}] + msgs,
                temperature=0.7, max_tokens=max_tokens,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e2:
            return f"AI 回應失敗：{e2}"


# ── Core debate engine ────────────────────────────────────────────
NO_MD = "用繁體中文回應。輸出純文字，不使用 ** 加粗、--- 分隔線或任何 markdown 符號。"

async def debate_and_synthesize(
    context: str,          # 當前頁面的背景資料（brief/refs/etc）
    user_message: str,     # 用戶輸入
    history: list,         # 對話歷史 [{role, content}]
    page_focus: str,       # 這個頁面的分析重點
) -> str:
    """
    Round 1: OpenAI (技術/執行面) + Gemini (創意/策略面) 並行
    Round 2: Claude 整合兩方意見，輸出統一建議，不提角色名
    """
    # ── Round 1 ───────────────────────────────────────────────────
    NO_HALLUCINATE = "絕對不要編造或假設任何檔案名稱。只使用用戶提供資料中實際出現的名稱，若無則用「你的參考圖」代替。"
    sys_tech = (
        f"你是資深 VFX 技術專家，從技術執行角度分析問題。{page_focus}\n"
        f"規則：直接給出技術層面的具體觀察與建議。{NO_HALLUCINATE} {NO_MD}"
    )
    sys_creative = (
        f"你是資深 VFX 創意策略顧問，從創意與視覺語言角度分析問題。{page_focus}\n"
        f"規則：直接給出創意層面的具體觀察與方向建議。{NO_HALLUCINATE} {NO_MD}"
    )

    # Build user content for parallel calls
    full_user = f"背景資料：\n{context}\n\n用戶訊息：{user_message}" if context else user_message

    tech_view, creative_view = await asyncio.gather(
        _call_openai(sys_tech, history + [{"role": "user", "content": full_user}]),
        _call_gemini(sys_creative, full_user),
    )

    # ── Round 2: Claude synthesizes ───────────────────────────────
    ADVICE_RULE = (
        "核心原則：建議優先，追問是例外。"
        "先給 2-3 個具體可執行的改進建議，每個建議說明在 VFX 工作流中如何具體操作。"
        "只有在資訊嚴重不足、無法給出任何有意義建議時，才追問一個最關鍵的問題。"
        "不要複述問題描述，直接切入「你可以這樣做」。"
    )

    sys_claude = (
        f"你是資深 VFX 顧問助手，整合了技術和創意兩個維度的分析，給出統一的建議。\n"
        f"{ADVICE_RULE}\n"
        f"格式規則：輸出純文字，不使用 ** 加粗或 --- 分隔線，不提及任何 AI 角色或模型名稱，"
        f"不說「根據分析」「有兩種觀點」等繞圈子的話，直接給建議。\n"
        f"重要限制：絕對不要自己編造或假設任何檔案名稱（如 Tokyo.jpg、test.png 等）。"
        f"只使用用戶實際提供的資料中出現的檔案名稱。若無具體檔案資料，用「你的參考圖」代替。{NO_MD}"
    )

    synthesis_prompt = (
        f"以下是從兩個不同角度對這個問題的分析：\n\n"
        f"技術執行面：\n{tech_view}\n\n"
        f"創意策略面：\n{creative_view}\n\n"
        f"用戶的原始訊息：{user_message}\n"
        f"背景資料：{context[:500] if context else '（無）'}\n\n"
        f"請整合以上分析，直接輸出給用戶的建議回覆。"
    )

    return await _call_claude(sys_claude, history + [{"role": "user", "content": synthesis_prompt}])


# ── Page-specific focus descriptions ─────────────────────────────
FOCUS = {
    "brief": (
        "頁面重點：協助理解導演的 Brief 和 Spec，把導演意圖轉譯成 Artist 能執行的具體方向。"
        "關注：創意方向的清晰度、技術規格的完整性、可能遺漏的重要細節。"
    ),
    "reference": (
        "頁面重點：從 Reference 圖中提取可執行的視覺語言。"
        "關注：光影邏輯、色彩結構、構圖原則，以及 Reference 與 Spec 的對應關係和缺口。"
    ),
    "reflection": (
        "頁面重點：深化 Artist 的創意思考，找到可執行的方向。"
        "關注：創意意圖的邏輯性、與 Spec/Reference 的張力、可以提升的技術細節。"
    ),
    "analysis": (
        "頁面重點：理解 AI 分析結果，從分項指標回饋中提取最重要的行動項目。"
        "關注：哪些問題必須立即修正、哪些可以後續迭代、符合 VFX Pipeline 的操作建議。"
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
            note_str = f'note: "{note}"' if note else "note: （未填寫）"
            clicked = " ← 用戶正在詢問此圖" if r.get("id") == req.clicked_ref_id else ""
            lines.append(f"  [{i+1}] {title} | {cat} | {pinned} | {note_str}{clicked}")
        parts.append("Reference 清單（使用真實檔名，禁止自行捏造）：\n" + "\n".join(lines))
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
    reply = await debate_and_synthesize(
        context=_context_str(req),
        user_message=req.message,
        history=_history_msgs(req),
        page_focus=FOCUS["reference"],
    )
    return {"response": reply, "reply": reply}


@router.post("/chat/reflection")
async def chat_reflection(req: BriefChatRequest):
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
            "頁面重點：比對 Artist 作品與 Reference，找出各指標的具體差距並給出可操作的修改建議。"
            "關注：光影方向/強度差異、構圖比例差距、色彩溫度偏差、材質質感、景深和曝光差距。"
            "建議要具體到 VFX 軟體中可以直接操作的步驟。"
        ),
    )
    return {"response": reply, "reply": reply}

@router.post("/chat/mode")
async def chat_mode(req: ModeChatRequest):
    """換句話說 / 講邏輯 / Evidence Binding — 3-AI debate."""
    MODE_CONFIGS = {
        "rephrase": {
            "task": "把以下這段 VFX 專業回覆改寫成白話版本，去除術語，用日常比喻解釋，語氣像朋友解釋。",
            "tech": "你負責找出術語並替換成簡單的技術類比。",
            "creative": "你負責找出跨領域的生活比喻，讓完全不懂 VFX 的人也能理解。",
        },
        "logic": {
            "task": "把以下這段回覆用嚴格因果邏輯重新整理，每個論點用「因為...所以...」句式，最後列出 2-3 個可驗證的判斷標準。",
            "tech": "你負責拆解因果鏈，找出每個論點的前提假設與技術依據。",
            "creative": "你負責質疑論點漏洞，提出反例或邊界條件，讓邏輯更嚴密。",
        },
        "evidence": {
            "task": "把以下這段回覆用具體證據支撐，優先引用專案資料，不足時補充真實網路資源 URL。",
            "tech": f"你負責從專案資料中找最直接相關的引用：\n{req.spec_and_refs or '（無）'}",
            "creative": "你負責找 1-2 個真實的業界資源 URL，格式：「延伸參考：說明 https://...」",
        },
    }

    if req.mode not in MODE_CONFIGS:
        return {"response": f"不支援的模式：{req.mode}", "reply": f"不支援的模式：{req.mode}"}

    cfg = MODE_CONFIGS[req.mode]
    user_input = f"任務：{cfg['task']}\n\n需要處理的內容：\n{req.content}"

    tech_view, creative_view = await asyncio.gather(
        _call_openai(f"{cfg['tech']} {NO_MD}", [{"role": "user", "content": user_input}]),
        _call_gemini(f"{cfg['creative']} {NO_MD}", user_input),
    )

    sys_claude = (
        f"整合兩個角度的分析，輸出最終版本給用戶。"
        f"不提角色名稱，不說「根據分析」，直接輸出結果。{NO_MD}"
    )
    final = await _call_claude(sys_claude, [{"role": "user", "content": (
        f"任務：{cfg['task']}\n\n原始內容：\n{req.content}\n\n"
        f"角度一：\n{tech_view}\n\n角度二：\n{creative_view}\n\n"
        f"請整合以上，直接輸出最終版本。"
    )}])

    return {"response": final, "reply": final,
            "debate": {"view_1": tech_view, "view_2": creative_view, "synthesis": final}}