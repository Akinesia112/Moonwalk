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
  rhythm: string
  supervisor_spec: string
}

const INITIAL_BRIEF: BriefForm = {
  project_name: "", client: "", director: "", supervisor: "",
  confidentiality: "internal", selling_points: "", keywords: "",
  restrictions: "", style: "", mood: "", worldview: "",
  rhythm: "", supervisor_spec: "",
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
  const [specAnalyzed, setSpecAnalyzed] = useState(false)
  const [analyzingSpec, setAnalyzingSpec] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [kickoffSubmitted, setKickoffSubmitted] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [saveError, setSaveError] = useState("")

  const [brief, setBrief] = useState<BriefForm>(INITIAL_BRIEF)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content: "您好！我是 AI 追問助手。請填寫左側表單，我會根據您填入的內容追問、釐清模糊的規格。\n\n可以先告訴我：\n1. 交付日期是什麼時候？\n2. 主要的參考風格有確定了嗎？\n3. 「溫暖氛圍」具體是指色溫 3200K 還是視覺上的暖色調？",
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages, aiThinking])

  const setField = (field: keyof BriefForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setBrief(prev => ({ ...prev, [field]: e.target.value }))

  const setSelectField = (field: keyof BriefForm) => (value: string) =>
    setBrief(prev => ({ ...prev, [field]: value }))

  // ── Send chat message ────────────────────────────────────────
  const handleSendMessage = async () => {
    const msg = inputMessage.trim()
    if (!msg || aiThinking) return

    const newHistory: ChatMessage[] = [...chatMessages, { role: "user", content: msg }]
    setChatMessages(newHistory)
    setInputMessage("")
    setAiThinking(true)
    setSaveError("")

    try {
      const reply = await apiChatBrief(msg, brief, newHistory)
      setChatMessages(prev => [...prev, { role: "ai", content: reply }])
    } catch (e) {
      setChatMessages(prev => [
        ...prev,
        { role: "ai", content: `⚠️ 連線錯誤，請確認 backend 運作中。(${e})` },
      ])
    } finally {
      setAiThinking(false)
    }
  }

  // ── Analyze Spec ─────────────────────────────────────────────
  const handleAnalyzeSpec = async () => {
    setAnalyzingSpec(true)
    setSaveError("")
    try {
      const result = await apiAnalyzeBrief(brief)
      setSpecAnalyzed(true)

      const ambiguous = result.ambiguous_items?.length
        ? `\n**模糊項目：**\n${result.ambiguous_items.map((s: string) => `- ${s}`).join("\n")}`
        : ""
      const missing = result.missing_items?.length
        ? `\n**缺少項目：**\n${result.missing_items.map((s: string) => `- ${s}`).join("\n")}`
        : ""
      const suggestions = result.suggestions?.length
        ? `\n**建議：**\n${result.suggestions.map((s: string) => `- ${s}`).join("\n")}`
        : ""

      const summary = `Spec 分析完成！${ambiguous}${missing}${suggestions}${
        !ambiguous && !missing ? "\n\n✅ 所有必填項目已填寫完成，可以 Submit 了。" : ""
      }`

      setChatMessages(prev => [...prev, { role: "ai", content: summary }])
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

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="flex">
        <PipelineSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30">C01</Badge>
                <h1 className="text-3xl font-bold">專案啟動與 Brief 對焦</h1>
              </div>
              <p className="text-muted-foreground">Project Kickoff & Brief Alignment</p>
            </div>

            <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>提醒：</strong>規格尺寸、交付日期、參考點為必填項目。確保一開始不要做錯。
              </AlertDescription>
            </Alert>

            {saveError && (
              <Alert className="mb-4 border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{saveError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ── Main Form ── */}
              <div className="lg:col-span-2 space-y-6">

                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>基本資訊 Basic Information</CardTitle>
                    <CardDescription>專案基礎設定與客戶資訊</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="project-name">專案名稱 *</Label>
                        <Input id="project-name" placeholder="輸入專案名稱" value={brief.project_name} onChange={setField("project_name")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client">客戶 *</Label>
                        <Input id="client" placeholder="客戶名稱" value={brief.client} onChange={setField("client")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="director">導演/創意總監</Label>
                        <Input id="director" placeholder="導演名稱" value={brief.director} onChange={setField("director")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supervisor">Supervisor</Label>
                        <Input id="supervisor" placeholder="負責 Supervisor" value={brief.supervisor} onChange={setField("supervisor")} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confidentiality">密等 Confidentiality</Label>
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
                      <Label htmlFor="selling-points">產品賣點/重點訊息</Label>
                      <Textarea id="selling-points" placeholder="客戶想強調的產品特色..." rows={2} value={brief.selling_points} onChange={setField("selling_points")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="keywords">情緒關鍵詞</Label>
                      <Input id="keywords" placeholder="例如：活潑、詭譎、溫暖、未來感..." value={brief.keywords} onChange={setField("keywords")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restrictions">禁忌事項</Label>
                      <Textarea id="restrictions" placeholder="不可出現的元素、顏色、風格..." rows={2} value={brief.restrictions} onChange={setField("restrictions")} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="style">風格關鍵字</Label>
                        <Input id="style" placeholder="寫實、插畫、賽博龐克..." value={brief.style} onChange={setField("style")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mood">色調/氛圍</Label>
                        <Input id="mood" placeholder="暖色調、冷色調、高對比..." value={brief.mood} onChange={setField("mood")} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="worldview">世界觀/概念</Label>
                      <Textarea id="worldview" placeholder="描述整體的視覺世界觀..." rows={2} value={brief.worldview} onChange={setField("worldview")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rhythm">節奏（若為影片）</Label>
                      <Select value={brief.rhythm} onValueChange={setSelectField("rhythm")}>
                        <SelectTrigger id="rhythm"><SelectValue placeholder="選擇節奏風格" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fast">快節奏 Fast-paced</SelectItem>
                          <SelectItem value="medium">中速 Medium</SelectItem>
                          <SelectItem value="slow">慢節奏 Slow/Cinematic</SelectItem>
                        </SelectContent>
                      </Select>
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

              {/* ── AI Chatbot Sidebar ── */}
              <div>
                <Card className="border-teal-500/30 flex flex-col sticky top-8" style={{ height: "calc(100vh - 220px)" }}>
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
                          <div ref={scrollRef} className="space-y-4 pr-2">
                            {chatMessages.map((msg, idx) => (
                              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className={msg.role === "ai" ? "bg-teal-500/10 text-teal-600" : "bg-primary/10"}>
                                    {msg.role === "ai" ? <Bot className="w-4 h-4" /> : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
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
                          </div>
                        </ScrollArea>
                        <div className="flex gap-2 shrink-0">
                          <Input
                            placeholder="輸入回覆..."
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
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