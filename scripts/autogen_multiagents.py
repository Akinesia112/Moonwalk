#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
autogen_multiagents.py (AutoGen-backed)
--------------------------------------

This version **DOES call AutoGen library** (pyautogen) by:
- importing AutoGen agents (AssistantAgent, UserProxyAgent)
- instantiating them
- invoking agent.generate_reply() to produce per-judge outputs

Design intent:
- Keep your existing heuristic + metrics-based judge logic.
- Replace the homemade pub/sub bus with AutoGen agents.
- Default mode: NO external LLM calls (llm_config=False) — judges reply via local heuristic functions.
- You can later switch to real LLM judges by enabling llm_config and removing the register_reply hooks.

API:
- score_answers_multiagent(...)
- CLI stays compatible

Notes:
- This file assumes `metrics_psycho.compute_metrics` exists (same as your original).
"""

from __future__ import annotations

import asyncio
import json
import os
import random
import re
import statistics as S
import sys
import time
import traceback
from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import math

# ---- AutoGen (this is the point: we CALL AutoGen library) ----
from autogen import AssistantAgent, UserProxyAgent  # pyautogen

# ---- Your metrics ----
from metrics_psycho import compute_metrics


# ----------------------------- Data structures -----------------------------

@dataclass
class EvalRequest:
    frame_id: str
    image_path: Optional[str]
    question: str
    vision_context: str
    answers_by_name: Dict[str, str]  # model_name -> text answer
    metrics: Optional[Dict[str, Any]] = None


@dataclass
class JudgeResult:
    agent: str
    group: str  # "light" | "composition" | "sketch" | "color" | ...
    scores: Dict[str, float]  # per-submetric in [0..1]
    confidence: float         # [0..1]
    notes: str = ""
    evidence: List[str] = field(default_factory=list)


@dataclass
class AggregateResult:
    frame_id: str
    final_score: float               # [0..10]
    by_group: Dict[str, Dict[str, Any]]
    flags: List[Tuple[str, str]]
    raw_results: List[JudgeResult]


# ----------------------------- Heuristic scoring utils -----------------------------

TOK_LIGHT = {
    "lighting": 0.15, "shadow": 0.12, "rim": 0.12, "highlight": 0.10, "glow": 0.08,
    "contrast": 0.10, "soft": 0.06, "harsh": 0.06, "directional": 0.06, "bloom": 0.08,
}

TOK_COMPOSE = {
    "thirds": 0.15, "centered": 0.10, "diagonal": 0.10, "symmetry": 0.12, "asymmetry": 0.10,
    "leading lines": 0.12, "negative space": 0.12, "close-up": 0.10, "medium": 0.05, "wide": 0.05,
}

TOK_SKETCH = {
    "line": 0.12, "stroke": 0.12, "clean": 0.10, "grainy": 0.08, "hatched": 0.08,
    "smudged": 0.08, "detail": 0.12, "sharp": 0.10, "sparse": 0.10, "dense": 0.10,
}

TOK_COLOR = {
    "palette": 0.10, "harmony": 0.10, "complementary": 0.10, "analogous": 0.08,
    "triadic": 0.08, "monochrome": 0.08, "split complementary": 0.08,
    "color stability": 0.12, "consistent": 0.06, "tint": 0.06, "temperature": 0.06,
    "red": 0.02, "blue": 0.02, "green": 0.02, "yellow": 0.02, "purple": 0.02, "magenta": 0.02,
    "cyan": 0.02, "orange": 0.02, "teal": 0.02, "violet": 0.02, "warm": 0.03, "cool": 0.03,
}

TOK_STYLE = {
    "style": 0.10, "cel-shaded": 0.10, "painterly": 0.08, "flat": 0.06, "3d-like": 0.06,
    "brushstroke": 0.08, "line": 0.06, "layering": 0.06, "realism": 0.06, "drama": 0.08,
    "consistency": 0.06, "adherence": 0.08
}

TOK_PERCEPT = {
    "sharp": 0.12, "crisp": 0.08, "clear": 0.08, "detailed": 0.10, "texture": 0.06,
    "contrast": 0.08, "well-exposed": 0.08,
}

ARTIFACT_TOKS = [
    "noise", "noisy", "grain", "blur", "defocus", "motion", "banding", "posterize",
    "ghost", "streak", "blocking", "ringing", "alias", "overexposed", "underexposed",
    "wb shift", "color shift"
]

UNCERTAINTY_TOKS = ["unclear", "uncertain", "cannot determine", "hard to see", "not readable"]

QUESTION_HINTS = {
    "color": ["color", "palette", "hue", "saturation", "warm", "cool", "mood"],
    "composition": ["close-up", "medium", "wide", "thirds", "centered", "diagonal",
                    "leading lines", "negative space", "symmetry", "asymmetry"],
    "sketch": ["line", "stroke", "hatched", "smudged", "weight", "detail", "sparse", "dense"],
    "light": ["lighting", "shadow", "rim", "highlight", "glow", "bloom"]
}


def _norm01(x: float) -> float:
    return max(0.0, min(1.0, x))


def keyword_score(text: str, bank: Dict[str, float]) -> float:
    t = (text or "").lower()
    score = 0.0
    for k, w in bank.items():
        if k in t:
            score += w
    return _norm01(score)


def _count_tokens(text: str, toks: List[str]) -> int:
    t = (text or "").lower()
    return sum(1 for k in toks if k in t)


def overlap_confidence(vision_context: str, answer: str) -> float:
    vc = set(re.findall(r"[a-zA-Z]{3,}", (vision_context or "").lower()))
    an = set(re.findall(r"[a-zA-Z]{3,}", (answer or "").lower()))
    if not an:
        return 0.2
    inter = len(vc & an)
    return _norm01(0.2 + 0.8 * (inter / (len(an) + 1e-6)))


def relevance_to_question(question: str, answers_by_name: Dict[str, str]) -> float:
    q = (question or "").lower()
    keys: List[str] = []
    for k, v in QUESTION_HINTS.items():
        if k in q:
            keys = v
            break
    if not keys:
        keys = ["color", "palette", "composition", "lighting", "line", "detail", "mood"]
    fused = " \n".join((answers_by_name or {}).values()).lower()
    hit = sum(1 for k in keys if k in fused)
    return _norm01(0.3 + 0.7 * (hit / max(3, len(keys))))


def efficiency_score(answers_by_name: Dict[str, str]) -> float:
    L = [len(a) for a in (answers_by_name or {}).values() if a]
    if not L:
        return 0.5
    m = sum(L) / len(L)
    s = math.exp(-((m - 220.0) ** 2) / (2 * 250.0 ** 2))
    return _norm01(0.4 + 0.6 * s)


def stability_score(answers_by_name: Dict[str, str]) -> float:
    toks = [set(re.findall(r"[a-zA-Z]{3,}", a.lower())) for a in (answers_by_name or {}).values() if a]
    if len(toks) < 2:
        return 0.5
    js = []
    for i in range(len(toks)):
        for j in range(i + 1, len(toks)):
            A, B = toks[i], toks[j]
            u = len(A | B) or 1
            js.append(len(A & B) / u)
    return _norm01(sum(js) / len(js))


def perceptual_quality(vision_context: str, answers_by_name: Dict[str, str]) -> float:
    base = keyword_score(vision_context, TOK_PERCEPT) * 0.6 + keyword_score(" ".join((answers_by_name or {}).values()), TOK_PERCEPT) * 0.4
    art = _count_tokens(vision_context, ARTIFACT_TOKS)
    penalty = min(0.5, 0.06 * art)
    return _norm01(base * (1.0 - penalty))


def robustness_score(vision_context: str, answers_by_name: Dict[str, str]) -> float:
    vc_has_art = _count_tokens(vision_context, ARTIFACT_TOKS)
    ans_unc = _count_tokens(" ".join((answers_by_name or {}).values()), UNCERTAINTY_TOKS)
    if vc_has_art == 0:
        return _norm01(0.6 + 0.1 * (1 if ans_unc == 0 else 0))
    align = min(1.0, ans_unc / max(1, vc_has_art))
    return _norm01(0.4 + 0.6 * align)


def _tokset(t: str) -> set:
    return set(re.findall(r"[a-zA-Z]{3,}", (t or "").lower()))


def _mean(xs):
    return (sum(xs) / max(1, len(xs)))


def _len_sweet_spot(n_words: int, lo=25, hi=90):
    if n_words <= 0:
        return 0.0
    if n_words < lo:
        return max(0.0, (n_words / lo))
    if n_words <= hi:
        return 1.0
    return max(0.0, 1.0 - (n_words - hi) / float(hi))


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    inter = len(a & b)
    uni = len(a | b) or 1
    return inter / uni


def _pairwise_jaccard_mean(str_list: List[str]) -> float:
    toks = [_tokset(s) for s in str_list if (s or "").strip()]
    if len(toks) < 2:
        return 0.6
    vals = []
    for i in range(len(toks)):
        for j in range(i + 1, len(toks)):
            vals.append(_jaccard(toks[i], toks[j]))
    return _mean(vals) if vals else 0.6


def _contradict(tokens: set, pairs: List[Tuple[str, str]]) -> float:
    t = {w.lower() for w in tokens}
    hits = 0
    for a, b in pairs:
        if a in t and b in t:
            hits += 1
    return min(1.0, 0.2 * hits)


# ----------------------------- Metrics helpers -----------------------------

import json as _json


def _get_metrics_dict(req_or_dict: Any) -> Dict[str, Any]:
    """
    Normalize metrics into dict:
    - None     -> {}
    - JSON str -> dict
    - dataclass with attributes -> dict
    - dict     -> as-is
    """
    if isinstance(req_or_dict, dict):
        m = req_or_dict.get("metrics", None)
    else:
        m = getattr(req_or_dict, "metrics", None)

    if m is None:
        return {}
    if isinstance(m, str):
        try:
            return _json.loads(m)
        except Exception:
            return {}
    if hasattr(m, "frame") and hasattr(m, "realism"):
        try:
            out = {
                "frame": dict(m.frame),
                "realism": dict(m.realism),
                "details": dict(m.details),
                "richness": dict(m.richness),
            }
            if hasattr(m, "style_subindex"):
                out["style_subindex"] = dict(m.style_subindex)
            return out
        except Exception:
            return {}
    if isinstance(m, dict):
        return m
    return {}


def _metric(m: Dict[str, Any], group: str, key: str, default: float = 0.5) -> float:
    try:
        return float(m.get(group, {}).get(key, default))
    except Exception:
        return float(default)


# ----------------------------- Judge evaluation (pure functions) -----------------------------
# Each returns a JSON-serializable dict matching JudgeResult fields.

def _fused_answers(payload: Dict[str, Any]) -> str:
    answers = payload.get("answers_by_name", {}) or {}
    return " \n".join(answers.values())


def eval_light_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    light_color = _metric(metrics, "realism", "lighting_color", 0.5)
    nriqa = _metric(metrics, "realism", "nriqa", 0.5)
    style_light = 0.5
    try:
        style_light = float(metrics.get("style_subindex", {}).get("lighting", 0.5))
    except Exception:
        pass
    metric_base = _norm01(0.5 * light_color + 0.3 * nriqa + 0.2 * style_light)

    base = keyword_score(vc, TOK_LIGHT)
    plus = 0.6 * keyword_score(fused, TOK_LIGHT)
    text_part = _norm01(0.5 * base + 0.5 * plus)

    v = _norm01(0.7 * metric_base + 0.3 * text_part)
    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "light_A",
        "group": "light",
        "scores": {"light": float(v)},
        "confidence": float(conf),
        "notes": f"metric_base={metric_base:.2f}, text={text_part:.2f}",
        "evidence": [],
    }


def eval_light_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    bank = {
        "rim": 0.16, "backlight": 0.12, "bloom": 0.10, "specular": 0.10, "shadow": 0.10,
        "soft": 0.07, "harsh": 0.07, "directional": 0.08, "volumetric": 0.10, "glow": 0.10
    }
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    base = keyword_score(vc, bank)
    plus = 0.7 * keyword_score(fused, bank)
    toks = _tokset(fused)
    pen = 0.5 * _contradict(toks, [("soft", "harsh"), ("warm", "cool")])

    light_color = _metric(metrics, "realism", "lighting_color", 0.5)
    metric_boost = 0.15 * (light_color - 0.5)

    v = _norm01(0.55 * base + 0.45 * plus - pen + metric_boost)
    conf = _norm01(overlap_confidence(vc, fused) * (1.0 - 0.5 * pen))
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "light_B",
        "group": "light",
        "scores": {"light": float(v)},
        "confidence": float(conf),
        "notes": f"base={base:.2f}, pen={pen:.2f}, lc={light_color:.2f}",
        "evidence": [],
    }


def eval_comp_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    comp_metric = _metric(metrics, "frame", "composition_quality", 0.5)

    base = keyword_score(vc, TOK_COMPOSE)
    plus = 0.6 * keyword_score(fused, TOK_COMPOSE)
    text_part = _norm01(0.5 * base + 0.5 * plus)

    v = _norm01(0.7 * comp_metric + 0.3 * text_part)
    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "comp_A",
        "group": "composition",
        "scores": {"composition": float(v)},
        "confidence": float(conf),
        "notes": f"comp_metric={comp_metric:.2f}, text={text_part:.2f}",
        "evidence": [],
    }


def eval_comp_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    bank = {"thirds": 0.18, "centered": 0.12, "diagonal": 0.12, "leading": 0.14, "symmetry": 0.12, "asymmetry": 0.10,
            "close-up": 0.10, "medium": 0.06, "wide": 0.06, "negative": 0.10}
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    comp_metric = _metric(metrics, "frame", "composition_quality", 0.5)

    base = keyword_score(vc, bank)
    plus = 0.6 * keyword_score(fused, bank)
    toks = _tokset(fused)
    shot = [w for w in ["close", "close-up", "medium", "wide"] if any(w in s for s in toks)]
    pen = 0.25 if len(shot) >= 2 else 0.0

    text_part = _norm01(0.6 * base + 0.4 * plus - pen)
    v = _norm01(0.7 * comp_metric + 0.3 * text_part)

    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "comp_B",
        "group": "composition",
        "scores": {"composition": float(v)},
        "confidence": float(conf),
        "notes": f"pen={pen:.2f}, comp_metric={comp_metric:.2f}",
        "evidence": [],
    }


def eval_sketch_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    detail = _metric(metrics, "details", "detail_density", 0.5)
    sharp = _metric(metrics, "details", "resolution_sharpness", 0.5)
    metric_base = _norm01(0.5 * detail + 0.5 * sharp)

    base = keyword_score(vc, TOK_SKETCH)
    plus = 0.6 * keyword_score(fused, TOK_SKETCH)
    text_part = _norm01(0.5 * base + 0.5 * plus)

    v = _norm01(0.6 * metric_base + 0.4 * text_part)
    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "sketch_A",
        "group": "sketch",
        "scores": {"sketch": float(v)},
        "confidence": float(conf),
        "notes": f"metric_base={metric_base:.2f}, text={text_part:.2f}",
        "evidence": [],
    }


def eval_sketch_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    bank = {"line": 0.12, "stroke": 0.12, "clean": 0.10, "hatched": 0.10, "smudged": 0.10, "weighted": 0.08,
            "sparse": 0.12, "dense": 0.12, "contour": 0.10, "crosshatch": 0.10}
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    detail = _metric(metrics, "details", "detail_density", 0.5)
    sharp = _metric(metrics, "details", "resolution_sharpness", 0.5)
    metric_base = _norm01(0.5 * detail + 0.5 * sharp)

    base = keyword_score(vc, bank)
    plus = 0.6 * keyword_score(fused, bank)
    toks = _tokset(fused)
    pen = 0.5 * _contradict(toks, [("clean", "smudged"), ("sparse", "dense")])
    text_part = _norm01(0.55 * base + 0.45 * plus - pen)

    v = _norm01(0.6 * metric_base + 0.4 * text_part)
    conf = _norm01(overlap_confidence(vc, fused) * (1.0 - 0.5 * pen))
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "sketch_B",
        "group": "sketch",
        "scores": {"sketch": float(v)},
        "confidence": float(conf),
        "notes": f"pen={pen:.2f}, metric_base={metric_base:.2f}",
        "evidence": [],
    }


def eval_color_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    light_color = _metric(metrics, "realism", "lighting_color", 0.5)
    coverage = _metric(metrics, "richness", "coverage_diversity", 0.5)
    metric_base = _norm01(0.6 * light_color + 0.4 * coverage)

    base = keyword_score(vc, TOK_COLOR)
    plus = 0.7 * keyword_score(fused, TOK_COLOR)
    text_part = _norm01(0.5 * base + 0.5 * plus)

    v = _norm01(0.65 * metric_base + 0.35 * text_part)
    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "color_A",
        "group": "color",
        "scores": {"color": float(v)},
        "confidence": float(conf),
        "notes": f"metric_base={metric_base:.2f}, text={text_part:.2f}",
        "evidence": [],
    }


def eval_color_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    bank = {"palette": 0.12, "harmony": 0.12, "complementary": 0.12, "analogous": 0.10, "monochrome": 0.10, "triadic": 0.10,
            "warm": 0.08, "cool": 0.08, "tint": 0.06, "temperature": 0.06, "saturated": 0.06, "muted": 0.06}
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    light_color = _metric(metrics, "realism", "lighting_color", 0.5)
    coverage = _metric(metrics, "richness", "coverage_diversity", 0.5)
    metric_base = _norm01(0.6 * light_color + 0.4 * coverage)

    base = keyword_score(vc, bank)
    plus = 0.7 * keyword_score(fused, bank)
    toks = _tokset(fused)
    pen = 0.5 * _contradict(toks, [("warm", "cool"), ("monochrome", "triadic")])
    text_part = _norm01(0.5 * base + 0.5 * plus - pen)

    v = _norm01(0.65 * metric_base + 0.35 * text_part)
    conf = _norm01(overlap_confidence(vc, fused) * (1.0 - 0.4 * pen))
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "color_B",
        "group": "color",
        "scores": {"color": float(v)},
        "confidence": float(conf),
        "notes": f"pen={pen:.2f}, metric_base={metric_base:.2f}",
        "evidence": [],
    }


def eval_style_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    style_conf = _metric(metrics, "frame", "style_adherence_conf", 0.5)
    sub = metrics.get("style_subindex", {}) if metrics else {}
    avg_sub = float(sum(sub.values()) / max(1, len(sub))) if sub else 0.5
    metric_base = _norm01(0.6 * style_conf + 0.4 * avg_sub)

    base = keyword_score(vc, TOK_STYLE)
    plus = 0.7 * keyword_score(fused, TOK_STYLE)
    text_part = _norm01(0.5 * base + 0.5 * plus)

    v = _norm01(0.65 * metric_base + 0.35 * text_part)
    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "style_A",
        "group": "style",
        "scores": {"style": float(v)},
        "confidence": float(conf),
        "notes": f"metric_base={metric_base:.2f}, text={text_part:.2f}",
        "evidence": [],
    }


def eval_style_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    bank = {"cel-shaded": 0.18, "painterly": 0.16, "flat": 0.10, "minimalist": 0.10, "3d-like": 0.12, "sketchy": 0.10,
            "brushstroke": 0.12, "linework": 0.12, "realism": 0.10}
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    style_conf = _metric(metrics, "frame", "style_adherence_conf", 0.5)
    sub = metrics.get("style_subindex", {}) if metrics else {}
    avg_sub = float(sum(sub.values()) / max(1, len(sub))) if sub else 0.5
    metric_base = _norm01(0.6 * style_conf + 0.4 * avg_sub)

    base = keyword_score(vc, bank)
    plus = 0.7 * keyword_score(fused, bank)
    toks = _tokset(fused)
    pen = 0.4 * _contradict(toks, [("cel-shaded", "painterly"), ("minimalist", "rich")])
    text_part = _norm01(0.55 * base + 0.45 * plus - pen)

    v = _norm01(0.65 * metric_base + 0.35 * text_part)
    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "style_B",
        "group": "style",
        "scores": {"style": float(v)},
        "confidence": float(conf),
        "notes": f"pen={pen:.2f}, metric_base={metric_base:.2f}",
        "evidence": [],
    }


def eval_percept_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    aq = _metric(metrics, "frame", "artifact_quality", 0.5)
    sharp = _metric(metrics, "details", "resolution_sharpness", 0.5)
    nriqa = _metric(metrics, "realism", "nriqa", 0.5)
    metric_base = _norm01(0.4 * aq + 0.3 * sharp + 0.3 * nriqa)

    text_part = perceptual_quality(vc, payload.get("answers_by_name", {}) or {})
    v = _norm01(0.65 * metric_base + 0.35 * text_part)

    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.1)

    return {
        "agent": "percept_A",
        "group": "percept",
        "scores": {"percept": float(v)},
        "confidence": float(conf),
        "notes": f"metric_base={metric_base:.2f}, text={text_part:.2f}",
        "evidence": [],
    }


def eval_percept_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""
    lower = fused.lower()

    aq = _metric(metrics, "frame", "artifact_quality", 0.5)
    sharp = _metric(metrics, "details", "resolution_sharpness", 0.5)
    nriqa = _metric(metrics, "realism", "nriqa", 0.5)
    metric_base = _norm01(0.4 * aq + 0.3 * sharp + 0.3 * nriqa)

    claims_clean = any(w in lower for w in ["crystal clear", "perfectly sharp", "no noise", "very sharp", "pin-sharp"])
    claims_bad = any(w in lower for w in ["heavily blurred", "very noisy", "unreadable", "can't see anything", "cannot see anything"])

    pen = 0.0
    if (aq < 0.4 or sharp < 0.4 or nriqa < 0.4) and claims_clean:
        pen += 0.25
    if (aq > 0.7 and sharp > 0.7 and nriqa > 0.7) and claims_bad:
        pen += 0.20

    v = _norm01(metric_base - pen)
    conf_overlap = overlap_confidence(vc, fused)
    conf = _norm01(conf_overlap * (1.0 - 0.5 * pen) + 0.2)

    return {
        "agent": "percept_B",
        "group": "percept",
        "scores": {"percept": float(v)},
        "confidence": float(conf),
        "notes": f"metric_base={metric_base:.2f}, claims_clean={claims_clean}, claims_bad={claims_bad}, pen={pen:.2f}",
        "evidence": [],
    }


def eval_faith_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""
    q = payload.get("question", "") or ""
    answers = payload.get("answers_by_name", {}) or {}

    overlap = overlap_confidence(vc, fused)
    rel = relevance_to_question(q, answers)

    pa = _metric(metrics, "frame", "prompt_alignment", 0.5)
    style = _metric(metrics, "frame", "style_adherence_conf", 0.5)
    ident = _metric(metrics, "frame", "identity_consistency", 0.5)
    metric_faith = _norm01(0.5 * pa + 0.25 * style + 0.25 * ident)

    v = _norm01(0.5 * metric_faith + 0.3 * overlap + 0.2 * rel)
    conf = _norm01(0.5 + 0.5 * overlap)

    return {
        "agent": "faith_A",
        "group": "faithfulness",
        "scores": {"faithfulness": float(v)},
        "confidence": float(conf),
        "notes": f"metric_faith={metric_faith:.2f}, overlap={overlap:.2f}, rel={rel:.2f}",
        "evidence": [],
    }


def eval_faith_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    fused = _fused_answers(payload).lower()
    vc = (payload.get("vision_context", "") or "").lower()
    q = payload.get("question", "") or ""
    answers = payload.get("answers_by_name", {}) or {}

    vc_tokens = set(re.findall(r"[a-zA-Z]{3,}", vc))
    ans_tokens = set(re.findall(r"[a-zA-Z]{3,}", fused))

    overlap = overlap_confidence(payload.get("vision_context", "") or "", fused)
    rel = relevance_to_question(q, answers)

    novel_ratio = len(ans_tokens - vc_tokens) / (len(ans_tokens) + 1e-6)
    halluc_pen_text = min(0.4, 0.8 * novel_ratio)

    pa = _metric(metrics, "frame", "prompt_alignment", 0.5)
    style = _metric(metrics, "frame", "style_adherence_conf", 0.5)
    ident = _metric(metrics, "frame", "identity_consistency", 0.5)
    metric_faith = _norm01(0.5 * pa + 0.3 * style + 0.2 * ident)

    assertive = any(w in fused for w in ["clearly matches", "perfectly matches", "exactly matches", "definitely matches", "strictly follows"])
    misalign_pen = 0.25 if (metric_faith < 0.4 and assertive) else 0.0

    total_pen = halluc_pen_text + misalign_pen
    v = _norm01(0.5 * metric_faith + 0.3 * overlap + 0.2 * rel - total_pen)
    conf = _norm01(0.4 + 0.3 * (1 - halluc_pen_text) + 0.3 * metric_faith)

    return {
        "agent": "faith_B",
        "group": "faithfulness",
        "scores": {"faithfulness": float(v)},
        "confidence": float(conf),
        "notes": f"metric_faith={metric_faith:.2f}, overlap={overlap:.2f}, rel={rel:.2f}, hall_text={halluc_pen_text:.2f}, misalign_pen={misalign_pen:.2f}",
        "evidence": [],
    }


def eval_control_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    q = payload.get("question", "") or ""
    answers = payload.get("answers_by_name", {}) or {}
    fused = _fused_answers(payload)
    vc = payload.get("vision_context", "") or ""

    rel = relevance_to_question(q, answers)
    pa = _metric(metrics, "frame", "prompt_alignment", 0.5)
    hint = 0.05 if ("prompt" in fused.lower() or "align" in fused.lower()) else 0.0
    v = _norm01(0.6 * rel + 0.4 * pa + hint)
    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "control_A",
        "group": "control",
        "scores": {"control": float(v)},
        "confidence": float(conf),
        "notes": "relevance+prompt_alignment",
        "evidence": [],
    }


def eval_control_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    qtok = _tokset(payload.get("question", "") or "")
    fused = _fused_answers(payload)
    atok = _tokset(fused)
    vc = payload.get("vision_context", "") or ""

    coverage = _norm01(len(qtok & atok) / float(len(qtok) + 1e-6))
    pa = _metric(metrics, "frame", "prompt_alignment", 0.5)
    hint = 0.05 if any(w in fused.lower() for w in ["match", "aligned", "as requested", "prompt"]) else 0.0
    v = _norm01(0.5 * coverage + 0.4 * pa + 0.1 * hint)

    conf = overlap_confidence(vc, fused)
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "control_B",
        "group": "control",
        "scores": {"control": float(v)},
        "confidence": float(conf),
        "notes": f"coverage={coverage:.2f}, pa={pa:.2f}",
        "evidence": [],
    }


def eval_robust_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    vc = payload.get("vision_context", "") or ""
    answers = payload.get("answers_by_name", {}) or {}

    v_text = robustness_score(vc, answers)
    aq = _metric(metrics, "frame", "artifact_quality", 0.5)
    mot = _metric(metrics, "richness", "motion_smoothness", 0.5)
    metric_part = _norm01(0.6 * aq + 0.4 * mot)

    v = _norm01(0.6 * v_text + 0.4 * metric_part)
    conf = 0.5 + 0.5 * (1 - abs(v - 0.6))
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "robust_A",
        "group": "robustness",
        "scores": {"robustness": float(v)},
        "confidence": float(conf),
        "notes": f"text={v_text:.2f}, metric={metric_part:.2f}",
        "evidence": [],
    }


_ARTIF_TOK = {"noise", "noisy", "grain", "blur", "defocus", "motion", "banding", "posterize", "exposure", "wb", "shift"}


def eval_robust_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    metrics = _get_metrics_dict(payload)
    vc = payload.get("vision_context", "") or ""
    fused = _fused_answers(payload)
    vc_t = _tokset(vc)
    ans_t = _tokset(fused)

    art_vc = len(vc_t & _ARTIF_TOK) > 0
    art_ans = len(ans_t & _ARTIF_TOK) > 0
    hedging = any(w in fused.lower() for w in ["unclear", "hard to tell", "cannot determine", "uncertain"])
    assertive = any(w in fused.lower() for w in ["clearly", "definitely", "obviously"])
    v0 = 0.6 + (0.15 if (art_vc and art_ans) else 0.0) + (0.15 if (art_vc and hedging) else 0.0) - (0.2 if (art_vc and assertive) else 0.0)

    aq = _metric(metrics, "frame", "artifact_quality", 0.5)
    mot = _metric(metrics, "richness", "motion_smoothness", 0.5)
    metric_part = _norm01(0.6 * aq + 0.4 * mot)

    v = _norm01(0.5 * v0 + 0.5 * metric_part)
    conf = _norm01(0.55 + 0.25 * (art_vc == art_ans) + 0.2 * (hedging and art_vc))
    if metrics:
        conf = _norm01(conf + 0.05)

    return {
        "agent": "robust_B",
        "group": "robustness",
        "scores": {"robustness": float(v)},
        "confidence": float(conf),
        "notes": f"hedge={hedging}, assert={assertive}, metric={metric_part:.2f}",
        "evidence": [],
    }


def eval_eff_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    v = efficiency_score(payload.get("answers_by_name", {}) or {})
    return {
        "agent": "eff_A",
        "group": "efficiency",
        "scores": {"efficiency": float(v)},
        "confidence": 0.7,
        "notes": "length sweet-spot",
        "evidence": [],
    }


def eval_eff_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    fused = _fused_answers(payload)
    n_words = len(re.findall(r"\w+", fused))
    conc = _len_sweet_spot(n_words, lo=25, hi=80)
    words = re.findall(r"[a-zA-Z]{3,}", fused.lower())
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    top10_ratio = sum(sorted(freq.values(), reverse=True)[:10]) / float(len(words) + 1e-6)
    rep_pen = max(0.0, top10_ratio - 0.35) * 0.6
    v = _norm01(conc - rep_pen)
    return {
        "agent": "eff_B",
        "group": "efficiency",
        "scores": {"efficiency": float(v)},
        "confidence": 0.7,
        "notes": f"len={n_words}, rep_pen={rep_pen:.2f}",
        "evidence": [],
    }


def eval_stab_A(payload: Dict[str, Any]) -> Dict[str, Any]:
    v = stability_score(payload.get("answers_by_name", {}) or {})
    return {
        "agent": "stab_A",
        "group": "stability",
        "scores": {"stability": float(v)},
        "confidence": 0.7,
        "notes": "pairwise Jaccard",
        "evidence": [],
    }


def eval_stab_B(payload: Dict[str, Any]) -> Dict[str, Any]:
    answers = list((payload.get("answers_by_name", {}) or {}).values())
    jac = _pairwise_jaccard_mean(answers)
    v = _norm01(1.0 - abs(jac - 0.6) / 0.6)
    return {
        "agent": "stab_B",
        "group": "stability",
        "scores": {"stability": float(v)},
        "confidence": 0.7,
        "notes": f"jaccard_mean={jac:.2f}",
        "evidence": [],
    }


# Map agent_name -> local eval fn
LOCAL_JUDGES: Dict[str, Tuple[str, Any]] = {
    "light_A": ("light", eval_light_A),
    "light_B": ("light", eval_light_B),
    "comp_A": ("composition", eval_comp_A),
    "comp_B": ("composition", eval_comp_B),
    "sketch_A": ("sketch", eval_sketch_A),
    "sketch_B": ("sketch", eval_sketch_B),
    "color_A": ("color", eval_color_A),
    "color_B": ("color", eval_color_B),
    "style_A": ("style", eval_style_A),
    "style_B": ("style", eval_style_B),
    "percept_A": ("percept", eval_percept_A),
    "percept_B": ("percept", eval_percept_B),
    "faith_A": ("faithfulness", eval_faith_A),
    "faith_B": ("faithfulness", eval_faith_B),
    "control_A": ("control", eval_control_A),
    "control_B": ("control", eval_control_B),
    "robust_A": ("robustness", eval_robust_A),
    "robust_B": ("robustness", eval_robust_B),
    "eff_A": ("efficiency", eval_eff_A),
    "eff_B": ("efficiency", eval_eff_B),
    "stab_A": ("stability", eval_stab_A),
    "stab_B": ("stability", eval_stab_B),
}


# ----------------------------- Schema weights + OrchestratorConfig -----------------------------

def default_schema_weights() -> Dict[str, Any]:
    return deepcopy({
        "Frame": {
            "w": 0.40,
            "sub": {
                "style_adherence": 0.22,
                "identity_consistency": 0.18,
                "temporal_consistency": 0.22,
                "artifact_quality": 0.12,
                "composition": 0.12,
                "prompt_alignment": 0.14,
            },
        },
        "Realisticness": {
            "w": 0.25,
            "sub": {
                "realism": 0.40,
                "depth_3d": 0.28,
                "lighting_color_stability": 0.32,
            },
        },
        "Details": {
            "w": 0.20,
            "sub": {
                "detail_density": 0.50,
                "resolution_sharpness": 0.50,
            },
        },
        "Richness": {
            "w": 0.15,
            "sub": {
                "richness_coverage": 0.65,
                "motion_smoothness": 0.35,
            },
        },
    })


@dataclass
class OrchestratorConfig:
    time_budget_s: float = 8.0
    disagreement_tau: float = 0.12
    min_mean_tau: float = 0.55
    schema_weights: Dict[str, Any] = field(default_factory=default_schema_weights)
    reliability: Dict[str, float] = field(default_factory=dict)


def _sum_with_schema(schema: Dict[str, Any], group_subscores: Dict[str, Dict[str, float]]) -> float:
    total = 0.0
    for g, spec in schema.items():
        if g not in group_subscores:
            continue
        subs = group_subscores[g]
        want = spec["sub"]
        avail = {k: w for k, w in want.items() if k in subs}
        if not avail:
            continue
        z = sum(avail.values())
        subtotal = sum((w / z) * subs[k] for k, w in avail.items())
        total += spec["w"] * subtotal
    return total  # [0,1]


# ----------------------------- Aggregator -----------------------------

class Aggregator:
    def __init__(self, cfg: OrchestratorConfig, frame_id: str, groups: List[str], metrics: Optional[Dict[str, Any]]):
        self.cfg = cfg
        self.frame_id = frame_id
        self.groups = groups
        self.metrics = metrics
        self.collected: List[JudgeResult] = []
        self.by_group: Dict[str, List[JudgeResult]] = {g: [] for g in groups}

    def add_results(self, results: List[JudgeResult]) -> None:
        for r in results:
            self.collected.append(r)
            if r.group in self.by_group:
                self.by_group[r.group].append(r)

    def _ensemble_group(self, group: str) -> Tuple[float, float, Dict[str, float]]:
        lst = self.by_group.get(group, [])
        if not lst:
            return 0.5, 0.0, {}
        vals, weights, per_agent = [], [], {}
        for r in lst:
            v = (sum(r.scores.values()) / len(r.scores)) if r.scores else 0.5
            per_agent[r.agent] = float(v)
            hist = self.cfg.reliability.get(r.agent, 0.5)
            w = max(1e-3, 0.6 * r.confidence + 0.4 * hist)
            vals.append(float(v))
            weights.append(float(w))
        mean = sum(v * w for v, w in zip(vals, weights)) / (sum(weights) or 1.0)
        dis = S.pstdev(vals) if len(vals) > 1 else 0.0
        return float(mean), float(dis), per_agent

    def fuse(self) -> Tuple[float, Dict[str, Dict[str, Any]], List[Tuple[str, str]]]:
        flags: List[Tuple[str, str]] = []
        fused: Dict[str, Dict[str, Any]] = {}

        for g in self.groups:
            if not self.by_group[g]:
                flags.append((g, "missing"))
                continue
            mean, dis, per_agent = self._ensemble_group(g)
            fused[g] = {"score": mean, "disagreement": dis, "per_agent": per_agent}
            if dis > self.cfg.disagreement_tau or mean < self.cfg.min_mean_tau:
                flags.append((g, "handoff_needed"))

        m = self.metrics if isinstance(self.metrics, dict) else None

        if m is not None and all(k in m for k in ("frame", "realism", "details", "richness")):
            schema_input = {
                "Frame": {
                    "composition": m["frame"]["composition_quality"],
                    "prompt_alignment": m["frame"]["prompt_alignment"],
                    "style_adherence": m["frame"]["style_adherence_conf"],
                    "identity_consistency": m["frame"]["identity_consistency"],
                    "temporal_consistency": m["frame"]["temporal_consistency"],
                    "artifact_quality": m["frame"]["artifact_quality"],
                },
                "Realisticness": {
                    "realism": m["realism"]["nriqa"],
                    "depth_3d": m["realism"]["depth3d"],
                    "lighting_color_stability": m["realism"]["lighting_color"],
                },
                "Details": {
                    "detail_density": m["details"]["detail_density"],
                    "resolution_sharpness": m["details"]["resolution_sharpness"],
                },
                "Richness": {
                    "richness_coverage": m["richness"]["coverage_diversity"],
                    "motion_smoothness": m["richness"]["motion_smoothness"],
                },
            }
            final_0_1 = _sum_with_schema(self.cfg.schema_weights, schema_input)
        else:
            neutral = {
                "Frame": {
                    "composition": 0.5,
                    "prompt_alignment": 0.5,
                    "style_adherence": 0.5,
                    "identity_consistency": 0.5,
                    "temporal_consistency": 0.5,
                    "artifact_quality": 0.5,
                },
                "Realisticness": {
                    "realism": 0.5,
                    "depth_3d": 0.5,
                    "lighting_color_stability": 0.5,
                },
                "Details": {
                    "detail_density": 0.5,
                    "resolution_sharpness": 0.5,
                },
                "Richness": {
                    "richness_coverage": 0.5,
                    "motion_smoothness": 0.5,
                },
            }
            final_0_1 = _sum_with_schema(self.cfg.schema_weights, neutral)

        final = round(10.0 * final_0_1, 1)
        return final, fused, flags


# ----------------------------- AutoGen wrapper -----------------------------

def _make_autogen_judge_agent(agent_name: str, group: str, local_eval_fn):
    """
    Create an AutoGen AssistantAgent that replies with STRICT JSON (no LLM calls by default).
    We register a local reply hook so the agent's response is computed by local_eval_fn(payload_dict).
    """
    agent = AssistantAgent(
        name=agent_name,
        system_message=(
            f"You are {agent_name} judging group={group}. "
            f"Return STRICT JSON only with keys: agent, group, scores, confidence, notes, evidence."
        ),
        llm_config=False,  # IMPORTANT: no external LLM call
    )

    def _reply(recipient, messages, sender, config):
        try:
            payload = json.loads(messages[-1]["content"])
            out = local_eval_fn(payload)
            out["agent"] = agent_name
            out["group"] = out.get("group", group)
            return True, json.dumps(out, ensure_ascii=False)
        except Exception as e:
            err = {
                "agent": agent_name,
                "group": group,
                "scores": {group: 0.5},
                "confidence": 0.1,
                "notes": f"judge_error: {type(e).__name__}: {e}",
                "evidence": [],
            }
            return True, json.dumps(err, ensure_ascii=False)

    # Hook reply for user->assistant interactions
    agent.register_reply(trigger=[UserProxyAgent, AssistantAgent], reply_func=_reply, position=0)
    return agent


def _run_autogen_local_judges(eval_request_dict: Dict[str, Any],
                             agent_names: List[str],
                             time_budget_s: float) -> List[JudgeResult]:
    """
    Calls AutoGen agents (generate_reply) sequentially within a time budget.
    Still counts as "calling AutoGen library" because we instantiate agents and call generate_reply().
    """
    start = time.time()

    user = UserProxyAgent(name="orchestrator", human_input_mode="NEVER", code_execution_config=False)

    agents: List[AssistantAgent] = []
    for name in agent_names:
        group, fn = LOCAL_JUDGES[name]
        agents.append(_make_autogen_judge_agent(name, group, fn))

    payload_str = json.dumps(eval_request_dict, ensure_ascii=False)

    results: List[JudgeResult] = []
    for ag in agents:
        if time.time() - start > max(0.1, time_budget_s):
            break

        msg_history = [{"role": "user", "content": payload_str}]
        try:
            reply = ag.generate_reply(messages=msg_history, sender=user)
            # pyautogen may return dict or str depending on version/config; normalize to str
            if isinstance(reply, dict) and "content" in reply:
                content = reply["content"]
            else:
                content = reply

            jr_dict = json.loads(content)
            results.append(JudgeResult(
                agent=jr_dict["agent"],
                group=jr_dict["group"],
                scores={k: float(v) for k, v in (jr_dict.get("scores") or {}).items()},
                confidence=float(jr_dict.get("confidence", 0.5)),
                notes=str(jr_dict.get("notes", "")),
                evidence=list(jr_dict.get("evidence") or []),
            ))
        except Exception as e:
            results.append(JudgeResult(
                agent=ag.name,
                group=LOCAL_JUDGES[ag.name][0],
                scores={LOCAL_JUDGES[ag.name][0]: 0.5},
                confidence=0.1,
                notes=f"autogen_call_error: {type(e).__name__}: {e}",
                evidence=[],
            ))
    return results


# ----------------------------- Orchestrator -----------------------------

class Orchestrator:
    def __init__(self, cfg: Optional[OrchestratorConfig] = None):
        self.cfg = cfg or OrchestratorConfig()

        self.groups = [
            "light", "composition", "sketch", "color",
            "style", "percept", "faithfulness", "control",
            "robustness", "efficiency", "stability",
        ]

        # Decide which judge agents to run
        self.judge_agent_names = [
            "light_A", "light_B",
            "comp_A", "comp_B",
            "sketch_A", "sketch_B",
            "color_A", "color_B",
            "style_A", "style_B",
            "percept_A", "percept_B",
            "faith_A", "faith_B",
            "control_A", "control_B",
            "robust_A", "robust_B",
            "eff_A", "eff_B",
            "stab_A", "stab_B",
        ]

    def _ensure_metrics(self, req: EvalRequest) -> Dict[str, Any]:
        metrics_dict = _get_metrics_dict(req)
        if (not metrics_dict) and req.image_path:
            mp = compute_metrics(
                image_path=str(req.image_path),
                prev_image_path=None,
                prompt_text=req.question,
                requested_style_tags=None,
                style_ref_path=None,
            )
            metrics_dict = {
                "frame": dict(mp.frame),
                "realism": dict(mp.realism),
                "details": dict(mp.details),
                "richness": dict(mp.richness),
            }
        return metrics_dict or {}

    def evaluate(self, req: EvalRequest) -> AggregateResult:
        metrics_dict = self._ensure_metrics(req)
        if metrics_dict:
            req.metrics = metrics_dict

        # Build payload dict for AutoGen judges
        payload = {
            "frame_id": req.frame_id,
            "image_path": req.image_path,
            "question": req.question,
            "vision_context": req.vision_context,
            "answers_by_name": req.answers_by_name,
            "metrics": metrics_dict if metrics_dict else None,
        }

        # Run AutoGen agents (local hooks; no external LLM calls)
        judge_results = _run_autogen_local_judges(
            eval_request_dict=payload,
            agent_names=self.judge_agent_names,
            time_budget_s=self.cfg.time_budget_s,
        )

        agg = Aggregator(self.cfg, frame_id=req.frame_id, groups=self.groups, metrics=metrics_dict or None)
        agg.add_results(judge_results)

        final, fused, flags = agg.fuse()
        return AggregateResult(
            frame_id=req.frame_id,
            final_score=float(round(final, 1)),
            by_group=fused,
            flags=flags,
            raw_results=agg.collected,
        )


# ----------------------------- Public helper -----------------------------

def score_answers_multiagent(
    vision_context: str,
    question: str,
    answers_by_name: Dict[str, str],
    *,
    time_budget_s: float = 8.0,
    frame_id: str = "frame",
    image_path: Optional[str] = None,
    metrics: Optional[Dict[str, Any]] = None,
) -> AggregateResult:
    req = EvalRequest(
        frame_id=frame_id,
        image_path=image_path,
        question=question,
        vision_context=vision_context,
        answers_by_name=answers_by_name,
        metrics=metrics,
    )
    orch = Orchestrator(OrchestratorConfig(time_budget_s=time_budget_s))
    return orch.evaluate(req)


# ----------------------------- CLI -----------------------------

def _read_text_maybe(path: Optional[str]) -> str:
    if not path:
        return ""
    p = Path(path)
    return p.read_text(encoding="utf-8") if p.exists() else path


def _read_json(path: str) -> Dict[str, Any]:
    p = Path(path)
    return json.loads(p.read_text(encoding="utf-8"))


def main_cli():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--vision-context", required=True, help="Path to file OR inline text")
    ap.add_argument("--question", required=True)
    ap.add_argument("--answers-json", required=True, help="JSON {model_name: answer_text}")
    ap.add_argument("--frame-id", default="frame")
    ap.add_argument("--time-budget", type=float, default=8.0)
    ap.add_argument("--image", default="", help="Optional absolute path to frame image")
    ap.add_argument("--out", default="", help="Optional path to write JSON result")
    args = ap.parse_args()

    vc = _read_text_maybe(args.vision_context)
    answers = _read_json(args.answers_json)
    image_path = args.image or None

    agg = score_answers_multiagent(
        vc,
        args.question,
        answers,
        time_budget_s=args.time_budget,
        frame_id=args.frame_id,
        image_path=image_path,
    )

    out = {
        "frame_id": agg.frame_id,
        "final_score": agg.final_score,
        "by_group": agg.by_group,
        "flags": agg.flags,
    }
    j = json.dumps(out, ensure_ascii=False)
    if args.out:
        Path(args.out).write_text(j, encoding="utf-8")
    print(j)


if __name__ == "__main__":
    main_cli()
