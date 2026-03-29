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

// Delete backend ref/artwork (fire-and-forget, local state takes priority)
async function deleteItem(type: "references" | "artworks", id: string) {
  try {
    await fetch(`${API}/search/${type}/${encodeURIComponent(id)}`, { method: "DELETE" })
  } catch {}
}

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

const COMPARE_METRICS: { id: string; name: string }[] = [
  { id: "light", name: "Lighting" },
  { id: "composition", name: "Composition" },
  { id: "sketch", name: "Sketch/Lines" },
  { id: "color", name: "Color" },
  { id: "style", name: "Style Consistency" },
  { id: "percept", name: "Perceptual Quality" },
  { id: "faithfulness", name: "Spec Faithfulness" },
  { id: "control", name: "Controllability" },
  { id: "robustness", name: "Stability" },
  { id: "efficiency", name: "Efficiency" },
  { id: "stability", name: "Consistency" },
]

type MetricResult = {
  id: string; name: string; score: number; disagreement: number
  agentA: { name: string; score: number; opinion: string }
  agentB: { name: string; score: number; opinion: string }
  debate?: { positionA: string; positionB: string; conclusion: string }
  status: "red" | "yellow" | "green"
}

function scoreToStatus(score: number, dis: number): "red" | "yellow" | "green" {
  if (score < 0.45 || dis > 0.30) return "red"
  if (score < 0.65) return "yellow"
  return "green"
}

export default function ComparePage() {
  const [compareMode, setCompareMode] = useState("split")
  const [sliderValue, setSliderValue] = useState([50])
  const [selectedArtwork, setSelectedArtwork] = useState(0)
  const [selectedRef, setSelectedRef] = useState(0)
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: "ai", content: "Hello! I'm the Comparison Assistant.\n\nOnce you select an Artwork and Reference, I'll analyze the differences.\n\nChecking items in the gap list will trigger automatic follow-up questions." },
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
  const [autoAnalyzing, setAutoAnalyzing] = useState(false)
  const [deltaListOpen, setDeltaListOpen] = useState(true)
  const [metrics, setMetrics] = useState<MetricResult[]>([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsStatus, setMetricsStatus] = useState("")
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)
  // Pre-computed debate results keyed by delta.id — shown instantly on double-click
  const [deltaDebateCache, setDeltaDebateCache] = useState<Record<string, string>>({})
  const [leftPanelMode, setLeftPanelMode] = useState<"expand" | "browse">("expand")

  // Vertical resize center (viewer vs delta list)
  const [topH, setTopH] = useState(55)
  const vDragRef = useRef<{ startY: number; startH: number } | null>(null)

  // Vertical resize left panel (artworks vs references)
  const [leftTopH, setLeftTopH] = useState(50)
  const leftVDragRef = useRef<{ startY: number; startH: number } | null>(null)

  // Horizontal resize (left/right panels)
  const [leftW, setLeftW] = useState(400)
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
  const [deltas, setDeltas] = useState<DeltaItem[]>([])

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
    setArtworks(prev => {
      const merged = [...prev]
      newItems.forEach(ni => { const idx = merged.findIndex(a => a.name === ni.name); idx >= 0 ? merged[idx] = ni : merged.push(ni) })
      return merged
    })
  }

  const handleRefUpload = async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith("image/"))
    if (imgs.length === 0) return
    const newItems = await Promise.all(imgs.map(async (file, i) => ({
      id: `ref_${Date.now()}_${i}`,
      name: file.name.replace(/\.[^.]+$/, ""),
      image: await fileToBase64(file),
    })))
    setAllRefs(prev => {
      const merged = [...prev]
      newItems.forEach(ni => { const idx = merged.findIndex(r => r.name === ni.name); idx >= 0 ? merged[idx] = ni : merged.push(ni) })
      return merged
    })
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
      // refhub_refs is the single source of truth — load it directly, title-deduplicated
      const deletedIds = new Set<string>()
      try { JSON.parse(SS.get("deleted_ref_ids") || "[]").forEach((id: string) => deletedIds.add(id)) } catch {}
      const hr = SS.get("refhub_refs")
      if (hr) {
        const hubRefs: any[] = JSON.parse(hr)
        const seen = new Set<string>()
        const list: ArtItem[] = []
        hubRefs.forEach(r => {
          if (deletedIds.has(r.id)) return
          const img = r.preview || r.file_url || r.thumbnail_url || ""
          if (!img) return
          const key = (r.title || r.id).toLowerCase()
          if (seen.has(key)) return   // title-dedup: skip older same-name entry
          seen.add(key)
          list.push({ id: r.id, name: r.title || r.id, image: img, category: r.category || "", importance: r.importance || (r.is_pinned ? "Main" : "Secondary"), usage: r.usage || "", note: r.note || "", artworkId: r.artworkId || "" })
        })
        if (list.length > 0) setAllRefs(list)
      } else {
        // fallback: c04_ref_previews
        const ar = SS.get("c04_ref_previews")
        if (ar) {
          const refs: any[] = JSON.parse(ar)
          const seen2 = new Set<string>()
          const list2: ArtItem[] = []
          refs.forEach((r: any) => {
            if (deletedIds.has(r.id)) return
            const key = (r.title || r.id).toLowerCase()
            if (seen2.has(key)) return
            seen2.add(key)
            list2.push({ id: r.id, name: r.title || r.id, image: r.preview || "", category: r.category || "", importance: r.label || r.importance || "Secondary", usage: r.usage || "", note: r.note || "", artworkId: r.artworkId || "" })
          })
          if (list2.length > 0) setAllRefs(list2)
        }
      }
    } catch {}
    try { const b = SS.get("kickoff_brief"); if (b) setBrief(JSON.parse(b)) } catch {}
    try { const cv = SS.get("compare_chat"); if (cv) setChatMessages(JSON.parse(cv)) } catch {}
    try { const mv = SS.get("compare_metrics"); if (mv) { const parsed = JSON.parse(mv); if (Array.isArray(parsed) && parsed.length > 0) setMetrics(parsed) } } catch {}
    try { const a = SS.get("compare_annotations"); if (a) setDeltaAnnotations(JSON.parse(a)) } catch {}
    try { const d = SS.get("compare_deltas"); if (d) { const parsed = JSON.parse(d); const isStale = parsed.every((x: any) => ["d1","d2","d3"].includes(x.id)); if (parsed.length > 0 && !isStale) setDeltas(parsed); else SS.set("compare_deltas","[]") } } catch {}

    // Live sync: evict stale refs when reference-hub replaces a duplicate
    const onStorage = (e: StorageEvent) => {
      if (e.key === "refhub_refs" || e.key === "deleted_ref_ids") {
        try {
          const deletedIds = new Set<string>(JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]"))
          if (deletedIds.size > 0) setAllRefs(prev => prev.filter(r => !deletedIds.has(String(r.id))))
          const raw = sessionStorage.getItem("refhub_refs")
          if (!raw) return
          const hubRefs = JSON.parse(raw)
          setAllRefs(prev => prev.map(r => {
            const hub = hubRefs.find((h: any) => String(h.id) === String(r.id))
            if (!hub) return r
            return { ...r, image: hub.preview || hub.file_url || hub.thumbnail_url || r.image }
          }))
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  // Reset ref selection when artwork changes (different artwork = different ref set)
  useEffect(() => { setSelectedRef(0) }, [selectedArtwork])



  // Auto-analyze disabled — use 'Re-analyze' button to trigger
  const autoAnalyzeRef = useRef<AbortController | null>(null)

  // Persist on every change — including initial hydrated values
  const [compareHydrated, setCompareHydrated] = useState(false)

  // Auto-analyze disabled — user clicks 'Start Analysis' / 'Re-analyze' to trigger
  const hasAutoAnalyzed = useRef(false)
  useEffect(() => { setCompareHydrated(true) }, [])
  useEffect(() => { if (compareHydrated) SS.set("compare_chat", JSON.stringify(chatMessages)) }, [chatMessages, compareHydrated])
  useEffect(() => { if (compareHydrated && metrics.length > 0) SS.set("compare_metrics", JSON.stringify(metrics)) }, [metrics, compareHydrated])
  useEffect(() => { if (compareHydrated) SS.set("compare_deltas", JSON.stringify(deltas)) }, [deltas, compareHydrated])
  useEffect(() => { if (compareHydrated) SS.set("compare_annotations", JSON.stringify(deltaAnnotations)) }, [deltaAnnotations, compareHydrated])
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
      artworkList[selectedArtwork] ? `Artwork: ${artworkList[selectedArtwork].name}` : "",
      currentRefs[selectedRef] ? `Reference：${currentRefs[selectedRef].name}` : "",
      Object.entries(brief).filter(([, v]) => v).length > 0
        ? `Director Spec:\n${Object.entries(brief).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}`
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
      setChatMessages(p => [...p, { role: "ai", content: stripMd(data.response || data.reply || "Sorry, unable to respond.") }])
    } catch {
      setChatMessages(p => [...p, { role: "ai", content: "Connection failed. Please confirm the backend." }])
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
        setChatMessages(p => [...p, { role: "user", content: `[Checked Gap] ${delta.type}: ${delta.detail}` }])
        callAgent(`For the gap "${delta.type}: ${delta.detail}", please provide 2–3 specific, actionable improvement suggestions.`)
      }
    } else {
      setCheckedDeltas(p => p.filter(id => id !== deltaId))
    }
  }

  // ── Delta double-click dialog — show cached debate instantly ───
  const handleDeltaDblClick = useCallback(async (delta: DeltaItem) => {
    setDeltaDialog(delta)
    // If debate already cached (from auto-analysis), show it immediately
    if (deltaDebateCache[delta.id]) {
      setDeltaDialogText(deltaDebateCache[delta.id])
      setDeltaDialogLoading(false)
      return
    }
    // Otherwise fetch on demand (e.g. auto-analysis still running)
    setDeltaDialogText("")
    setDeltaDialogLoading(true)
    try {
      const res = await fetch(`${API}/suggestion/chat/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          message: `In-depth analysis of the "${delta.type}" gap:\nIssue: ${delta.detail}\nPlease provide: (1) Root cause analysis (2) Agent A perspective (technical) (3) Agent B perspective (creative) (4) Debate conclusion (5) 2–3 immediately actionable improvement steps.`,
          context: buildCtx(),
          history: [],
        }),
      })
      const data = await res.json()
      const text = stripMd(data.response || data.reply || "Analysis complete.")
      setDeltaDialogText(text)
      // Cache the result
      setDeltaDebateCache(p => ({ ...p, [delta.id]: text }))
    } catch {
      setDeltaDialogText("Analysis failed. Please try again.")
    }
    setDeltaDialogLoading(false)
  }, [buildCtx, deltaDebateCache])

  // ── Re-analyze — streaming, same logic as upload-analyze ─────
  const handleAnalyzeDeltas = async () => {
    setDeltaAnalyzing(true)
    setMetricsLoading(true)
    setMetrics([])
    setMetricsStatus("Preparing analysis...")

    const thinkingSteps = [
      "Loading artwork and Reference...",
      "OpenAI evaluating differences from a technical perspective...",
      "Gemini analyzing from a creative strategy perspective...",
      "Claude directly comparing the two images...",
      "Calculating metric scores...",
      "Generating specific correction suggestions...",
      "Organizing analysis results...",
    ]
    let stepIdx = 0
    const thinkingMsgId = `thinking_${Date.now()}`
    setChatMessages(p => [...p, { role: "user", content: "[Re-run Gap Analysis]" }, { role: "ai", content: thinkingSteps[0], id: thinkingMsgId } as any])
    const thinkingInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, thinkingSteps.length - 1)
      const step = thinkingSteps[stepIdx]
      setChatMessages(p => p.map((m: any) => m.id === thinkingMsgId ? { ...m, content: step } : m))
      setMetricsStatus(step)
    }, 3000)

    const art = artworkList[selectedArtwork]
    const ref = currentRefs[selectedRef]
    if (!art || !ref) {
      clearInterval(thinkingInterval)
      setDeltaAnalyzing(false); setMetricsLoading(false); return
    }

    // Get artwork base64
    const artworkB64 = art.image?.startsWith("data:") ? art.image : ""
    const ctx = buildCtx()

    // Pre-render empty metric cards immediately — don't wait for backend
    setMetrics(COMPARE_METRICS.map(m => ({
      id: m.id, name: m.name, score: 0.5, disagreement: 0.05,
      agentA: { name: m.id + "_A", score: 0.5, opinion: "" },
      agentB: { name: m.id + "_B", score: 0.5, opinion: "" },
      debate: { positionA: "", positionB: "", conclusion: "" },
      status: "yellow" as const,
    })))

    try {
      const streamRes = await fetch(`${API}/combination/analyze/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          artwork_b64: artworkB64,
          ref_b64: ref.image?.startsWith("data:") ? ref.image : "",
          brief_context: ctx.brief_context || "",
          hub_refs: ctx.hub_refs || "",
          refs_context: `[Reference: ${ref.name}${ref.note ? " | " + ref.note : ""}]`,
          reflection_notes: "",
          analyze_scope: ["all"],
        }),
      })
      if (!streamRes.ok || !streamRes.body) throw new Error("HTTP " + streamRes.status)

      const reader = streamRes.body.getReader()
      const decoder = new TextDecoder()
      const streamMetrics: MetricResult[] = []
      let buf = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split("\n\n")
        buf = lines.pop() || ""
        for (const line of lines) {
          const chunk = line.trim()
          if (!chunk.startsWith("data: ")) continue
          try {
            const evt = JSON.parse(chunk.slice(6))
            if (evt.type === "status") {
              setMetricsStatus(evt.message)
              setChatMessages(p => p.map((m: any) => m.id === thinkingMsgId ? { ...m, content: evt.message } : m))
            } else if (evt.type === "spec") {
              setChatMessages(p => [...p, { role: "ai", content: `Overall Analysis:\n${stripMd(evt.spec_summary || "")}` }])
            } else if (evt.type === "metric") {
              const g = evt.data
              const aKey = Object.keys(g.per_agent || {}).find((k: string) => k.endsWith("_A")) || (evt.id + "_A")
              const bKey = Object.keys(g.per_agent || {}).find((k: string) => k.endsWith("_B")) || (evt.id + "_B")
              const m: MetricResult = {
                id: evt.id,
                name: COMPARE_METRICS.find(x => x.id === evt.id)?.name || evt.id,
                score: g.score ?? 0.5,
                disagreement: g.disagreement ?? 0,
                agentA: { name: aKey, score: g.per_agent?.[aKey] ?? 0.5, opinion: g.opinion_A || "" },
                agentB: { name: bKey, score: g.per_agent?.[bKey] ?? 0.5, opinion: g.opinion_B || "" },
                debate: g.debate,
                status: scoreToStatus(g.score ?? 0.5, g.disagreement ?? 0),
              }
              const idx = streamMetrics.findIndex(x => x.id === evt.id)
              if (idx >= 0) streamMetrics[idx] = m; else streamMetrics.push(m)
              setMetrics([...streamMetrics])

              // Also update legacy deltas for chat/checkbox compatibility
              const sev = m.status === "red" ? "high" : m.status === "yellow" ? "medium" : "low"
              const detail = m.debate?.conclusion || m.agentA.opinion || m.name + " analysis complete"
              setDeltas(prev => {
                const updated = [...prev]
                const di = updated.findIndex(d => d.type === m.name)
                if (di >= 0) updated[di] = { ...updated[di], severity: sev, detail }
                else updated.push({ id: evt.id, type: m.name, severity: sev, detail })
                return updated
              })
            } else if (evt.type === "done") {
              clearInterval(thinkingInterval)
              setMetricsLoading(false)
              setMetricsStatus("")
              const red = streamMetrics.filter(m => m.status === "red").length
              const yellow = streamMetrics.filter(m => m.status === "yellow").length
              const green = streamMetrics.filter(m => m.status === "green").length
              setChatMessages(p => p.map((m: any) => m.id === thinkingMsgId
                ? { role: "ai", content: `Analysis complete! ❌ Needs improvement: ${red}  ⚠️ Needs attention: ${yellow}  ✅ Good: ${green}` }
                : m))
            }
          } catch {}
        }
      }
    } catch (err) {
      clearInterval(thinkingInterval)
      setChatMessages(p => [...p, { role: "ai", content: `Analysis failed: ${err}` }])
    }
    setDeltaAnalyzing(false)
    setMetricsLoading(false)
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
    setChatMessages(p => [...p, { role: "ai", content: `Saved！

📁 Artworks: ${artworkList.length}\n🖼 References: ${currentRefs.length}\n📋 Gap List: ${deltas.length} items (${checkedDeltas.length} checked)\n📝 Annotations: ${Object.keys(deltaAnnotations).length}` }])
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
                <h1 className="text-2xl font-bold">Ref Comparison / Gap Analysis</h1>
              </div>
              <p className="text-muted-foreground text-sm">Select an Artwork and Reference for gap analysis</p>
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
                          <Button size="sm" variant={leftPanelMode==="expand"?"secondary":"ghost"} className="h-6 w-6 p-0" onClick={() => setLeftPanelMode("expand")} title="Expand mode"><Maximize2 className="w-3 h-3" /></Button>
                          <Button size="sm" variant={leftPanelMode==="browse"?"secondary":"ghost"} className="h-6 w-6 p-0" onClick={() => setLeftPanelMode("browse")} title="Compact mode"><LayoutList className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => artUploadRef.current?.click()} title="Upload Artwork"><Upload className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <input ref={artUploadRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => {
                        Array.from(e.target.files || []).forEach(file => {
                          const reader = new FileReader()
                          reader.onload = ev => {
                            setArtworks(p => { const name = file.name.replace(/\.[^.]+$/, ""); const merged = [...p]; const idx = merged.findIndex(a => a.name === name); const item = { id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name, image: ev.target?.result as string }; idx >= 0 ? merged[idx] = item : merged.push(item); return merged })
                          }
                          reader.readAsDataURL(file)
                        })
                        e.target.value = ""
                      }} />
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0">
                      <div className="h-full overflow-y-auto overflow-x-hidden">
                        <div className="px-3 pb-2 space-y-1.5 w-full min-w-0"
                          onDragOver={e => { e.preventDefault() }}
                          onDrop={e => {
                            e.preventDefault()
                            Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")).forEach(file => {
                              const r = new FileReader(); r.onload = ev => setArtworks(p => { const nm = file.name.replace(/\.[^.]+$/,""); const m=[...p]; const i=m.findIndex(a=>a.name===nm); const it={id:`aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,name:nm,image:ev.target?.result as string}; i>=0?m[i]=it:m.push(it); return m }); r.readAsDataURL(file)
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
                                  const r = new FileReader(); r.onload = ev => setArtworks(p => { const nm = file.name.replace(/\.[^.]+$/,""); const m=[...p]; const i=m.findIndex(a=>a.name===nm); const it={id:`aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,name:nm,image:ev.target?.result as string}; i>=0?m[i]=it:m.push(it); return m }); r.readAsDataURL(file)
                                })
                              }}
                            >
                              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground opacity-40" />
                              <p className="text-[10px] text-muted-foreground">Click or drag to upload Artwork</p>
                            </div>
                          )}
                          {artworkList.map((art, idx) => (
                            <div key={art.id} className="relative group w-full min-w-0">
                              {leftPanelMode === "expand" ? (
                                /* ── Expand mode: large thumbnail card ── */
                                <div
                                  className={`group w-full min-w-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedArtwork === idx ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                                  onClick={() => { setSelectedArtwork(idx); setSelectedRef(0) }}
                                  onDoubleClick={() => { setChatMessages(p => [...p, { role: "user", content: `[Discuss Artwork] ${art.name}` }]); callAgent(`Please examine artwork "${art.name}", analyze the gaps between it and the currently selected Reference, and give 2–3 specific improvement suggestions.`) }}
                                  title="Double-click to import to chat"
                                >
                                  <div style={{ width: "100%", height: 160, overflow: "hidden", background: "hsl(var(--muted))", position: "relative", flexShrink: 0 }}>
                                    {art.image && <img src={art.image} alt={art.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                      <span className="opacity-0 group-hover:opacity-100 text-white text-[9px] bg-black/60 px-1.5 py-0.5 rounded-full">Double-click to discuss</span>
                                    </div>
                                  </div>
                                  <div className="p-1.5"><p className="text-[10px] font-medium truncate">{art.name}</p></div>
                                </div>
                              ) : (
                                /* ── Browse mode: compact row ── */
                                <div
                                  className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${selectedArtwork === idx ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent"}`}
                                  onClick={() => { setSelectedArtwork(idx); setSelectedRef(0) }}
                                  onDoubleClick={() => { setChatMessages(p => [...p, { role: "user", content: `[Discuss Artwork] ${art.name}` }]); callAgent(`Please examine artwork "${art.name}", analyze the gaps between it and the currently selected Reference, and give 2–3 specific improvement suggestions.`) }}
                                  title="Double-click to import to chat"
                                >
                                  <div className="w-10 h-7 rounded overflow-hidden shrink-0 bg-muted">
                                    {art.image && <img src={art.image} alt={art.name} className="w-full h-full object-cover" />}
                                  </div>
                                  <span className="text-[10px] font-medium flex-1 truncate">{art.name}</span>
                                </div>
                              )}
                              <button
                                className="absolute top-1 right-1 w-4 h-4 bg-black/70 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={e => { e.stopPropagation(); deleteItem("artworks", art.id); setArtworks(p => p.filter(a => a.id !== art.id)) }}
                              >
                                <XIcon className="w-2.5 h-2.5 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
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
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => refUploadRef.current?.click()} title="Upload Reference">
                          <Upload className="w-3 h-3" />
                        </Button>
                        {/* mode toggle is shared — no separate toggle needed; ref list mirrors artwork mode */}
                      </div>
                      <input ref={refUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
                        Array.from(e.target.files || []).forEach(file => {
                          const reader = new FileReader()
                          reader.onload = ev => {
                            setAllRefs(p => { const name = file.name.replace(/\.[^.]+$/, ""); const merged = [...p]; const idx = merged.findIndex(r => r.name === name); const item = { id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name, image: ev.target?.result as string }; idx >= 0 ? merged[idx] = item : merged.push(item); return merged })
                          }
                          reader.readAsDataURL(file)
                        })
                        e.target.value = ""
                      }} />
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0">
                      <div className="h-full overflow-y-auto overflow-x-hidden">
                        <div className="px-3 pb-2 space-y-1.5 w-full min-w-0"
                          onDragOver={e => { e.preventDefault() }}
                          onDrop={e => {
                            e.preventDefault()
                            Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")).forEach(file => {
                              const r = new FileReader(); r.onload = ev => setAllRefs(p => { const nm = file.name.replace(/\.[^.]+$/,""); const m=[...p]; const i=m.findIndex(a=>a.name===nm); const it={id:`aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,name:nm,image:ev.target?.result as string}; i>=0?m[i]=it:m.push(it); return m }); r.readAsDataURL(file)
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
                                  const r = new FileReader(); r.onload = ev => setAllRefs(p => { const nm = file.name.replace(/\.[^.]+$/,""); const m=[...p]; const i=m.findIndex(a=>a.name===nm); const it={id:`aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,name:nm,image:ev.target?.result as string}; i>=0?m[i]=it:m.push(it); return m }); r.readAsDataURL(file)
                                })
                              }}
                            >
                              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground opacity-40" />
                              <p className="text-[10px] text-muted-foreground">Click or drag to upload Reference</p>
                            </div>
                          )}
                          {currentRefs.filter(ref => !!ref.image).map((ref, rIdx) => (
                            leftPanelMode === "browse" ? (
                              /* ── Browse mode: compact ref row ── */
                              <div key={ref.id}
                                className={`relative group flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${selectedRef === rIdx ? "bg-amber-500/10 border border-amber-500/30" : "hover:bg-muted border border-transparent"}`}
                                onClick={() => setSelectedRef(rIdx)}
                                onDoubleClick={() => { setChatMessages(p => [...p, { role: "user", content: `[Discuss Reference] ${ref.name}${ref.category ? ` (${ref.category})` : ""}` }]); callAgent(`Please analyze the gap between Reference "${ref.name}" and the current Artwork.`) }}
                              >
                                <div className="w-10 h-7 rounded overflow-hidden shrink-0 bg-muted relative">
                                  {ref.image && <img src={ref.image} alt={ref.name} className="w-full h-full object-cover" />}
                                  {ref.category && <span className={`absolute top-0 left-0 text-[7px] font-semibold px-1 rounded-br leading-tight ${CATEGORY_COLOR[ref.category] ?? "bg-white/80 text-gray-800"}`}>{ref.category}</span>}
                                </div>
                                <span className="text-[10px] flex-1 truncate">{ref.name}</span>
                                {ref.importance && <span className={`text-[8px] px-1 py-0.5 rounded ${IMPORTANCE_COLOR[ref.importance] ? IMPORTANCE_COLOR[ref.importance] : "bg-muted"}`}>{ref.importance}</span>}
                                <button
                                  className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                  onClick={e => { e.stopPropagation(); deleteItem("references", ref.id); setAllRefs(p => p.filter(r => r.id !== ref.id)); if (selectedRef >= rIdx) setSelectedRef(Math.max(0, selectedRef - 1)) }}
                                  title="Delete"
                                ><XIcon className="w-2.5 h-2.5" /></button>
                              </div>
                            ) : (
                              /* ── Expand mode: same card style as artwork ── */
                              <div
                                key={ref.id}
                                className={`group w-full min-w-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedRef === rIdx ? "border-amber-500 ring-2 ring-amber-500/30" : "border-border hover:border-amber-500/50"}`}
                                onClick={() => setSelectedRef(rIdx)}
                                onDoubleClick={() => {
                                  setChatMessages(p => [...p, { role: "user", content: `[Discuss Reference] ${ref.name}${ref.category ? ` (${ref.category})` : ""}` }])
                                  callAgent(`Please analyze the visual characteristics of Reference "${ref.name}"${ref.category ? ` (${ref.category})` : ""} and identify the main gaps between it and the currently selected Artwork.`)
                                }}
                                title="Double-click to import to chat"
                              >
                                <div style={{ width: "100%", height: 160, overflow: "hidden", background: "hsl(var(--muted))", position: "relative", flexShrink: 0 }}>
                                  {ref.image && <img src={ref.image} alt={ref.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                                  {ref.category && (
                                    <span className={`absolute top-1 left-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_COLOR[ref.category] ?? "bg-white/80 text-gray-800"}`}>
                                      {ref.category}
                                    </span>
                                  )}
                                  {ref.importance && (
                                    <span className={`absolute top-1 right-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${IMPORTANCE_COLOR[ref.importance] ?? "bg-white/80 text-gray-700 border-gray-300"}`}>
                                      {ref.importance}
                                    </span>
                                  )}
                                  <button
                                    className="absolute bottom-1 right-1 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white bg-black/60 hover:bg-red-500"
                                    onClick={e => { e.stopPropagation(); deleteItem("references", ref.id); setAllRefs(p => p.filter(r => r.id !== ref.id)); if (selectedRef >= rIdx) setSelectedRef(Math.max(0, selectedRef - 1)) }}
                                    title="Delete"
                                  ><XIcon className="w-2.5 h-2.5" /></button>
                                </div>
                                <div className="p-1.5"><p className="text-[10px] font-medium truncate">{ref.name}</p></div>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
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
                            <TabsTrigger value="split">Side by Side</TabsTrigger>
                            <TabsTrigger value="slider">Wipe</TabsTrigger>
                            <TabsTrigger value="side-by-side">Overlay</TabsTrigger>
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

                      {/* Side by Side */}
                      {compareMode === "split" && (
                        <div className="flex flex-col h-full gap-1">
                          <p className="text-[10px] text-muted-foreground text-center shrink-0">Ctrl/⌘ + Scroll to zoom</p>
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

                      {/* Overlay */}
                      {compareMode === "side-by-side" && (
                        <div className="flex flex-col h-full gap-2">
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] text-muted-foreground">Work Opacity</span>
                            <input type="range" min={0} max={100} defaultValue={70}
                              className="flex-1 h-1 accent-blue-500"
                              onChange={e => {
                                const el = document.getElementById("overlay-artwork") as HTMLImageElement
                                if (el) el.style.opacity = String(Number(e.target.value) / 100)
                              }} />
                            <span className="text-[10px] text-muted-foreground">Ref Opacity</span>
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
                          <p className="text-[10px] text-muted-foreground text-center shrink-0">Ctrl/⌘ + Scroll to zoom</p>
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
                    <CardHeader className="pb-2 shrink-0 cursor-pointer hover:bg-muted/50 transition-colors" onClick={()=>setDeltaListOpen(p=>!p)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" />Gap List

                            {!autoAnalyzing && Object.keys(deltaDebateCache).length > 0 && (
                              <span className="text-[10px] font-normal text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                                ✓ Debate Complete
                              </span>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {metrics.filter(m=>m.status==="red").length > 0 && <span className="text-[10px] text-red-500 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5"/>{metrics.filter(m=>m.status==="red").length}</span>}
                            {metrics.filter(m=>m.status==="yellow").length > 0 && <span className="text-[10px] text-amber-500 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5"/>{metrics.filter(m=>m.status==="yellow").length}</span>}
                            {metrics.filter(m=>m.status==="green").length > 0 && <span className="text-[10px] text-green-500 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5"/>{metrics.filter(m=>m.status==="green").length}</span>}
                            {metrics.length === 0 && <CardDescription className="text-xs">Select artwork and Reference, then click 'Start Analysis'</CardDescription>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                        <Button size="sm"
                          variant={metrics.length === 0 ? "default" : "outline"}
                          className={`gap-1.5 ${metrics.length === 0 ? "" : "bg-transparent"}`}
                          onClick={e=>{e.stopPropagation();handleAnalyzeDeltas()}}
                          disabled={deltaAnalyzing || artworkList.length === 0 || currentRefs.length === 0}>
                          {deltaAnalyzing
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing</>
                            : metrics.length === 0
                              ? <><Sparkles className="w-3.5 h-3.5" />Start Analysis</>
                              : <><Sparkles className="w-3.5 h-3.5" />Re-analyze</>}
                        </Button>
                        {deltaListOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>
                    {deltaListOpen && <CardContent className="flex-1 min-h-0 p-0">
                      <ScrollArea className="h-full">
                        <div className="px-3 pb-3 space-y-1.5">
                          {/* Status line while loading */}
                          {metricsLoading && metricsStatus && (
                            <div className="flex items-center gap-2 text-xs text-teal-600 py-2 px-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              <span>{metricsStatus}</span>
                            </div>
                          )}
                          {/* Metric cards — same style as upload-analyze */}
                          {metrics.map(m => {
                            const bg = m.status === "red" ? "bg-red-500/8 border-red-500/20" : m.status === "yellow" ? "bg-amber-500/8 border-amber-500/20" : "bg-green-500/8 border-green-500/20"
                            const icon = m.status === "red" ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : m.status === "yellow" ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            const isExpanded = expandedMetric === m.id
                            return (
                              <div key={m.id} className={`rounded-lg border p-2 cursor-pointer hover:opacity-80 transition-opacity ${bg}`}
                                onClick={() => setExpandedMetric(isExpanded ? null : m.id)}>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={checkedDeltas.includes(m.id)}
                                    onCheckedChange={v => handleDeltaCheck(m.id, v as boolean)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-3.5 h-3.5 shrink-0"
                                  />
                                  {icon}
                                  <span className="text-xs font-medium flex-1">{m.name}</span>
                                  
                                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                                {/* Preview line */}
                                {!isExpanded && (
                                  <p className="text-[10px] text-muted-foreground mt-1 ml-9 line-clamp-2">
                                    {m.debate?.conclusion && m.debate.conclusion !== "Analyzing..."
                                      ? m.debate.conclusion
                                      : m.agentA.opinion && m.agentA.opinion !== "Analyzing..."
                                        ? m.agentA.opinion
                                        : metricsLoading ? metricsStatus || "Analyzing..." : ""}
                                  </p>
                                )}
                                {/* Expanded detail */}
                                {isExpanded && (
                                  <div className="mt-2 ml-1 space-y-2">
                                    {m.agentA.opinion && (
                                      <div className="p-2 bg-background/60 rounded-md">
                                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{m.agentA.name} — Technical Observation</p>
                                        <p className="text-xs leading-relaxed">{m.agentA.opinion}</p>
                                      </div>
                                    )}
                                    {m.agentB.opinion && (
                                      <div className="p-2 bg-background/60 rounded-md">
                                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{m.agentB.name} — Creative Observation</p>
                                        <p className="text-xs leading-relaxed">{m.agentB.opinion}</p>
                                      </div>
                                    )}
                                    {m.debate?.conclusion && (
                                      <div className="p-2 bg-teal-500/10 rounded-md border border-teal-500/20">
                                        <p className="text-[10px] font-semibold text-teal-700 mb-0.5 flex items-center gap-1">
                                          <Sparkles className="w-3 h-3" />Claude Analysis & Suggestions
                                        </p>
                                        <p className="text-xs text-teal-800 leading-relaxed whitespace-pre-wrap">{m.debate.conclusion}</p>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 pt-1">
                                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-amber-600 px-2"
                                        onClick={e => { e.stopPropagation(); callAgent(`For the "${m.name}" gap (${m.debate?.conclusion || m.agentA.opinion}), please providedetailed improvement suggestions.`) }}>
                                        <Flag className="w-3 h-3 mr-1" />Discuss with Director
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                                        onClick={e => { e.stopPropagation(); setExpandedAnnotation(expandedAnnotation === m.id ? null : m.id) }}>
                                        <MessageSquare className="w-3 h-3 mr-1" />
                                        {expandedAnnotation === m.id ? "Collapse" : "Add Note"}
                                      </Button>
                                    </div>
                                    {expandedAnnotation === m.id && (
                                      <div className="space-y-1" onClick={e => e.stopPropagation()}>
                                        <Textarea placeholder="Add annotation..." value={deltaAnnotations[m.id] || ""}
                                          onChange={e => setDeltaAnnotations(p => ({ ...p, [m.id]: e.target.value }))}
                                          rows={2} className="text-xs" />
                                        <Button size="sm" variant="outline" className="h-6 text-xs gap-1"
                                          onClick={() => saveAnnotation(m.id, deltaAnnotations[m.id] || "")}>
                                          <Save className="w-3 h-3" />Save
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          {/* Empty state */}
                          {!metricsLoading && metrics.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-6">Click 'Re-analyze' to start comparison</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>}
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
                              <CardTitle className="text-base">AI Comparison Assistant</CardTitle>
                              <CardDescription className="text-xs">Check gaps for automatic follow-up</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">{chatMessages.length}</Badge>
                            {chatbotOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex flex-col" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                      <CardContent className="pt-0 flex-1 min-h-0 flex flex-col">
                        <ScrollArea className="mb-4" style={{ flex: 1, minHeight: 0, height: 0 }}>
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
                                  <span className="text-sm text-muted-foreground">Analyzing…</span>
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
                              setChatMessages(p => [...p, { role: "user", content: "This is an intentional choice" }])
                              callAgent("The artist states this is an intentional artistic choice. Please mark it in the report and suggest an appropriate explanation.")
                            }}
                          >
                            Intentional Choice
                          </Button>
                          <Button
                            variant="outline" size="sm" className="text-xs bg-transparent"
                            onClick={() => {
                              setChatMessages(p => [...p, { role: "user", content: "Compile feedback" }])
                              callAgent("Please compile all currently checked gap items into a clear feedback summary, ordered by priority.")
                            }}
                          >
                            Compile Feedback
                          </Button>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Input
                            placeholder="Type your question..."
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
              {deltaDialog?.type} — Gap Analysis
            </DialogTitle>
            <DialogDescription>{deltaDialog?.detail}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {deltaDialogLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Agents analyzing…
              </div>
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-line bg-muted rounded-lg p-3">
                {deltaDialogText}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="bg-transparent" onClick={() => setDeltaDialog(null)}>Close</Button>
              {deltaDialog && (
                <Button onClick={() => {
                  const msg = `Please provide more detailed revision steps for the "${deltaDialog.type}" gap`
                  setChatMessages(p => [...p, { role: "user", content: msg }])
                  callAgent(msg)
                  setDeltaDialog(null)
                }}>
                  <Sparkles className="w-4 h-4 mr-1.5" />Ask Agent
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}