from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter(tags=["search"])

# ── In-memory mock storage ──────────────────────────────────────
PROJECTS = {
    "proj_001": {
        "id": "proj_001",
        "name": "Moonwalk Campaign",
        "client": "Client Name",
        "status": "active",
        "created_at": "2024-01-15",
    }
}

REFERENCES: dict = {
    "ref_001": {
        "id": "ref_001",
        "project_id": "proj_001",
        "title": "Cyberpunk Lighting Reference",
        "category": "Lighting",
        "confidentiality": "client-sensitive",
        "file_url": "",
        "thumbnail_url": "",
        "note": "參考光影方向，主光從右側硬光",
        "is_pinned": True,
        "priority": "main",
        "uploaded_by": "Director",
        "created_at": "2024-01-20",
    },
    "ref_002": {
        "id": "ref_002",
        "project_id": "proj_001",
        "title": "Character Mood Study",
        "category": "Mood",
        "confidentiality": "client-sensitive",
        "file_url": "",
        "thumbnail_url": "",
        "note": "角色情緒氛圍，壓抑的張力感",
        "is_pinned": True,
        "priority": "main",
        "uploaded_by": "Director",
        "created_at": "2024-01-20",
    },
    "ref_003": {
        "id": "ref_003",
        "project_id": "proj_001",
        "title": "Material Reference - Metal",
        "category": "Texture",
        "confidentiality": "internal",
        "file_url": "",
        "thumbnail_url": "",
        "note": "",
        "is_pinned": False,
        "priority": "secondary",
        "uploaded_by": "Artist",
        "created_at": "2024-01-21",
    },
}

ARTWORKS: dict = {
    "art_001": {
        "id": "art_001",
        "project_id": "proj_001",
        "shot_id": "Shot_001",
        "name": "Shot_001_v01",
        "version": 1,
        "file_url": "",
        "thumbnail_url": "",
        "file_type": "image",
        "artist_note": "",
        "tags": [],
        "status": "in_review",
        "uploaded_by": "Artist",
        "created_at": "2024-02-01",
    }
}

BRIEFS: dict = {}
REFLECTIONS: dict = {}
FEEDBACKS: dict = {}
DECISIONS: dict = {}
ACTIVITIES: list = [
    {"id": "act_001", "user": "Sarah L.", "action": "uploaded a new version for", "target": "Shot_005_v04", "timestamp": "2024-02-10T10:00:00"},
    {"id": "act_002", "user": "AI System", "action": "completed analysis for", "target": "Asset_Dragon_Tex_v02", "timestamp": "2024-02-10T09:00:00"},
    {"id": "act_003", "user": "Mike T.", "action": "submitted feedback on", "target": "Sequence_A_Anim_v03", "timestamp": "2024-02-10T08:00:00"},
]


# ── Search routes ────────────────────────────────────────────────

@router.get("/search/projects")
async def get_projects():
    return list(PROJECTS.values())

@router.get("/search/projects/{project_id}")
async def get_project(project_id: str):
    if project_id not in PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found")
    return PROJECTS[project_id]

@router.get("/search/references")
async def get_references(project_id: str, pinned_only: bool = False, artwork_id: Optional[str] = None):
    refs = [r for r in REFERENCES.values() if r["project_id"] == project_id]
    if pinned_only:
        refs = [r for r in refs if r["is_pinned"]]
    return refs

@router.get("/search/references/{ref_id}")
async def get_reference(ref_id: str):
    if ref_id not in REFERENCES:
        raise HTTPException(status_code=404, detail="Reference not found")
    return REFERENCES[ref_id]

@router.post("/search/upload")
async def upload_image(
    type: str = Form("reference"),
    project_id: str = Form("proj_001"),
    instruction: str = Form(""),
    priority: str = Form("secondary"),
    category: str = Form("Lighting"),
    image: Optional[UploadFile] = File(None),
):
    new_id = f"ref_{uuid.uuid4().hex[:8]}"
    REFERENCES[new_id] = {
        "id": new_id,
        "project_id": project_id,
        "title": image.filename if image else "Uploaded Image",
        "category": category,
        "confidentiality": "internal",
        "file_url": f"/uploads/{new_id}",
        "thumbnail_url": "",
        "note": instruction,
        "is_pinned": priority == "main",
        "priority": priority,
        "uploaded_by": "User",
        "created_at": datetime.now().isoformat(),
    }
    return {"id": new_id, "file_url": f"/uploads/{new_id}", "thumbnail_url": ""}

@router.post("/search/url")
async def import_by_url(body: dict):
    new_id = f"ref_{uuid.uuid4().hex[:8]}"
    REFERENCES[new_id] = {
        "id": new_id,
        "project_id": body.get("project_id", "proj_001"),
        "title": body.get("url", "URL Import"),
        "category": body.get("category", "Lighting"),
        "confidentiality": "internal",
        "file_url": body.get("url", ""),
        "thumbnail_url": body.get("url", ""),
        "note": body.get("instruction", ""),
        "is_pinned": False,
        "priority": "secondary",
        "uploaded_by": "User",
        "created_at": datetime.now().isoformat(),
    }
    return {"id": new_id, "file_url": body.get("url", ""), "thumbnail_url": body.get("url", "")}

@router.get("/search/artworks")
async def get_artworks(project_id: str, status: Optional[str] = None):
    arts = [a for a in ARTWORKS.values() if a["project_id"] == project_id]
    if status:
        arts = [a for a in arts if a["status"] == status]
    return arts

@router.get("/search/artworks/{artwork_id}")
async def get_artwork(artwork_id: str):
    if artwork_id not in ARTWORKS:
        raise HTTPException(status_code=404, detail="Artwork not found")
    return ARTWORKS[artwork_id]


# ── Understanding routes ─────────────────────────────────────────

@router.get("/Understanding/project/{project_id}/stats")
async def get_project_stats(project_id: str):
    return {
        "active_shots": 142,
        "pending_reviews": 38,
        "ai_queue": 15,
        "recent_feedback": 24,
    }

@router.get("/Understanding/project/{project_id}/activity")
async def get_project_activity(project_id: str, limit: int = 20):
    return ACTIVITIES[:limit]

@router.get("/Understanding/brief/{project_id}")
async def get_brief(project_id: str):
    return BRIEFS.get(project_id, {
        "selling_points": "",
        "keywords": "",
        "restrictions": "",
        "style": "",
        "mood": "",
        "worldview": "",
        "rhythm": "medium",
        "supervisor_spec": "",
    })

@router.get("/Understanding/brief/{project_id}/analysis")
async def get_brief_analysis(project_id: str):
    return {"ambiguous_items": [], "missing_items": [], "suggestions": []}

@router.get("/Understanding/reflection/{project_id}/workflow")
async def get_workflow(project_id: str):
    return REFLECTIONS.get(f"{project_id}_workflow", [])

@router.get("/Understanding/reflection/{project_id}/notes")
async def get_reflection_notes(project_id: str):
    return {"notes": REFLECTIONS.get(f"{project_id}_notes", "")}

@router.get("/Understanding/artwork/{artwork_id}/analysis")
async def get_artwork_analysis(artwork_id: str):
    return []

@router.get("/Understanding/artwork/{artwork_id}/reflection")
async def get_artwork_reflection(artwork_id: str):
    return {"notes": ""}

@router.get("/Understanding/artwork/{artwork_id}/artist_notes")
async def get_artist_notes(artwork_id: str):
    return {"artist": "Artist", "notes": "", "intentions": [], "timestamp": datetime.now().isoformat()}

@router.get("/Understanding/artwork/{artwork_id}/feedback")
async def get_artwork_feedback_understanding(artwork_id: str):
    return [f for f in FEEDBACKS.values() if f.get("artwork_id") == artwork_id]

@router.get("/Understanding/artwork/{artwork_id}/canvas")
async def get_canvas(artwork_id: str):
    return []

@router.get("/Understanding/artwork/{artwork_id}/labels")
async def get_labels(artwork_id: str):
    return []

@router.get("/Understanding/decisions/{project_id}")
async def get_decisions(project_id: str):
    return [d for d in DECISIONS.values() if d.get("project_id") == project_id]

@router.get("/Understanding/feedback/{project_id}/final")
async def get_final_feedback(project_id: str):
    return {"synthesis_text": "", "status": "draft"}

@router.get("/Understanding/feedback/{project_id}/synthesis/{shot_id}")
async def get_feedback_synthesis(project_id: str, shot_id: str):
    return {"supervisor_feedback": "", "ai_feedback": "", "client_feedback": ""}

@router.get("/Understanding/notifications")
async def get_notifications():
    return []