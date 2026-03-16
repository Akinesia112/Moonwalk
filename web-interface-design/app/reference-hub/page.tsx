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
    content: "您好！我是 Reference 助手。\n\n上傳並 Submit 參考圖後，我會自動分析每張 ref 的用途、note 是否夠具體，並找出缺口。\n\n也可以點擊圖片直接問我這張要看什麼。",
  }])
  const [chatInput, setChatInput]   = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [clickedRef, setClickedRef] = useState<Reference | null>(null)
  const chatScrollRef  = useRef<HTMLDivElement>(null)
  const chatScrollBottom = useRef<HTMLDivElement>(null)

  // Restore sessionStorage + clear stale states on mount (client-only)
  const [hydrated, setHydrated] = useState(false)
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
          (r.file_url?.trim() || r.thumbnail_url?.trim())  // must have non-empty image src
        )
        const loaded = valid.map((r: any) => {
          const rawThumb = r.thumbnail_url || r.file_url || ""
          const thumb = rawThumb.startsWith("/") ? `${API}${rawThumb}` : rawThumb
          const isImg = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(rawThumb) || rawThumb.startsWith(API)
          return { ...r, localPreview: isImg ? thumb : undefined }
        })
        // Persist ref metadata + categories for upload-analyze
        try {
          sessionStorage.setItem("refhub_refs", JSON.stringify(
            loaded.map((r: any) => ({ id: r.id, title: r.title || r.id, category: r.category || "", note: r.note || "", is_pinned: !!r.is_pinned }))
          ))
        } catch {}
        setRefs(loaded)
      })
      .catch(() => setRefs([]))
      .finally(() => setLoading(false))
  }, [])

  // Persist chat to sessionStorage (only after hydrated)
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem("refhub_chat", JSON.stringify(chatMessages)) } catch {}
  }, [chatMessages, hydrated])

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
      try {
        const result = await apiUploadFile(file, PROJECT_ID, uploadCategory, uploadPriority, uploadNote)
        const newRef: Reference = {
          id: result.id,
          title: file.name.replace(/\.[^/.]+$/, ""),
          confidentiality: "internal",
          is_pinned: uploadPriority === "main",
          category: uploadCategory,
          note: uploadNote,
          thumbnail_url: result.thumbnail_url || "",
          file_url: result.file_url || "",
          priority: uploadPriority,
          localPreview,
        }
        setRefs(prev => [newRef, ...prev])
        setUploadNote("")
      } catch {
        const fallbackRef: Reference = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          confidentiality: "internal",
          is_pinned: uploadPriority === "main",
          category: uploadCategory,
          note: uploadNote,
          thumbnail_url: "",
          localPreview,
          priority: uploadPriority,
        }
        setRefs(prev => [fallbackRef, ...prev])
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
        body: JSON.stringify({ url, project_id: PROJECT_ID, category: uploadCategory, priority: uploadPriority, instruction: uploadNote }),
      })
      const newRef: Reference = {
        id: result.id || `url_${Date.now()}`,
        title: result.title || url.split("/").pop()?.split("?")[0]?.slice(0, 60) || "URL Import",
        confidentiality: "internal",
        is_pinned: uploadPriority === "main",
        category: uploadCategory,
        note: uploadNote,
        thumbnail_url: result.thumbnail_url || "",
        file_url: url,
        priority: uploadPriority,
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
          is_pinned: uploadPriority === "main",
          category: uploadCategory,
          note: uploadNote,
          thumbnail_url: "",
          file_url: url,
          priority: uploadPriority,
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
          message: "請仔細分析這個 reference set：\n1) 每張 ref 的 note 夠不夠具體？打光師/合成師看到後能直接執行嗎？\n2) category 設定合理嗎？\n3) Main Ref 的選擇有沒有問題？\n4) 整個 set 有沒有明顯的缺口？\n\n針對有問題的 ref 直接點名追問。",
          project_id: PROJECT_ID,
          clicked_ref_id: null,
          all_refs_context: refs.map(r => ({
            id: r.id, title: r.title, category: r.category,
            note: r.note, is_pinned: r.is_pinned, priority: r.priority || (r.is_pinned ? "main" : "secondary"),
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
        body: JSON.stringify({ references: refs.map(r => ({ id: r.id, priority: r.priority || (r.is_pinned ? "main" : "secondary"), category: r.category, note: r.note, confidentiality: r.confidentiality })) }),
      })
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
          })),
          history: newHistory.slice(-8).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        }),
      })
      setChatMessages(prev => [...prev, { role: "ai", content: res.reply }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "ai", content: `⚠️ 連線錯誤：${e}` }])
    } finally {
      setChatLoading(false)
      setClickedRef(null)
    }
  }

  const handleRefClick = (ref: Reference) => {
    setClickedRef(ref)
    setChatInput(`這張「${ref.title}」（${ref.category}）我想參考的是`)
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
              <p className="text-muted-foreground">上傳視覺參考、標注用途、儲存至專案</p>
            </div>

<div className="flex gap-4 flex-1 min-h-0">
              {/* ── Left: Upload + Grid ── */}
              <div className="flex-1 min-w-0 overflow-y-auto space-y-4 pr-1">

                {/* Upload Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">上傳參考圖</CardTitle>
                    <CardDescription>支援圖片檔案或貼上圖片 URL</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Settings row */}
                    <div className="flex gap-3 flex-wrap">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">分類</Label>
                        <Select value={uploadCategory} onValueChange={setUploadCategory}>
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{REF_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">重要性</Label>
                        <Select value={uploadPriority} onValueChange={setUploadPriority}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="main">⭐ Main Ref</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">備注（上傳前填寫）</Label>
                        <Input className="h-8 text-xs" placeholder="例：參考光影方向，主光從右側..." value={uploadNote} onChange={e => setUploadNote(e.target.value)} />
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
                          const localPreview = await (new Promise<string>(resolve => {
                            const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = () => resolve(""); r.readAsDataURL(file)
                          }))
                          try {
                            const result = await apiUploadFile(file, PROJECT_ID, uploadCategory, uploadPriority, uploadNote)
                            setRefs(prev => [{ id: result.id, title: file.name.replace(/\.[^/.]+$/,""), confidentiality:"internal", is_pinned: uploadPriority==="main", category: uploadCategory, note: uploadNote, thumbnail_url: result.thumbnail_url||"", file_url: result.file_url||"", priority: uploadPriority, localPreview }, ...prev])
                          } catch {
                            setRefs(prev => [{ id:`local_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, title: file.name.replace(/\.[^/.]+$/,""), confidentiality:"internal", is_pinned: false, category: uploadCategory, note: uploadNote, thumbnail_url:"", localPreview, priority: uploadPriority }, ...prev])
                          }
                        }
                        setUploading(false)
                      }}
                    >
                      {uploading
                        ? <><Loader2 className="w-8 h-8 text-teal-500 animate-spin" /><p className="text-sm text-muted-foreground">上傳中...</p></>
                        : <><ImageIcon className="w-8 h-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">點擊或拖曳上傳圖片</p><p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF</p></>
                      }
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />

                    {/* URL import */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="或貼上圖片 URL..."
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleImportUrl()}
                        className="text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={handleImportUrl} disabled={uploading || !urlInput.trim()}>
                        <LinkIcon className="w-4 h-4 mr-1" />匯入
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Reference Grid — only shown after refs are added */}
                {refs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-sm text-muted-foreground">
                      已加入的參考圖 ({refs.filter(ref => ref.localPreview || ref.file_url?.trim() || ref.thumbnail_url?.trim()).length})
                    </h2>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />載入中...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {refs.filter(ref => ref.localPreview || ref.file_url?.trim() || ref.thumbnail_url?.trim()).map(ref => {
                        const saveState = saveStates[ref.id] || "idle"
                        return (
                          <Card key={ref.id} className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all group">
                            {/* Thumbnail */}
                            <div
                              className="aspect-video bg-muted relative cursor-pointer"
                              onClick={() => handleRefClick(ref)}
                            >
                              {ref.localPreview ? (
                                <img
                                  src={ref.localPreview}
                                  alt={ref.title}
                                  className="w-full h-full object-cover"
                                  onError={() => removeRef(ref.id)}
                                />
                              ) : null}
                              {/* Overlay badges */}
                              {ref.is_pinned && (
                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-amber-500 text-white text-[10px] gap-1">
                                    <Star className="w-2.5 h-2.5" />Main Ref
                                  </Badge>
                                </div>
                              )}
                              {ref.confidentiality === "nda-strict" && (
                                <div className="absolute top-2 right-2">
                                  <Badge variant="destructive" className="text-[10px] gap-1">
                                    <Lock className="w-2.5 h-2.5" />NDA
                                  </Badge>
                                </div>
                              )}
                              {ref.category && (
                                <div className="absolute bottom-2 left-2">
                                  <Badge className={`text-[10px] ${CATEGORY_COLORS[ref.category] || "bg-muted"}`}>
                                    {ref.category}
                                  </Badge>
                                </div>
                              )}
                              {/* Remove button */}
                              <button
                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={e => { e.stopPropagation(); removeRef(ref.id) }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Controls */}
                            <div className="p-3 space-y-2">
                              <p className="font-medium text-sm truncate" title={ref.title}>{ref.title}</p>

                              <div className="flex gap-2">
                                {/* Category */}
                                <Select value={ref.category} onValueChange={v => { updateField(ref.id, "category", v); saveRef(ref.id, { category: v }) }}>
                                  <SelectTrigger className="flex-1 h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>{REF_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>

                                {/* Priority */}
                                <Select value={ref.is_pinned ? "main" : "secondary"} onValueChange={v => { const pinned = v === "main"; updateField(ref.id, "is_pinned", pinned); saveRef(ref.id, { is_pinned: pinned }) }}>
                                  <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="main">⭐ Main</SelectItem>
                                    <SelectItem value="secondary">Secondary</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Confidentiality */}
                              <Select value={ref.confidentiality} onValueChange={v => { updateField(ref.id, "confidentiality", v); saveRef(ref.id, { confidentiality: v }) }}>
                                <SelectTrigger className="w-full h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="internal">Internal</SelectItem>
                                  <SelectItem value="client-sensitive">Client-Sensitive</SelectItem>
                                  <SelectItem value="nda-strict">NDA-Strict</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Note */}
                              <div className="space-y-1">
                                <Textarea
                                  placeholder="這張 ref 要看什麼？例：主光從右側，硬光質感，陰影邊緣銳利..."
                                  value={ref.note}
                                  onChange={e => updateField(ref.id, "note", e.target.value)}
                                  className="text-xs resize-none"
                                  rows={2}
                                />
                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2"
                                    onClick={() => saveRef(ref.id, { note: ref.note, category: ref.category, is_pinned: ref.is_pinned, confidentiality: ref.confidentiality })}
                                    disabled={saveState === "saving"}
                                  >
                                    {saveState === "saving" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                    {saveState === "saved" && <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />}
                                    {saveState === "idle" && <Save className="w-3 h-3 mr-1" />}
                                    {saveState === "saved" ? "已儲存" : "儲存"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
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
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />分析中...</>
                      : <><Bot className="w-4 h-4 mr-2" />開始分析 Ref</>
                    }
                  </Button>
                  <Button
                    size="lg"
                    className={submitted ? "opacity-70" : ""}
                    onClick={handleSubmit}
                    disabled={submitting || refs.length === 0}
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />儲存中...</>
                      : submitted
                        ? <><CheckCircle2 className="w-4 h-4 mr-2" />已儲存</>
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
                              <CardTitle className="text-base">AI Reference 助手</CardTitle>
                              <CardDescription className="text-xs">點擊圖片可直接詢問</CardDescription>
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
                                  <span className="text-sm text-muted-foreground">AI 思考中...</span>
                                </div>
                              </div>
                            )}
                            <div ref={chatScrollBottom} />
                          </div>
                        </ScrollArea>

                        {/* Quick prompts */}
                        <div className="flex gap-2 flex-wrap mb-2 shrink-0">
                          {[
                            ["分析目前 ref set", "分析目前我加入的所有參考圖，是否涵蓋了 brief 的主要需求？有什麼缺口？"],
                            ["幫我分類", "幫我建議每張圖應該歸在哪個 category"],
                            ["Main Ref 選哪些", "根據這些 ref 的 note，哪幾張最適合設為 Main Ref？"],
                          ].map(([label, msg]) => (
                            <Button key={label} variant="outline" size="sm" className="text-xs bg-transparent h-7"
                              onClick={() => handleChatSend(msg)}>
                              {label}
                            </Button>
                          ))}
                        </div>

                        {clickedRef && (
                          <div className="mb-2 px-2 py-1 bg-teal-500/10 rounded text-xs text-teal-700 flex items-center gap-2 shrink-0">
                            <span>詢問：{clickedRef.title}</span>
                            <button onClick={() => { setClickedRef(null); setChatInput("") }} className="ml-auto"><X className="w-3 h-3" /></button>
                          </div>
                        )}

                        <div className="flex gap-2 shrink-0">
                          <Input
                            placeholder="輸入問題或點擊圖片..."
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