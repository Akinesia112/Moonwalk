import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin
from dateutil import parser as dtparser

from slugify import slugify
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeoutError

SITE = "https://moonshine.shotgunstudio.com"
PROFILE_DIR = ".pw_profile"
OUT_DIR = Path("shotgrid_export")

# 你要的 Project 欄位（對應 UI Fields 裡看到的名字）
PROJECT_FIELDS = [
    "Art Director", "CG Lead", "CG Sup", "Color", "Comp Sup", "Director",
    "Duration", "End Date", "Favorite", "FPS", "Fx Sup", "PC", "PM",
    "Render Engine", "Render Engine Detail", "Res Height", "Res Width",
    "Scale", "Start Date", "Status", "Tags", "Tank Name", "Unit", "Zulip Stream"
]

# 基本限速（避免被當成攻擊）
SLEEP_BETWEEN_PROJECTS = 0.8
SLEEP_BETWEEN_PAGES = 0.3

def safe_mkdir(p: Path):
    p.mkdir(parents=True, exist_ok=True)

def norm_name(s: str) -> str:
    s = s.strip()
    if not s:
        return "UNKNOWN"
    return slugify(s, lowercase=False, separator="_")[:120]

def html_to_text(el) -> str:
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True))

def get_soup(page) -> BeautifulSoup:
    return BeautifulSoup(page.content(), "lxml")

def ensure_logged_in(page):
    # 如果被導去 login，直接報錯
    if "/user/login" in page.url:
        raise RuntimeError("目前 session 失效，被導回 login。請先跑 login_once.py 重新登入。")

def list_projects(page) -> List[Dict]:
    page.goto(f"{SITE}/projects/", wait_until="domcontentloaded")
    ensure_logged_in(page)
    time.sleep(SLEEP_BETWEEN_PAGES)

    projects = parse_projects_grid(page.content())
    # 去重（保險）
    uniq = {}
    for p in projects:
        uniq[p["project_id"]] = p
    projects = list(uniq.values())

    print(f"[INFO] found projects: {len(projects)}")
    return projects


def extract_project_detail_fields(page) -> Dict[str, str]:
    """
    Project overview / details 頁面，把你列的欄位抓出來。
    實際 DOM 會因站台 layout 不同而變，這裡做「欄位名 -> 旁邊 value」的通用策略：
    - 找到所有看起來像 label 的元素
    - 若 label text 在 PROJECT_FIELDS 中，就抓同列/同區塊的 value
    """
    soup = get_soup(page)
    wanted = set(PROJECT_FIELDS)
    out = {}

    # 常見 pattern：<dt>Label</dt><dd>Value</dd>
    for dt in soup.select("dt"):
        label = html_to_text(dt)
        if label in wanted:
            dd = dt.find_next_sibling("dd")
            if dd:
                out[label] = html_to_text(dd)

    # 另一種常見：label/value 在同一行 div
    if len(out) < 5:
        # 盡量多抓：找任何包含 label 的元素
        for label in PROJECT_FIELDS:
            if label in out:
                continue
            # 找到包含 label 的節點
            node = soup.find(string=re.compile(rf"^{re.escape(label)}$"))
            if not node:
                continue
            el = node.parent
            # 嘗試在同一行/父層找 value
            row = el.find_parent(["tr", "div", "li"]) or el.parent
            if not row:
                continue
            # 取 row 文字，扣掉 label 本身
            text = html_to_text(row)
            val = text.replace(label, "", 1).strip(" :|-")
            if val:
                out[label] = val

    return out

def goto_project_overview(page, project_id: int):
    page.goto(f"{SITE}/page/project_overview?project_id={project_id}", wait_until="domcontentloaded")
    ensure_logged_in(page)
    time.sleep(SLEEP_BETWEEN_PAGES)

def goto_project_versions(page, project_id: int):
    # 有些站台 versions tab 有固定路由，有些靠 UI 點擊。
    # 這裡優先嘗試在 overview 頁面直接點 "Versions" tab。
    # 如果找不到，就 fallback: 直接打 /page/???? (你提供的例子中 /page/25109 可能是 Versions 頁)
    try:
        page.get_by_role("link", name=re.compile("Versions", re.IGNORECASE)).click(timeout=2500)
        page.wait_for_load_state("domcontentloaded")
    except PWTimeoutError:
        # fallback：在當前頁 HTML 內找含 Versions 的 href
        soup = get_soup(page)
        a = soup.select_one('a:contains("Versions")')  # 這個 selector 有些 soup 不支援
        # 如果 fallback 也不行，就讓後面用「從頁面中抓 version 列表」的方式硬找
        pass
    time.sleep(SLEEP_BETWEEN_PAGES)

def parse_projects_grid(html: str):
    """
    回傳 list[dict]:
      {project_id, project_name, project_type, project_overview_url}
    依賴：Projects grid 顯示了 Type 欄位（你截圖已經顯示）
    """
    soup = BeautifulSoup(html, "lxml")

    # 1) 抓 header 欄位順序（display_name 會含 'Type', 'Project Name' 等）
    headers = [h.get_text(strip=True) for h in soup.select(".display_name")]
    # 可能會包含很多 display_name（非 grid header），所以至少確保含 Type / Project Name
    # 這裡用「找到 Type 欄位在 headers 的位置」當 index
    try:
        type_idx = headers.index("Type")
    except ValueError:
        type_idx = None

    projects = []
    # 2) 找到 project overview link（最可靠的 project_id 來源）
    for a in soup.select('a[href*="project_overview?project_id="]'):
        href = a.get("href", "")
        m = re.search(r"project_id=(\d+)", href)
        if not m:
            continue
        pid = int(m.group(1))
        pname = a.get_text(" ", strip=True)
        if not pname:
            continue

        # 3) 從 a 所在的 row 抓同列所有 cell text
        row = a.find_parent(["tr", "div"])
        # ExtJS grid 不一定是 <tr>，所以 row 可能抓不到，這裡做保守 fallback
        row_text = row.get_text(" ", strip=True) if row else ""
        project_type = "UNKNOWN"
        if type_idx is not None and row:
            # 嘗試把 row 內可見 cell texts 拆成欄位序列
            # 這裡是 heuristic：把連續空白壓平後切割
            cells = [c.get_text(" ", strip=True) for c in row.select("td, div.sg_cell, div.x-grid-cell")]
            # 如果 cells 能對齊 headers，才用 index
            if len(cells) > type_idx:
                project_type = cells[type_idx] or "UNKNOWN"
            else:
                # fallback：用 row_text 裡最後一段可能是 Type（不完美，但比空好）
                project_type = "UNKNOWN"
        projects.append({
            "project_id": pid,
            "project_name": pname,
            "project_type": project_type,
            "project_overview_url": urljoin(SITE, href),
        })

    # 去重
    uniq = {}
    for p in projects:
        uniq[p["project_id"]] = p
    return list(uniq.values())


def parse_versions_list(html: str):
    """
    回傳 list[dict]:
      {version_id, version_code, detail_url, updated_dt}
    用 sg_tip 當完整時間
    """
    soup = BeautifulSoup(html, "lxml")
    out = []

    for a in soup.select('a.sg_detail_link[href^="/detail/Version/"]'):
        href = a.get("href", "")
        m = re.search(r"/detail/Version/(\d+)", href)
        if not m:
            continue
        vid = int(m.group(1))
        vcode = a.get_text(" ", strip=True)

        row = a.find_parent(["tr", "div"])
        # 在同 row 找任何帶 sg_tip 的 span（通常就是那個日期）
        tip = None
        if row:
            span = row.select_one("span[sg_tip]")
            if span:
                tip = span.get("sg_tip")

        updated_dt = dtparser.parse(tip) if tip else None
        out.append({
            "version_id": vid,
            "version_code": vcode,
            "detail_url": urljoin(SITE, href),
            "updated_dt": updated_dt,
        })

    # 依 updated_dt 排序（None 放最後）
    out.sort(key=lambda x: (x["updated_dt"] is not None, x["updated_dt"]), reverse=True)
    return out


def pick_latest_version(versions):
    for v in versions:
        if v["updated_dt"] is not None:
            return v
    return versions[0] if versions else None


def parse_versions_from_current_page(page) -> List[Dict]:
    """
    從 Versions 列表頁抓出：
    - version_id（用 #Version_58389 或 /detail/Version/58389 類似）
    - updated_at（如果頁面有顯示）
    - link
    站台 HTML 差異很大，這裡先用「找 Version_####」這條線索（你給的例子有 #Version_58389）。
    """
    soup = get_soup(page)

    versions = []
    # 找任何含 Version_#### 的 href 或 id
    for a in soup.select('a[href*="Version_"]'):
        href = a.get("href", "")
        m = re.search(r"Version_(\d+)", href)
        if not m:
            continue
        vid = int(m.group(1))
        versions.append({"version_id": vid, "url": urljoin(SITE, href)})

    # 去重
    uniq = {}
    for v in versions:
        uniq[v["version_id"]] = v
    return list(uniq.values())

def open_version_anchor(page, project_page_url: str, version_id: int):
    # 你例子：/page/25109#Version_58389
    url = f"{project_page_url}#Version_{version_id}"
    page.goto(url, wait_until="domcontentloaded")
    ensure_logged_in(page)
    time.sleep(SLEEP_BETWEEN_PAGES)

def extract_version_info_and_asset(page) -> Tuple[Dict, Optional[Tuple[str, bytes]], Optional[str]]:

    """
    抓 Artist / Status / Task，並抓 final asset（圖片優先，沒圖抓影片）。
    回傳：
      - version_meta dict
      - (filename, content_bytes) or None
    """
    soup = get_soup(page)
    # ✅ 這裡插入：先抓留言（在抓 asset 前後都可）
    comments = parse_activity_comments(soup)

    # ref time：如果你還沒抓 Version updated time，先用 None
    ref_dt = None
    best_comment = pick_best_comment(comments, ref_dt)
    best_text = best_comment["text"] if best_comment else None

    meta = {}

    # ---- 抓 Artist/Status/Task：用「Label->Value」弱假設
    for key in ["Artist", "Status", "Task"]:
        node = soup.find(string=re.compile(rf"^{key}$", re.IGNORECASE))
        if node:
            row = node.parent.find_parent(["tr", "div", "li"]) or node.parent
            val = html_to_text(row).replace(key, "", 1).strip(" :|-")
            if val:
                meta[key.lower()] = val

    # ---- 找圖片：通常會有 <img> thumbnail 或 media viewer
    img_url = None
    for img in soup.select("img"):
        src = img.get("src") or ""
        if not src:
            continue
        # 過濾 icon/小圖（很粗略）
        if "thumbnail" in src or "image" in src or "media" in src:
            img_url = urljoin(SITE, src)
            break

    if img_url:
        resp = page.request.get(img_url)
        if resp.ok:
            ctype = resp.headers.get("content-type", "")
            ext = "jpg"
            if "png" in ctype:
                ext = "png"
            return meta, (f"final.{ext}", resp.body()), best_text

    # ---- 找影片：<video src> 或 <source src> 或可下載連結
    video_url = None
    video = soup.select_one("video")
    if video and video.get("src"):
        video_url = urljoin(SITE, video["src"])
    if not video_url:
        source = soup.select_one("video source")
        if source and source.get("src"):
            video_url = urljoin(SITE, source["src"])

    # 有些 ShotGrid 影片是透過 link 開播放器，找常見關鍵字
    if not video_url:
        for a in soup.select("a[href]"):
            href = a["href"]
            if any(k in href.lower() for k in ["movie", "video", "download"]):
                video_url = urljoin(SITE, href)
                break

    if video_url:
        resp = page.request.get(video_url)
        if resp.ok:
            ctype = resp.headers.get("content-type", "")
            ext = "mp4"
            if "quicktime" in ctype or "mov" in ctype:
                ext = "mov"
            return meta, (f"final.{ext}", resp.body()), best_text

    return meta, None, best_text

def parse_activity_comments(soup: BeautifulSoup) -> List[Dict]:
    """
    嘗試從 Version detail 頁的 activity/feed 抽留言。
    ShotGrid DOM 版本差異很大，所以用多種 selector 疊加。
    回傳：[{text, ts, has_media_hint}]
    """
    comments = []

    # 一些常見的 feed item 容器 class（不保證）
    candidates = soup.select(
        "div.sg_activity_item, div.activity, div.note, li.note, li.activity, div.sg_note"
    )
    if not candidates:
        # fallback：找所有可能像留言的區塊（保守）
        candidates = soup.select("div, li")

    for node in candidates:
        txt = html_to_text(node)
        if not txt or len(txt) < 5:
            continue

        # 估時間：常見會有 sg_tip / title / datetime
        ts = None
        tnode = node.select_one("[sg_tip]") or node.select_one("time[datetime]") or node.select_one("[title]")
        if tnode:
            raw = tnode.get("sg_tip") or tnode.get("datetime") or tnode.get("title")
            if raw:
                try:
                    ts = dtparser.parse(raw)
                except Exception:
                    ts = None

        # media/attachment hint：留言內有 img/video/link 指向 media/attachment/download
        has_media = False
        for a in node.select("a[href]"):
            href = (a.get("href") or "").lower()
            if any(k in href for k in ["attachment", "download", "media", "thumbnail", "movie", "video"]):
                has_media = True
                break
        if not has_media:
            if node.select_one("img") or node.select_one("video") or node.select_one("source"):
                has_media = True

        comments.append({"text": txt, "ts": ts, "has_media": has_media})

    # 去重（用 text 前 120 字當 key，避免同一段被不同 selector 重覆抓）
    uniq = {}
    for c in comments:
        k = c["text"][:120]
        if k not in uniq or (uniq[k]["has_media"] is False and c["has_media"] is True):
            uniq[k] = c
    return list(uniq.values())


def pick_best_comment(comments: List[Dict], ref_dt: Optional[datetime]) -> Optional[Dict]:
    """
    以 (has_media) + (time proximity) 打分，挑最像「對應 asset」的留言。
    """
    if not comments:
        return None

    best = None
    best_score = -1e18

    for c in comments:
        score = 0.0

        # 1) 直接掛 media/attachment：最強訊號
        if c.get("has_media"):
            score += 100.0

        # 2) 時間距離：越近越好（若 ref_dt 不存在就略過）
        ts = c.get("ts")
        if ref_dt and ts:
            delta = abs((ts - ref_dt).total_seconds())
            # 以 6 小時為尺度衰減（你可調）
            score += 50.0 * (1.0 / (1.0 + delta / (72 * 3600)))

        # 3) 過短的訊息通常不夠描述（輕微懲罰）
        L = len(c.get("text") or "")
        if L < 15:
            score -= 5.0

        if score > best_score:
            best_score = score
            best = c

    return best


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(PROFILE_DIR, headless=True)
        page = ctx.new_page()

        # 1) list projects
        projects = list_projects(page)
        print(f"[INFO] found projects: {len(projects)}")

        results = []

        for i, proj in enumerate(projects, 1):
            pid = proj["project_id"]
            pname = proj["project_name"]

            print(f"\n[{i}/{len(projects)}] Project {pid} {pname}")

            # 2) go project overview
            goto_project_overview(page, pid)
            proj_url = page.url

            # 3) extract project fields
            proj_fields = extract_project_detail_fields(page)

            # 4) determine Type (第一層 folder)
            # 你說以 Type 作為分類依據，但你截圖看到的欄位裡沒有明顯 Type，
            # 所以先用 Status/Tags/或你們自訂欄位含有的 keyword 當 placeholder。
            # ✅ 建議：如果你們真的有 Type 欄位（例如 Project Type），就把它加入 PROJECT_FIELDS
            # 然後這裡用 proj_fields["Project Type"] 取值。
            proj_type = proj.get("project_type") or "UNKNOWN"
            proj_type_folder = norm_name(proj_type)

            proj_name_folder = norm_name(pname)

            out_dir = OUT_DIR / proj_type_folder / proj_name_folder
            safe_mkdir(out_dir)

            # 5) go versions page
            goto_project_versions(page, pid)

            # 先在當前頁抓 versions
            versions = parse_versions_list(page.content())
            latest = pick_latest_version(versions)

            # fallback：如果當前頁抓不到，才去找其他 /page/xxxx 再抓一次
            if not latest:
                soup = get_soup(page)
                candidate_pages = []
                for a in soup.select('a[href^="/page/"]'):
                    href = a.get("href")
                    if href and re.match(r"^/page/\d+$", href):
                        candidate_pages.append(urljoin(SITE, href))
                candidate_pages = list(dict.fromkeys(candidate_pages))[:12]  # 稍微放寬一點

                for u in candidate_pages:
                    page.goto(u, wait_until="domcontentloaded")
                    ensure_logged_in(page)
                    time.sleep(SLEEP_BETWEEN_PAGES)

                    versions = parse_versions_list(page.content())
                    latest = pick_latest_version(versions)
                    if latest:
                        break

            if not latest:
                print("  [WARN] no versions found on web page structure")
                meta = {
                    "project_id": pid,
                    "project_name": pname,
                    "project_url": proj_url,
                    "project_fields": proj_fields,
                    "final_version": None,
                }
                (out_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
                results.append(meta)
                time.sleep(SLEEP_BETWEEN_PROJECTS)
                continue

            latest_vid = latest["version_id"]


            # ✅ 直接進 version detail page，不走 anchor
            page.goto(latest["detail_url"], wait_until="domcontentloaded")
            ensure_logged_in(page)
            time.sleep(SLEEP_BETWEEN_PAGES)

            version_meta, asset, best_text = extract_version_info_and_asset(page)


            final_path = None
            if asset:
                fname, content = asset
                final_path = out_dir / fname
                final_path.write_bytes(content)
                print(f"  [OK] saved asset -> {final_path}")
            else:
                print("  [WARN] no image/video asset found on latest version section")

            meta = {
                "project_id": pid,
                "project_name": pname,
                "project_url": proj_url,
                "project_fields": proj_fields,
                "final_version": {
                    "version_id": latest_vid,
                    "version_url": page.url,
                    "artist": version_meta.get("artist"),
                    "status": version_meta.get("status"),
                    "task": version_meta.get("task"),
                    "description": best_text,
                    "asset_path": str(final_path) if final_path else None,
                },
            }
            (out_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
            results.append(meta)

            time.sleep(SLEEP_BETWEEN_PROJECTS)

        (OUT_DIR / "_index.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        ctx.close()

    print(f"\n[OK] Done. Output -> {OUT_DIR.resolve()}")

if __name__ == "__main__":
    main()
