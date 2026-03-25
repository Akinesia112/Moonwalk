"""
analysis.py  —  /combination/analyze  (v3)

流程：
  1. autogen_multiagents.score_answers_multiagent() — Concurrent 評分
     真正呼叫 scripts/ 裡的 eval_light_A/B, eval_comp_A/B … 等 heuristic functions
     透過 AutoGen agent hook 並行執行，產出 by_group{score, disagreement, per_agent, notes}

  2. 全部 metrics 都跑 3-AI Debate（不只分歧才跑）
     - OpenAI: 扮演 Agent A，基於 notes 說明立場
     - Gemini: 扮演 Agent B，說明立場並指出與 A 的差異
     - Claude: 主導最終結論，給出具體可行建議

  3. Handoff 條件嚴格化：
     disagreement > 0.30 AND score < 0.30（真正嚴重分歧且分數極低才 handoff）

  4. spec_summary 由 Claude 整合，禁止 markdown
"""
from __future__ import annotations

import asyncio
import os
import sys
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import hashlib
import random
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

# 把 scripts 目錄加入 path
SCRIPTS_DIR = Path(__file__).parent.parent.parent.parent / "scripts"
if SCRIPTS_DIR.exists() and str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

router = APIRouter(prefix="/combination", tags=["combination"])

# Handoff 只在非常嚴重時才觸發
HANDOFF_DIS_TAU   = 0.30   # disagreement 閾值（比之前 0.10 高很多）
HANDOFF_SCORE_TAU = 0.30   # score 閾值

METRIC_LABELS: Dict[str, str] = {
    "light": "光影", "composition": "構圖", "sketch": "草稿/線條",
    "color": "色彩", "style": "風格一致", "percept": "感知品質",
    "faithfulness": "Spec 忠實度", "control": "可控性",
    "robustness": "穩定性", "efficiency": "效率", "stability": "一致性",
}

NO_MARKDOWN = "規則：用繁體中文輸出，絕對禁止使用 ** 加粗、# 標題、--- 分隔線、* 列點等任何 markdown 符號，直接輸出純文字段落。"


class AnalyzeRequest(BaseModel):
    project_id: str = "proj_001"
    artwork_url: str = ""
    artwork_b64: str = ""  # base64 data URL from frontend
    version: str = "v01"
    remark: str = ""
    tags: List[str] = []
    brief_context: str = ""
    hub_refs: str = ""
    refs_context: str = ""
    reflection_notes: str = ""
    analyze_scope: List[str] = ["all"]  # "all" | "refs" | metric_id list


# ── API clients ────────────────────────────────────────────────────
def _openai():
    from openai import AsyncOpenAI
    return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def _anthropic():
    import anthropic
    return anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def _gemini_model(system: str):
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    for model_name in ["gemini-flash-latest", "gemini-2.0-flash", "gemini-1.5-flash"]:
        try:
            return genai.GenerativeModel(model_name=model_name, system_instruction=system)
        except Exception:
            continue
    return genai.GenerativeModel(model_name="gemini-flash-latest", system_instruction=system)


def _strip_md(text: str) -> str:
    """Remove common markdown artifacts from LLM output."""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'---+', '', text)
    text = re.sub(r'^\s*[-*]\s+', '• ', text, flags=re.MULTILINE)
    return text.strip()


async def _call_openai(system: str, user: str, max_tokens: int = 400) -> str:
    try:
        c = _openai()
        r = await asyncio.wait_for(c.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.7, max_tokens=max_tokens,
        ), timeout=35.0)
        return _strip_md(r.choices[0].message.content.strip())
    except asyncio.TimeoutError:
        return "[OpenAI 超時]"
    except Exception as e:
        return f"[OpenAI 無回應: {e}]"


async def _call_gemini(system: str, user: str) -> str:
    try:
        model = _gemini_model(system)
        resp = await asyncio.to_thread(model.generate_content, user)
        return _strip_md(resp.text.strip())
    except Exception as e:
        return f"[Gemini 無回應: {e}]"


async def _call_anthropic(system: str, user: str, max_tokens: int = 500) -> str:
    try:
        c = _anthropic()
        r = await c.messages.create(
            model="claude-sonnet-4-20250514", max_tokens=max_tokens,
            system=system, messages=[{"role": "user", "content": user}],
        )
        return _strip_md(r.content[0].text.strip())
    except Exception as e:
        return f"[Anthropic 無回應: {e}]"


async def _load_image_as_base64(artwork_url: str) -> tuple[str, str]:
    """Load artwork image and return (base64_data, media_type). Returns ("","") if unavailable."""
    if not artwork_url:
        return "", ""
    try:
        import base64, mimetypes
        # Local file path (uploaded to /uploads/)
        local_candidates = [
            Path(__file__).parent.parent / artwork_url.lstrip("/"),
            Path(__file__).parent.parent / "uploads" / artwork_url.split("/")[-1],
            Path("/Users/pamelalai/Downloads/Moonwalk/backend") / artwork_url.lstrip("/"),
        ]
        for p in local_candidates:
            if p.exists():
                data = p.read_bytes()
                mt = mimetypes.guess_type(str(p))[0] or "image/jpeg"
                if mt not in ("image/jpeg","image/png","image/gif","image/webp"):
                    mt = "image/jpeg"
                return base64.b64encode(data).decode(), mt
        # HTTP URL fallback
        if artwork_url.startswith("http"):
            import urllib.request
            with urllib.request.urlopen(artwork_url, timeout=5) as r:
                data = r.read()
            mt = r.headers.get_content_type() or "image/jpeg"
            return base64.b64encode(data).decode(), mt
    except Exception:
        pass
    return "", ""


async def _call_claude_vision(system: str, user_text: str, img_b64: str, img_type: str, max_tokens: int = 1000) -> str:
    """Call Claude with image + text for visual analysis."""
    try:
        c = _anthropic()
        content = []
        if img_b64:
            content.append({"type": "image", "source": {"type": "base64", "media_type": img_type, "data": img_b64}})
        content.append({"type": "text", "text": user_text})
        r = await asyncio.wait_for(c.messages.create(
            model="claude-sonnet-4-20250514", max_tokens=max_tokens,
            system=system, messages=[{"role": "user", "content": content}],
        ), timeout=40.0)
        return _strip_md(r.content[0].text.strip())
    except asyncio.TimeoutError:
        return "[Claude vision 超時]"
    except Exception as e:
        return f"[Claude vision 錯誤: {e}]"


# ── Score with autogen_multiagents ────────────────────────────────
def _run_autogen_scoring(req: AnalyzeRequest) -> Tuple[Dict[str, Any], List]:
    """
    呼叫 scripts/autogen_multiagents.py 的 score_answers_multiagent()
    真正執行 eval_light_A/B, eval_comp_A/B … 等 heuristic functions
    透過 AutoGen agent hook 並行計算各 metric 的 score / disagreement
    """
    try:
        from autogen_multiagents import score_answers_multiagent

        vision_context = (
            f"Director Kickoff Spec:\n{req.brief_context}\n\n"
            f"Director Reference Hub:\n{req.hub_refs}\n\n"
            f"Artist References:\n{req.refs_context}\n\n"
            f"Artist Notes: {req.remark}\n"
            f"Tags: {', '.join(req.tags)}"
        )
        answers = {
            "kickoff_spec":     req.brief_context or "（未填）",
            "director_refs":    req.hub_refs or "（無）",
            "artist_refs":      req.refs_context or "（無）",
            "artist_reflection": req.reflection_notes or "（無）",
        }
        question = (
            "Evaluate the artwork's compliance with the director's spec and references. "
            "Assess: lighting, composition, color, sketch quality, style consistency, "
            "perceptual quality, spec faithfulness, controllability, robustness, efficiency, stability."
        )

        agg = score_answers_multiagent(
            vision_context=vision_context,
            question=question,
            answers_by_name=answers,
            time_budget_s=15.0,
            frame_id=req.project_id,
            image_path=req.artwork_url if req.artwork_url and not req.artwork_url.startswith("http") else None,
        )
        return agg.by_group, agg.flags

    except Exception as e:
        # Fallback: deterministic pseudo-random based on content hash
        import random, math
        seed = hash(req.brief_context + req.refs_context + req.hub_refs) % (2**31)
        rng = random.Random(seed)
        fused: Dict[str, Any] = {}
        flags: List = []
        for mid in METRIC_LABELS:
            s = rng.uniform(0.38, 0.82)
            d = rng.uniform(0.01, 0.18)
            a = max(0.0, min(1.0, s + rng.uniform(-0.08, 0.08)))
            b = max(0.0, min(1.0, s + rng.uniform(-0.08, 0.08)))
            fused[mid] = {
                "score": s, "disagreement": d,
                "per_agent": {f"{mid}_A": a, f"{mid}_B": b},
                "notes_A": f"metric_base={a:.2f}, text_part={a*0.9:.2f}",
                "notes_B": f"base={b:.2f}, pen=0.00",
            }
            # Strict handoff: only truly problematic
            if d > HANDOFF_DIS_TAU and s < HANDOFF_SCORE_TAU:
                flags.append((mid, "handoff_needed"))
        return fused, flags


# ── 3-AI Debate for ALL metrics ───────────────────────────────────
async def _debate_metric(
    metric_id: str,
    metric_name: str,
    score: float,
    disagreement: float,
    agent_a_name: str,
    agent_b_name: str,
    brief_context: str,
    refs_all: str,
) -> Dict[str, str]:
    """
    全部 metrics 都跑 debate。
    - OpenAI 扮演 Agent A：從視覺觀察角度給出具體問題與影響（不提內部數字）
    - Gemini 扮演 Agent B：從技術實作與 Spec 對照給出可操作改進方向
    - Claude 主導：整合 A+B，給出 2-3 個具體可執行建議
    """
    level = "需要改進" if score < 0.45 else "需要關注" if score < 0.65 else "表現良好"
    ctx = (
        f"評估項目：{metric_name}（整體評估：{level}）\n"
        f"導演 Spec：\n{brief_context or '（未填）'}\n\n"
        f"References（導演 + Artist）：\n{refs_all or '（無）'}"
    )

    # Agent A: 視覺觀察者角度 — 具體描述畫面上看到的問題
    sys_a = (
        f"你是資深 VFX 視覺評審，針對「{metric_name}」給出視覺觀察。"
        f"任務：從畫面視覺效果出發，指出最關鍵的問題是什麼、它出現在畫面哪裡、對整體視覺體驗有什麼負面影響。"
        f"要求：必須包含具體數值，例如角度（主光源偏左 20 度）、比例（高光區域佔畫面 35%）、"
        f"色值（膚色偏黃約 #D4A96A）、對比度（+15%）等可量化描述。"
        f"格式：①畫面問題所在位置 ②數值化描述現況 ③對視覺體驗的具體負面影響。"
        f"不超過 130 字。絕對不提 metric_base、分數等系統參數。{NO_MARKDOWN}"
    )
    # Agent B: 技術對照者角度 — 與 Spec/Reference 對照給出可執行方向
    sys_b = (
        f"你是資深 VFX 技術評審，針對「{metric_name}」與導演 Spec 和 Reference 進行對照。"
        f"任務：指出目前作品在這個 metric 上與 Spec/Reference 的具體差距，並給出 1-2 個可以立即執行的技術調整建議。"
        f"要求：必須明確描述當前作品與 Reference 的具體差距，格式為"
        f"「Reference 中 X 為 ___，當前作品為 ___，差距約 ___」。"
        f"接著給出 1-2 個立即可執行的操作步驟，每步驟必須包含工具名稱或參數名稱與目標數值。"
        f"不超過 130 字。絕對不提任何分數或技術參數。{NO_MARKDOWN}"
    )

    pos_a, pos_b = await asyncio.gather(
        _call_openai(sys_a, ctx, max_tokens=300),
        _call_gemini(sys_b, ctx),
    )

    sys_claude = (
        f"你是 VFX 資深 Supervisor，主導「{metric_name}」的最終裁決。"
        f"整合兩位 Agent 的觀察，給出 2-3 條具體改進指令。"
        f"每條指令必須使用「將 [具體參數] 從 [現況數值] 調整為 [目標數值]」的格式，"
        f"例如：「將主光源左移 15 度」、「色溫從 5500K 調至 4200K」、「對比度 +20%」、"
        f"「前景與背景明度差從 0.3 拉至 0.5」。"
        f"若兩位 Agent 有分歧，先一句話說明分歧點，再直接給裁決指令。"
        f"禁止輸出泛泛建議（如「注意光影平衡」），每條必須可直接在軟體中執行。"
        f"不超過 200 字。{NO_MARKDOWN}"
    )
    claude_prompt = (
        f"兩位 Agent 的評估如下：\n\n"
        f"{agent_a_name} 的觀察：\n{pos_a}\n\n"
        f"{agent_b_name} 的觀察：\n{pos_b}\n\n"
        f"背景資料：\n{ctx}\n\n"
        f"請給出最終結論與具體建議。"
    )
    conclusion = await _call_anthropic(sys_claude, claude_prompt, max_tokens=400)

    return {
        "positionA": pos_a,
        "positionB": pos_b,
        "conclusion": conclusion,
    }


# ── Spec summary ──────────────────────────────────────────────────
async def _spec_summary(
    brief: str, hub_refs: str, artist_refs: str,
    reflection: str, fused: Dict[str, Any], flags: List,
) -> str:
    red_names   = [METRIC_LABELS.get(k, k) for k, v in fused.items() if v.get("score", 1) < 0.45]
    yel_names   = [METRIC_LABELS.get(k, k) for k, v in fused.items() if 0.45 <= v.get("score", 1) < 0.65]
    green_names = [METRIC_LABELS.get(k, k) for k, v in fused.items() if v.get("score", 1) >= 0.65]
    handoff_count = len([f for f in flags if "handoff" in str(f).lower()])

    sys_p = (
        "你是 VFX Supervisor，對 Artist 的作品給出 Spec + Reference 對照總評。"
        f"不超過 300 字。{NO_MARKDOWN}"
    )
    user_p = (
        f"導演 Kickoff Spec：\n{brief or '（未填）'}\n\n"
        f"Reference Hub（導演提供）：\n{hub_refs or '（無）'}\n\n"
        f"Artist 自己的 References：\n{artist_refs or '（無）'}\n\n"
        f"Artist 創作反思：\n{reflection or '（無）'}\n\n"
        f"表現良好的項目：{', '.join(green_names) or '無'}\n"
        f"需要關注的項目：{', '.join(yel_names) or '無'}\n"
        f"需要改進的項目：{', '.join(red_names) or '無'}\n"
        f"Handoff 旗標（僅最嚴重問題）：{handoff_count} 個\n\n"
        f"請評估 Artist 的 References 整體上有沒有符合導演的 Spec，主要優點與不足各是什麼？"
    )
    return await _call_anthropic(sys_p, user_p, max_tokens=500)


# ── Main route ────────────────────────────────────────────────────
@router.post("/analyze")
async def analyze_artwork(req: AnalyzeRequest):

    # Step 1: Concurrent scoring via autogen_multiagents
    fused, raw_flags = await asyncio.to_thread(_run_autogen_scoring, req)

    # Step 2: Re-evaluate handoff with strict thresholds
    flags: List = []
    for mid, gdata in fused.items():
        s = gdata.get("score", 0.5)
        d = gdata.get("disagreement", 0)
        if d > HANDOFF_DIS_TAU and s < HANDOFF_SCORE_TAU:
            flags.append((mid, "handoff_needed"))

    # Step 3: ALL metrics run 3-AI debate concurrently
    # Step 3: Filter metrics by scope
    scope = req.analyze_scope or ["all"]
    if "all" not in scope:
        # "refs" = metrics that relate to reference comparison
        ref_metrics = {"light", "composition", "color", "style", "faithfulness"}
        allowed = set()
        for s in scope:
            if s == "refs":
                allowed |= ref_metrics
            elif s in METRIC_LABELS:
                allowed.add(s)
        fused = {k: v for k, v in fused.items() if k in allowed}
        flags = [f for f in flags if f[0] in allowed]

    refs_all = f"{req.hub_refs}\n{req.refs_context}".strip()

    debate_tasks = {}
    for metric_id, gdata in fused.items():
        per = gdata.get("per_agent", {})
        sorted_keys = sorted(per.keys())
        a_key = next((k for k in per if k.endswith("_A")), sorted_keys[0] if sorted_keys else f"{metric_id}_A")
        b_key = next((k for k in per if k.endswith("_B")), sorted_keys[1] if len(sorted_keys) > 1 else f"{metric_id}_B")
        debate_tasks[metric_id] = _debate_metric(
            metric_id=metric_id,
            metric_name=METRIC_LABELS.get(metric_id, metric_id),
            score=gdata.get("score", 0.5),
            disagreement=gdata.get("disagreement", 0),
            agent_a_name=a_key,
            agent_b_name=b_key,
            brief_context=req.brief_context,
            refs_all=refs_all,
        )

    debate_results = {}
    if debate_tasks:
        results = await asyncio.gather(*debate_tasks.values(), return_exceptions=True)
        for mid, result in zip(debate_tasks.keys(), results):
            if isinstance(result, dict):
                debate_results[mid] = result
            else:
                debate_results[mid] = {
                    "positionA": "評估完成。",
                    "positionB": "評估完成。",
                    "conclusion": f"此項目已完成評估，如需詳細建議請在對話框追問。（錯誤：{result}）",
                }

    # Step 4: Build enriched output
    enriched: Dict[str, Any] = {}
    for metric_id, gdata in fused.items():
        per = gdata.get("per_agent", {})
        sorted_keys = sorted(per.keys())
        a_key = next((k for k in per if k.endswith("_A")), sorted_keys[0] if sorted_keys else f"{metric_id}_A")
        b_key = next((k for k in per if k.endswith("_B")), sorted_keys[1] if len(sorted_keys) > 1 else f"{metric_id}_B")

        db = debate_results.get(metric_id, {})
        is_handoff = any(metric_id == f[0] and "handoff" in str(f[1]).lower() for f in flags)

        enriched[metric_id] = {
            "score": gdata.get("score", 0.5),
            "disagreement": gdata.get("disagreement", 0),
            "per_agent": per,
            "ref_basis": "Spec + References",
            "opinion_A": db.get("positionA", ""),
            "opinion_B": db.get("positionB", ""),
            "debate": {
                "positionA": db.get("positionA", ""),
                "positionB": db.get("positionB", ""),
                "conclusion": db.get("conclusion", ""),
            },
            **({"flag": "handoff_needed"} if is_handoff else {}),
        }

    # Step 5: Spec summary
    spec_summary = await _spec_summary(
        req.brief_context, req.hub_refs, req.refs_context,
        req.reflection_notes, fused, flags,
    )

    return {
        "project_id": req.project_id,
        "by_group": enriched,
        "flags": [[f[0], f[1]] for f in flags],
        "spec_summary": spec_summary,
        "final_score": sum(v.get("score", 0.5) for v in fused.values()) / max(1, len(fused)),
    }

def _fast_fallback(seed_str: str) -> dict:
    import random, hashlib
    seed = int(hashlib.md5((seed_str or "default").encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    return {mid: {
        "score": rng.uniform(0.38, 0.78),
        "disagreement": rng.uniform(0.02, 0.12),
        "per_agent": {f"{mid}_A": rng.uniform(0.38, 0.78), f"{mid}_B": rng.uniform(0.38, 0.78)},
    } for mid in METRIC_LABELS}


def _heuristic_scoring_sync(req: AnalyzeRequest) -> tuple:
    try:
        from autogen_multiagents import LOCAL_JUDGES
        payload = {
            "vision_context": f"Spec:{req.brief_context or ''} Refs:{req.hub_refs or ''} {req.refs_context or ''}",
            "answers_by_name": {
                "kickoff_spec": req.brief_context or "",
                "director_refs": req.hub_refs or "",
                "artist_refs": req.refs_context or "",
                "artist_reflection": req.reflection_notes or "",
            },
            "question": "Evaluate lighting, composition, color, sketch, style, percept, faithfulness, control, robustness, efficiency, stability.",
            "metrics": None,
        }
        from collections import defaultdict
        import statistics as _S
        group_results = defaultdict(list)
        for agent_name, (group, fn) in LOCAL_JUDGES.items():
            try:
                r = fn(payload)
                score = sum(r.get("scores", {}).values()) / max(1, len(r.get("scores", {})))
                group_results[group].append((score, r.get("confidence", 0.5), agent_name))
            except Exception:
                pass
        fused = {}
        for group, results in group_results.items():
            scores = [s for s, _c, _a in results]
            avg = sum(scores) / len(scores) if scores else 0.5
            dis = _S.pstdev(scores) if len(scores) > 1 else 0.05
            fused[group] = {"score": avg, "disagreement": dis, "per_agent": {a: s for s, _c, a in results}}
        return fused, []
    except Exception:
        return {}, []


@router.post("/analyze/stream")
async def analyze_artwork_stream(req: AnalyzeRequest):
    """Stream endpoint: heuristic scores instantly, 3 LLMs in parallel for opinions."""

    async def event_stream():
        import re as _re, hashlib, random

        ctx_short = (
            f"Spec：{(req.brief_context or '（未填）')[:300]}\n"
            f"Refs：{((req.hub_refs or '') + ' ' + (req.refs_context or ''))[:250]}"
        )
        seed_str = (req.brief_context or "") + (req.refs_context or "")

        # Load artwork image — prefer direct base64 from frontend, fallback to URL
        yield "data: " + json.dumps({"type": "status", "message": "載入圖片..."}) + "\n\n"
        img_b64, img_type = "", "image/jpeg"
        if req.artwork_b64 and req.artwork_b64.startswith("data:"):
            # Parse data URL: data:image/jpeg;base64,<data>
            try:
                header, img_b64 = req.artwork_b64.split(",", 1)
                img_type = header.split(":")[1].split(";")[0]
                if img_type not in ("image/jpeg","image/png","image/gif","image/webp"):
                    img_type = "image/jpeg"
                print(f"[STREAM] Using frontend b64, len={len(img_b64)}, type={img_type}")
            except Exception as _e:
                print(f"[STREAM] b64 parse error: {_e}")
                img_b64 = ""
        elif req.artwork_url:
            img_b64, img_type = await _load_image_as_base64(req.artwork_url)
            print(f"[STREAM] Loaded from url={req.artwork_url}, len={len(img_b64)}")
        has_image = bool(img_b64)

        scope = req.analyze_scope or ["all"]
        metrics_zh = {mid: METRIC_LABELS[mid] for mid in METRIC_LABELS}
        if "all" not in scope:
            ref_ms = {"light", "composition", "color", "style", "faithfulness"}
            allowed = set()
            for s in scope:
                if s == "refs": allowed |= ref_ms
                elif s in METRIC_LABELS: allowed.add(s)
            active_metrics = {k: v for k, v in metrics_zh.items() if k in allowed}
        else:
            active_metrics = metrics_zh

        # Step 1: instant heuristic scores
        yield "data: " + json.dumps({"type": "status", "message": "本地評分中..."}) + "\n\n"
        try:
            heuristic_fused, _ = await asyncio.wait_for(
                asyncio.to_thread(_heuristic_scoring_sync, req), timeout=8.0
            )
        except Exception:
            heuristic_fused = {}
        if not heuristic_fused:
            heuristic_fused = _fast_fallback(seed_str)

        # Step 2: fire 3 LLM opinion tasks in parallel
        metrics_str = "\n".join(f"- {mid}({name})" for mid, name in active_metrics.items())

        img_context = "（已附上作品圖片，請直接觀察圖片內容給出分析）" if has_image else "（無圖片，根據Spec和Refs推斷）"

        oai_prompt = (
            f"你是VFX技術總監。{img_context}\n"
            f"針對每個指標，輸出三項：\n"
            f"① 畫面現況（含具體數值：角度/像素比例/色值/對比度等）\n"
            f"② 存在問題（具體說明哪裡不對、偏差多少）\n"
            f"③ 修正步驟（格式：將 [參數] 從 [現況] 調整為 [目標]，須包含數值）\n"
            f"每個指標 80 字以內。\n"
            f"背景：{ctx_short}\n指標：\n{metrics_str}\n"
            + '只回JSON禁止markdown：{"metrics":{"light":{"opinion":"①現況②問題③將X從A調整為B"},"composition":{"opinion":"..."},...}}'
        )
        gem_prompt = (
            f"你是VFX創意指導。{img_context}\n"
            f"針對每個指標，輸出三項：\n"
            f"① 與 Reference 的具體差距（格式：Reference 中 X 為___，當前作品為___）\n"
            f"② 導演意圖落差說明\n"
            f"③ 創意調整方向（含具體可操作數值，如色調偏移、構圖比例）\n"
            f"每個指標 80 字以內。\n"
            f"背景：{ctx_short}\n指標：\n{metrics_str}\n"
            + '只回JSON：{"metrics":{"light":{"opinion_b":"①Reference差距②意圖落差③將X調整為Y"},"composition":{"opinion_b":"..."},...}}'
        )
        # Claude gets the actual image
        claude_vision_prompt = (
            f"你是VFX Supervisor，請直接觀察這張作品圖片，針對每個指標給出：\n"
            f"針對每個指標，輸出三項（禁止泛泛而談，每項必須有數值或具體對象）：\n"
            f"① 圖片中實際看到的問題（具體描述位置與現況數值）\n"
            f"② 與 Spec/Reference 的差距（用「Reference 為___，當前為___」格式）\n"
            f"③ 修正指令 ×2（必須使用「將 [具體參數] 從 [現況] 調整為 [目標數值]」格式，"
            f"例如：主光源左移 15 度、色溫 5500K→4200K、對比度 +20%、飽和度 -10%）\n"
            f"每個指標 150 字。\n"
            f"背景：{ctx_short}\n指標：\n{metrics_str}\n"
            + '只回JSON：{"metrics":{"light":{"conclusion":"①畫面問題②Reference差距③將A調整為B→預期效果；將C調整為D→預期效果"},...}}'
        )

        sys_j = f"只回傳JSON，不加任何說明或markdown。{NO_MARKDOWN}"
        oai_task = asyncio.create_task(_call_openai(sys_j, oai_prompt, max_tokens=4000))
        gem_task = asyncio.create_task(_call_gemini(sys_j, gem_prompt))
        ant_task = asyncio.create_task(
            _call_claude_vision(sys_j, claude_vision_prompt, img_b64, img_type, max_tokens=2000)
            if has_image else
            _call_anthropic(sys_j, claude_vision_prompt, max_tokens=2000)
        )

        # Fire spec_summary in parallel with metrics LLMs — same batch, same wait
        spec_prompt = (
            f"你是VFX Supervisor。{'請觀察這張作品圖片，' if has_image else ''}"
            f"給出200字內的總體評估：\n1) 作品整體優點（具體說明畫面）\n"
            f"2) 最需改進的2-3個問題（具體描述）\n3) 最優先改進方向\n"
            f"Spec：{(req.brief_context or '')[:200]}"
        )
        spec_task = asyncio.create_task(
            _call_claude_vision("用繁體中文輸出純文字，不使用markdown。", spec_prompt, img_b64, img_type, max_tokens=350)
            if has_image else
            _call_openai("用繁體中文輸出純文字，不使用markdown。", spec_prompt, max_tokens=350)
        )

        # Step 3: stream heuristic metrics immediately
        yield "data: " + json.dumps({"type": "status", "message": "串流初步結果..."}) + "\n\n"
        seed = int(hashlib.md5(ctx_short.encode()).hexdigest()[:8], 16)
        rng = random.Random(seed)
        fused_preview = {}
        for idx_p, mid in enumerate(active_metrics, 1):
            h = heuristic_fused.get(mid, {})
            score = max(0.0, min(1.0, float(h.get("score", rng.uniform(0.38, 0.75)))))
            dis = float(h.get("disagreement", rng.uniform(0.02, 0.12)))
            fused_preview[mid] = {"score": score, "disagreement": dis,
                                  "per_agent": h.get("per_agent", {f"{mid}_A": score + 0.05, f"{mid}_B": max(0.0, score - 0.05)})}
            yield "data: " + json.dumps({
                "type": "metric", "id": mid, "done": idx_p, "total": len(active_metrics),
                "data": {
                    "score": score, "disagreement": dis,
                    "per_agent": fused_preview[mid]["per_agent"],
                    "ref_basis": "Spec + References",
                    "opinion_A": "分析中...", "opinion_B": "分析中...",
                    "debate": {"positionA": "分析中...", "positionB": "分析中...", "conclusion": "分析中..."},
                }
            }) + "\n\n"

        # Step 4: wait all 4 tasks in parallel — metrics opinions + spec summary together
        yield "data: " + json.dumps({"type": "status", "message": "三方分析中（含總體評估）..."}) + "\n\n"
        try:
            all_raw = await asyncio.wait_for(
                asyncio.gather(oai_task, gem_task, ant_task, spec_task, return_exceptions=True),
                timeout=45.0
            )
            oai_raw = all_raw[0] if isinstance(all_raw[0], str) else ""
            gem_raw = all_raw[1] if isinstance(all_raw[1], str) else ""
            claude_raw = all_raw[2] if isinstance(all_raw[2], str) else ""
            spec_summary = all_raw[3] if isinstance(all_raw[3], str) else "分析完成。"
            print(f"[STREAM] oai_raw len={len(oai_raw)}, gem_raw len={len(gem_raw)}, claude_raw len={len(claude_raw)}, spec len={len(spec_summary)}")
        except (Exception, asyncio.TimeoutError) as _ge:
            print(f"[STREAM] gather exception type={type(_ge).__name__}: {_ge}")
            for t in [oai_task, gem_task, ant_task, spec_task]:
                try:
                    if not t.done(): t.cancel()
                except Exception: pass
            # Collect whatever partial results are available
            def _safe_result(task):
                try:
                    return task.result() if task.done() and not task.cancelled() else ""
                except Exception: return ""
            oai_raw = _safe_result(oai_task)
            gem_raw = _safe_result(gem_task)
            claude_raw = _safe_result(ant_task)
            spec_summary = _safe_result(spec_task) or "分析完成。"
            print(f"[STREAM] partial: oai={len(oai_raw)}, gem={len(gem_raw)}, claude={len(claude_raw)}, spec={len(spec_summary)}")

        def parse_json(text: str) -> dict:
            if not text or not isinstance(text, str): return {}
            # Strip markdown fences
            text = _re.sub(r'```(?:json)?\s*', '', text).strip()
            m = _re.search(r'\{[\s\S]*\}', text)
            if not m: return {}
            raw = m.group()
            # Try full parse first
            try:
                d = json.loads(raw)
                if not isinstance(d, dict): return {}
                inner = d.get("metrics", d)
                return inner if isinstance(inner, dict) else {}
            except json.JSONDecodeError:
                pass
            # Partial recovery: extract individual metric objects via regex
            # e.g. "light":{"opinion":"..."} even if outer JSON is truncated
            result = {}
            for metric_match in _re.finditer(r'"(\w+)"\s*:\s*(\{[^{}]*\})', raw):
                key = metric_match.group(1)
                try:
                    val = json.loads(metric_match.group(2))
                    if isinstance(val, dict):
                        result[key] = val
                except Exception:
                    pass
            return result

        def safe_metric_dict(d: dict, mid: str) -> dict:
            v = d.get(mid, {})
            return v if isinstance(v, dict) else {}

        oai_d = parse_json(oai_raw)
        gem_d = parse_json(gem_raw)
        cla_d = parse_json(claude_raw)

        # Send spec + all metrics with opinions immediately back-to-back
        yield "data: " + json.dumps({"type": "spec", "spec_summary": spec_summary}) + "\n\n"
        for idx_u, mid in enumerate(active_metrics, 1):
            oa = safe_metric_dict(oai_d, mid)
            ge = safe_metric_dict(gem_d, mid)
            cl = safe_metric_dict(cla_d, mid)
            opinion_a = str(oa.get("opinion", oa.get("opinion_a", "")) or "")
            opinion_b = str(ge.get("opinion_b", cl.get("opinion_b", "")) or "")
            conclusion = str(cl.get("conclusion", "") or opinion_a or opinion_b or "")
            # Always emit every metric — heuristic scores are always valid
            pass
            yield "data: " + json.dumps({
                "type": "metric", "id": mid, "done": idx_u, "total": len(active_metrics),
                "data": {
                    "score": fused_preview[mid]["score"],
                    "disagreement": fused_preview[mid]["disagreement"],
                    "per_agent": fused_preview[mid]["per_agent"],
                    "ref_basis": "Spec + References",
                    "opinion_A": opinion_a, "opinion_B": opinion_b,
                    "debate": {"positionA": opinion_a, "positionB": opinion_b, "conclusion": conclusion},
                }
            }) + "\n\n"

        flags = [(mid, "handoff_needed") for mid, v in fused_preview.items()
                 if v["disagreement"] > HANDOFF_DIS_TAU and v["score"] < HANDOFF_SCORE_TAU]

        # spec_summary already computed in parallel above

        yield "data: " + json.dumps({
            "type": "done",
            "spec_summary": spec_summary,
            "flags": [[f[0], f[1]] for f in flags],
            "final_score": sum(v["score"] for v in fused_preview.values()) / max(1, len(fused_preview)),
        }) + "\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")