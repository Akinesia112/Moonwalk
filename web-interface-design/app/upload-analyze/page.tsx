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
  light: "Lighting", composition: "Composition", sketch: "Sketch/Lines", color: "Color",
  style: "Style Consistency", percept: "Perceptual Quality", faithfulness: "Spec Faithfulness",
  control: "Controllability", robustness: "Stability", efficiency: "Efficiency", stability: "Consistency",
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
  const parts = text.split(/(\*\*(?:Director|Supervisor|Director|Supervisor)\*\*)/g)
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
    { role: "ai", content: "Hello! Upload your artwork and click 'Start Analysis'. I will coordinate multiple AI Agents for a comprehensive Spec + Reference evaluation.\n\nCheck individual metrics or click Agent opinions for immediate feedback." }
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // ── Panels
  const [leftW, setLeftW] = useState(420)
  const [rightW, setRightW] = useState(420)
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
        return refs.map((r: any) => `${r.title || r.id}${r.note ? `（${r.note})` : ""}`).join("\n")
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
    const systemNote = `You are a VFX AI Analysis assistant. Current analysis context:\nDirector Spec: ${ctx.brief_context || "(not filled)"}\nVersion: ${ctx.version}, notes: ${ctx.remark || "(none)"}\nArtist References: ${ctx.refs_context || "(none)"}${extraCtx ? `\n\nAdditional context: ${extraCtx}` : ""}\n\nRules: respond in English, no markdown symbols like ** or ---, plain text only.`
    try {
      const res = await fetch(`${API}/suggestion/chat/analysis`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          message: `${systemNote}\n\nUser message: ${userMsg}`,
          history: chatMessages.slice(-6).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        }),
      })
      const data = await res.json()
      const reply = stripBold(data.response || data.reply || data.message || "Sorry, unable to respond.")
      setChatMessages(p => [...p, { role: "ai", content: reply }])
    } catch {
      setChatMessages(p => [...p, { role: "ai", content: "Connection failed. Please confirm the backend is running." }])
    } finally {
      setChatLoading(false)
    }
  }, [chatMessages, getFullContext])

  // ── Analyze ───────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    setAnalysis(p => ({ ...p, loading: true, done: false }))
    setChatMessages(p => [...p, { role: "user", content: "[Start Analysis]" }])

    // ── Progressive thinking messages ──────────────────────────
    const thinkingSteps = [
      "Uploading images to analysis system...",
      "OpenAI evaluating lighting, composition, and color from a technical perspective...",
      "Gemini analyzing visual language from a creative strategy perspective...",
      "Claude integrating all perspectives in a Debate...",
      "Calculating metric scores and disagreement levels...",
      "Generating Spec faithfulness and overall assessment...",
      "Preparing full analysis report...",
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
              const progressText = (METRIC_NAMES[evt.id] || evt.id) + " analysis complete (" + evt.done + "/" + evt.total + ")..."
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
                specSummary: stripBold(evt.spec_summary || "Analysis complete."),
                overallFeedback: "",
                metrics: finalMetrics,
                flags: finalMetrics.filter(m => m.flag === "handoff_needed").map(m => m.name),
              }
              setAnalysis(na)
              const red = finalMetrics.filter(m => m.status === "red").length
              const yellow = finalMetrics.filter(m => m.status === "yellow").length
              const green = finalMetrics.filter(m => m.status === "green").length
              const summary = "Analysis complete! Evaluated " + finalMetrics.length + " metrics.\n❌ Needs improvement: " + red + "  ⚠️ Needs attention: " + yellow + "  ✅ Good: " + green + " metric(s)"
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
          agentA: { name: `${id}_A`, score: s, opinion: "Analysis record loaded." },
          agentB: { name: `${id}_B`, score: s, opinion: "Analysis record loaded." },
          status: scoreToStatus(s, d), refBasis: "Spec", consensus: d < 0.1,
        }
      })
      setAnalysis({ loading: false, done: true, specSummary: "(Backend disconnected — showing local mock data)", overallFeedback: "", metrics: mock, flags: [] })
      setChatMessages(p => [...p, { role: "ai", content: `Backend connection failed: ${e}\nShowing local mock metrics for reference. Click any metric to follow up.` }])
    }
  }, [artworks, getFullContext])

  // ── Save handlers ─────────────────────────────────────────────
  const handleSaveArtwork = useCallback(() => {
    if (artworks.length === 0) return
    setArtworkSaved(true)
    SS.set("c04_artwork_count", String(artworks.length))
    setChatMessages(p => [...p, { role: "user", content: `[Save Artwork] ${artworks.length} image(s) saved (version ${version})` }])
    callAgent(`Artist saved ${artworks.length} artwork image(s), version ${version}, notes: ${remark || "(none)"}, tags: ${tags.join(", ") || "(none)"}. Please confirm receipt.`)
  }, [artworks, version, remark, tags, callAgent])

  const handleSaveInfo = useCallback(() => {
    setInfoSaved(true)
    setChatMessages(p => [...p, { role: "user", content: `[Version & Notes] Version: ${version}, notes: ${remark || "(none)"}, tags: ${tags.join(", ") || "(none)"}` }])
    callAgent(`Artist updated version info: version ${version}, notes: 「${remark || "(none)"}", tags: ${tags.join(", ") || "none"}。`)
  }, [version, remark, tags, callAgent])

  const handleSaveRefs = useCallback(() => {
    if (artistRefs.length === 0) return
    setRefsSaved(true)
    const refList = artistRefs.map(r => `${r.label}: ${r.title}`).join("\n")
    setChatMessages(p => [...p, { role: "user", content: `[My References]\n${refList}` }])
    callAgent(`Artist provided ${artistRefs.length} reference(s):\n${refList}\n\nPlease confirm receipt and describe the overall creative direction these References reflect.`)
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
    setChatMessages(p => [...p, { role: "user", content: `[Creative Reflection Notes]\n${reflectionNotes}` }])
    callAgent(`The following are the Artist's creative reflection notes. Please read carefully and provide specific, constructive feedback:\n\n${reflectionNotes}`)
  }, [reflectionNotes, callAgent])

  // ── Metric check → immediate AI response ─────────────────────
  const handleMetricCheck = useCallback((m: MetricResult, checked: boolean) => {
    if (!checked) return
    const sl = m.status === "red" ? "Red (Needs Improvement)" : m.status === "yellow" ? "Yellow (Needs Attention)" : "Green (Good)"
    const debateCtx = m.debate?.conclusion ? `\n\nDebate Conclusion: ${m.debate.conclusion}` : ""
    const agentCtx = [m.agentA.opinion, m.agentB.opinion].filter(Boolean).join("\n")
    const userMsg = `Please provide 2–3 specific, actionable improvement directions for "${m.name}" (${sl}).`
    setChatMessages(p => [...p, { role: "user", content: userMsg }])
    callAgent(userMsg, `${agentCtx}${debateCtx}`)
  }, [callAgent])

  // ── Agent opinion click → immediate AI response ───────────────
  const handleAgentOpinionClick = useCallback((metricName: string, agentName: string, opinion: string, debate?: MetricResult["debate"]) => {
    const debateCtx = debate?.conclusion ? `\n\nDebate Conclusion: ${debate.conclusion}` : ""
    const userMsg = `Regarding "${metricName}", ${agentName}'s observation: "${opinion}". Please provide specific improvement suggestions based on this observation.`
    setChatMessages(p => [...p, { role: "user", content: `[${metricName} — ${agentName} opinion] Please give specific suggestions` }])
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
          message: `Conduct a three-party debate analysis on the "${m.name}" metric. OpenAI and Gemini should each propose new perspectives from technical and creative angles that differ from the preliminary opinions below. Claude then integrates and provides 2–3 specific improvement suggestions.`,
          context: `Preliminary scoring opinions (for reference only — please propose different angles):
${m.agentA.name}：${m.agentA.opinion}

${m.agentB.name}：${m.agentB.opinion}`,
          project_id: "proj_001",
        }),
      })
      const data = await res.json()
      setLiveDebate({
        positionA: "",
        positionB: "",
        conclusion: data.reply || data.response || "Unable to retrieve debate result",
      })
    } catch {
      setLiveDebate({ positionA: "", positionB: "", conclusion: "Connection failed. Please try again later." })
    }
    setDebateLoading(false)
  }, [debateLoading])

  const handleAskAgentFromDialog = useCallback(async (m: MetricResult) => {
    const sl = m.status === "red" ? "Red (Needs Improvement)" : m.status === "yellow" ? "Yellow (Needs Attention)" : "Green (Good)"
    const debateCtx = m.debate?.conclusion ? `\n\nDebate Conclusion: ${m.debate.conclusion}` : ""
    const agentCtx = [m.agentA.opinion, m.agentB.opinion].filter(Boolean).join("\n")
    const userMsg = `Please provide 2–3 specific, actionable improvement directions for "${m.name}" (${sl}).${m.consensus ? "" : "Agents have differing opinions. Please clarify the core issue before giving suggestions."}`
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
            <h1 className="text-lg font-bold">Upload & AI Analysis</h1>
            <p className="text-xs text-muted-foreground hidden md:block">Artist Artwork × Spec × Reference Comprehensive Evaluation</p>
          </div>

          {/* 3-column body */}
          <div className="flex flex-1 min-h-0 gap-0">

            {/* ── Col 1: Upload + Info ──── */}
            <div className="shrink-0 flex flex-col gap-2 min-h-0 overflow-y-auto" style={{ width: leftW }}>

              {/* Multi-artwork upload */}
              <Card>
                <CardHeader className="pb-1.5 pt-2.5 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />Upload Artwork</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => fileInputRef.current?.click()}>
                        <Plus className="w-3 h-3" />Add
                      </Button>
                      <Button size="sm" variant={artworkSaved ? "default" : "outline"}
                        className={`h-6 text-[10px] px-2 gap-1 ${artworkSaved ? "bg-green-600 hover:bg-green-700" : "bg-transparent"}`}
                        disabled={artworks.length === 0}
                        onClick={() => setArtworkSaved(true)}>
                        <Save className="w-3 h-3" />{artworkSaved ? "Saved" : "Save"}
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
                      <p className="text-xs font-medium mb-0.5">Drag & drop or click to upload (multiple allowed)</p>
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
                          title="Click to select for analysis · Double-click to discuss"
                          onClick={() => setSelectedArtworkId(aw.id)}
                          onDoubleClick={e => {
                            e.stopPropagation()
                            const name = aw.file?.name || aw.id
                            setChatMessages(p => [...p, { role: "user", content: "[Discuss Artwork] " + name }])
                            callAgent("Please examine this Artwork '" + name + "' and provide specific analysis and improvement suggestions across lighting, composition, and color.")
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
                    <CardTitle className="text-xs flex items-center gap-1.5"><Pin className="w-3.5 h-3.5" />My References</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={() => refInputRef.current?.click()}>
                        <Plus className="w-3 h-3" />Add
                      </Button>
                      <Button size="sm" variant={refsSaved ? "default" : "outline"}
                        className={`h-6 text-[10px] px-2 gap-1 ${refsSaved ? "bg-green-600 hover:bg-green-700" : "bg-transparent"}`}
                        disabled={artistRefs.length === 0}
                        onClick={() => setRefsSaved(true)}>
                        <Save className="w-3 h-3" />{refsSaved ? "Saved" : "Save"}
                      </Button>
                    </div>
                    <input ref={refInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleRefUpload} />
                  </div>
                  <CardDescription className="text-[10px]">Included in Agent analysis after Save & Send</CardDescription>
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
                      <p className="text-[10px] text-muted-foreground">Click or drag to add Reference</p>
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
                            setChatMessages(p => [...p, { role: "user", content: `[Discuss Reference] ${d.title}${d.category ? ` (${d.category})` : ""}${d.note ? `
Notes: ${d.note}` : ""}` }])
                            callAgent(`Please analyze this Reference "${d.title}"${d.category ? ` (category: ${d.category})` : ""} — describe its visual characteristics and reference value for the current artwork.${d.note ? ` Artist notes: ${d.note}` : ""}`)
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
                  if (artworks.length > 0) parts.push(`${artworks.length} artwork image(s) (version ${version}${remark ? ", notes: " + remark : ""}${tags.length > 0 ? ", tags: " + tags.join(", ") : ""})`)
                  if (artistRefs.length > 0) parts.push(`${artistRefs.length} reference(s) (${artistRefs.map(r => r.label + ": " + r.title).join("; ")})`)
                  const msg = `[Send to Agent] ${parts.join("; ")}`
                  setChatMessages(p => [...p, { role: "user", content: msg }])
                  callAgent(`Artist submitted the following creative materials. Please provide overall observations and suggestions:\n\n${parts.join("\n")}`)
                }}>
                <Send className="w-4 h-4" />Discuss with AI Analysis Assistant
              </Button>

              {/* Reflection Notes */}
              <Card className="border-indigo-500/30 bg-indigo-500/5">
                <CardHeader className="pb-1.5 pt-2.5 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5 text-indigo-700"><BookOpen className="w-3.5 h-3.5" />Creative Reflection Notes</CardTitle>
                  <CardDescription className="text-[10px]">Agent reads and responds after Submit</CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  <Textarea value={reflectionNotes} onChange={e => { setReflectionNotes(e.target.value); setNotesSaved(false) }}
                    placeholder={"- Reason for lighting direction choice...\n- Why a warmer color temperature...\n- Compositional considerations..."} rows={4} className="text-xs" />
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="flex-1 text-[10px] h-7 bg-transparent gap-1"
                      disabled={!reflectionNotes.trim()} onClick={() => setNotesSaved(true)}>
                      <Save className="w-3 h-3" />{notesSaved ? "Saved" : "Save"}
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

              {/* Overall Feedback */}
              <Card className="shrink-0">
                <CardHeader className="pb-1.5 pt-2.5 px-3 cursor-pointer" onClick={() => setSpecOpen(o => !o)}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />Analysis Results — Overall Feedback
                      {analysis.loading && <Loader2 className="w-3 h-3 animate-spin text-teal-600" />}
                    </CardTitle>
                    {specOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </CardHeader>
                {specOpen && (
                  <CardContent className="px-3 pb-3">
                    {!analysis.done && !analysis.loading && <p className="text-xs text-muted-foreground">Results will appear after clicking 'Start Analysis'.</p>}
                    {analysis.loading && (
                      <div className="flex items-center gap-2 text-xs text-teal-600 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>{analysisStatus || "Agents generating overall feedback..."}</span>
                      </div>
                    )}
                    {analysis.done && (
                      <ScrollArea className="h-48">
                        <div className="space-y-3 pr-3">
                          <p className="text-xs leading-relaxed whitespace-pre-line">{analysis.specSummary}</p>
                          {analysis.flags.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-[10px] font-medium text-orange-500/80 flex items-center gap-1 mb-1.5">
                                <AlertTriangle className="w-3 h-3" />Escalate to Director for further discussion
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

              {/* Per-Metric Feedback */}
              <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="pb-1.5 pt-2.5 px-3 cursor-pointer shrink-0" onClick={() => setAiOpen(o => !o)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <CardTitle className="text-xs">Per-Metric Feedback</CardTitle>
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
                    {!analysis.done && !analysis.loading && analysis.metrics.length === 0 && <p className="text-xs text-muted-foreground">Results will appear after analysis completes.</p>}
                    {analysis.loading && analysis.metrics.length === 0 && (
                      <div className="flex items-center gap-2 text-xs text-teal-600 py-4">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>{analysisStatus || "AI Agents running parallel evaluation, please wait..."}</span>
                      </div>
                    )}
                    {analysis.loading && analysis.metrics.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-teal-600 pb-1.5">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        <span>{analysisStatus || "Evaluating..."}</span>
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
                                  {!m.consensus && <Badge variant="outline" className="text-[9px] h-3.5 bg-amber-500/10 text-amber-600 border-amber-500/30">Opinion Divergence</Badge>}
                                  {m.flag && <Badge variant="outline" className="text-[9px] h-3.5 bg-orange-500/10 text-orange-600 border-orange-500/30">Escalate to Director</Badge>}
                                  {m.debate && <Badge variant="outline" className="text-[9px] h-3.5 bg-purple-500/10 text-purple-600 border-purple-500/30">Debated</Badge>}
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
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />Analysis Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {/* All */}
                    <Badge
                      variant={analyzeScope.includes("all") ? "default" : "outline"}
                      className="text-[10px] cursor-pointer"
                      onClick={() => setAnalyzeScope(["all"])}>
                      ✓ All
                    </Badge>
                    {/* Reference Items — maps refhub categories to metrics */}
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
                      Reference Items
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
                    Artwork: <span className="text-teal-600 font-medium">{artworks.find(a => a.id === selectedArtworkId)?.file?.name || "(none selected)"}</span>
                  </p>
                )}
                <Button size="lg" onClick={handleAnalyze} disabled={analysis.loading} className="flex-1 gap-2 py-5">
                  {analysis.loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</>
                    : <><Sparkles className="w-4 h-4" />Start Analysis</>}
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
                    <CardTitle className="text-xs">AI Analysis Assistant</CardTitle>
                    <Badge variant="secondary" className="text-[9px] bg-teal-500/20 text-teal-700 ml-auto">{chatMessages.length}</Badge>
                  </div>
                  <CardDescription className="text-[10px]">Check metrics or click Agent opinions → get instant feedback</CardDescription>
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
                            <Loader2 className="w-3 h-3 animate-spin text-teal-500"/><span className="text-[10px] text-muted-foreground">AI Thinking…</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatScrollRef} />
                    </div>
                  </ScrollArea>
                  <div className="px-3 pb-3 pt-2 border-t shrink-0 flex gap-1.5">
                    <Input placeholder="Share your thoughts" value={chatInput} onChange={e => setChatInput(e.target.value)} className="h-8 text-xs" />
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
              {dialogMetric?.name} — Detailed Analysis
            </DialogTitle>
            <DialogDescription>
              {dialogMetric?.status === "red" ? "❌ Red — Priority improvement needed" : dialogMetric?.status === "yellow" ? "⚠️ Yellow — Needs attention" : "✅ Green — Passed"}
              {dialogMetric && !dialogMetric.consensus ? "　Opinion Divergence" : "  Agent consensus"}
              {dialogMetric?.flag ? "  ⚡ Handoff suggested" : ""}
            </DialogDescription>
          </DialogHeader>
          {dialogMetric && (
            <div className="space-y-4">

              {/* Dual-Agent Preliminary Synthesis */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />Dual-Agent Preliminary Synthesis
                  <span className="text-[10px] text-muted-foreground font-normal ml-1"> (click an Agent card for instant chat feedback)</span>
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
                        : <p className="text-xs text-muted-foreground italic">— See Claude synthesis below —</p>
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
                    <span className="text-[10px] text-muted-foreground font-normal">OpenAI + Gemini → Claude-led Synthesis</span>
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 border-purple-400/50 text-purple-600 hover:bg-purple-500/10"
                    disabled={debateLoading || !dialogMetric.agentA.opinion}
                    onClick={() => runLiveDebate(dialogMetric)}>
                    {debateLoading
                      ? <><Loader2 className="w-3 h-3 animate-spin" />Debating…</>
                      : <><Zap className="w-3 h-3" />Trigger Three-Party Debate</>}
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
                          ? <><Loader2 className="w-4 h-4 animate-spin text-purple-500" /><p className="text-xs text-muted-foreground">OpenAI + Gemini debating, Claude synthesizing…</p></>
                          : <><Loader2 className="w-4 h-4 animate-spin text-purple-400" /><p className="text-xs text-muted-foreground">Background debate in progress, result auto-updates shortly…</p></>
                        }
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-2">
                      {d.conclusion && (
                        <div className="p-2.5 bg-teal-500/10 rounded-lg cursor-pointer hover:bg-teal-500/20 transition-colors border border-teal-500/20"
                          onClick={() => { setChatMessages(p => [...p, { role: "user", content: `[${dialogMetric.name} — Claude Synthesis]` }]); setDialogMetric(null); setLiveDebate(null); callAgent(`"${dialogMetric.name}" Claude Synthesis: ${d.conclusion}

Please provide 2–3 specific, actionable improvement steps.`) }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Bot className="w-3 h-3 text-teal-600" />
                            <p className="text-[10px] font-semibold text-teal-700">Claude Visual Analysis & Suggestions<span className="text-teal-500 font-normal ml-1"> (click to ask Agent for further explanation)</span></p>
                          </div>
                          <p className="text-xs text-teal-800 leading-relaxed whitespace-pre-wrap">{d.conclusion}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Escalate to Director — only shown for extreme divergence */}
              {dialogMetric.flag && (
                <div className="p-2.5 bg-orange-500/8 rounded-lg flex items-center gap-2 border border-orange-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <div>
                    <p className="text-[11px] font-medium text-orange-600">Recommend discussing with Director</p>
                    <p className="text-[10px] text-orange-500/80">This metric's divergence and deviation exceed thresholds. Confirm creative direction with the Director before revising.</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="bg-transparent" onClick={() => setDialogMetric(null)}>Close</Button>
                <Button onClick={() => handleAskAgentFromDialog(dialogMetric)}>
                  <Zap className="w-3.5 h-3.5 mr-1.5" />Ask Agent for Suggestions
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