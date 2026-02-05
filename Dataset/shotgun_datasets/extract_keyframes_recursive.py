#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import os
import shutil
import subprocess
from pathlib import Path
from typing import List


VIDEO_EXTS = {".mov", ".mp4"}


def require_cmd(cmd: str):
    if shutil.which(cmd) is None:
        raise RuntimeError(f"Missing dependency: {cmd}. Please install it and ensure it's on PATH.")


def run(cmd: List[str]) -> None:
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if p.returncode != 0:
        raise RuntimeError(
            "Command failed:\n"
            + " ".join(cmd)
            + "\n\nSTDERR:\n"
            + (p.stderr[-4000:] if p.stderr else "")
        )


def has_keyframes(ffprobe_path: str, video_path: Path) -> bool:
    """
    快速檢查是否能找到任何 keyframe(I-frame)。
    """
    cmd = [
        ffprobe_path,
        "-v", "error",
        "-select_streams", "v:0",
        "-show_frames",
        "-show_entries", "frame=pict_type,key_frame",
        "-of", "csv=p=0",
        str(video_path),
    ]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if p.returncode != 0:
        return False
    # csv lines like: "1,I" or "0,P" ...
    for line in p.stdout.splitlines():
        parts = line.strip().split(",")
        if len(parts) >= 2 and parts[0] == "1":
            return True
    return False


def extract_keyframes(ffmpeg_path: str, video_path: Path, out_dir: Path, overwrite: bool, quality: int):
    """
    用 ffmpeg 把 keyframes(I-frame) 依序輸出：
    -vf "select='eq(pict_type,I)'"：只取 I frame
    -vsync vfr：可變幀率輸出，避免補幀
    -q:v：jpg 品質（2~31，越小品質越好）
    """
    stem = video_path.stem
    # 輸出資料夾：和影片同層，避免跟其他影片混在一起
    # 你如果想「直接丟在同資料夾」也可以，但通常會太亂，所以我建議放子資料夾
    # 若你堅持同資料夾，改 out_dir = video_path.parent
    safe_subdir = out_dir / f"{stem}_keyframes"
    safe_subdir.mkdir(parents=True, exist_ok=True)

    pattern = safe_subdir / f"{stem}_kf_%06d.jpg"

    cmd = [
        ffmpeg_path,
        "-hide_banner",
        "-loglevel", "error",
        "-i", str(video_path),
        "-vf", "select='eq(pict_type,I)'",
        "-vsync", "vfr",
        "-q:v", str(quality),
        str(pattern),
    ]
    if overwrite:
        cmd.insert(1, "-y")
    else:
        cmd.insert(1, "-n")

    run(cmd)


def iter_videos(root: Path) -> List[Path]:
    vids = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS:
            vids.append(p)
    return vids


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Root directory to recursively scan")
    ap.add_argument("--overwrite", action="store_true", help="Overwrite existing jpg outputs")
    ap.add_argument("--quality", type=int, default=2, help="JPG quality for ffmpeg (-q:v). 2 is high quality.")
    ap.add_argument("--ffmpeg", default="ffmpeg", help="Path to ffmpeg executable")
    ap.add_argument("--ffprobe", default="ffprobe", help="Path to ffprobe executable")
    ap.add_argument(
        "--flat",
        action="store_true",
        help="Save JPGs directly in the same folder as the video (no subfolder).",
    )
    args = ap.parse_args()

    require_cmd(args.ffmpeg)
    require_cmd(args.ffprobe)

    root = Path(args.root).expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(str(root))

    videos = iter_videos(root)
    print(f"[INFO] Found {len(videos)} videos under: {root}")

    for i, vp in enumerate(videos, 1):
        out_dir = vp.parent if args.flat else vp.parent
        print(f"[{i}/{len(videos)}] {vp}")

        # 可選：先檢查是否真的有 keyframes
        if not has_keyframes(args.ffprobe, vp):
            print("  [WARN] No keyframes detected (or ffprobe failed). Skipped.")
            continue

        try:
            extract_keyframes(args.ffmpeg, vp, out_dir, args.overwrite, args.quality)
            print("  [OK] Extracted keyframes.")
        except Exception as e:
            print(f"  [ERR] {e}")

    print("[DONE]")


if __name__ == "__main__":
    main()
