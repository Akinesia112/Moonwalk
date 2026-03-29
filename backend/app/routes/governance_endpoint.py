# ── Add this to suggestion.py FOCUS dict ──
# "governance": (
#     "Page focus: Decision Loop — integrate QA results and Supervisor/Client/AI feedback to help the director make the final call."
#     "Focus on: Identifying conflicts, prioritizing revisions (P0 > P1 > P2), drafting actionable final feedback."
#     "Output: Specific bulleted revision instructions for the Artist with numeric values."
# ),


# ── Add this route to suggestion.py ──
@router.post("/chat/governance")
async def chat_governance(req: BriefChatRequest):
    """Decision Loop — integrates QA feedback + 3-party opinions with Claude vision."""
    image_blocks = _build_ref_image_blocks(req.all_refs_context or [])
    focus = (
        "Page focus: Decision Loop — integrate QA analysis results and Supervisor/Client/AI three-party feedback to help the director make the final call."
        "Focus on: Identifying conflicts, prioritizing revisions (P0 Critical > P1 Important > P2 Suggested), and drafting actionable final feedback."
        "Output: Specific bulleted revision instructions that can be sent directly to the Artist, with numeric values."
    )
    if image_blocks:
        ref_meta = []
        for i, r in enumerate(req.all_refs_context or []):
            title = r.get("title", "untitled")
            cat = r.get("category", "")
            note = r.get("note", "").strip()
            label = "Main" if r.get("is_pinned") or r.get("priority") in ("main", "Main") else "Secondary"
            ref_meta.append(f"[{i+1}] {title} | {cat} | {label}" + (f" | note: {note}" if note else ""))
        meta_text = "Reference list:\n" + "\n".join(ref_meta)
        extra = _context_str(req)
        sys_vision = (
            "You are a senior VFX consultant responsible for the Decision Loop." + focus +
            "You can directly view all reference images. Provide specific analysis based on the actual visual content."
            "Never say 'I cannot see the image'. Describe what you see and provide final decision suggestions directly."
            "Output plain text. Do not use ** or --- markdown. Respond in English."
        )
        user_content = image_blocks + [
            {"type": "text", "text": meta_text + "\n\n" + extra + "\n\nUser question: " + req.message}
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