
# ── Add this to suggestion.py FOCUS dict ──
# "governance": (
#     "頁面重點：Decision Loop — 整合 QA 分析結果、Supervisor/Client/AI 三方意見，協助導演做出最終裁決。"
#     "關注：衝突點識別、優先修改項目（P0 > P1 > P2）、可執行的最終回饋起草。"
#     "輸出：具體、可直接送給 Artist 的條列式修改指示，附數值。"
# ),


# ── Add this route to suggestion.py ──
@router.post("/chat/governance")
async def chat_governance(req: BriefChatRequest):
    """Decision Loop — integrates QA feedback + 3-party opinions with Claude vision."""
    image_blocks = _build_ref_image_blocks(req.all_refs_context or [])
    focus = (
        "頁面重點：Decision Loop — 整合 QA 分析結果、Supervisor/Client/AI 三方意見，協助導演做出最終裁決。"
        "關注：衝突點識別、優先修改項目（P0 緊急 > P1 重要 > P2 建議）、可執行的最終回饋起草。"
        "輸出：具體、可直接送給 Artist 的條列式修改指示，附數值。"
    )
    if image_blocks:
        ref_meta = []
        for i, r in enumerate(req.all_refs_context or []):
            title = r.get("title", "untitled")
            cat = r.get("category", "")
            note = r.get("note", "").strip()
            label = "Main" if r.get("is_pinned") or r.get("priority") in ("main", "Main") else "Secondary"
            ref_meta.append(f"[{i+1}] {title} | {cat} | {label}" + (f" | note: {note}" if note else ""))
        meta_text = "Reference 清單：\n" + "\n".join(ref_meta)
        extra = _context_str(req)
        sys_vision = (
            "你是資深 VFX 顧問，負責 Decision Loop 環節。" + focus +
            "你能直接看到所有 reference 圖片，請根據圖片的實際視覺內容給出具體分析。"
            "絕對不要說「我無法看到圖片」，直接描述你看到的內容並給出最終裁決建議。"
            "輸出純文字，不使用 ** 或 --- markdown，用繁體中文。"
        )
        user_content = image_blocks + [
            {"type": "text", "text": meta_text + "\n\n" + extra + "\n\n用戶問題：" + req.message}
        ]
        reply = await _call_claude(sys_vision, _history_msgs(req) + [{"role": "user", "content": user_content}], max_tokens=1000)
    else:
        reply = await debate_and_synthesize(
            context=_context_str(req),
            user_message=req.message,
            history=_history_msgs(req),
            page_focus=focus,
        )
    return {"response": reply, "reply": reply}
