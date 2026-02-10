#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from dateutil import parser as dtparser

import shotgun_api3  # pip install shotgun_api3


# ----------------------------
# Config
# ----------------------------

# 你們站內的 status code 可能不同；這裡提供一個「常見」集合。
# 你可以在 ShotGrid Admin -> Status List 查到你們實際 code。
DEFAULT_FINAL_STATUS_CODES = ["fin", "apr"]  # final / approved 常見
DEFAULT_TASK_NAMES = ["Compositing", "Concept"]  # 也可改成你們 Task/Step 命名


@dataclass
class SGConn:
    site: str
    script_name: str
    api_key: str


def connect(conn: SGConn):
    # Script-based authentication（官方推薦用於 pipeline/integration）:contentReference[oaicite:2]{index=2}
    return shotgun_api3.Shotgun(conn.site, script_name=conn.script_name, api_key=conn.api_key)


def parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return dtparser.parse(s)


def classify_project(project_name: str, vfx_regex: str, ad_regex: str) -> str:
    """
    你要的「分視效、廣告」最常見做法：
    - 用 Project 名稱規則（regex）
    - 或改用 Project 上的自訂欄位（例如 sg_project_type）
    這裡先用 regex，最穩也最不侵入資料模型。
    """
    if re.search(vfx_regex, project_name, re.IGNORECASE):
        return "VFX"
    if re.search(ad_regex, project_name, re.IGNORECASE):
        return "AD"
    return "UNKNOWN"


def find_projects(sg, project_name_regex: Optional[str] = None) -> List[Dict[str, Any]]:
    filters = []
    fields = ["id", "name", "sg_status"]
    projects = sg.find("Project", filters, fields)  # API reference :contentReference[oaicite:3]{index=3}
    if project_name_regex:
        rx = re.compile(project_name_regex, re.IGNORECASE)
        projects = [p for p in projects if rx.search(p["name"])]
    return projects


def find_tasks_for_project(
    sg,
    project: Dict[str, Any],
    task_names: List[str],
) -> List[Dict[str, Any]]:
    """
    抓 Project 底下名稱在 task_names 的 Task。
    如果你們不是用 Task.content 命名，而是用 Step/Department，
    可以改成查 Task.step 或 Task.department（依你們 schema）。
    """
    filters = [
        ["project", "is", project],
        ["content", "in", task_names],  # 直接用 Task 名稱比對
    ]
    fields = ["id", "content", "entity", "step", "sg_status_list", "updated_at"]
    return sg.find("Task", filters, fields)


def find_final_versions_for_task(
    sg,
    project: Dict[str, Any],
    task: Dict[str, Any],
    final_status_codes: List[str],
    since: Optional[datetime] = None,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    """
    以 Task 為軸找 Version。
    常見欄位：
    - Version.sg_task (link to Task)
    - Version.entity (link to Shot/Asset)
    - Version.sg_status_list (狀態)
    - Version.created_at / updated_at
    """
    filters = [
        ["project", "is", project],
        ["sg_task", "is", task],
        ["sg_status_list", "in", final_status_codes],
    ]
    if since:
        filters.append(["created_at", "greater_than", since])

    fields = [
        "id",
        "code",
        "entity",
        "sg_task",
        "sg_status_list",
        "created_at",
        "updated_at",
        "user",
        "description",
        "sg_path_to_movie",
        "sg_path_to_frames",
        "sg_uploaded_movie",
    ]

    # 依 created_at 由新到舊，符合「時間線撈定稿」
    versions = sg.find(
        "Version",
        filters,
        fields,
        order=[{"field_name": "created_at", "direction": "desc"}],
        limit=limit,
    )
    return versions


def pick_latest_per_entity_task(versions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    同一個 entity + task 可能有多個 final version：這裡只取最新的那個。
    """
    best: Dict[Tuple[int, int], Dict[str, Any]] = {}
    for v in versions:
        entity = v.get("entity") or {}
        task = v.get("sg_task") or {}
        if not entity or not task:
            continue
        key = (entity["id"], task["id"])
        cur = best.get(key)
        if cur is None or (v.get("created_at") and cur.get("created_at") and v["created_at"] > cur["created_at"]):
            best[key] = v
    return list(best.values())


def flatten_records(project: Dict[str, Any], bucket: str, versions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows = []
    for v in versions:
        entity = v.get("entity") or {}
        task = v.get("sg_task") or {}
        rows.append(
            {
                "bucket": bucket,
                "project_id": project["id"],
                "project_name": project["name"],
                "entity_type": entity.get("type"),
                "entity_id": entity.get("id"),
                "entity_name": entity.get("name"),
                "task_id": task.get("id"),
                "task_name": (v.get("sg_task") or {}).get("name") or "",  # 有些站點 task link 只含 id/type
                "version_id": v.get("id"),
                "version_code": v.get("code"),
                "status": v.get("sg_status_list"),
                "created_at": v.get("created_at"),
                "updated_at": v.get("updated_at"),
                "user": (v.get("user") or {}).get("name"),
                "path_to_movie": v.get("sg_path_to_movie"),
                "path_to_frames": v.get("sg_path_to_frames"),
            }
        )
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", required=True, help="e.g. https://moonshine.shotgunstudio.com")
    ap.add_argument("--script-name", required=True)
    ap.add_argument("--api-key", required=True)

    ap.add_argument("--project-regex", default=None, help="只抓符合 regex 的 projects（可選）")
    ap.add_argument("--vfx-regex", default=r"\b(vfx|film|feature|shot)\b", help="Project name 判定 VFX 的 regex")
    ap.add_argument("--ad-regex", default=r"\b(ad|ads|commercial|cm)\b", help="Project name 判定 AD 的 regex")

    ap.add_argument("--tasks", default=",".join(DEFAULT_TASK_NAMES), help="Task 名稱清單（逗號分隔）")
    ap.add_argument("--final-status", default=",".join(DEFAULT_FINAL_STATUS_CODES), help="final 的 Version 狀態碼（逗號分隔）")
    ap.add_argument("--since", default=None, help="只抓這個時間之後（ISO 8601，例如 2026-01-01）")
    ap.add_argument("--limit", type=int, default=500, help="每個 task 最多抓幾筆 Version")

    ap.add_argument("--out-json", default="final_versions.json")
    ap.add_argument("--out-csv", default="final_versions.csv")
    args = ap.parse_args()

    conn = SGConn(site=args.site, script_name=args.script_name, api_key=args.api_key)
    sg = connect(conn)

    task_names = [t.strip() for t in args.tasks.split(",") if t.strip()]
    final_status = [s.strip() for s in args.final_status.split(",") if s.strip()]
    since_dt = parse_dt(args.since)

    projects = find_projects(sg, args.project_regex)

    all_rows: List[Dict[str, Any]] = []
    all_raw: List[Dict[str, Any]] = []

    for proj in projects:
        bucket = classify_project(proj["name"], args.vfx_regex, args.ad_regex)

        tasks = find_tasks_for_project(sg, proj, task_names)

        for task in tasks:
            versions = find_final_versions_for_task(
                sg,
                proj,
                task,
                final_status_codes=final_status,
                since=since_dt,
                limit=args.limit,
            )
            latest = pick_latest_per_entity_task(versions)

            all_raw.extend(latest)
            all_rows.extend(flatten_records(proj, bucket, latest))

    # Export
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, ensure_ascii=False, default=str, indent=2)

    df = pd.DataFrame(all_rows)
    if not df.empty:
        df = df.sort_values(["bucket", "project_name", "created_at"], ascending=[True, True, False])
    df.to_csv(args.out_csv, index=False, encoding="utf-8-sig")

    print(f"[OK] rows={len(all_rows)} -> {args.out_json}, {args.out_csv}")


if __name__ == "__main__":
    main()
