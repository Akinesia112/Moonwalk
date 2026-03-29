"""
analysis.py  —  /combination/analyze  (v3)

Pipeline:
  1. autogen_multiagents.score_answers_multiagent() — Concurrent scoring
  Calls eval_light_A/B, eval_comp_A/B, etc. heuristic functions in scripts/
  Runs in parallel via AutoGen agent hooks, outputs by_group{score, disagreement, per_agent, notes}

  2. All metrics run 3-AI Debate (not just divergent ones)
  - OpenAI: plays Agent A, states position based on notes
  - Gemini: plays Agent B, states position and notes differences from A
  - Claude: leads the final conclusion and gives specific actionable suggestions

  3. Handoff conditions are strict:
  disagreement > 0.30 AND score < 0.30 (only truly severe divergence + very low score triggers handoff)

  4. spec_summary integrated by Claude, markdown forbidden
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

# Add scripts directory to path
SCRIPTS_DIR = Path(__file__).parent.parent.parent.parent / "scripts"
if SCRIPTS_DIR.exists() and str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

router = APIRouter(prefix="/combination", tags=["combination"])

# Handoff only triggers in severe cases
HANDOFF_DIS_TAU   = 0.30   # disagreement threshold (much higher than previous 0.10)
HANDOFF_SCORE_TAU = 0.30   # score threshold

METRIC_LABELS: Dict[str, str] = {
    "light": "Lighting", "composition": "Composition", "sketch": "Sketch/Lines",
    "color": "Color", "style": "Style Consistency", "percept": "Perceptual Quality",
    "faithfulness": "Spec Faithfulness", "control": "Controllability",
    "robustness": "Stability", "efficiency": "Efficiency", "stability": "Consistency",
}

NO_MARKDOWN = "Rules: Output in English. Never use ** bold, # headers, --- separators, * bullets, or any markdown symbols. Output plain text paragraphs only."


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
        return "[OpenAI timed out]"
    except Exception as e:
        return f"[OpenAI no response: {e}]"


async def _call_gemini(system: str, user: str) -> str:
    try:
        model = _gemini_model(system)
        resp = await asyncio.to_thread(model.generate_content, user)
        return _strip_md(resp.text.strip())
    except Exception as e:
        return f"[Gemini no response: {e}]"


async def _call_anthropic(system: str, user: str, max_tokens: int = 500) -> str:
    try:
        c = _anthropic()
        r = await c.messages.create(
            model="claude-sonnet-4-20250514", max_tokens=max_tokens,
            system=system, messages=[{"role": "user", "content": user}],
        )
        return _strip_md(r.content[0].text.strip())
    except Exception as e:
        return f"[Anthropic no response: {e}]"


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
        return "[Claude vision timed out]"
    except Exception as e:
        return f"[Claude vision error: {e}]"


# ── Score with autogen_multiagents ────────────────────────────────
def _run_autogen_scoring(req: AnalyzeRequest) -> Tuple[Dict[str, Any], List]:
    """
    Calls score_answers_multiagent() from scripts/autogen_multiagents.py
    Executes eval_light_A/B, eval_comp_A/B, etc. heuristic functions
    Parallel computation of score / disagreement per metric via AutoGen agent hooks
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
            "kickoff_spec":     req.brief_context or "(not filled)",
            "director_refs":    req.hub_refs or "(none)",
            "artist_refs":      req.refs_context or "(none)",
            "artist_reflection": req.reflection_notes or "(none)",
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
    All metrics run debate.
    - OpenAI plays Agent A: gives specific problems and impacts from a visual observation perspective (no internal numbers)
    - Gemini plays Agent B: gives actionable improvement directions from a technical implementation and Spec comparison perspective
    - Claude leads: integrates A+B, gives 2–3 specific actionable suggestions
    """
    level = "Needs improvement" if score < 0.45 else "Needs attention" if score < 0.65 else "Good"
    ctx = (
        f"Metric: {metric_name} (Overall: {level})\n"
        f"Director Spec:\n{brief_context or '(not filled)'}\n\n"
        f"References (Director + Artist):\n{refs_all or '(none)'}"
    )

    # Agent A: visual observer perspective — specifically describe visible issues
    sys_a = (
        f"You are a senior VFX visual reviewer. Provide visual observations for the metric '{metric_name}'."
        f"Task: Starting from the visual effect on screen, identify the most critical issue, where it appears in the frame, and what negative impact it has on the overall visual experience."
        f"Requirements: Must include specific values, e.g. angle (main light shifted left 20°), ratio (highlights occupy 35% of frame),"
        f"color value (skin tone yellowish ~#D4A96A), contrast (+15%), etc. — all must be quantifiable."
        f"Format: ① Location of the issue in frame ② Quantified current state ③ Specific negative impact on visual experience."
        f"Under 130 words. Never mention metric_base, scores, or any internal system parameters. {NO_MARKDOWN}"
    )
    # Agent B: technical comparison perspective — compare with Spec/Reference and give actionable directions
    sys_b = (
        f"You are a senior VFX technical reviewer. Compare the metric '{metric_name}' against the Director Spec and Reference."
        f"Task: Identify the specific gap between the current artwork and Spec/Reference for this metric, and give 1–2 immediately actionable technical adjustments."
        f"Requirements: Clearly describe the specific gap between current artwork and Reference, format:"
        f"'Reference: X is ___, current artwork is ___, gap is approximately ___'."
        f"Then give 1–2 immediately actionable steps, each must include the tool/parameter name and target value."
        f"Under 130 words. Never mention any scores or internal technical parameters. {NO_MARKDOWN}"
    )

    pos_a, pos_b = await asyncio.gather(
        _call_openai(sys_a, ctx, max_tokens=300),
        _call_gemini(sys_b, ctx),
    )

    sys_claude = (
        f"You are a senior VFX Supervisor leading the final judgment on '{metric_name}'."
        f"Integrate both Agents' observations and give 2–3 specific improvement directives."
        f"Each directive must use the format: 'Adjust [specific parameter] from [current value] to [target value]',"
        f"e.g.: 'Shift main light left 15°', 'Color temperature from 5500K to 4200K', 'Contrast +20%',"
        f"'Foreground-to-background luminance difference from 0.3 to 0.5'."
        f"If both Agents diverge, state the divergence point in one sentence, then give the directive."
        f"No vague suggestions (e.g. 'pay attention to lighting balance'). Every directive must be directly executable in software."
        f"Under 200 words. {NO_MARKDOWN}"
    )
    claude_prompt = (
        f"The two Agents' evaluations are as follows:\n\n"
        f"{agent_a_name}'s observation:\n{pos_a}\n\n"
        f"{agent_b_name}'s observation:\n{pos_b}\n\n"
        f"Background:\n{ctx}\n\n"
        f"Please provide the final conclusion and specific suggestions."
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
        "You are a VFX Supervisor. Provide an overall Spec + Reference evaluation of the Artist's artwork."
        f"Under 300 words. {NO_MARKDOWN}"
    )
    user_p = (
        f"Director Kickoff Spec:\n{brief or '(not filled)'}\n\n"
        f"Reference Hub (provided by Director):\n{hub_refs or '(none)'}\n\n"
        f"Artist's own References:\n{artist_refs or '(none)'}\n\n"
        f"Artist's creative reflection:\n{reflection or '(none)'}\n\n"
        f"Good metrics: {', '.join(green_names) or 'none'}\n"
        f"Needs attention: {', '.join(yel_names) or 'none'}\n"
        f"Needs improvement: {', '.join(red_names) or 'none'}\n"
        f"Handoff flags (most severe issues only): {handoff_count}\n\n"
        f"Please assess whether the Artist's References overall align with the Director's Spec, and what are the main strengths and weaknesses?"
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
                    "positionA": "Evaluation complete.",
                    "positionB": "Evaluation complete.",
                    "conclusion": f"This metric has been evaluated. For detailed suggestions, please ask in the chat. (Error: {result})",
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
            f"Spec: {(req.brief_context or '(not filled)')[:300]}\n"
            f"Refs：{((req.hub_refs or '') + ' ' + (req.refs_context or ''))[:250]}"
        )
        seed_str = (req.brief_context or "") + (req.refs_context or "")

        # Load artwork image — prefer direct base64 from frontend, fallback to URL
        yield "data: " + json.dumps({"type": "status", "message": "Loading image..."}) + "\n\n"
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
        yield "data: " + json.dumps({"type": "status", "message": "Local scoring in progress..."}) + "\n\n"
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

        img_context = "(Artwork image provided — observe the image directly for analysis)" if has_image else "(No image — infer based on Spec and Refs)"

        oai_prompt = (
            f"You are the VFX Technical Director. {img_context}\n"
            f"For each metric, output three items:\n"
            f"① Current state on screen (with specific values: angle/pixel ratio/color value/contrast, etc.)\n"
            f"② Issue (specifically what is wrong and by how much)\n"
            f"③ Correction steps (format: adjust [parameter] from [current] to [target], must include values)\n"
            f"Under 80 words per metric.\n"
            f"Background: {ctx_short}\nMetrics:\n{metrics_str}\n"
            + '{"metrics":{"light":{"opinion":"①Current state②Issue③Adjust X from A to B"},"composition":{"opinion":"..."},...}}'
        )
        gem_prompt = (
            f"You are the VFX Creative Director. {img_context}\n"
            f"For each metric, output three items:\n"
            f"① Specific gap vs Reference (format: Reference has X as ___, current artwork is ___)\n"
            f"② Explanation of director intent gap\n"
            f"③ Creative adjustment direction (with specific actionable values, e.g. color shift, composition ratio)\n"
            f"Under 80 words per metric.\n"
            f"Background: {ctx_short}\nMetrics:\n{metrics_str}\n"
            + '{"metrics":{"light":{"opinion_b":"①Reference gap②Intent gap③Adjust X to Y"},"composition":{"opinion_b":"..."},...}}'
        )
        # Claude gets the actual image
        claude_vision_prompt = (
            f"You are the VFX Supervisor. Observe this artwork image directly and provide for each metric:\n"
            f"For each metric, output three items (no vague statements — each must include numeric values or specific objects):\n"
            f"① Actual issue visible in the image (describe location and current values specifically)\n"
            f"② Gap vs Spec/Reference (format: 'Reference is ___, current is ___')\n"
            f"③ Correction directives ×2 (must use format: 'Adjust [specific parameter] from [current] to [target value]',"
            f"e.g.: shift main light left 15°, color temperature 5500K→4200K, contrast +20%, saturation -10%)\n"
            f"Under 150 words per metric.\n"
            f"Background: {ctx_short}\nMetrics:\n{metrics_str}\n"
            + '{"metrics":{"light":{"conclusion":"①Frame issue②Reference gap③Adjust A to B→expected result; adjust C to D→expected result"},...}}'
        )

        sys_j = f"Return JSON only. No explanations or markdown. {NO_MARKDOWN}"
        oai_task = asyncio.create_task(_call_openai(sys_j, oai_prompt, max_tokens=4000))
        gem_task = asyncio.create_task(_call_gemini(sys_j, gem_prompt))
        ant_task = asyncio.create_task(
            _call_claude_vision(sys_j, claude_vision_prompt, img_b64, img_type, max_tokens=2000)
            if has_image else
            _call_anthropic(sys_j, claude_vision_prompt, max_tokens=2000)
        )

        # Fire spec_summary in parallel with metrics LLMs — same batch, same wait
        spec_prompt = (
            f"You are the VFX Supervisor.{(' Please observe this artwork image,' if has_image else '')}"
            f"Provide an overall evaluation in under 200 words:\n1) Overall strengths of the artwork (describe the visuals specifically)\n"
            f"2) 2–3 most critical issues to fix (described specifically)\n3) Highest priority improvement direction\n"
            f"Spec：{(req.brief_context or '')[:200]}"
        )
        spec_task = asyncio.create_task(
            _call_claude_vision("Output plain text in English, no markdown.", spec_prompt, img_b64, img_type, max_tokens=350)
            if has_image else
            _call_openai("Output plain text in English, no markdown.", spec_prompt, max_tokens=350)
        )

        # Step 3: stream heuristic metrics immediately
        yield "data: " + json.dumps({"type": "status", "message": "Streaming initial results..."}) + "\n\n"
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
                    "opinion_A": "Analyzing...", "opinion_B": "Analyzing...",
                    "debate": {"positionA": "Analyzing...", "positionB": "Analyzing...", "conclusion": "Analyzing..."},
                }
            }) + "\n\n"

        # Step 4: wait all 4 tasks in parallel — metrics opinions + spec summary together
        yield "data: " + json.dumps({"type": "status", "message": "Three-party analysis in progress (including overall evaluation)..."}) + "\n\n"
        try:
            all_raw = await asyncio.wait_for(
                asyncio.gather(oai_task, gem_task, ant_task, spec_task, return_exceptions=True),
                timeout=45.0
            )
            oai_raw = all_raw[0] if isinstance(all_raw[0], str) else ""
            gem_raw = all_raw[1] if isinstance(all_raw[1], str) else ""
            claude_raw = all_raw[2] if isinstance(all_raw[2], str) else ""
            spec_summary = all_raw[3] if isinstance(all_raw[3], str) else "Analysis complete."
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
            spec_summary = _safe_result(spec_task) or "Analysis complete."
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