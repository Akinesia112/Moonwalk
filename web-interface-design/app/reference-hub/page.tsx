"use client"

import { Suspense, useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Upload, Star, Lock, ChevronRight, Bot, Send,
  ChevronDown, ChevronUp, Plus, Loader2, CheckCircle2,
  X, ImageIcon, Link as LinkIcon, Save,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { RefCard } from "@/components/ref-card"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
const PROJECT_ID = "proj_001"

// ── Types ──────────────────────────────────────────────────────
interface Reference {
  id: string
  title: string
  confidentiality: string
  is_pinned: boolean
  category: string
  note: string
  thumbnail_url?: string
  file_url?: string
  priority?: string
  // local-only: object URL for newly uploaded files
  localPreview?: string
}

interface ChatMessage { role: "user" | "ai"; content: string }

const REF_CATEGORIES = ["Lighting", "Color", "Composition", "Style", "Texture", "Motion", "Mood", "VFX"]
const CONFIDENTIALITY_OPTIONS = ["public", "internal", "client-sensitive", "nda-strict"]

const CATEGORY_COLORS: Record<string, string> = {
  Lighting:    "bg-amber-500/20 text-amber-700 border-amber-500/30",
  Color:       "bg-pink-500/20 text-pink-700 border-pink-500/30",
  Composition: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  Style:       "bg-purple-500/20 text-purple-700 border-purple-500/30",
  Texture:     "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  Motion:      "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
  Mood:        "bg-indigo-500/20 text-indigo-700 border-indigo-500/30",
  VFX:         "bg-red-500/20 text-red-700 border-red-500/30",
}

// ── API helpers ────────────────────────────────────────────────
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

async function apiUploadFile(file: File, projectId: string, category: string, priority: string, note: string) {
  const form = new FormData()
  form.append("image", file)
  form.append("type", "reference")
  form.append("project_id", projectId)
  form.append("category", category)
  form.append("priority", priority)
  form.append("instruction", note)
  const res = await fetch(`${API}/search/upload`, { method: "POST", body: form })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

// ── Main Component ─────────────────────────────────────────────
function ReferenceHubContent() {
  const [refs, setRefs]             = useState<Reference[]>([])
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveStates, setSaveStates] = useState<Record<string, "idle"|"saving"|"saved">>({})

  // Upload area state
  const [uploadCategory, setUploadCategory] = useState("Lighting")
  const [uploadPriority, setUploadPriority] = useState("secondary")
  const [uploadNote, setUploadNote]         = useState("")
  const [urlInput, setUrlInput]             = useState("")
  const [uploading, setUploading]           = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [panelW, setPanelW] = useState(700)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizeDir = useRef<string>("")
  const resizeStart = useRef({ x: 0, w: 400 })

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    resizeStart.current = { x: e.clientX, w: panelW }
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - resizeStart.current.x
      setPanelW(Math.max(280, Math.min(700, resizeStart.current.w - dx)))
    }
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  // Chat
  const [chatOpen, setChatOpen]         = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    role: "ai" as const,
    content: "Hello! I'm the Reference Assistant.\n\nAfter uploading and submitting your references, I'll automatically analyze each ref's purpose, whether the notes are specific enough, and identify any gaps.\n\nYou can also click an image to ask me what to look for.",
  }])
  const [chatInput, setChatInput]   = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [clickedRef, setClickedRef] = useState<Reference | null>(null)
  const chatScrollRef  = useRef<HTMLDivElement>(null)
  const chatScrollBottom = useRef<HTMLDivElement>(null)

  // Restore sessionStorage + clear stale states on mount (client-only)
  const [hydrated, setHydrated] = useState(false)
  const skipPersistRef = useRef(true)  // prevent writing [] on initial mount before API loads
  useEffect(() => {
    try {
      const savedChat = sessionStorage.getItem("refhub_chat")
      if (savedChat) setChatMessages(JSON.parse(savedChat))
    } catch {}
    setSaveStates({})
    setSubmitted(false)
    setHydrated(true)
    return () => {
      if (submitTimer.current) clearTimeout(submitTimer.current)
    }
  }, [])

  // ── Load refs from API (persisted) ───────────────────────
  useEffect(() => {
    apiFetch(`/search/references?project_id=${PROJECT_ID}`)
      .then(data => {
        const MOCK_IDS = ["ref_001", "ref_002", "ref_003"]
        const valid = data.filter((r: any) =>
          !MOCK_IDS.includes(r.id) &&
          (r.file_url?.trim() || r.thumbnail_url?.trim())
        )
        const loaded = valid.map((r: any) => {
          const rawThumb = r.thumbnail_url || r.file_url || ""
          const thumb = rawThumb.startsWith("/") ? `${API}${rawThumb}` : rawThumb
          const isImg = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(rawThumb) || rawThumb.startsWith(API)
          return { ...r, localPreview: isImg ? thumb : undefined }
        })
        // Deduplicate by title — keep only the most recent (last uploaded) per title
        const seenTitles = new Set<string>()
        const deduped = loaded.filter((r: any) => {
          const key = (r.title || r.id || "").toLowerCase().replace(/\.[^.]+$/, "")
          if (seenTitles.has(key)) return false
          seenTitles.add(key)
          return true
        })
        // Merge sessionStorage edits back, and respect deletions:
        // If refhub_refs exists and is non-empty, only show refs that are still in it.
        // If refhub_refs is empty array [], it means user deleted everything — show nothing.
        let merged = deduped
        try {
          const raw = sessionStorage.getItem("refhub_refs")
          if (raw !== null) {
            const cached: any[] = JSON.parse(raw)
            // Build a set of IDs the user still has
            const cacheMap: Record<string, any> = {}
            cached.forEach((c: any) => { cacheMap[c.id] = c })
            const userHasCache = cached.length > 0

            if (userHasCache) {
              // Only keep API refs that user hasn't deleted, merge their metadata
              const deletedIds = new Set(JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]"))
              merged = deduped
                .filter((r: any) => !deletedIds.has(r.id))  // remove explicitly deleted
                .map((r: any) => {
                  const c = cacheMap[r.id]
                  return {
                    ...r,
                    note: c.note || r.note || "",
                    category: c.category || r.category || "",
                    is_pinned: c.is_pinned ?? r.is_pinned,
                    importance: c.importance || r.importance || "",
                    priority: c.priority || r.priority || "secondary",
                    artworkId: c.artworkId || "",
                    localPreview: c.preview || r.localPreview,
                  }
                })
              // Also add local-only refs (uploaded after page load, not in API yet)
              const apiIds = new Set(deduped.map((r: any) => r.id))
              const localOnly = cached.filter((c: any) => !apiIds.has(c.id) && c.preview)
                .map((c: any) => ({
                  id: c.id, title: c.title || c.id, confidentiality: "internal",
                  is_pinned: !!c.is_pinned, category: c.category || "",
                  note: c.note || "", priority: c.priority || "secondary",
                  importance: c.importance || "",
                  artworkId: c.artworkId || "",
                  localPreview: c.preview,
                }))
              merged = [...merged, ...localOnly]
            } else {
              // User deleted everything — show nothing
              merged = []
            }
          }
        } catch {}
        setRefs(merged)
        skipPersistRef.current = false  // API loaded — safe to persist now
      })
      .catch(() => { setRefs([]); skipPersistRef.current = false })
      .finally(() => setLoading(false))
  }, [])

  // Persist chat to sessionStorage (only after hydrated)
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem("refhub_chat", JSON.stringify(chatMessages)) } catch {}
  }, [chatMessages, hydrated])

  // Auto-persist refs on every change — including deletions (write empty array too)
  useEffect(() => {
    if (!hydrated || skipPersistRef.current) return
    try {
      sessionStorage.setItem("refhub_refs", JSON.stringify(
        refs.map(r => ({
          id: r.id,
          title: r.title || r.id,
          category: r.category || "",
          note: r.note || "",
          is_pinned: !!r.is_pinned,
          importance: r.importance || (r.is_pinned || r.priority === "Main" || r.priority === "main" ? "Main" : "Secondary"),
          priority: r.priority || (r.is_pinned ? "Main" : "Secondary"),
          // Prefer base64 preview; fall back to server URLs so other pages always get an image
          preview: r.localPreview || r.thumbnail_url || r.file_url || "",
          file_url: r.file_url || "",
          thumbnail_url: r.thumbnail_url || "",
          artworkId: r.artworkId || "",
        }))
      ))
    } catch {}
  }, [refs, hydrated])

  // Auto-scroll chat
  useEffect(() => {
    chatScrollBottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, chatLoading])

  // ── Upload file ────────────────────────────────────────────
  // Convert file to base64 for persistent preview
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise(resolve => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => resolve(URL.createObjectURL(file))
      r.readAsDataURL(file)
    })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    for (const file of files) {
      const localPreview = await fileToBase64(file)
      const newTitle = file.name.replace(/\.[^/.]+$/, "")
      // Delete existing refs with same title — mark old IDs as deleted so other pages update
      setRefs(prev => {
        const dupes = prev.filter(r => (r.title || "").toLowerCase() === newTitle.toLowerCase())
        if (dupes.length > 0) {
          // Add old IDs to deleted_ref_ids so upload-analyze/compare/qa can evict stale refs
          try {
            const existing = new Set<string>(JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]"))
            dupes.forEach(d => { existing.add(d.id); apiFetch(`/Modification/reference/${d.id}`, { method: "DELETE" }).catch(() => {}) })
            sessionStorage.setItem("deleted_ref_ids", JSON.stringify([...existing]))
          } catch {}
        }
        return prev.filter(r => (r.title || "").toLowerCase() !== newTitle.toLowerCase())
      })
      try {
        const result = await apiUploadFile(file, PROJECT_ID, uploadCategory, uploadPriority, uploadNote)
        const newRef: Reference = {
          id: result.id,
          title: file.name.replace(/\.[^/.]+$/, ""),
          confidentiality: "internal",
          is_pinned: uploadPriority === "Main",
          category: uploadCategory,
          note: uploadNote,
          thumbnail_url: result.thumbnail_url || "",
          file_url: result.file_url || "",
          priority: uploadPriority, importance: uploadPriority,
          localPreview,
        }
        // Replace existing ref with same title (dedup by filename)
        setRefs(prev => { const without = prev.filter(r => r.title !== newRef.title); return [newRef, ...without] })
        setUploadNote("")
      } catch {
        const fallbackRef: Reference = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          confidentiality: "internal",
          is_pinned: uploadPriority === "Main",
          category: uploadCategory,
          note: uploadNote,
          thumbnail_url: "",
          localPreview,
          priority: uploadPriority, importance: uploadPriority,
        }
        setRefs(prev => { const without = prev.filter(r => r.title !== fallbackRef.title); return [fallbackRef, ...without] })
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
    // single-file path ends here — finally block below handles setUploading
    if (files.length > 0) {
      setUploading(false)
    }
  }

  // ── Import URL ─────────────────────────────────────────────
  const handleImportUrl = async () => {
    if (!urlInput.trim()) return
    setUploading(true)
    const url = urlInput.trim()
    const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url)
    try {
      const result = await apiFetch("/search/url", {
        method: "POST",
        body: JSON.stringify({ url, project_id: PROJECT_ID, category: uploadCategory, priority: uploadPriority, importance: uploadPriority, instruction: uploadNote }),
      })
      const newRef: Reference = {
        id: result.id || `url_${Date.now()}`,
        title: result.title || url.split("/").pop()?.split("?")[0]?.slice(0, 60) || "URL Import",
        confidentiality: "internal",
        is_pinned: uploadPriority === "Main",
        category: uploadCategory,
        note: uploadNote,
        thumbnail_url: result.thumbnail_url || "",
        file_url: url,
        priority: uploadPriority, importance: uploadPriority,
        localPreview: isImageUrl ? url : undefined,
      }
      setRefs(prev => [newRef, ...prev])
      setUrlInput("")
      setUploadNote("")
    } catch {
      if (isImageUrl) {
        setRefs(prev => [{
          id: `url_${Date.now()}`,
          title: url.split("/").pop()?.split("?")[0]?.slice(0, 60) || "URL Import",
          confidentiality: "internal",
          is_pinned: uploadPriority === "Main",
          category: uploadCategory,
          note: uploadNote,
          thumbnail_url: "",
          file_url: url,
          priority: uploadPriority, importance: uploadPriority,
          localPreview: url,
        }, ...prev])
        setUrlInput("")
      }
    }
    setUploading(false)
  }

  // ── Update ref field with debounced save ───────────────────
  const updateField = useCallback((id: string, field: keyof Reference, value: string | boolean) => {
    setRefs(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }, [])

  const saveRef = useCallback(async (id: string, updates: Partial<Reference>) => {
    setSaveStates(prev => ({ ...prev, [id]: "saving" }))
    try {
      await apiFetch(`/Modification/reference/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      })
      setSaveStates(prev => ({ ...prev, [id]: "saved" }))
      setTimeout(() => setSaveStates(prev => ({ ...prev, [id]: "idle" })), 1500)
    } catch {
      setSaveStates(prev => ({ ...prev, [id]: "idle" }))
    }
  }, [])

  // ── Remove ref ─────────────────────────────────────────────
  const removeRef = async (id: string) => {
    setRefs(prev => prev.filter(r => r.id !== id))
    // Track deletion explicitly so other pages can filter correctly
    try {
      const existing = new Set(JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]"))
      existing.add(id)
      sessionStorage.setItem("deleted_ref_ids", JSON.stringify([...existing]))
    } catch {}
    try { await apiFetch(`/Modification/reference/${id}`, { method: "DELETE" }) } catch {}
  }

  // ── Analyze refs (agent only, no save) ────────────────────
  const handleAnalyzeRefs = async () => {
    if (refs.length === 0 || chatLoading) return
    setChatLoading(true)
    try {
      const res = await apiFetch("/suggestion/chat/reference", {
        method: "POST",
        body: JSON.stringify({
          message: "Please carefully analyze this reference set:\n1) Are the notes for each ref specific enough for a lighting artist/compositor to act on immediately?\n2) Are the categories set correctly?\n3) Is the Main Ref selection appropriate?\n4) Are there any obvious gaps in the overall set?\n\nDirectly call out any problematic refs.",
          project_id: PROJECT_ID,
          clicked_ref_id: null,
          all_refs_context: refs.map(r => ({
            id: r.id, title: r.title, category: r.category,
            note: r.note, is_pinned: r.is_pinned, priority: r.priority || (r.is_pinned ? "Main" : "Secondary"),
            preview: r.localPreview || r.thumbnail_url || "",
          })),
          history: chatMessages.slice(-4).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        }),
      })
      setChatMessages(prev => [...prev, { role: "ai", content: res.reply }])
    } catch {}
    finally { setChatLoading(false) }
  }

  // ── Submit & Save (no agent call) ─────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await apiFetch("/Modification/references/batch", {
        method: "PUT",
        body: JSON.stringify({ references: refs.map(r => ({ id: r.id, priority: r.priority || (r.is_pinned ? "Main" : "Secondary"), category: r.category, note: r.note, confidentiality: r.confidentiality })) }),
      })
      // Save full ref data including previews for upload-analyze
      try {
        const refData = refs.map(r => ({
          id: r.id, title: r.title || r.id, category: r.category || "",
          note: r.note || "", is_pinned: !!r.is_pinned,
          importance: r.is_pinned ? "Main" : (r.priority === "Main" || priority === "main" ? "Main" : "Secondary"),
          priority: r.priority || (r.is_pinned ? "Main" : "Secondary"),
          preview: r.localPreview || "",
        }))
        sessionStorage.setItem("refhub_refs", JSON.stringify(refData))
      } catch {}
      setSubmitted(true)
      if (submitTimer.current) clearTimeout(submitTimer.current)
      submitTimer.current = setTimeout(() => setSubmitted(false), 2000)
    } catch {}
    setSubmitting(false)
  }

  // ── Chat ───────────────────────────────────────────────────
  const handleChatSend = async (overrideMsg?: string) => {
    const msg = overrideMsg ?? chatInput.trim()
    if (!msg || chatLoading) return
    const newHistory: ChatMessage[] = [...chatMessages, { role: "user", content: msg }]
    setChatMessages(newHistory)
    setChatInput("")
    setChatLoading(true)
    try {
      const res = await apiFetch("/suggestion/chat/reference", {
        method: "POST",
        body: JSON.stringify({
          message: msg,
          project_id: PROJECT_ID,
          clicked_ref_id: clickedRef?.id ?? null,
          all_refs_context: refs.map(r => ({
            id: r.id, title: r.title, category: r.category,
            note: r.note, is_pinned: r.is_pinned, priority: r.priority,
            preview: r.localPreview || r.thumbnail_url || "",
          })),
          history: newHistory.slice(-8).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        }),
      })
      setChatMessages(prev => [...prev, { role: "ai", content: res.reply }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "ai", content: `⚠️ Connection error: ${e}` }])
    } finally {
      setChatLoading(false)
      setClickedRef(null)
    }
  }

  const handleRefClick = (ref: Reference) => {
    setClickedRef(ref)
    setChatInput(`For this ref "${ref.title}" (${ref.category}), what I want to reference is`)
  }

  // ── Markdown renderer ──────────────────────────────────────
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n")
    return lines.map((line, i) => {
      // Parse inline: **bold**, *italic*, `code`
      const parseInline = (s: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = []
        const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
        let last = 0, m: RegExpExecArray | null
        while ((m = re.exec(s)) !== null) {
          if (m.index > last) parts.push(s.slice(last, m.index))
          if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>)
          else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>)
          else if (m[4]) parts.push(<code key={m.index} className="bg-muted px-1 rounded text-xs">{m[4]}</code>)
          last = m.index + m[0].length
        }
        if (last < s.length) parts.push(s.slice(last))
        return parts
      }

      if (line.startsWith("### ")) return <p key={i} className="font-bold text-sm mt-2">{parseInline(line.slice(4))}</p>
      if (line.startsWith("## "))  return <p key={i} className="font-bold text-sm mt-2">{parseInline(line.slice(3))}</p>
      if (line.startsWith("# "))   return <p key={i} className="font-bold text-sm mt-2">{parseInline(line.slice(2))}</p>
      if (line.startsWith("- "))   return <p key={i} className="text-sm pl-3 before:content-['•'] before:mr-2 before:text-teal-500">{parseInline(line.slice(2))}</p>
      if (line.trim() === "---")   return <hr key={i} className="border-border my-2" />
      if (line.trim() === "")      return <div key={i} className="h-2" />
      return <p key={i} className="text-sm">{parseInline(line)}</p>
    })
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <PipelineSidebar />
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="px-4 py-3 flex flex-col flex-1 min-h-0">

            {/* Header */}
            <div className="mb-3">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30">C02</Badge>
                <h1 className="text-xl font-bold">Reference Hub</h1>
              </div>
              <p className="text-muted-foreground">Upload visual references, annotate usage, and save to project</p>
            </div>

<div className="flex gap-4 flex-1 min-h-0">
              {/* ── Left: Upload + Grid ── */}
              <div className="flex-1 min-w-0 overflow-y-auto space-y-4 pr-1">

                {/* Upload Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Upload References</CardTitle>
                    <CardDescription>Supports image files or paste an image URL</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Settings row */}
                    <div className="flex gap-3 flex-wrap">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <Select value={uploadCategory} onValueChange={setUploadCategory}>
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{REF_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Priority</Label>
                        <Select value={uploadPriority} onValueChange={setUploadPriority}>
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Main">⭐ Main</SelectItem>
                            <SelectItem value="Secondary">Secondary</SelectItem>
                            <SelectItem value="Style">Style</SelectItem>
                            <SelectItem value="Composition">Composition</SelectItem>
                            <SelectItem value="Color">Color</SelectItem>
                            <SelectItem value="Lighting">Lighting</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">Notes (fill in before uploading)</Label>
                        <Input className="h-8 text-xs" placeholder="e.g. Reference for lighting direction, key light from the right..." value={uploadNote} onChange={e => setUploadNote(e.target.value)} />
                      </div>
                    </div>

                    {/* Drop zone */}
                    <div
                      className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors py-8 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5") }}
                      onDragLeave={e => { e.currentTarget.classList.remove("border-primary", "bg-primary/5") }}
                      onDrop={async e => {
                        e.preventDefault()
                        e.currentTarget.classList.remove("border-primary", "bg-primary/5")
                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
                        if (files.length === 0) return
                        setUploading(true)
                        for (const file of files) {
                          const newTitle = file.name.replace(/\.[^/.]+$/, "")
                          const localPreview = await (new Promise<string>(resolve => {
                            const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = () => resolve(""); r.readAsDataURL(file)
                          }))
                          // Mark old same-title refs as deleted before replacing
                          setRefs(prev => {
                            const dupes = prev.filter(r => (r.title || "").toLowerCase() === newTitle.toLowerCase())
                            if (dupes.length > 0) {
                              try {
                                const ex = new Set<string>(JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]"))
                                dupes.forEach(d => { ex.add(d.id); apiFetch(`/Modification/reference/${d.id}`, { method: "DELETE" }).catch(() => {}) })
                                sessionStorage.setItem("deleted_ref_ids", JSON.stringify([...ex]))
                              } catch {}
                            }
                            return prev.filter(r => (r.title || "").toLowerCase() !== newTitle.toLowerCase())
                          })
                          try {
                            const result = await apiUploadFile(file, PROJECT_ID, uploadCategory, uploadPriority, uploadNote)
                            setRefs(prev => { const r = { id: result.id, title: newTitle, confidentiality:"internal", is_pinned: uploadPriority==="main", category: uploadCategory, note: uploadNote, thumbnail_url: result.thumbnail_url||"", file_url: result.file_url||"", priority: uploadPriority, importance: uploadPriority, localPreview }; return [r, ...prev.filter(x => x.title !== r.title)] })
                          } catch {
                            setRefs(prev => { const r = { id:`local_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, title: newTitle, confidentiality:"internal", is_pinned: false, category: uploadCategory, note: uploadNote, thumbnail_url:"", localPreview, priority: uploadPriority, importance: uploadPriority }; return [r, ...prev.filter(x => x.title !== r.title)] })
                          }
                        }
                        setUploading(false)
                      }}
                    >
                      {uploading
                        ? <><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /><p className="text-sm text-muted-foreground">Uploading...</p></>
                        : <><ImageIcon className="w-8 h-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Click or drag to upload image</p><p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF</p></>
                      }
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />

                    {/* URL import */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Or paste an image URL..."
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleImportUrl()}
                        className="text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={handleImportUrl} disabled={uploading || !urlInput.trim()}>
                        <LinkIcon className="w-4 h-4 mr-1" />Import
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Reference Grid — only shown after refs are added */}
                {refs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-sm text-muted-foreground">
                      Added References ({refs.filter(ref => ref.localPreview || ref.file_url?.trim() || ref.thumbnail_url?.trim()).length})
                    </h2>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />Loading...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {refs.filter(ref => ref.localPreview || ref.file_url?.trim() || ref.thumbnail_url?.trim()).map(ref => {
                        const saveState = saveStates[ref.id] || "idle"
                        return (
                          <RefCard
                            key={ref.id}
                            data={{
                              id: ref.id,
                              title: ref.title,
                              preview: ref.localPreview,
                              category: ref.category,
                              importance: ref.is_pinned ? "Main" : (ref.priority === "Main" || ref.priority === "main" ? "Main" : (ref.importance || "Secondary")),
                              usage: ref.confidentiality,
                              note: ref.note,
                            }}
                            onChange={updated => {
                              const pinned = updated.importance === "Main"
                              updateField(ref.id, "category", updated.category ?? ref.category)
                              updateField(ref.id, "is_pinned", pinned)
                              updateField(ref.id, "note", updated.note ?? ref.note)
                              updateField(ref.id, "confidentiality", updated.usage ?? ref.confidentiality)
                            }}
                            onDelete={() => removeRef(ref.id)}
                            onDiscuss={d => {
                              setClickedRef(ref)
                              setChatInput(`For this ref "${d.title}" (${d.category || "Uncategorized"}), what I want to reference is`)
                              setChatMessages(prev => [...prev, { role: "user", content: `[Discuss] ${d.title}${d.note ? `\nNotes: ${d.note}` : ""}` }])
                              handleChatSend(`Please analyze the visual characteristics of "${d.title}"${d.category ? ` (${d.category})` : ""} and its role in this reference set.${d.note ? ` Artist Notes: ${d.note}` : ""}`)
                            }}
                            onSave={updated => {
                              const pinned = updated.importance === "Main"
                              saveRef(ref.id, {
                                note: updated.note ?? ref.note,
                                category: updated.category ?? ref.category,
                                is_pinned: pinned,
                                confidentiality: updated.usage ?? ref.confidentiality,
                              })
                            }}
                            showSave={true}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
                )} {/* end refs.length > 0 */}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleAnalyzeRefs}
                    disabled={chatLoading || refs.length === 0}
                    className="border-teal-500/50 text-teal-700 hover:bg-teal-500/10"
                  >
                    {chatLoading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                      : <><Bot className="w-4 h-4 mr-2" />Analyze Refs</>
                    }
                  </Button>
                  <Button
                    size="lg"
                    className={submitted ? "opacity-70" : ""}
                    onClick={handleSubmit}
                    disabled={submitting || refs.length === 0}
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                      : submitted
                        ? <><CheckCircle2 className="w-4 h-4 mr-2" />Saved</>
                        : <><Upload className="w-4 h-4 mr-2" />Submit & Save</>
                    }
                  </Button>
                  <Button size="lg" variant="outline" className="bg-transparent" asChild>
                    <a href="/artist-reflection">Jump to C03 Reflection <ChevronRight className="w-4 h-4 ml-2" /></a>
                  </Button>
                </div>
              </div>

              {/* ── Right: AI Chat (resizable width) ── */}
              <div ref={panelRef} className="shrink-0 relative self-stretch" style={{ width: panelW }}>
                {/* Resize handle — left edge only */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-teal-500/40 rounded transition-colors z-20" onMouseDown={startResize} />
                <Card className="border-teal-500/30 flex flex-col w-full h-full overflow-hidden absolute inset-0">
                  <Collapsible open={chatOpen} onOpenChange={setChatOpen} className="flex flex-col flex-1 min-h-0">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-teal-600" />
                            <div>
                              <CardTitle className="text-base">AI Reference Assistant</CardTitle>
                              <CardDescription className="text-xs">Click an image to ask directly</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {chatLoading && <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />}
                            {chatOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="flex-1 min-h-0 flex flex-col">
                      <CardContent className="pt-0 flex-1 min-h-0 flex flex-col">
                        <ScrollArea className="flex-1 min-h-0 mb-3">
                          <div className="space-y-4 pr-2">
                            {chatMessages.map((msg, idx) => (
                              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className={msg.role === "ai" ? "bg-teal-500/10 text-teal-600" : "bg-primary/10"}>
                                    {msg.role === "ai" ? <Bot className="w-4 h-4" /> : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                                  {msg.role === "ai"
                                    ? <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                                    : <p className="text-sm whitespace-pre-line">{msg.content}</p>
                                  }
                                </div>
                              </div>
                            ))}
                            {chatLoading && (
                              <div className="flex gap-3">
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className="bg-teal-500/10 text-teal-600"><Bot className="w-4 h-4" /></AvatarFallback>
                                </Avatar>
                                <div className="rounded-lg p-3 bg-muted flex items-center gap-2">
                                  <Loader2 className="w-3 h-3 animate-spin text-teal-500" />
                                  <span className="text-sm text-muted-foreground">AI thinking...</span>
                                </div>
                              </div>
                            )}
                            <div ref={chatScrollBottom} />
                          </div>
                        </ScrollArea>

                        {/* Quick prompts */}
                        <div className="flex gap-2 flex-wrap mb-2 shrink-0">
                          {[
                            ["Analyze current ref set", "Analyze all the references I've added. Do they cover the main requirements of the brief? What gaps exist?"],
                            ["Suggest categories", "Suggest which category each image should belong to"],
                            ["Which refs should be Main?", "Based on the notes for these refs, which ones are most suitable as Main Refs?"],
                          ].map(([label, msg]) => (
                            <Button key={label} variant="outline" size="sm" className="text-xs bg-transparent h-7"
                              onClick={() => handleChatSend(msg)}>
                              {label}
                            </Button>
                          ))}
                        </div>

                        {clickedRef && (
                          <div className="mb-2 px-2 py-1 bg-teal-500/10 rounded text-xs text-teal-700 flex items-center gap-2 shrink-0">
                            <span>Asking about: {clickedRef.title}</span>
                            <button onClick={() => { setClickedRef(null); setChatInput("") }} className="ml-auto"><X className="w-3 h-3" /></button>
                          </div>
                        )}

                        <div className="flex gap-2 shrink-0">
                          <Input
                            placeholder="Type a question or click an image..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            disabled={chatLoading}
                          />
                          <Button size="icon" onClick={() => handleChatSend()} disabled={chatLoading || !chatInput.trim()}>
                            {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
    </div>
  )
}

export default function ReferenceHubPage() {
  return (
    <Suspense fallback={null}>
      <ReferenceHubContent />
    </Suspense>
  )
}