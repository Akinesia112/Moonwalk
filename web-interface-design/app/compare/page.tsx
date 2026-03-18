"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  SlidersHorizontal, AlertCircle, CheckCircle2, ArrowLeftRight, LayoutList, Maximize2,
  Flag, MessageSquare, Send, ChevronRight, ChevronDown, ChevronUp,
  Bot, ZoomIn, ZoomOut, RotateCcw, Sparkles, Loader2, Save, ImageIcon, Upload, X as XIcon,
} from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { RefCard, CATEGORY_COLOR, IMPORTANCE_COLOR } from "@/components/ref-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
const PROJECT_ID = "proj_001"

const SS = {
  get: (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v) } catch {} },
}

function stripMd(t: string) {
  return t
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/^#{1,6} /gm, "")
    .trim()
}

type DeltaItem = { id: string; type: string; severity: string; detail: string }
type ArtItem = { id: string; name: string; image: string; category?: string; importance?: string; usage?: string; note?: string; artworkId?: string }
type ChatMsg = { role: string; content: string }

export default function ComparePage() {
  const [compareMode, setCompareMode] = useState("split")
  const [sliderValue, setSliderValue] = useState([50])
  const [selectedArtwork, setSelectedArtwork] = useState(0)
  const [selectedRef, setSelectedRef] = useState(0)
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: "ai", content: "您好！我是對照比較助手。\n\n選擇 Artwork 和 Reference 後，我會分析差異。\n\n勾選差距清單項目後，我會自動針對該差異進行追問。" },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [checkedDeltas, setCheckedDeltas] = useState<string[]>([])
  const [artworkZoom, setArtworkZoom] = useState(1)
  const [refZoom, setRefZoom] = useState(1)
  const [deltaAnnotations, setDeltaAnnotations] = useState<Record<string, string>>({})
  const [savedAnnotationIds, setSavedAnnotationIds] = useState<Set<string>>(new Set())
  const [expandedAnnotation, setExpandedAnnotation] = useState<string | null>(null)
  const [compareSubmitted, setCompareSubmitted] = useState(false)
  const [deltaAnalyzing, setDeltaAnalyzing] = useState(false)
  const [leftPanelMode, setLeftPanelMode] = useState<"expand" | "browse">("expand")

  // Vertical resize center (viewer vs delta list)
  const [topH, setTopH] = useState(55)
  const vDragRef = useRef<{ startY: number; startH: number } | null>(null)

  // Vertical resize left panel (artworks vs references)
  const [leftTopH, setLeftTopH] = useState(50)
  const leftVDragRef = useRef<{ startY: number; startH: number } | null>(null)

  // Horizontal resize (left/right panels)
  const [leftW, setLeftW] = useState(500)
  const [rightW, setRightW] = useState(700)
  const hDragRef = useRef<{ side: "left" | "right"; startX: number; startW: number } | null>(null)

  // Delta detail dialog
  const [deltaDialog, setDeltaDialog] = useState<DeltaItem | null>(null)
  const [deltaDialogText, setDeltaDialogText] = useState("")
  const [deltaDialogLoading, setDeltaDialogLoading] = useState(false)

  const chatScrollRef = useRef<HTMLDivElement>(null)
  const artworkFileInputRef = useRef<HTMLInputElement>(null)
  const refFileInputRef = useRef<HTMLInputElement>(null)
  const artUploadRef = useRef<HTMLInputElement>(null)
  const refUploadRef = useRef<HTMLInputElement>(null)

  // ── Data ──────────────────────────────────────────────────────
  const [artworks, setArtworks] = useState<ArtItem[]>([])
  const [allRefs, setAllRefs] = useState<ArtItem[]>([])
  const [brief, setBrief] = useState<Record<string, string>>({})
  const [deltas, setDeltas] = useState<DeltaItem[]>([
    { id: "d1", type: "構圖", severity: "medium", detail: "主體位置偏右 15%" },
    { id: "d2", type: "光影", severity: "high", detail: "高光不足，建議增強 rim light" },
    { id: "d3", type: "色調", severity: "low", detail: "暖色調偏弱，建議色溫 -500K" },
  ])

  const fallbackArtworks: ArtItem[] = [
    { id: 0, name: "Shot_005_v04", image: "/vfx-work-in-progress-shot.jpg" },
    { id: 1, name: "Shot_005_v03", image: "/reference-movie-frame.jpg" },
    { id: 2, name: "Shot_012_v02", image: "/composition-reference.jpg" },
    { id: 3, name: "Shot_008_v03", image: "/lighting-setup-reference.png" },
  ]
  const fallbackRefs: ArtItem[] = [
    { id: 0, name: "Lighting Ref", image: "/reference-movie-frame.jpg" },
    { id: 1, name: "Composition Ref", image: "/composition-reference.jpg" },
  ]

  const artworkList = artworks

  // Each artwork sees only its bound refs + unbound refs.
  // "bound to another artwork" refs are hidden.
  const selectedArtworkId = artworkList[selectedArtwork]?.id ?? ""
  const currentRefs = allRefs.filter(r => {
    const rid = r.artworkId ?? ""
    if (!rid) return true                    // empty/unbound → shared, show for all
    if (!selectedArtworkId) return true      // no artwork selected yet → show all
    return rid === selectedArtworkId         // bound → only show for its artwork
  })

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise(resolve => {
      const r = new FileReader()
      r.onload = () => {
        const img = new Image()
        img.onload = () => {
          const MAX = 400
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const c = document.createElement("canvas")
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
          c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height)
          resolve(c.toDataURL("image/jpeg", 0.8))
        }
        img.onerror = () => resolve(r.result as string)
        img.src = r.result as string
      }
      r.onerror = () => resolve("")
      r.readAsDataURL(file)
    })

  const handleArtworkUpload = async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith("image/"))
    if (imgs.length === 0) return
    const newItems = await Promise.all(imgs.map(async (file, i) => ({
      id: `aw_${Date.now()}_${i}`,
      name: file.name.replace(/\.[^.]+$/, ""),
      image: await fileToBase64(file),
    })))
    setArtworks(prev => [...prev, ...newItems])
  }

  const handleRefUpload = async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith("image/"))
    if (imgs.length === 0) return
    const newItems = await Promise.all(imgs.map(async (file, i) => ({
      id: `ref_${Date.now()}_${i}`,
      name: file.name.replace(/\.[^.]+$/, ""),
      image: await fileToBase64(file),
    })))
    setAllRefs(prev => [...prev, ...newItems])
  }

  // ── Load sessionStorage ───────────────────────────────────────
  useEffect(() => {
    try {
      const raw = SS.get("c04_artwork_previews")
      if (raw) {
        const parsed: { id: string; preview: string; name: string }[] = JSON.parse(raw)
        if (parsed.length > 0)
          setArtworks(parsed.map(p => ({ id: p.id, name: p.name || p.id, image: p.preview })))
      }
    } catch {}
    try {
      // Build a merged map: c04_ref_previews + refhub_refs, deduplicated by id
      const refMap: Record<string, ArtItem> = {}
      const ar = SS.get("c04_ref_previews")
      if (ar) JSON.parse(ar).forEach((r: any, i: number) => {
        refMap[r.id ?? i] = {
          id: r.id ?? String(i),
          name: r.title || r.id,
          image: r.preview || "",
          category: r.category || "",
          importance: r.label || r.importance || "Secondary",
          usage: r.usage || "",
          note: r.note || "",
          artworkId: r.artworkId || "",
        }
      })
      // refhub_refs may have newer metadata — override/supplement
      const hr = SS.get("refhub_refs")
      if (hr) JSON.parse(hr).forEach((r: any, i: number) => {
        const existing = refMap[r.id]
        if (existing) {
          // update metadata, keep preview from c04 if refhub has none
          refMap[r.id] = {
            ...existing,
            image: r.preview || existing.image,
            category: r.category || existing.category || "",
            importance: r.importance || (r.is_pinned ? "Main" : (existing.importance || "Secondary")),
            usage: r.usage || existing.usage || "",
            note: r.note || existing.note || "",
            artworkId: r.artworkId || existing.artworkId || "",
          }
        } else if (r.preview) {
          refMap[r.id] = {
            id: r.id,
            name: r.title || r.id,
            image: r.preview,
            category: r.category || "",
            importance: r.importance || (r.is_pinned ? "Main" : "Secondary"),
            usage: r.usage || "",
            note: r.note || "",
            artworkId: r.artworkId || "",
          }
        }
      })
      let list = Object.values(refMap)
      // Filter using explicit deleted_ref_ids (set by removeRef in reference-hub)
      try {
        const deletedIds = new Set(JSON.parse(SS.get("deleted_ref_ids") || "[]"))
        if (deletedIds.size > 0) list = list.filter(r => !deletedIds.has(String(r.id)))
      } catch {}
      if (list.length > 0) setAllRefs(list)
    } catch {}
    try { const b = SS.get("kickoff_brief"); if (b) setBrief(JSON.parse(b)) } catch {}
    try { const c = SS.get("compare_chat"); if (c) setChatMessages(JSON.parse(c)) } catch {}
    try { const a = SS.get("compare_annotations"); if (a) setDeltaAnnotations(JSON.parse(a)) } catch {}
    try {
      const a = SS.get("c04_analysis")
      if (a) {
        const analysis = JSON.parse(a)
        if (analysis.metrics?.length > 0) {
          setDeltas(analysis.metrics
            .filter((m: any) => m.status !== "green")
            .map((m: any, i: number) => ({
              id: `m${i}`,
              type: m.name,
              severity: m.status === "red" ? "high" : m.status === "yellow" ? "medium" : "low",
              detail: m.agentA?.opinion || m.debate?.conclusion || `${m.name} 與 Reference 存在差距`,
            })))
        }
      }
    } catch {}
  }, [])

  // Reset ref selection when artwork changes (different artwork = different ref set)
  useEffect(() => { setSelectedRef(0) }, [selectedArtwork])

  useEffect(() => { SS.set("compare_chat", JSON.stringify(chatMessages)) }, [chatMessages])
  useEffect(() => { chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chatMessages, chatLoading])

  // ── Drag handlers ─────────────────────────────────────────────
  const startLeftVDrag = (e: React.MouseEvent) => {
    leftVDragRef.current = { startY: e.clientY, startH: leftTopH }
    const move = (ev: MouseEvent) => {
      if (!leftVDragRef.current) return
      const col = document.getElementById("left-col")
      if (!col) return
      const totalH = col.getBoundingClientRect().height
      const d = ev.clientY - leftVDragRef.current.startY
      setLeftTopH(Math.max(15, Math.min(85, leftVDragRef.current.startH + (d / totalH) * 100)))
    }
    const up = () => { leftVDragRef.current = null; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up)
  }

  const startHDrag = (side: "left" | "right") => (e: React.MouseEvent) => {
    hDragRef.current = { side, startX: e.clientX, startW: side === "left" ? leftW : rightW }
    const move = (ev: MouseEvent) => {
      if (!hDragRef.current) return
      const d = ev.clientX - hDragRef.current.startX
      const nw = Math.max(120, Math.min(500, hDragRef.current.startW + (hDragRef.current.side === "left" ? d : -d)))
      hDragRef.current.side === "left" ? setLeftW(nw) : setRightW(nw)
    }
    const up = () => { hDragRef.current = null; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up)
  }

  const startVDrag = (e: React.MouseEvent) => {
    vDragRef.current = { startY: e.clientY, startH: topH }
    const move = (ev: MouseEvent) => {
      if (!vDragRef.current) return
      const col = document.getElementById("center-col")
      if (!col) return
      const totalH = col.getBoundingClientRect().height
      const d = ev.clientY - vDragRef.current.startY
      setTopH(Math.max(20, Math.min(80, vDragRef.current.startH + (d / totalH) * 100)))
    }
    const up = () => { vDragRef.current = null; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up)
  }

  // ── Wheel zoom (Ctrl/⌘ + scroll or trackpad pinch) ───────────
  const handleWheel = useCallback(
    (setter: React.Dispatch<React.SetStateAction<number>>) =>
      (e: React.WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return
        e.preventDefault()
        setter(p => Math.max(0.5, Math.min(3, p + (e.deltaY > 0 ? -0.1 : 0.1))))
      },
    []
  )

  // ── Context builder ───────────────────────────────────────────
  const buildCtx = useCallback(() => {
    const parts = [
      artworkList[selectedArtwork] ? `作品：${artworkList[selectedArtwork].name}` : "",
      currentRefs[selectedRef] ? `Reference：${currentRefs[selectedRef].name}` : "",
      Object.entries(brief).filter(([, v]) => v).length > 0
        ? `導演 Spec：\n${Object.entries(brief).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}`
        : "",
    ]
    return parts.filter(Boolean).join("\n\n")
  }, [artworkList, selectedArtwork, currentRefs, selectedRef, brief])

  // ── Agent call ────────────────────────────────────────────────
  const callAgent = useCallback(async (msg: string) => {
    setChatLoading(true)
    try {
      const res = await fetch(`${API}/suggestion/chat/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          message: msg,
          context: buildCtx(),
          history: chatMessages.slice(-6).map(m => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      })
      const data = await res.json()
      setChatMessages(p => [...p, { role: "ai", content: stripMd(data.response || data.reply || "抱歉，無法回應。") }])
    } catch {
      setChatMessages(p => [...p, { role: "ai", content: "連線失敗，請確認後端。" }])
    }
    setChatLoading(false)
  }, [buildCtx, chatMessages])

  const handleChatSend = () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatMessages(p => [...p, { role: "user", content: msg }])
    setChatInput("")
    callAgent(msg)
  }

  // ── Delta check ───────────────────────────────────────────────
  const handleDeltaCheck = (deltaId: string, checked: boolean) => {
    if (checked) {
      setCheckedDeltas(p => [...p, deltaId])
      const delta = deltas.find(d => d.id === deltaId)
      if (delta) {
        setChatMessages(p => [...p, { role: "user", content: `[勾選差距] ${delta.type}：${delta.detail}` }])
        callAgent(`針對差距「${delta.type}: ${delta.detail}」，請給出 2-3 個具體可執行的改進建議。`)
      }
    } else {
      setCheckedDeltas(p => p.filter(id => id !== deltaId))
    }
  }

  // ── Delta double-click dialog ─────────────────────────────────
  const handleDeltaDblClick = useCallback(async (delta: DeltaItem) => {
    setDeltaDialog(delta)
    setDeltaDialogText("")
    setDeltaDialogLoading(true)
    try {
      const res = await fetch(`${API}/suggestion/chat/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          message: `請深入分析「${delta.type}」指標的差距：\n問題描述：${delta.detail}\n\n請給出：（1）具體差距分析（2）可能原因（3）2-3 個具體可操作的改進步驟。`,
          context: buildCtx(),
          history: [],
        }),
      })
      const data = await res.json()
      setDeltaDialogText(stripMd(data.response || data.reply || "分析完成。"))
    } catch {
      setDeltaDialogText("分析失敗，請重試。")
    }
    setDeltaDialogLoading(false)
  }, [buildCtx])

  // ── Analyze all deltas ────────────────────────────────────────
  const handleAnalyzeDeltas = async () => {
    setDeltaAnalyzing(true)
    setChatMessages(p => [...p, { role: "user", content: "[開始差距分析]" }])
    try {
      const res = await fetch(`${API}/suggestion/chat/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          message: "請逐一分析光影、構圖、色彩、材質、景深、曝光、風格一致 7 個指標，找出 Artwork 與 Reference 的具體差距，並給出每個指標的可操作改進建議。",
          context: buildCtx(),
          history: [],
        }),
      })
      const data = await res.json()
      const reply = stripMd(data.response || data.reply || "")
      const METRICS: [string, string][] = [
        ["光影", "high"], ["構圖", "medium"], ["色彩", "medium"],
        ["材質", "low"], ["景深", "low"], ["曝光", "high"], ["風格一致", "medium"],
      ]
      setDeltas(METRICS.map(([name, sev], i) => ({
        id: `a${i}`, type: name, severity: sev,
        detail: reply ? `${name}：已完成 Debate 分析（雙擊查看詳情）` : `${name} 分析完成`,
      })))
      setChatMessages(p => [...p, { role: "ai", content: reply || "差距分析完成，請查看各指標。" }])
    } catch (err) {
      setChatMessages(p => [...p, { role: "ai", content: `分析失敗：${err}` }])
    }
    setDeltaAnalyzing(false)
  }

  // ── Save annotation ───────────────────────────────────────────
  const saveAnnotation = (deltaId: string, text: string) => {
    setDeltaAnnotations(p => {
      const updated = { ...p, [deltaId]: text }
      SS.set("compare_annotations", JSON.stringify(updated))
      return updated
    })
    setSavedAnnotationIds(p => new Set([...p, deltaId]))
  }

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = () => {
    setCompareSubmitted(true)
    setTimeout(() => setCompareSubmitted(false), 2500)
    // Save everything for QA page and session
    const payload = {
      timestamp: new Date().toISOString(),
      artwork: artworkList[selectedArtwork],
      reference: currentRefs[selectedRef],
      allArtworks: artworkList,
      allRefs: currentRefs,
      deltas,
      checkedDeltas: checkedDeltas.map(id => deltas.find(d => d.id === id)).filter(Boolean),
      annotations: deltaAnnotations,
      chatHistory: chatMessages,
    }
    SS.set("compare_report_for_qa", JSON.stringify(payload))
    SS.set("compare_annotations", JSON.stringify(deltaAnnotations))
    SS.set("compare_chat", JSON.stringify(chatMessages))
    setChatMessages(p => [...p, { role: "ai", content: `已儲存！

📁 Artworks：${artworkList.length} 件
🖼 References：${currentRefs.length} 張
📋 差距清單：${deltas.length} 項（勾選 ${checkedDeltas.length} 項）
📝 註解：${Object.keys(deltaAnnotations).length} 條` }])
  }

  const COL_H = "calc(100vh - 200px)"

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="flex">
        <PipelineSidebar />
        <main className="flex-1 overflow-auto">

          {/* Page header */}
          <div className="border-b border-border bg-card">
            <div className="container mx-auto px-6 py-6">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline">C05</Badge>
                <h1 className="text-2xl font-bold">Ref 對照 / 差距比對</h1>
              </div>
              <p className="text-muted-foreground text-sm">選擇 Artwork 和 Reference 進行差距比對</p>
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="flex" style={{ height: COL_H, gap: 0 }}>

              {/* ── LEFT PANEL ── */}
              <div id="left-col" className="shrink-0 flex flex-col" style={{ width: leftW, height: COL_H }}>
                {/* Artworks — top */}
                <div style={{ height: `${leftTopH}%`, minHeight: 0, overflow: "hidden" }}>
                  <Card className="flex flex-col h-full">
                    <CardHeader className="pb-1.5 shrink-0 py-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs flex items-center gap-1.5">
                          Artworks
                          <Badge variant="secondary" className="text-[10px] h-4">{artworkList.length}</Badge>
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant={leftPanelMode==="expand"?"secondary":"ghost"} className="h-6 w-6 p-0" onClick={() => setLeftPanelMode("expand")} title="展開模式"><Maximize2 className="w-3 h-3" /></Button>
                          <Button size="sm" variant={leftPanelMode==="browse"?"secondary":"ghost"} className="h-6 w-6 p-0" onClick={() => setLeftPanelMode("browse")} title="收納模式"><LayoutList className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => artUploadRef.current?.click()} title="上傳 Artwork"><Upload className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <input ref={artUploadRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => {
                        Array.from(e.target.files || []).forEach(file => {
                          const reader = new FileReader()
                          reader.onload = ev => {
                            setArtworks(p => [...p, { id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name: file.name.replace(/\.[^.]+$/, ""), image: ev.target?.result as string }])
                          }
                          reader.readAsDataURL(file)
                        })
                        e.target.value = ""
                      }} />
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0">
                      <ScrollArea className="h-full">
                        <div className="px-3 pb-2 space-y-1.5"
                          onDragOver={e => { e.preventDefault() }}
                          onDrop={e => {
                            e.preventDefault()
                            Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")).forEach(file => {
                              const r = new FileReader(); r.onload = ev => setArtworks(p => [...p, { id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name: file.name.replace(/\.[^.]+$/,""), image: ev.target?.result as string }]); r.readAsDataURL(file)
                            })
                          }}>
                          {artworkList.length === 0 && (
                            <div
                              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => artUploadRef.current?.click()}
                              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary","bg-primary/5") }}
                              onDragLeave={e => e.currentTarget.classList.remove("border-primary","bg-primary/5")}
                              onDrop={e => {
                                e.preventDefault(); e.currentTarget.classList.remove("border-primary","bg-primary/5")
                                Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")).forEach(file => {
                                  const r = new FileReader(); r.onload = ev => setArtworks(p => [...p, { id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name: file.name.replace(/\.[^.]+$/,""), image: ev.target?.result as string }]); r.readAsDataURL(file)
                                })
                              }}
                            >
                              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground opacity-40" />
                              <p className="text-[10px] text-muted-foreground">點擊或拖曳上傳 Artwork</p>
                            </div>
                          )}
                          {artworkList.map((art, idx) => (
                            <div key={art.id} className="relative group">
                              {leftPanelMode === "expand" ? (
                                /* ── Expand mode: large thumbnail card ── */
                                <div
                                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedArtwork === idx ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                                  onClick={() => { setSelectedArtwork(idx); setSelectedRef(0) }}
                                  onDoubleClick={() => { setChatMessages(p => [...p, { role: "user", content: `[討論 Artwork] ${art.name}` }]); callAgent(`請觀察 Artwork「${art.name}」，分析它與目前選取的 Reference 的差距，並給出 2-3 個具體改進建議。`) }}
                                  title="雙擊匯入對話框討論"
                                >
                                  <div className="aspect-video bg-muted overflow-hidden relative">
                                    {art.image && <img src={art.image} alt={art.name} className="w-full h-full object-cover" />}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                      <span className="opacity-0 group-hover:opacity-100 text-white text-[9px] bg-black/60 px-1.5 py-0.5 rounded-full">雙擊討論</span>
                                    </div>
                                  </div>
                                  <div className="p-1.5"><p className="text-[10px] font-medium truncate">{art.name}</p></div>
                                </div>
                              ) : (
                                /* ── Browse mode: compact row ── */
                                <div
                                  className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${selectedArtwork === idx ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent"}`}
                                  onClick={() => { setSelectedArtwork(idx); setSelectedRef(0) }}
                                  onDoubleClick={() => { setChatMessages(p => [...p, { role: "user", content: `[討論 Artwork] ${art.name}` }]); callAgent(`請觀察 Artwork「${art.name}」，分析它與目前選取的 Reference 的差距，並給出 2-3 個具體改進建議。`) }}
                                  title="雙擊匯入對話框討論"
                                >
                                  <div className="w-10 h-7 rounded overflow-hidden shrink-0 bg-muted">
                                    {art.image && <img src={art.image} alt={art.name} className="w-full h-full object-cover" />}
                                  </div>
                                  <span className="text-[10px] font-medium flex-1 truncate">{art.name}</span>
                                </div>
                              )}
                              <button
                                className="absolute top-1 right-1 w-4 h-4 bg-black/70 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={e => { e.stopPropagation(); setArtworks(p => p.filter(a => a.id !== art.id)) }}
                              >
                                <XIcon className="w-2.5 h-2.5 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Left vertical drag handle */}
                <div
                  className="h-2 shrink-0 cursor-row-resize hover:bg-primary/30 rounded transition-colors my-0.5"
                  onMouseDown={startLeftVDrag}
                />

                {/* References — bottom */}
                <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                  <Card className="flex flex-col h-full">
                    <CardHeader className="pb-1.5 shrink-0 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CardTitle className="text-xs shrink-0">References</CardTitle>
                          <Badge variant="secondary" className="text-[10px] h-4 shrink-0">{currentRefs.length}</Badge>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => refUploadRef.current?.click()} title="上傳 Reference">
                          <Upload className="w-3 h-3" />
                        </Button>
                        {/* mode toggle is shared — no separate toggle needed; ref list mirrors artwork mode */}
                      </div>
                      <input ref={refUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
                        Array.from(e.target.files || []).forEach(file => {
                          const reader = new FileReader()
                          reader.onload = ev => {
                            setAllRefs(p => [...p, { id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name: file.name.replace(/\.[^.]+$/, ""), image: ev.target?.result as string }])
                          }
                          reader.readAsDataURL(file)
                        })
                        e.target.value = ""
                      }} />
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0">
                      <ScrollArea className="h-full">
                        <div className="px-3 pb-2 space-y-1.5"
                          onDragOver={e => { e.preventDefault() }}
                          onDrop={e => {
                            e.preventDefault()
                            Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")).forEach(file => {
                              const r = new FileReader(); r.onload = ev => setAllRefs(p => [...p, { id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name: file.name.replace(/\.[^.]+$/,""), image: ev.target?.result as string }]); r.readAsDataURL(file)
                            })
                          }}>
                          {currentRefs.filter(ref => !!ref.image).length === 0 && (
                            <div
                              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
                              onClick={() => refUploadRef.current?.click()}
                              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-amber-500","bg-amber-500/5") }}
                              onDragLeave={e => e.currentTarget.classList.remove("border-amber-500","bg-amber-500/5")}
                              onDrop={e => {
                                e.preventDefault(); e.currentTarget.classList.remove("border-amber-500","bg-amber-500/5")
                                Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")).forEach(file => {
                                  const r = new FileReader(); r.onload = ev => setAllRefs(p => [...p, { id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name: file.name.replace(/\.[^.]+$/,""), image: ev.target?.result as string }]); r.readAsDataURL(file)
                                })
                              }}
                            >
                              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground opacity-40" />
                              <p className="text-[10px] text-muted-foreground">點擊或拖曳上傳 Reference</p>
                            </div>
                          )}
                          {currentRefs.filter(ref => !!ref.image).map((ref, rIdx) => (
                            leftPanelMode === "browse" ? (
                              /* ── Browse mode: compact ref row ── */
                              <div key={ref.id}
                                className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${selectedRef === rIdx ? "bg-amber-500/10 border border-amber-500/30" : "hover:bg-muted border border-transparent"}`}
                                onClick={() => setSelectedRef(rIdx)}
                                onDoubleClick={() => { setChatMessages(p => [...p, { role: "user", content: `[討論 Reference] ${ref.name}${ref.category ? ` (${ref.category})` : ""}` }]); callAgent(`請分析 Reference「${ref.name}」與目前 Artwork 的差距。`) }}
                              >
                                <div className="w-10 h-7 rounded overflow-hidden shrink-0 bg-muted relative">
                                  {ref.image && <img src={ref.image} alt={ref.name} className="w-full h-full object-cover" />}
                                  {ref.category && <span className={`absolute top-0 left-0 text-[7px] font-semibold px-1 rounded-br leading-tight ${CATEGORY_COLOR[ref.category] ?? "bg-white/80 text-gray-800"}`}>{ref.category}</span>}
                                </div>
                                <span className="text-[10px] flex-1 truncate">{ref.name}</span>
                                {ref.importance && <span className={`text-[8px] px-1 py-0.5 rounded ${IMPORTANCE_COLOR[ref.importance] ? IMPORTANCE_COLOR[ref.importance] : "bg-muted"}`}>{ref.importance}</span>}
                              </div>
                            ) : (
                              /* ── Expand mode: RefCard ── */
                              <div
                                key={ref.id}
                                className={`rounded-xl transition-all ${selectedRef === rIdx ? "ring-2 ring-amber-500 ring-offset-1" : "hover:ring-1 hover:ring-amber-500/50"}`}
                                onClick={() => setSelectedRef(rIdx)}
                              >
                              <RefCard
                                data={{
                                  id: String(ref.id),
                                  title: ref.name,
                                  preview: ref.image,
                                  category: ref.category,
                                  importance: ref.importance ?? "Secondary",
                                  usage: ref.usage,
                                  note: ref.note,
                                }}
                                artworkOptions={artworks.map(a => ({ id: a.id, name: a.name }))}
                                onChange={updated => {
                                  setAllRefs(p => p.map(r => r.id === ref.id ? {
                                    ...r,
                                    category: updated.category,
                                    importance: updated.importance,
                                    usage: updated.usage,
                                    note: updated.note,
                                    artworkId: updated.artworkId,
                                  } : r))
                                }}
                                onDelete={() => { setAllRefs(p => p.filter(r => r.id !== ref.id)); if (selectedRef >= rIdx) setSelectedRef(Math.max(0, selectedRef - 1)) }}
                                onDiscuss={d => {
                                  setChatMessages(p => [...p, { role: "user", content: `[討論 Reference] ${d.title}${d.category ? ` (${d.category})` : ""}${d.note ? `
備注：${d.note}` : ""}` }])
                                  callAgent(`請分析 Reference「${d.title}」${d.category ? `（${d.category}）` : ""}的視覺特徵，並找出它與目前選取的 Artwork 之間的主要差距。${d.note ? `備注：${d.note}` : ""}`)
                                }}
                                onSave={updated => {
                                  try {
                                    const cached = JSON.parse(SS.get("refhub_refs") || "[]")
                                    const cacheMap: Record<string, any> = {}
                                    cached.forEach((c: any) => { cacheMap[c.id] = c })
                                    if (cacheMap[String(ref.id)]) {
                                      cacheMap[String(ref.id)] = { ...cacheMap[String(ref.id)], category: updated.category, note: updated.note, importance: updated.importance, usage: updated.usage, artworkId: updated.artworkId }
                                      SS.set("refhub_refs", JSON.stringify(Object.values(cacheMap)))
                                    }
                                    // Also update c04_ref_previews
                                    const ar = JSON.parse(SS.get("c04_ref_previews") || "[]")
                                    const arMap: Record<string, any> = {}
                                    ar.forEach((r: any) => { arMap[r.id] = r })
                                    if (arMap[String(ref.id)]) {
                                      arMap[String(ref.id)] = { ...arMap[String(ref.id)], category: updated.category, note: updated.note, importance: updated.importance, usage: updated.usage, artworkId: updated.artworkId }
                                      SS.set("c04_ref_previews", JSON.stringify(Object.values(arMap)))
                                    }
                                  } catch {}
                                }}
                                showSave={true}
                                className="cursor-pointer"
                              />
                              </div>
                            )
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* ── LEFT DRAG HANDLE ── */}
              <div
                className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/30 rounded transition-colors self-stretch mx-1"
                onMouseDown={startHDrag("left")}
              />

              {/* ── CENTER ── */}
              <div id="center-col" className="flex-1 min-w-0 flex flex-col" style={{ height: COL_H }}>

                {/* Viewer panel */}
                <div style={{ height: `${topH}%`, minHeight: 0, overflow: "hidden" }}>
                  <Card className="h-full flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <Tabs value={compareMode} onValueChange={setCompareMode}>
                          <TabsList>
                            <TabsTrigger value="split">並排</TabsTrigger>
                            <TabsTrigger value="slider">Wipe</TabsTrigger>
                            <TabsTrigger value="side-by-side">重疊</TabsTrigger>
                          </TabsList>
                        </Tabs>
                        <span className="text-xs text-muted-foreground">
                          {artworkList[selectedArtwork]?.name} vs {currentRefs[selectedRef]?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-600 border-blue-500/30">Artwork</Badge>
                          <div className="flex items-center gap-0.5 border rounded-lg px-0.5">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setArtworkZoom(p => Math.max(0.5, p - 0.25))}><ZoomOut className="w-3 h-3" /></Button>
                            <span className="text-[10px] font-medium w-8 text-center">{Math.round(artworkZoom * 100)}%</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setArtworkZoom(p => Math.min(3, p + 0.25))}><ZoomIn className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setArtworkZoom(1)}><RotateCcw className="w-2.5 h-2.5" /></Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] h-5 bg-purple-500/10 text-purple-600 border-purple-500/30">Reference</Badge>
                          <div className="flex items-center gap-0.5 border rounded-lg px-0.5">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRefZoom(p => Math.max(0.5, p - 0.25))}><ZoomOut className="w-3 h-3" /></Button>
                            <span className="text-[10px] font-medium w-8 text-center">{Math.round(refZoom * 100)}%</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRefZoom(p => Math.min(3, p + 0.25))}><ZoomIn className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRefZoom(1)}><RotateCcw className="w-2.5 h-2.5" /></Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-hidden p-2">

                      {/* 並排 */}
                      {compareMode === "split" && (
                        <div className="flex flex-col h-full gap-1">
                          <p className="text-[10px] text-muted-foreground text-center shrink-0">Ctrl/⌘ + 滾輪縮放</p>
                          <div className="flex gap-2 flex-1 min-h-0">
                            <div className="flex-1 min-w-0 relative overflow-hidden bg-neutral-900 rounded" onWheel={handleWheel(setArtworkZoom)}>
                              <Badge className="absolute top-2 left-2 bg-blue-500 z-10 text-xs">Work</Badge>
                              <img
                                src={artworkList[selectedArtwork]?.image || "/placeholder.svg"}
                                alt="Work"
                                className="w-full h-full object-contain"
                                style={{ transform: `scale(${artworkZoom})`, transformOrigin: "center", transition: "transform 0.15s" }}
                              />
                            </div>
                            <div className="w-px bg-border shrink-0" />
                            <div className="flex-1 min-w-0 relative overflow-hidden bg-neutral-900 rounded" onWheel={handleWheel(setRefZoom)}>
                              <Badge className="absolute top-2 right-2 bg-purple-500 z-10 text-xs">Ref</Badge>
                              <img
                                src={currentRefs[selectedRef]?.image || "/placeholder.svg"}
                                alt="Reference"
                                className="w-full h-full object-contain"
                                style={{ transform: `scale(${refZoom})`, transformOrigin: "center", transition: "transform 0.15s" }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Wipe */}
                      {compareMode === "slider" && (
                        <div
                          className="relative w-full h-full overflow-hidden bg-neutral-900 rounded select-none cursor-ew-resize"
                          onMouseMove={e => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setSliderValue([Math.round(((e.clientX - rect.left) / rect.width) * 100)])
                          }}
                        >
                          <img
                            src={currentRefs[selectedRef]?.image || "/placeholder.svg"}
                            alt="Ref"
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                            style={{ transform: `scale(${refZoom})`, transformOrigin: "center" }}
                          />
                          <div
                            className="absolute inset-0 overflow-hidden pointer-events-none"
                            style={{ clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)` }}
                          >
                            <img
                              src={artworkList[selectedArtwork]?.image || "/placeholder.svg"}
                              alt="Work"
                              className="w-full h-full object-contain"
                              style={{ transform: `scale(${artworkZoom})`, transformOrigin: "center" }}
                            />
                          </div>
                          {/* Center-axis drag handle */}
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
                            style={{ left: `${sliderValue[0]}%` }}
                          >
                            <div
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-auto cursor-ew-resize"
                              onMouseDown={e => {
                                e.stopPropagation()
                                const container = (e.currentTarget as HTMLElement).closest(".relative.w-full") as HTMLElement
                                if (!container) return
                                const move = (ev: MouseEvent) => {
                                  const r = container.getBoundingClientRect()
                                  setSliderValue([Math.max(0, Math.min(100, Math.round(((ev.clientX - r.left) / r.width) * 100)))])
                                }
                                const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
                                window.addEventListener("mousemove", move)
                                window.addEventListener("mouseup", up)
                              }}
                            >
                              <ArrowLeftRight className="w-4 h-4 text-gray-600" />
                            </div>
                          </div>
                          <Badge className="absolute top-2 left-2 bg-blue-500 z-20 text-xs">Work</Badge>
                          <Badge className="absolute top-2 right-2 bg-purple-500 z-20 text-xs">Ref</Badge>
                        </div>
                      )}

                      {/* 重疊 */}
                      {compareMode === "side-by-side" && (
                        <div className="flex flex-col h-full gap-2">
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] text-muted-foreground">Work 透明度</span>
                            <input type="range" min={0} max={100} defaultValue={70}
                              className="flex-1 h-1 accent-blue-500"
                              onChange={e => {
                                const el = document.getElementById("overlay-artwork") as HTMLImageElement
                                if (el) el.style.opacity = String(Number(e.target.value) / 100)
                              }} />
                            <span className="text-[10px] text-muted-foreground">Ref 透明度</span>
                            <input type="range" min={0} max={100} defaultValue={50}
                              className="flex-1 h-1 accent-purple-500"
                              onChange={e => {
                                const el = document.getElementById("overlay-ref") as HTMLImageElement
                                if (el) el.style.opacity = String(Number(e.target.value) / 100)
                              }} />
                          </div>
                          <div className="flex-1 min-h-0 relative overflow-hidden bg-neutral-900 rounded" onWheel={e => { handleWheel(setArtworkZoom)(e); handleWheel(setRefZoom)(e) }}>
                            <div className="relative w-full h-full">
                              <img
                                id="overlay-ref"
                                src={currentRefs[selectedRef]?.image || "/placeholder.svg"}
                                alt="Ref"
                                className="w-full h-full object-contain"
                                style={{ opacity: 0.5, transform: `scale(${refZoom})`, transformOrigin: "center", transition: "transform 0.15s", position: "absolute", inset: 0 }}
                              />
                              <img
                                id="overlay-artwork"
                                src={artworkList[selectedArtwork]?.image || "/placeholder.svg"}
                                alt="Work"
                                className="w-full h-full object-contain"
                                style={{ opacity: 0.7, transform: `scale(${artworkZoom})`, transformOrigin: "center", transition: "transform 0.15s", position: "absolute", inset: 0 }}
                              />
                            </div>
                            <Badge className="absolute top-2 left-2 bg-blue-500 z-10 text-xs" style={{ opacity: 0.9 }}>Work</Badge>
                            <Badge className="absolute top-2 right-2 bg-purple-500 z-10 text-xs" style={{ opacity: 0.9 }}>Ref</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground text-center shrink-0">Ctrl/⌘ + 滾輪縮放</p>
                        </div>
                      )}

                    </CardContent>
                  </Card>
                </div>

                {/* Vertical drag handle */}
                <div
                  className="h-2 shrink-0 cursor-row-resize hover:bg-primary/30 rounded transition-colors my-0.5"
                  onMouseDown={startVDrag}
                />

                {/* Delta list panel */}
                <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                  <Card className="h-full flex flex-col">
                    <CardHeader className="pb-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" />差距清單 Delta List
                          </CardTitle>
                          <CardDescription className="text-xs">勾選差距項目會自動送入對話框追問 · 雙擊查看詳細分析</CardDescription>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1.5 bg-transparent" onClick={handleAnalyzeDeltas} disabled={deltaAnalyzing}>
                          {deltaAnalyzing
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />分析中</>
                            : <><Sparkles className="w-3.5 h-3.5" />開始分析</>}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 p-0">
                      <ScrollArea className="h-full">
                        <div className="px-6 pb-4 space-y-3">
                          {deltas.map(delta => (
                            <div
                              key={delta.id}
                              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50"
                            >
                              <Checkbox
                                id={`delta-${delta.id}`}
                                checked={checkedDeltas.includes(delta.id)}
                                onCheckedChange={c => handleDeltaCheck(delta.id, c as boolean)}
                                className="mt-1"
                                onClick={e => e.stopPropagation()}
                              />
                              <div className="mt-0.5">
                                {delta.severity === "high"
                                  ? <AlertCircle className="w-4 h-4 text-red-400" />
                                  : delta.severity === "medium"
                                  ? <AlertCircle className="w-4 h-4 text-amber-400" />
                                  : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 cursor-pointer" onDoubleClick={() => handleDeltaDblClick(delta)} title="雙擊查看詳細分析">
                                  <Badge variant="outline" className="text-xs">{delta.type}</Badge>
                                  <Badge
                                    variant={delta.severity === "high" ? "destructive" : delta.severity === "medium" ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {delta.severity === "high" ? "高" : delta.severity === "medium" ? "中" : "低"}
                                  </Badge>
                                  <span className="text-[9px] text-muted-foreground">(雙擊分析)</span>
                                </div>
                                <p className="text-sm">{delta.detail}</p>
                                <div className="mt-2 pt-2 border-t border-dashed space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost" size="sm" className="h-7 text-xs text-amber-600"
                                      onClick={e => {
                                        e.stopPropagation()
                                        setChatMessages(p => [...p, { role: "user", content: `[跟導演討論] ${delta.type}：${delta.detail}` }])
                                        callAgent(`請幫我整理「${delta.type}」的問題報告，準備上報給導演：問題描述、嚴重程度、建議討論方向。`)
                                      }}
                                    >
                                      <Flag className="w-3 h-3 mr-1" />跟導演討論
                                    </Button>
                                    <Button
                                      variant="ghost" size="sm" className="h-7 text-xs"
                                      onClick={e => { e.stopPropagation(); setExpandedAnnotation(expandedAnnotation === delta.id ? null : delta.id) }}
                                    >
                                      <MessageSquare className="w-3 h-3 mr-1" />
                                      {expandedAnnotation === delta.id ? "收起註解" : "寫註解"}
                                    </Button>
                                    {deltaAnnotations[delta.id] && expandedAnnotation !== delta.id && (
                                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                        {deltaAnnotations[delta.id]}
                                      </span>
                                    )}
                                  </div>
                                  {expandedAnnotation === delta.id && (
                                    <div className="space-y-1" onClick={e => e.stopPropagation()}>
                                      <Textarea
                                        placeholder="輸入註解..."
                                        value={deltaAnnotations[delta.id] || ""}
                                        onChange={e => { setDeltaAnnotations(p => ({ ...p, [delta.id]: e.target.value })); setSavedAnnotationIds(p => { const n = new Set(p); n.delete(delta.id); return n }) }}
                                        rows={3}
                                        className="text-sm"
                                      />
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm" variant="outline" className="h-6 text-xs gap-1 bg-transparent"
                                          onClick={() => saveAnnotation(delta.id, deltaAnnotations[delta.id] || "")}
                                        >
                                          <Save className="w-3 h-3" />儲存
                                        </Button>
                                        {savedAnnotationIds.has(delta.id) && (
                                          <span className="text-[10px] text-green-600">✓ 已儲存</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Submit row */}
                <div className="flex items-center justify-end gap-3 shrink-0 pt-2">
                  <Button
                    size="lg"
                    className={compareSubmitted ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    onClick={handleSubmit}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {compareSubmitted ? "Submitted" : "Submit"}
                  </Button>
                  <Button size="lg" variant="outline" className="bg-transparent" asChild>
                    <a href="/qa">
                      Supervisor: Jump to QA
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>

              </div>

              {/* ── RIGHT DRAG HANDLE ── */}
              <div
                className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/30 rounded transition-colors self-stretch mx-1"
                onMouseDown={startHDrag("right")}
              />

              {/* ── RIGHT PANEL ── */}
              <div className="shrink-0" style={{ width: rightW, height: COL_H }}>
                <Card className="border-teal-500/30 flex flex-col h-full">
                  <Collapsible open={chatbotOpen} onOpenChange={setChatbotOpen} className="flex flex-col flex-1 min-h-0">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-teal-600" />
                            <div>
                              <CardTitle className="text-base">AI 比對助手</CardTitle>
                              <CardDescription className="text-xs">勾選差距自動追問</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">{chatMessages.length}</Badge>
                            {chatbotOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex-1 min-h-0 flex flex-col">
                      <CardContent className="pt-0 flex-1 min-h-0 flex flex-col">
                        <ScrollArea className="flex-1 min-h-0 mb-4">
                          <div className="space-y-4 pr-2">
                            {chatMessages.map((msg, idx) => (
                              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className={msg.role === "ai" ? "bg-teal-500/10 text-teal-600" : "bg-primary/10"}>
                                    {msg.role === "ai" ? <Bot className="w-4 h-4" /> : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`rounded-lg p-3 max-w-[85%] min-w-0 break-words ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                                </div>
                              </div>
                            ))}
                            {chatLoading && (
                              <div className="flex gap-3">
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className="bg-teal-500/10 text-teal-600">
                                    <Bot className="w-4 h-4" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="rounded-lg p-3 bg-muted flex items-center gap-2">
                                  <Loader2 className="w-3 h-3 animate-spin text-teal-500" />
                                  <span className="text-sm text-muted-foreground">分析中…</span>
                                </div>
                              </div>
                            )}
                            <div ref={chatScrollRef} />
                          </div>
                        </ScrollArea>
                        <div className="flex gap-2 flex-wrap mb-3 shrink-0">
                          <Button
                            variant="outline" size="sm" className="text-xs bg-transparent"
                            onClick={() => {
                              setChatMessages(p => [...p, { role: "user", content: "這是刻意的選擇" }])
                              callAgent("Artist 說明這是刻意的藝術選擇，請幫我在報告中標註並給出適當的說明建議。")
                            }}
                          >
                            刻意選擇
                          </Button>
                          <Button
                            variant="outline" size="sm" className="text-xs bg-transparent"
                            onClick={() => {
                              setChatMessages(p => [...p, { role: "user", content: "幫我整理回饋" }])
                              callAgent("請幫我整理目前所有勾選的差距項目，生成一份清晰的回饋摘要，按優先順序排列。")
                            }}
                          >
                            整理回饋
                          </Button>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Input
                            placeholder="輸入問題..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") e.preventDefault() }}
                          />
                          <Button size="icon" onClick={handleChatSend} disabled={chatLoading}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* Delta detail dialog */}
      <Dialog open={!!deltaDialog} onOpenChange={open => { if (!open) setDeltaDialog(null) }}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deltaDialog?.severity === "high"
                ? <AlertCircle className="w-5 h-5 text-red-400" />
                : deltaDialog?.severity === "medium"
                ? <AlertCircle className="w-5 h-5 text-amber-400" />
                : <CheckCircle2 className="w-5 h-5 text-green-400" />}
              {deltaDialog?.type} — 差距分析
            </DialogTitle>
            <DialogDescription>{deltaDialog?.detail}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {deltaDialogLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Agents 正在分析中…
              </div>
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-line bg-muted rounded-lg p-3">
                {deltaDialogText}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="bg-transparent" onClick={() => setDeltaDialog(null)}>關閉</Button>
              {deltaDialog && (
                <Button onClick={() => {
                  const msg = `請針對「${deltaDialog.type}」差距給出更詳細的修改步驟`
                  setChatMessages(p => [...p, { role: "user", content: msg }])
                  callAgent(msg)
                  setDeltaDialog(null)
                }}>
                  <Sparkles className="w-4 h-4 mr-1.5" />問 Agent
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}