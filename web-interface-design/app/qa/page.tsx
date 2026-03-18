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
                {noteDialogRef.note || "（無備注）"}
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
  const [leftW, setLeftW] = useState(300)
  const [rightW, setRightW] = useState(500)
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
  const [showMetrics, setShowMetrics] = useState(false)
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
  const [textInputPos, setTextInputPos] = useState<{x:number;y:number;cssX:number;cssY:number}|null>(null)
  const [textInputValue, setTextInputValue] = useState("")
  const [canvasAnnotations, setCanvasAnnotations] = useState<CanvasAnn[]>([])
  const [selectedAnnIdx, setSelectedAnnIdx] = useState<number|null>(null)
  const undoStackRef = useRef<CanvasAnn[][]>([])
  const [refAnnotations, setRefAnnotations] = useState<CanvasAnn[]>([])
  const [selectedRefAnnIdx, setSelectedRefAnnIdx] = useState<number|null>(null)
  const [activePanel, setActivePanel] = useState<"work"|"ref">("work")
  const refUndoStackRef = useRef<CanvasAnn[][]>([])

  const [qaSubmitted, setQaSubmitted] = useState(false)
  const [leftPanelMode, setLeftPanelMode] = useState<"browse" | "expand">("browse")
  const [noteDialogRef, setNoteDialogRef] = useState<{ name: string; note: string; preview?: string; category?: string; importance?: string } | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  // ── Artwork & Refs from sessionStorage ───────────────────────
  const [artworks, setArtworks] = useState<ArtItem[]>([])
  const artworkFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Build label-grouped refs (Main, Secondary, Lighting, Color, etc)
    const refMap: Record<string, { id: string; name: string; image: string; label: string; category?: string; importance?: string; note?: string; usage?: string }> = {}
    try {
      const ar = SS.get("c04_ref_previews")
      if (ar) JSON.parse(ar).forEach((r: any) => {
        if (r.preview) refMap[r.id] = { id: r.id, name: r.title || r.id, image: r.preview, label: r.importance || r.label || "Secondary", category: r.category || "", importance: r.importance || r.label || "Secondary", note: r.note || "", usage: r.usage || "", artworkId: r.artworkId || "" }
      })
    } catch {}
    try {
      const hr = SS.get("refhub_refs")
      if (hr) JSON.parse(hr).forEach((r: any) => {
        if (!r.preview) return
        const imp = r.importance || (r.is_pinned ? "Main" : (r.category || "Secondary"))
        if (refMap[r.id]) {
          refMap[r.id] = { ...refMap[r.id], image: r.preview || refMap[r.id].image, category: r.category || refMap[r.id].category || "", importance: imp, note: r.note || refMap[r.id].note || "", usage: r.usage || refMap[r.id].usage || "", label: imp, artworkId: r.artworkId || refMap[r.id].artworkId || "" }
        } else {
          refMap[r.id] = { id: r.id, name: r.title || r.id, image: r.preview, label: imp, category: r.category || "", importance: imp, note: r.note || "", usage: r.usage || "", artworkId: r.artworkId || "" }
        }
      })
    } catch {}
    // Filter using explicit deleted_ref_ids
    let labeledRefs = Object.values(refMap)
    try {
      const deletedIds = new Set(JSON.parse(SS.get("deleted_ref_ids") || "[]"))
      if (deletedIds.size > 0) labeledRefs = labeledRefs.filter(r => !deletedIds.has(r.id))
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

          const artworkItems = parsed.map(p => {
            // Refs bound to this artwork specifically
            const boundToThis = allSorted.filter(r => (r as any).artworkId === p.id)

            // Refs with no artworkId — unbound/shared, show for all artworks
            const unbound = allSorted.filter(r => !(r as any).artworkId)

            // Refs bound to OTHER artworks are intentionally excluded
            // to prevent cross-artwork ref contamination
            const refsForThis = [...boundToThis, ...unbound]

            return { id: p.id, name: p.name || p.id, image: p.preview, refs: [...refsForThis] }
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
    try { setArtistNote(SS.get("c04_notes") || "") } catch {}
    try { const b = JSON.parse(SS.get("kickoff_brief") || "{}"); setSupervisorSpec(b.supervisor_spec || "") } catch {}
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
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([
    { id: "ai-1", text: "主體 rim light 不足，需加強", source: "AI", priority: "P0", supplement: "", addressed: false, aiDraft: "建議增強主體的 rim light，讓角色輪廓更加清晰突出，與背景產生更好的層次分離。" },
    { id: "ai-2", text: "色溫偏冷，建議調至 4500K", source: "AI", priority: "P1", supplement: "", addressed: false, aiDraft: "目前畫面色溫偏冷（約 6500K），建議調整至 4500K 左右的暖色調。" },
    { id: "ai-3", text: "構圖比例基本符合，輕微右偏", source: "AI", priority: "P2", supplement: "", addressed: false },
  ])
  const [newAnnotationText, setNewAnnotationText] = useState("")
  const [newFeedbackText, setNewFeedbackText] = useState("")
  const [newFeedbackPriority, setNewFeedbackPriority] = useState("P1")
  const [annotations, setAnnotations] = useState([{ id:"d1", text:"右上角光線需要更柔和", time:"剛剛" }, { id:"d2", text:"前景物件位置偏左", time:"2 分鐘前" }])
  const [labels, setLabels] = useState(["Lighting", "Composition"])
  const [newLabel, setNewLabel] = useState("")
  const [inlineSpecs, setInlineSpecs] = useState(["主光源必須從右側照射", "氛圍要 warm & cozy"])
  const [newSpecText, setNewSpecText] = useState("")
  const [showArtistNotes, setShowArtistNotes] = useState(true)
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const chatScrollRef = useRef<HTMLDivElement>(null)


  useEffect(() => { chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chatMessages])

  // Artist notes from sessionStorage
  const [artistNote, setArtistNote] = useState("")
  const [supervisorSpec, setSupervisorSpec] = useState("")

  // ── Brief/Specs ───────────────────────────────────────────────
  const BRIEF_LABELS: Record<string, string> = {
    project_name: "專案名稱", client: "客戶", director: "導演", supervisor: "Supervisor",
    confidentiality: "密等", selling_points: "產品賣點", keywords: "情緒關鍵詞",
    restrictions: "禁忌事項", style: "風格關鍵字", mood: "色調/氛圍",
    worldview: "世界觀", supervisor_spec: "Supervisor Spec",
  }

  const directorSpecs = (() => {
    try {
      const b = JSON.parse(SS.get("kickoff_brief") || "{}")
      const items = Object.entries(b)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `${BRIEF_LABELS[k] || k}：${v}`)
      return { items, technical: [], priorities: [] }
    } catch {
      return { items: [], technical: [], priorities: [] }
    }
  })()

  const currentArt = artworks[selectedArtwork]
  const currentRef = currentArt?.refs[selectedRef]

  // ── Metrics ───────────────────────────────────────────────────
  const metrics = [
    { id:"composition", name:"構圖", status:"red", agents:["Composition_J","Composition_K"], consensus:false, refBasis:"Reference #2", supervisorNote:"建議參考非對稱構圖" },
    { id:"lighting", name:"光影", status:"yellow", agents:["Light_J","Light_K"], consensus:true, refBasis:"Reference #1", supervisorNote:"補光強度微調" },
    { id:"color", name:"色彩", status:"green", agents:["Color_J","Color_K"], consensus:true, refBasis:"Spec", supervisorNote:null },
    { id:"texture", name:"材質", status:"green", agents:["Texture_J","Texture_K"], consensus:true, refBasis:"Reference #3", supervisorNote:null },
    { id:"motion", name:"動態", status:"yellow", agents:["Motion_J","Motion_K"], consensus:false, refBasis:"Spec", supervisorNote:"模糊程度確認" },
    { id:"depth", name:"景深", status:"green", agents:["Depth_J","Depth_K"], consensus:true, refBasis:"Spec", supervisorNote:null },
    { id:"exposure", name:"曝光", status:"red", agents:["Exposure_J","Exposure_K"], consensus:true, refBasis:"Reference #1", supervisorNote:"優先修正" },
    { id:"style", name:"風格", status:"green", agents:["Style_J","Style_K"], consensus:true, refBasis:"Spec", supervisorNote:null },
  ]
  type MetricDetail = { analysis: string; suggestions: string[]; agentOpinions: { agent: string; opinion: string; confidence: number }[]; debate?: { agentA: {name:string;opinion:string;severity:string}; agentB: {name:string;opinion:string;severity:string}; consensus: string } }
  const metricDetails: Record<string, MetricDetail> = {
    composition: { analysis:"構圖重心偏左 15%", suggestions:["主體右移 10-15%","調整留白","參考 Ref #2"], agentOpinions:[{agent:"Composition_J",opinion:"不符合三分法",confidence:85},{agent:"Composition_K",opinion:"動態構圖邊緣案例",confidence:72}], debate:{agentA:{name:"Composition_J",opinion:"偏左",severity:"high"},agentB:{name:"Composition_K",opinion:"動態構圖可接受",severity:"medium"},consensus:"是否嚴格遵循三分法"} },
    lighting: { analysis:"補光不足，陰影過重", suggestions:["左側補光 +20%","色溫 4800K"], agentOpinions:[{agent:"Light_J",opinion:"偏暗",confidence:88},{agent:"Light_K",opinion:"色溫輕微",confidence:82}] },
    exposure: { analysis:"高光過曝 clipping 8%", suggestions:["曝光 -0.5 stops","漸層濾鏡"], agentOpinions:[{agent:"Exposure_J",opinion:"過曝",confidence:95},{agent:"Exposure_K",opinion:"高光損失",confidence:93}] },
  }

  const getStatusIcon = (s: string) => s==="red" ? <AlertCircle className="w-4 h-4 text-red-500"/> : s==="yellow" ? <AlertTriangle className="w-4 h-4 text-amber-500"/> : <CheckCircle2 className="w-4 h-4 text-green-500"/>
  const getStatusBg = (s: string) => s==="red" ? "bg-red-500/10 border-red-500/30" : s==="yellow" ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"
  const isMetricMentioned = (id: string) => ["composition","lighting","color","exposure"].includes(id)

  // ── Agent chat ────────────────────────────────────────────────
  const callAgent = useCallback(async (msg: string) => {
    setChatLoading(true)
    const ctx = `作品：${currentArt?.name || ""}\nReference：${currentRef?.name || ""}`
    try {
      const res = await fetch(`${API}/suggestion/chat/analysis`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: PROJECT_ID, message: msg, context: ctx, history: chatMessages.slice(-6).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })) }),
      })
      const data = await res.json()
      setChatMessages(p => [...p, { role: "ai", content: stripMd(data.response || data.reply || "抱歉，無法回應。") }])
    } catch {
      setChatMessages(p => [...p, { role: "ai", content: "連線失敗，請確認後端。" }])
    }
    setChatLoading(false)
  }, [currentArt, currentRef, chatMessages])

  const handleMetricCheck = (metricId: string, checked: boolean) => {
    if (checked) {
      setCheckedMetrics(p => [...p, metricId])
      const metric = metrics.find(m => m.id === metricId)
      const detail = metric ? metricDetails[metricId] : null
      if (metric && detail) {
        setFeedbackItems(p => [...p, { id:`metric-${Date.now()}`, text:`[${metric.name}] ${detail.analysis}. 建議：${detail.suggestions.join("、")}`, source:"AI", priority: metric.status==="red"?"P0":metric.status==="yellow"?"P1":"P2", supplement:"", addressed:false }])
      }
      if (metric) {
        const msg = `[勾選 Metric] ${metric.name} (${metric.status==="red"?"紅燈":metric.status==="yellow"?"黃燈":"綠燈"}) - ${metric.refBasis}`
        setChatMessages(p => [...p, { role:"user", content: msg }])
        callAgent(`請分析「${metric.name}」指標的問題並給出具體改進建議。${detail ? `分析：${detail.analysis}` : ""}`)
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
    const msg = `請分析以下 ${feedbackItems.length} 筆回饋並給出優先處理順序和具體建議：\n${feedbackItems.map(f => `[${f.priority}] ${f.text}`).join("\n")}`
    setChatMessages(p => [...p, { role:"user", content:"[AI 分析回饋]" }])
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

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isRef = activePanel === "ref"
    const annotations = isRef ? refAnnotations : canvasAnnotations
    if (canvasTool === "pointer") {
      const pos = isRef ? getRefCanvasPos(e) : getCanvasPos(e)
      const idx = annotations.map((a, i) => ({ a, i })).reverse().find(({ a }) => hitTest(a, pos.x, pos.y))?.i ?? null
      isRef ? setSelectedRefAnnIdx(idx) : setSelectedAnnIdx(idx)
      return
    }
    if (canvasTool==="text") {
      const p = isRef ? getRefCanvasPos(e) : getCanvasPos(e)
      setTextInputPos({x:p.x,y:p.y,cssX:p.cssX,cssY:p.cssY})
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
      if (ctx&&drawingRef.current.length>1) { ctx.strokeStyle=brushColor; ctx.lineWidth=brushSize; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.beginPath(); const prev=drawingRef.current[drawingRef.current.length-2]; ctx.moveTo(prev.x,prev.y); ctx.lineTo(pos.x,pos.y); ctx.stroke() }
    } else if (canvasTool==="eraser") {
      drawingRef.current.push(pos); const activeRef = activePanel==="ref"; const ctx=(activeRef?refCanvasRef:canvasRef).current?.getContext("2d")
      if (ctx) { ctx.globalCompositeOperation="destination-out"; ctx.lineWidth=brushSize*3; ctx.lineCap="round"; if(drawingRef.current.length>1){const prev=drawingRef.current[drawingRef.current.length-2]; ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(pos.x,pos.y); ctx.stroke()}; ctx.globalCompositeOperation="source-over" }
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
    const props = { color: brushColor, fillColor, opacity: brushOpacity, lineWidth: brushSize }
    const push = isRef
      ? (fn: (p: CanvasAnn[]) => CanvasAnn[]) => { refUndoStackRef.current = [...refUndoStackRef.current.slice(-20), [...refAnnotations]]; setRefAnnotations(fn) }
      : (fn: (p: CanvasAnn[]) => CanvasAnn[]) => { undoStackRef.current = [...undoStackRef.current.slice(-20), [...canvasAnnotations]]; setCanvasAnnotations(fn) }
    if (canvasTool==="brush" && drawingRef.current.length>1)
      push(p=>[...p,{type:"brush",points:[...drawingRef.current],...props}])
    else if (canvasTool==="eraser" && drawingRef.current.length>1)
      push(p=>[...p,{type:"eraser",points:[...drawingRef.current],color:"white",lineWidth:brushSize*2,opacity:1}])
    else if (canvasTool==="circle" && shapeStartRef.current)
      push(p=>[...p,{type:"circle",points:[{...shapeStartRef.current!},{...pos}],...props}])
    else if (canvasTool==="rect" && shapeStartRef.current)
      push(p=>[...p,{type:"rect",points:[{...shapeStartRef.current!},{...pos}],...props}])
    drawingRef.current=[]; shapeStartRef.current=null
  }
  const handleTextSubmit = () => {
    if (textInputPos&&textInputValue.trim()) {
      const ann = {type:"text",text:textInputValue,x:textInputPos.x,y:textInputPos.y,color:brushColor,opacity:brushOpacity,lineWidth:brushSize,fontSize:textFontSize,font:textFont,bold:textBold,italic:textItalic} as any
      if (activePanel === "ref") { refUndoStackRef.current = [...refUndoStackRef.current.slice(-20), [...refAnnotations]]; setRefAnnotations(p=>[...p,ann]) }
      else { undoStackRef.current = [...undoStackRef.current.slice(-20), [...canvasAnnotations]]; setCanvasAnnotations(p=>[...p,ann]) }
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
    {id:"pointer",icon:MousePointer,label:"選擇"},{id:"brush",icon:PenTool,label:"畫筆"},
    {id:"circle",icon:Circle,label:"圓形"},{id:"rect",icon:Square,label:"矩形"},
    {id:"text",icon:Type,label:"文字"},{id:"eraser",icon:Eraser,label:"橡皮擦"},
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
                        <Button size="sm" variant={leftPanelMode==="browse"?"secondary":"ghost"} className="h-6 w-6 p-0" onClick={() => setLeftPanelMode("browse")} title="收納瀏覽模式"><LayoutList className="w-3 h-3" /></Button>
                        <Button size="sm" variant={leftPanelMode==="expand"?"secondary":"ghost"} className="h-6 w-6 p-0" onClick={() => setLeftPanelMode("expand")} title="展開模式"><Maximize2 className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => artworkFileRef.current?.click()} title="上傳 Artwork"><Upload className="w-3 h-3" /></Button>
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
                            <p className="text-xs text-muted-foreground">點擊或拖曳上傳圖片</p>
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
                                  onDoubleClick={e => { e.stopPropagation(); setChatMessages(p => [...p, { role:"user", content: `[討論 Artwork] ${art.name}` }]); callAgent(`請觀察這張 Artwork「${art.name}」，分析它與 Reference 的差距，給出具體改進建議。`) }}
                                  title="雙擊匯入對話框討論"
                                >
                                  <div className="aspect-video bg-muted overflow-hidden relative">
                                    {art.image && <img src={art.image} alt={art.name} className="w-full h-full object-cover" />}
                                  </div>
                                  <div className="p-1.5 flex items-center justify-between">
                                    <p className="text-[10px] font-medium truncate">{art.name}</p>
                                    <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${expandedArtwork===idx?'rotate-180':''}`} onClick={e => { e.stopPropagation(); setExpandedArtwork(expandedArtwork===idx?null:idx) }} />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* ── Browse mode: compact row ── */
                              <div
                                className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${selectedArtwork===idx ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'}`}
                                onClick={() => { setSelectedArtwork(idx); setSelectedRef(0); setExpandedArtwork(expandedArtwork===idx?null:idx) }}
                                onDoubleClick={e => { e.stopPropagation(); setChatMessages(p => [...p, { role:"user", content: `[討論 Artwork] ${art.name}` }]); callAgent(`請觀察這張 Artwork「${art.name}」，分析它與 Reference 的差距，給出具體改進建議。`) }}
                                title="雙擊匯入對話框討論"
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
                                          setChatMessages(p => [...p, { role:"user", content: `[討論 Reference] ${ref.name}${ref.category ? ` (${ref.category})` : ""}${ref.note ? `
備注：${ref.note}` : ""}` }])
                                          callAgent(`請分析 Reference「${ref.name}」${ref.category ? `（${ref.category}）` : ""}的視覺特徵，以及它對當前 Artwork 的參考價值。${ref.note ? `Artist 備注：${ref.note}` : ""}`)
                                        }}
                                        title="雙擊匯入對話框討論｜備注按鈕查看備注"
                                      >
                                        <img src={ref.image} alt={ref.name} className="w-full h-full object-cover" />
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
                                            title="點擊查看備注"
                                          >
                                            <FileText className="w-2 h-2" />備注
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
                <Card className="flex flex-col flex-1 min-h-0 border-teal-500/30 overflow-hidden">
                  <CardHeader className="pb-1 shrink-0 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-sm"><PenTool className="w-4 h-4 text-teal-600" />Supervisor Review Canvas</CardTitle>
                        <CardDescription className="text-[10px] mt-0.5">整合 Specs、作品、Reference，可直接圈選標註</CardDescription>
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
                            <span>邊線</span>
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
                            <span>填色</span>
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
                            <span>粗細 {brushSize}</span>
                          </button>
                          {showSizeDD && (
                            <div className="absolute top-8 left-0 z-50 bg-card border rounded-lg shadow-lg p-3 w-48">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px]">粗細</span>
                                <input type="number" min={1} max={15} value={brushSize} className="w-12 h-6 text-xs border rounded px-1 text-center" onKeyDown={e=>e.stopPropagation()} onChange={e => { const v=Number(e.target.value); if(!isNaN(v)) setBrushSize(Math.max(1,Math.min(15,v))) }} />
                              </div>
                              <input type="range" min={1} max={15} step={1} value={brushSize} className="w-full accent-primary" onChange={e => setBrushSize(Number(e.target.value))} />
                            </div>
                          )}
                        </div>
                        {/* Opacity popover */}
                        <div className="relative">
                          <button type="button" className="flex items-center gap-1 px-1.5 h-7 rounded border text-[9px] hover:bg-muted" onClick={() => { setShowOpacityDD(p=>!p); setShowStrokeDD(false); setShowFillDD(false); setShowSizeDD(false) }}>
                            <span>透明 {Math.round(brushOpacity*100)}%</span>
                          </button>
                          {showOpacityDD && (
                            <div className="absolute top-8 left-0 z-50 bg-card border rounded-lg shadow-lg p-3 w-48">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px]">透明度</span>
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
                          <span className="text-[9px] text-muted-foreground">字號</span>
                          <input type="number" min={8} max={120} value={textFontSize} className="w-10 h-6 text-xs border rounded px-1 text-center" onKeyDown={e=>e.stopPropagation()} onChange={e=>{const v=Number(e.target.value);if(!isNaN(v)&&v>0)setTextFontSize(Math.max(8,Math.min(120,v)))}} />
                          <button type="button" className={`h-6 w-6 rounded text-xs font-bold border transition-colors ${textBold?'bg-primary text-primary-foreground':'hover:bg-muted'}`} onClick={()=>setTextBold(p=>!p)}>B</button>
                          <button type="button" className={`h-6 w-6 rounded text-xs italic border transition-colors ${textItalic?'bg-primary text-primary-foreground':'hover:bg-muted'}`} onClick={()=>setTextItalic(p=>!p)}>I</button>
                        </>)}
                        <div className="w-px h-5 bg-border mx-1" />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="復原上一步" onClick={() => {
                          if (activePanel==="ref") { const prev=refUndoStackRef.current.pop(); if(prev!==undefined) setRefAnnotations(prev) }
                          else { const prev=undoStackRef.current.pop(); if(prev!==undefined) setCanvasAnnotations(prev) }
                        }}><Undo2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="全部清除" onClick={() => {
                          if (activePanel==="ref") { refUndoStackRef.current=[...refUndoStackRef.current.slice(-20),[...refAnnotations]]; setRefAnnotations([]) }
                          else { undoStackRef.current=[...undoStackRef.current.slice(-20),[...canvasAnnotations]]; setCanvasAnnotations([]) }
                        }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        <div className="w-px h-5 bg-border mx-0.5" />
                        <Button variant="default" size="sm" className="h-7 px-2 text-[10px] gap-1 bg-teal-600 hover:bg-teal-700 text-white" title="下載標註圖" onClick={() => {
                          const canvas = canvasRef.current
                          const img = canvasContainerRef.current?.querySelector("img") as HTMLImageElement | null
                          if (!canvas || !img) return
                          const off = document.createElement("canvas")
                          off.width = canvas.width; off.height = canvas.height
                          const ctx = off.getContext("2d")!
                          ctx.drawImage(img, 0, 0, off.width, off.height)
                          ctx.drawImage(canvas, 0, 0)
                          const link = document.createElement("a"); link.download = `${currentArt?.name||"review"}_annotated.png`; link.href = off.toDataURL("image/png"); document.body.appendChild(link); link.click(); document.body.removeChild(link)
                        }}>
                          <Save className="w-3.5 h-3.5" />儲存圖片
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
                        <Button variant={showRefsRow?"default":"outline"} size="sm" className={`h-6 text-[10px] gap-0.5 ${!showRefsRow?'bg-transparent':''}`} onClick={() => setShowRefsRow(!showRefsRow)}><ImageIcon className="w-3 h-3" />Refs</Button>
                        <Button variant={showFeedbackPanel?"default":"outline"} size="sm" className={`h-6 text-[10px] gap-0.5 whitespace-nowrap ${!showFeedbackPanel?'bg-transparent':''}`} onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}><MessageSquare className="w-3 h-3" />回饋清單</Button>
                      </div>
                    </div>

                    {/* Refs Row */}
                    {showRefsRow && currentArt?.refs && (
                      <div className="shrink-0 border-b bg-muted/20 px-3 py-1.5">
                        <ScrollArea className="w-full">
                          <div className="flex items-center gap-2 pb-2">
                            <span className="text-[10px] text-muted-foreground shrink-0">References:</span>
                            {currentArt.refs.filter(r=>r.image).map((ref,rIdx) => (
                              <div key={ref.id} className={`shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedRef===rIdx?'border-amber-500 ring-1 ring-amber-500/30':'border-border hover:border-amber-500/50'}`} onClick={() => setSelectedRef(rIdx)} onDoubleClick={e => { e.stopPropagation(); setChatMessages(p => [...p, { role:"user", content: `[討論 Reference] ${ref.name}${ref.note ? `
備注：${ref.note}` : ""}` }]); callAgent(`請分析 Reference「${ref.name}」的視覺特徵與對當前 Artwork 的參考價值。${ref.note ? `備注：${ref.note}` : ""}`) }}>
                                <div className="w-20 h-14 bg-muted overflow-hidden relative">
                                  <img src={ref.image} alt={ref.name} className="w-full h-full object-cover" />
                                  {ref.category && <span className={`absolute top-0.5 left-0.5 text-[7px] font-semibold px-1 py-0 rounded-full shadow-sm leading-tight ${CATEGORY_COLOR[ref.category] ?? "bg-white/80 text-gray-800"}`}>{ref.category}</span>}
                                  {ref.importance && <span className={`absolute top-0.5 right-0.5 text-[7px] font-semibold px-1 py-0 rounded-full shadow-sm border leading-tight ${IMPORTANCE_COLOR[ref.importance] ?? "bg-white/80 text-gray-700 border-gray-300"}`}>{ref.importance}</span>}
                                  {ref.note && <button className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5 bg-black/60 hover:bg-black/80 text-white text-[7px] px-1 py-0 rounded-full leading-tight" onClick={e => { e.stopPropagation(); setNoteDialogRef({ name: ref.name, note: ref.note!, preview: ref.image, category: ref.category, importance: ref.importance }) }}><FileText className="w-1.5 h-1.5" />備注</button>}
                                </div>
                                <div className="px-1.5 py-0.5 bg-card"><p className="text-[9px] font-medium truncate">{ref.name}</p></div>
                              </div>
                            ))}
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    )}

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
                                  {/* Layer 3: text input overlay */}
                                  {textInputPos && (
                                    <div className="absolute z-20" style={{left:textInputPos.cssX, top:textInputPos.cssY}}>
                                      <Input autoFocus value={textInputValue}
                                        onChange={e=>setTextInputValue(e.target.value)}
                                        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handleTextSubmit()}if(e.key==="Escape"){setTextInputPos(null);setTextInputValue("")}}}
                                        onBlur={handleTextSubmit}
                                        className="text-sm h-8 w-52 bg-white/95 text-black border-2 border-teal-500 shadow-lg"
                                        placeholder="輸入標註文字，Enter 確認..."
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-white/40 text-xs text-center"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>選擇 Artwork</p></div>
                              )}
                            </div>
                            <Badge className="absolute top-2 left-2 bg-blue-500 text-[10px] h-5 z-10 pointer-events-none">Work</Badge>
                            <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/50 whitespace-nowrap pointer-events-none">Ctrl/⌘ + 滾輪縮放</p>
                          </div>
                          <div className="w-px bg-white/30 shrink-0" />
                          {/* Reference: img + canvas overlay, same as artwork */}
                          <div className="flex-1 relative overflow-hidden" onWheel={handleWheel(setRefZoom)}>
                            <div className="absolute inset-0 flex items-center justify-center">
                              {currentRef?.image ? (
                                <div className="relative" style={{transform:`scale(${refZoom/100})`,transformOrigin:"center center"}} onMouseEnter={() => setActivePanel("ref")} onMouseLeave={() => setActivePanel("work")}>
                                  <img
                                    src={currentRef.image} alt="Reference" crossOrigin="anonymous"
                                    style={{display:"block", maxWidth:"100%", maxHeight:"100%"}}
                                    onLoad={e => { const img=e.currentTarget; const canvas=refCanvasRef.current; if(canvas){canvas.width=img.naturalWidth;canvas.height=img.naturalHeight}; redrawRefCanvas() }}
                                  />
                                  <canvas ref={refCanvasRef}
                                    className="absolute inset-0 w-full h-full"
                                    style={{cursor:canvasTool==="pointer"?"pointer":canvasTool==="text"?"text":canvasTool==="eraser"?"cell":"crosshair"}}
                                    onMouseDown={e => { setActivePanel("ref"); setShowStrokeDD(false);setShowFillDD(false);setShowSizeDD(false);setShowOpacityDD(false); handleCanvasMouseDown(e) }}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={e => { if(isDrawingRef.current) handleCanvasMouseUp(e); setActivePanel("work") }}
                                  />
                                  {textInputPos && activePanel==="ref" && (
                                    <div className="absolute z-20" style={{left:textInputPos.cssX, top:textInputPos.cssY}}>
                                      <Input autoFocus value={textInputValue}
                                        onChange={e=>setTextInputValue(e.target.value)}
                                        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handleTextSubmit()}if(e.key==="Escape"){setTextInputPos(null);setTextInputValue("")}}}
                                        onBlur={handleTextSubmit}
                                        className="text-sm h-8 w-52 bg-white/95 text-black border-2 border-amber-500 shadow-lg"
                                        placeholder="輸入標註文字，Enter 確認..."
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-white/40 text-xs text-center"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>選擇 Reference</p></div>
                              )}
                            </div>
                            <Badge className="absolute top-2 right-2 bg-amber-500 text-[10px] h-5">Ref</Badge>
                            <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/50 whitespace-nowrap">Ctrl/⌘ + 滾輪縮放</p>
                          </div>
                        </div>

                      </div>

                      {/* Feedback Panel */}
                      {showFeedbackPanel && (
                        <div className="w-56 border-l flex flex-col shrink-0 bg-card overflow-hidden">
                          <div className="flex items-center justify-between px-2 py-1 border-b shrink-0">
                            <div className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-teal-600" /><span className="text-[10px] font-semibold">回饋清單</span><Badge variant="secondary" className="text-[8px] h-3.5">{feedbackItems.filter(f=>!f.addressed).length} 待處理</Badge></div>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShowFeedbackPanel(false)}><X className="w-3 h-3" /></Button>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/20 shrink-0">
                            <Bot className="w-3 h-3 text-teal-600" /><span className="text-[9px] font-semibold">AI 分析結果</span>
                            <Badge variant="destructive" className="text-[7px] h-3 px-0.5">{feedbackItems.filter(f=>f.priority==="P0").length} High</Badge>
                            <Badge className="text-[7px] h-3 px-0.5 bg-amber-500">{feedbackItems.filter(f=>f.priority==="P1").length} Med</Badge>
                            <Badge variant="secondary" className="text-[7px] h-3 px-0.5">{feedbackItems.filter(f=>f.priority==="P2").length} Low</Badge>
                          </div>
                          <ScrollArea className="flex-1 min-h-0">
                            <div className="p-1.5 space-y-1.5">
                              {sortedFeedback.map(item => {
                                const priorityColors = {P0:"border-red-500/30 bg-red-500/5",P1:"border-amber-500/30 bg-amber-500/5",P2:"border-green-500/30 bg-green-500/5"}
                                const priorityIcon = item.priority==="P0"?<AlertCircle className="w-2.5 h-2.5 text-red-500"/>:item.priority==="P1"?<AlertTriangle className="w-2.5 h-2.5 text-amber-500"/>:<CheckCircle2 className="w-2.5 h-2.5 text-green-500"/>
                                return (
                                  <div key={item.id} className={`p-1.5 rounded border ${priorityColors[item.priority as keyof typeof priorityColors]||"border-border"} ${item.addressed?'opacity-40':''}`}>
                                    <div className="flex items-start gap-1 mb-0.5">
                                      {priorityIcon}
                                      <Badge variant="outline" className="text-[7px] h-3 px-0.5 shrink-0">{item.priority}</Badge>
                                      {item.source==="AI"&&<Badge variant="outline" className="text-[7px] h-3 px-0.5 bg-teal-500/10 text-teal-600 border-teal-500/30 gap-0.5"><Bot className="w-2 h-2"/>AI</Badge>}
                                      <div className="flex-1"/>
                                      <Button variant="ghost" size="sm" className="h-3.5 w-3.5 p-0 text-green-600" onClick={() => toggleAddressed(item.id)}><CheckCircle2 className="w-2.5 h-2.5"/></Button>
                                      <Button variant="ghost" size="sm" className="h-3.5 w-3.5 p-0 text-red-500" onClick={() => setFeedbackItems(p=>p.filter(f=>f.id!==item.id))}><X className="w-2.5 h-2.5"/></Button>
                                    </div>
                                    <p className="text-[9px] leading-relaxed">{item.text}</p>
                                    {item.aiDraft&&<div className="p-1 mt-1 rounded bg-teal-500/10 border border-teal-500/20"><div className="flex items-center gap-0.5 mb-0.5"><Sparkles className="w-2 h-2 text-teal-600"/><span className="text-[7px] font-semibold text-teal-700">AI 潤稿版本</span></div><p className="text-[8px] text-teal-800 leading-relaxed">{item.aiDraft}</p></div>}
                                  </div>
                                )
                              })}
                            </div>
                          </ScrollArea>
                          <div className="p-1.5 border-t shrink-0">
                            <div className="flex gap-1">
                              <Input placeholder="新增回饋..." value={newFeedbackText} onChange={e=>setNewFeedbackText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newFeedbackText.trim()){setFeedbackItems(p=>[...p,{id:`dir-${Date.now()}`,text:newFeedbackText,source:"Supervisor",priority:newFeedbackPriority,supplement:"",addressed:false}]);setNewFeedbackText("")}}} className="text-[10px] h-6 flex-1"/>
                              <Button size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => {if(newFeedbackText.trim()){setFeedbackItems(p=>[...p,{id:`dir-${Date.now()}`,text:newFeedbackText,source:"Supervisor",priority:newFeedbackPriority,supplement:"",addressed:false}]);setNewFeedbackText("")}}}><Plus className="w-3 h-3"/></Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Annotations + Labels + Specs */}
                    <div className="border-t shrink-0 overflow-hidden" style={{maxHeight:'350px'}}>
                      <ScrollArea className="h-full">
                        <div className="divide-y">
                          <div className="px-3 py-1">
                            <h4 className="text-[10px] font-semibold mb-0.5">新增註解</h4>
                            <div className="flex gap-1 mb-0.5">
                              <Input placeholder="輸入導演註解..." value={newAnnotationText} onChange={e=>setNewAnnotationText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newAnnotationText.trim()){setAnnotations(p=>[...p,{id:`ann-${Date.now()}`,text:newAnnotationText,time:"剛剛"}]);setNewAnnotationText("")}}} className="text-[10px] h-5"/>
                              <Button size="sm" className="h-5 w-5 p-0 shrink-0" onClick={() => {if(newAnnotationText.trim()){setAnnotations(p=>[...p,{id:`ann-${Date.now()}`,text:newAnnotationText,time:"剛剛"}]);setNewAnnotationText("")}}}><Plus className="w-2.5 h-2.5"/></Button>
                            </div>
                            {annotations.length>0&&<div className="space-y-0">{annotations.map(ann=><div key={ann.id} className="flex items-center justify-between"><div className="flex items-center gap-1"><Tag className="w-2 h-2 text-teal-600"/><span className="text-[8px]">{ann.text}</span></div><span className="text-[7px] text-muted-foreground">{ann.time}</span></div>)}</div>}
                          </div>
                          <div className="px-3 py-1">
                            <div className="flex items-center gap-1 mb-0.5"><Tag className="w-2.5 h-2.5"/><h4 className="text-[10px] font-semibold">Labels</h4></div>
                            <div className="flex items-center gap-1 flex-wrap mb-0.5">{labels.map((label,i)=><Badge key={i} variant="outline" className="text-[8px] gap-0.5 h-3.5">{label}<button type="button" onClick={()=>setLabels(p=>p.filter((_,j)=>j!==i))} className="ml-0.5 hover:text-red-500"><X className="w-1.5 h-1.5"/></button></Badge>)}</div>
                            <div className="flex gap-1"><Input placeholder="新增 Label..." value={newLabel} onChange={e=>setNewLabel(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newLabel.trim()){setLabels(p=>[...p,newLabel]);setNewLabel("")}}} className="text-[10px] h-5"/><Button size="sm" className="h-5 w-5 p-0 shrink-0" onClick={()=>{if(newLabel.trim()){setLabels(p=>[...p,newLabel]);setNewLabel("")}}}><Plus className="w-2 h-2"/></Button></div>
                          </div>
                          <div className="px-3 py-1">
                            <div className="flex items-center gap-1 mb-0.5"><FileCheck className="w-2.5 h-2.5"/><h4 className="text-[10px] font-semibold">Specs</h4></div>
                            {inlineSpecs.length>0&&<div className="space-y-0 mb-0.5">{inlineSpecs.map((spec,i)=><div key={i} className="flex items-center justify-between"><div className="flex items-center gap-1"><CheckCircle2 className="w-2 h-2 text-teal-500"/><span className="text-[8px]">{spec}</span></div><button type="button" onClick={()=>setInlineSpecs(p=>p.filter((_,j)=>j!==i))} className="text-muted-foreground hover:text-red-500"><X className="w-2 h-2"/></button></div>)}</div>}
                            <div className="flex gap-1"><Input placeholder="新增 Spec..." value={newSpecText} onChange={e=>setNewSpecText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newSpecText.trim()){setInlineSpecs(p=>[...p,newSpecText]);setNewSpecText("")}}} className="text-[10px] h-5"/><Button size="sm" className="h-5 w-5 p-0 shrink-0" onClick={()=>{if(newSpecText.trim()){setInlineSpecs(p=>[...p,newSpecText]);setNewSpecText("")}}}><Plus className="w-2 h-2"/></Button></div>
                          </div>
                          <div className="px-3 py-1.5 border-t bg-teal-500/5">
                            <Button size="sm" className="w-full h-7 text-xs gap-1" onClick={() => {
                              const summary = [`[Canvas Review Submit]`,`文字註解 (${annotations.length}): ${annotations.map(a=>a.text).join("; ")}`,`Labels: ${labels.join(", ")}`,`Specs: ${inlineSpecs.join("; ")}`,`畫筆標記: ${canvasAnnotations.filter(a=>a.type==="brush").length} 筆`,`圈選/框選: ${canvasAnnotations.filter(a=>a.type==="circle"||a.type==="rect").length} 個`].filter(Boolean).join("\n")
                              setChatMessages(p=>[...p,{role:"user",content:summary}])
                              callAgent(summary)
                            }}><Send className="w-3 h-3"/>Submit All to Agent</Button>
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>

                {/* Scrollable bottom section */}
                <div className="shrink-0 flex flex-col gap-1">
                {/* Multi-Agent Metrics */}
                <Collapsible open={showMetrics} onOpenChange={setShowMetrics}>
                  <Card className="shrink-0 mt-1">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 py-1.5 px-3">
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
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-2 px-3">
                        <div className="grid grid-cols-4 gap-1">
                          {metrics.map(m => (
                            <div key={m.id} className={`p-1.5 rounded-lg ${getStatusBg(m.status)} ${isMetricMentioned(m.id)?"border-2":"border border-dashed"} cursor-pointer`} onClick={()=>{setSelectedMetricDetail(m);setShowMetricDetailDialog(true)}}>
                              <div className="flex items-center gap-1">
                                <Checkbox checked={checkedMetrics.includes(m.id)} onCheckedChange={c=>handleMetricCheck(m.id,c as boolean)} className="h-3 w-3" onClick={e=>e.stopPropagation()}/>
                                {getStatusIcon(m.status)}
                                <span className="text-[10px] font-medium">{m.name}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 ml-4">
                                <Badge variant="outline" className="text-[7px] h-3 px-0.5">{m.refBasis}</Badge>
                                {!m.consensus&&<Badge variant="outline" className="text-[7px] h-3 px-0.5 bg-amber-500/10 text-amber-600">分歧</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Artist Notes */}
                <Collapsible open={showArtistNotes} onOpenChange={setShowArtistNotes}>
                  <Card className="shrink-0 mt-1 border-indigo-500/30 bg-indigo-500/5">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 py-1.5 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-indigo-600"/><CardTitle className="text-xs">Artist Creation Intentions</CardTitle><Badge variant="outline" className="text-[8px] h-3.5 bg-indigo-500/10 text-indigo-600 border-indigo-500/30">C03</Badge></div>
                          {showArtistNotes?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-2 px-3">
                        {(artistNote || supervisorSpec) ? (
                          <div className="space-y-2">
                            {artistNote&&<div><div className="flex items-center gap-1 mb-1"><User className="w-2.5 h-2.5 text-indigo-600"/><span className="text-[9px] font-semibold text-indigo-700">Artist Reflection Notes</span></div><div className="p-1.5 rounded bg-background border text-[9px] leading-relaxed whitespace-pre-line">{artistNote}</div></div>}
                            {supervisorSpec&&<div><div className="flex items-center gap-1 mb-1"><FileCheck className="w-2.5 h-2.5 text-indigo-600"/><span className="text-[9px] font-semibold text-indigo-700">Supervisor Spec</span></div><div className="p-1.5 rounded bg-background border text-[9px] leading-relaxed">{supervisorSpec}</div></div>}
                          </div>
                        ) : <p className="text-[10px] text-muted-foreground py-2">尚無 Artist 反思記錄</p>}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </div>

                </div>{/* end scrollable bottom */}
              {/* RIGHT DRAG HANDLE */}
              <div className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/30 rounded transition-colors self-stretch mx-1" onMouseDown={startHDrag("right")} />

              {/* RIGHT: AI Assistant */}
              <div className="shrink-0 flex flex-col" style={{ width: rightW, height: COL_HEIGHT }}>
                <Card className="border-teal-500/30 flex flex-col flex-1 min-h-0">
                  <CardHeader className="pb-1 shrink-0 py-2">
                    <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-teal-600"/><div><CardTitle className="text-xs">AI 助手</CardTitle><CardDescription className="text-[10px]">AI 調整語氣風格輸出</CardDescription></div></div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 flex flex-col p-0">
                    <ScrollArea className="flex-1 min-h-0">
                      <div className="px-3 py-2 space-y-2.5">
                        {chatMessages.length===0&&<div className="text-center py-6 text-muted-foreground"><Bot className="w-6 h-6 mx-auto mb-2 opacity-30"/><p className="text-[10px]">直接在下方對話，或勾選 Metric 自動追問</p></div>}
                        {chatMessages.map((msg,idx)=>(
                          <div key={idx} className={`flex gap-2 ${msg.role==='user'?'flex-row-reverse':''}`}>
                            <Avatar className="w-6 h-6 shrink-0"><AvatarFallback className={msg.role==='ai'?'bg-teal-500/10 text-teal-600':'bg-primary/10'}>{msg.role==='ai'?<Bot className="w-3 h-3"/>:'D'}</AvatarFallback></Avatar>
                            <div className={`rounded-lg p-2 max-w-[85%] min-w-0 break-words ${msg.role==='ai'?'bg-muted':'bg-primary text-primary-foreground'}`}><p className="text-[10px] whitespace-pre-line leading-relaxed">{msg.content}</p></div>
                          </div>
                        ))}
                        {chatLoading&&<div className="flex gap-2"><Avatar className="w-6 h-6 shrink-0"><AvatarFallback className="bg-teal-500/10 text-teal-600"><Bot className="w-3 h-3"/></AvatarFallback></Avatar><div className="rounded-lg p-2 bg-muted flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-teal-500"/><span className="text-[10px] text-muted-foreground">分析中…</span></div></div>}
                        <div ref={chatScrollRef}/>
                      </div>
                    </ScrollArea>
                    <div className="px-3 py-2 border-t space-y-1.5 shrink-0">
                      <div className="flex items-center gap-1.5"><span className="text-[9px] text-muted-foreground shrink-0">語氣風格:</span>
                        <Select value={toneStyle} onValueChange={setToneStyle}><SelectTrigger className="h-5 text-[9px] flex-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="professional">專業正式</SelectItem><SelectItem value="gentle">溫和鼓勵</SelectItem><SelectItem value="direct">簡潔直接</SelectItem><SelectItem value="detailed">詳細解釋</SelectItem></SelectContent></Select>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={()=>{setChatMessages(p=>[...p,{role:"user",content:"釐清模糊詞"}]);callAgent("請釐清回饋清單中的模糊描述，提供可量化的具體建議。")}}>釐清模糊詞</Button>
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={()=>{setChatMessages(p=>[...p,{role:"user",content:"轉成可操作建議"}]);callAgent("請將目前的回饋轉為可立即執行的操作步驟，附上具體數值。")}}>轉建議</Button>
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={handleAnalyzeFeedback} disabled={analyzingFeedback}><Sparkles className="w-2.5 h-2.5 mr-0.5"/>{analyzingFeedback?"...":"AI 分析"}</Button>
                      </div>
                      <div className="flex gap-1.5">
                        <Input placeholder="輸入問題..." className="text-[10px] h-7" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') e.preventDefault()}}/>
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
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle className="flex items-center gap-2">{selectedMetricDetail&&getStatusIcon(selectedMetricDetail.status)}{selectedMetricDetail?.name}</DialogTitle><DialogDescription>{selectedMetricDetail?.agents.join(" & ")}</DialogDescription></DialogHeader>
              {selectedMetricDetail&&metricDetails[selectedMetricDetail.id]&&(
                <div className="space-y-4">
                  <Card className={`p-4 ${getStatusBg(selectedMetricDetail.status)}`}><p className="text-sm text-muted-foreground">{metricDetails[selectedMetricDetail.id].analysis}</p></Card>
                  <div className="grid grid-cols-2 gap-3">{metricDetails[selectedMetricDetail.id].agentOpinions.map((op,i)=><Card key={i} className="p-3"><span className="text-xs text-muted-foreground">{op.agent}</span><Badge variant="outline" className="text-xs ml-2">{op.confidence}%</Badge><p className="text-sm mt-1">{op.opinion}</p></Card>)}</div>
                  {metricDetails[selectedMetricDetail.id].debate&&<div className="p-2 bg-teal-500/10 rounded text-sm text-teal-700"><strong>Debate:</strong> {metricDetails[selectedMetricDetail.id].debate!.consensus}</div>}
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setShowMetricDetailDialog(false)} className="bg-transparent">關閉</Button><Button><CheckCircle2 className="w-4 h-4 mr-2"/>已確認</Button></div>
                </div>
              )}
              {selectedMetricDetail&&!metricDetails[selectedMetricDetail.id]&&<div className="p-4 text-center text-muted-foreground">資料尚未載入</div>}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}