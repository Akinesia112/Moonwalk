"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Upload, LayoutList, Maximize2, AlertCircle, CheckCircle2, AlertTriangle, Bot, ChevronRight, ChevronDown, ChevronUp, FileCheck, Sparkles, PenTool, MessageSquare, Eraser, Type, MousePointer, ZoomIn, ZoomOut, Circle, Square, Trash2, Undo2, ImageIcon, X, Tag, Plus, Send, Save, BookOpen, User, Loader2 } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefCard, CATEGORY_COLOR, IMPORTANCE_COLOR } from "@/components/ref-card"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import Link from "next/link"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

// Full delete: backend + all sessionStorage keys
async function deleteItem(type: "references" | "artworks", id: string) {
  // 1. Backend
  try { await fetch(`${API}/search/${type}/${encodeURIComponent(id)}`, { method: "DELETE" }) } catch {}

  if (type === "references") {
    // 2. refhub_refs
    try {
      const arr = JSON.parse(sessionStorage.getItem("refhub_refs") || "[]")
      sessionStorage.setItem("refhub_refs", JSON.stringify(arr.filter((r: any) => String(r.id) !== String(id))))
    } catch {}
    // 3. c04_ref_previews
    try {
      const arr = JSON.parse(sessionStorage.getItem("c04_ref_previews") || "[]")
      sessionStorage.setItem("c04_ref_previews", JSON.stringify(arr.filter((r: any) => String(r.id) !== String(id))))
    } catch {}
    // 4. deleted_ref_ids (add so other pages are aware)
    try {
      const ids = JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]")
      if (!ids.includes(String(id))) ids.push(String(id))
      sessionStorage.setItem("deleted_ref_ids", JSON.stringify(ids))
    } catch {}
    // 5. Broadcast to other tabs/pages
    try { window.dispatchEvent(new StorageEvent("storage", { key: "deleted_ref_ids" })) } catch {}
  } else {
    // artwork
    try {
      const arr = JSON.parse(sessionStorage.getItem("c04_artwork_previews") || "[]")
      sessionStorage.setItem("c04_artwork_previews", JSON.stringify(arr.filter((r: any) => String(r.id) !== String(id))))
    } catch {}
  }
}

const PROJECT_ID = "proj_001"

const SS = {
  get: (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v) } catch {} },
}

function stripMd(t: string) {
  return t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
    .replace(/^---+$/gm, "").replace(/^#{1,6} /gm, "").trim()
      {/* Note Dialog */}
      {noteDialogRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNoteDialogRef(null)}>
          <div className="bg-card rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-muted-foreground" />
                {noteDialogRef.name}
              </div>
              <button onClick={() => setNoteDialogRef(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {noteDialogRef.preview && (
                <div className="rounded-lg overflow-hidden border" style={{ aspectRatio: "4/3" }}>
                  <img src={noteDialogRef.preview} alt={noteDialogRef.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {noteDialogRef.category && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[noteDialogRef.category] ?? "bg-muted text-foreground"}`}>
                    {noteDialogRef.category}
                  </span>
                )}
                {noteDialogRef.importance && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${IMPORTANCE_COLOR[noteDialogRef.importance] ?? "bg-muted text-foreground border-border"}`}>
                    {noteDialogRef.importance}
                  </span>
                )}
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm leading-relaxed whitespace-pre-wrap min-h-[60px]">
                {noteDialogRef.note || "(No notes)"}
              </div>
            </div>
          </div>
        </div>
      )}

}

type ArtItem = { id: string; name: string; image: string; refs: { id: string; name: string; image: string; gapSummary?: string; category?: string; importance?: string; note?: string; usage?: string; artworkId?: string }[] }
type CanvasAnn = { type: string; points?: ({x:number;y:number}|null)[]; text?: string; x?: number; y?: number; color: string; fillColor?: string; opacity?: number; lineWidth?: number }
type FeedbackItem = { id: string; text: string; source: string; priority: string; supplement: string; addressed: boolean; aiDraft?: string }
type ChatMsg = { role: string; content: string }

export default function QAPage() {
  // ── Layout ────────────────────────────────────────────────────
  const [leftW, setLeftW] = useState(350)
  const [rightW, setRightW] = useState(300)
  const hDragRef = useRef<{ side: "left"|"right"; startX: number; startW: number } | null>(null)

  const startHDrag = (side: "left"|"right") => (e: React.MouseEvent) => {
    hDragRef.current = { side, startX: e.clientX, startW: side === "left" ? leftW : rightW }
    const move = (ev: MouseEvent) => {
      if (!hDragRef.current) return
      const d = ev.clientX - hDragRef.current.startX
      const nw = Math.max(120, Math.min(700, hDragRef.current.startW + (hDragRef.current.side === "left" ? d : -d)))
      hDragRef.current.side === "left" ? setLeftW(nw) : setRightW(nw)
    }
    const up = () => { hDragRef.current = null; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up)
  }

  // ── State ─────────────────────────────────────────────────────
  const [selectedArtwork, setSelectedArtwork] = useState(0)
  const [expandedArtwork, setExpandedArtwork] = useState<number | null>(0)
  const [selectedRef, setSelectedRef] = useState(0)
  const [showMetricDetailDialog, setShowMetricDetailDialog] = useState(false)
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<{id:string;name:string;status:string;agents:string[];consensus:boolean;refBasis:string;supervisorNote:string|null} | null>(null)
  const [checkedMetrics, setCheckedMetrics] = useState<string[]>([])
  const [showMetrics, setShowMetrics] = useState(true)
  const [analyzingFeedback, setAnalyzingFeedback] = useState(false)
  const [canvasTool, setCanvasTool] = useState("pointer")
  const [brushColor, setBrushColor] = useState("#ef4444")
  const [fillColor, setFillColor] = useState("transparent")
  const [brushOpacity, setBrushOpacity] = useState(1)
  const [brushSize, setBrushSize] = useState(3)
  const [textFontSize, setTextFontSize] = useState(16)
  const [textFont, setTextFont] = useState("sans-serif")
  const [textBold, setTextBold] = useState(false)
  const [textItalic, setTextItalic] = useState(false)
  const [showStrokeDD, setShowStrokeDD] = useState(false)
  const [showFillDD, setShowFillDD] = useState(false)
  const [showSizeDD, setShowSizeDD] = useState(false)
  const [showOpacityDD, setShowOpacityDD] = useState(false)
  const [sortByPriority] = useState(true)
  const [artworkZoom, setArtworkZoom] = useState(100)
  const [refZoom, setRefZoom] = useState(100)
  const [showSpecs, setShowSpecs] = useState(true)
  const [showRefsRow, setShowRefsRow] = useState(false)
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(true)
  const [toneStyle, setToneStyle] = useState("professional")
  const isDrawingRef = useRef(false)  // ref not state — avoids re-render during drawing
  const [textInputPos, setTextInputPos] = useState<{x:number;y:number;cssX:number;cssY:number;panel:"work"|"ref";scale:number}|null>(null)
  const lastEnterRef = useRef<number>(0)  // track double-Enter timing
  const isComposingRef = useRef(false)    // track IME composition state
  const [textInputValue, setTextInputValue] = useState("")
  const [canvasAnnotations, setCanvasAnnotations] = useState<CanvasAnn[]>([])
  const [selectedAnnIdx, setSelectedAnnIdx] = useState<number|null>(null)
  const undoStackRef = useRef<CanvasAnn[][]>([])
  const [refAnnotations, setRefAnnotations] = useState<CanvasAnn[]>([])
  const [selectedRefAnnIdx, setSelectedRefAnnIdx] = useState<number|null>(null)
  const [activePanel, setActivePanel] = useState<"work"|"ref">("work")
  const refUndoStackRef = useRef<CanvasAnn[][]>([])
  const globalUndoRef = useRef<{panel:"work"|"ref"; anns:CanvasAnn[]}[]>([])

  const [qaSubmitted, setQaSubmitted] = useState(false)
  const [leftPanelMode, setLeftPanelMode] = useState<"browse" | "expand">("browse")
  const [noteDialogRef, setNoteDialogRef] = useState<{ name: string; note: string; preview?: string; category?: string; importance?: string } | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  // ── Artwork & Refs from sessionStorage ───────────────────────
  const [artworks, setArtworks] = useState<ArtItem[]>([])
  const artworkFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // refhub_refs is the single source of truth — title-dedup so re-uploads replace stale refs
    const deletedIds = new Set<string>()
    try { JSON.parse(SS.get("deleted_ref_ids") || "[]").forEach((id: string) => deletedIds.add(id)) } catch {}

    let labeledRefs: { id: string; name: string; image: string; label: string; category?: string; importance?: string; note?: string; usage?: string; artworkId?: string }[] = []
    try {
      const hr = SS.get("refhub_refs")
      if (hr) {
        const seen = new Set<string>()
        JSON.parse(hr).forEach((r: any) => {
          if (deletedIds.has(r.id)) return
          const img = r.preview || r.file_url || r.thumbnail_url || ""
          if (!img) return
          const key = (r.title || r.id).toLowerCase()
          if (seen.has(key)) return  // title-dedup: newest first wins (refhub writes newest at top)
          seen.add(key)
          const imp = r.importance || (r.is_pinned ? "Main" : (r.category || "Secondary"))
          labeledRefs.push({ id: r.id, name: r.title || r.id, image: img, label: imp, category: r.category || "", importance: imp, note: r.note || "", usage: r.usage || "", artworkId: r.artworkId || "" })
        })
      }
    } catch {}
    // Always overlay base64 previews from c04_ref_previews
    // (refhub_refs may only have /uploads/ server paths which canvas can't load)
    try {
      const ar = SS.get("c04_ref_previews")
      if (ar) {
        const previewMap: Record<string, string> = {}
        JSON.parse(ar).forEach((r: any) => {
          const b64 = r.preview || ""
          if (b64.startsWith("data:")) previewMap[(r.title || r.id).toLowerCase()] = b64
        })
        // Overlay: replace non-base64 images with base64 from c04_ref_previews
        labeledRefs = labeledRefs.map(r => {
          const b64 = previewMap[r.name.toLowerCase()] || previewMap[r.id.toLowerCase()]
          return b64 ? { ...r, image: b64 } : r
        })
        // Also add any refs only in c04_ref_previews (not yet in refhub / not yet synced)
        // Always do this, not just when labeledRefs is empty
        {
          const existingIds = new Set(labeledRefs.map(r => r.id))
          const existingNames = new Set(labeledRefs.map(r => r.name.toLowerCase()))
          const seen = new Set<string>()
          JSON.parse(ar).forEach((r: any) => {
            if (deletedIds.has(r.id)) return
            const img = r.preview || ""
            if (!img.startsWith("data:")) return  // only add if we have base64
            const key = (r.title || r.id).toLowerCase()
            if (seen.has(key)) return
            seen.add(key)
            // Skip if already loaded (by id or name)
            if (existingIds.has(r.id) || existingNames.has(key)) return
            labeledRefs.push({ id: r.id, name: r.title || r.id, image: img, label: r.importance || r.label || "Secondary", category: r.category || "", importance: r.importance || r.label || "Secondary", note: r.note || "", usage: r.usage || "", artworkId: r.artworkId || "" })
          })
        }
      }
    } catch {}

    // Merge compare_report_for_qa ref images (base64) into labeledRefs
    // so QA canvas shows the image even if refhub only has /uploads/ URL
    try {
      const cmpRaw = SS.get("compare_report_for_qa")
      if (cmpRaw) {
        const cmp = JSON.parse(cmpRaw)
        const cmpRefs: any[] = [
          ...(Array.isArray(cmp.allRefs) ? cmp.allRefs : []),
          ...(cmp.reference ? [cmp.reference] : []),
        ]
        cmpRefs.forEach(cr => {
          if (!cr?.id || !cr?.image) return
          const idx = labeledRefs.findIndex(r => r.id === cr.id)
          if (idx >= 0 && !labeledRefs[idx].image?.startsWith("data:")) {
            labeledRefs[idx] = { ...labeledRefs[idx], image: cr.image }
          } else if (idx < 0 && cr.image?.startsWith("data:")) {
            labeledRefs.push({ id: cr.id, name: cr.name || cr.id, image: cr.image, label: "Secondary", category: "", importance: "Secondary", note: "", usage: "", artworkId: "" })
          }
        })
      }
    } catch {}

    try {
      const aw = SS.get("c04_artwork_previews")
      if (aw) {
        const parsed: { id: string; preview: string; name: string }[] = JSON.parse(aw)
        if (parsed.length > 0) {

          // ── Read compare_report_for_qa: artwork→ref pairings from compare page ──
          // Structure: { allArtworks: [{id,name,image}], allRefs: [{id,name,image}], artwork, reference }
          // We use this to assign each artwork its OWN specific ref list based on the pairing.
          let artworkRefMap: Record<string, string[]> = {}  // artworkId → [refId, ...]
          try {
            const cmp = SS.get("compare_report_for_qa")
            if (cmp) {
              const report = JSON.parse(cmp)
              // If a specific artwork→ref pairing exists, record it
              if (report.artwork?.id && report.reference?.id) {
                artworkRefMap[report.artwork.id] = [report.reference.id]
              }
              // Also check allArtworks/allRefs for broader pairings
              if (Array.isArray(report.allArtworks) && Array.isArray(report.allRefs)) {
                report.allArtworks.forEach((art: any, idx: number) => {
                  if (!artworkRefMap[art.id]) {
                    // Assign ref by same index if available, else use all refs
                    const paired = report.allRefs[idx]
                    if (paired) artworkRefMap[art.id] = [paired.id]
                  }
                })
              }
            }
          } catch {}

          // ── Assign refs to each artwork ──
          // Priority order for each artwork's ref list:
          // 1. Refs explicitly paired in compare_report_for_qa
          // 2. Refs filtered by category matching artwork usage (e.g. Main first, then by type)
          // Each artwork gets its OWN independent copy sorted by importance
          const allSorted = [...labeledRefs].sort((a, b) =>
            (a.importance === "Main" || a.label === "Main" ? -1 : b.importance === "Main" || b.label === "Main" ? 1 : 0))

          // All artwork ids that exist in current session
          const allArtworkIds = new Set(parsed.map(p => p.id))

          const artworkItems = parsed.map(p => {
            // Refs explicitly bound to this artwork
            const boundToThis = allSorted.filter(r => (r as any).artworkId === p.id)

            // Refs with no artworkId — shared across all artworks
            const unbound = allSorted.filter(r => !(r as any).artworkId)

            // Refs bound to an artworkId that no longer exists (stale bind after re-upload)
            // — treat these as unbound so they still show up
            const staleBinding = allSorted.filter(r => {
              const aid = (r as any).artworkId
              return aid && !allArtworkIds.has(aid)
            })

            const refsForThis = [...boundToThis, ...unbound, ...staleBinding]
            // Deduplicate by id
            const seen = new Set<string>()
            const deduped = refsForThis.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })

            return { id: p.id, name: p.name || p.id, image: p.preview, refs: deduped }
          })

          setArtworks(artworkItems)
          return
        }
      }
    } catch {}
    setArtworks([])
  }, [])

  // ── Keyboard Delete for selected annotation ─────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key==="Delete"||e.key==="Backspace") && selectedAnnIdx!==null && document.activeElement?.tagName!=="INPUT" && document.activeElement?.tagName!=="TEXTAREA") {
        undoStackRef.current = [...undoStackRef.current.slice(-20), [...canvasAnnotations]]
        setCanvasAnnotations(p => p.filter((_,i)=>i!==selectedAnnIdx))
        setSelectedAnnIdx(null)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedAnnIdx, canvasAnnotations])

  // ── Canvas annotations persist per artwork-ref ───────────────
  const canvasKey = `qa_canvas_${selectedArtwork}_${selectedRef}`
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
    try { setArtistNote(SS.get("reflection_notes") || "") } catch {}   // artist-reflection understanding notes
    try {
      const note = SS.get("c04_notes") || ""
      setReflectionNote(note)
      // Seed and load notes history
      try {
        const hist: string[] = JSON.parse(SS.get("c04_notes_history") || "[]")
        if (note.trim() && !hist.includes(note)) {
          const updated = [note, ...hist.slice(0, 19)]
          SS.set("c04_notes_history", JSON.stringify(updated))
          setNotesHistory(updated)
        } else {
          setNotesHistory(note.trim() && !hist.includes(note) ? [note, ...hist] : hist.length > 0 ? hist : note ? [note] : [])
        }
      } catch {}
    } catch {}       // upload-analyze creative reflection notes
    try { const b = JSON.parse(SS.get("kickoff_brief") || "{}"); setSupervisorSpec(b.supervisor_spec || "") } catch {}
    // Restore text annotations / labels / specs / chat
    try { const v = SS.get("qa_annotations"); if (v) setAnnotations(JSON.parse(v)) } catch {}
    try { const v = SS.get("qa_labels"); if (v) setLabels(JSON.parse(v)) } catch {}
    try { const v = SS.get("qa_specs"); if (v) setInlineSpecs(JSON.parse(v)) } catch {}
    try { const v = SS.get("qa_chat"); if (v) setChatMessages(JSON.parse(v)) } catch {}

    // Load labels from ref categories (done here not in useState to avoid SSR mismatch)
    try {
      const cats = new Set<string>()
      JSON.parse(sessionStorage.getItem("refhub_refs") || "[]").forEach((r: any) => { if (r.category?.trim()) cats.add(r.category.trim()) })
      JSON.parse(sessionStorage.getItem("c04_ref_previews") || "[]").forEach((r: any) => { if (r.category?.trim()) cats.add(r.category.trim()) })
      const catList = Array.from(cats)
      if (catList.length > 0) setLabels(catList)
    } catch {}

    // Load upload-analyze per-metric results → feedbackItems
    try {
      const raw = SS.get("c04_analysis")
      if (raw) {
        const a = JSON.parse(raw)
        if (Array.isArray(a.metrics) && a.metrics.length > 0) {
          setFeedbackItems(a.metrics.map((m: any) => ({
            id: "c04-" + (m.id || m.name),
            text: "[" + m.name + "] " + (m.agentA?.opinion || m.summary || ""),
            source: "AI", priority: m.status === "red" ? "P0" : m.status === "yellow" ? "P1" : "P2",
            supplement: "", addressed: false,
            aiDraft: m.suggestions?.join("；") || m.agentB?.opinion || "",
          })))
        }
      }
    } catch {}
    // Load compare Delta List → merge into feedbackItems
    try {
      const raw = SS.get("compare_delta_list")
      if (raw) {
        const deltas = JSON.parse(raw)
        if (Array.isArray(deltas) && deltas.length > 0) {
          setFeedbackItems(prev => {
            const existingIds = new Set(prev.map((f: any) => f.id))
            const newItems = deltas
              .filter((d: any) => !existingIds.has("delta-" + (d.id || d.metric)))
              .map((d: any) => ({
                id: "delta-" + (d.id || d.metric),
                text: "[" + (d.metric || d.name) + "] " + (d.gap || d.summary || ""),
                source: "AI", priority: d.severity === "high" ? "P0" : d.severity === "medium" ? "P1" : "P2",
                supplement: "", addressed: false, aiDraft: d.suggestion || d.fix || "",
              }))
            return [...prev, ...newItems]
          })
        }
      }
    } catch {}
    // Live sync: pick up changes made in other tabs/pages without full reload
    const onStorage = (e: StorageEvent) => {
      if (e.key === "reflection_notes") setArtistNote(e.newValue || "")
      if (e.key === "c04_notes") {
        const newNote = e.newValue || ""
        setReflectionNote(newNote)
        if (newNote.trim()) {
          try {
            const hist: string[] = JSON.parse(sessionStorage.getItem("c04_notes_history") || "[]")
            if (!hist.includes(newNote)) {
              const updated = [newNote, ...hist.slice(0, 19)]
              sessionStorage.setItem("c04_notes_history", JSON.stringify(updated))
              setNotesHistory(updated)
            }
          } catch {}
        }
      }
      if (e.key === "c04_notes_history") {
        try {
          const hist: string[] = JSON.parse(e.newValue || "[]")
          setNotesHistory(hist)
        } catch {}
      }
      // Evict stale refs when reference-hub replaces a duplicate upload
      if (e.key === "refhub_refs" || e.key === "deleted_ref_ids") {
        try {
          const deletedIds = new Set<string>(JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]"))
          if (deletedIds.size > 0) {
            setArtworks(prev => prev.map(art => ({
              ...art,
              refs: art.refs.filter(r => !deletedIds.has(r.id))
            })))
          }
          const raw = sessionStorage.getItem("refhub_refs")
          if (!raw) return
          const hubRefs: any[] = JSON.parse(raw)
          setArtworks(prev => prev.map(art => ({
            ...art,
            refs: art.refs.map(r => {
              const hub = hubRefs.find(h => h.id === r.id)
              if (!hub) return r
              return { ...r, image: hub.preview || hub.file_url || hub.thumbnail_url || r.image, note: hub.note || r.note, category: hub.category || r.category }
            })
          })))
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  useEffect(() => {
    // Restore canvas annotations from sessionStorage
    try {
      const saved = sessionStorage.getItem(canvasKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setCanvasAnnotations(parsed)
        else setCanvasAnnotations([])
      } else {
        setCanvasAnnotations([])
      }
    } catch { setCanvasAnnotations([]) }
  }, [canvasKey])
  // pushAnnotation: saves undo snapshot and updates state
  const pushAnnotation = (updater: (prev: CanvasAnn[]) => CanvasAnn[]) => {
    setCanvasAnnotations(prev => {
      undoStackRef.current = [...undoStackRef.current.slice(-20), [...prev]]
      const next = updater(prev)
      // Save immediately without waiting for effect
      try { sessionStorage.setItem(canvasKey, JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Save canvas annotations synchronously on every change
  useEffect(() => {
    if (!hydrated) return
    SS.set(canvasKey, JSON.stringify(canvasAnnotations))
  }, [canvasAnnotations, canvasKey, hydrated])



  // ── Feedback & chat persist ───────────────────────────────────
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [newAnnotationText, setNewAnnotationText] = useState("")
  const [newFeedbackText, setNewFeedbackText] = useState("")
  const [newFeedbackPriority, setNewFeedbackPriority] = useState("P1")
  const [annotations, setAnnotations] = useState<{id:string;text:string;time:string;ai?:boolean}[]>([])
  const [labels, setLabels] = useState<string[]>(["Lighting", "Composition"])
  const [newLabel, setNewLabel] = useState("")
  const [inlineSpecs, setInlineSpecs] = useState<string[]>([])
  const [newSpecText, setNewSpecText] = useState("")
  const [showArtistNotes, setShowArtistNotes] = useState(true)
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const chatScrollRef = useRef<HTMLDivElement>(null)


  useEffect(() => { chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chatMessages])

  // Auto-persist text annotations / labels / specs / chat
  useEffect(() => { if (hydrated) try { SS.set("qa_annotations", JSON.stringify(annotations)) } catch {} }, [annotations, hydrated])
  useEffect(() => { if (hydrated) try { SS.set("qa_labels", JSON.stringify(labels)) } catch {} }, [labels, hydrated])
  useEffect(() => { if (hydrated) try { SS.set("qa_specs", JSON.stringify(inlineSpecs)) } catch {} }, [inlineSpecs, hydrated])
  useEffect(() => { if (hydrated) try { SS.set("qa_chat", JSON.stringify(chatMessages)) } catch {} }, [chatMessages, hydrated])

  // Artist notes from sessionStorage
  // artistNote     = understanding notes  from artist-reflection  (key: "reflection_notes")
  // reflectionNote = creative reflection notes from upload-analyze (key: "c04_notes")
  const [artistNote, setArtistNote] = useState("")
  const [reflectionNote, setReflectionNote] = useState("")
  const [supervisorSpec, setSupervisorSpec] = useState("")
  const [notesHistory, setNotesHistory] = useState<string[]>([])

  // ── Brief/Specs ───────────────────────────────────────────────
  const BRIEF_LABELS: Record<string, string> = {
    project_name: "Project Name", client: "Client", director: "Director/Creative Director & Supervisor",
    confidentiality: "Confidentiality Level", selling_points: "Key Selling Points", keywords: "Emotional Keywords",
    restrictions: "Restrictions / Taboos", style: "Style Keywords", mood: "Color Tone / Atmosphere",
    worldview: "World Concept", supervisor_spec: "Supervisor Spec",
  }

  const directorSpecs = (() => {
    try {
      const b = JSON.parse(SS.get("kickoff_brief") || "{}")
      const EXCLUDE = new Set(["supervisor"])   // merged into director field
      const items = Object.entries(b)
        .filter(([k, v]) => !EXCLUDE.has(k) && v && String(v).trim() && BRIEF_LABELS[k])
        .map(([k, v]) => `${BRIEF_LABELS[k]}：${v}`)
      return { items, technical: [], priorities: [] }
    } catch {
      return { items: [], technical: [], priorities: [] }
    }
  })()

  const currentArt = artworks[selectedArtwork]
  const currentRef = currentArt?.refs[selectedRef]
  // Resolve best available ref image (base64 > server URL)
  const resolvedRefImage = React.useMemo(() => {
    if (!currentRef) return ""
    const img = currentRef.image || ""
    if (img.startsWith("data:")) return img
    // Try c04_ref_previews for base64
    try {
      const ar = SS.get("c04_ref_previews")
      if (ar) {
        const previews: any[] = JSON.parse(ar)
        const match = previews.find(p =>
          p.id === currentRef.id ||
          (p.title || "").toLowerCase() === currentRef.name.toLowerCase()
        )
        if (match?.preview?.startsWith("data:")) return match.preview
      }
    } catch {}
    // Try refhub_refs
    try {
      const hr = SS.get("refhub_refs")
      if (hr) {
        const refs: any[] = JSON.parse(hr)
        const match = refs.find(r =>
          r.id === currentRef.id ||
          (r.title || "").toLowerCase() === currentRef.name.toLowerCase()
        )
        const b64 = match?.preview || ""
        if (b64.startsWith("data:")) return b64
      }
    } catch {}
    return img  // fallback to whatever URL we have
  }, [currentRef?.id, currentRef?.name, currentRef?.image])

  // ── Metrics — dynamic from c04_analysis, fallback to static ────
  type MetricItem = { id:string; name:string; status:string; agents:string[]; consensus:boolean; refBasis:string; supervisorNote:string|null }
  type MetricDetail = { analysis: string; suggestions: string[]; agentOpinions: { agent: string; opinion: string; confidence: number }[]; debate?: { agentA: {name:string;opinion:string;severity:string}; agentB: {name:string;opinion:string;severity:string}; consensus: string } }
  const STATIC_METRICS: MetricItem[] = [
    { id:"composition", name:"Composition", status:"red", agents:["Composition_J","Composition_K"], consensus:false, refBasis:"Reference #2", supervisorNote:"Consider asymmetric composition" },
    { id:"lighting", name:"Lighting", status:"yellow", agents:["Light_J","Light_K"], consensus:true, refBasis:"Reference #1", supervisorNote:"Fine-tune fill light intensity" },
    { id:"color", name:"Color", status:"green", agents:["Color_J","Color_K"], consensus:true, refBasis:"Spec", supervisorNote:null },
    { id:"texture", name:"Texture", status:"green", agents:["Texture_J","Texture_K"], consensus:true, refBasis:"Reference #3", supervisorNote:null },
    { id:"motion", name:"Motion", status:"yellow", agents:["Motion_J","Motion_K"], consensus:false, refBasis:"Spec", supervisorNote:"Confirm blur level" },
    { id:"depth", name:"Depth of Field", status:"green", agents:["Depth_J","Depth_K"], consensus:true, refBasis:"Spec", supervisorNote:null },
    { id:"exposure", name:"Exposure", status:"red", agents:["Exposure_J","Exposure_K"], consensus:true, refBasis:"Reference #1", supervisorNote:"Fix first" },
    { id:"style", name:"Style", status:"green", agents:["Style_J","Style_K"], consensus:true, refBasis:"Spec", supervisorNote:null },
  ]
  const STATIC_DETAILS: Record<string, MetricDetail> = {
    composition: { analysis:"Composition center shifted left 15%", suggestions:["Shift subject right 10–15%","Adjust negative space","Refer to Ref #2"], agentOpinions:[{agent:"Composition_J",opinion:"Does not follow rule of thirds",confidence:85},{agent:"Composition_K",opinion:"Edge case for motion composition",confidence:72}], debate:{agentA:{name:"Composition_J",opinion:"Shifted left",severity:"high"},agentB:{name:"Composition_K",opinion:"Motion composition acceptable",severity:"medium"},consensus:"Whether to strictly follow the rule of thirds"} },
    lighting: { analysis:"Insufficient fill light, shadows too heavy", suggestions:["Increase left fill light +20%","Color temperature 4800K"], agentOpinions:[{agent:"Light_J",opinion:"Too dark",confidence:88},{agent:"Light_K",opinion:"Color temperature slightly off",confidence:82}] },
    exposure: { analysis:"Highlights overexposed, clipping 8%", suggestions:["Exposure -0.5 stops","Gradient filter"], agentOpinions:[{agent:"Exposure_J",opinion:"Overexposed",confidence:95},{agent:"Exposure_K",opinion:"Highlight clipping",confidence:93}] },
  }
  const [c04Metrics, setC04Metrics] = useState<MetricItem[]>([])
  const [c04Details, setC04Details] = useState<Record<string, MetricDetail>>({})
  useEffect(() => {
    try {
      const raw = SS.get("c04_analysis"); if (!raw) return
      const a = JSON.parse(raw)
      if (!Array.isArray(a.metrics) || a.metrics.length === 0) return
      const items: MetricItem[] = a.metrics.map((m: any) => ({
        id: m.id || m.name, name: m.name,
        status: m.status || (m.score >= 80 ? "green" : m.score >= 50 ? "yellow" : "red"),
        agents: [m.agentA?.name || "Agent A", m.agentB?.name || "Agent B"],
        consensus: m.consensus !== false, refBasis: m.refBasis || "Spec", supervisorNote: m.supervisorNote || null,
      }))
      const details: Record<string, MetricDetail> = {}
      a.metrics.forEach((m: any) => {
        const key = m.id || m.name
        // Store by both id and Chinese name for robust lookup from dialog
        const entry = {
          analysis: m.agentA?.opinion || m.summary || "",
          suggestions: m.suggestions || [],
          agentOpinions: [
            { agent: m.agentA?.name || "Agent A", opinion: m.agentA?.opinion || "", confidence: m.agentA?.confidence || 80 },
            { agent: m.agentB?.name || "Agent B", opinion: m.agentB?.opinion || "", confidence: m.agentB?.confidence || 75 },
          ],
          // Map from upload-analyze format: debate.positionA/B/conclusion
          debate: m.debate ? {
            agentA: { name: m.agentA?.name || "Agent A", opinion: m.debate.positionA || m.agentA?.opinion || "", severity: m.agentA?.score < 50 ? "high" : "medium" },
            agentB: { name: m.agentB?.name || "Agent B", opinion: m.debate.positionB || m.agentB?.opinion || "", severity: m.agentB?.score < 50 ? "high" : "medium" },
            consensus: m.debate.conclusion || "",
          } : (m.agentA?.opinion && m.agentB?.opinion ? {
            agentA: { name: m.agentA.name || "Agent A", opinion: m.agentA.opinion, severity: "medium" },
            agentB: { name: m.agentB.name || "Agent B", opinion: m.agentB.opinion, severity: "medium" },
            consensus: "",
          } : undefined),
        }
        details[key] = entry          // by id (e.g. "light")
        if (m.name) details[m.name] = entry   // by Chinese name (e.g. "Lighting")
      })
      setC04Metrics(items); setC04Details(details)
    } catch {}
  }, [hydrated])
  const metrics = c04Metrics.length > 0 ? c04Metrics : STATIC_METRICS
  const metricDetails = Object.keys(c04Details).length > 0 ? c04Details : STATIC_DETAILS

  const getStatusIcon = (s: string) => s==="red" ? <AlertCircle className="w-4 h-4 text-red-500"/> : s==="yellow" ? <AlertTriangle className="w-4 h-4 text-amber-500"/> : <CheckCircle2 className="w-4 h-4 text-green-500"/>
  const getStatusBg = (s: string) => s==="red" ? "bg-red-500/10 border-red-500/30" : s==="yellow" ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"
  const isMetricMentioned = (id: string) => ["composition","lighting","color","exposure"].includes(id)

  // ── Agent chat ────────────────────────────────────────────────
  const callAgent = useCallback(async (msg: string) => {
    setChatLoading(true)

    // Build rich context so multi-agents understand full artist intent
    const ctxParts = [
      `Artwork: ${currentArt?.name || "(not selected)"}`,
      `Reference: ${currentRef?.name || "(not selected)"}`,
    ]
    if (artistNote?.trim())
      ctxParts.push(`Understanding Notes (Artist Reflection):\n${artistNote.trim()}`)
    if (reflectionNote?.trim())
      ctxParts.push(`Creative Reflection Notes (Upload Analyze):\n${reflectionNote.trim()}`)
    if (supervisorSpec?.trim())
      ctxParts.push(`Supervisor Spec：\n${supervisorSpec.trim()}`)
    const ctx = ctxParts.join("\n\n")

    try {
      const res = await fetch(`${API}/suggestion/chat/analysis`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          message: msg,
          context: ctx,
          history: chatMessages.slice(-6).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        }),
      })
      const data = await res.json()
      setChatMessages(p => [...p, { role: "ai", content: stripMd(data.response || data.reply || "Sorry, unable to respond.") }])
    } catch {
      setChatMessages(p => [...p, { role: "ai", content: "Connection failed. Please confirm the backend." }])
    }
    setChatLoading(false)
  }, [currentArt, currentRef, chatMessages, artistNote, reflectionNote, supervisorSpec])

  // ── AI-generated annotation & spec suggestions ────────────────
  const [suggestedAnnotations, setSuggestedAnnotations] = useState<string[]>([])
  const [suggestedSpecs, setSuggestedSpecs] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestedLabels, setSuggestedLabels] = useState<string[]>([])
  useEffect(() => {
    if (!currentArt?.name || !currentRef?.name) return
    setSuggestedAnnotations([]); setSuggestedSpecs([]); setSuggestedLabels([])
    setLoadingSuggestions(true)
    // Build context from analysis results and feedback so agents can generate targeted suggestions
    const analysisCtx = (() => {
      try {
        const a = JSON.parse(sessionStorage.getItem("c04_analysis") || "{}")
        if (!Array.isArray(a.metrics)) return ""
        return a.metrics.filter((m: any) => m.status !== "green")
          .map((m: any) => m.name + "：" + (m.agentA?.opinion || "")).join("\n")
      } catch { return "" }
    })()
    const ctx = ["Artwork: " + currentArt.name, "Reference: " + currentRef.name, analysisCtx ? "AI Analysis:\n" + analysisCtx : ""].filter(Boolean).join("\n")
    const prompt = "Based on artwork '" + currentArt.name + "' and Reference '" + currentRef.name + "' VFX gap analysis, generate in English:\n1. 3 specific frame annotations (10-20 words indicating specific location + issue)\n2. 3 Supervisor Spec rules (10-20 words, e.g. 'Key light must come from the right at 45°')\n3. 3 Label tags (most relevant from Lighting/Color/Composition/Style/Texture/Motion/Mood/VFX)\nReturn JSON only, format: {\"annotations\":[\"...\"],\"specs\":[\"...\"],\"labels\":[\"...\"]}"
    fetch(API + "/suggestion/chat/analysis", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: PROJECT_ID, message: prompt, context: ctx }),
    })
      .then(r => r.json())
      .then(data => {
        const raw = (data.response || data.reply || "").replace(/```json|```/g, "").trim()
        const match = raw.match(/\{[\s\S]*\}/)
        if (match) {
          try {
            const parsed = JSON.parse(match[0])
            if (Array.isArray(parsed.annotations)) setSuggestedAnnotations(parsed.annotations.slice(0, 3))
            if (Array.isArray(parsed.specs)) setSuggestedSpecs(parsed.specs.slice(0, 3))
            if (Array.isArray(parsed.labels)) setSuggestedLabels(parsed.labels.filter((l: string) => !labels.includes(l)).slice(0, 3))
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false))
  }, [currentArt?.id, currentRef?.id])

  const handleMetricCheck = (metricId: string, checked: boolean) => {
    if (checked) {
      setCheckedMetrics(p => [...p, metricId])
      const metric = metrics.find(m => m.id === metricId)
      const detail = metric ? (metricDetails[metricId] || metricDetails[metric.name]) : null
      if (metric && detail) {
        setFeedbackItems(p => [...p, { id:"metric-"+Date.now(), text:"["+metric.name+"] "+detail.analysis+(detail.suggestions.length?". Suggestions: "+detail.suggestions.join(", "):""), source:"AI", priority: metric.status==="red"?"P0":metric.status==="yellow"?"P1":"P2", supplement:"", addressed:false }])
      }
      if (metric) {
        // Build full context: analysis + Agent A/B opinions + Debate
        const parts: string[] = ["[Checked Metric] " + metric.name + " (" + (metric.status==="red"?"Red":metric.status==="yellow"?"Yellow":"Green") + ") - " + metric.refBasis]
        if (detail?.agentOpinions?.[0]?.opinion) parts.push("Agent A（" + detail.agentOpinions[0].agent + "）：" + detail.agentOpinions[0].opinion)
        if (detail?.agentOpinions?.[1]?.opinion) parts.push("Agent B（" + detail.agentOpinions[1].agent + "）：" + detail.agentOpinions[1].opinion)
        if (detail?.debate?.consensus) parts.push("Debate Conclusion: " + detail.debate.consensus)
        if (detail?.analysis) parts.push("Analysis: " + detail.analysis)
        const msg = parts.join("\n")
        setChatMessages(p => [...p, { role:"user", content: msg }])
        callAgent("For '" + metric.name + "' metric, provide specific improvement suggestions based on the following Agent Debate:\n" + msg)
      }
    } else {
      setCheckedMetrics(p => p.filter(id => id !== metricId))
    }
  }

  const handleChatSend = () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatMessages(p => [...p, { role:"user", content: msg }])
    setChatInput("")
    callAgent(msg)
  }

  const handleAnalyzeFeedback = () => {
    setAnalyzingFeedback(true)
    const msg = `Please analyze the following ${feedbackItems.length} feedback items and provide prioritized action suggestions:\n${feedbackItems.map(f => `[${f.priority}] ${f.text}`).join("\n")}`
    setChatMessages(p => [...p, { role:"user", content:"[AI Feedback Analysis]" }])
    callAgent(msg).finally(() => setAnalyzingFeedback(false))
  }

  const toggleAddressed = (id: string) => setFeedbackItems(p => p.map(f => f.id===id ? {...f, addressed:!f.addressed} : f))

  const sortedFeedback = [...feedbackItems].sort((a,b) => {
    if (sortByPriority) { const o: Record<string,number> = {P0:0,P1:1,P2:2}; const d = (o[a.priority]??3)-(o[b.priority]??3); if (d!==0) return d }
    return a.addressed !== b.addressed ? (a.addressed ? 1 : -1) : 0
  })

  // ── Canvas ────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const refCanvasRef = useRef<HTMLCanvasElement>(null)
  const refCanvasContainerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef<{x:number;y:number}[]>([])
  const shapeStartRef = useRef<{x:number;y:number}|null>(null)

  // ── Canvas: transparent overlay on artwork only ──────────────────
  // Pattern: <img> shows artwork normally; <canvas> sits on top (pointer-events:auto)
  // redrawCanvas draws ONLY annotations (transparent bg). Save merges both.

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)   // keep transparent — img shows through

    canvasAnnotations.forEach((ann, idx) => {
      const lw = ann.lineWidth ?? 3; const op = ann.opacity ?? 1
      ctx.save(); ctx.globalAlpha = op; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round"

      if (ann.type === "brush" && ann.points && ann.points.length > 1) {
        ctx.strokeStyle = ann.color; ctx.beginPath()
        const pts = ann.points.filter(Boolean) as {x:number;y:number}[]
        ctx.moveTo(pts[0].x, pts[0].y); for (let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke()
      } else if (ann.type === "eraser" && ann.points) {
        ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = lw * 2
        const pts = ann.points.filter(Boolean) as {x:number;y:number}[]
        if (pts.length > 1) { ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke() }
        ctx.globalCompositeOperation = "source-over"
      } else if (ann.type === "text" && ann.text && ann.x != null && ann.y != null) {
        const fs = (ann as any).fontSize ?? 16
        const font = (ann as any).font ?? "sans-serif"
        const bold = (ann as any).bold ? "bold " : ""
        const italic = (ann as any).italic ? "italic " : ""
        ctx.font = `${bold}${italic}${fs}px ${font}`
        ctx.textBaseline = "top"   // y is TOP of text, consistent with textInput position
        const m = ctx.measureText(ann.text)
        const pad = 6
        // White bg
        ctx.save(); ctx.globalAlpha = 0.88; ctx.fillStyle = "#ffffff"
        ctx.fillRect(ann.x - pad, ann.y - pad, m.width + pad*2, fs + pad*2); ctx.restore()
        ctx.save(); ctx.strokeStyle = "#aaaaaa"; ctx.lineWidth = 1
        ctx.strokeRect(ann.x - pad, ann.y - pad, m.width + pad*2, fs + pad*2); ctx.restore()
        ctx.fillStyle = ann.color
        ctx.fillText(ann.text, ann.x, ann.y)
        ctx.textBaseline = "alphabetic"  // reset
      } else if (ann.type === "circle" && ann.points) {
        const pts = ann.points.filter(Boolean) as {x:number;y:number}[]
        if (pts.length >= 2) {
          const dx=pts[1].x-pts[0].x, dy=pts[1].y-pts[0].y, r=Math.sqrt(dx*dx+dy*dy)
          if (r > 0) {
            ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, r, 0, 2*Math.PI)
            if (ann.fillColor && ann.fillColor !== "transparent") { ctx.fillStyle = ann.fillColor; ctx.fill() }
            ctx.strokeStyle = ann.color; ctx.stroke()
          }
        }
      } else if (ann.type === "rect" && ann.points) {
        const pts = ann.points.filter(Boolean) as {x:number;y:number}[]
        if (pts.length >= 2) {
          const x=Math.min(pts[0].x,pts[1].x), y=Math.min(pts[0].y,pts[1].y)
          const w=Math.abs(pts[1].x-pts[0].x), h=Math.abs(pts[1].y-pts[0].y)
          if (w > 0 && h > 0) {
            ctx.beginPath(); ctx.rect(x, y, w, h)
            if (ann.fillColor && ann.fillColor !== "transparent") { ctx.fillStyle = ann.fillColor; ctx.fill() }
            ctx.strokeStyle = ann.color; ctx.stroke()
          }
        }
      }

      // Selection highlight
      if (idx === selectedAnnIdx) {
        ctx.save(); ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2; ctx.setLineDash([4,3]); ctx.globalAlpha = 0.9
        if (ann.type === "text" && ann.x != null && ann.y != null) {
          const fs = (ann as any).fontSize ?? 16; const fnt = (ann as any).font ?? "sans-serif"
          ctx.font = `${fs}px ${fnt}`; ctx.textBaseline = "top"
          const mw = ctx.measureText(ann.text??"").width
          const pad = 6
          ctx.strokeRect(ann.x - pad, ann.y - pad, mw + pad*2, fs + pad*2)
          ctx.textBaseline = "alphabetic"
        } else if ((ann.type === "circle" || ann.type === "rect") && ann.points) {
          const spts = ann.points.filter(Boolean) as {x:number;y:number}[]
          if (spts.length >= 2) { ctx.strokeRect(Math.min(spts[0].x,spts[1].x)-6, Math.min(spts[0].y,spts[1].y)-6, Math.abs(spts[1].x-spts[0].x)+12, Math.abs(spts[1].y-spts[0].y)+12) }
        } else if (ann.type === "brush" && ann.points) {
          const bpts = ann.points.filter(Boolean) as {x:number;y:number}[]
          if (bpts.length > 0) { const xs=bpts.map(p=>p.x), ys=bpts.map(p=>p.y); ctx.strokeRect(Math.min(...xs)-6,Math.min(...ys)-6,Math.max(...xs)-Math.min(...xs)+12,Math.max(...ys)-Math.min(...ys)+12) }
        }
        ctx.restore()
      }
      ctx.restore()
    })
  }, [canvasAnnotations, selectedAnnIdx])

  useEffect(() => { redrawCanvas() }, [canvasAnnotations, selectedAnnIdx, redrawCanvas])

  const redrawRefCanvas = useCallback(() => {
    const canvas = refCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext("2d"); if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    refAnnotations.forEach((ann, idx) => {
      const lw = ann.lineWidth ?? 3; const op = ann.opacity ?? 1
      ctx.save(); ctx.globalAlpha = op; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round"
      if (ann.type === "brush" && ann.points && ann.points.length > 1) {
        ctx.strokeStyle = ann.color; ctx.beginPath()
        const pts = ann.points.filter(Boolean) as {x:number;y:number}[]
        ctx.moveTo(pts[0].x, pts[0].y); for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke()
      } else if (ann.type === "eraser" && ann.points) {
        ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = lw * 2
        const pts = ann.points.filter(Boolean) as {x:number;y:number}[]
        if (pts.length > 1) { ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke() }
        ctx.globalCompositeOperation = "source-over"
      } else if (ann.type === "text" && ann.text && ann.x != null && ann.y != null) {
        const fs = (ann as any).fontSize ?? 16; const font = (ann as any).font ?? "sans-serif"
        const bold = (ann as any).bold ? "bold " : ""; const italic = (ann as any).italic ? "italic " : ""
        ctx.font = `${bold}${italic}${fs}px ${font}`; ctx.textBaseline = "top"
        const m = ctx.measureText(ann.text); const pad = 6
        ctx.save(); ctx.globalAlpha = 0.88; ctx.fillStyle = "#ffffff"; ctx.fillRect(ann.x-pad, ann.y-pad, m.width+pad*2, fs+pad*2); ctx.restore()
        ctx.save(); ctx.strokeStyle = "#aaaaaa"; ctx.lineWidth = 1; ctx.strokeRect(ann.x-pad, ann.y-pad, m.width+pad*2, fs+pad*2); ctx.restore()
        ctx.fillStyle = ann.color; ctx.fillText(ann.text, ann.x, ann.y); ctx.textBaseline = "alphabetic"
      } else if (ann.type === "circle" && ann.points) {
        const pts = ann.points.filter(Boolean) as {x:number;y:number}[]
        if (pts.length >= 2) { const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y,r=Math.sqrt(dx*dx+dy*dy); if(r>0){ctx.beginPath();ctx.arc(pts[0].x,pts[0].y,r,0,2*Math.PI);if(ann.fillColor&&ann.fillColor!=="transparent"){ctx.fillStyle=ann.fillColor;ctx.fill()};ctx.strokeStyle=ann.color;ctx.stroke()} }
      } else if (ann.type === "rect" && ann.points) {
        const pts = ann.points.filter(Boolean) as {x:number;y:number}[]
        if (pts.length >= 2) { const x=Math.min(pts[0].x,pts[1].x),y=Math.min(pts[0].y,pts[1].y),w=Math.abs(pts[1].x-pts[0].x),h=Math.abs(pts[1].y-pts[0].y); if(w>0&&h>0){ctx.beginPath();ctx.rect(x,y,w,h);if(ann.fillColor&&ann.fillColor!=="transparent"){ctx.fillStyle=ann.fillColor;ctx.fill()};ctx.strokeStyle=ann.color;ctx.stroke()} }
      }
      if (idx === selectedRefAnnIdx) {
        ctx.save(); ctx.strokeStyle="#7c3aed"; ctx.lineWidth=2; ctx.setLineDash([4,3]); ctx.globalAlpha=0.9
        if(ann.type==="text"&&ann.x!=null&&ann.y!=null){const fs=(ann as any).fontSize??16;ctx.font=`${fs}px sans-serif`;const mw=ctx.measureText(ann.text??"").width;ctx.strokeRect(ann.x-6,ann.y-fs*1.2,mw+12,fs*1.2+6)}
        else if((ann.type==="circle"||ann.type==="rect")&&ann.points){const spts=ann.points.filter(Boolean) as {x:number;y:number}[];if(spts.length>=2){ctx.strokeRect(Math.min(spts[0].x,spts[1].x)-6,Math.min(spts[0].y,spts[1].y)-6,Math.abs(spts[1].x-spts[0].x)+12,Math.abs(spts[1].y-spts[0].y)+12)}}
        ctx.restore()
      }
      ctx.restore()
    })
  }, [refAnnotations, selectedRefAnnIdx])
  useEffect(() => { redrawRefCanvas() }, [refAnnotations, selectedRefAnnIdx, redrawRefCanvas])

  // Annotation store keys + derived IDs
  const annotationStoreKey = (id: string) => `qa_canvas_ann__${id}`
  const refAnnotationStoreKey = (id: string) => `qa_ref_ann__${id}`
  const currentArtId = artworks[selectedArtwork]?.id || ""
  const currentRefId = currentArt?.refs[selectedRef]?.id || ""

  useEffect(() => {
    // Load saved annotations for this artwork
    if (!currentArtId) return
    try {
      const saved = sessionStorage.getItem(annotationStoreKey(currentArtId))
      setCanvasAnnotations(saved ? JSON.parse(saved) : [])
    } catch { setCanvasAnnotations([]) }
    undoStackRef.current = []
  }, [currentArtId])

  // Auto-save annotations on every change
  useEffect(() => {
    if (!currentArtId) return
    try { sessionStorage.setItem(annotationStoreKey(currentArtId), JSON.stringify(canvasAnnotations)) } catch {}
  }, [canvasAnnotations, currentArtId])

  // Load/save ref annotations
  useEffect(() => {
    if (!currentRefId) return
    try {
      const saved = sessionStorage.getItem(refAnnotationStoreKey(currentRefId))
      setRefAnnotations(saved ? JSON.parse(saved) : [])
    } catch { setRefAnnotations([]) }
    refUndoStackRef.current = []
  }, [currentRefId])

  useEffect(() => {
    if (!currentRefId) return
    try { sessionStorage.setItem(refAnnotationStoreKey(currentRefId), JSON.stringify(refAnnotations)) } catch {}
  }, [refAnnotations, currentRefId])

    const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    // canvas CSS size != canvas pixel size (naturalWidth/naturalHeight), so scale coords
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    return { x, y, cssX: e.clientX - rect.left, cssY: e.clientY - rect.top }
  }
  const hitTest = (ann: CanvasAnn, px: number, py: number): boolean => {
    if (ann.type === "brush" || ann.type === "eraser") {
      const pts = (ann.points || []).filter(Boolean) as {x:number;y:number}[]
      return pts.some(p => Math.abs(p.x - px) < 12 && Math.abs(p.y - py) < 12)
    }
    if (ann.type === "text" && ann.x != null && ann.y != null)
      return Math.abs(ann.x - px) < 60 && Math.abs(ann.y - py) < 20
    if ((ann.type === "circle" || ann.type === "rect") && ann.points) {
      const pts = ann.points.filter(Boolean) as {x:number;y:number}[]
      if (pts.length < 2) return false
      const x = Math.min(pts[0].x, pts[1].x), y = Math.min(pts[0].y, pts[1].y)
      const w = Math.abs(pts[1].x - pts[0].x), h = Math.abs(pts[1].y - pts[0].y)
      return px >= x - 8 && px <= x + w + 8 && py >= y - 8 && py <= y + h + 8
    }
    return false
  }

  const getRefCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = refCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    return { x, y, cssX: e.clientX - rect.left, cssY: e.clientY - rect.top }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>, panelOverride?: "work" | "ref") => {
    const isRef = (panelOverride ?? activePanel) === "ref"
    const annotations = isRef ? refAnnotations : canvasAnnotations
    if (canvasTool === "pointer") {
      const pos = isRef ? getRefCanvasPos(e) : getCanvasPos(e)
      const idx = annotations.map((a, i) => ({ a, i })).reverse().find(({ a }) => hitTest(a, pos.x, pos.y))?.i ?? null
      isRef ? setSelectedRefAnnIdx(idx) : setSelectedAnnIdx(idx)
      return
    }
    if (canvasTool==="text") {
      const p = isRef ? getRefCanvasPos(e) : getCanvasPos(e)
      const cvs = isRef ? refCanvasRef.current : canvasRef.current
      const sf = cvs ? cvs.width / cvs.getBoundingClientRect().width : 1
      setTextInputPos({x:p.x,y:p.y,cssX:p.cssX,cssY:p.cssY,panel:isRef?"ref":"work",scale:sf})
      setTextInputValue("")
      return
    }
    e.preventDefault()
    isDrawingRef.current = true
    const pos = isRef ? getRefCanvasPos(e) : getCanvasPos(e)
    drawingRef.current=[pos]
    if (canvasTool==="circle"||canvasTool==="rect") shapeStartRef.current={...pos}
  }
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current||canvasTool==="pointer"||canvasTool==="text") return
    const pos = activePanel==="ref" ? getRefCanvasPos(e) : getCanvasPos(e)
    if (canvasTool==="brush") {
      drawingRef.current.push(pos); const activeRef = activePanel==="ref"; const ctx=(activeRef?refCanvasRef:canvasRef).current?.getContext("2d")
      if (ctx&&drawingRef.current.length>1) {
        const activeRef = activePanel==="ref"; const cvs=(activeRef?refCanvasRef:canvasRef).current!
        const rect = cvs.getBoundingClientRect(); const scaleFactor = cvs.width / rect.width
        ctx.strokeStyle=brushColor; ctx.lineWidth=brushSize*scaleFactor; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.beginPath(); const prev=drawingRef.current[drawingRef.current.length-2]; ctx.moveTo(prev.x,prev.y); ctx.lineTo(pos.x,pos.y); ctx.stroke()
      }
    } else if (canvasTool==="eraser") {
      drawingRef.current.push(pos); const activeRef = activePanel==="ref"; const ctx=(activeRef?refCanvasRef:canvasRef).current?.getContext("2d")
      if (ctx) {
        const activeRef = activePanel==="ref"; const cvs=(activeRef?refCanvasRef:canvasRef).current!
        const rect = cvs.getBoundingClientRect(); const scaleFactor = cvs.width / rect.width
        ctx.globalCompositeOperation="destination-out"; ctx.lineWidth=brushSize*3*scaleFactor; ctx.lineCap="round"
        if(drawingRef.current.length>1){const prev=drawingRef.current[drawingRef.current.length-2]; ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(pos.x,pos.y); ctx.stroke()}
        ctx.globalCompositeOperation="source-over"
      }
    } else if ((canvasTool==="circle"||canvasTool==="rect")&&shapeStartRef.current) {
      const activeRef = activePanel==="ref"; if(activeRef) redrawRefCanvas(); else redrawCanvas(); const ctx=(activeRef?refCanvasRef:canvasRef).current?.getContext("2d")
      if (ctx) { ctx.strokeStyle=brushColor; ctx.lineWidth=3; ctx.setLineDash([5,5]); if(canvasTool==="circle"){const dx=pos.x-shapeStartRef.current.x; const dy=pos.y-shapeStartRef.current.y; ctx.beginPath(); ctx.arc(shapeStartRef.current.x,shapeStartRef.current.y,Math.sqrt(dx*dx+dy*dy),0,2*Math.PI); ctx.stroke()}else{const x=Math.min(shapeStartRef.current.x,pos.x); const y=Math.min(shapeStartRef.current.y,pos.y); ctx.strokeRect(x,y,Math.abs(pos.x-shapeStartRef.current.x),Math.abs(pos.y-shapeStartRef.current.y))}; ctx.setLineDash([]) }
    }
  }
  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const isRef = activePanel === "ref"
    const pos = isRef ? getRefCanvasPos(e) : getCanvasPos(e)
    const activeCvs = (isRef ? refCanvasRef : canvasRef).current
    const scaleFactor = activeCvs ? activeCvs.width / activeCvs.getBoundingClientRect().width : 1
    const props = { color: brushColor, fillColor, opacity: brushOpacity, lineWidth: brushSize * scaleFactor }
    const push = isRef
      ? (fn: (p: CanvasAnn[]) => CanvasAnn[]) => {
          globalUndoRef.current = [...globalUndoRef.current.slice(-40), {panel:"ref", anns:[...refAnnotations]}]
          setRefAnnotations(fn)
        }
      : (fn: (p: CanvasAnn[]) => CanvasAnn[]) => {
          globalUndoRef.current = [...globalUndoRef.current.slice(-40), {panel:"work", anns:[...canvasAnnotations]}]
          setCanvasAnnotations(fn)
        }
    if (canvasTool==="brush" && drawingRef.current.length>1)
      push(p=>[...p,{type:"brush",points:[...drawingRef.current],...props}])
    else if (canvasTool==="eraser" && drawingRef.current.length>1)
      push(p=>[...p,{type:"eraser",points:[...drawingRef.current],color:"white",lineWidth:brushSize*2*scaleFactor,opacity:1}])
    else if (canvasTool==="circle" && shapeStartRef.current)
      push(p=>[...p,{type:"circle",points:[{...shapeStartRef.current!},{...pos}],...props}])
    else if (canvasTool==="rect" && shapeStartRef.current)
      push(p=>[...p,{type:"rect",points:[{...shapeStartRef.current!},{...pos}],...props}])
    drawingRef.current=[]; shapeStartRef.current=null
  }
  const handleTextSubmit = () => {
    if (textInputPos&&textInputValue.trim()) {
      const scaledFontSize = Math.round(textFontSize * (textInputPos.scale || 1))
      const ann = {type:"text",text:textInputValue,x:textInputPos.x,y:textInputPos.y,color:brushColor,opacity:brushOpacity,lineWidth:brushSize,fontSize:scaledFontSize,font:textFont,bold:textBold,italic:textItalic} as any
      // Use textInputPos.panel — activePanel may have changed (onMouseLeave resets to "work")
      if (textInputPos.panel === "ref") {
        globalUndoRef.current = [...globalUndoRef.current.slice(-40), {panel:"ref", anns:[...refAnnotations]}]
        setRefAnnotations(p=>[...p,ann])
      } else {
        globalUndoRef.current = [...globalUndoRef.current.slice(-40), {panel:"work", anns:[...canvasAnnotations]}]
        setCanvasAnnotations(p=>[...p,ann])
      }
    }
    setTextInputPos(null); setTextInputValue("")
  }

  // Wheel zoom
  const handleWheel = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    setter(p => Math.max(50, Math.min(300, p + (e.deltaY > 0 ? -10 : 10))))
  }

  const canvasTools = [
    {id:"pointer",icon:MousePointer,label:"Select"},{id:"brush",icon:PenTool,label:"Brush"},
    {id:"circle",icon:Circle,label:"Circle"},{id:"rect",icon:Square,label:"Rectangle"},
    {id:"text",icon:Type,label:"Text"},{id:"eraser",icon:Eraser,label:"Eraser"},
  ]
  const colorPalette = ["#ef4444","#f59e0b","#22c55e","#14b8a6","#3b82f6","#a78bfa","#000000","#ffffff"]
  const fillPalette = ["transparent","#ef4444","#f59e0b","#22c55e","#14b8a6","#3b82f6","#a78bfa","#00000044","#ffffff44"]
  const COL_HEIGHT = "calc(100vh - 130px)"

  // Upload helpers for empty state
  const fileToB64 = (file: File): Promise<string> => new Promise(resolve => {
    const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = () => resolve(""); r.readAsDataURL(file)
  })
  const handleArtworkUpload = async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith("image/"))
    if (!imgs.length) return
    const allRefs: { id: string; name: string; image: string }[] = []
    try { const ar = SS.get("c04_ref_previews"); if (ar) JSON.parse(ar).forEach((r: any) => { if (r.preview) allRefs.push({id:r.id,name:r.title||r.id,image:r.preview}) }) } catch {}
    try { const hr = SS.get("refhub_refs"); if (hr) JSON.parse(hr).forEach((r: any) => { if (r.preview&&!allRefs.find(x=>x.id===r.id)) allRefs.push({id:r.id,name:r.title||r.id,image:r.preview}) }) } catch {}
    const newArtworks = await Promise.all(imgs.map(async f => ({ id: `aw_${Date.now()}`, name: f.name.replace(/\.[^.]+$/,""), image: await fileToB64(f), refs: allRefs })))
    setArtworks(p => {
      const merged = [...p]
      newArtworks.forEach(na => { const idx = merged.findIndex(a => a.name === na.name); idx >= 0 ? merged[idx] = na : merged.push(na) })
      return merged
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="flex">
        <PipelineSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="px-4 py-3">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">C06</Badge>
                <h1 className="text-2xl font-bold">Supervisor Review</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/governance"><Button variant="outline" size="sm" className="bg-transparent text-xs">Jump to Decision Loop</Button></Link>
                <Button size="sm" className={qaSubmitted ? "bg-green-600 hover:bg-green-700 text-white" : ""} onClick={() => {
                  setQaSubmitted(true)
                  SS.set("qa_review", JSON.stringify({ artworkName: currentArt?.name, refName: currentRef?.name, feedbackItems, annotations, labels, inlineSpecs, canvasAnnotations, chatMessages, timestamp: new Date().toISOString() }))
                  setTimeout(() => setQaSubmitted(false), 2500)
                }}>
                  <Send className="w-3 h-3 mr-1" />{qaSubmitted ? "Submitted" : "Submit"}
                </Button>
              </div>
            </div>

            {/* Main 3-Column Layout */}
            <div className="flex" style={{ height: COL_HEIGHT, gap: 0 }}>

              {/* LEFT: Artworks */}
              <div className="shrink-0 flex flex-col" style={{ width: leftW, height: COL_HEIGHT }}>
                <Card className="flex flex-col flex-1 min-h-0">
                  <CardHeader className="pb-2 shrink-0 py-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                        Artworks ({artworks.length})
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant={leftPanelMode==="browse"?"secondary":"ghost"} className="h-6 w-6 p-0" onClick={() => setLeftPanelMode("browse")} title="Compact browse mode"><LayoutList className="w-3 h-3" /></Button>
                        <Button size="sm" variant={leftPanelMode==="expand"?"secondary":"ghost"} className="h-6 w-6 p-0" onClick={() => setLeftPanelMode("expand")} title="Expand mode"><Maximize2 className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => artworkFileRef.current?.click()} title="Upload Artwork"><Upload className="w-3 h-3" /></Button>
                      </div>
                    </div>
                    <input ref={artworkFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleArtworkUpload(Array.from(e.target.files||[])); e.target.value="" }} />
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full min-h-0">
                      <div className="space-y-1 px-2 pb-2">
                        {artworks.length === 0 && (
                          <div
                            className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors py-8"
                            onClick={() => artworkFileRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary","bg-primary/5") }}
                            onDragLeave={e => e.currentTarget.classList.remove("border-primary","bg-primary/5")}
                            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("border-primary","bg-primary/5"); handleArtworkUpload(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))) }}
                          >
                            <Upload className="w-7 h-7 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Click or drag to upload image</p>
                            <p className="text-[10px] text-muted-foreground opacity-60">JPG, PNG, WEBP</p>
                          </div>
                        )}
                        {artworks.map((art, idx) => (
                          <div key={art.id}>
                            {leftPanelMode === "expand" ? (
                              /* ── Expand mode: large thumbnail ── */
                              <div className="relative group mb-1">
                                <div
                                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedArtwork===idx ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                                  onClick={() => { setSelectedArtwork(idx); setSelectedRef(0); setExpandedArtwork(expandedArtwork===idx?null:idx) }}
                                  onDoubleClick={e => { e.stopPropagation(); setChatMessages(p => [...p, { role:"user", content: `[Discuss Artwork] ${art.name}` }]); callAgent(`Please examine this artwork "${art.name}", analyze the gaps between it and the Reference, and provide specific improvement suggestions.`) }}
                                  title="Double-click to import to chat"
                                >
                                  <div className="aspect-video bg-muted overflow-hidden relative">
                                    {art.image && <img src={art.image} alt={art.name} className="w-full h-full object-cover" />}
                                  </div>
                                  <div className="p-1.5 flex items-center justify-between">
                                    <p className="text-[10px] font-medium truncate">{art.name}</p>
                                    <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${expandedArtwork===idx?'rotate-180':''}`} onClick={e => { e.stopPropagation(); setExpandedArtwork(expandedArtwork===idx?null:idx) }} />
                                  </div>
                                </div>
                                <button
                                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                  onClick={e => { e.stopPropagation(); deleteItem("artworks", art.id); setArtworks(p => p.filter(a => a.id !== art.id)); if (selectedArtwork===idx) setSelectedArtwork(0) }}
                                  title="Delete"
                                ><X className="w-3 h-3 text-white" /></button>
                              </div>
                            ) : (
                              /* ── Browse mode: compact row ── */
                              <div
                                className={`relative group flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${selectedArtwork===idx ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'}`}
                                onClick={() => { setSelectedArtwork(idx); setSelectedRef(0); setExpandedArtwork(expandedArtwork===idx?null:idx) }}
                                onDoubleClick={e => { e.stopPropagation(); setChatMessages(p => [...p, { role:"user", content: `[Discuss Artwork] ${art.name}` }]); callAgent(`Please examine this artwork "${art.name}", analyze the gaps between it and the Reference, and provide specific improvement suggestions.`) }}
                                title="Double-click to import to chat"
                              >
                                {art.image ? (
                                  <div className="w-10 h-7 rounded overflow-hidden shrink-0">
                                    <img src={art.image} alt={art.name} className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-7 rounded shrink-0 bg-muted flex items-center justify-center">
                                    <ImageIcon className="w-3 h-3 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="text-[10px] font-medium flex-1 truncate">{art.name}</span>
                                <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${expandedArtwork===idx?'rotate-180':''}`} />
                                <button
                                  className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-0.5"
                                  onClick={e => { e.stopPropagation(); deleteItem("artworks", art.id); setArtworks(p => p.filter(a => a.id !== art.id)); if (selectedArtwork===idx) setSelectedArtwork(0) }}
                                  title="Delete"
                                ><X className="w-2.5 h-2.5" /></button>
                              </div>
                            )}
                            {expandedArtwork === idx && art.refs.length > 0 && (
                              <div className="ml-3 pl-2 border-l-2 border-primary/20 space-y-0.5 mt-0.5 mb-1">
                                {art.refs.filter(r => r.image).map((ref, rIdx) => (
                                  <div key={ref.id}
                                    className={`flex flex-col gap-0.5 p-1 rounded cursor-pointer text-[10px] ${selectedRef===rIdx?'bg-amber-500/10 text-amber-700':'hover:bg-muted text-muted-foreground'}`}
                                    onClick={() => setSelectedRef(rIdx)}
                                  >
                                    <div className="w-full relative rounded overflow-hidden">
                                      <div
                                        className="aspect-video bg-muted overflow-hidden relative rounded group"
                                        style={{ cursor: "pointer" }}
                                        onDoubleClick={e => {
                                          e.stopPropagation()
                                          setChatMessages(p => [...p, { role:"user", content: `[Discuss Reference] ${ref.name}${ref.category ? ` (${ref.category})` : ""}${ref.note ? `
Notes: ${ref.note}` : ""}` }])
                                          callAgent(`Please analyze the visual characteristics of Reference "${ref.name}"${ref.category ? ` (${ref.category})` : ""} and its reference value for the current artwork.${ref.note ? `Artist Notes: ${ref.note}` : ""}`)
                                        }}
                                        title="Double-click to import to chat | click Notes button to view notes"
                                      >
                                        <img src={ref.image} alt={ref.name} className="w-full h-full object-cover" />
                                        <button
                                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                          onClick={e => { e.stopPropagation(); deleteItem("references", ref.id); setArtworks(p => p.map(a => ({ ...a, refs: a.refs.filter(r => r.id !== ref.id) }))) }}
                                          title="Delete"
                                        ><X className="w-3 h-3 text-white" /></button>
                                        {ref.category && (
                                          <span className={`absolute top-1 left-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm ${CATEGORY_COLOR[ref.category] ?? "bg-white/80 text-gray-800"}`}>
                                            {ref.category}
                                          </span>
                                        )}
                                        {ref.importance && (
                                          <span className={`absolute top-1 right-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm border ${IMPORTANCE_COLOR[ref.importance] ?? "bg-white/80 text-gray-700 border-gray-300"}`}>
                                            {ref.importance}
                                          </span>
                                        )}
                                        {ref.note && (
                                          <button
                                            className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/60 hover:bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow transition-colors"
                                            onClick={e => { e.stopPropagation(); setNoteDialogRef({ name: ref.name, note: ref.note!, preview: ref.image, category: ref.category, importance: ref.importance }) }}
                                            title="Click to view notes"
                                          >
                                            <FileText className="w-2 h-2" />Notes
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-[9px] font-medium truncate mt-0.5">{ref.name}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* LEFT DRAG HANDLE */}
              <div className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/30 rounded transition-colors self-stretch mx-1" onMouseDown={startHDrag("left")} />

              {/* CENTER: Canvas + Metrics */}
              <div className="flex-1 min-w-0 flex flex-col" style={{ height: COL_HEIGHT }}>
                {/* Canvas Card */}
                <Card className="flex flex-col border-teal-500/30 overflow-hidden" style={{flex:"1 1 0",minHeight:0}}>
                  <CardHeader className="pb-1 shrink-0 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-sm"><PenTool className="w-4 h-4 text-teal-600" />Supervisor Review Canvas</CardTitle>
                        <CardDescription className="text-[10px] mt-0.5">Integrate Specs, Artwork, and References — annotate directly</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-3 py-1 border-y bg-muted/30 shrink-0">
                      <div className="flex items-center gap-0.5">
                        {canvasTools.map(tool => (
                          <Button key={tool.id} variant={canvasTool===tool.id?"default":"ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setCanvasTool(tool.id)} title={tool.label}>
                            <tool.icon className="w-3.5 h-3.5" />
                          </Button>
                        ))}
                        <div className="w-px h-5 bg-border mx-1" />
                        {/* Stroke color dropdown */}
                        <div className="relative">
                          <button type="button" className="flex items-center gap-1 px-1.5 h-7 rounded border text-[9px] hover:bg-muted" onClick={() => { setShowStrokeDD(p=>!p); setShowFillDD(false); setShowSizeDD(false); setShowOpacityDD(false) }}>
                            <div className="w-3 h-3 rounded-full border border-border shrink-0" style={{backgroundColor:brushColor}}/>
                            <span>Stroke</span>
                          </button>
                          {showStrokeDD && (
                            <div className="absolute top-8 left-0 z-50 flex bg-card border rounded-lg shadow-lg p-2 gap-1 flex-wrap w-28">
                              {colorPalette.map(c => (
                                <button key={c} type="button" className={`rounded-full border-2 w-5 h-5 transition-all ${brushColor===c?'border-foreground scale-110':'border-muted-foreground/30'}`} style={{backgroundColor:c}} onClick={() => { setBrushColor(c); setShowStrokeDD(false) }} />
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Fill color dropdown */}
                        <div className="relative">
                          <button type="button" className="flex items-center gap-1 px-1.5 h-7 rounded border text-[9px] hover:bg-muted" onClick={() => { setShowFillDD(p=>!p); setShowStrokeDD(false); setShowSizeDD(false); setShowOpacityDD(false) }}>
                            <div className="w-3 h-3 rounded-full border border-border shrink-0" style={{backgroundColor:fillColor==="transparent"?"transparent":fillColor, backgroundImage:fillColor==="transparent"?'repeating-conic-gradient(#aaa 0% 25%,transparent 0% 50%) 0 0/4px 4px':'none'}}/>
                            <span>Fill</span>
                          </button>
                          {showFillDD && (
                            <div className="absolute top-8 left-0 z-50 flex bg-card border rounded-lg shadow-lg p-2 gap-1 flex-wrap w-32">
                              {fillPalette.map(c => (
                                <button key={c} type="button" className={`rounded-full border-2 w-5 h-5 transition-all ${fillColor===c?'border-foreground scale-110':'border-muted-foreground/30'}`} style={{backgroundColor:c==="transparent"?"transparent":c, backgroundImage:c==="transparent"?'repeating-conic-gradient(#aaa 0% 25%,transparent 0% 50%) 0 0/4px 4px':'none'}} onClick={() => { setFillColor(c); setShowFillDD(false) }} />
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Size popover */}
                        <div className="relative">
                          <button type="button" className="flex items-center gap-1 px-1.5 h-7 rounded border text-[9px] hover:bg-muted" onClick={() => { setShowSizeDD(p=>!p); setShowStrokeDD(false); setShowFillDD(false); setShowOpacityDD(false) }}>
                            <span>Size {brushSize}</span>
                          </button>
                          {showSizeDD && (
                            <div className="absolute top-8 left-0 z-50 bg-card border rounded-lg shadow-lg p-3 w-48">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px]">Size</span>
                                <input type="number" min={1} max={15} value={brushSize} className="w-12 h-6 text-xs border rounded px-1 text-center" onKeyDown={e=>e.stopPropagation()} onChange={e => { const v=Number(e.target.value); if(!isNaN(v)) setBrushSize(Math.max(1,Math.min(15,v))) }} />
                              </div>
                              <input type="range" min={1} max={15} step={1} value={brushSize} className="w-full accent-primary" onChange={e => setBrushSize(Number(e.target.value))} />
                            </div>
                          )}
                        </div>
                        {/* Opacity popover */}
                        <div className="relative">
                          <button type="button" className="flex items-center gap-1 px-1.5 h-7 rounded border text-[9px] hover:bg-muted" onClick={() => { setShowOpacityDD(p=>!p); setShowStrokeDD(false); setShowFillDD(false); setShowSizeDD(false) }}>
                            <span>Opacity {Math.round(brushOpacity*100)}%</span>
                          </button>
                          {showOpacityDD && (
                            <div className="absolute top-8 left-0 z-50 bg-card border rounded-lg shadow-lg p-3 w-48">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px]">Opacity</span>
                                <input type="number" min={0} max={100} value={Math.round(brushOpacity*100)} className="w-12 h-6 text-xs border rounded px-1 text-center" onKeyDown={e=>e.stopPropagation()} onChange={e => { const v=Number(e.target.value); if(!isNaN(v)) setBrushOpacity(Math.max(0,Math.min(100,v))/100) }} />
                              </div>
                              <input type="range" min={0} max={100} value={Math.round(brushOpacity*100)} className="w-full accent-primary" onChange={e => setBrushOpacity(Number(e.target.value)/100)} />
                            </div>
                          )}
                        </div>
                        {canvasTool === "text" && (<>
                          <div className="w-px h-4 bg-border mx-0.5" />
                          <select value={textFont} onChange={e=>setTextFont(e.target.value)} className="h-6 text-[9px] border rounded px-1 bg-background">
                            <option value="sans-serif">Sans-serif</option>
                            <option value="serif">Serif</option>
                            <option value="monospace">Mono</option>
                            <option value="cursive">Cursive</option>
                            <option value="Arial">Arial</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Impact">Impact</option>
                          </select>
                          <span className="text-[9px] text-muted-foreground">Font Size</span>
                          <input type="number" min={8} max={120} value={textFontSize} className="w-10 h-6 text-xs border rounded px-1 text-center" onKeyDown={e=>e.stopPropagation()} onChange={e=>{const v=Number(e.target.value);if(!isNaN(v)&&v>0)setTextFontSize(Math.max(8,Math.min(120,v)))}} />
                          <button type="button" className={`h-6 w-6 rounded text-xs font-bold border transition-colors ${textBold?'bg-primary text-primary-foreground':'hover:bg-muted'}`} onClick={()=>setTextBold(p=>!p)}>B</button>
                          <button type="button" className={`h-6 w-6 rounded text-xs italic border transition-colors ${textItalic?'bg-primary text-primary-foreground':'hover:bg-muted'}`} onClick={()=>setTextItalic(p=>!p)}>I</button>
                        </>)}
                        <div className="w-px h-5 bg-border mx-1" />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Undo last step (across Work/Ref)" onClick={() => {
                          const entry = globalUndoRef.current.pop()
                          if (!entry) return
                          if (entry.panel === "ref") setRefAnnotations(entry.anns)
                          else setCanvasAnnotations(entry.anns)
                        }}><Undo2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Clear all (Work + Ref)" onClick={() => {
                          globalUndoRef.current = [
                            ...globalUndoRef.current.slice(-40),
                            {panel:"work", anns:[...canvasAnnotations]},
                            {panel:"ref", anns:[...refAnnotations]},
                          ]
                          setCanvasAnnotations([])
                          setRefAnnotations([])
                        }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        <div className="w-px h-5 bg-border mx-0.5" />
                        <Button variant="default" size="sm" className="h-7 px-2 text-[10px] gap-1 bg-teal-600 hover:bg-teal-700 text-white" title="Export Artwork annotation" onClick={() => {
                          const canvas = canvasRef.current
                          const img = canvasContainerRef.current?.querySelector("img") as HTMLImageElement | null
                          if (!canvas || !img) return
                          const off = document.createElement("canvas")
                          off.width = canvas.width; off.height = canvas.height
                          const ctx = off.getContext("2d")!
                          ctx.drawImage(img, 0, 0, off.width, off.height)
                          ctx.drawImage(canvas, 0, 0)
                          const link = document.createElement("a"); link.download = `${currentArt?.name||"artwork"}_annotated.png`; link.href = off.toDataURL("image/png"); document.body.appendChild(link); link.click(); document.body.removeChild(link)
                        }}>
                          <Save className="w-3.5 h-3.5" />Export Work
                        </Button>
                        <Button variant="default" size="sm" className="h-7 px-2 text-[10px] gap-1 bg-cyan-600 hover:bg-cyan-700 text-white" title="Export Reference annotation" onClick={() => {
                          const canvas = refCanvasRef.current
                          const img = refCanvasContainerRef.current?.querySelector("img") as HTMLImageElement | null
                          if (!canvas || !img) return
                          const off = document.createElement("canvas")
                          off.width = canvas.width; off.height = canvas.height
                          const ctx = off.getContext("2d")!
                          ctx.drawImage(img, 0, 0, off.width, off.height)
                          ctx.drawImage(canvas, 0, 0)
                          const link = document.createElement("a"); link.download = `${currentRef?.name||"reference"}_annotated.png`; link.href = off.toDataURL("image/png"); document.body.appendChild(link); link.click(); document.body.removeChild(link)
                        }}>
                          <Save className="w-3.5 h-3.5" />Export Ref
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[8px] h-4 bg-blue-500/10 text-blue-600 border-blue-500/30">Work</Badge>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setArtworkZoom(p=>Math.max(50,p-25))}><ZoomOut className="w-3 h-3" /></Button>
                        <span className="text-[10px] font-medium w-8 text-center">{artworkZoom}%</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setArtworkZoom(p=>Math.min(300,p+25))}><ZoomIn className="w-3 h-3" /></Button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <Badge variant="outline" className="text-[8px] h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">Ref</Badge>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRefZoom(p=>Math.max(50,p-25))}><ZoomOut className="w-3 h-3" /></Button>
                        <span className="text-[10px] font-medium w-8 text-center">{refZoom}%</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRefZoom(p=>Math.min(300,p+25))}><ZoomIn className="w-3 h-3" /></Button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <Button variant={showSpecs?"default":"outline"} size="sm" className={`h-6 text-[10px] gap-0.5 ${!showSpecs?'bg-transparent':''}`} onClick={() => setShowSpecs(!showSpecs)}><FileCheck className="w-3 h-3" />Specs</Button>

                      </div>
                    </div>

                    

                    {/* Canvas 3-panel */}
                    <div className="flex flex-1 min-h-0 overflow-hidden">
                      {/* Specs Panel */}
                      {showSpecs && (
                        <div className="w-44 border-r flex flex-col shrink-0 bg-card overflow-hidden">
                          <div className="flex items-center justify-between px-2 py-1 border-b shrink-0">
                            <div className="flex items-center gap-1"><FileCheck className="w-3 h-3 text-teal-600" /><span className="text-[10px] font-semibold">Specs</span></div>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShowSpecs(false)}><X className="w-3 h-3" /></Button>
                          </div>
                          <ScrollArea className="flex-1 min-h-0">
                            <div className="p-2 space-y-2">
                              <div><h4 className="text-[10px] font-semibold text-muted-foreground mb-1">Supervisor Specs</h4><ul className="space-y-0.5" suppressHydrationWarning>{hydrated && directorSpecs.items.map((item,i) => <li key={i} className="text-[10px] flex items-start gap-1"><span className="text-teal-600 mt-0.5 shrink-0">•</span><span>{item}</span></li>)}</ul></div>

                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Canvas center */}
                      <div className="flex-1 relative overflow-hidden bg-neutral-900 min-w-0 flex flex-col">
                        <div className="flex-1 flex min-h-0 relative">
                          {/* Artwork: <img> shows image, <canvas> overlays annotations */}
                          <div className="flex-1 relative overflow-hidden" onWheel={handleWheel(setArtworkZoom)}>
                            <div ref={canvasContainerRef} className="absolute inset-0 flex items-center justify-center">
                              {currentArt?.image ? (
                                <div className="relative" style={{transform:`scale(${artworkZoom/100})`,transformOrigin:"center center"}}>
                                  {/* Layer 1: artwork image */}
                                  <img
                                    src={currentArt.image}
                                    alt="Artwork"
                                    crossOrigin="anonymous"
                                    style={{display:"block", maxWidth:"100%", maxHeight:"100%"}}
                                    onLoad={e => {
                                      const img = e.currentTarget
                                      const canvas = canvasRef.current
                                      if (canvas) { canvas.width = img.naturalWidth; canvas.height = img.naturalHeight }
                                      redrawCanvas()
                                    }}
                                  />
                                  {/* Layer 2: transparent annotation canvas — same size as img */}
                                  <canvas ref={canvasRef}
                                    className="absolute inset-0 w-full h-full"
                                    style={{
                                      cursor: canvasTool==="pointer"?"pointer":canvasTool==="text"?"text":canvasTool==="eraser"?"cell":"crosshair",
                                    }}
                                    onMouseDown={e => { setActivePanel("work"); setShowStrokeDD(false);setShowFillDD(false);setShowSizeDD(false);setShowOpacityDD(false); handleCanvasMouseDown(e) }}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={e => { if(isDrawingRef.current) handleCanvasMouseUp(e) }}
                                  />
                                </div>
                              ) : (
                                <div className="text-white/40 text-xs text-center"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Select Artwork</p></div>
                              )}
                            </div>
                            {/* Work text overlay — outside scaled container */}
                            {textInputPos && textInputPos.panel !== "ref" && (
                              <div
                                className="absolute z-30 flex flex-col gap-1 pointer-events-auto"
                                style={{left: textInputPos.cssX, top: Math.max(0, textInputPos.cssY - textFontSize - 36)}}
                                onMouseDown={e => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1 bg-zinc-900/95 border border-zinc-700 rounded-lg px-2 py-1 shadow-xl">
                                  <input type="number" min={8} max={120} value={textFontSize}
                                    className="w-10 h-5 text-[10px] text-center rounded bg-zinc-800 border border-zinc-600 text-zinc-100 px-1 focus:outline-none"
                                    onKeyDown={e=>e.stopPropagation()}
                                    onChange={e=>{const v=Number(e.target.value);if(!isNaN(v)&&v>0)setTextFontSize(Math.max(8,Math.min(120,v)))}}
                                  />
                                  <input type="color" value={brushColor} onChange={e=>setBrushColor(e.target.value)}
                                    className="w-5 h-5 rounded cursor-pointer border border-zinc-600 bg-transparent p-0" title="Color"
                                  />
                                  <button type="button" onMouseDown={e=>{e.preventDefault();setTextBold(p=>!p)}}
                                    className={`h-5 w-5 rounded text-[10px] font-bold border transition-colors ${textBold?"bg-teal-500 text-white border-teal-400":"text-zinc-300 border-zinc-600 hover:bg-zinc-700"}`}>B</button>
                                  <button type="button" onMouseDown={e=>{e.preventDefault();setTextItalic(p=>!p)}}
                                    className={`h-5 w-5 rounded text-[10px] italic border transition-colors ${textItalic?"bg-teal-500 text-white border-teal-400":"text-zinc-300 border-zinc-600 hover:bg-zinc-700"}`}>I</button>
                                  <div className="w-px h-4 bg-zinc-700 mx-0.5"/>
                                  <button type="button" onMouseDown={e=>{e.preventDefault();handleTextSubmit()}}
                                    disabled={!textInputValue.trim()}
                                    className="h-5 px-1.5 rounded text-[10px] text-green-400 border border-zinc-600 hover:bg-green-500/20 disabled:opacity-40">✓</button>
                                  <button type="button" onMouseDown={e=>{e.preventDefault();setTextInputPos(null);setTextInputValue("")}}
                                    className="h-5 px-1.5 rounded text-[10px] text-red-400 border border-zinc-600 hover:bg-red-500/20">✕</button>
                                </div>
                                <input
                                  autoFocus type="text" value={textInputValue}
                                  onChange={e=>setTextInputValue(e.target.value)}
                                  onCompositionStart={()=>{isComposingRef.current=true}} onCompositionEnd={()=>{isComposingRef.current=false}} onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter"){e.preventDefault();if(isComposingRef.current)return;const now=Date.now();if(now-lastEnterRef.current<400){lastEnterRef.current=0;handleTextSubmit()}else{lastEnterRef.current=now}}if(e.key==="Escape"&&!isComposingRef.current){e.preventDefault();setTextInputPos(null);setTextInputValue("")}}}
                                  placeholder="Enter text… double press Enter to confirm"
                                  className="min-w-[140px] border-2 border-teal-500 rounded px-2 py-0.5 shadow-lg outline-none bg-white/90 placeholder:text-zinc-400"
                                  style={{font:`${textBold?"bold ":""}${textItalic?"italic ":""}${textFontSize}px ${textFont}`,color:brushColor}}
                                />
                              </div>
                            )}
                            <Badge className="absolute top-2 left-2 bg-blue-500 text-[10px] h-5 z-10 pointer-events-none">Work</Badge>
                            <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/50 whitespace-nowrap pointer-events-none">Ctrl/⌘ + Scroll to zoom</p>
                          </div>
                          <div className="w-px bg-white/30 shrink-0" />
                          {/* Reference: img + canvas overlay, same as artwork */}
                          <div className="flex-1 relative overflow-hidden" onWheel={handleWheel(setRefZoom)}>
                            <div className="absolute inset-0 flex items-center justify-center">
                              {resolvedRefImage ? (
                                <div ref={refCanvasContainerRef} className="relative" style={{transform:`scale(${refZoom/100})`,transformOrigin:"center center"}} onMouseEnter={() => setActivePanel("ref")} onMouseLeave={() => setActivePanel("work")}>
                                  <img
                                    src={resolvedRefImage} alt="Reference" crossOrigin="anonymous"
                                    style={{display:"block", maxWidth:"100%", maxHeight:"100%"}}
                                    onLoad={e => { const img=e.currentTarget; const canvas=refCanvasRef.current; if(canvas){canvas.width=img.naturalWidth;canvas.height=img.naturalHeight}; redrawRefCanvas() }}
                                  />
                                  <canvas ref={refCanvasRef}
                                    className="absolute inset-0 w-full h-full"
                                    style={{cursor:canvasTool==="pointer"?"pointer":canvasTool==="text"?"text":canvasTool==="eraser"?"cell":"crosshair"}}
                                    onMouseDown={e => { setActivePanel("ref"); setShowStrokeDD(false);setShowFillDD(false);setShowSizeDD(false);setShowOpacityDD(false); handleCanvasMouseDown(e, "ref") }}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={e => { if(isDrawingRef.current) handleCanvasMouseUp(e); setActivePanel("work") }}
                                  />
                                </div>
                              ) : (
                                <div className="text-white/40 text-xs text-center"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Select Reference</p></div>
                              )}
                            </div>
                            {/* Ref text overlay — outside scaled container, unaffected by zoom */}
                            {textInputPos && textInputPos.panel==="ref" && (
                              <div
                                className="absolute z-30 flex flex-col gap-1 pointer-events-auto"
                                style={{left: textInputPos.cssX, top: Math.max(0, textInputPos.cssY - textFontSize - 36)}}
                                onMouseDown={e => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1 bg-zinc-900/95 border border-zinc-700 rounded-lg px-2 py-1 shadow-xl">
                                  <input type="number" min={8} max={120} value={textFontSize}
                                    className="w-10 h-5 text-[10px] text-center rounded bg-zinc-800 border border-zinc-600 text-zinc-100 px-1 focus:outline-none"
                                    onKeyDown={e=>e.stopPropagation()}
                                    onChange={e=>{const v=Number(e.target.value);if(!isNaN(v)&&v>0)setTextFontSize(Math.max(8,Math.min(120,v)))}}
                                  />
                                  <input type="color" value={brushColor} onChange={e=>setBrushColor(e.target.value)}
                                    className="w-5 h-5 rounded cursor-pointer border border-zinc-600 bg-transparent p-0" title="Color"
                                  />
                                  <button type="button" onMouseDown={e=>{e.preventDefault();setTextBold(p=>!p)}}
                                    className={`h-5 w-5 rounded text-[10px] font-bold border transition-colors ${textBold?"bg-amber-500 text-white border-amber-400":"text-zinc-300 border-zinc-600 hover:bg-zinc-700"}`}>B</button>
                                  <button type="button" onMouseDown={e=>{e.preventDefault();setTextItalic(p=>!p)}}
                                    className={`h-5 w-5 rounded text-[10px] italic border transition-colors ${textItalic?"bg-amber-500 text-white border-amber-400":"text-zinc-300 border-zinc-600 hover:bg-zinc-700"}`}>I</button>
                                  <div className="w-px h-4 bg-zinc-700 mx-0.5"/>
                                  <button type="button" onMouseDown={e=>{e.preventDefault();handleTextSubmit()}}
                                    disabled={!textInputValue.trim()}
                                    className="h-5 px-1.5 rounded text-[10px] text-green-400 border border-zinc-600 hover:bg-green-500/20 disabled:opacity-40">✓</button>
                                  <button type="button" onMouseDown={e=>{e.preventDefault();setTextInputPos(null);setTextInputValue("")}}
                                    className="h-5 px-1.5 rounded text-[10px] text-red-400 border border-zinc-600 hover:bg-red-500/20">✕</button>
                                </div>
                                <input
                                  autoFocus type="text" value={textInputValue}
                                  onChange={e=>setTextInputValue(e.target.value)}
                                  onCompositionStart={()=>{isComposingRef.current=true}} onCompositionEnd={()=>{isComposingRef.current=false}} onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter"){e.preventDefault();if(isComposingRef.current)return;const now=Date.now();if(now-lastEnterRef.current<400){lastEnterRef.current=0;handleTextSubmit()}else{lastEnterRef.current=now}}if(e.key==="Escape"&&!isComposingRef.current){e.preventDefault();setTextInputPos(null);setTextInputValue("")}}}
                                  placeholder="Enter text… double press Enter to confirm"
                                  className="min-w-[140px] border-2 border-amber-500 rounded px-2 py-0.5 shadow-lg outline-none bg-white/90 placeholder:text-zinc-400"
                                  style={{font:`${textBold?"bold ":""}${textItalic?"italic ":""}${textFontSize}px ${textFont}`,color:brushColor}}
                                />
                              </div>
                            )}
                            <Badge className="absolute top-2 right-2 bg-amber-500 text-[10px] h-5">Ref</Badge>
                            <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/50 whitespace-nowrap">Ctrl/⌘ + Scroll to zoom</p>
                          </div>
                        </div>{/* end flex-1 flex min-h-0 Work+Ref */}
                      </div>{/* end canvas-center */}

                      {/* Right sidebar: Annotations + Labels + Specs */}
                      <div className="w-44 border-l flex flex-col shrink-0 bg-card overflow-hidden">
                        <div className="flex items-center gap-1.5 px-2 py-1 border-b shrink-0">
                          <Tag className="w-3 h-3 text-teal-600"/>
                          <span className="text-[10px] font-semibold">Annotations · Labels · Specs</span>
                          {loadingSuggestions && <Loader2 className="w-2.5 h-2.5 animate-spin text-teal-500"/>}
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                          <div className="divide-y">
                            {/* Add Annotation */}
                            <div className="px-2 py-1.5">
                              <h4 className="text-[10px] font-semibold mb-1">Add Annotation</h4>
                              {suggestedAnnotations.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mb-1">
                                  {suggestedAnnotations.map((s, i) => (
                                    <button key={i} type="button"
                                      className="text-[8px] px-1 py-0.5 rounded border border-teal-500/40 text-teal-700 bg-teal-500/5 hover:bg-teal-500/15 transition-colors text-left w-full"
                                      onClick={() => { setAnnotations(p=>[...p,{id:"ann-"+Date.now(),text:s,time:"Just now",ai:true}]); setSuggestedAnnotations(p=>p.filter((_,j)=>j!==i)) }}
                                    >{s}</button>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-1 mb-1">
                                <Input placeholder="Enter director annotation..." value={newAnnotationText} onChange={e=>setNewAnnotationText(e.target.value)} onKeyDown={e=>e.stopPropagation()} className="text-[9px] h-5"/>
                                <Button size="sm" className="h-5 w-5 p-0 shrink-0" onClick={() => {if(newAnnotationText.trim()){setAnnotations(p=>[...p,{id:"ann-"+Date.now(),text:newAnnotationText,time:"Just now"}]);setNewAnnotationText("")}}}><Plus className="w-2.5 h-2.5"/></Button>
                              </div>
                              <div className="space-y-0.5">{annotations.map(ann=><div key={ann.id} className="flex items-start gap-1 min-w-0"><Tag className="w-2 h-2 text-teal-600 mt-0.5 shrink-0"/><span className="text-[8px] break-words leading-tight">{ann.text}</span></div>)}</div>
                            </div>
                            {/* Labels */}
                            <div className="px-2 py-1.5">
                              <div className="flex items-center gap-1 mb-1"><Tag className="w-2.5 h-2.5"/><h4 className="text-[10px] font-semibold">Labels</h4></div>
                              {suggestedLabels.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mb-1">
                                  {suggestedLabels.map((s, i) => (
                                    <button key={i} type="button"
                                      className="text-[8px] px-1 py-0.5 rounded border border-amber-500/40 text-amber-700 bg-amber-500/5 hover:bg-amber-500/15 transition-colors"
                                      onClick={() => { setLabels(p => p.includes(s) ? p : [...p, s]); setSuggestedLabels(p => p.filter((_,j) => j !== i)) }}
                                    >{s}</button>
                                  ))}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-0.5 mb-1">{labels.map((label,i)=><Badge key={i} variant="outline" className="text-[8px] gap-0.5 h-3.5">{label}<button type="button" onClick={()=>setLabels(p=>p.filter((_,j)=>j!==i))} className="ml-0.5 hover:text-red-500"><X className="w-1.5 h-1.5"/></button></Badge>)}</div>
                              <div className="flex gap-1"><Input placeholder="Add Label..." value={newLabel} onChange={e=>setNewLabel(e.target.value)} onKeyDown={e=>e.stopPropagation()} className="text-[9px] h-5"/><Button size="sm" className="h-5 w-5 p-0 shrink-0" onClick={()=>{if(newLabel.trim()){setLabels(p=>[...p,newLabel]);setNewLabel("")}}}><Plus className="w-2 h-2"/></Button></div>
                            </div>
                            {/* Specs */}
                            <div className="px-2 py-1.5">
                              <div className="flex items-center gap-1 mb-1"><FileCheck className="w-2.5 h-2.5"/><h4 className="text-[10px] font-semibold">Specs</h4></div>
                              {suggestedSpecs.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mb-1">
                                  {suggestedSpecs.map((s, i) => (
                                    <button key={i} type="button"
                                      className="text-[8px] px-1 py-0.5 rounded border border-violet-500/40 text-violet-700 bg-violet-500/5 hover:bg-violet-500/15 transition-colors text-left w-full"
                                      onClick={() => { setInlineSpecs(p=>[...p,s]); setSuggestedSpecs(p=>p.filter((_,j)=>j!==i)) }}
                                    >{s}</button>
                                  ))}
                                </div>
                              )}
                              <div className="space-y-0.5 mb-1">{inlineSpecs.map((spec,i)=><div key={i} className="flex items-start justify-between gap-1"><div className="flex items-start gap-1 min-w-0"><CheckCircle2 className="w-2 h-2 text-teal-500 mt-0.5 shrink-0"/><span className="text-[8px] break-words">{spec}</span></div><button type="button" onClick={()=>setInlineSpecs(p=>p.filter((_,j)=>j!==i))} className="text-muted-foreground hover:text-red-500 shrink-0"><X className="w-2 h-2"/></button></div>)}</div>
                              <div className="flex gap-1"><Input placeholder="Add Spec..." value={newSpecText} onChange={e=>setNewSpecText(e.target.value)} onKeyDown={e=>e.stopPropagation()} className="text-[9px] h-5"/><Button size="sm" className="h-5 w-5 p-0 shrink-0" onClick={()=>{if(newSpecText.trim()){setInlineSpecs(p=>[...p,newSpecText]);setNewSpecText("")}}}><Plus className="w-2 h-2"/></Button></div>
                            </div>
                            {/* Submit */}
                            <div className="px-2 py-1.5 bg-teal-500/5">
                              <Button size="sm" className="w-full h-7 text-[10px] gap-1" onClick={() => {
                                const summary = [`[Canvas Review Submit]`,`Annotations (${annotations.length}): ${annotations.map(a=>a.text).join("; ")}`,`Labels: ${labels.join(", ")}`,`Specs: ${inlineSpecs.join("; ")}`,`Brush marks: ${canvasAnnotations.filter(a=>a.type==="brush").length}  strokes`,`Circles/Rectangles: ${canvasAnnotations.filter(a=>a.type==="circle"||a.type==="rect").length}`].filter(Boolean).join("\n")
                                setChatMessages(p=>[...p,{role:"user",content:summary}])
                                callAgent(summary)
                              }}><Send className="w-3 h-3"/>Submit to Agent</Button>
                            </div>
                          </div>
                        </ScrollArea>
                      </div>

                      </div>{/* end canvas 3-panel */}


                  </CardContent>
                </Card>

                {/* Scrollable bottom section */}
                <div className="flex flex-row items-stretch gap-2 pb-1 flex-1 min-h-0">
                  {/* Multi-Agent Metrics */}
                  <Collapsible open={showMetrics} onOpenChange={setShowMetrics} className="flex-1 min-w-0 flex flex-col">
                    <Card className="flex-1 flex flex-col min-h-0 mt-1">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 py-1.5 px-3 shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-teal-600"/><CardTitle className="text-xs">Overall AI Feedback</CardTitle></div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-red-500">{metrics.filter(m=>m.status==="red").length}R</span>
                              <span className="text-[10px] text-amber-500">{metrics.filter(m=>m.status==="yellow").length}Y</span>
                              <span className="text-[10px] text-green-500">{metrics.filter(m=>m.status==="green").length}G</span>
                              {showMetrics?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="flex-1 min-h-0 overflow-y-auto">
                        <CardContent className="pt-0 pb-2 px-3 h-full">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
                            {metrics.map(m => (
                              <div key={m.id} className={`p-1.5 rounded-lg ${getStatusBg(m.status)} ${isMetricMentioned(m.id)?"border-2":"border border-dashed"} cursor-pointer select-none`}
                                onClick={()=>{setSelectedMetricDetail(m);setShowMetricDetailDialog(true)}}
                                onDoubleClick={e=>{e.stopPropagation();setSelectedMetricDetail(m);setShowMetricDetailDialog(true)}}
                                title="Click/Double-click to view details · Check to send to AI chat"
                              >
                                <div className="flex items-center gap-1">
                                  <Checkbox checked={checkedMetrics.includes(m.id)} onCheckedChange={c=>handleMetricCheck(m.id,c as boolean)} className="h-3 w-3" onClick={e=>e.stopPropagation()}/>
                                  {getStatusIcon(m.status)}
                                  <span className="text-[10px] font-medium">{m.name}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5 ml-4">
                                  <Badge variant="outline" className="text-[7px] h-3 px-0.5">{m.refBasis}</Badge>
                                  {!m.consensus&&<Badge variant="outline" className="text-[7px] h-3 px-0.5 bg-amber-500/10 text-amber-600">Divergent</Badge>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* Artist Notes */}
                  <Collapsible open={showArtistNotes} onOpenChange={setShowArtistNotes} className="flex-1 min-w-0 flex flex-col">
                    <Card className="flex-1 flex flex-col min-h-0 mt-1 border-indigo-500/30 bg-indigo-500/5">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 py-1.5 px-3 shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-600"/>
                              <CardTitle className="text-xs">Artist Creation Intentions</CardTitle>
                              <Badge variant="outline" className="text-[8px] h-3.5 bg-indigo-500/10 text-indigo-600 border-indigo-500/30">C03</Badge>
                              {/* Live badge showing how many notes are filled */}
                              {reflectionNote && (
                                <Badge variant="outline" className="text-[8px] h-3.5 bg-green-500/10 text-green-600 border-green-500/30">
                                  {reflectionNote ? 1 : 0}
                                </Badge>
                              )}
                            </div>
                            {showArtistNotes ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="flex-1 min-h-0 overflow-y-auto">
                        <CardContent className="pt-0 pb-2 px-3 h-full">
                          {/* Creative reflection notes scrolling history — from upload-analyze page (c04_notes) */}
                          {!hydrated || notesHistory.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground py-1">No creative reflection notes yet (from the Upload Analyze page)</p>
                          ) : (
                            <ScrollArea className="h-full pr-3">
                              <div className="space-y-1.5 pr-1">
                                {notesHistory.map((note, i) => (
                                  <div key={i} className="p-1.5 rounded border bg-background">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <div className="flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5 text-violet-500"/>
                                        <span className="text-[8px] font-semibold text-violet-700">#{notesHistory.length - i}</span>
                                      </div>
                                      <button className="text-[8px] text-violet-500 hover:text-violet-700"
                                        onClick={() => { setChatMessages(p => [...p, { role:"user", content:`[Reflection #${notesHistory.length - i}] ${note}` }]); callAgent(`Artist's creative reflection:\n${note}`) }}>
                                        Send to AI →
                                      </button>
                                    </div>
                                    <p className="text-[9px] leading-relaxed whitespace-pre-line">{note}</p>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </div>{/* end scrollable bottom */}
              </div>{/* */}

              {/* RIGHT DRAG HANDLE */}
              <div className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/30 rounded transition-colors self-stretch mx-1" onMouseDown={startHDrag("right")} />

              {/* RIGHT: AI Assistant */}
              <div className="shrink-0 flex flex-col" style={{ width: rightW, height: COL_HEIGHT }}>
                <Card className="border-teal-500/30 flex flex-col flex-1 min-h-0">
                  <CardHeader className="pb-1 shrink-0 py-2">
                    <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-teal-600"/><div><CardTitle className="text-xs">AI Assistant</CardTitle><CardDescription className="text-[10px]">AI tone-adjusted output</CardDescription></div></div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 flex flex-col p-0">
                    <ScrollArea className="flex-1 min-h-0">
                      <div className="px-3 py-2 space-y-2.5">
                        {chatMessages.length===0&&<div className="text-center py-6 text-muted-foreground"><Bot className="w-6 h-6 mx-auto mb-2 opacity-30"/><p className="text-[10px]">Chat below directly, or check a Metric for auto follow-up</p></div>}
                        {chatMessages.map((msg,idx)=>(
                          <div key={idx} className={`flex gap-2 ${msg.role==='user'?'flex-row-reverse':''}`}>
                            <Avatar className="w-6 h-6 shrink-0"><AvatarFallback className={msg.role==='ai'?'bg-teal-500/10 text-teal-600':'bg-primary/10'}>{msg.role==='ai'?<Bot className="w-3 h-3"/>:'D'}</AvatarFallback></Avatar>
                            <div className={`rounded-lg p-2 max-w-[85%] min-w-0 break-words ${msg.role==='ai'?'bg-muted':'bg-primary text-primary-foreground'}`}><p className="text-[10px] whitespace-pre-line leading-relaxed">{msg.content}</p></div>
                          </div>
                        ))}
                        {chatLoading&&<div className="flex gap-2"><Avatar className="w-6 h-6 shrink-0"><AvatarFallback className="bg-teal-500/10 text-teal-600"><Bot className="w-3 h-3"/></AvatarFallback></Avatar><div className="rounded-lg p-2 bg-muted flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-teal-500"/><span className="text-[10px] text-muted-foreground">Analyzing…</span></div></div>}
                        <div ref={chatScrollRef}/>
                      </div>
                    </ScrollArea>
                    <div className="px-3 py-2 border-t space-y-1.5 shrink-0">
                      <div className="flex items-center gap-1.5"><span className="text-[9px] text-muted-foreground shrink-0">Tone:</span>
                        <Select value={toneStyle} onValueChange={setToneStyle}><SelectTrigger className="h-5 text-[9px] flex-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="professional">Professional</SelectItem><SelectItem value="gentle">Encouraging</SelectItem><SelectItem value="direct">Direct</SelectItem><SelectItem value="detailed">Detailed</SelectItem></SelectContent></Select>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={()=>{setChatMessages(p=>[...p,{role:"user",content:"Clarify vague terms"}]);callAgent("Please clarify any vague descriptions in the feedback list and provide quantifiable, specific suggestions.")}}>Clarify Vague Terms</Button>
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={()=>{setChatMessages(p=>[...p,{role:"user",content:"Convert to actionable steps"}]);callAgent("Please convert the current feedback into immediately actionable steps with specific values.")}}>Convert to Steps</Button>
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={handleAnalyzeFeedback} disabled={analyzingFeedback}><Sparkles className="w-2.5 h-2.5 mr-0.5"/>{analyzingFeedback?"...":"AI Analysis"}</Button>
                      </div>
                      <div className="flex gap-1.5">
                        <Input placeholder="Type your question..." className="text-[10px] h-7" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') e.preventDefault()}}/>
                        <Button size="sm" className="h-7 w-7 p-0" onClick={handleChatSend} disabled={chatLoading}><Send className="w-3 h-3"/></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Metric Detail Dialog */}
          <Dialog open={showMetricDetailDialog} onOpenChange={setShowMetricDetailDialog}>
            <DialogContent className="max-w-2xl w-full flex flex-col" style={{maxHeight:"85vh"}}>
              <DialogHeader className="shrink-0"><DialogTitle className="flex items-center gap-2">{selectedMetricDetail&&getStatusIcon(selectedMetricDetail.status)}{selectedMetricDetail?.name}</DialogTitle><DialogDescription>{selectedMetricDetail?.agents.join(" & ")}</DialogDescription></DialogHeader>
              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              {selectedMetricDetail&&(metricDetails[selectedMetricDetail.id]||Object.values(metricDetails).find(d=>d.analysis))&&(
                <div className="space-y-3">
                  {/* Summary */}
                  {(() => {
                    // Resolve detail: try exact id match, then name match, then first available
                    const detail = metricDetails[selectedMetricDetail.id]
                      || Object.values(metricDetails).find(d =>
                          selectedMetricDetail.name && d.analysis?.includes(selectedMetricDetail.name.slice(0,2)))
                      || Object.values(metricDetails)[0]
                    if (!detail) return null
                    return (<>
                  <Card className={`p-3 ${getStatusBg(selectedMetricDetail.status)}`}>
                    <p className="text-sm text-muted-foreground">{detail.analysis}</p>
                  </Card>
                  {/* Agent A/B — Double-click to sendchat */}
                  <div className="grid grid-cols-2 gap-3">
                    {detail.agentOpinions.map((op,i)=>(
                      <Card key={i} className="p-3 cursor-pointer hover:ring-1 hover:ring-teal-400 transition-all select-none"
                        title="Double-click to send AI chat"
                        onDoubleClick={()=>{
                          if(!op.opinion) return
                          const msg = "[" + op.agent + " Perspective]\n" + op.opinion
                          setChatMessages(p=>[...p,{role:"user",content:msg}])
                          callAgent("Provide specific improvement suggestions for the following perspective:\n" + msg)
                          setShowMetricDetailDialog(false)
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">{op.agent}</span>
                          {op.confidence > 0 && <Badge variant="outline" className="text-xs">{op.confidence}%</Badge>}
                          <span className="ml-auto text-[9px] text-muted-foreground/50">Double-click to send</span>
                        </div>
                        <p className="text-sm">{op.opinion}</p>
                      </Card>
                    ))}
                  </div>
                  {/* Debate — double-click any block to send to chat */}
                  {detail.debate && (() => {
                    const d = detail.debate!
                    return (
                      <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-teal-500/20 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600"/>
                          <span className="text-xs font-semibold text-teal-700">Agent Debate</span>
                          <span className="ml-auto text-[9px] text-muted-foreground/50">Double-click any block to send</span>
                        </div>
                        {d.agentA.opinion && (
                          <div className="px-3 py-2 border-b border-teal-500/10 cursor-pointer hover:bg-blue-500/5 transition-colors select-none"
                            title="Double-click to send AI chat"
                            onDoubleClick={()=>{
                              const msg = "[Debate " + d.agentA.name + "]\n" + d.agentA.opinion
                              setChatMessages(p=>[...p,{role:"user",content:msg}])
                              callAgent("Provide specific improvement suggestions for the following Debate position:\n" + msg)
                              setShowMetricDetailDialog(false)
                            }}
                          >
                            <p className="text-[10px] font-semibold text-blue-600 mb-0.5">{d.agentA.name}</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{d.agentA.opinion}</p>
                          </div>
                        )}
                        {d.agentB.opinion && (
                          <div className="px-3 py-2 border-b border-teal-500/10 cursor-pointer hover:bg-violet-500/5 transition-colors select-none"
                            title="Double-click to send AI chat"
                            onDoubleClick={()=>{
                              const msg = "[Debate " + d.agentB.name + "]\n" + d.agentB.opinion
                              setChatMessages(p=>[...p,{role:"user",content:msg}])
                              callAgent("Provide specific improvement suggestions for the following Debate position:\n" + msg)
                              setShowMetricDetailDialog(false)
                            }}
                          >
                            <p className="text-[10px] font-semibold text-violet-600 mb-0.5">{d.agentB.name}</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{d.agentB.opinion}</p>
                          </div>
                        )}
                        {d.consensus && (
                          <div className="px-3 py-2 bg-teal-500/10 cursor-pointer hover:bg-teal-500/20 transition-colors select-none"
                            title="Double-click to send AI chat"
                            onDoubleClick={()=>{
                              const msg = "[Debate Conclusion]\n" + d.consensus
                              setChatMessages(p=>[...p,{role:"user",content:msg}])
                              callAgent("Based on the following Debate conclusion, provide final improvement steps:\n" + msg)
                              setShowMetricDetailDialog(false)
                            }}
                          >
                            <p className="text-[10px] font-semibold text-teal-700 mb-0.5">Conclusion</p>
                            <p className="text-sm text-teal-800 whitespace-pre-wrap">{d.consensus}</p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={()=>setShowMetricDetailDialog(false)} className="bg-transparent">Close</Button>
                    <Button><CheckCircle2 className="w-4 h-4 mr-2"/>Confirmed</Button>
                  </div>
                  </>)
                  })()}
                </div>
              )}
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}