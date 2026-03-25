"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, Crown, Send, ArrowRight, Users, Bot, Sparkles, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, CheckCircle2, Loader2, ImageIcon, FileText } from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Link from "next/link"

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

type FeedbackItem = { id: string; text: string; source: string; priority: string; addressed: boolean; aiDraft?: string }
type ChatMsg = { role: string; content: string }

export default function GovernancePage() {
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: "ai", content: "您好！我是 Decision Loop 助手。已讀取 QA 的回饋清單與圖片資訊，可以協助您：\n1. 釐清多方意見衝突\n2. 綜合 QA 分析結果\n3. 協助起草最終回饋\n\n有什麼需要協助的嗎？" },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // ── Data from sessionStorage ──────────────────────────────────
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [artworkImage, setArtworkImage] = useState("")
  const [artworkName, setArtworkName] = useState("")
  const [refImage, setRefImage] = useState("")
  const [refName, setRefName] = useState("")
  const [artistNote, setArtistNote] = useState("")
  const [reflectionNote, setReflectionNote] = useState("")
  const [supervisorSpec, setSupervisorSpec] = useState("")
  const [allRefsContext, setAllRefsContext] = useState<any[]>([])

  // ── Synthesis state ───────────────────────────────────────────
  const [supervisorFeedback, setSupervisorFeedback] = useState("")
  const [aiFeedback, setAiFeedback] = useState("")
  const [clientFeedback, setClientFeedback] = useState("")
  const [finalAuthority, setFinalAuthority] = useState("")
  const [synthText, setSynthText] = useState("")

  useEffect(() => {
    // Load QA feedback from c04_analysis
    let items: FeedbackItem[] = []
    try {
      const raw = SS.get("c04_analysis")
      if (raw) {
        const a = JSON.parse(raw)
        if (Array.isArray(a.metrics) && a.metrics.length > 0) {
          items = a.metrics.map((m: any) => ({
            id: "c04-" + (m.id || m.name),
            text: "[" + m.name + "] " + (m.agentA?.opinion || m.summary || ""),
            source: "AI",
            priority: m.status === "red" ? "P0" : m.status === "yellow" ? "P1" : "P2",
            addressed: false,
            aiDraft: m.suggestions?.join("；") || m.agentB?.opinion || "",
          }))
          // Pre-fill AI feedback field
          const issues = a.metrics
            .filter((m: any) => m.status !== "green")
            .map((m: any) => `${m.name}：${m.agentA?.opinion || m.summary || ""}`)
          if (issues.length > 0) setAiFeedback(issues.join("\n"))
        }
      }
    } catch {}

    // Merge compare delta list
    try {
      const raw = SS.get("compare_delta_list")
      if (raw) {
        const deltas = JSON.parse(raw)
        if (Array.isArray(deltas)) {
          const existingIds = new Set(items.map(f => f.id))
          const newItems = deltas
            .filter((d: any) => !existingIds.has("delta-" + (d.id || d.metric)))
            .map((d: any) => ({
              id: "delta-" + (d.id || d.metric),
              text: "[" + (d.metric || d.name) + "] " + (d.gap || d.summary || ""),
              source: "AI",
              priority: d.severity === "high" ? "P0" : d.severity === "medium" ? "P1" : "P2",
              addressed: false,
              aiDraft: d.suggestion || d.fix || "",
            }))
          items = [...items, ...newItems]
        }
      }
    } catch {}
    setFeedbackItems(items)

    // Pre-fill synthText from last QA chat AI message
    try {
      const raw = SS.get("qa_chat")
      if (raw) {
        const msgs = JSON.parse(raw)
        const lastAI = [...msgs].reverse().find((m: any) => m.role === "ai")
        if (lastAI?.content) setSynthText(lastAI.content.slice(0, 400))
      }
    } catch {}

    // Load artwork image
    try {
      const aw = SS.get("c04_artwork_previews")
      if (aw) {
        const parsed = JSON.parse(aw)
        if (parsed.length > 0) { setArtworkImage(parsed[0].preview || ""); setArtworkName(parsed[0].name || "") }
      }
    } catch {}

    // Load refs
    try {
      const refs: any[] = []
      const hr = SS.get("refhub_refs")
      const cp = SS.get("c04_ref_previews")
      if (hr) {
        JSON.parse(hr).forEach((r: any) => {
          refs.push({ id: r.id, title: r.title || r.id, preview: r.preview || r.file_url || "", category: r.category || "", note: r.note || "", is_pinned: r.is_pinned, priority: r.priority })
        })
      }
      if (cp) {
        JSON.parse(cp).forEach((r: any) => {
          const idx = refs.findIndex(x => x.id === r.id || x.title?.toLowerCase() === (r.title || "").toLowerCase())
          if (idx >= 0 && r.preview?.startsWith("data:")) refs[idx].preview = r.preview
          else if (idx < 0 && r.preview?.startsWith("data:")) refs.push({ id: r.id, title: r.title || r.id, preview: r.preview, category: r.category || "", note: r.note || "" })
        })
      }
      setAllRefsContext(refs)
      const mainRef = refs.find(r => r.is_pinned || r.priority === "main" || r.priority === "Main") || refs[0]
      if (mainRef) { setRefImage(mainRef.preview || ""); setRefName(mainRef.title || "") }
    } catch {}

    try { setArtistNote(SS.get("reflection_notes") || "") } catch {}
    try { setReflectionNote(SS.get("c04_notes") || "") } catch {}
    try { const b = JSON.parse(SS.get("kickoff_brief") || "{}"); setSupervisorSpec(b.supervisor_spec || "") } catch {}

    // Restore draft
    try {
      const draft = SS.get("governance_draft")
      if (draft) {
        const d = JSON.parse(draft)
        if (d.supervisorFeedback) setSupervisorFeedback(d.supervisorFeedback)
        if (d.clientFeedback) setClientFeedback(d.clientFeedback)
        if (d.finalAuthority) setFinalAuthority(d.finalAuthority)
        if (d.synthText) setSynthText(d.synthText)
      }
    } catch {}
  }, [])

  useEffect(() => { chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chatMessages])

  const saveDraft = () => {
    SS.set("governance_draft", JSON.stringify({ supervisorFeedback, clientFeedback, finalAuthority, synthText }))
  }

  // ── Real agent call with vision ───────────────────────────────
  const callAgent = useCallback(async (msg: string) => {
    setChatLoading(true)

    const context = [
      artworkName ? `作品：${artworkName}` : "",
      refName ? `Reference：${refName}` : "",
      artistNote?.trim() ? `理解筆記：\n${artistNote.trim()}` : "",
      reflectionNote?.trim() ? `創作反思筆記：\n${reflectionNote.trim()}` : "",
      supervisorSpec?.trim() ? `Supervisor Spec：\n${supervisorSpec.trim()}` : "",
      supervisorFeedback?.trim() ? `Supervisor 意見：\n${supervisorFeedback.trim()}` : "",
      clientFeedback?.trim() ? `Client 意見：\n${clientFeedback.trim()}` : "",
      feedbackItems.length > 0
        ? `QA 回饋清單（請根據此清單給出具體改進建議）：\n${feedbackItems.map(f => `[${f.priority}] ${f.text}`).join("\n")}`
        : "（目前無 QA 回饋資料，請根據用戶問題給出 VFX 顧問建議）",
    ].filter(Boolean).join("\n\n")

    const history = chatMessages.slice(-6).map(m => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }))

    // Try governance endpoint first, fallback to analysis
    const endpoints = [
      `${API}/suggestion/chat/governance`,
      `${API}/suggestion/chat/analysis`,
    ]

    let replied = false
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: PROJECT_ID,
            message: msg,
            context,
            all_refs_context: allRefsContext,
            history,
          }),
        })
        if (!res.ok) continue
        const data = await res.json()
        const reply = data.response || data.reply || ""
        if (reply.trim()) {
          setChatMessages(p => [...p, { role: "ai", content: stripMd(reply) }])
          replied = true
          break
        }
      } catch {
        // network error → try next endpoint
      }
    }

    if (!replied) {
      setChatMessages(p => [...p, { role: "ai", content: "連線失敗，請確認後端是否啟動（http://127.0.0.1:5000）。" }])
    }

    setChatLoading(false)
  }, [chatMessages, artworkName, refName, artistNote, reflectionNote, supervisorSpec, supervisorFeedback, clientFeedback, feedbackItems, allRefsContext])

  const handleChatSend = () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatMessages(p => [...p, { role: "user", content: msg }])
    setChatInput("")
    callAgent(msg)
  }

  const handleSendQAToChat = () => {
    if (feedbackItems.length === 0) return
    const summary = `請根據以下 QA 回饋清單，給出最終綜合建議，幫助導演做出裁決：\n${feedbackItems.map(f => `[${f.priority}] ${f.text}`).join("\n")}`
    setChatMessages(p => [...p, { role: "user", content: "[QA 回饋匯入 — 請綜合分析]" }])
    callAgent(summary)
  }

  const p0 = feedbackItems.filter(f => f.priority === "P0")
  const p1 = feedbackItems.filter(f => f.priority === "P1")
  const p2 = feedbackItems.filter(f => f.priority === "P2")

  const priColor = (p: string) =>
    p === "P0" ? "bg-red-500/10 text-red-600 border-red-500/30" :
    p === "P1" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" :
    "bg-green-500/10 text-green-600 border-green-500/30"

  const visionCount = allRefsContext.filter(r => r.preview?.startsWith("data:")).length

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="flex h-[calc(100vh-57px)]">
        <PipelineSidebar />

        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {/* Header — compact */}
          <div className="border-b border-border bg-card px-6 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                <Shield className="w-4 h-4" />
              </div>
              <Badge variant="outline" className="text-xs">C07</Badge>
              <h1 className="text-lg font-bold">Decision Loop</h1>
            </div>
          </div>

          {/* 3-column layout filling remaining height */}
          <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">

            {/* ── Col 1: QA Feedback inherited ──────────────── */}
            <div className="col-span-3 border-r border-border flex flex-col min-h-0">
              <div className="px-4 py-2.5 border-b border-border shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold">QA 回饋清單</span>
                </div>
                <div className="flex items-center gap-1">
                  {p0.length > 0 && <Badge className="text-[10px] h-4 px-1.5 bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/10">{p0.length} P0</Badge>}
                  {p1.length > 0 && <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/10">{p1.length} P1</Badge>}
                </div>
              </div>

              {/* Artwork + Ref thumbnails */}
              {(artworkImage || refImage) && (
                <div className="px-3 pt-2.5 pb-2 grid grid-cols-2 gap-2 shrink-0 border-b border-border">
                  {artworkImage && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 truncate">{artworkName || "作品"}</p>
                      <div className="aspect-video rounded border overflow-hidden bg-muted">
                        <img src={artworkImage} alt="artwork" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                  {refImage && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 truncate">{refName || "Reference"}</p>
                      <div className="aspect-video rounded border overflow-hidden bg-muted">
                        <img src={refImage} alt="ref" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <ScrollArea className="flex-1 min-h-0">
                <div className="px-3 py-2.5 space-y-1.5">
                  {feedbackItems.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-10">
                      尚無 QA 回饋資料<br />請先完成 QA 分析
                    </div>
                  ) : feedbackItems.map(f => (
                    <div key={f.id} className={`px-2.5 py-2 rounded-lg border text-xs ${priColor(f.priority)}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {f.priority === "P0" ? <AlertCircle className="w-3 h-3 shrink-0" /> :
                         f.priority === "P1" ? <AlertTriangle className="w-3 h-3 shrink-0" /> :
                         <CheckCircle2 className="w-3 h-3 shrink-0" />}
                        <span className="font-semibold">{f.priority}</span>
                        <span className="text-[10px] opacity-60">{f.source}</span>
                      </div>
                      <p className="text-foreground/80 leading-relaxed">{f.text}</p>
                      {f.aiDraft && <p className="mt-1 text-[10px] opacity-60 border-t border-current/10 pt-1 line-clamp-2">{f.aiDraft}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {feedbackItems.length > 0 && (
                <div className="px-3 pb-3 shrink-0">
                  <Button size="sm" variant="outline" className="w-full text-xs h-7 bg-transparent gap-1.5" onClick={handleSendQAToChat}>
                    <Sparkles className="w-3 h-3" />送入 AI 助手綜合分析
                  </Button>
                </div>
              )}
            </div>

            {/* ── Col 2: Final Synthesis ─────────────────────── */}
            <div className="col-span-5 border-r border-border flex flex-col min-h-0 overflow-y-auto">
              <div className="p-4 space-y-3">

                {/* QA summary stats */}
                {feedbackItems.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: "P0 緊急", count: p0.length, cls: "bg-red-500/5 border-red-500/20 text-red-500" },
                      { label: "P1 重要", count: p1.length, cls: "bg-amber-500/5 border-amber-500/20 text-amber-500" },
                      { label: "P2 建議", count: p2.length, cls: "bg-green-500/5 border-green-500/20 text-green-500" }
                    ].map(s => (
                      <div key={s.label} className={`p-2 rounded-lg border text-center ${s.cls}`}>
                        <p className="text-xl font-bold">{s.count}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Main synthesis card */}
                <Card className="border-teal-500/30 bg-teal-500/5">
                  <CardHeader className="px-4 pt-3 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      最終回饋綜合 Final Feedback Synthesis
                    </CardTitle>
                    <CardDescription className="text-xs">三方意見匯整，由決策者作最終裁決後送出</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">

                    {/* Three-source inputs */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: <Crown className="w-3 h-3 text-amber-500" />, label: "Supervisor", val: supervisorFeedback, set: setSupervisorFeedback, ph: "Supervisor 意見..." },
                        { icon: <Bot className="w-3 h-3 text-teal-500" />, label: "AI 分析", val: aiFeedback, set: setAiFeedback, ph: "AI 分析（自動匯入）", muted: true },
                        { icon: <Users className="w-3 h-3 text-purple-500" />, label: "Client", val: clientFeedback, set: setClientFeedback, ph: "Client 意見..." },
                      ].map(col => (
                        <div key={col.label} className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {col.icon}
                            <span className="text-xs font-medium">{col.label}</span>
                          </div>
                          <Textarea
                            placeholder={col.ph}
                            className={`text-xs min-h-[80px] resize-none ${col.muted ? "bg-muted/40" : ""}`}
                            value={col.val}
                            onChange={e => col.set(e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Final authority selector */}
                    <div className="flex items-center gap-3 py-1 border-t border-teal-500/20">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <Label className="text-xs font-medium">最終決策者</Label>
                      </div>
                      <Select value={finalAuthority} onValueChange={setFinalAuthority}>
                        <SelectTrigger className="h-7 text-xs w-36">
                          <SelectValue placeholder="選擇決策者" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Supervisor", "Art Director", "Director", "Client", "PM"].map(v => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {finalAuthority && (
                        <span className="text-xs text-muted-foreground">由 <strong className="text-foreground">{finalAuthority}</strong> 最終裁決</span>
                      )}
                    </div>

                    {/* Synthesis textarea */}
                    <div className="space-y-1">
                      <Label className="text-xs">綜合最終回饋（決策者編輯後送出）</Label>
                      <Textarea
                        placeholder="根據以上意見，綜合出給 Artist 的最終回饋..."
                        className="min-h-[110px] text-sm resize-none"
                        value={synthText}
                        onChange={e => setSynthText(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-teal-500/20 pt-2">
                      <p className="text-xs text-muted-foreground">送出後，Artist 將收到此回饋</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" onClick={saveDraft}>儲存草稿</Button>
                        <Link href="/upload-analyze">
                          <Button size="sm" className="h-7 text-xs gap-1">
                            <Send className="w-3 h-3" />送出給 Artist<ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>

            {/* ── Col 3: AI Chatbot ──────────────────────────── */}
            <div className="col-span-4 flex flex-col min-h-0">
              <Collapsible open={chatbotOpen} onOpenChange={setChatbotOpen} className="flex flex-col flex-1 min-h-0">
                <CollapsibleTrigger asChild>
                  <div className="px-4 py-2.5 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-teal-600" />
                      <div>
                        <p className="text-xs font-semibold">AI Decision 助手</p>
                        <p className="text-[10px] text-muted-foreground">
                          {visionCount > 0 ? `Vision 已讀取 ${visionCount} 張圖片` : "AI Clarification Chatbot"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {visionCount > 0 && (
                        <Badge className="text-[10px] h-4 px-1.5 bg-teal-500/10 text-teal-600 border border-teal-500/30 hover:bg-teal-500/10">
                          <ImageIcon className="w-2.5 h-2.5 mr-0.5" />Vision
                        </Badge>
                      )}
                      {chatbotOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="flex-1 min-h-0 flex flex-col">
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 space-y-3">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarFallback className={`text-[10px] ${msg.role === "ai" ? "bg-teal-500/10 text-teal-600" : "bg-primary/10"}`}>
                              {msg.role === "ai" ? <Bot className="w-3 h-3" /> : "D"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg px-3 py-2 max-w-[86%] text-xs leading-relaxed ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                            <p className="whitespace-pre-line">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex gap-2">
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarFallback className="bg-teal-500/10 text-teal-600"><Bot className="w-3 h-3" /></AvatarFallback>
                          </Avatar>
                          <div className="rounded-lg px-3 py-2 bg-muted flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
                            <span className="text-xs text-muted-foreground">思考中...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatScrollRef} />
                    </div>
                  </ScrollArea>

                  {/* Quick actions */}
                  <div className="px-3 py-2 border-t border-border flex flex-wrap gap-1 shrink-0">
                    {[
                      { label: "綜合 QA", prompt: "請根據目前的 QA 回饋清單，幫我整合出最重要的 3 個修改方向，附上具體數值建議。" },
                      { label: "釐清衝突", prompt: "目前三方意見有什麼關鍵衝突點？如何在尊重 Spec 的前提下達成共識？" },
                      { label: "起草回饋", prompt: "請根據 QA 分析與三方意見，起草一份給 Artist 的最終修改指示，條列格式，附具體數值。" },
                      { label: "分析圖片", prompt: "請直接描述目前作品圖片與 Reference 圖片的視覺差距，從光影、色溫、構圖三個維度具體說明。" },
                    ].map(q => (
                      <Button key={q.label} variant="outline" size="sm"
                        className="text-[10px] h-6 px-2 bg-transparent"
                        onClick={() => { setChatMessages(p => [...p, { role: "user", content: q.label }]); callAgent(q.prompt) }}>
                        {q.label}
                      </Button>
                    ))}
                  </div>

                  <div className="px-3 pb-3 flex gap-2 shrink-0">
                    <Input
                      placeholder="輸入問題..."
                      className="text-xs h-8"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleChatSend() }}
                    />
                    <Button size="icon" className="w-8 h-8 shrink-0" onClick={handleChatSend} disabled={chatLoading}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}