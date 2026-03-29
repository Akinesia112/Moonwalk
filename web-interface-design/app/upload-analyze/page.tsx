"use client"

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Upload, Sparkles, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, ChevronUp,
  Plus, AlertCircle, Bot, Users, Send, BookOpen, Loader2, X, ImageIcon, Pin,
  FileText, Zap, Save, Check,
} from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { RefCard, type RefCardData, CATEGORY_OPTIONS, IMPORTANCE_OPTIONS, USAGE_OPTIONS } from "@/components/ref-card"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

// 徹底刪除：後端 + 所有 sessionStorage key
async function deleteItem(type: "references" | "artworks", id: string) {
  // 1. 後端
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
    // 4. deleted_ref_ids（加進去讓其他頁面也知道）
    try {
      const ids = JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]")
      if (!ids.includes(String(id))) ids.push(String(id))
      sessionStorage.setItem("deleted_ref_ids", JSON.stringify(ids))
    } catch {}
    // 5. 廣播給其他 tab/頁面
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

interface UploadedArtwork { id: string; file: File; preview: string }
interface ArtworkRef { id: string; label: string; localPreview: string | null; file?: File; title: string; note?: string; category?: string; importance?: string; usage?: string; artworkId?: string }
interface ChatMsg { role: "user" | "ai"; content: string }
interface MetricResult {
  id: string; name: string; score: number; disagreement: number
  agentA: { name: string; score: number; opinion: string }
  agentB: { name: string; score: number; opinion: string }
  debate?: { positionA: string; positionB: string; conclusion: string }
  status: "green" | "yellow" | "red"; refBasis: string; consensus: boolean; flag?: string
}
interface AnalysisState {
  loading: boolean; done: boolean; specSummary: string
  overallFeedback: string; metrics: MetricResult[]; flags: string[]
}

const METRIC_NAMES: Record<string, string> = {
  light: "光影", composition: "構圖", sketch: "草稿/線條", color: "色彩",
  style: "風格一致", percept: "感知品質", faithfulness: "Spec 忠實度",
  control: "可控性", robustness: "穩定性", efficiency: "效率", stability: "一致性",
}
// Map reference-hub categories to metric IDs
const CATEGORY_TO_METRIC: Record<string, string> = {
    Lighting: "light", Color: "color", Composition: "composition",
    Style: "style", Texture: "percept", Motion: "efficiency",
    Mood: "faithfulness", VFX: "control",
  }

const REF_LABEL_OPTIONS = ["Main", "Secondary", "Style", "Composition", "Color", "Lighting"]

function scoreToStatus(score: number, dis: number): "green" | "yellow" | "red" {
  // Red: strictest — both conditions must be severe
  if (dis > 0.30 && score < 0.30) return "red"
  // Yellow: widest band — moderate issues on either axis
  if (dis > 0.12 || score < 0.70) return "yellow"
  // Green: score >= 0.70 AND disagreement <= 0.12
  return "green"
}

const SS = {
  get: (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v) } catch {} },
}

// Strip markdown from AI responses
function stripBold(text: string): string {
  return text
    .replace(/[*][*](.+?)[*][*]/g, "$1")
    .replace(/[*](.+?)[*]/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/^[#]{1,6} /gm, "")
    .trim()
}

// Render text with bold for Director/Supervisor only
function renderWithBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*(?:Director|Supervisor|導演|督導)\*\*)/g)
  return parts.map((part, i) => {
    if (/^\*\*(.+)\*\*$/.test(part)) {
      return <strong key={i}>{part.replace(/\*\*/g, "")}</strong>
    }
    return part
  })
}

function UploadAnalyzeContent() {
  const [hydrated, setHydrated] = useState(false)

  // ── Multi-artwork upload
  const [artworks, setArtworks] = useState<UploadedArtwork[]>([])
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null)  // which artwork to analyze
  const [artworkSaved, setArtworkSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Version / remark
  const [version, setVersion] = useState("v01")
  const [remark, setRemark] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [infoSaved, setInfoSaved] = useState(false)

  // ── Artist refs
  const [artistRefs, setArtistRefs] = useState<ArtworkRef[]>([])
  const [refsSaved, setRefsSaved] = useState(false)
  const refInputRef = useRef<HTMLInputElement>(null)

  // ── Reflection notes
  const [reflectionNotes, setReflectionNotes] = useState("")
  const [notesSaved, setNotesSaved] = useState(false)

  // ── Analysis
  const [analysisStatus, setAnalysisStatus] = useState("")  // live progress text
  const [analysis, setAnalysis] = useState<AnalysisState>({
    loading: false, done: false, specSummary: "", overallFeedback: "", metrics: [], flags: []
  })

  // ── Chat
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: "ai", content: "您好！上傳創作後點擊「開始分析」，我會協調多個 AI Agent 進行 Spec + Reference 全面評估。\n\n勾選分項指標或點擊 Agent 意見，我會立即給出具體回饋。" }
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // ── Panels
  const [leftW, setLeftW] = useState(320)
  const [rightW, setRightW] = useState(320)
  const dragging = useRef<{ col: "left" | "right"; startX: number; startW: number } | null>(null)

  // ── Dialog
  const [dialogMetric, setDialogMetric] = useState<MetricResult | null>(null)
  const [debateLoading, setDebateLoading] = useState(false)
  const [liveDebate, setLiveDebate] = useState<{ positionA: string; positionB: string; conclusion: string } | null>(null)

  // ── Tag metric selectors (one per dynamic tag slot)
  const [tagMetrics, setTagMetrics] = useState<string[]>(["composition", "light", "color", "style"])

  // ── Analyze scope
  const [analyzeScope, setAnalyzeScope] = useState<string[]>(["all"])

  // ── Sections
  const [specOpen, setSpecOpen] = useState(true)
  const [aiOpen, setAiOpen] = useState(true)

  // ── Hydrate ───────────────────────────────────────────────────
  useEffect(() => {
    const c = SS.get("c04_chat"); const n = SS.get("c04_notes"); const v = SS.get("c04_version")
    const r = SS.get("c04_remark"); const t = SS.get("c04_tags"); const a = SS.get("c04_analysis")
    if (c) setChatMessages(JSON.parse(c))
    if (n) setReflectionNotes(n)
    if (v) setVersion(v)
    if (r) setRemark(r)
    if (t) setTags(JSON.parse(t))
    if (a) setAnalysis(JSON.parse(a))
    const tm = SS.get("c04_tag_metrics"); if (tm) setTagMetrics(JSON.parse(tm))
    const sc = SS.get("c04_scope"); if (sc) setAnalyzeScope(JSON.parse(sc))
    setHydrated(true)
  }, [])
  useEffect(() => { if (hydrated) SS.set("c04_chat", JSON.stringify(chatMessages)) }, [chatMessages, hydrated])
  useEffect(() => { if (hydrated) SS.set("c04_notes", reflectionNotes) }, [reflectionNotes, hydrated])
  useEffect(() => { if (hydrated) SS.set("c04_version", version) }, [version, hydrated])
  useEffect(() => { if (hydrated) SS.set("c04_remark", remark) }, [remark, hydrated])
  useEffect(() => { if (hydrated) SS.set("c04_tags", JSON.stringify(tags)) }, [tags, hydrated])
  useEffect(() => { if (hydrated) SS.set("c04_tag_metrics", JSON.stringify(tagMetrics)) }, [tagMetrics, hydrated])
  useEffect(() => { if (hydrated) SS.set("c04_scope", JSON.stringify(analyzeScope)) }, [analyzeScope, hydrated])
  useEffect(() => { if (hydrated && analysis.done) SS.set("c04_analysis", JSON.stringify(analysis)) }, [analysis, hydrated])

  const skipPersistRef = useRef(true)

  useEffect(() => { chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chatMessages, chatLoading])

  // ── Drag ──────────────────────────────────────────────────────
  const startDrag = (col: "left" | "right") => (e: React.MouseEvent) => {
    dragging.current = { col, startX: e.clientX, startW: col === "left" ? leftW : rightW }
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const d = ev.clientX - dragging.current.startX
      const nw = Math.max(180, Math.min(350, dragging.current.startW + (dragging.current.col === "left" ? d : -d)))
      dragging.current.col === "left" ? setLeftW(nw) : setRightW(nw)
    }
    const onUp = () => { dragging.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp)
  }

  // ── Compress image to max 300px thumbnail, return base64 ──────
  const fileToBase64 = useCallback((file: File): Promise<string> =>
    new Promise(resolve => {
      if (!file || file.size === 0) { resolve(""); return }
      const reader = new FileReader()
      reader.onerror = () => resolve("")
      reader.onload = (ev) => {
        const img = new Image()
        img.onerror = () => resolve(ev.target?.result as string || "")
        img.onload = () => {
          const MAX = 300
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const w = Math.round(img.width * scale)
          const h = Math.round(img.height * scale)
          const canvas = document.createElement("canvas")
          canvas.width = w; canvas.height = h
          const ctx = canvas.getContext("2d")
          if (!ctx) { resolve(ev.target?.result as string || ""); return }
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL("image/jpeg", 0.75))
        }
        img.src = ev.target?.result as string
      }
      reader.readAsDataURL(file)
    }), [])

  const saveArtworkPreviews = useCallback(async (aws: UploadedArtwork[]) => {
    const previews = await Promise.all(aws.map(async a => {
      // If preview is already base64 or data URL, use it directly
      if (a.preview.startsWith("data:")) return { id: a.id, preview: a.preview, name: a.file?.name || a.id }
      // Convert blob URL via FileReader if file exists
      if (a.file && a.file.size > 0) {
        const b64 = await fileToBase64(a.file)
        return { id: a.id, preview: b64 || a.preview, name: a.file.name }
      }
      return { id: a.id, preview: a.preview, name: a.file?.name || a.id }
    }))
    try { SS.set("c04_artwork_previews", JSON.stringify(previews)) } catch {}
  }, [])

  // Restore artwork + ref previews on mount (runs once, after hydration)
  useEffect(() => {
    const savedAw = SS.get("c04_artwork_previews")
    if (savedAw) {
      try {
        const previews: { id: string; preview: string; name: string }[] = JSON.parse(savedAw)
        if (previews.length > 0) {
          setArtworks(previews.map(p => ({
            id: p.id,
            file: new File([], p.name, { type: "image/jpeg" }),
            preview: p.preview,
          })))
        }
      } catch {}
    }
    const savedRef = SS.get("c04_ref_previews")
    if (savedRef) {
      try {
        const previews: { id: string; label: string; title: string; preview: string; category?: string; note?: string; usage?: string }[] = JSON.parse(savedRef)
        if (previews.length > 0) {
          setArtistRefs(previews.map(p => ({ id: p.id, label: p.label, title: p.title, localPreview: p.preview, category: p.category || "", note: p.note || "", usage: p.usage || "", artworkId: (p as any).artworkId || "" })))
        }
      } catch {}
    }
    // Merge reference-hub refs — source of truth is refhub_refs
    // Match by TITLE (not id) so re-uploads (new id, same name) correctly replace stale refs
    try {
      const hubRaw = SS.get("refhub_refs")
      if (hubRaw) {
        const hubRefs: any[] = JSON.parse(hubRaw)
        const deletedIds = new Set<string>()
        try { JSON.parse(SS.get("deleted_ref_ids") || "[]").forEach((id: string) => deletedIds.add(id)) } catch {}

        setArtistRefs(() => {
          // Build final list purely from hubRefs (refhub is the source of truth)
          // Filter out explicitly deleted ids
          return hubRefs
            .filter(h => !deletedIds.has(h.id) && (h.preview || h.file_url || h.thumbnail_url))
            .map(h => ({
              id: h.id,
              label: h.importance || (h.is_pinned ? "Main" : (h.category || "Secondary")),
              title: h.title,
              localPreview: h.preview || h.file_url || h.thumbnail_url || "",
              category: h.category || "",
              note: h.note || "",
              usage: h.usage || "",
              artworkId: h.artworkId || "",
            }))
        })
      }
    } catch {}
    // Allow persist effects to run after this tick (restore is complete)
    setTimeout(() => { skipPersistRef.current = false }, 100)

    // Live sync: when reference-hub updates/replaces a ref, evict stale entries here
    const onStorage = (e: StorageEvent) => {
      if (e.key === "refhub_refs" || e.key === "deleted_ref_ids") {
        try {
          const deletedIds = new Set<string>(JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]"))
          if (deletedIds.size > 0) {
            setArtistRefs(prev => prev.filter(r => !deletedIds.has(r.id)))
          }
          // Re-merge updated refs from refhub
          const raw = sessionStorage.getItem("refhub_refs")
          if (!raw) return
          const hubRefs = JSON.parse(raw)
          setArtistRefs(prev => prev.map(r => {
            const hub = hubRefs.find((h: any) => h.id === r.id)
            if (!hub) return r
            return { ...r, localPreview: hub.preview || hub.file_url || hub.thumbnail_url || r.localPreview, category: hub.category || r.category, note: hub.note || r.note }
          }))
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  // Persist artist ref previews as base64
  const saveRefPreviews = useCallback(async (refs: ArtworkRef[]) => {
    const previews = await Promise.all(refs.map(async r => {
      const base = { id: r.id, label: r.label, title: r.title, category: r.category || "", note: r.note || "", usage: r.usage || "", artworkId: r.artworkId || "" }
      if (!r.localPreview) return { ...base, preview: "" }
      if (r.localPreview.startsWith("data:")) return { ...base, preview: r.localPreview }
      if (r.file && r.file.size > 0) {
        const b64 = await fileToBase64(r.file)
        return { ...base, preview: b64 || r.localPreview }
      }
      return { ...base, preview: r.localPreview }
    }))
    try { SS.set("c04_ref_previews", JSON.stringify(previews)) } catch {}
    // Also write back to refhub_refs so reference-hub stays in sync
    try {
      const cached = JSON.parse(SS.get("refhub_refs") || "[]")
      const cacheMap: Record<string, any> = {}
      cached.forEach((c: any) => { cacheMap[c.id] = c })
      refs.forEach(r => {
        const saved = previews.find(p => p.id === r.id)
        const b64 = saved?.preview || ""
        if (cacheMap[r.id]) {
          // Update existing entry
          cacheMap[r.id] = {
            ...cacheMap[r.id],
            category: r.category || "",
            note: r.note || "",
            importance: r.label,
            usage: r.usage || "",
            artworkId: r.artworkId || "",
            ...(b64 ? { preview: b64 } : {}),
          }
        } else if (b64) {
          // Add new ref that only exists in upload-analyze (not in refhub yet)
          cacheMap[r.id] = {
            id: r.id,
            title: r.title,
            category: r.category || "",
            note: r.note || "",
            importance: r.label,
            usage: r.usage || "",
            artworkId: r.artworkId || "",
            preview: b64,
            file_url: "",
            thumbnail_url: "",
            is_pinned: r.label === "Main",
            uploaded_by: "Artist",
            created_at: new Date().toISOString(),
          }
        }
      })
      SS.set("refhub_refs", JSON.stringify(Object.values(cacheMap)))
    } catch {}
  }, [fileToBase64])

  // ── Auto-persist after useCallbacks ──────────────────────────
  useEffect(() => {
    if (!hydrated || artworks.length === 0) return
    if (skipPersistRef.current) return
    saveArtworkPreviews(artworks)
  }, [artworks, hydrated, saveArtworkPreviews])

  // Auto-select first artwork if none selected
  useEffect(() => {
    if (artworks.length > 0 && !selectedArtworkId) setSelectedArtworkId(artworks[0].id)
    if (artworks.length === 0) setSelectedArtworkId(null)
  }, [artworks])

  useEffect(() => {
    if (!hydrated) return
    if (skipPersistRef.current) return
    if (artistRefs.length === 0) { SS.set("c04_ref_previews", "[]"); return }
    saveRefPreviews(artistRefs)
  }, [artistRefs, hydrated, saveRefPreviews])

  // ── Multi-file artwork upload ─────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    Promise.all(newFiles.map(async file => ({ id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, file, preview: await fileToBase64(file) }))).then(newItems => {
      setArtworks(prev => {
        const filtered = prev.filter(a => !newItems.some(ni => ni.file.name.toLowerCase().replace(/\.[^.]+$/,"") === (a.file?.name||"").toLowerCase().replace(/\.[^.]+$/,"")))
        const updated = [...filtered, ...newItems]
        saveArtworkPreviews(updated)
        return updated
      })
      setArtworkSaved(false)
    })
    e.target.value = ""
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"))
    Promise.all(dropped.map(async file => ({ id: `aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, file, preview: await fileToBase64(file) }))).then(newItems => {
      setArtworks(prev => {
        const filtered = prev.filter(a => !newItems.some(ni => ni.file.name.toLowerCase().replace(/\.[^.]+$/,"") === (a.file?.name||"").toLowerCase().replace(/\.[^.]+$/,"")))
        const updated = [...filtered, ...newItems]
        saveArtworkPreviews(updated)
        return updated
      })
      setArtworkSaved(false)
    })
  }

  // ── Artist refs ───────────────────────────────────────────────
  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    Promise.all(files.map(async file => ({
      id: `ar_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      label: "Secondary" as const,
      localPreview: await fileToBase64(file),
      file,
      title: file.name.replace(/\.[^.]+$/, ""),
    }))).then(newRefs => {
      setArtistRefs(prev => {
        const filtered = prev.filter(r => !newRefs.some(nr => nr.title.toLowerCase() === r.title.toLowerCase()))
        return [...filtered, ...newRefs]
      })
      setRefsSaved(false)
    })
    e.target.value = ""
  }

  // ── Context builders ──────────────────────────────────────────
  const getBriefCtx = useCallback(() => {
    try {
      const b = JSON.parse(SS.get("kickoff_brief") || "{}")
      return Object.entries(b).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join("\n")
    } catch { return "" }
  }, [])

  const getHubRefs = useCallback(() => {
    try {
      const raw = SS.get("refhub_refs") || SS.get("reference_hub_refs") || "[]"
      const refs = JSON.parse(raw)
      if (Array.isArray(refs) && refs.length > 0)
        return refs.map((r: any) => `${r.title || r.id}${r.note ? `（${r.note}）` : ""}`).join("\n")
      const brief = JSON.parse(SS.get("kickoff_brief") || "{}")
      return brief.supervisor_spec || ""
    } catch { return "" }
  }, [])

  const getFullContext = useCallback(() => ({
    brief_context: getBriefCtx(),
    hub_refs: getHubRefs(),
    refs_context: artistRefs.map(r => `${r.label} Ref: ${r.title}`).join("\n"),
    reflection_notes: reflectionNotes,
    version, remark, tags,
  }), [getBriefCtx, getHubRefs, artistRefs, reflectionNotes, version, remark, tags])

  // ── Core: call agent with auto AI response ────────────────────
  const callAgent = useCallback(async (userMsg: string, extraCtx?: string) => {
    setChatLoading(true)
    const ctx = getFullContext()
    const systemNote = `你是 VFX AI 分析助手。當前分析背景：\n導演Spec：${ctx.brief_context || "（未填）"}\n版本：${ctx.version}，備註：${ctx.remark || "（無）"}\nArtist References：${ctx.refs_context || "（無）"}${extraCtx ? `\n\n補充資訊：${extraCtx}` : ""}\n\n規則：用繁體中文回應，不使用 ** 或 --- 等 markdown 符號，直接輸出純文字。`
    try {
      const res = await fetch(`${API}/suggestion/chat/analysis`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          message: `${systemNote}\n\n用戶訊息：${userMsg}`,
          history: chatMessages.slice(-6).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        }),
      })
      const data = await res.json()
      const reply = stripBold(data.response || data.reply || data.message || "抱歉，無法回應。")
      setChatMessages(p => [...p, { role: "ai", content: reply }])
    } catch {
      setChatMessages(p => [...p, { role: "ai", content: "連線失敗，請確認後端服務。" }])
    } finally {
      setChatLoading(false)
    }
  }, [chatMessages, getFullContext])

  // ── Analyze ───────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    setAnalysis(p => ({ ...p, loading: true, done: false }))
    setChatMessages(p => [...p, { role: "user", content: "[開始分析]" }])

    // ── Progressive thinking messages ──────────────────────────
    const thinkingSteps = [
      "正在上傳圖片至分析系統...",
      "OpenAI 正在從技術面評估光影、構圖、色彩...",
      "Gemini 正在從創意策略面分析視覺語言...",
      "Claude 正在整合三方觀點，進行 Debate...",
      "計算各項指標分數與分歧度...",
      "生成 Spec 忠實度與整體評估...",
      "準備輸出完整分析報告...",
    ]
    let stepIdx = 0
    const thinkingMsgId = `thinking_${Date.now()}`
    setChatMessages(p => [...p, { role: "ai", content: thinkingSteps[0], id: thinkingMsgId } as any])
    const thinkingInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, thinkingSteps.length - 1)
      const step = thinkingSteps[stepIdx]
      setChatMessages(p => p.map((m: any) => m.id === thinkingMsgId ? { ...m, content: step } : m))
      setAnalysisStatus(step)
    }, 3500)
    setAnalysisStatus(thinkingSteps[0])

    try {
      // Upload selected artwork
      let artworkUrl = ""
      let artworkB64 = ""
      const artworkToAnalyze = artworks.find(a => a.id === selectedArtworkId) || artworks[0]
      if (artworkToAnalyze) {
        // If we have a real File with data, upload it
        if (artworkToAnalyze.file && artworkToAnalyze.file.size > 0) {
          const fd = new FormData(); fd.append("file", artworkToAnalyze.file); fd.append("project_id", PROJECT_ID)
          try {
            const up = await fetch(`${API}/search/upload`, { method: "POST", body: fd })
            const ud = await up.json(); artworkUrl = ud.file_url || ud.url || ""
          } catch {}
        }
        // Always pass base64 preview directly (works even without upload)
        if (artworkToAnalyze.preview?.startsWith("data:")) {
          artworkB64 = artworkToAnalyze.preview
        }
      }
      const ctx = getFullContext()

      // ── Streaming: each metric appears as soon as its debate is done ──
      const streamRes = await fetch(`${API}/combination/analyze/stream`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: PROJECT_ID, artwork_url: artworkUrl, artwork_b64: artworkB64, analyze_scope: analyzeScope, ...ctx }),
      })
      if (!streamRes.ok || !streamRes.body) {
        clearInterval(thinkingInterval)
        throw new Error("HTTP " + streamRes.status)
      }

      const reader = streamRes.body.getReader()
      const decoder = new TextDecoder()
      const streamMetrics: MetricResult[] = []
      let buf = ""

      setAnalysis(p => ({ ...p, loading: true, done: false, metrics: [] }))

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const chunks = buf.split("\n\n")
        buf = chunks.pop() || ""
        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue
          try {
            const evt = JSON.parse(chunk.slice(6))
            if (evt.type === "status") {
              setChatMessages(p => p.map((m: any) => m.id === thinkingMsgId ? { ...m, content: evt.message } : m))
              setAnalysisStatus(evt.message)
            } else if (evt.type === "metric") {
              const g = evt.data
              const aKey = Object.keys(g.per_agent || {}).find((k: string) => k.endsWith("_A")) || (evt.id + "_A")
              const bKey = Object.keys(g.per_agent || {}).find((k: string) => k.endsWith("_B")) || (evt.id + "_B")
              const newMetric: MetricResult = {
                id: evt.id, name: METRIC_NAMES[evt.id] || evt.id,
                score: g.score ?? 0.5, disagreement: g.disagreement ?? 0,
                agentA: { name: aKey, score: g.per_agent?.[aKey] ?? 0.5, opinion: stripBold(g.opinion_A || "") },
                agentB: { name: bKey, score: g.per_agent?.[bKey] ?? 0.5, opinion: stripBold(g.opinion_B || "") },
                debate: g.debate ? {
                  positionA: stripBold(g.debate.positionA || ""),
                  positionB: stripBold(g.debate.positionB || ""),
                  conclusion: stripBold(g.debate.conclusion || ""),
                } : undefined,
                status: scoreToStatus(g.score ?? 0.5, g.disagreement ?? 0),
                refBasis: g.ref_basis || "Spec + References",
                consensus: (g.disagreement ?? 0) < 0.1,
                flag: (g.disagreement ?? 0) > 0.30 && (g.score ?? 0.5) < 0.30 ? "handoff_needed" : undefined,
              }
              const idx = streamMetrics.findIndex(m => m.id === evt.id)
              if (idx >= 0) streamMetrics[idx] = newMetric; else streamMetrics.push(newMetric)
              setAnalysis(p => ({ ...p, loading: true, done: false, metrics: [...streamMetrics] }))
              const progressText = (METRIC_NAMES[evt.id] || evt.id) + " 分析完成（" + evt.done + "/" + evt.total + "）..."
              setChatMessages(p => p.map((m: any) => m.id === thinkingMsgId ? { ...m, content: progressText } : m))
              setAnalysisStatus(progressText)
            } else if (evt.type === "spec") {
              // spec_summary ready — show immediately, keep loading for metrics
              setAnalysis(p => ({ ...p, specSummary: stripBold(evt.spec_summary || "") }))
            } else if (evt.type === "done") {
              clearInterval(thinkingInterval)
              const finalMetrics = [...streamMetrics]
              const na: AnalysisState = {
                loading: false, done: true,
                specSummary: stripBold(evt.spec_summary || "分析完成。"),
                overallFeedback: "",
                metrics: finalMetrics,
                flags: finalMetrics.filter(m => m.flag === "handoff_needed").map(m => m.name),
              }
              setAnalysis(na)
              const red = finalMetrics.filter(m => m.status === "red").length
              const yellow = finalMetrics.filter(m => m.status === "yellow").length
              const green = finalMetrics.filter(m => m.status === "green").length
              const summary = "分析完成！共評估 " + finalMetrics.length + " 項指標。\n❌ 需改進：" + red + " 項　⚠️ 需關注：" + yellow + " 項　✅ 良好：" + green + " 項"
              setChatMessages(p => p.map((m: any) => m.id === thinkingMsgId ? { role: "ai", content: summary } : m))
              setAnalysisStatus("")
            }
          } catch {}
        }
      }
    } catch (e) {
      clearInterval(thinkingInterval)
      setChatMessages(p => p.filter((m: any) => m.id !== thinkingMsgId))
      const mock: MetricResult[] = Object.entries(METRIC_NAMES).map(([id, name]) => {
        const s = 0.35 + Math.random() * 0.45; const d = Math.random() * 0.18
        return {
          id, name, score: s, disagreement: d,
          agentA: { name: `${id}_A`, score: s, opinion: "分析記錄已載入。" },
          agentB: { name: `${id}_B`, score: s, opinion: "分析記錄已載入。" },
          status: scoreToStatus(s, d), refBasis: "Spec", consensus: d < 0.1,
        }
      })
      setAnalysis({ loading: false, done: true, specSummary: "（後端未連線，顯示本地模擬數據）", overallFeedback: "", metrics: mock, flags: [] })
      setChatMessages(p => [...p, { role: "ai", content: `後端連線失敗：${e}\n顯示本地模擬分項供參考，點擊各指標可追問。` }])
    }
  }, [artworks, getFullContext])

  // ── Save handlers ─────────────────────────────────────────────
  const handleSaveArtwork = useCallback(() => {
    if (artworks.length === 0) return
    setArtworkSaved(true)
    SS.set("c04_artwork_count", String(artworks.length))
    setChatMessages(p => [...p, { role: "user", content: `[儲存創作] ${artworks.length} 張圖片已儲存（版本 ${version}）` }])
    callAgent(`Artist 已儲存 ${artworks.length} 張創作圖片，版本 ${version}，備註：${remark || "（無）"}，標籤：${tags.join(", ") || "（無）"}。請確認已收到這批創作資訊。`)
  }, [artworks, version, remark, tags, callAgent])

  const handleSaveInfo = useCallback(() => {
    setInfoSaved(true)
    setChatMessages(p => [...p, { role: "user", content: `[版本與備註] 版本：${version}，備註：${remark || "（無）"}，標籤：${tags.join(", ") || "（無）"}` }])
    callAgent(`Artist 更新了版本資訊：版本 ${version}，備註：「${remark || "（無）"}」，標籤：${tags.join("、") || "無"}。`)
  }, [version, remark, tags, callAgent])

  const handleSaveRefs = useCallback(() => {
    if (artistRefs.length === 0) return
    setRefsSaved(true)
    const refList = artistRefs.map(r => `${r.label}: ${r.title}`).join("\n")
    setChatMessages(p => [...p, { role: "user", content: `[我的 References]\n${refList}` }])
    callAgent(`Artist 提供了以下 ${artistRefs.length} 張 References：\n${refList}\n\n請確認收到，並說明這些 References 整體上反映了什麼創作方向。`)
  }, [artistRefs, callAgent])

  // ── Submit notes ──────────────────────────────────────────────
  const handleSubmitNotes = useCallback(() => {
    if (!reflectionNotes.trim()) return
    setNotesSaved(true)
    // Persist to history list for QA page
    try {
      const hist: string[] = JSON.parse(SS.get("c04_notes_history") || "[]")
      if (reflectionNotes.trim() && !hist.includes(reflectionNotes)) {
        SS.set("c04_notes_history", JSON.stringify([reflectionNotes, ...hist.slice(0, 19)]))
      }
    } catch {}
    setChatMessages(p => [...p, { role: "user", content: `[創作反思筆記]\n${reflectionNotes}` }])
    callAgent(`以下是 Artist 的創作反思筆記，請仔細閱讀並給出具體、有建設性的回饋：\n\n${reflectionNotes}`)
  }, [reflectionNotes, callAgent])

  // ── Metric check → immediate AI response ─────────────────────
  const handleMetricCheck = useCallback((m: MetricResult, checked: boolean) => {
    if (!checked) return
    const sl = m.status === "red" ? "紅燈（需改進）" : m.status === "yellow" ? "黃燈（需關注）" : "綠燈（良好）"
    const debateCtx = m.debate?.conclusion ? `\n\nDebate 結論：${m.debate.conclusion}` : ""
    const agentCtx = [m.agentA.opinion, m.agentB.opinion].filter(Boolean).join("\n")
    const userMsg = `請針對「${m.name}」（${sl}）給出 2-3 個具體可執行的改進方向。`
    setChatMessages(p => [...p, { role: "user", content: userMsg }])
    callAgent(userMsg, `${agentCtx}${debateCtx}`)
  }, [callAgent])

  // ── Agent opinion click → immediate AI response ───────────────
  const handleAgentOpinionClick = useCallback((metricName: string, agentName: string, opinion: string, debate?: MetricResult["debate"]) => {
    const debateCtx = debate?.conclusion ? `\n\nDebate 結論：${debate.conclusion}` : ""
    const userMsg = `關於「${metricName}」，${agentName} 的觀察是：「${opinion}」。請根據這個觀察給出具體的改進建議。`
    setChatMessages(p => [...p, { role: "user", content: `[${metricName} — ${agentName} 意見] 請給出具體建議` }])
    setDialogMetric(null)
    callAgent(userMsg, debateCtx)
  }, [callAgent])

  // ── Manual chat send ──────────────────────────────────────────
  const handleChatSend = useCallback(() => {
    const msg = chatInput.trim(); if (!msg || chatLoading) return
    setChatInput("")
    setChatMessages(p => [...p, { role: "user", content: msg }])
    callAgent(msg)
  }, [chatInput, chatLoading, callAgent])

  // ── Ask agent from dialog ─────────────────────────────────────
  const runLiveDebate = useCallback(async (m: MetricResult) => {
    if (debateLoading) return
    setDebateLoading(true)
    setLiveDebate(null)
    try {
      // Use /chat/analysis so OpenAI+Gemini give FRESH independent perspectives,
      // not a reformatting of the existing agentA/B opinions
      const res = await fetch(`${API}/suggestion/chat/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `針對「${m.name}」指標進行三方辯論分析。OpenAI 和 Gemini 請各自從技術執行面和創意策略面提出與以下初步意見完全不同的新觀點，Claude 整合後給出 2-3 個具體可執行的改進建議。`,
          context: `初步評分意見（僅供參考，請提出不同角度）：
${m.agentA.name}：${m.agentA.opinion}

${m.agentB.name}：${m.agentB.opinion}`,
          project_id: "proj_001",
        }),
      })
      const data = await res.json()
      setLiveDebate({
        positionA: "",
        positionB: "",
        conclusion: data.reply || data.response || "無法取得辯論結果",
      })
    } catch {
      setLiveDebate({ positionA: "", positionB: "", conclusion: "連線失敗，請稍後再試" })
    }
    setDebateLoading(false)
  }, [debateLoading])

  const handleAskAgentFromDialog = useCallback(async (m: MetricResult) => {
    const sl = m.status === "red" ? "紅燈（需改進）" : m.status === "yellow" ? "黃燈（需關注）" : "綠燈（良好）"
    const debateCtx = m.debate?.conclusion ? `\n\nDebate 結論：${m.debate.conclusion}` : ""
    const agentCtx = [m.agentA.opinion, m.agentB.opinion].filter(Boolean).join("\n")
    const userMsg = `請針對「${m.name}」（${sl}）給出 2-3 個具體可執行的改進方向。${m.consensus ? "" : "Agent 意見有分歧，請先釐清核心問題再給建議。"}`
    setDialogMetric(null)
    setChatMessages(p => [...p, { role: "user", content: userMsg }])
    callAgent(userMsg, `${agentCtx}${debateCtx}`)
  }, [callAgent])

  // ── Helpers ───────────────────────────────────────────────────
  const statusIcon = (s: string, cls = "w-4 h-4") =>
    s === "red" ? <AlertTriangle className={`${cls} text-red-500`} /> :
    s === "yellow" ? <AlertTriangle className={`${cls} text-amber-500`} /> :
    <CheckCircle2 className={`${cls} text-green-500`} />
  const statusBg = (s: string) =>
    s === "red" ? "bg-red-500/10 border-red-500/30" :
    s === "yellow" ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <PipelineSidebar />
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col px-3 py-3 gap-2">

          {/* Header */}
          <div className="shrink-0 flex items-center gap-2">
            <Badge className="bg-primary">C04</Badge>
            <h1 className="text-lg font-bold">上傳與 AI 分析</h1>
            <p className="text-xs text-muted-foreground hidden md:block">Artist 作品 × Spec × Reference 全面評估</p>
          </div>

          {/* 3-column body */}
          <div className="flex flex-1 min-h-0 gap-0">

            {/* ── Col 1: Upload + Info ──── */}
            <div className="shrink-0 flex flex-col gap-2 min-h-0 overflow-y-auto" style={{ width: leftW }}>

              {/* Multi-artwork upload */}
              <Card>
                <CardHeader className="pb-1.5 pt-2.5 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />上傳創作檔案</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => fileInputRef.current?.click()}>
                        <Plus className="w-3 h-3" />新增
                      </Button>
                      <Button size="sm" variant={artworkSaved ? "default" : "outline"}
                        className={`h-6 text-[10px] px-2 gap-1 ${artworkSaved ? "bg-green-600 hover:bg-green-700" : "bg-transparent"}`}
                        disabled={artworks.length === 0}
                        onClick={() => setArtworkSaved(true)}>
                        <Save className="w-3 h-3" />{artworkSaved ? "已儲存" : "Save"}
                      </Button>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*,.exr" multiple className="hidden" onChange={handleFileSelect} />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {artworks.length === 0 ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-5 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={e => { handleDrop(e); e.currentTarget.classList.remove("border-primary","bg-primary/5") }}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary","bg-primary/5") }}
                      onDragLeave={e => e.currentTarget.classList.remove("border-primary","bg-primary/5")}>
                      <Upload className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground" />
                      <p className="text-xs font-medium mb-0.5">拖拉或點擊上傳（可多張）</p>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG, EXR, MP4</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5"
                      onDrop={e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")||f.type.startsWith("video/")); if(files.length>0){setArtworks(prev=>{const updated=[...prev.filter(a=>!files.some(f=>f.name.toLowerCase().replace(/\.[^.]+$/,'') === (a.file?.name||'').toLowerCase().replace(/\.[^.]+$/,''))), ...files.map(file=>({id:`aw_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,file,preview:URL.createObjectURL(file)}))]; saveArtworkPreviews(updated); return updated}); setArtworkSaved(false)} }}
                      onDragOver={e => e.preventDefault()}>
                      {artworks.map(aw => {
                        const isSelected = aw.id === selectedArtworkId
                        return (
                        <div
                          key={aw.id}
                          className={`relative aspect-square rounded overflow-hidden border-2 bg-muted cursor-pointer group transition-all ${isSelected ? "border-teal-500 ring-2 ring-teal-400/50" : "border-border hover:border-teal-400/50"}`}
                          title="點擊選定分析 · 雙擊討論"
                          onClick={() => setSelectedArtworkId(aw.id)}
                          onDoubleClick={e => {
                            e.stopPropagation()
                            const name = aw.file?.name || aw.id
                            setChatMessages(p => [...p, { role: "user", content: "[討論 Artwork] " + name }])
                            callAgent("請觀察這張 Artwork「" + name + "」，從光影、構圖、色彩等面向給出具體分析與改進建議。")
                          }}
                        >
                          <img src={aw.preview} alt={aw.file?.name || aw.id} className="w-full h-full object-cover" />
                          {/* Selected indicator */}
                          {isSelected && (
                            <div className="absolute top-0.5 left-0.5 bg-teal-500 rounded-full w-4 h-4 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          {/* Filename tooltip */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[8px] text-white truncate">{aw.file?.name || aw.id}</p>
                          </div>
                          <button className="absolute top-0.5 right-0.5 w-4 h-4 bg-background/80 rounded flex items-center justify-center"
                            onClick={e => { e.stopPropagation(); deleteItem("artworks", aw.id); setArtworks(p => p.filter(a => a.id !== aw.id)); if (isSelected) setSelectedArtworkId(null); setArtworkSaved(false) }}>
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        )
                      })}
                      <div className="aspect-square rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}>
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Artist Refs */}
              <Card>
                <CardHeader className="pb-1.5 pt-2.5 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-1.5"><Pin className="w-3.5 h-3.5" />我的 References</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={() => refInputRef.current?.click()}>
                        <Plus className="w-3 h-3" />Add
                      </Button>
                      <Button size="sm" variant={refsSaved ? "default" : "outline"}
                        className={`h-6 text-[10px] px-2 gap-1 ${refsSaved ? "bg-green-600 hover:bg-green-700" : "bg-transparent"}`}
                        disabled={artistRefs.length === 0}
                        onClick={() => setRefsSaved(true)}>
                        <Save className="w-3 h-3" />{refsSaved ? "已儲存" : "Save"}
                      </Button>
                    </div>
                    <input ref={refInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleRefUpload} />
                  </div>
                  <CardDescription className="text-[10px]">Save & Send 後納入 Agent 分析依據</CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {artistRefs.length === 0 ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => refInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary","bg-primary/5") }}
                      onDragLeave={e => e.currentTarget.classList.remove("border-primary","bg-primary/5")}
                      onDrop={e => {
                        e.preventDefault(); e.currentTarget.classList.remove("border-primary","bg-primary/5")
                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
                        if (files.length === 0) return
                        Promise.all(files.map(async file => ({
                          id: `ar_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                          label: "Secondary" as const, localPreview: await fileToBase64(file), file,
                          title: file.name.replace(/\.[^.]+$/, ""),
                        }))).then(newRefs => {
                          setArtistRefs(prev => {
                            const filtered = prev.filter(r => !newRefs.some(nr => nr.title.toLowerCase() === r.title.toLowerCase()))
                            return [...filtered, ...newRefs]
                          })
                          setRefsSaved(false)
                        })
                      }}>
                      <ImageIcon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">點擊或拖曳新增 Reference</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault()
                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
                        if (files.length === 0) return
                        Promise.all(files.map(async file => ({
                          id: `ar_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                          label: "Secondary" as const, localPreview: await fileToBase64(file), file,
                          title: file.name.replace(/\.[^.]+$/, ""),
                        }))).then(newRefs => {
                          setArtistRefs(prev => {
                            const filtered = prev.filter(r => !newRefs.some(nr => nr.title.toLowerCase() === r.title.toLowerCase()))
                            return [...filtered, ...newRefs]
                          })
                          setRefsSaved(false)
                        })
                      }}>
                      {artistRefs.map(ref => (
                        <RefCard
                          key={ref.id}
                          data={{
                            id: ref.id,
                            title: ref.title,
                            preview: ref.localPreview,
                            category: ref.category,
                            importance: ref.label,
                            usage: ref.usage,
                            note: ref.note,
                            artworkId: ref.artworkId,
                          }}
                          artworkOptions={artworks.map(a => ({ id: a.id, name: a.file?.name?.replace(/\.[^.]+$/, "") || a.id }))}
                          onChange={updated => {
                            setArtistRefs(p => p.map(r => r.id === ref.id ? {
                              ...r,
                              category: updated.category,
                              label: updated.importance ?? r.label,
                              usage: updated.usage,
                              note: updated.note,
                              artworkId: updated.artworkId,
                            } : r))
                            setRefsSaved(false)
                          }}
                          onDelete={() => { deleteItem("references", ref.id); setArtistRefs(p => p.filter(r => r.id !== ref.id)); setRefsSaved(false) }}
                          onDiscuss={d => {
                            setChatMessages(p => [...p, { role: "user", content: `[討論 Reference] ${d.title}${d.category ? ` (${d.category})` : ""}${d.note ? `
備注：${d.note}` : ""}` }])
                            callAgent(`請分析這張 Reference「${d.title}」${d.category ? `（類別：${d.category}）` : ""}的視覺特徵，以及它對當前作品的參考價值。${d.note ? `Artist 的備注：${d.note}` : ""}`)
                          }}
                          onSave={updated => {
                            setRefsSaved(true)
                            try {
                              const cached = JSON.parse(SS.get("refhub_refs") || "[]")
                              const cacheMap: Record<string, any> = {}
                              cached.forEach((c: any) => { cacheMap[c.id] = c })
                              if (cacheMap[ref.id]) {
                                cacheMap[ref.id] = { ...cacheMap[ref.id], category: updated.category, note: updated.note, importance: updated.importance, usage: updated.usage, artworkId: updated.artworkId }
                                SS.set("refhub_refs", JSON.stringify(Object.values(cacheMap)))
                              }
                            } catch {}
                          }}
                        />
                      ))}
                      {/* Add more */}
                      <div className="flex items-center justify-center rounded-xl border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors min-h-[200px]"
                        onClick={() => refInputRef.current?.click()}>
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>


              {/* Send All to Agent */}
              <Button size="lg" className="w-full gap-2 py-4 text-sm"
                disabled={artworks.length === 0 && artistRefs.length === 0}
                onClick={() => {
                  const parts: string[] = []
                  if (artworks.length > 0) parts.push(`${artworks.length} 張創作圖（版本 ${version}${remark ? "，備註：" + remark : ""}${tags.length > 0 ? "，標籤：" + tags.join("、") : ""}）`)
                  if (artistRefs.length > 0) parts.push(`${artistRefs.length} 張 References（${artistRefs.map(r => r.label + ": " + r.title).join("；")}）`)
                  const msg = `[送出給 Agent] ${parts.join("；")}`
                  setChatMessages(p => [...p, { role: "user", content: msg }])
                  callAgent(`Artist 提交了以下創作資料，請給出整體觀察與建議：\n\n${parts.join("\n")}`)
                }}>
                <Send className="w-4 h-4" />與AI 分析助手討論
              </Button>

              {/* Reflection Notes */}
              <Card className="border-indigo-500/30 bg-indigo-500/5">
                <CardHeader className="pb-1.5 pt-2.5 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5 text-indigo-700"><BookOpen className="w-3.5 h-3.5" />創作反思筆記</CardTitle>
                  <CardDescription className="text-[10px]">Submit 後 Agent 讀取並回饋</CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  <Textarea value={reflectionNotes} onChange={e => { setReflectionNotes(e.target.value); setNotesSaved(false) }}
                    placeholder={"- 光影方向選擇原因...\n- 色溫偏暖的理由...\n- 構圖考量..."} rows={4} className="text-xs" />
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="flex-1 text-[10px] h-7 bg-transparent gap-1"
                      disabled={!reflectionNotes.trim()} onClick={() => setNotesSaved(true)}>
                      <Save className="w-3 h-3" />{notesSaved ? "已儲存" : "Save"}
                    </Button>
                    <Button size="sm" className="flex-1 text-[10px] h-7 gap-1"
                      disabled={!reflectionNotes.trim()} onClick={handleSubmitNotes}>
                      <Send className="w-3 h-3" />Submit to Agent
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* ── Drag handle L ── */}
            <div className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/30 rounded transition-colors self-stretch mx-1.5"
              onMouseDown={startDrag("left")} />

            {/* ── Col 2: Analysis ──── */}
            <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">

              {/* 總體回饋 */}
              <Card className="shrink-0">
                <CardHeader className="pb-1.5 pt-2.5 px-3 cursor-pointer" onClick={() => setSpecOpen(o => !o)}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />分析結果 — 總體回饋
                      {analysis.loading && <Loader2 className="w-3 h-3 animate-spin text-teal-600" />}
                    </CardTitle>
                    {specOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </CardHeader>
                {specOpen && (
                  <CardContent className="px-3 pb-3">
                    {!analysis.done && !analysis.loading && <p className="text-xs text-muted-foreground">點擊「開始分析」後顯示結果。</p>}
                    {analysis.loading && (
                      <div className="flex items-center gap-2 text-xs text-teal-600 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>{analysisStatus || "Agents 正在生成總體回饋..."}</span>
                      </div>
                    )}
                    {analysis.done && (
                      <ScrollArea className="h-48">
                        <div className="space-y-3 pr-3">
                          <p className="text-xs leading-relaxed whitespace-pre-line">{analysis.specSummary}</p>
                          {analysis.flags.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-[10px] font-medium text-orange-500/80 flex items-center gap-1 mb-1.5">
                                <AlertTriangle className="w-3 h-3" />需轉交導演進一步討論
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {analysis.flags.map((f, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] bg-orange-500/8 text-orange-600 border-orange-500/20">{f}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* 分項指標回饋 */}
              <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="pb-1.5 pt-2.5 px-3 cursor-pointer shrink-0" onClick={() => setAiOpen(o => !o)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <CardTitle className="text-xs">分項指標回饋</CardTitle>
                      {analysis.done && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-red-500 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" />{analysis.metrics.filter(m=>m.status==="red").length}</span>
                          <span className="text-amber-500 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />{analysis.metrics.filter(m=>m.status==="yellow").length}</span>
                          <span className="text-green-500 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" />{analysis.metrics.filter(m=>m.status==="green").length}</span>
                        </div>
                      )}
                    </div>
                    {aiOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>

                </CardHeader>
                {aiOpen && (
                  <CardContent className="px-3 pb-3 flex-1 min-h-0 flex flex-col">
                    {!analysis.done && !analysis.loading && analysis.metrics.length === 0 && <p className="text-xs text-muted-foreground">分析完成後顯示。</p>}
                    {analysis.loading && analysis.metrics.length === 0 && (
                      <div className="flex items-center gap-2 text-xs text-teal-600 py-4">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>{analysisStatus || "AI Agents 並行評估中，請稍候..."}</span>
                      </div>
                    )}
                    {analysis.loading && analysis.metrics.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-teal-600 pb-1.5">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        <span>{analysisStatus || "評估中..."}</span>
                      </div>
                    )}
                    {(analysis.done || analysis.metrics.length > 0) && (
                      <ScrollArea className="flex-1 min-h-0">
                        <div className="space-y-1.5 pr-1">
                          {analysis.metrics.map(m => (
                            <div key={m.id}
                              className={`rounded-lg border p-2 cursor-pointer hover:opacity-80 transition-opacity ${statusBg(m.status)}`}
                              onClick={() => setDialogMetric(m)}>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  onClick={e => e.stopPropagation()}
                                  onCheckedChange={c => handleMetricCheck(m, !!c)}
                                  className="shrink-0" />
                                {statusIcon(m.status, "w-3.5 h-3.5")}
                                <span className="text-xs font-medium flex-1 min-w-0">{m.name}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {!m.consensus && <Badge variant="outline" className="text-[9px] h-3.5 bg-amber-500/10 text-amber-600 border-amber-500/30">意見分歧</Badge>}
                                  {m.flag && <Badge variant="outline" className="text-[9px] h-3.5 bg-orange-500/10 text-orange-600 border-orange-500/30">請轉交導演</Badge>}
                                  {m.debate && <Badge variant="outline" className="text-[9px] h-3.5 bg-purple-500/10 text-purple-600 border-purple-500/30">已辯論</Badge>}
                                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                </div>
                              </div>
                              <div className="mt-1.5 ml-6 space-y-0.5">
                                {m.agentA.opinion
                                  ? <p className="text-[9px] text-muted-foreground line-clamp-1">{m.agentA.name}：{m.agentA.opinion}</p>
                                  : m.debate?.conclusion
                                    ? <p className="text-[9px] text-muted-foreground line-clamp-2">{m.debate.conclusion}</p>
                                    : null}
                                {m.agentB.opinion && <p className="text-[9px] text-muted-foreground line-clamp-1">{m.agentB.name}：{m.agentB.opinion}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Metric scope selector + Action buttons */}
              <Card className="shrink-0">
                <CardHeader className="pb-1.5 pt-2.5 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />分析範圍
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {/* 全部 */}
                    <Badge
                      variant={analyzeScope.includes("all") ? "default" : "outline"}
                      className="text-[10px] cursor-pointer"
                      onClick={() => setAnalyzeScope(["all"])}>
                      ✓ 全部
                    </Badge>
                    {/* Reference 項目 — maps refhub categories to metrics */}
                    <Badge
                      variant={analyzeScope.includes("refs") ? "default" : "outline"}
                      className="text-[10px] cursor-pointer"
                      onClick={() => {
                        if (analyzeScope.includes("refs")) {
                          setAnalyzeScope(["all"])
                        } else {
                          // Read actual categories from refhub
                          try {
                            const saved = sessionStorage.getItem("refhub_refs")
                            const refs = saved ? JSON.parse(saved) : []
                            const cats: string[] = [...new Set(refs.map((r: any) => r.category).filter(Boolean))]
                            const metricIds = cats.map((c: string) => CATEGORY_TO_METRIC[c]).filter(Boolean)
                            setAnalyzeScope(metricIds.length > 0 ? metricIds : ["light","composition","color","style","faithfulness"])
                          } catch {
                            setAnalyzeScope(["light","composition","color","style","faithfulness"])
                          }
                        }
                      }}>
                      Reference 項目
                    </Badge>
                    {/* Individual metrics */}
                    {Object.entries(METRIC_NAMES).map(([id, name]) => (
                      <Badge key={id}
                        variant={analyzeScope.includes(id) ? "default" : "outline"}
                        className="text-[10px] cursor-pointer"
                        onClick={() => setAnalyzeScope(p =>
                          p.includes(id) ? p.filter(s=>s!==id&&s!=="all") : [...p.filter(s=>s!=="all"), id]
                        )}>
                        {name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 shrink-0">
                {artworks.length > 0 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    分析圖：<span className="text-teal-600 font-medium">{artworks.find(a => a.id === selectedArtworkId)?.file?.name || "（未選擇）"}</span>
                  </p>
                )}
                <Button size="lg" onClick={handleAnalyze} disabled={analysis.loading} className="flex-1 gap-2 py-5">
                  {analysis.loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />分析中…</>
                    : <><Sparkles className="w-4 h-4" />開始分析 Analyze</>}
                </Button>
                <Button size="lg" variant="outline" className="flex-1 gap-2 py-5 bg-transparent" asChild>
                  <a href="/compare"><ChevronRight className="w-4 h-4" />Jump to Reference Compare</a>
                </Button>
              </div>

            </div>

            {/* ── Drag handle R ── */}
            <div className="w-1.5 shrink-0 cursor-col-resize hover:bg-primary/30 rounded transition-colors self-stretch mx-1.5"
              onMouseDown={startDrag("right")} />

            {/* ── Col 3: Chat ──── */}
            <div className="shrink-0 flex flex-col min-h-0" style={{ width: rightW }}>
              <Card className="border-teal-500/30 bg-teal-500/5 flex flex-col flex-1 min-h-0">
                <CardHeader className="pb-1.5 pt-2.5 px-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-teal-600" />
                    <CardTitle className="text-xs">AI 分析助手</CardTitle>
                    <Badge variant="secondary" className="text-[9px] bg-teal-500/20 text-teal-700 ml-auto">{chatMessages.length}</Badge>
                  </div>
                  <CardDescription className="text-[10px]">勾選指標或點擊 Agent 意見 → 立即獲得回饋</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
                  <ScrollArea className="flex-1 min-h-0 px-3 py-2">
                    <div className="space-y-2.5">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role==="user"?"flex-row-reverse":""}`}>
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarFallback className={msg.role==="ai"?"bg-teal-500/10 text-teal-600":"bg-primary/10"}>
                              {msg.role==="ai"?<Bot className="w-3 h-3"/>:"A"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg px-2.5 py-1.5 min-w-0 max-w-[80%] break-words text-xs ${msg.role==="ai"?"bg-muted":"bg-primary text-primary-foreground"}`}>
                            <p className="whitespace-pre-line">{msg.role === "ai" ? renderWithBold(msg.content) : msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex gap-2">
                          <Avatar className="w-6 h-6 shrink-0"><AvatarFallback className="bg-teal-500/10 text-teal-600"><Bot className="w-3 h-3"/></AvatarFallback></Avatar>
                          <div className="rounded-lg px-2.5 py-1.5 bg-muted flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin text-teal-500"/><span className="text-[10px] text-muted-foreground">AI 思考中…</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatScrollRef} />
                    </div>
                  </ScrollArea>
                  <div className="px-3 pb-3 pt-2 border-t shrink-0 flex gap-1.5">
                    <Input placeholder="分享你的想法" value={chatInput} onChange={e => setChatInput(e.target.value)} className="h-8 text-xs" />
                    <Button size="icon" className="w-8 h-8 shrink-0" onClick={handleChatSend} disabled={chatLoading}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </main>
      </div>

      {/* ── Metric Detail Dialog ── */}
      <Dialog open={!!dialogMetric} onOpenChange={open => { if (!open) { setDialogMetric(null); setLiveDebate(null) } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogMetric && statusIcon(dialogMetric.status)}
              {dialogMetric?.name} — 詳細分析
            </DialogTitle>
            <DialogDescription>
              {dialogMetric?.status === "red" ? "❌ 紅燈 — 需優先改進" : dialogMetric?.status === "yellow" ? "⚠️ 黃燈 — 需關注" : "✅ 綠燈 — 通過"}
              {dialogMetric && !dialogMetric.consensus ? "　意見分歧" : "　Agent 共識"}
              {dialogMetric?.flag ? "　⚡ Handoff 建議" : ""}
            </DialogDescription>
          </DialogHeader>
          {dialogMetric && (
            <div className="space-y-4">

              {/* Dual-Agent 初步綜合意見 */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />Dual-Agent 初步綜合意見
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">（點擊 Agent 卡片，對話框立即回饋）</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { ag: dialogMetric.agentA, label: "A" },
                    { ag: dialogMetric.agentB, label: "B" },
                  ].map(({ ag }) => (
                    <Card key={ag.name} className={`p-3 transition-colors ${ag.opinion ? "cursor-pointer hover:bg-muted/60" : "opacity-50"}`}
                      onClick={() => ag.opinion && handleAgentOpinionClick(dialogMetric.name, ag.name, ag.opinion, dialogMetric.debate)}>
                      <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">{ag.name}</p>
                      {ag.opinion
                        ? <p className="text-xs leading-relaxed">{ag.opinion}</p>
                        : <p className="text-xs text-muted-foreground italic">— 詳見 Claude 整合結論 —</p>
                      }
                    </Card>
                  ))}
                </div>
              </div>

              {/* Agent Debate — Live 3-party */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />Agent Debate
                    <span className="text-[10px] text-muted-foreground font-normal">OpenAI + Gemini → Claude 主導整合</span>
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 border-purple-400/50 text-purple-600 hover:bg-purple-500/10"
                    disabled={debateLoading || !dialogMetric.agentA.opinion}
                    onClick={() => runLiveDebate(dialogMetric)}>
                    {debateLoading
                      ? <><Loader2 className="w-3 h-3 animate-spin" />辯論中…</>
                      : <><Zap className="w-3 h-3" />觸發三方辯論</>}
                  </Button>
                </div>

                {/* Use liveDebate if available, else fall back to backend debate */}
                {(() => {
                  // liveDebate (user-triggered) overrides backend debate; both fall back to empty state
                  const d = liveDebate || dialogMetric.debate
                  if (!d || (!d.positionA && !d.positionB && !d.conclusion)) {
                    return (
                      <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg flex items-center justify-center gap-2">
                        {debateLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin text-purple-500" /><p className="text-xs text-muted-foreground">OpenAI + Gemini 辯論中，Claude 整合中…</p></>
                          : <><Loader2 className="w-4 h-4 animate-spin text-purple-400" /><p className="text-xs text-muted-foreground">後台辯論進行中，稍候自動顯示…</p></>
                        }
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-2">
                      {d.conclusion && (
                        <div className="p-2.5 bg-teal-500/10 rounded-lg cursor-pointer hover:bg-teal-500/20 transition-colors border border-teal-500/20"
                          onClick={() => { setChatMessages(p => [...p, { role: "user", content: `[${dialogMetric.name} — Claude 整合結論]` }]); setDialogMetric(null); setLiveDebate(null); callAgent(`「${dialogMetric.name}」Claude 整合結論：${d.conclusion}

請給出 2-3 個具體可執行的改進步驟。`) }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Bot className="w-3 h-3 text-teal-600" />
                            <p className="text-[10px] font-semibold text-teal-700">Claude 視覺分析與建議<span className="text-teal-500 font-normal ml-1">（點擊讓 Agent 進一步說明）</span></p>
                          </div>
                          <p className="text-xs text-teal-800 leading-relaxed whitespace-pre-wrap">{d.conclusion}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* 轉交導演 — 只在極嚴重分歧才顯示 */}
              {dialogMetric.flag && (
                <div className="p-2.5 bg-orange-500/8 rounded-lg flex items-center gap-2 border border-orange-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <div>
                    <p className="text-[11px] font-medium text-orange-600">建議與導演討論</p>
                    <p className="text-[10px] text-orange-500/80">此指標分歧程度與偏差均超過閾值，可向導演確認創作方向後再修正。</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="bg-transparent" onClick={() => setDialogMetric(null)}>關閉</Button>
                <Button onClick={() => handleAskAgentFromDialog(dialogMetric)}>
                  <Zap className="w-3.5 h-3.5 mr-1.5" />請 Agent 給建議
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function UploadAnalyzePage() {
  return <Suspense fallback={null}><UploadAnalyzeContent /></Suspense>
}