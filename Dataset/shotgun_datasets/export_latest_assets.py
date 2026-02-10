#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from dateutil import parser as dtparser
from slugify import slugify
import shotgun_api3  # pip install shotgun_api3


SITE_DEFAULT = "https://moonshine.shotgunstudio.com"

# 你指定的 Project 欄位（用「UI 顯示名」）
PROJECT_FIELD_DISPLAY_NAMES = [
    "Art Director", "CG Lead", "CG Sup", "Color", "Comp Sup", "Director",
    "Duration", "End Date", "Favorite", "FPS", "Fx Sup", "PC", "PM", "Description",
    "Render Engine", "Render Engine Detail", "Res Height", "Res Width",
    "Scale", "Start Date", "Status", "Tags", "Tank Name", "Unit", "Zulip Stream"
]

TYPE_DISPLAY_NAME = "Type"  # 你 UI 分組用的 Type 欄位顯示名


@dataclass
class SGConn:
    site: str
    script_name: str
    api_key: str


def connect(conn: SGConn):
    return shotgun_api3.Shotgun(conn.site, script_name=conn.script_name, api_key=conn.api_key)


def norm_name(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return "UNKNOWN"
    return slugify(s, lowercase=False, separator="_")[:120]


def safe_mkdir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def dt(v: Any) -> Optional[datetime]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    try:
        return dtparser.parse(str(v))
    except Exception:
        return None

def display_name_to_str(x: Any) -> Optional[str]:
    """
    ShotGrid schema 裡的 props["name"] 有時是 str，有時是 dict（多語系/帶 value）。
    這裡把它變成可用的 display name 字串。
    """
    if x is None:
        return None
    if isinstance(x, str):
        s = x.strip()
        return s or None
    if isinstance(x, dict):
        if isinstance(x.get("value"), str) and x["value"].strip():
            return x["value"].strip()
        if isinstance(x.get("name"), str) and x["name"].strip():
            return x["name"].strip()
        for k in ("en_US", "en", "zh_TW", "zh_CN", "zh"):
            v = x.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        for v in x.values():
            if isinstance(v, str) and v.strip():
                return v.strip()
    return None


def stringify_field_value(v: Any) -> Any:
    """
    ShotGrid 會回傳 link dict / list / primitive，這裡轉成適合寫 json 的結構。
    """
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, dict):
        if "type" in v and "id" in v:
            return {k: v.get(k) for k in ("type", "id", "name")}
        return {k: stringify_field_value(val) for k, val in v.items()}
    if isinstance(v, list):
        return [stringify_field_value(x) for x in v]
    return v


def schema_display_to_field(sg, entity_type: str) -> Dict[str, str]:
    schema = sg.schema_field_read(entity_type)
    out: Dict[str, str] = {}
    for field_name, props in (schema or {}).items():
        dn_raw = (props or {}).get("name")
        dn = display_name_to_str(dn_raw)
        if dn:
            out[dn] = field_name
    return out


def pick_field_by_display(sg, entity_type: str, display_name: str) -> Optional[str]:
    mp = schema_display_to_field(sg, entity_type)
    return mp.get(display_name)

def pick_project_description_field(sg) -> Optional[str]:
    """
    Project 的描述欄位在不同站點可能是：
    - 標準欄位：description
    - 自訂欄位：sg_description
    - 或者 UI 顯示名叫 "Description" 但 field name 不同（少見）
    我們用 schema 保守偵測，優先順序如上。
    """
    schema = sg.schema_field_read("Project") or {}
    if "description" in schema:
        return "description"
    if "sg_description" in schema:
        return "sg_description"

    # fallback：嘗試用 display name 找 "Description"
    mp = schema_display_to_field(sg, "Project")
    return mp.get("Description")


def pick_fields_by_displays(sg, entity_type: str, display_names: List[str]) -> Dict[str, str]:
    mp = schema_display_to_field(sg, entity_type)
    out = {}
    for dn in display_names:
        if dn in mp:
            out[dn] = mp[dn]
    return out


def display_name_to_str(x: Any) -> Optional[str]:
    """
    ShotGrid schema 裡的 props["name"] 有時是 str，有時是 dict（多語系/帶 value）。
    這裡把它變成可用的 display name 字串。
    """
    if x is None:
        return None
    if isinstance(x, str):
        s = x.strip()
        return s or None
    if isinstance(x, dict):
        # 常見：{"value": "Type"}
        if isinstance(x.get("value"), str) and x["value"].strip():
            return x["value"].strip()
        # 常見：{"name": "Type"}
        if isinstance(x.get("name"), str) and x["name"].strip():
            return x["name"].strip()
        # 多語系：{"en_US": "...", "zh_TW": "..."} -> 先挑 en_US，再挑任一個
        for k in ("en_US", "en", "zh_TW", "zh_CN", "zh"):
            v = x.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        # 任取第一個字串值
        for v in x.values():
            if isinstance(v, str) and v.strip():
                return v.strip()
    return None


def stringify_field_value(v: Any) -> Any:
    """
    ShotGrid 會回傳 link dict / list / primitive，這裡轉成適合寫 json 的結構。
    """
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, dict):
        # entity link: {"type":"HumanUser","id":1,"name":"..."}
        if "type" in v and "id" in v:
            return {k: v.get(k) for k in ("type", "id", "name")}
        return {k: stringify_field_value(val) for k, val in v.items()}
    if isinstance(v, list):
        return [stringify_field_value(x) for x in v]
    return v

def schema_display_to_field(sg, entity_type: str) -> Dict[str, str]:
    schema = sg.schema_field_read(entity_type)
    out: Dict[str, str] = {}
    for field_name, props in (schema or {}).items():
        dn_raw = (props or {}).get("name")
        dn = display_name_to_str(dn_raw)
        if dn:
            out[dn] = field_name
    return out

def pick_fields_by_displays(sg, entity_type: str, display_names: List[str]) -> Dict[str, str]:
    mp = schema_display_to_field(sg, entity_type)
    out = {}
    for dn in display_names:
        if dn in mp:
            out[dn] = mp[dn]
    return out


def find_projects(sg, project_type_field: Optional[str], project_fields: List[str], project_regex: Optional[str]) -> List[Dict[str, Any]]:
    fields = ["id", "name"]
    if project_type_field:
        fields.append(project_type_field)
    fields.extend(project_fields)

    projects = sg.find("Project", [], fields)

    if project_regex:
        rx = re.compile(project_regex, re.IGNORECASE)
        projects = [p for p in projects if rx.search(p.get("name", ""))]

    return projects


def extract_project_type_value(proj: Dict[str, Any], project_type_field: Optional[str]) -> str:
    if not project_type_field:
        return "UNKNOWN"
    v = proj.get(project_type_field)
    # 可能是 text，也可能是 list（Tags）或 link
    if isinstance(v, dict):
        return v.get("name") or "UNKNOWN"
    if isinstance(v, list):
        # 若是 multi-entity 或 multi-select，串起來
        names = []
        for x in v:
            if isinstance(x, dict):
                names.append(x.get("name") or "")
            else:
                names.append(str(x))
        s = ", ".join([n for n in names if n])
        return s or "UNKNOWN"
    return str(v) if v is not None and str(v).strip() else "UNKNOWN"


def resolve_version_artist(version: Dict[str, Any], candidate_fields: List[str]) -> Optional[str]:
    """
    你要的 Artist，在不同棚可能是 user / created_by / sg_artist 等自訂欄位。
    這裡會依序嘗試 candidate_fields，取到第一個有值的。
    """
    for f in candidate_fields:
        v = version.get(f)
        if isinstance(v, dict):
            name = v.get("name")
            if name:
                return name
        elif isinstance(v, str) and v.strip():
            return v.strip()
    return None


def list_versions_for_project(sg, project: Dict[str, Any], version_fields: List[str], limit: int) -> List[Dict[str, Any]]:
    filters = [["project", "is", project]]
    # 依 updated_at 由新到舊
    return sg.find(
        "Version",
        filters,
        version_fields,
        order=[{"field_name": "updated_at", "direction": "desc"}],
        limit=limit,
    )


def pick_latest_version_with_asset(versions: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    挑「最新更新且有 asset」：
    - 有 thumbnail（Version.image 之類）視為有圖
    - 或有 uploaded movie attachment（常見欄位 sg_uploaded_movie）
    """
    for v in versions:
        has_image = bool(v.get("image"))  # ShotGrid 標準 thumbnail url
        has_movie = bool(v.get("sg_uploaded_movie"))  # 常見欄位：Attachment link
        if has_image or has_movie:
            return v
    return None


def download_best_asset(sg, version: Dict[str, Any], out_dir: Path) -> Tuple[Optional[Path], str]:
    """
    圖片優先：
    - 若 version 有 thumbnail：用 sg.download_thumbnail('Version', id, path)
    - 否則若有 sg_uploaded_movie attachment：用 sg.download_attachment(attachment_id, path)
    回傳 (path, kind)
    """
    vid = version["id"]

    # 1) Image first
    if version.get("image"):
        # ShotGrid 下載 thumbnail 會自動決定副檔名；但我們固定存 final.jpg
        img_path = out_dir / "final.jpg"
        try:
            sg.download_thumbnail("Version", vid, str(img_path))
            if img_path.exists() and img_path.stat().st_size > 0:
                return img_path, "image"
        except Exception:
            # 如果 thumbnail 下載失敗，再試其他路徑
            pass

    # 2) Movie fallback
    att = version.get("sg_uploaded_movie")
    if isinstance(att, dict) and att.get("type") == "Attachment" and att.get("id"):
        att_id = att["id"]
        # 檔名盡量保留原名副檔名
        name = (att.get("name") or "final.mov").strip()
        if "." not in name:
            name += ".mov"
        movie_path = out_dir / f"final{Path(name).suffix}"
        try:
            sg.download_attachment(att_id, str(movie_path))
            if movie_path.exists() and movie_path.stat().st_size > 0:
                return movie_path, "movie"
        except Exception:
            pass

    return None, "none"

# ---------------------------
# 斷點續跑：判斷某個 Project folder 是否已完成
# ---------------------------
def is_project_done(proj_dir: Path) -> bool:
    final_json = proj_dir / "final_version.json"
    if final_json.exists():
        try:
            data = json.loads(final_json.read_text(encoding="utf-8"))
            asset_path = data.get("asset_path")
            if asset_path:
                p = Path(asset_path)
                if not p.is_absolute():
                    p = (proj_dir / p).resolve()
                if p.exists() and p.is_file() and p.stat().st_size > 0:
                    return True
        except Exception:
            pass

    # 寬鬆 fallback：只要 final.jpg 或 final.*mov/mp4 存在就算完成
    if (proj_dir / "final.jpg").exists() and (proj_dir / "final.jpg").stat().st_size > 0:
        return True
    for ext in (".mov", ".mp4", ".mxf"):
        p = proj_dir / f"final{ext}"
        if p.exists() and p.stat().st_size > 0:
            return True

    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default=SITE_DEFAULT)
    ap.add_argument("--script-name", required=True)
    ap.add_argument("--api-key", required=True)

    ap.add_argument("--out", default="shotgrid_export_api", help="輸出資料夾")
    ap.add_argument("--project-regex", default=None, help="只抓符合 regex 的 Projects（可選）")

    ap.add_argument("--version-limit", type=int, default=500, help="每個 Project 最多掃多少筆 Versions（依 updated_at desc）")

    # 有些站會把 Artist 放在不同欄位；這裡給一個常見候選序列
    ap.add_argument("--artist-fields", default="sg_artist,user,created_by",
                    help="Version 上可能代表 Artist 的欄位（逗號分隔，依序嘗試）")

    ap.add_argument("--skip-existing", action="store_true", default=True,
                    help="如果 Project folder 已有 final_version.json 且 asset 檔案存在，則跳過（預設開啟）")
    ap.add_argument("--no-skip-existing", dest="skip_existing", action="store_false",
                    help="關閉跳過：即使已完成也重跑")
    ap.add_argument("--force", action="store_true",
                    help="等同於 --no-skip-existing（保留給你習慣用的命名）")


    args = ap.parse_args()

    conn = SGConn(site=args.site, script_name=args.script_name, api_key=args.api_key)
    sg = connect(conn)

    out_root = Path(args.out)
    safe_mkdir(out_root)

    # 1) 用 schema 自動找到 Project 的 Type 欄位、以及你列的 Project 欄位
    project_type_field = pick_field_by_display(sg, "Project", TYPE_DISPLAY_NAME)

    proj_display_to_field = pick_fields_by_displays(sg, "Project", PROJECT_FIELD_DISPLAY_NAMES)
    # 只取 field_name list 去 find
    project_fields = list(proj_display_to_field.values())

    # ✅ 額外抓 Project Description（不在你那份 UI 清單裡）
    project_desc_field = pick_project_description_field(sg)
    if project_desc_field and project_desc_field not in project_fields:
        project_fields.append(project_desc_field)


    # 2) Versions 需要的欄位：
    # - image: thumbnail url（標準）
    # - sg_uploaded_movie: uploaded movie attachment（常見）
    # - sg_status_list: Status
    # - sg_task: Task
    # - updated_at: 最新更新依據
    # - 再加上 artist candidate fields（可能不存在會被忽略？注意：不存在會 raise，所以要先 schema 檢查）
    version_base_fields = ["id", "code", "updated_at", "created_at", "image", "sg_status_list", "sg_task", "sg_uploaded_movie"]

    # 先 schema 檢查 Version entity 有哪些欄位，避免查不存在欄位直接炸
    version_schema = sg.schema_field_read("Version")
    version_fields = []
    for f in version_base_fields:
        if f in version_schema:
            version_fields.append(f)

    artist_fields = [x.strip() for x in args.artist_fields.split(",") if x.strip()]
    for f in artist_fields:
        if f in version_schema and f not in version_fields:
            version_fields.append(f)

    # 3) 拉 Projects
    projects = find_projects(sg, project_type_field, project_fields, args.project_regex)
    print(f"[INFO] projects={len(projects)} type_field={project_type_field or 'NOT_FOUND'}")

    index = []

    for i, proj in enumerate(projects, 1):
        pid = proj["id"]
        pname = proj.get("name") or f"Project_{pid}"

        # folder: Type / ProjectName
        ptype = extract_project_type_value(proj, project_type_field)
        type_dir = out_root / norm_name(ptype)
        proj_dir = type_dir / norm_name(pname)
        safe_mkdir(proj_dir)

        # 斷點續跑：已完成就跳過（避免中斷後重來）
        if is_project_done(proj_dir):
            print(f"[{i}/{len(projects)}] {ptype} / {pname} -> SKIP (already done)")
            continue

        # 先算好 description（Project 層級）
        proj_description = stringify_field_value(proj.get(project_desc_field)) if project_desc_field else None


        # Project meta（把 display name 對回去）
        project_meta = {
            "project_id": pid,
            "project_name": pname,
            "project_type": ptype,
            "project_url": f"{args.site}/page/project_overview?project_id={pid}",
            "description": proj_description,
            "project_fields": {},
        }
        for dn, fn in proj_display_to_field.items():
            project_meta["project_fields"][dn] = stringify_field_value(proj.get(fn))

        # 4) Versions：挑最新 updated 且有 asset 的那個
        versions = list_versions_for_project(sg, {"type": "Project", "id": pid, "name": pname}, version_fields, args.version_limit)
        latest = pick_latest_version_with_asset(versions)

        final_info = None
        if latest:
            asset_path, kind = download_best_asset(sg, latest, proj_dir)

            artist = resolve_version_artist(latest, artist_fields)
            status = latest.get("sg_status_list")
            task = latest.get("sg_task")
            task_name = task.get("name") if isinstance(task, dict) else None

            final_info = {
                "version_id": latest["id"],
                "version_code": latest.get("code"),
                "version_url": f"{args.site}/detail/Version/{latest['id']}",
                "updated_at": stringify_field_value(latest.get("updated_at")),
                "status": status,
                "task": task_name,
                "description": proj_description,
                "artist": artist,
                "asset_kind": kind,
                "asset_path": str(asset_path) if asset_path else None,
            }

            (proj_dir / "final_version.json").write_text(
                json.dumps(final_info, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )

        project_meta["final_version"] = final_info

        (proj_dir / "meta.json").write_text(
            json.dumps(project_meta, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

        index.append(project_meta)

        print(f"[{i}/{len(projects)}] {ptype} / {pname} -> {('OK' if final_info else 'NO_VERSION_WITH_ASSET')}")

    (out_root / "_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] output -> {out_root.resolve()}")


if __name__ == "__main__":
    main()
