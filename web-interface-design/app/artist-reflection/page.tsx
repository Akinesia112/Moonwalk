"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, FileText, ImageIcon, Bot, Send, ChevronRight, ChevronDown, ChevronUp,
  HelpCircle, MessageSquare, Sparkles, BookOpen, GripVertical, ArrowDown, ArrowUp,
  RefreshCw, Beaker, Lightbulb, Trash2 } from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { RefCard, type RefCardData, CATEGORY_COLOR, IMPORTANCE_COLOR } from "@/components/ref-card"

// Strip markdown from AI responses
function stripBold(text: string): string {
  return text
    .replace(/[*][*](.+?)[*][*]/g, "$1")
    .replace(/[*](.+?)[*]/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/^[#]{1,6} /gm, "")
    .trim()
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
const PROJECT_ID = "proj_001"

type ChatMsg = { role: "ai" | "user"; content: string; image?: string }
type Ref = { id: string; title: string; note: string; is_pinned: boolean; localPreview?: string; file_url?: string; thumbnail_url?: string; category?: string; importance?: string; usage?: string }
type MindNode = { id: string; text: string; priority: number; done: boolean }

// ── renderMarkdown (strip ** and --- to readable text) ──────────
function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const parseInline = (s: string) => {
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
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# "))
      return <p key={i} className="font-semibold text-sm mt-2">{parseInline(line.replace(/^#+\s/, ""))}</p>
    if (line.startsWith("- "))
      return <p key={i} className="text-sm pl-3 before:content-['•'] before:mr-2 before:text-indigo-500">{parseInline(line.slice(2))}</p>
    if (line.trim() === "---") return <div key={i} className="border-t border-border my-2" />
    if (line.trim() === "")   return <div key={i} className="h-1.5" />
    return <p key={i} className="text-sm">{parseInline(line)}</p>
  })
}

// ── Brief fields readable label map ────────────────────────────
const BRIEF_LABELS: Record<string, string> = {
  project_name: "Project Name", client: "Client", deliverable_type: "Deliverable Type",
  selling_point: "Selling Points", keywords: "Keywords", style_direction: "Style",
  mood_atmosphere: "Atmosphere", world_view: "World Concept", taboos: "Restrictions / Taboos",
  director_notes: "Supervisor Additional Notes",
}

function ArtistReflectionContent() {
  // ── State ────────────────────────────────────────────────────
  const [hydrated, setHydrated]         = useState(false)
  const [specsOpen, setSpecsOpen]       = useState(true)
  const [refsOpen, setRefsOpen]         = useState(true)
  const [reflectionNotes, setReflectionNotes] = useState("")
  const [agentInput, setAgentInput]     = useState("")
  const [responseMode, setResponseMode] = useState<string | null>(null)
  const [pageSubmitted, setPageSubmitted] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [agentLoading, setAgentLoading] = useState(false)

  // Brief from kickoff sessionStorage
  const [brief, setBrief] = useState<Record<string, string>>({})

  // Refs from backend
  const [refs, setRefs]     = useState<Ref[]>([])
  const [refsLoading, setRefsLoading] = useState(false)

  // Project questions from AutoGen
  const [projectQuestions, setProjectQuestions] = useState<{id:string; text:string}[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [checkedQuestions, setCheckedQuestions] = useState<string[]>([])

  // Mind map nodes
  const [mindMapNodes, setMindMapNodes] = useState<MindNode[]>([
    { id: "n1", text: "Lighting Direction Confirmation", priority: 1, done: false },
    { id: "n2", text: "Color Temperature Range Definition", priority: 2, done: false },
    { id: "n3", text: "Material Aging Treatment", priority: 3, done: false },
    { id: "n4", text: "Composition Method Selection", priority: 4, done: false },
  ])

  const [agentMessages, setAgentMessages] = useState<ChatMsg[]>([{
    role: "ai",
    content: "I'm the Creative Exploration Agent. After reading the Spec and References, I'll prepare project-based questions to find potential tensions and areas that need clarification.\n\nYou can also type your thoughts directly, or click the left panel Spec / Ref items for me to follow up on.",
  }])

  const scrollBottom = useRef<HTMLDivElement>(null)

  // ── Hydrate from sessionStorage on mount ─────────────────────
  useEffect(() => {
    // Load brief from kickoff
    try {
      const saved = sessionStorage.getItem("kickoff_brief")
      if (saved) setBrief(JSON.parse(saved))
    } catch {}

    // Load chat
    try {
      const saved = sessionStorage.getItem("reflection_chat")
      if (saved) setAgentMessages(JSON.parse(saved))
    } catch {}

    // Load understanding notes (persisted for QA page to read)
    try {
      const saved = sessionStorage.getItem("reflection_notes")
      if (saved) setReflectionNotes(saved)
    } catch {}

    setHydrated(true)
  }, [])

  // Persist chat
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem("reflection_chat", JSON.stringify(agentMessages)) } catch {}
  }, [agentMessages, hydrated])

  // Persist understanding notes — QA page reads "reflection_notes"
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem("reflection_notes", reflectionNotes) } catch {}
  }, [reflectionNotes, hydrated])

  // Auto-scroll
  useEffect(() => {
    scrollBottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [agentMessages, agentLoading])

  // ── Load refs: directly from refhub_refs sessionStorage ──
  // reference-hub is the single source of truth — no API needed
  const loadRefs = () => {
    setRefsLoading(true)
    try {
      const deletedIds = new Set<string>()
      try { JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]").forEach((id: string) => deletedIds.add(id)) } catch {}

      const raw = sessionStorage.getItem("refhub_refs")
      if (raw) {
        const cached: any[] = JSON.parse(raw)
        const filtered = cached
          .filter(c => c.preview && !deletedIds.has(c.id))
          .map(c => ({
            id: c.id,
            title: c.title || c.id,
            note: c.note || "",
            is_pinned: !!c.is_pinned,
            category: c.category || "",
            importance: c.importance || (c.is_pinned ? "Main" : "Secondary"),
            usage: c.usage || "",
            localPreview: c.preview,
          }))
        setRefs(filtered)
      } else {
        setRefs([])
      }
    } catch {
      setRefs([])
    }
    setRefsLoading(false)
  }

  useEffect(() => {
    loadRefs()
    const onVisible = () => { if (document.visibilityState === 'visible') loadRefs() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── Load project questions from AutoGen once brief+refs ready ─
  useEffect(() => {
    if (!hydrated) return
    const hasBrief = Object.values(brief).some(v => v?.trim())
    if (!hasBrief) return
    setQuestionsLoading(true)

    const briefSummary = Object.entries(brief)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `${BRIEF_LABELS[k] || k}: ${v}`)
      .join("\n")
    const refsSummary = refs.map(r => `- ${r.title}${r.note ? ` (Notes: ${r.note})` : ""}`).join("\n")

    fetch(`${API}/suggestion/chat/reflection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: PROJECT_ID,
        message: `Based on the following Spec and References, generate 5 to 8 project-based questions to help the Artist think deeply and identify tensions between the Spec and Refs. One question per line, no numbering or markers.\n\nSpec:\n${briefSummary}\n\nReferences:\n${refsSummary || "(none uploaded yet)"}`,
        history: [],
      }),
    })
      .then(r => r.json())
      .then(data => {
        const text: string = stripBold(data.response || data.reply || data.message || "")
        const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 10)
        setProjectQuestions(lines.map((t, i) => ({ id: `pq${i}`, text: t })))
      })
      .catch(() => {})
      .finally(() => setQuestionsLoading(false))
  }, [hydrated, brief, refs])

  // ── Mode-specific system prompts ────────────────────────────
  // ── Call AutoGen (normal chat) ────────────────────────────────
  const callAgent = useCallback(async (userMsg: string) => {
    setAgentMessages(prev => [...prev, { role: "user", content: userMsg }])
    setAgentLoading(true)

    const briefSummary = Object.entries(brief)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `${BRIEF_LABELS[k] || k}: ${v}`)
      .join("\n")
    const refsSummary = refs.map(r => `- ${r.title}${r.note ? ` (${r.note})` : ""}`).join("\n")
    const specAndRefs = `Spec:\n${briefSummary || "(not filled)"}\n\nReferences:\n${refsSummary || "(none)"}`

    const systemCtx = `You are the Creative Exploration Agent, helping VFX Artists deepen creative thinking.
Current project data:
${specAndRefs}
Rules: Respond in English. Never use ** bold or --- separators or any markdown symbols. Output plain text only.`

    try {
      const history = agentMessages.slice(-10).map(m => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content,
      }))
      const res = await fetch(`${API}/suggestion/chat/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          message: systemCtx + "\n\nUser said: " + userMsg,
          history,
          all_refs_context: refs.map(r => ({
            id: r.id,
            title: r.title,
            category: r.category || "",
            note: r.note || "",
            is_pinned: r.is_pinned,
            priority: r.importance || (r.is_pinned ? "Main" : "Secondary"),
            preview: r.localPreview || r.thumbnail_url || r.file_url || "",
          })),
        }),
      })
      const data = await res.json()
      const reply = stripBold(data.response || data.reply || data.message || "Sorry, I'm unable to respond right now. Please try again later.")
      setAgentMessages(prev => [...prev, { role: "ai", content: reply }])
    } catch {
      setAgentMessages(prev => [...prev, { role: "ai", content: "Connection failed. Please confirm the backend service is running." }])
    } finally {
      setAgentLoading(false)
    }
  }, [brief, refs, agentMessages])

  // ── Mode button: calls /suggestion/chat/mode on backend ────────
  const callAgentWithMode = useCallback(async (targetContent: string, mode: string) => {
    const modeLabel = mode === "rephrase" ? "Rephrase" : mode === "logic" ? "Logic Mode" : "Evidence Binding"
    setAgentMessages(prev => [...prev, { role: "user", content: `[${modeLabel}]` }])
    setAgentLoading(true)

    const briefSummary = Object.entries(brief)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `${BRIEF_LABELS[k] || k}: ${v}`)
      .join("\n")
    const refsSummary = refs.map(r => `- ${r.title}${r.note ? ` (${r.note})` : ""}`).join("\n")
    const specAndRefs = `Spec:\n${briefSummary || "(not filled)"}\n\nReferences:\n${refsSummary || "(none)"}`

    try {
      const res = await fetch(`${API}/suggestion/chat/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          content: targetContent,
          spec_and_refs: specAndRefs,
        }),
      })
      const data = await res.json()
      const reply = stripBold(data.response || data.reply || data.message || "Sorry, unable to process.")
      setAgentMessages(prev => [...prev, { role: "ai", content: reply }])
    } catch {
      setAgentMessages(prev => [...prev, { role: "ai", content: "Connection failed. Please confirm the backend service is running." }])
    } finally {
      setAgentLoading(false)
    }
  }, [brief, refs])

  const handleAgentSend = useCallback(() => {
    const msg = agentInput.trim()
    if (!msg || agentLoading) return
    const mode = responseMode ?? undefined
    setAgentInput("")
    setResponseMode(null)
    if (mode) {
      callAgentWithMode(msg, mode)
    } else {
      callAgent(msg)
    }
  }, [agentInput, responseMode, agentLoading, callAgent, callAgentWithMode])

  // ── Mode buttons: immediately transform last AI reply ─────────
  const handleModeButton = useCallback((mode: string) => {
    if (responseMode === mode) { setResponseMode(null); return }
    if (agentInput.trim()) { setResponseMode(mode); return }
    // No input — transform last AI message immediately
    const lastAI = [...agentMessages].reverse().find(m => m.role === "ai")
    if (!lastAI) { setResponseMode(mode); return }
    callAgentWithMode(lastAI.content, mode)
  }, [responseMode, agentInput, agentMessages, callAgentWithMode])

  const injectToChat = useCallback((text: string) => {
    callAgent(text)
  }, [callAgent])

  const handleQuestionCheck = useCallback((qId: string, checked: boolean) => {
    setCheckedQuestions(prev => checked ? [...prev, qId] : prev.filter(id => id !== qId))
    if (checked) {
      const q = projectQuestions.find(p => p.id === qId)
      if (q) callAgent(`[Selected Question] ${q.text}`)
    }
  }, [projectQuestions, callAgent])

  const moveNode = (idx: number, dir: "up" | "down") => {
    setMindMapNodes(prev => {
      const arr = [...prev]
      const swap = dir === "up" ? idx - 1 : idx + 1
      if (swap < 0 || swap >= arr.length) return prev
      ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
      return arr.map((n, i) => ({ ...n, priority: i + 1 }))
    })
  }

  // ALL brief fields — keys must match kickoff BriefForm exactly
  const ALL_SPEC_FIELDS = [
    { label: "Project Name", key: "project_name" },
    { label: "Client", key: "client" },
    { label: "Director/Creative Director & Supervisor", key: "director" },
    { label: "Confidentiality Level", key: "confidentiality" },
    { label: "Key Selling Points", key: "selling_points" },
    { label: "Emotional Keywords", key: "keywords" },
    { label: "Restrictions / Taboos", key: "restrictions" },
    { label: "Style Keywords", key: "style" },
    { label: "Color Tone / Atmosphere", key: "mood" },
    { label: "World Concept", key: "worldview" },
  ]
  const specFields = ALL_SPEC_FIELDS.filter(f => brief[f.key]?.trim())

  // ── Panel resize state ──────────────────────────────────────
  const [col1Width, setCol1Width] = useState(350)   // px, default
  const [col3Width, setCol3Width] = useState(700)   // px, default max
  const dragging = useRef<{ col: 1 | 3; startX: number; startW: number } | null>(null)

  const startDrag = (col: 1 | 3) => (e: React.MouseEvent) => {
    dragging.current = { col, startX: e.clientX, startW: col === 1 ? col1Width : col3Width }
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = ev.clientX - dragging.current.startX
      const newW = Math.max(180, Math.min(700, dragging.current.startW + (dragging.current.col === 1 ? delta : -delta)))
      dragging.current.col === 1 ? setCol1Width(newW) : setCol3Width(newW)
    }
    const onUp = () => { dragging.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <PipelineSidebar />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="px-4 py-3 h-full flex flex-col">

            {/* Header */}
            <div className="mb-3 shrink-0">
              <div className="flex items-center gap-3 mb-1">
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">C03</Badge>
                <h1 className="text-xl font-bold">Artist Spec + Ref Reflection</h1>
              </div>
              <p className="text-xs text-muted-foreground">User-led path — promotes critical thinking, not driven by the system</p>
            </div>

            {/* 3-column body */}
            <div className="flex gap-4 flex-1 min-h-0">

              {/* ── Col 2: Spec + Refs ─────────────────────────── */}
              <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">

                {/* Supervisor Spec */}
                <Collapsible open={specsOpen} onOpenChange={setSpecsOpen}>
                  <Card className="border-teal-500/30 bg-teal-500/5">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-2.5 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-teal-600" />
                            <CardTitle className="text-sm">Supervisor Spec & Intention</CardTitle>
                          </div>
                          {specsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-3 px-4 space-y-2">
                        <p className="text-[10px] text-muted-foreground italic">Click any item to automatically add it to the Agent conversation</p>
                        {specFields.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">Kickoff Brief not yet filled. Please complete C01 first.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {specFields.map((item, idx) => (
                              <div key={idx} className="p-2 bg-background rounded-lg border cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all"
                                onClick={() => injectToChat(`Regarding Spec item "${item.label}: ${brief[item.key]}", please follow up on my understanding and execution plan for this.`)}>
                                <span className="text-[10px] text-muted-foreground uppercase">{item.label}</span>
                                <p className="text-xs mt-0.5">{brief[item.key]}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {brief["supervisor_spec"]?.trim() && (
                          <div className="p-2.5 bg-teal-500/10 rounded-lg border border-teal-500/30 cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all"
                            onClick={() => injectToChat(`Regarding Supervisor Spec: "${brief["supervisor_spec"]}", please follow up on how I plan to execute this specifically.`)}>
                            <span className="text-[10px] font-semibold text-teal-700">SUPERVISOR ADDITIONAL NOTES</span>
                            <p className="text-xs whitespace-pre-line mt-1">{brief["supervisor_spec"]}</p>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* References */}
                <Collapsible open={refsOpen} onOpenChange={setRefsOpen} className="flex-1 min-h-0 flex flex-col">
                  <Card className="flex-1 flex flex-col min-h-0">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-2.5 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-indigo-600" />
                            <CardTitle className="text-sm">References</CardTitle>
                            <Badge variant="secondary" className="text-[10px] h-4">{refs.length}</Badge>
                          </div>
                          {refsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex-1 min-h-0">
                      <CardContent className="pt-0 pb-3 px-4 h-full flex flex-col">
                        {refsLoading ? (
                          <div className="flex items-center gap-2 py-4 text-muted-foreground text-xs">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading...
                          </div>
                        ) : refs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No References uploaded yet. Please complete C02 first.</p>
                        ) : (
                          <>
                            <p className="text-[10px] text-muted-foreground italic mb-2">Click a Reference to automatically add it to the Agent conversation</p>
                            <ScrollArea className="flex-1 min-h-0">
                            <div className="grid grid-cols-2 gap-3 pr-1">
                              {refs.map(ref => (
                                <RefCard
                                  key={ref.id}
                                  data={{
                                    id: ref.id,
                                    title: ref.title,
                                    preview: ref.localPreview,
                                    category: ref.category,
                                    importance: ref.is_pinned ? "Main" : (ref.importance ?? "Secondary"),
                                    usage: ref.usage,
                                    note: ref.note,
                                  }}
                                  onChange={updated => {
                                    setRefs(prev => {
                                      const next = prev.map(r => r.id === ref.id ? {
                                        ...r,
                                        category: updated.category,
                                        importance: updated.importance,
                                        usage: updated.usage,
                                        note: updated.note ?? r.note,
                                        is_pinned: updated.importance === "Main",
                                      } : r)
                                      // Persist back to sessionStorage so reference-hub stays in sync
                                      try {
                                        const cached = JSON.parse(sessionStorage.getItem("refhub_refs") || "[]")
                                        const cacheMap: Record<string, any> = {}
                                        cached.forEach((c: any) => { cacheMap[c.id] = c })
                                        const upd = next.find(r => r.id === ref.id)
                                        if (upd) cacheMap[upd.id] = { ...cacheMap[upd.id], category: upd.category, note: upd.note, is_pinned: upd.is_pinned, importance: updated.importance, usage: upd.usage, preview: upd.localPreview }
                                        sessionStorage.setItem("refhub_refs", JSON.stringify(Object.values(cacheMap)))
                                      } catch {}
                                      return next
                                    })
                                  }}
                                  onSave={updated => {
                                    // On explicit save: persist to sessionStorage
                                    try {
                                      const cached = JSON.parse(sessionStorage.getItem("refhub_refs") || "[]")
                                      const cacheMap: Record<string, any> = {}
                                      cached.forEach((c: any) => { cacheMap[c.id] = c })
                                      cacheMap[ref.id] = { ...cacheMap[ref.id], category: updated.category, note: updated.note, is_pinned: updated.importance === "Main", importance: updated.importance, usage: updated.usage, preview: ref.localPreview }
                                      sessionStorage.setItem("refhub_refs", JSON.stringify(Object.values(cacheMap)))
                                    } catch {}
                                  }}
                                  showSave={true}
                                  className="cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all"
                                  onDiscuss={d => {
                                    callAgent(`[Clicked Reference] ${d.title}${d.note ? `
Notes: ${d.note}` : ""}

Please ask me about the core qualities of this image, its connection to the Spec, and what elements I plan to draw from it.`)
                                  }}
                                />
                              ))}
                            </div>
                            </ScrollArea>
                          </>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Nav buttons */}
                <div className="flex gap-3 shrink-0 mt-auto pt-2">
                  <Button size="lg" variant="outline" className="flex-1 bg-transparent" asChild>
                    <a href="/reference-hub">← Back to Ref Hub</a>
                  </Button>
                  {pageSubmitted ? (
                    <Button size="lg" className="flex-1" asChild>
                      <a href="/upload-analyze">Submitted — Jump to C04 <ChevronRight className="w-4 h-4 ml-1" /></a>
                    </Button>
                  ) : (
                    <Button size="lg" className="flex-1" onClick={() => setPageSubmitted(true)}>
                      Ready — Submit & Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* ── Drag handle 3 ──────────────────────────────── */}
              <div className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-400/50 rounded transition-colors self-stretch" onMouseDown={startDrag(3)} />

              {/* ── Col 3: Creative Exploration Agent ─────────── */}
              <div className="shrink-0 flex flex-col min-h-0" style={{ width: col3Width }}>
                <Card className="border-indigo-500/30 bg-indigo-500/5 flex flex-col flex-1 min-h-0">
                  <CardHeader className="pb-2 pt-3 px-4 shrink-0">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Creative Exploration Agent
                    </CardTitle>
                    <CardDescription className="text-[11px]">Actively guide creative exploration. Check questions you're interested in to go deeper.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 flex flex-col">

                    {/* Project-Based Questions */}
                    <Collapsible defaultOpen={false} className="border-b shrink-0">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-medium">Project-Based Questions</span>
                            {questionsLoading
                              ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                              : <Badge variant="secondary" className="text-[10px] h-4">{projectQuestions.length}</Badge>
                            }
                          </div>
                          <Badge variant="outline" className="text-[10px]">{checkedQuestions.length} selected</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent forceMount className="data-[state=closed]:hidden">
                        <div className="h-48 border-t">
                          <ScrollArea className="h-full">
                            <div className="px-3 py-2 space-y-1.5 pr-5">
                              {questionsLoading ? (
                                <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />AutoGen generating questions...
                                </div>
                              ) : projectQuestions.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">C01 Brief must be filled in before questions can be generated.</p>
                              ) : projectQuestions.map(q => (
                                <div key={q.id}
                                  className={`flex items-start gap-2 p-1.5 rounded-lg border transition-colors cursor-pointer ${checkedQuestions.includes(q.id) ? "bg-indigo-500/10 border-indigo-500/30" : "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"}`}
                                  onClick={() => handleQuestionCheck(q.id, !checkedQuestions.includes(q.id))}>
                                  <Checkbox checked={checkedQuestions.includes(q.id)}
                                    onCheckedChange={c => handleQuestionCheck(q.id, c as boolean)}
                                    className="mt-0.5 shrink-0" onClick={e => e.stopPropagation()} />
                                  <p className="text-[11px] leading-relaxed">{q.text}</p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Chat messages */}
                    <ScrollArea className="flex-1 min-h-0 p-3">
                      <div className="space-y-3 pr-1">
                        {agentMessages.map((msg, idx) => (
                          <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                            <Avatar className="w-7 h-7 shrink-0">
                              <AvatarFallback className={msg.role === "ai" ? "bg-indigo-500/10 text-indigo-600" : "bg-primary/10"}>
                                {msg.role === "ai" ? <Sparkles className="w-3.5 h-3.5" /> : "A"}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`rounded-lg p-2.5 min-w-0 max-w-[80%] break-words ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                              {msg.image && (
                                <div className="mb-1.5 rounded overflow-hidden">
                                  <img src={msg.image} alt="ref" className="w-full h-20 object-cover rounded" />
                                </div>
                              )}
                              {msg.role === "ai"
                                ? <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                                : <p className="text-sm whitespace-pre-line">{msg.content}</p>
                              }
                            </div>
                          </div>
                        ))}
                        {agentLoading && (
                          <div className="flex gap-2">
                            <Avatar className="w-7 h-7 shrink-0">
                              <AvatarFallback className="bg-indigo-500/10 text-indigo-600"><Sparkles className="w-3.5 h-3.5" /></AvatarFallback>
                            </Avatar>
                            <div className="rounded-lg p-2.5 bg-muted flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                              <span className="text-xs text-muted-foreground">AI thinking...</span>
                            </div>
                          </div>
                        )}
                        <div ref={scrollBottom} />
                      </div>
                    </ScrollArea>

                    {/* Input area */}
                    <div className="p-3 border-t space-y-2 shrink-0">
                      {/* Mode buttons — clicking immediately sends to agent */}
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { id: "rephrase", label: "Rephrase", icon: <RefreshCw className="w-3 h-3" /> },
                          { id: "logic",    label: "Logic Mode",   icon: <Beaker className="w-3 h-3" /> },
                          { id: "evidence", label: "Evidence Binding", icon: <Lightbulb className="w-3 h-3" /> },
                        ].map(btn => (
                          <Button key={btn.id}
                            variant={responseMode === btn.id ? "default" : "outline"}
                            size="sm" className="text-[11px] gap-1 h-7 bg-transparent"
                            disabled={agentLoading}
                            onClick={() => handleModeButton(btn.id)}>
                            {btn.icon}{btn.label}
                          </Button>
                        ))}
                      </div>
                      {responseMode && (
                        <div className="text-[10px] text-indigo-600 bg-indigo-500/10 rounded px-2 py-1">
                          Mode: {responseMode === "rephrase" ? "Rephrase" : responseMode === "logic" ? "Logic Mode (Physical phenomena / dramatic requirements)" : "Evidence Binding (bind to frame/Ref/Spec）"}
                          {" — "}Type and send, or click a button to follow up on the last reply.
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Input placeholder="Share your thoughts..."
                          value={agentInput} onChange={e => setAgentInput(e.target.value)}
                          onKeyDown={e => { e.stopPropagation() }}
                          disabled={agentLoading} className="text-xs" />
                        <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleAgentSend} disabled={agentLoading || !agentInput.trim()}>
                          {agentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>{/* end 3-col */}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function ArtistReflectionPage() {
  return <ArtistReflectionContent />
}