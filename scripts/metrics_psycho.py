# metrics_psycho.py
# -*- coding: utf-8 -*-
"""
Psychophysical metrics for animation frames.
All metrics return in [0,1], higher = better (unless noted).
Heavy models are optional; code degrades gracefully on CPU-only boxes.

Dependencies (recommended):
  pip install numpy pillow opencv-python scikit-image open-clip-torch lpips
Optional:
  pip install torch torchvision  # for optical flow / MiDaS, if you want
"""

from __future__ import annotations
import math, json, warnings
from dataclasses import dataclass
from typing import Dict, Any, Optional, Tuple, List

import numpy as np
from PIL import Image
import cv2

import torch
from PIL import Image

try:
    import clip  # OpenAI CLIP
except ImportError:
    clip = None

# ============== small utils ==============

def _to_np_rgb(img: Image.Image) -> np.ndarray:
    if img.mode != "RGB":
        img = img.convert("RGB")
    return np.asarray(img)

def _minmax01(x, lo, hi):
    if hi <= lo: return 0.5
    return float(np.clip((x - lo) / (hi - lo), 0.0, 1.0))

def _robust_norm01(x, median, iqr):
    # Map to [0,1] using robust center & scale (median ± 2*IQR)
    span = max(1e-6, 2.0 * iqr)
    return float(np.clip(0.5 + (x - median) / (2.0 * span), 0.0, 1.0))

def _cos_sim(a: np.ndarray, b: np.ndarray) -> float:
    """
    安全版 cosine similarity：
    - 支援 torch.Tensor（自動 .detach().cpu().numpy()）
    - 支援 numpy array / list
    - 強制攤平成 1D 後再算
    """
    import numpy as _np
    try:
        import torch as _torch
    except ImportError:
        _torch = None

    # torch.Tensor -> numpy
    if _torch is not None and _torch.is_tensor(a):
        a = a.detach().cpu().numpy()
    if _torch is not None and _torch.is_tensor(b):
        b = b.detach().cpu().numpy()

    a = _np.asarray(a).reshape(-1)
    b = _np.asarray(b).reshape(-1)

    na = _np.linalg.norm(a) + 1e-8
    nb = _np.linalg.norm(b) + 1e-8
    if na == 0.0 or nb == 0.0:
        return 0.0
    return float(_np.dot(a, b) / (na * nb))


def _try_import_openclip():
    try:
        import open_clip
        import torch
        return open_clip, torch
    except Exception:
        return None, None

def _try_import_lpips():
    try:
        import lpips
        import torch
        return lpips, torch
    except Exception:
        return None, None

# ============== low-cost vision primitives ==============

def laplacian_var(gray: np.ndarray) -> float:
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())

def tenengrad(gray: np.ndarray) -> float:
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    g2 = gx*gx + gy*gy
    return float(np.mean(g2))

def edge_density(gray: np.ndarray) -> float:
    edges = cv2.Canny(gray, 100, 200)
    return float(edges.mean() / 255.0)

def texture_entropy(gray: np.ndarray) -> float:
    hist = cv2.calcHist([gray],[0],None,[256],[0,256]).ravel()
    p = hist / (hist.sum() + 1e-8)
    ent = -(p * (np.log2(p + 1e-12))).sum()
    return float(ent / 8.0)  # normalize to [0,1] ~ 8 bits

def blockiness_score(gray: np.ndarray, block=8) -> float:
    # Simple DCT-block artifact heuristic: vertical/horizontal grid energy at multiples of block size
    h, w = gray.shape
    v_edges = np.abs(np.diff(gray, axis=1))
    h_edges = np.abs(np.diff(gray, axis=0))
    v_grid = v_edges[:, ::block-1].mean() if w > block else v_edges.mean()
    h_grid = h_edges[::block-1, :].mean() if h > block else h_edges.mean()
    raw = (v_grid + h_grid) / 2.0
    return _minmax01(raw, 2.0, 14.0)  # rough calibration

def banding_score(rgb: np.ndarray) -> float:
    # Quantize to simulate bit-depth; strong banding => high score -> invert for quality
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    L = lab[...,0].astype(np.float32) / 255.0
    g = cv2.GaussianBlur(L, (0,0), 1.2)
    diff = np.abs(np.diff(g, axis=1)).mean() + np.abs(np.diff(g, axis=0)).mean()
    # Lower diff in smooth grads with steps (banding) -> penalize; we flip to artifact severity then invert later.
    return _minmax01(1.0/diff, 5.0, 80.0)

def horizon_tilt_penalty(gray: np.ndarray) -> float:
    edges = cv2.Canny(gray, 80, 180)
    lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=120)
    if lines is None: return 0.0
    # target horizontal (0 or pi), penalize dominant deviation
    thetas = [theta for rho,theta in lines[:,0]]
    dev = np.min([np.mean(np.abs(np.mod(thetas, np.pi) - 0.0)),
                  np.mean(np.abs(np.mod(thetas, np.pi) - np.pi/2))])  # allow centered/thirds mix
    deg = np.degrees(dev % (np.pi/2))
    return _minmax01(deg, 2.0, 15.0)  # more tilt -> larger penalty in [0,1]

def thirds_alignment_score(gray: np.ndarray) -> float:
    # Use spectral residual saliency centroid vs rule-of-thirds points
    sal = cv2.saliency.StaticSaliencySpectralResidual_create()
    ok, m = sal.computeSaliency(gray)
    if not ok: 
        m = cv2.GaussianBlur(gray.astype(np.float32)/255.0, (0,0), 3.0)
    yx = np.argwhere(m == m.max())
    cy, cx = (int(yx[:,0].mean()), int(yx[:,1].mean()))
    H, W = gray.shape
    thirds = [(H/3, W/3), (H/3, 2*W/3), (2*H/3, W/3), (2*H/3, 2*W/3)]
    d = min([math.hypot(cy-r, cx-c) for r,c in thirds]) / math.hypot(H, W)
    return 1.0 - _minmax01(d, 0.05, 0.35)  # closer to thirds => higher

def center_bias_penalty(gray: np.ndarray) -> float:
    sal = cv2.saliency.StaticSaliencySpectralResidual_create()
    ok, m = sal.computeSaliency(gray)
    if not ok:
        m = cv2.GaussianBlur(gray.astype(np.float32)/255.0, (0,0), 3.0)
    H, W = gray.shape
    yy, xx = np.mgrid[0:H, 0:W]
    cy, cx = (yy*m).sum()/m.sum(), (xx*m).sum()/m.sum()
    d = math.hypot(cy - H/2, cx - W/2) / math.hypot(H, W)
    # stronger center bias -> higher penalty (we like thirds more for “composition”)
    return _minmax01(0.25 - d, -0.2, 0.25)

def wb_drift_and_exposure(rgb: np.ndarray) -> Tuple[float,float]:
    # White-balance drift proxy: RG/BG ratios dispersion
    r,g,b = [rgb[...,i].astype(np.float32) + 1 for i in range(3)]
    rg = np.median(r/g); bg = np.median(b/g)
    wb_drift = float(abs(math.log(rg)) + abs(math.log(bg)))  # 0 is perfect gray-world
    wb_norm = 1.0 - _minmax01(wb_drift, 0.02, 0.45)
    # Exposure clipping fraction
    lo = (rgb <= 3).mean()
    hi = (rgb >= 252).mean()
    clip = lo + hi
    exp_norm = 1.0 - _minmax01(clip, 0.01, 0.12)
    return wb_norm, exp_norm

def palette_distance(rgb: np.ndarray, k=5) -> float:
    # Cluster colors and measure spread; more coherent palette -> lower distance => map to higher score
    data = rgb.reshape(-1,3).astype(np.float32)
    if len(data) < k: return 0.6
    crit, labels, centers = cv2.kmeans(data, k, None,
                                       (cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0),
                                       3, cv2.KMEANS_PP_CENTERS)
    d = np.mean(np.linalg.norm(centers - centers.mean(axis=0, keepdims=True), axis=1))
    return 1.0 - _minmax01(d, 10.0, 70.0)

def keypoint_richness(gray: np.ndarray) -> float:
    try:
        orb = cv2.ORB_create(1000)
        kp = orb.detect(gray, None)
        n = len(kp)
    except Exception:
        n = 200
    return _minmax01(n, 50, 1200)

# ============== CLIP-based features (optional) ==============

_CLIP_STATE = {
    "model": None,
    "preprocess": None,
    "device": "cuda" if torch.cuda.is_available() else "cpu",
}

def _norm01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))

def _load_clip(model_name: str = "ViT-B/32"):
    """
    Lazy load CLIP model，一次載入、多次共用。
    """
    global _CLIP_STATE, clip
    if _CLIP_STATE["model"] is not None:
        return _CLIP_STATE

    if clip is None:
        raise RuntimeError(
            "CLIP 模型尚未安裝，請先在環境內執行：\n"
            "  pip install 'git+https://github.com/openai/CLIP.git'\n"
            "或  pip install clip-anytorch"
        )

    device = _CLIP_STATE["device"]
    model, preprocess = clip.load(model_name, device=device)
    model.eval()
    _CLIP_STATE["model"] = model
    _CLIP_STATE["preprocess"] = preprocess
    _CLIP_STATE["device"] = device
    return _CLIP_STATE

def _clip_image_embed(np_rgb):
    """
    np_rgb: H x W x 3, 0–255 或 0–1，都可以，會轉成 uint8。
    回傳: (image_embedding [1, D], state_dict)
    """
    if np_rgb is None:
        return None

    st = _load_clip()
    model = st["model"]
    preprocess = st["preprocess"]
    device = st["device"]

    # Numpy -> PIL
    if np_rgb.dtype != "uint8":
        np_rgb = (np.clip(np_rgb, 0.0, 1.0) * 255).astype("uint8")
    pil = Image.fromarray(np_rgb)

    with torch.no_grad():
        img = preprocess(pil).unsqueeze(0).to(device)   # [1,3,224,224]
        emb = model.encode_image(img)                  # [1,D]
        emb = emb / emb.norm(dim=-1, keepdim=True)

    return emb, st

def _clip_text_embed(texts, bundle=None):
    """
    texts: list[str]
    回傳: (text_embeddings [N, D], state_dict)
    """
    if not texts:
        return None, bundle

    st = bundle or _load_clip()
    model = st["model"]
    device = st["device"]

    with torch.no_grad():
        tokens = clip.tokenize(texts).to(device)       # [N,77]
        emb = model.encode_text(tokens)                # [N,D]
        emb = emb / emb.norm(dim=-1, keepdim=True)

    return emb, st

def style_adherence_to_tags(np_rgb, style_tags):
    """
    根據 CLIP image/text cosine similarity 算 style adherence，輸出 [0,1].
    style_tags: list[str]，例如 ["anime", "cel-shaded", "high contrast"]。
    如果沒給 tags，就用一組預設動畫風格 tag。
    """
    # 沒有 tag 時，用一組 generic style tags（你可以自己改）
    if not style_tags:
        style_tags = [
            "clean anime line art",
            "consistent cel-shaded lighting",
            "vibrant but stable color palette",
        ]

    out = _clip_image_embed(np_rgb)
    if out is None:
        # CLIP 沒載好時，給個中立分數，不要炸掉 pipeline
        return 0.5
    im_emb, bundle = out

    txt_embs, bundle = _clip_text_embed(style_tags, bundle)
    if txt_embs is None:
        return 0.5

    # cosine sim: [1,D] @ [D,N] -> [1,N]
    sims = (im_emb @ txt_embs.T).squeeze(0)  # [N]
    mean_sim = float(sims.mean().item())     # 理論上在 [-1,1]

    # 映射到 [0,1]
    score_01 = (mean_sim + 1.0) / 2.0
    return _norm01(score_01)

def prompt_alignment(np_rgb: np.ndarray, prompt: Optional[str]) -> float:
    if not prompt:
        return 0.6

    out = _clip_image_embed(np_rgb)
    if out is None:
        return 0.6
    im_emb, bundle = out

    txt_emb, _ = _clip_text_embed([prompt], bundle)
    if txt_emb is None:
        return 0.6

    # txt_emb: [1, D]，im_emb: [1, D]，_cos_sim 會把它們攤平成 1D
    sim = _cos_sim(im_emb, txt_emb[0])
    return _minmax01(sim, 0.18, 0.34)

def style_subindex(np_rgb: np.ndarray) -> Dict[str, float]:
    # Pairwise CLIP comparisons for each sub-dimension (two poles)
    pairs = {
        "size": ("close-up portrait", "wide establishing shot"),
        "subject_matter": ("single character portrait", "multi-object complex scene"),
        "realism": ("photorealistic lighting", "flat cartoon cel shading"),
        "lighting": ("well-lit soft diffuse light", "harsh contrast lighting"),
        "lighting_refraction": ("strong specular refraction highlights", "matte surfaces no refraction"),
        "lighting_sss": ("subsurface scattering on skin", "no subsurface scattering"),
        "lighting_translucency": ("translucent materials with light passing through", "opaque materials no translucency"),
        "material_realism": ("physically based realistic materials", "stylized non-real materials"),
        "line_layering": ("visible layered line art", "no visible line art"),
        "brushstroke": ("painterly brush stroke texture", "no brush stroke texture"),
        "drama": ("dramatic high tension scene", "calm low drama scene"),
    }

    out = _clip_image_embed(np_rgb)
    if out is None:
        return {k: 0.5 for k in pairs.keys()}
    im_emb, bundle = out

    txts = [t for k, v in pairs.items() for t in v]
    txt_emb, _ = _clip_text_embed(txts, bundle)
    if txt_emb is None:
        return {k: 0.5 for k in pairs.keys()}

    result = {}
    for i, (a, b) in enumerate(pairs.values()):
        e1, e2 = txt_emb[2 * i], txt_emb[2 * i + 1]  # 這裡的 e1/e2 是 [D]
        s1 = _cos_sim(im_emb, e1)
        s2 = _cos_sim(im_emb, e2)
        pref = s1 - s2
        result[list(pairs.keys())[i]] = 1.0 / (1.0 + math.exp(-12.0 * pref))
    return result


# ============== temporal / identity (optional) ==============

def identity_consistency(curr_rgb: np.ndarray, prev_rgb: Optional[np.ndarray]) -> float:
    # Character/face identity variance proxy via global embedding cosine (cheap stand-in)
    if prev_rgb is None: return 0.6
    try:
        # Use ORB matching as cheap stationarity proxy
        orb = cv2.ORB_create(1000)
        k1 = orb.detectAndCompute(cv2.cvtColor(curr_rgb, cv2.COLOR_RGB2GRAY), None)
        k2 = orb.detectAndCompute(cv2.cvtColor(prev_rgb, cv2.COLOR_RGB2GRAY), None)
        if k1[1] is None or k2[1] is None: return 0.6
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(k1[1], k2[1])
        if not matches: return 0.6
        d = np.mean([m.distance for m in matches])
        # lower distance => higher consistency
        return 1.0 - _minmax01(d, 40.0, 80.0)
    except Exception:
        return 0.6

def temporal_consistency(curr_rgb: np.ndarray, prev_rgb: Optional[np.ndarray]) -> float:
    if prev_rgb is None: return 0.6
    # optical flow (Farnebäck) + (optional) t-LPIPS
    g1 = cv2.cvtColor(prev_rgb, cv2.COLOR_RGB2GRAY)
    g2 = cv2.cvtColor(curr_rgb, cv2.COLOR_RGB2GRAY)
    flow = cv2.calcOpticalFlowFarneback(g1, g2, None, 0.5, 3, 25, 3, 5, 1.2, 0)
    # warp prev -> curr and compute error
    h, w = g2.shape
    grid_x, grid_y = np.meshgrid(np.arange(w), np.arange(h))
    map_x = (grid_x + flow[...,0]).astype(np.float32)
    map_y = (grid_y + flow[...,1]).astype(np.float32)
    prev_warp = cv2.remap(g1, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    mse = float(np.mean((prev_warp - g2)**2))
    flow_term = 1.0 - _minmax01(mse, 100.0, 2000.0)

    # Optional t-LPIPS (if installed)
    lpips, torch = _try_import_lpips()
    if lpips is not None:
        try:
            net = lpips.LPIPS(net='vgg')
            t1 = torch.from_numpy(prev_warp/255.0).float().unsqueeze(0).unsqueeze(0).repeat(1,3,1,1)
            t2 = torch.from_numpy(g2/255.0).float().unsqueeze(0).unsqueeze(0).repeat(1,3,1,1)
            d = float(net(t1, t2).detach().cpu().numpy()[0][0][0])
            lp_term = 1.0 - _minmax01(d, 0.15, 0.75)
            return float(np.clip(0.6*flow_term + 0.4*lp_term, 0.0, 1.0))
        except Exception:
            pass
    return flow_term

# ============== public API ==============

@dataclass
class MetricsOut:
    # mirrors your groups
    frame: Dict[str,float]
    realism: Dict[str,float]
    details: Dict[str,float]
    richness: Dict[str,float]
    style_subindex: Dict[str,float]

def compute_metrics(
    image_path: str,
    *,
    prev_image_path: Optional[str] = None,
    prompt_text: Optional[str] = None,
    requested_style_tags: Optional[List[str]] = None,
    style_ref_path: Optional[str] = None,
) -> MetricsOut:
    img = Image.open(image_path)
    rgb = _to_np_rgb(img)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    prev_rgb = None
    if prev_image_path:
        try:
            prev_rgb = _to_np_rgb(Image.open(prev_image_path))
        except Exception:
            prev_rgb = None

    # --- Frame ---
    style_conf = style_adherence_to_tags(rgb, requested_style_tags or [])
    id_cons    = identity_consistency(rgb, prev_rgb)
    temp_cons  = temporal_consistency(rgb, prev_rgb)
    art_block  = blockiness_score(gray)
    art_band   = banding_score(rgb)
    # artifact_quality should be high=good => invert severities
    artifact_quality = float(np.clip(1.0 - 0.6*art_block - 0.4*art_band, 0.0, 1.0))
    comp_thirds = thirds_alignment_score(gray)
    comp_center = 1.0 - center_bias_penalty(gray)
    comp_tilt   = 1.0 - horizon_tilt_penalty(gray)
    comp_quality= float(np.clip(0.5*comp_thirds + 0.3*comp_tilt + 0.2*comp_center, 0.0, 1.0))
    clip_align  = prompt_alignment(rgb, prompt_text)

    # style subindex from style reference if provided; else from current
    if style_ref_path:
        style_sub = style_subindex(_to_np_rgb(Image.open(style_ref_path)))
    else:
        style_sub = style_subindex(rgb)

    frame = dict(
        style_adherence_conf=style_conf,
        style_subindex_match=0.5,  # you can compute cosine vs. style_sub target if you maintain a target vector
        identity_consistency=id_cons,
        temporal_consistency=temp_cons,
        artifact_quality=artifact_quality,
        composition_quality=comp_quality,
        prompt_alignment=clip_align,
    )

    # --- Realisticness ---
    # NR-IQA proxy: combine sharpness & entropy (you can replace with MUSIQ/PaQ-2 if installed)
    nriqa = float(np.clip(0.5*_minmax01(laplacian_var(gray), 20, 500) +
                          0.5*texture_entropy(gray), 0.0, 1.0))
    wb_norm, exp_norm = wb_drift_and_exposure(rgb)
    light_color = float(np.clip(0.6*wb_norm + 0.4*exp_norm, 0.0, 1.0))
    # depth/3D proxy: contrast of Laplacian + edge density (cheap stand-in)
    depth3d = float(np.clip(0.6*_minmax01(laplacian_var(gray), 20, 500) + 0.4*edge_density(gray), 0.0, 1.0))
    realism = dict(
        nriqa=nriqa,
        depth3d=depth3d,
        lighting_color=light_color,
        safety=1.0,           # leave 1.0 unless you hook a safety checker
        pbr_plausibility=0.6  # stub; replace with your PBR classifier if available
    )

    # --- Details & Resolution ---
    det_density = float(np.clip(0.5*edge_density(gray) + 0.5*texture_entropy(gray), 0.0, 1.0))
    res_sharp   = _minmax01(tenengrad(gray), 50, 1200)
    details = dict(
        detail_density=det_density,
        resolution_sharpness=res_sharp
    )

    # --- Richness ---
    coverage_div = float(np.clip(0.6*keypoint_richness(gray) + 0.4*palette_distance(rgb), 0.0, 1.0))
    richness = dict(
        coverage_diversity=coverage_div,
        motion_smoothness=0.6 if prev_rgb is None else temporal_consistency(rgb, prev_rgb)
    )

    return MetricsOut(frame=frame, realism=realism, details=details, richness=richness, style_subindex=style_sub)

# convenience: JSON dump
def metrics_to_json(m: MetricsOut) -> str:
    return json.dumps({
        "frame": m.frame,
        "realism": m.realism,
        "details": m.details,
        "richness": m.richness,
        "style_subindex": m.style_subindex,
    }, ensure_ascii=False, indent=2)
