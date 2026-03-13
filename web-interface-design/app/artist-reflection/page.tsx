"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Lightbulb, FileText, ImageIcon, Bot, Send, ChevronRight, ChevronDown, ChevronUp,
  HelpCircle, MessageSquare, Sparkles, BookOpen, GripVertical, ArrowDown, ArrowUp,
  RefreshCw, Beaker, Trash2, Loader2,
} from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

// ── Types ────────────────────────────────────────────────────────
interface ChatMessage { role: "ai" | "user"; content: string; image?: string }
interface RefItem {
  id: string; title: string; note: string
  file_url?: string; thumbnail_url?: string; localPreview?: string
  is_pinned?: boolean; priority?: string; category?: string
}
interface BriefForm {
  project_name: string; client: string; director: string; supervisor: string
  confidentiality: string; selling_points: string; keywords: string
  restrictions: string; style: string; mood: string; worldview: string
  supervisor_spec: string
}

const EMPTY_BRIEF: BriefForm = {
  project_name: "", client: "", director: "", supervisor: "",
  confidentiality: "internal", selling_points: "", keywords: "",
  restrictions: "", style: "", mood: "", worldview: "", supervisor_spec: "",
}

// ── AutoGen API ──────────────────────────────────────────────────
async function apiCreativeAgent(message: string, brief: BriefForm, refs: RefItem[], history: ChatMessage[]) {
  const refContext = refs.map(r =>
    `[${r.title}] category:${r.category || ""} note:${r.note || "（無說明）"} pinned:${r.is_pinned}`
  ).join("\n")

  const res = await fetch(`${API}/suggestion/chat/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      project_id: "proj_001",
      brief_context: {
        ...brief,
        references_context: refContext,
      },
      history: history.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
      mode: "creative_exploration",
      system_hint: "你是 Creative Exploration Agent。根據 Supervisor Spec 和 Reference 分析，引導 Artist 深入思考創意決策。提出具體的追問和觀點，幫助 Artist 釐清執行方向。回應使用繁體中文。",
    }),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const data = await res.json()
  return data.reply as string
}

// ── Component ────────────────────────────────────────────────────
export default function ArtistReflectionPage() {
  const [hydrated, setHydrated] = useState(false)

  // ── Data from previous pages ──────────────────────────────────
  const [brief, setBrief] = useState<BriefForm>(EMPTY_BRIEF)
  const [refs, setRefs] = useState<RefItem[]>([])
  const [refsLoading, setRefsLoading] = useState(true)

  // ── UI state ──────────────────────────────────────────────────
  const [specsOpen, setSpecsOpen] = useState(true)
  const [refsOpen, setRefsOpen] = useState(true)
  const [reflectionNotes, setReflectionNotes] = useState("")
  const [agentInput, setAgentInput] = useState("")
  const [responseMode, setResponseMode] = useState<string | null>(null)
  const [pageSubmitted, setPageSubmitted] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState("")
  const scrollBottom = useRef<HTMLDivElement>(null)

  // ── Project questions (generated after brief+refs loaded) ─────
  const [projectQuestions, setProjectQuestions] = useState<{ id: string; text: string }[]>([])
  const [checkedQuestions, setCheckedQuestions] = useState<string[]>([])

  // ── Mind map nodes ────────────────────────────────────────────
  const [mindMapNodes, setMindMapNodes] = useState([
    { id: "n1", text: "光影方向確認", priority: 1, done: false },
    { id: "n2", text: "色溫範圍定義", priority: 2, done: false },
    { id: "n3", text: "材質歲月感處理", priority: 3, done: false },
    { id: "n4", text: "構圖方式選擇", priority: 4, done: false },
  ])

  // ── Agent chat ────────────────────────────────────────────────
  const [creativeAgentMessages, setCreativeAgentMessages] = useState<ChatMessage[]>([{
    role: "ai",
    content: "我是 Creative Exploration Agent。載入 Spec 與 Reference 後，我會根據其中觀察到的潛在張力和需要釐清的地方，為您準備 project-based 問題。\n\n請稍候...",
  }])

  // ── Restore brief from sessionStorage + fetch refs from API ──
  useEffect(() => {
    // Load brief from kickoff sessionStorage
    try {
      const saved = sessionStorage.getItem("kickoff_brief")
      if (saved) setBrief(JSON.parse(saved))
    } catch {}

    // Load refs from API
    fetch(`${API}/search/references?project_id=proj_001`)
      .then(r => r.json())
      .then((data: any[]) => {
        const valid = data.filter(r =>
          (r.file_url?.trim() || r.thumbnail_url?.trim())
        ).map(r => {
          const rawThumb = r.thumbnail_url || r.file_url || ""
          const thumb = rawThumb.startsWith("/") ? `${API}${rawThumb}` : rawThumb
          return { ...r, localPreview: thumb || undefined }
        })
        setRefs(valid)
      })
      .catch(() => setRefs([]))
      .finally(() => setRefsLoading(false))

    setHydrated(true)
  }, [])

  // ── After brief+refs loaded, generate project questions via AutoGen ──
  useEffect(() => {
    if (!hydrated || refsLoading) return
    const briefEmpty = !brief.selling_points && !brief.keywords && !brief.style
    const refsEmpty = refs.length === 0
    if (briefEmpty && refsEmpty) {
      setCreativeAgentMessages([{
        role: "ai",
        content: "尚未在 Kickoff 填寫 Spec，也沒有上傳 Reference。\n\n請先完成 C01 Brief/Spec 與 C02 Ref Hub，再回到這裡進行反思探索。",
      }])
      return
    }
    generateProjectQuestions(brief, refs)
  }, [hydrated, refsLoading])

  // Auto-scroll
  useEffect(() => {
    scrollBottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [creativeAgentMessages, agentLoading])

  // ── Generate project-based questions from AutoGen ─────────────
  const generateProjectQuestions = async (b: BriefForm, r: RefItem[]) => {
    setAgentLoading(true)
    try {
      const reply = await apiCreativeAgent(
        `根據以下 Supervisor Spec 和 References，生成 5-8 個最關鍵的 project-based 問題，這些問題應該揭示 Spec 與 Ref 之間潛在的張力、模糊地帶或需要 Artist 釐清的創意決策。
只回傳 JSON 格式：{"questions": ["問題1", "問題2", ...], "intro": "簡短介紹"}`,
        b, r, []
      )
      // Parse JSON from reply
      const match = reply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0])
        const qs = (parsed.questions || []).slice(0, 8).map((q: string, i: number) => ({
          id: `pq${i + 1}`, text: q
        }))
        setProjectQuestions(qs)
        const intro = parsed.intro || "根據 Spec + Reference 的分析，我為您準備了以下 project-based 問題。"
        setCreativeAgentMessages([{
          role: "ai",
          content: `${intro}\n\n這些問題基於您的 Spec 和 Reference 中觀察到的潛在張力與需要釐清的地方。\n\n請勾選感興趣的問題開始探索，或直接輸入您的想法。`,
        }])
      }
    } catch {
      setCreativeAgentMessages([{
        role: "ai",
        content: "我是 Creative Exploration Agent。根據您的 Spec 與 Reference，我會引導您深入思考創意決策。\n\n請直接輸入問題開始探索。",
      }])
    } finally {
      setAgentLoading(false)
    }
  }

  // ── Send message to AutoGen ───────────────────────────────────
  const handleAgentSend = useCallback(async (overrideMsg?: string) => {
    const raw = overrideMsg ?? agentInput
    if (!raw.trim() || agentLoading) return
    const modePrefix = responseMode && !overrideMsg ? `[${responseMode}] ` : ""
    const msg = modePrefix + raw.trim()
    const newHistory: ChatMessage[] = [...creativeAgentMessages, { role: "user", content: msg }]
    setCreativeAgentMessages(newHistory)
    if (!overrideMsg) setAgentInput("")
    setResponseMode(null)
    setAgentLoading(true)
    setAgentError("")
    try {
      const reply = await apiCreativeAgent(msg, brief, refs, newHistory)
      setCreativeAgentMessages(prev => [...prev, { role: "ai", content: reply }])
    } catch (e) {
      setAgentError(`連線失敗：${e}`)
      setCreativeAgentMessages(prev => [...prev, { role: "ai", content: `⚠️ 連線錯誤，請確認 backend 運作中。(${e})` }])
    } finally {
      setAgentLoading(false)
    }
  }, [agentInput, agentLoading, responseMode, creativeAgentMessages, brief, refs])

  // ── Check question → inject to chat ──────────────────────────
  const handleQuestionCheck = (questionId: string, checked: boolean) => {
    if (checked) {
      setCheckedQuestions(prev => [...prev, questionId])
      const q = projectQuestions.find(p => p.id === questionId)
      if (q) handleAgentSend(`[選擇問題] ${q.text}`)
    } else {
      setCheckedQuestions(prev => prev.filter(id => id !== questionId))
    }
  }

  // ── Inject spec/ref item to chat ─────────────────────────────
  const injectToChat = (text: string) => handleAgentSend(text)

  // ── Agent分析排序 ─────────────────────────────────────────────
  const handleAnalyzeOrder = () => {
    const orderText = mindMapNodes.map((n, i) => `${i + 1}. ${n.text}`).join("\n")
    handleAgentSend(`請分析並評估目前的工作流排序是否合理，並給出具體調整建議：\n${orderText}`)
  }

  // ── 我的理解筆記 Submit to Agent ─────────────────────────────
  const handleSubmitNotes = () => {
    if (!reflectionNotes.trim()) return
    handleAgentSend(`[我的理解筆記]\n${reflectionNotes}`)
  }

  // ── Mind map helpers ──────────────────────────────────────────
  const moveNode = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx > 0) {
      setMindMapNodes(prev => {
        const arr = [...prev]; [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]
        return arr.map((n, i) => ({ ...n, priority: i + 1 }))
      })
    }
    if (direction === "down" && idx < mindMapNodes.length - 1) {
      setMindMapNodes(prev => {
        const arr = [...prev]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
        return arr.map((n, i) => ({ ...n, priority: i + 1 }))
      })
    }
  }

  // ── Spec field display ────────────────────────────────────────
  const specFields = [
    { label: "賣點", value: brief.selling_points },
    { label: "關鍵詞", value: brief.keywords },
    { label: "風格", value: brief.style },
    { label: "氛圍", value: brief.mood },
    { label: "世界觀", value: brief.worldview },
    { label: "禁忌", value: brief.restrictions },
  ].filter(f => f.value?.trim())

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="flex">
        <PipelineSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">C03</Badge>
                <h1 className="text-3xl font-bold">Artist Spec + Ref Reflection</h1>
              </div>
              <p className="text-muted-foreground">使用者主導路徑 - 促進批判思考，不被系統帶著走</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Mind Map + Reflection Notes */}
              <div className="lg:col-span-3 space-y-4">
                <Card className="border-indigo-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <GripVertical className="w-4 h-4 text-indigo-600" />
                      Feedback 心智圖 / 工作流
                    </CardTitle>
                    <CardDescription className="text-xs">拖曳排序工作優先順序，自動歸納</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mindMapNodes.map((node, idx) => (
                        <div key={node.id} className="flex items-center gap-2 p-2.5 rounded-lg border transition-colors bg-card border-border hover:border-indigo-500/50">
                          <div className="flex flex-col gap-0.5">
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveNode(idx, "up")} disabled={idx === 0}>
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveNode(idx, "down")} disabled={idx === mindMapNodes.length - 1}>
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 shrink-0 w-6 justify-center">{node.priority}</Badge>
                          {editingNodeId === node.id ? (
                            <Input
                              autoFocus
                              value={node.text}
                              onChange={e => setMindMapNodes(prev => prev.map(n => n.id === node.id ? { ...n, text: e.target.value } : n))}
                              onBlur={() => setEditingNodeId(null)}
                              onKeyDown={e => { if (e.key === "Enter") setEditingNodeId(null) }}
                              className="text-xs h-6 flex-1"
                            />
                          ) : (
                            <span className="text-xs flex-1 cursor-text hover:text-indigo-600 transition-colors" onClick={() => setEditingNodeId(node.id)}>{node.text}</span>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-red-500"
                            onClick={() => setMindMapNodes(prev => prev.filter(n => n.id !== node.id).map((n, i) => ({ ...n, priority: i + 1 })))}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3 text-xs bg-transparent" onClick={() => {
                      setMindMapNodes(prev => [...prev, { id: `n${Date.now()}`, text: "新增項目...", priority: prev.length + 1, done: false }])
                    }}>+ 新增工作項</Button>
                    <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={handleAnalyzeOrder}>
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Agent分析排序
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-indigo-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      我的理解筆記
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={reflectionNotes}
                      onChange={e => setReflectionNotes(e.target.value)}
                      placeholder={"寫下理解...\n- 我覺得導演想要的是...\n- 「被背叛後的憤怒」我打算用...來表現"}
                      rows={8}
                      className="text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 bg-transparent" disabled={!reflectionNotes.trim()}>
                        <BookOpen className="w-3 h-3" />Save
                      </Button>
                      <Button size="sm" className="flex-1 text-xs gap-1" disabled={!reflectionNotes.trim() || agentLoading} onClick={handleSubmitNotes}>
                        <Send className="w-3 h-3" />Submit to Agent
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Center: Specs + References */}
              <div className="lg:col-span-5 space-y-4">
                {/* Supervisor Spec */}
                <Collapsible open={specsOpen} onOpenChange={setSpecsOpen}>
                  <Card className="border-teal-500/30 bg-teal-500/5">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-teal-600" />
                            <CardTitle className="text-base">Supervisor Spec & Intention</CardTitle>
                          </div>
                          {specsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-3 pt-0">
                        {!hydrated || (!brief.selling_points && !brief.keywords) ? (
                          <p className="text-xs text-muted-foreground italic py-2">
                            尚未填寫 Kickoff Spec。請先完成 C01 Brief/Spec。
                          </p>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground italic">點擊任何項目可自動加入 Agent 對話追問</p>
                            {specFields.map((item, idx) => (
                              <div key={idx}
                                className="p-2.5 bg-background rounded-lg border cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all"
                                onClick={() => injectToChat(`關於 Spec「${item.label}: ${item.value}」，請幫我深入分析這對執行方向的影響`)}>
                                <span className="text-[10px] text-muted-foreground uppercase">{item.label}</span>
                                <p className="text-sm mt-0.5">{item.value}</p>
                              </div>
                            ))}
                            {brief.supervisor_spec?.trim() && (
                              <div
                                className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/30 cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all"
                                onClick={() => injectToChat(`關於 Supervisor 額外說明：「${brief.supervisor_spec}」，我想了解更多`)}>
                                <span className="text-[10px] font-semibold text-teal-700">SUPERVISOR 額外說明</span>
                                <p className="text-sm whitespace-pre-line mt-1">{brief.supervisor_spec}</p>
                              </div>
                            )}
                            {brief.project_name && (
                              <div className="text-[10px] text-muted-foreground pt-1">
                                專案：{brief.project_name}{brief.client ? ` · ${brief.client}` : ""}
                                {brief.director ? ` · 導演：${brief.director}` : ""}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* References */}
                <Collapsible open={refsOpen} onOpenChange={setRefsOpen}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-indigo-600" />
                            <CardTitle className="text-base">References</CardTitle>
                            {!refsLoading && <Badge variant="secondary" className="text-xs">{refs.length}</Badge>}
                          </div>
                          {refsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-3 pt-0">
                        {refsLoading ? (
                          <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />載入 References...
                          </div>
                        ) : refs.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">
                            尚未上傳 Reference。請先完成 C02 Ref Hub。
                          </p>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground italic">點擊 Ref 可自動加入 Agent 對話追問</p>
                            <div className="grid grid-cols-2 gap-2">
                              {refs.map(ref => (
                                <div key={ref.id}
                                  className="rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all group"
                                  onClick={() => injectToChat(`關於 Reference「${ref.title}」${ref.note ? `（說明：${ref.note}）` : ""}，請分析這張 ref 的核心特質，以及與 Spec 的關係`)}>
                                  <div className="aspect-video bg-muted relative">
                                    {ref.localPreview ? (
                                      <img src={ref.localPreview} alt={ref.title}
                                        className="w-full h-full object-cover"
                                        onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                                    ) : null}
                                    {ref.is_pinned && (
                                      <Badge className="absolute top-1 left-1 text-[9px] bg-amber-500 text-white">Main Ref</Badge>
                                    )}
                                  </div>
                                  <div className="p-2">
                                    <p className="text-xs font-medium truncate group-hover:text-indigo-600">{ref.title}</p>
                                    {ref.note && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{ref.note}</p>}
                                    {ref.category && <Badge variant="outline" className="text-[9px] mt-1">{ref.category}</Badge>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Submit */}
                <div className="flex justify-end pt-2">
                  {!pageSubmitted ? (
                    <Button onClick={() => setPageSubmitted(true)} disabled={checkedQuestions.length === 0 && !reflectionNotes.trim()}>
                      Ready - Submit & Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Badge className="bg-green-500 text-white px-4 py-2">✓ 已提交 - 繼續至 C04</Badge>
                  )}
                </div>
              </div>

              {/* Right: Creative Agent Panel */}
              <div className="lg:col-span-4">
                <Card className="border-indigo-500/30 bg-indigo-500/5 flex flex-col sticky top-8" style={{ height: "calc(100vh - 200px)" }}>
                  <CardHeader className="pb-2 shrink-0">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Creative Exploration Agent
                    </CardTitle>
                    <CardDescription className="text-xs">主動引導思考探索。勾選感興趣的問題深入對話。</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
                    {/* Project-Based Questions */}
                    <Collapsible defaultOpen={false} className="border-b bg-indigo-500/5 shrink-0">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-medium">Project-Based 預設問題</span>
                            <Badge variant="secondary" className="text-[10px] h-4">{projectQuestions.length}</Badge>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{checkedQuestions.length} 已選</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent forceMount className="data-[state=closed]:hidden">
                        <div className="border-t" style={{ height: "200px" }}>
                          <ScrollArea className="h-full">
                            <div className="px-4 py-3 space-y-1.5 pr-6">
                              {projectQuestions.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">根據 Spec 與 Ref 生成中...</p>
                              ) : projectQuestions.map(q => (
                                <div key={q.id}
                                  className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer ${checkedQuestions.includes(q.id) ? "bg-indigo-500/10 border-indigo-500/30" : "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"}`}
                                  onClick={() => handleQuestionCheck(q.id, !checkedQuestions.includes(q.id))}>
                                  <Checkbox
                                    checked={checkedQuestions.includes(q.id)}
                                    onCheckedChange={checked => handleQuestionCheck(q.id, checked as boolean)}
                                    className="mt-0.5 shrink-0"
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <p className="text-[11px] leading-relaxed">{q.text}</p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Chat Messages */}
                    <ScrollArea className="flex-1 min-h-0 p-4">
                      <div className="space-y-4 pr-2">
                        {creativeAgentMessages.map((msg, idx) => (
                          <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback className={msg.role === "ai" ? "bg-indigo-500/10 text-indigo-600" : "bg-primary/10"}>
                                {msg.role === "ai" ? <Sparkles className="w-4 h-4" /> : "A"}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                              {msg.image && (
                                <div className="mb-2 rounded overflow-hidden">
                                  <img src={msg.image} alt="reference" className="w-full h-24 object-cover rounded" />
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-line">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        {agentLoading && (
                          <div className="flex gap-3">
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback className="bg-indigo-500/10 text-indigo-600">
                                <Sparkles className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="rounded-lg p-3 bg-muted flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                              <span className="text-sm text-muted-foreground">AI 思考中...</span>
                            </div>
                          </div>
                        )}
                        <div ref={scrollBottom} />
                      </div>
                    </ScrollArea>

                    {/* Input area */}
                    <div className="p-4 border-t space-y-3 shrink-0">
                      <div className="flex gap-2 flex-wrap">
                        {(["rephrase", "logic", "evidence"] as const).map(mode => (
                          <Button key={mode}
                            variant={responseMode === mode ? "default" : "outline"}
                            size="sm" className="text-xs gap-1 bg-transparent"
                            onClick={() => setResponseMode(responseMode === mode ? null : mode)}>
                            {mode === "rephrase" && <><RefreshCw className="w-3 h-3" />換句話說</>}
                            {mode === "logic" && <><Beaker className="w-3 h-3" />講邏輯</>}
                            {mode === "evidence" && <><Lightbulb className="w-3 h-3" />Evidence Binding</>}
                          </Button>
                        ))}
                      </div>
                      {responseMode && (
                        <div className="text-[10px] text-indigo-600 bg-indigo-500/10 rounded px-2 py-1">
                          模式：{responseMode === "rephrase" ? "換句話說" : responseMode === "logic" ? "講邏輯（物理現象/戲劇需求）" : "Evidence Binding（綁定畫面/Ref/Spec）"}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          placeholder="分享您的想法..."
                          value={agentInput}
                          onChange={e => setAgentInput(e.target.value)}
                          onKeyDown={e => e.stopPropagation()}
                          disabled={agentLoading}
                        />
                        <Button size="icon" onClick={() => handleAgentSend()} disabled={agentLoading || !agentInput.trim()}>
                          {agentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}