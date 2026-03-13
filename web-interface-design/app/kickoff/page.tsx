"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Send, Bot, ChevronRight, ChevronDown, ChevronUp, Sparkles, Loader2, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

// ── Types ───────────────────────────────────────────────────────
interface ChatMessage { role: "user" | "ai"; content: string }
interface BriefForm {
  project_name: string
  client: string
  director: string
  supervisor: string
  confidentiality: string
  selling_points: string
  keywords: string
  restrictions: string
  style: string
  mood: string
  worldview: string
  supervisor_spec: string
}

const INITIAL_BRIEF: BriefForm = {
  project_name: "", client: "", director: "", supervisor: "",
  confidentiality: "internal", selling_points: "", keywords: "",
  restrictions: "", style: "", mood: "", worldview: "",
  supervisor_spec: "",
}

// ── API helpers ─────────────────────────────────────────────────
async function apiChatBrief(message: string, brief: BriefForm, history: ChatMessage[]) {
  const res = await fetch(`${API}/suggestion/chat/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      project_id: "proj_001",
      brief_context: brief,
      history: history.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
    }),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const data = await res.json()
  return data.reply as string
}

async function apiAnalyzeBrief(brief: BriefForm) {
  const res = await fetch(`${API}/Modification/project/brief/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: "proj_001", brief }),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

async function apiSaveBrief(brief: BriefForm) {
  const res = await fetch(`${API}/Modification/project/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: "proj_001", ...brief }),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

// ── Component ───────────────────────────────────────────────────
export default function KickoffPage() {
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [panelW, setPanelW] = useState(400)
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
  const [specAnalyzed, setSpecAnalyzed] = useState(false)
  const [analyzingSpec, setAnalyzingSpec] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [kickoffSubmitted, setKickoffSubmitted] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [saveError, setSaveError] = useState("")

  const [brief, setBrief] = useState<BriefForm>(INITIAL_BRIEF)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    role: "ai" as const,
    content: "您好！我是 AI 追問助手。\n\n請填寫左側表單（標示 * 為必填），填完後點「開始分析 Spec」，我會根據您填入的內容做摘要並追問不清楚的地方。\n\n也可以直接在這裡輸入問題。",
  }])
  const [inputMessage, setInputMessage] = useState("")
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [quickRepliesLoading, setQuickRepliesLoading] = useState(false)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const scrollBottom = useRef<HTMLDivElement>(null)

  // Restore from sessionStorage after mount (client-only, avoids SSR hydration mismatch)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    try {
      const savedBrief = sessionStorage.getItem("kickoff_brief")
      if (savedBrief) setBrief(JSON.parse(savedBrief))
      const savedChat = sessionStorage.getItem("kickoff_chat")
      if (savedChat) setChatMessages(JSON.parse(savedChat))
    } catch {}
    setHydrated(true)
  }, [])

  // Persist brief to sessionStorage (only after hydrated)
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem("kickoff_brief", JSON.stringify(brief)) } catch {}
  }, [brief, hydrated])

  // Persist chat to sessionStorage (only after hydrated)
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem("kickoff_chat", JSON.stringify(chatMessages)) } catch {}
  }, [chatMessages, hydrated])

  // Auto-scroll chat — use a sentinel div at the bottom
  useEffect(() => {
    scrollBottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, aiThinking])

  // Restore quick replies on hydration if there's chat history
  useEffect(() => {
    if (!hydrated) return
    if (chatMessages.length > 1 && quickReplies.length === 0) {
      fetchQuickReplies(chatMessages, brief)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  const setField = (field: keyof BriefForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setBrief(prev => ({ ...prev, [field]: e.target.value }))

  const setSelectField = (field: keyof BriefForm) => (value: string) =>
    setBrief(prev => ({ ...prev, [field]: value }))

  // ── Send chat message ────────────────────────────────────────
  const handleSendMessage = async (overrideMsg?: string) => {
    const msg = (overrideMsg ?? inputMessage).trim()
    if (!msg || aiThinking) return

    const newHistory: ChatMessage[] = [...chatMessages, { role: "user", content: msg }]
    setChatMessages(newHistory)
    setInputMessage("")
    setAiThinking(true)
    setSaveError("")

    try {
      const reply = await apiChatBrief(msg, brief, newHistory)
      const updatedHistory = [...newHistory, { role: "ai" as const, content: reply }]
      setChatMessages(updatedHistory)
      fetchQuickReplies(updatedHistory, brief)
    } catch (e) {
      setChatMessages(prev => [
        ...prev,
        { role: "ai", content: `⚠️ 連線錯誤，請確認 backend 運作中。(${e})` },
      ])
    } finally {
      setAiThinking(false)
    }
  }


  // ── Fetch AutoGen quick reply suggestions ───────────────────
  const fetchQuickReplies = async (history: ChatMessage[], currentBrief: BriefForm) => {
    setQuickRepliesLoading(true)
    try {
      const briefLines = Object.entries(currentBrief)
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")

      const res = await fetch(`${API}/suggestion/chat/brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `根據以下 brief 內容和對話，生成三個最相關的追問問題作為快捷按鈕。
每個問題必須針對 brief 中的具體內容，直接可以點擊追問。
只回傳三行文字，每行一個問題，不加編號、不加標點符號以外的格式。

Brief 內容：
${briefLines}`,
          project_id: "proj_001",
          history: history.slice(-6).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      const raw = (data.response || data.reply || data.message || "").trim()

      let suggestions: string[] = []

      // Try JSON array first
      const jsonMatch = raw.match(/\[[\s\S]*?\]/)
      if (jsonMatch) {
        try {
          const arr = JSON.parse(jsonMatch[0])
          if (Array.isArray(arr)) suggestions = arr.map(String).filter(s => s.trim().length > 5)
        } catch {}
      }

      // Fallback: split by newlines, strip numbering / bullets
      if (suggestions.length === 0) {
        suggestions = raw
          .split("\n")
          .map(l => l.replace(/^[\d\-\*\.\、\s]+/, "").trim())
          .filter(l => l.length > 5)
      }

      if (suggestions.length > 0) {
        setQuickReplies(suggestions.slice(0, 3))
      }
    } catch {
      // silently fail
    } finally {
      setQuickRepliesLoading(false)
    }
  }

  // ── Required fields check ───────────────────────────────────
  const REQUIRED_FIELDS: (keyof BriefForm)[] = [
    "project_name", "client", "director", "supervisor",
    "confidentiality", "selling_points", "keywords", "style", "mood"
  ]
  const missingRequired = REQUIRED_FIELDS.filter(f => !brief[f]?.trim())

  // ── Analyze Spec ─────────────────────────────────────────────
  const handleAnalyzeSpec = async () => {
    if (missingRequired.length > 0) {
      const labels: Record<string, string> = {
        project_name: "專案名稱", client: "客戶", director: "導演/創意總監",
        supervisor: "Supervisor", confidentiality: "密等",
        selling_points: "產品賣點", keywords: "情緒關鍵詞",
        style: "風格關鍵字", mood: "色調/氛圍",
      }
      setSaveError(`請先填寫必填欄位：${missingRequired.map(f => labels[f]).join("、")}`)
      return
    }
    setAnalyzingSpec(true)
    setSaveError("")
    try {
      const result = await apiAnalyzeBrief(brief)
      setSpecAnalyzed(true)

      // ── Build filled content overview ────────────────────────
      const FIELD_LABELS: Record<string, string> = {
        project_name: "專案名稱", client: "客戶",
        director: "導演/創意總監", supervisor: "Supervisor",
        confidentiality: "密等", selling_points: "產品賣點/重點訊息",
        keywords: "情緒關鍵詞", restrictions: "禁忌事項",
        style: "風格關鍵字", mood: "色調/氛圍",
        worldview: "世界觀", supervisor_spec: "Supervisor Spec",
      }
      const filledLines = Object.entries(FIELD_LABELS)
        .filter(([k]) => brief[k as keyof typeof brief]?.trim())
        .map(([k, label]) => `  ${label}：${brief[k as keyof typeof brief]}`)
      const emptyLabels = Object.entries(FIELD_LABELS)
        .filter(([k]) => !brief[k as keyof typeof brief]?.trim())
        .map(([, label]) => label)

      const overviewText = [
        filledLines.length ? `📝 **填寫內容：**\n${filledLines.join("\n")}` : "",
        emptyLabels.length ? `⬜ **未填寫：** ${emptyLabels.join("、")}` : "",
      ].filter(Boolean).join("\n\n")

      const summaryText = result.summary
        ? `\n\n📋 **創意摘要：**\n${result.summary}` : ""
      const ambiguousText = result.ambiguous_items?.length
        ? `\n\n⚠️ **需要釐清（根據您填入的內容）：**\n${result.ambiguous_items.map((s: string) => `- ${s}`).join("\n")}`
        : ""
      const missingText = result.missing_items?.length
        ? `\n\n❌ **必填欄位尚未填寫：**\n${result.missing_items.map((s: string) => `- ${s}`).join("\n")}`
        : ""
      const suggestionsText = result.suggestions?.length
        ? `\n\n💡 **建議：**\n${result.suggestions.map((s: string) => `- ${s}`).join("\n")}`
        : ""
      const allDone = !result.ambiguous_items?.length && !result.missing_items?.length
      const finalMsg = `Spec 分析完成！\n\n${overviewText}${summaryText}${ambiguousText}${missingText}${suggestionsText}${
        allDone ? "\n\n✅ 所有必填項目已填寫完成，可以 Submit 了。" : ""
      }`
      const afterAnalyze = [...chatMessages, { role: "ai" as const, content: finalMsg }]
      setChatMessages(afterAnalyze)
      fetchQuickReplies(afterAnalyze, brief)
    } catch (e) {
      setSaveError(`分析失敗：${e}`)
    } finally {
      setAnalyzingSpec(false)
    }
  }

  // ── Submit & Save ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!specAnalyzed || submitting) return
    setSubmitting(true)
    setSaveError("")
    try {
      await apiSaveBrief(brief)
      setKickoffSubmitted(true)
      setChatMessages(prev => [
        ...prev,
        { role: "ai", content: "✅ Brief 已成功儲存！接下來請前往 Reference Hub 上傳視覺參考。" },
      ])
    } catch (e) {
      setSaveError(`儲存失敗：${e}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Markdown renderer ────────────────────────────────────────
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
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
      if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# "))
        return <p key={i} className="font-bold text-sm mt-2">{parseInline(line.replace(/^#+\s/, ""))}</p>
      if (line.startsWith("- "))
        return <p key={i} className="text-sm pl-3 before:content-['•'] before:mr-2 before:text-teal-500">{parseInline(line.slice(2))}</p>
      if (line.trim() === "---") return <hr key={i} className="border-border my-2" />
      if (line.trim() === "")   return <div key={i} className="h-2" />
      return <p key={i} className="text-sm">{parseInline(line)}</p>
    })
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <PipelineSidebar />
        <main className="flex-1 min-h-0 overflow-auto">
          <div className="px-4 py-3 flex flex-col h-full">

            {/* Header */}
            <div className="mb-3">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30">C01</Badge>
                <h1 className="text-xl font-bold">專案啟動與 Brief 對焦</h1>
              </div>
              <p className="text-muted-foreground">Project Kickoff & Brief Alignment</p>
            </div>

            <Alert className="mb-3 border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>提醒：</strong>規格尺寸、交付日期、參考點為必填項目。確保一開始不要做錯。
              </AlertDescription>
            </Alert>

            {saveError && (
              <Alert className="mb-2 border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{saveError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4 flex-1 min-h-0">
              {/* ── Main Form ── */}
              <div className="flex-1 min-w-0 overflow-y-auto pr-1 space-y-4">

                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>基本資訊 Basic Information</CardTitle>
                    <CardDescription>專案基礎設定與客戶資訊</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="project-name">專案名稱 <span className="text-red-500">*</span></Label>
                        <Input id="project-name" placeholder="輸入專案名稱" value={brief.project_name} onChange={setField("project_name")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client">客戶 <span className="text-red-500">*</span></Label>
                        <Input id="client" placeholder="客戶名稱" value={brief.client} onChange={setField("client")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="director">導演/創意總監 <span className="text-red-500">*</span></Label>
                        <Input id="director" placeholder="導演名稱" value={brief.director} onChange={setField("director")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supervisor">Supervisor <span className="text-red-500">*</span></Label>
                        <Input id="supervisor" placeholder="負責 Supervisor" value={brief.supervisor} onChange={setField("supervisor")} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confidentiality">密等 Confidentiality <span className="text-red-500">*</span></Label>
                      <Select value={brief.confidentiality} onValueChange={setSelectField("confidentiality")}>
                        <SelectTrigger id="confidentiality"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public Ref</SelectItem>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="client-sensitive">Client-Sensitive</SelectItem>
                          <SelectItem value="nda-strict">NDA-Strict</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Brief / Spec */}
                <Card className="border-teal-500/30 bg-teal-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-teal-500 text-white text-xs flex items-center justify-center font-bold">D</span>
                      客戶目標、視覺方向與 Supervisor Spec
                    </CardTitle>
                    <CardDescription>客戶賣點、情緒關鍵詞、視覺風格、導演額外補充</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="selling-points">產品賣點/重點訊息 <span className="text-red-500">*</span></Label>
                      <Textarea id="selling-points" placeholder="客戶想強調的產品特色..." rows={2} value={brief.selling_points} onChange={setField("selling_points")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="keywords">情緒關鍵詞 <span className="text-red-500">*</span></Label>
                      <Input id="keywords" placeholder="例如：活潑、詭譎、溫暖、未來感..." value={brief.keywords} onChange={setField("keywords")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restrictions">禁忌事項</Label>
                      <Textarea id="restrictions" placeholder="不可出現的元素、顏色、風格..." rows={2} value={brief.restrictions} onChange={setField("restrictions")} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="style">風格關鍵字 <span className="text-red-500">*</span></Label>
                        <Input id="style" placeholder="寫實、插畫、賽博龐克..." value={brief.style} onChange={setField("style")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mood">色調/氛圍 <span className="text-red-500">*</span></Label>
                        <Input id="mood" placeholder="暖色調、冷色調、高對比..." value={brief.mood} onChange={setField("mood")} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="worldview">世界觀/概念</Label>
                      <Textarea id="worldview" placeholder="描述整體的視覺世界觀..." rows={2} value={brief.worldview} onChange={setField("worldview")} />
                    </div>

                    <div className="border-t border-teal-500/20 pt-4 space-y-2">
                      <Label htmlFor="director-spec">Supervisor Spec 額外補充說明</Label>
                      <Textarea
                        id="director-spec"
                        placeholder={"在此輸入任何額外的 Spec 說明...\n\n例如：\n- 主角的眼神要有「被背叛後的憤怒」\n- 光線要像《某某電影》第三幕的氛圍"}
                        rows={6}
                        value={brief.supervisor_spec}
                        onChange={setField("supervisor_spec")}
                      />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="w-3 h-3" />
                        <span>AI 會根據此欄位追問更具體的定義與參考</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    className={`flex-1 ${specAnalyzed ? "border-green-500 text-green-600 bg-green-500/10" : "bg-transparent"}`}
                    onClick={handleAnalyzeSpec}
                    disabled={analyzingSpec}
                  >
                    {analyzingSpec
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />分析中...</>
                      : specAnalyzed
                        ? <><CheckCircle2 className="w-4 h-4 mr-2" />Spec 分析完成</>
                        : <><Sparkles className="w-4 h-4 mr-2" />開始分析 Spec</>
                    }
                  </Button>
                  <Button
                    size="lg"
                    className={`flex-1 transition-colors ${
                      !specAnalyzed
                        ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted"
                        : kickoffSubmitted
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : ""
                    }`}
                    disabled={!specAnalyzed || submitting}
                    onClick={handleSubmit}
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />儲存中...</>
                      : kickoffSubmitted
                        ? <><CheckCircle2 className="w-4 h-4 mr-2" />Submitted</>
                        : <><Send className="w-4 h-4 mr-2" />Submit & Save to DB</>
                    }
                  </Button>
                </div>
                <Button size="lg" variant="outline" className="w-full bg-transparent" asChild>
                  <a href="/reference-hub">
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Jump to Reference Hub
                  </a>
                </Button>
              </div>

              {/* ── AI Chatbot Sidebar (resizable) ── */}
              <div ref={panelRef} className="shrink-0 relative self-stretch" style={{ width: panelW }}>
                {/* Resize handle — left edge only */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-teal-500/40 rounded transition-colors z-20" onMouseDown={startResize} />
                <Card className="border-teal-500/30 flex flex-col w-full h-full overflow-hidden absolute inset-0">
                  <Collapsible open={chatbotOpen} onOpenChange={setChatbotOpen} className="flex flex-col flex-1 min-h-0">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-teal-600" />
                            <div>
                              <CardTitle className="text-base">AI 追問助手</CardTitle>
                              <CardDescription className="text-xs">AI Clarification Chatbot</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {aiThinking && <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />}
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
                                <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                                  {msg.role === "ai"
                                    ? <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                                    : <p className="text-sm whitespace-pre-line">{msg.content}</p>
                                  }
                                </div>
                              </div>
                            ))}
                            {aiThinking && (
                              <div className="flex gap-3">
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className="bg-teal-500/10 text-teal-600">
                                    <Bot className="w-4 h-4" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="rounded-lg p-3 bg-muted flex items-center gap-2">
                                  <Loader2 className="w-3 h-3 animate-spin text-teal-500" />
                                  <span className="text-sm text-muted-foreground">AI 思考中...</span>
                                </div>
                              </div>
                            )}
                            <div ref={scrollBottom} />
                          </div>
                        </ScrollArea>
                        {/* Quick reply suggestions — dynamic from AutoGen */}
                        {!aiThinking && chatMessages.length > 0 && (quickReplies.length > 0 || quickRepliesLoading) && (
                          <div className="flex flex-wrap gap-1.5 mb-2 shrink-0">
                            {quickRepliesLoading ? (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />產生建議中...
                              </span>
                            ) : quickReplies.map(msg => (
                              <button
                                key={msg}
                                onClick={() => handleSendMessage(msg)}
                                className="text-xs px-2 py-1 rounded-full border border-teal-500/40 text-teal-700 hover:bg-teal-500/10 transition-colors text-left max-w-[220px] truncate"
                              >
                                {msg}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 shrink-0">
                          <Input
                            placeholder="輸入回覆..."
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            disabled={aiThinking}
                          />
                          <Button size="icon" onClick={handleSendMessage} disabled={aiThinking || !inputMessage.trim()}>
                            {aiThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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