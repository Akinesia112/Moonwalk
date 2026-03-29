"""
canvas.py  —  /canvas/*

Canvas Annotation System:
  - All annotations are burned directly into image pixels (not an overlay layer)
  - Each operation creates a new version, supporting undo
  - Supports: brush strokes, eraser, text boxes, rectangles, circles
  - Each artwork+ref combination has independent version history
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import base64, io, os, json, uuid
from pathlib import Path
from datetime import datetime

router = APIRouter(prefix="/canvas", tags=["canvas"])

# ── Storage ───────────────────────────────────────────────────────
DATA_DIR = Path(os.path.dirname(__file__)) / ".." / "data" / "canvas"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def _session_dir(session_id: str) -> Path:
    d = DATA_DIR / session_id
    d.mkdir(parents=True, exist_ok=True)
    return d

def _meta_path(session_id: str) -> Path:
    return _session_dir(session_id) / "meta.json"

def _load_meta(session_id: str) -> dict:
    p = _meta_path(session_id)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            pass
    return {"versions": [], "current": -1}

def _save_meta(session_id: str, meta: dict):
    _meta_path(session_id).write_text(json.dumps(meta, indent=2))

def _version_path(session_id: str, version: int) -> Path:
    return _session_dir(session_id) / f"v{version:04d}.png"


# ── Pydantic models ───────────────────────────────────────────────

class Point(BaseModel):
    x: float
    y: float

class Annotation(BaseModel):
    type: str                          # brush | eraser | text | rect | circle
    color: str = "#ef4444"
    fill_color: str = "transparent"
    opacity: float = 1.0
    line_width: float = 3.0
    points: Optional[List[Optional[Point]]] = None   # for brush/eraser/rect/circle
    x: Optional[float] = None          # for text
    y: Optional[float] = None
    text: Optional[str] = None
    font_size: int = 16
    bold: bool = False
    italic: bool = False

class DrawRequest(BaseModel):
    session_id: str                    # e.g. "artwork_xxx__ref_yyy"
    base_image_b64: str                # current image as base64 PNG/JPEG
    annotation: Annotation             # the single operation to apply
    canvas_width: int                  # canvas pixel width (for coord mapping)
    canvas_height: int

class UndoRequest(BaseModel):
    session_id: str

class GetRequest(BaseModel):
    session_id: str


# ── Core: apply annotation onto image using Pillow ─────────────────
def _apply_annotation(img_bytes: bytes, ann: Annotation, canvas_w: int, canvas_h: int) -> bytes:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        raise HTTPException(500, "Pillow not installed. Run: pip install Pillow")

    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    iw, ih = img.size

    # Scale factor: canvas coords → image pixel coords
    sx = iw / canvas_w
    sy = ih / canvas_h

    # Overlay layer (RGBA, transparent) for drawing
    overlay = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    def sc(p: Optional[Point]):
        if p is None:
            return None
        return (p.x * sx, p.y * sy)

    def parse_color(css: str, alpha: float = 1.0):
        """Convert CSS hex color to RGBA tuple."""
        css = css.strip().lstrip("#")
        a = int(alpha * 255)
        if len(css) == 6:
            r, g, b = int(css[0:2], 16), int(css[2:4], 16), int(css[4:6], 16)
        elif len(css) == 3:
            r, g, b = int(css[0]*2, 16), int(css[1]*2, 16), int(css[2]*2, 16)
        else:
            r, g, b = 239, 68, 68  # default red
        return (r, g, b, a)

    stroke = parse_color(ann.color, ann.opacity)
    fill   = parse_color(ann.fill_color, ann.opacity) if ann.fill_color and ann.fill_color != "transparent" else None
    lw     = max(1, int(ann.line_width * sx))

    if ann.type == "brush" and ann.points:
        pts = [sc(p) for p in ann.points if p is not None]
        if len(pts) >= 2:
            for i in range(len(pts) - 1):
                draw.line([pts[i], pts[i + 1]], fill=stroke, width=lw, joint="curve")

    elif ann.type == "eraser" and ann.points:
        # Eraser: draw white on overlay (will erase via composite)
        # Actually: draw directly with white on main image
        erase = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
        edraw = ImageDraw.Draw(erase)
        pts = [sc(p) for p in ann.points if p is not None]
        if len(pts) >= 2:
            for i in range(len(pts) - 1):
                edraw.line([pts[i], pts[i + 1]], fill=(255, 255, 255, 255), width=lw * 2)
        img = Image.composite(Image.new("RGBA", (iw, ih), (255, 255, 255, 255)), img, erase)
        result = img.convert("RGB")
        out = io.BytesIO()
        result.save(out, "PNG")
        return out.getvalue()

    elif ann.type == "rect" and ann.points and len(ann.points) >= 2:
        p0 = sc(ann.points[0])
        p1 = sc(ann.points[-1])
        if p0 and p1:
            x0, y0 = min(p0[0], p1[0]), min(p0[1], p1[1])
            x1, y1 = max(p0[0], p1[0]), max(p0[1], p1[1])
            if fill:
                draw.rectangle([x0, y0, x1, y1], fill=fill, outline=stroke, width=lw)
            else:
                draw.rectangle([x0, y0, x1, y1], outline=stroke, width=lw)

    elif ann.type == "circle" and ann.points and len(ann.points) >= 2:
        p0 = sc(ann.points[0])
        p1 = sc(ann.points[-1])
        if p0 and p1:
            import math
            dx = p1[0] - p0[0]; dy = p1[1] - p0[1]
            r = math.sqrt(dx*dx + dy*dy)
            bbox = [p0[0]-r, p0[1]-r, p0[0]+r, p0[1]+r]
            if fill:
                draw.ellipse(bbox, fill=fill, outline=stroke, width=lw)
            else:
                draw.ellipse(bbox, outline=stroke, width=lw)

    elif ann.type == "text" and ann.text and ann.x is not None and ann.y is not None:
        tx = ann.x * sx
        ty = ann.y * sy
        fs = max(10, int(ann.font_size * sx))
        # Try to load a font; fall back to default
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", fs)
        except Exception:
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", fs)
            except Exception:
                font = ImageFont.load_default()

        bbox_text = draw.textbbox((tx, ty - fs), ann.text, font=font)
        pad = 4
        # White background box
        draw.rectangle(
            [bbox_text[0]-pad, bbox_text[1]-pad, bbox_text[2]+pad, bbox_text[3]+pad],
            fill=(255, 255, 255, int(0.85 * 255))
        )
        draw.text((tx, ty - fs), ann.text, fill=stroke, font=font)

    # Composite overlay onto image
    result = Image.alpha_composite(img, overlay).convert("RGB")
    out = io.BytesIO()
    result.save(out, "PNG")
    return out.getvalue()


# ── Routes ────────────────────────────────────────────────────────

@router.post("/draw")
async def draw(req: DrawRequest):
    """Apply one annotation operation, burn it into the image, save as new version."""
    try:
        # Decode base64 image
        img_bytes = base64.b64decode(req.base_image_b64.split(",")[-1])
    except Exception:
        raise HTTPException(400, "Invalid base64 image")

    # Apply annotation
    result_bytes = _apply_annotation(img_bytes, req.annotation, req.canvas_width, req.canvas_height)

    # Save new version
    meta = _load_meta(req.session_id)
    # Trim future versions if we're not at the end (undo happened)
    current = meta.get("current", -1)
    meta["versions"] = meta["versions"][: current + 1]

    new_v = len(meta["versions"])
    vpath = _version_path(req.session_id, new_v)
    vpath.write_bytes(result_bytes)

    meta["versions"].append({
        "version": new_v,
        "timestamp": datetime.now().isoformat(),
        "annotation_type": req.annotation.type,
    })
    meta["current"] = new_v
    _save_meta(req.session_id, meta)

    # Return the merged image as base64
    b64 = base64.b64encode(result_bytes).decode()
    return {
        "image_b64": f"data:image/png;base64,{b64}",
        "version": new_v,
        "total_versions": len(meta["versions"]),
    }


@router.post("/undo")
async def undo(req: UndoRequest):
    """Step back one version."""
    meta = _load_meta(req.session_id)
    current = meta.get("current", -1)

    if current <= 0:
        raise HTTPException(400, "No more undo history")

    prev_v = current - 1
    meta["current"] = prev_v
    _save_meta(req.session_id, meta)

    vpath = _version_path(req.session_id, prev_v)
    if not vpath.exists():
        raise HTTPException(404, "Version file not found")

    img_bytes = vpath.read_bytes()
    b64 = base64.b64encode(img_bytes).decode()
    return {
        "image_b64": f"data:image/png;base64,{b64}",
        "version": prev_v,
        "total_versions": len(meta["versions"]),
    }


@router.get("/get/{session_id}")
async def get_canvas(session_id: str):
    """Get the current version of the canvas image."""
    meta = _load_meta(session_id)
    current = meta.get("current", -1)
    if current < 0:
        return {"image_b64": None, "version": -1, "total_versions": 0}

    vpath = _version_path(session_id, current)
    if not vpath.exists():
        return {"image_b64": None, "version": -1, "total_versions": 0}

    img_bytes = vpath.read_bytes()
    b64 = base64.b64encode(img_bytes).decode()
    return {
        "image_b64": f"data:image/png;base64,{b64}",
        "version": current,
        "total_versions": len(meta["versions"]),
    }


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear all canvas history for a session."""
    import shutil
    d = _session_dir(session_id)
    if d.exists():
        shutil.rmtree(d)
    return {"cleared": session_id}