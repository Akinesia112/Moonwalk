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

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
const PROJECT_ID = "proj_001"

type ChatMsg = { role: "ai" | "user"; content: string; image?: string }
type Ref = { id: string; title: string; note: string; is_pinned: boolean; localPreview?: string; file_url?: string; thumbnail_url?: string }
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
  project_name: "專案名稱", client: "客戶", deliverable_type: "交付物類型",
  selling_point: "賣點", keywords: "關鍵詞", style_direction: "風格",
  mood_atmosphere: "氛圍", world_view: "世界觀", taboos: "禁忌",
  director_notes: "Supervisor 額外說明",
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
    { id: "n1", text: "光影方向確認", priority: 1, done: false },
    { id: "n2", text: "色溫範圍定義", priority: 2, done: false },
    { id: "n3", text: "材質歲月感處理", priority: 3, done: false },
    { id: "n4", text: "構圖方式選擇", priority: 4, done: false },
  ])

  const [agentMessages, setAgentMessages] = useState<ChatMsg[]>([{
    role: "ai",
    content: "我是 Creative Exploration Agent。讀取 Spec 與 Reference 後，我會為您準備 project-based 問題，找出潛在張力與需要澄清的地方。\n\n您也可以直接輸入想法，或點選左側 Spec / Ref 項目讓我追問。",
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

    setHydrated(true)
  }, [])

  // Persist chat
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem("reflection_chat", JSON.stringify(agentMessages)) } catch {}
  }, [agentMessages, hydrated])

  // Auto-scroll
  useEffect(() => {
    scrollBottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [agentMessages, agentLoading])

  // ── Load refs from backend ────────────────────────────────────
  useEffect(() => {
    setRefsLoading(true)
    fetch(`${API}/search/references?project_id=${PROJECT_ID}`)
      .then(r => r.json())
      .then((data: any[]) => {
        setRefs(data.filter(r => r.file_url?.trim() || r.thumbnail_url?.trim()).map(r => {
          const raw = r.thumbnail_url || r.file_url || ""
          const thumb = raw.startsWith("/") ? `${API}${raw}` : raw
          return { ...r, localPreview: thumb || undefined }
        }))
      })
      .catch(() => {})
      .finally(() => setRefsLoading(false))
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
    const refsSummary = refs.map(r => `- ${r.title}${r.note ? `（備註：${r.note}）` : ""}`).join("\n")

    fetch(`${API}/suggestion/chat/brief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: PROJECT_ID,
        message: `請根據以下 Spec 與 References，生成 5 到 8 個 project-based 問題，幫助 Artist 深入思考並找出 Spec 與 Ref 之間的張力。每個問題一行，不要加編號或標記。\n\nSpec:\n${briefSummary}\n\nReferences:\n${refsSummary || "（尚未上傳）"}`,
        history: [],
      }),
    })
      .then(r => r.json())
      .then(data => {
        const text: string = data.response || data.reply || data.message || ""
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
    const refsSummary = refs.map(r => `- ${r.title}${r.note ? `（${r.note}）` : ""}`).join("\n")
    const specAndRefs = `Spec:\n${briefSummary || "（未填）"}\n\nReferences:\n${refsSummary || "（無）"}`

    const systemCtx = `你是 Creative Exploration Agent，協助 VFX Artist 深化創意思考。
當前專案資料：
${specAndRefs}
規則：用繁體中文回應。絕對禁止使用 ** 加粗或 --- 分隔線等 markdown 符號，直接輸出純文字。`

    try {
      const history = agentMessages.slice(-10).map(m => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content,
      }))
      const res = await fetch(`${API}/suggestion/chat/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: PROJECT_ID,
          message: `${systemCtx}\n\n用戶說：${userMsg}`,
          history,
        }),
      })
      const data = await res.json()
      const reply = data.response || data.reply || data.message || "抱歉，我現在無法回應，請稍後再試。"
      setAgentMessages(prev => [...prev, { role: "ai", content: reply }])
    } catch {
      setAgentMessages(prev => [...prev, { role: "ai", content: "連線失敗，請確認後端服務是否正常運行。" }])
    } finally {
      setAgentLoading(false)
    }
  }, [brief, refs, agentMessages])

  // ── Mode button: calls /suggestion/chat/mode on backend ────────
  const callAgentWithMode = useCallback(async (targetContent: string, mode: string) => {
    const modeLabel = mode === "rephrase" ? "換句話說" : mode === "logic" ? "講邏輯" : "Evidence Binding"
    setAgentMessages(prev => [...prev, { role: "user", content: `[${modeLabel}]` }])
    setAgentLoading(true)

    const briefSummary = Object.entries(brief)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `${BRIEF_LABELS[k] || k}: ${v}`)
      .join("\n")
    const refsSummary = refs.map(r => `- ${r.title}${r.note ? `（${r.note}）` : ""}`).join("\n")
    const specAndRefs = `Spec:\n${briefSummary || "（未填）"}\n\nReferences:\n${refsSummary || "（無）"}`

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
      const reply = data.response || data.reply || data.message || "抱歉，無法處理。"
      setAgentMessages(prev => [...prev, { role: "ai", content: reply }])
    } catch {
      setAgentMessages(prev => [...prev, { role: "ai", content: "連線失敗，請確認後端服務是否正常運行。" }])
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
      if (q) callAgent(`[選擇問題] ${q.text}`)
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
    { label: "專案名稱", key: "project_name" },
    { label: "客戶", key: "client" },
    { label: "導演/創意總監", key: "director" },
    { label: "Supervisor", key: "supervisor" },
    { label: "密等", key: "confidentiality" },
    { label: "產品賣點", key: "selling_points" },
    { label: "情緒關鍵詞", key: "keywords" },
    { label: "禁忌事項", key: "restrictions" },
    { label: "風格關鍵字", key: "style" },
    { label: "色調/氛圍", key: "mood" },
    { label: "世界觀", key: "worldview" },
  ]
  const specFields = ALL_SPEC_FIELDS.filter(f => brief[f.key]?.trim())

  // ── Panel resize state ──────────────────────────────────────
  const [col1Width, setCol1Width] = useState(256)   // px, default w-64
  const [col3Width, setCol3Width] = useState(320)   // px, default w-80
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
              <p className="text-xs text-muted-foreground">使用者主導路徑 — 促進批判思考，不被系統帶著走</p>
            </div>

            {/* 3-column body */}
            <div className="flex gap-4 flex-1 min-h-0">

              {/* ── Col 1: Mind Map + Notes ───────────────────── */}
              <div className="shrink-0 flex flex-col gap-3 min-h-0 overflow-y-auto" style={{ width: col1Width }}>

                {/* Mind Map */}
                <Card className="border-indigo-500/30 shrink-0">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="flex items-center gap-2 text-xs">
                      <GripVertical className="w-3.5 h-3.5 text-indigo-600" />
                      Feedback 心智圖 / 工作流
                    </CardTitle>
                    <CardDescription className="text-[10px]">排序工作優先順序</CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-1.5">
                    {mindMapNodes.map((node, idx) => (
                      <div key={node.id} className="flex items-center gap-1.5 p-2 rounded-lg border bg-card hover:border-indigo-500/50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => moveNode(idx, "up")} disabled={idx === 0}><ArrowUp className="w-2.5 h-2.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => moveNode(idx, "down")} disabled={idx === mindMapNodes.length - 1}><ArrowDown className="w-2.5 h-2.5" /></Button>
                        </div>
                        <Badge variant="outline" className="text-[9px] h-4 w-5 justify-center shrink-0">{node.priority}</Badge>
                        {editingNodeId === node.id ? (
                          <Input autoFocus value={node.text}
                            onChange={e => setMindMapNodes(prev => prev.map(n => n.id === node.id ? { ...n, text: e.target.value } : n))}
                            onBlur={() => setEditingNodeId(null)}
                            onKeyDown={e => { if (e.key === "Enter") setEditingNodeId(null) }}
                            className="text-[11px] h-5 flex-1" />
                        ) : (
                          <span className="text-[11px] flex-1 cursor-text hover:text-indigo-600 transition-colors" onClick={() => setEditingNodeId(node.id)}>{node.text}</span>
                        )}
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0 text-muted-foreground hover:text-red-500"
                          onClick={() => setMindMapNodes(prev => prev.filter(n => n.id !== node.id).map((n, i) => ({ ...n, priority: i + 1 })))}>
                          <Trash2 className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full text-[11px] bg-transparent h-7" onClick={() => setMindMapNodes(prev => [...prev, { id: `n${Date.now()}`, text: "新增項目...", priority: prev.length + 1, done: false }])}>
                      + 新增工作項
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full text-[11px] h-7" disabled={agentLoading}
                      onClick={() => injectToChat(`請分析目前工作流排序是否合理：\n${mindMapNodes.map((n, i) => `${i + 1}. ${n.text}`).join("\n")}\n\n請針對每項給出具體建議。`)}>
                      <MessageSquare className="w-3 h-3 mr-1" />Agent 分析排序
                    </Button>
                  </CardContent>
                </Card>

                {/* Reflection Notes */}
                <Card className="border-indigo-500/30 flex-1 flex flex-col min-h-0">
                  <CardHeader className="pb-2 pt-3 px-3 shrink-0">
                    <CardTitle className="flex items-center gap-2 text-xs">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      我的理解筆記
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 flex flex-col gap-2 flex-1 min-h-0">
                    <Textarea value={reflectionNotes} onChange={e => setReflectionNotes(e.target.value)}
                      placeholder={"寫下理解...\n- 我覺得導演想要的是...\n- 「被背叛後的憤怒」我打算用...來表現"}
                      className="text-xs flex-1 resize-none min-h-[120px]" />
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="flex-1 text-[11px] gap-1 bg-transparent h-7" disabled={!reflectionNotes.trim()}>
                        <BookOpen className="w-3 h-3" />Save
                      </Button>
                      <Button size="sm" className="flex-1 text-[11px] gap-1 h-7" disabled={!reflectionNotes.trim() || agentLoading}
                        onClick={() => reflectionNotes.trim() && injectToChat(`[我的理解筆記]\n${reflectionNotes}\n\n請針對我的理解進行分析，找出邏輯一致性問題或需要補充的地方。`)}>
                        <Send className="w-3 h-3" />Submit to Agent
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Drag handle 1 ──────────────────────────────── */}
              <div className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-400/50 rounded transition-colors self-stretch" onMouseDown={startDrag(1)} />

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
                        <p className="text-[10px] text-muted-foreground italic">點擊任何項目可自動加入 Agent 對話追問</p>
                        {specFields.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">尚未填寫 Kickoff Brief，請先完成 C01。</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {specFields.map((item, idx) => (
                              <div key={idx} className="p-2 bg-background rounded-lg border cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all"
                                onClick={() => injectToChat(`關於 Spec「${item.label}: ${brief[item.key]}」，請追問我對這個項目的理解與執行計劃。`)}>
                                <span className="text-[10px] text-muted-foreground uppercase">{item.label}</span>
                                <p className="text-xs mt-0.5">{brief[item.key]}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {brief["supervisor_spec"]?.trim() && (
                          <div className="p-2.5 bg-teal-500/10 rounded-lg border border-teal-500/30 cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all"
                            onClick={() => injectToChat(`關於 Supervisor Spec：「${brief["supervisor_spec"]}」，請追問我如何具體執行。`)}>
                            <span className="text-[10px] font-semibold text-teal-700">SUPERVISOR 額外說明</span>
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
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />載入中...
                          </div>
                        ) : refs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">尚未上傳任何 Reference，請先完成 C02。</p>
                        ) : (
                          <>
                            <p className="text-[10px] text-muted-foreground italic mb-2">點擊 Reference 可自動加入 Agent 追問</p>
                            <ScrollArea className="flex-1 min-h-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pr-1">
                              {refs.map(ref => (
                                <Card key={ref.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all"
                                  onClick={() => injectToChat(`[點擊 Reference] ${ref.title}${ref.note ? `\n備註：${ref.note}` : ""}\n\n請問我這張圖的核心特質、與 Spec 的關聯，以及我打算從中借鑑哪些元素。`)}>
                                  <div className="aspect-video bg-muted overflow-hidden">
                                    {ref.localPreview && (
                                      <img src={ref.localPreview} alt={ref.title} className="w-full h-full object-cover"
                                        onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                                    )}
                                  </div>
                                  <div className="p-1.5">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      {ref.is_pinned && <Badge className="bg-amber-500 text-white text-[9px] h-3.5 px-1">Main</Badge>}
                                      <h4 className="font-medium text-[11px] truncate">{ref.title}</h4>
                                    </div>
                                    {ref.note && <p className="text-[10px] text-muted-foreground truncate">{ref.note}</p>}
                                  </div>
                                </Card>
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
                    <CardDescription className="text-[11px]">主動引導思考探索。勾選感興趣的問題深入對話。</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 flex flex-col">

                    {/* Project-Based Questions */}
                    <Collapsible defaultOpen={false} className="border-b shrink-0">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-medium">Project-Based 問題</span>
                            {questionsLoading
                              ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                              : <Badge variant="secondary" className="text-[10px] h-4">{projectQuestions.length}</Badge>
                            }
                          </div>
                          <Badge variant="outline" className="text-[10px]">{checkedQuestions.length} 已選</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent forceMount className="data-[state=closed]:hidden">
                        <div className="h-48 border-t">
                          <ScrollArea className="h-full">
                            <div className="px-3 py-2 space-y-1.5 pr-5">
                              {questionsLoading ? (
                                <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />AutoGen 生成問題中...
                                </div>
                              ) : projectQuestions.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">需要先填寫 C01 Brief 才能生成問題。</p>
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
                              <span className="text-xs text-muted-foreground">AI 思考中...</span>
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
                          { id: "rephrase", label: "換句話說", icon: <RefreshCw className="w-3 h-3" /> },
                          { id: "logic",    label: "講邏輯",   icon: <Beaker className="w-3 h-3" /> },
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
                          模式：{responseMode === "rephrase" ? "換句話說" : responseMode === "logic" ? "講邏輯（物理現象/戲劇需求）" : "Evidence Binding（綁定畫面/Ref/Spec）"}
                          {" — "}輸入內容後送出，或直接點擊按鈕追問上一則回覆。
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Input placeholder="分享您的想法..."
                          value={agentInput} onChange={e => setAgentInput(e.target.value)}
                          onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") handleAgentSend() }}
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