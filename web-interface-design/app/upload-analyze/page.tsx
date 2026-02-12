"use client"

import React, { Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Upload, Sparkles, AlertTriangle, CheckCircle2, Info, HelpCircle, ChevronRight,
  ChevronDown, ChevronUp, Pin, Plus, RefreshCw, AlertCircle, Bot, Users, ArrowRight, Send, BookOpen,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

function UploadAnalyzeContent() {
  const [checkedMetrics, setCheckedMetrics] = useState<string[]>([])
  const [showMetricDetailDialog, setShowMetricDetailDialog] = useState(false)
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<typeof c04Metrics[0] | null>(null)
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([
    { role: "ai", content: "您好！我是 AI 分析助手。\n\n上傳作品後我會：\n1. 對照參考圖分析差距\n2. 檢測技術品質問題\n\n勾選 Metrics 後，我會自動針對該項目提供追問和建議。" },
  ])
  const [chatInput, setChatInput] = useState("")
  const [reflectionNotes, setReflectionNotes] = useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [noteSubmitted, setNoteSubmitted] = useState(false)
  const [jumpSubmitted, setJumpSubmitted] = useState(false)

  const handleChatSend = () => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [...prev, { role: "user", content: chatInput }])
    setChatInput("")
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: "ai", 
        content: "了解！根據您的說明，我會調整分析策略：\n\n- 將跳過尚未完成的區域\n- 重點分析您提到的構圖問題\n\n需要更詳細說明嗎？" 
      }])
    }, 1000)
  }

  const c04Metrics = [
    { id: "composition", name: "構圖", status: "red", agents: ["Composition_J", "Composition_K"], consensus: false, refBasis: "Reference #2", supervisorNote: "建議參考導演偏好的非對稱構圖風格" },
    { id: "lighting", name: "光影", status: "yellow", agents: ["Light_J", "Light_K"], consensus: true, refBasis: "Reference #1", supervisorNote: "補光強度需微調" },
    { id: "color", name: "色彩", status: "green", agents: ["Color_J", "Color_K"], consensus: true, refBasis: "Spec: warm & cozy", supervisorNote: null },
    { id: "texture", name: "材質", status: "green", agents: ["Texture_J", "Texture_K"], consensus: true, refBasis: "Reference #3", supervisorNote: null },
    { id: "motion", name: "動態", status: "yellow", agents: ["Motion_J", "Motion_K"], consensus: false, refBasis: "Spec", supervisorNote: "模糊程度需與導演確認" },
    { id: "depth", name: "景深", status: "green", agents: ["Depth_J", "Depth_K"], consensus: true, refBasis: "Spec", supervisorNote: null },
    { id: "exposure", name: "曝光", status: "red", agents: ["Exposure_J", "Exposure_K"], consensus: true, refBasis: "Reference #1", supervisorNote: "必須優先修正" },
    { id: "style", name: "風格一致", status: "green", agents: ["Style_J", "Style_K"], consensus: true, refBasis: "Spec", supervisorNote: null },
  ]

  const specs_mentioned_c04 = ["composition", "lighting", "color", "exposure"]
  const isMetricMentionedC04 = (metricId: string) => specs_mentioned_c04.includes(metricId)

  const c04MetricDetails: Record<string, { analysis: string; suggestions: string[]; agentOpinions: { agent: string; opinion: string; confidence: number }[]; debate?: { agentA: {name: string; opinion: string; severity: string}; agentB: {name: string; opinion: string; severity: string}; consensus: string } }> = {
    composition: { analysis: "主體位置偏離三分法則約 15%，整體構圖重心偏左。", suggestions: ["將主體向右移動 10-15%", "調整畫面留白比例", "參考 Reference #2 的構圖方式"], agentOpinions: [{ agent: "Composition_J", opinion: "嚴格來說不符合三分法則", confidence: 85 }, { agent: "Composition_K", opinion: "動態構圖可接受，但邊緣案例", confidence: 72 }], debate: { agentA: { name: "Composition_J", opinion: "主體偏左", severity: "high" }, agentB: { name: "Composition_K", opinion: "符合動態構圖原則", severity: "medium" }, consensus: "分歧：是否嚴格遵循三分法" } },
    lighting: { analysis: "主光源方向正確，但補光強度不足。", suggestions: ["增加左側補光 20%", "色溫調至 4800K"], agentOpinions: [{ agent: "Light_J", opinion: "補光需加強", confidence: 88 }, { agent: "Light_K", opinion: "同意，色溫較輕微", confidence: 82 }] },
    exposure: { analysis: "高光區域過曝，clipping 約 8%。", suggestions: ["降低曝光 0.5 stops", "漸層濾鏡壓暗天空"], agentOpinions: [{ agent: "Exposure_J", opinion: "明顯過曝", confidence: 95 }, { agent: "Exposure_K", opinion: "高光細節損失", confidence: 93 }] },
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "red": return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "yellow": return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case "green": return <CheckCircle2 className="w-4 h-4 text-green-500" />
      default: return null
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case "red": return "bg-red-500/10 border-red-500/30"
      case "yellow": return "bg-amber-500/10 border-amber-500/30"
      case "green": return "bg-green-500/10 border-green-500/30"
      default: return ""
    }
  }

  // When metric is checked, inject into chat
  const handleMetricCheck = (metricId: string, checked: boolean) => {
    if (checked) {
      setCheckedMetrics(prev => [...prev, metricId])
      const metric = c04Metrics.find(m => m.id === metricId)
      if (metric) {
        setChatMessages(prev => [...prev, {
          role: "user",
          content: `[勾選 Metric] ${metric.name} (${metric.status === "red" ? "紅燈" : metric.status === "yellow" ? "黃燈" : "綠燈"}) - ${metric.refBasis}`
        }])
        setTimeout(() => {
          const detail = c04MetricDetails[metricId]
          const response = detail
            ? `關於 ${metric.name}：\n\n${detail.analysis}\n\n建議：\n${detail.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n需要更詳細說明嗎？`
            : `${metric.name} 目前狀態為${metric.status === "green" ? "通過" : "需要關注"}。\n\n基準：${metric.refBasis}\n\n是否需要更詳細的分析？`
          setChatMessages(prev => [...prev, { role: "ai", content: response }])
        }, 600)
      }
    } else {
      setCheckedMetrics(prev => prev.filter(id => id !== metricId))
    }
  }

  const analysisResults = [
    { issue_id: "issue_001", type: "lighting", severity: "P0", title: "光影方向不符主參考", summary: "主光源從左上照射，但參考圖為右側硬光", recommended_edit: { action: "調整主光源至右側 90 度", rationale: "對齊主參考光影語彙", acceptance_criteria: "主角臉部右側高光明確", estimated_cost: "mid" } },
    { issue_id: "issue_002", type: "composition", severity: "P1", title: "構圖重心偏移", summary: "主體位置在畫面 60% 處", recommended_edit: { action: "主角向左移動 80px", rationale: "符合導演畫面平衡感要求", acceptance_criteria: "主體中心位於左側 1/3", estimated_cost: "low" } },
    { issue_id: "issue_003", type: "color", severity: "P2", title: "色溫過冷", summary: "整體 6500K，導演要求暖調 4500-5000K", recommended_edit: { action: "全局色溫 -1500K", rationale: "對齊 warm/cozy", acceptance_criteria: "畫面呈暖黃調性", estimated_cost: "low" } },
  ]

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="flex">
        <PipelineSidebar />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-6">
            {/* Header with Analyze button */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>Chronos Legacy</span><ChevronRight className="w-4 h-4" /><span>SEQ_A</span><ChevronRight className="w-4 h-4" /><span>Shot_005</span><ChevronRight className="w-4 h-4" /><Badge variant="outline">WIP</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary">C04</Badge>
                  <h1 className="text-2xl font-bold">上傳與 AI 分析</h1>
                </div>
                <Button size="lg"><Sparkles className="w-4 h-4 mr-2" />開始分析 Analyze</Button>
              </div>
            </div>

            {/* 3-Column: Left (upload), Center (results+metrics), Right (chat) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column - Upload + Notes */}
              <div className="lg:col-span-3 space-y-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" />上傳創作檔案</CardTitle></CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">拖拉檔案或點擊上傳</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, MP4, MOV, EXR</p>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*,.exr" multiple className="hidden" onChange={(e) => { /* handle file upload */ }} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><HelpCircle className="w-4 h-4" />版本與備註</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="text-sm"><span className="font-medium">版本：</span><Badge variant="secondary" className="ml-2">v04</Badge></div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Artist 備註</Label>
                      <Textarea placeholder="例如：這是草稿..." rows={2} className="text-sm" />
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">草稿階段</Badge>
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">只看構圖</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><Pin className="w-4 h-4" />Main References</CardTitle>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Add</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea style={{ maxHeight: '200px' }}>
                      <div className="grid grid-cols-3 gap-2 px-6 pb-4">
                        <div className="relative aspect-square bg-muted rounded-lg border-2 border-primary overflow-hidden">
                          <img src="/reference-movie-frame.jpg" alt="Main ref 1" className="w-full h-full object-cover" />
                          <Badge className="absolute bottom-1 left-1 text-[10px] h-5" variant="secondary">Lighting</Badge>
                        </div>
                        <div className="relative aspect-square bg-muted rounded-lg border-2 border-primary overflow-hidden">
                          <img src="/composition-reference.jpg" alt="Main ref 2" className="w-full h-full object-cover" />
                          <Badge className="absolute bottom-1 left-1 text-[10px] h-5" variant="secondary">Composition</Badge>
                        </div>
                        <div className="aspect-square bg-muted/50 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                          <Plus className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Center Column - Analysis Results + Multi-Agent Metrics */}
              <div className="lg:col-span-5 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4" />分析結果 - Spec + Reference 總評</CardTitle>
                      <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent"><RefreshCw className="w-3 h-3 mr-1" />Re-analyze</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-2">
                      <div className="space-y-3">
                        {analysisResults.map((result) => (
                          <Card key={result.issue_id} className="border-l-4" style={{ borderLeftColor: result.severity === "P0" ? "rgb(239 68 68)" : result.severity === "P1" ? "rgb(251 146 60)" : "rgb(59 130 246)" }}>
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2 flex-1">
                                  {result.severity === "P0" && <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                                  {result.severity === "P1" && <Info className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />}
                                  {result.severity === "P2" && <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <CardTitle className="text-sm">{result.title}</CardTitle>
                                      <Badge variant="outline" className="text-[10px] h-5">{result.type}</Badge>
                                    </div>
                                    <CardDescription className="text-xs">{result.summary}</CardDescription>
                                  </div>
                                </div>
                                <Badge variant={result.severity === "P0" ? "destructive" : "secondary"} className="text-xs">{result.severity}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="bg-primary/5 rounded-lg p-2.5 space-y-1">
                                <Label className="text-xs font-semibold flex items-center gap-1"><ArrowRight className="w-3 h-3" />Actionable Edit</Label>
                                <p className="text-xs"><strong>Action:</strong> {result.recommended_edit.action}</p>
                                <p className="text-xs"><strong>Rationale:</strong> {result.recommended_edit.rationale}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Multi-Agent Metrics Review */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">Overall AI Feedback</CardTitle>
                          <CardDescription className="text-xs">勾選 Metric 會自動送入 AI 對話框追問</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm shrink-0">
                        <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3 h-3" />{c04Metrics.filter(m => m.status === "red").length}</span>
                        <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="w-3 h-3" />{c04Metrics.filter(m => m.status === "yellow").length}</span>
                        <span className="flex items-center gap-1 text-green-500"><CheckCircle2 className="w-3 h-3" />{c04Metrics.filter(m => m.status === "green").length}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea style={{ height: '280px' }}>
                      <div className="space-y-2 px-6 pb-4">
                        {c04Metrics.map((metric) => {
                          const mentioned = isMetricMentionedC04(metric.id)
                          return (
                            <div key={metric.id} className={`p-2 rounded-lg transition-all ${getStatusBg(metric.status)} ${mentioned ? "border-2" : "border border-dashed"}`}>
                              <div className="flex items-center gap-2">
                                <Checkbox id={`c04-metric-${metric.id}`} checked={checkedMetrics.includes(metric.id)} onCheckedChange={(checked) => handleMetricCheck(metric.id, checked as boolean)} className="shrink-0" />
                                <div className="flex items-center justify-between flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedMetricDetail(metric); setShowMetricDetailDialog(true) }}>
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="shrink-0">{getStatusIcon(metric.status)}</div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-sm truncate">{metric.name}</p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <Badge variant="outline" className="text-[9px] h-3.5 shrink-0 truncate max-w-[100px]">{metric.refBasis}</Badge>
                                        {mentioned && <Badge variant="outline" className="text-[9px] h-3.5 bg-teal-500/10 text-teal-600 border-teal-500/30 shrink-0">Specs</Badge>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-1">
                                    {!metric.consensus && <Badge variant="outline" className="text-[9px] h-3.5 bg-amber-500/10 text-amber-600">分歧</Badge>}
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* My Creation Reflection Notes */}
                <Card className="border-indigo-500/30 bg-indigo-500/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      <div>
                        <CardTitle className="text-base">{"我的創作反思筆記"}</CardTitle>
                        <CardDescription className="text-xs">{"記錄創作意圖與反思，提交後 Supervisor 可在 Review 頁面查看"}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={reflectionNotes}
                      onChange={(e) => setReflectionNotes(e.target.value)}
                      placeholder={"寫下創作反思...\n- 我選擇這個光影方向是因為...\n- 色溫偏暖的理由是...\n- 構圖上我的考量是..."}
                      rows={5}
                      className="text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 bg-transparent" disabled={!reflectionNotes.trim()}>
                        <BookOpen className="w-3 h-3" />
                        Save
                      </Button>
                      <Button size="sm" className={`flex-1 text-xs gap-1 ${noteSubmitted ? "bg-green-600 hover:bg-green-700 text-white" : ""}`} disabled={!reflectionNotes.trim()} onClick={() => {
                        if (reflectionNotes.trim()) {
                          setChatMessages(prev => [...prev, { role: "user", content: `[創作反思筆記] ${reflectionNotes}` }])
                          setNoteSubmitted(true)
                          setTimeout(() => {
                            setChatMessages(prev => [...prev, { role: "ai", content: `收到您的創作反思筆記！\n\n我注意到幾個重點：\n- 共提及 ${reflectionNotes.split('\n').filter(l => l.trim()).length} 個觀點\n- 建議針對模糊的部分進一步釐清\n\n需要我幫您檢視邏輯一致性嗎？` }])
                          }, 800)
                        }
                      }}>
                        <Send className="w-3 h-3" />
                        {noteSubmitted ? "Submitted" : "Submit to Agent"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Jump Button */}
                <div className="flex items-center justify-end pt-2">
                  <Button size="lg" className={`text-base px-8 py-6 ${jumpSubmitted ? "bg-green-600 hover:bg-green-700 text-white" : ""}`} onClick={() => setJumpSubmitted(true)} asChild>
                    <a href="/compare">{jumpSubmitted ? "Submitted" : "Jump to Reference Compare"}<ChevronRight className="w-5 h-5 ml-2" /></a>
                  </Button>
                </div>
              </div>

              {/* Right Column - AI Chat (aligned with other columns) */}
              <div className="lg:col-span-4">
                <Card className="border-teal-500/30 flex flex-col sticky top-8" style={{ height: 'calc(100vh - 200px)' }}>
                  <Collapsible open={chatbotOpen} onOpenChange={setChatbotOpen} className="flex flex-col flex-1 min-h-0">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-teal-600" />
                            <div>
                              <CardTitle className="text-base">AI 分析助手</CardTitle>
                              <CardDescription className="text-xs">勾選 Metrics 自動追問</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">{chatMessages.length}</Badge>
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
                              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className={msg.role === 'ai' ? 'bg-teal-500/10 text-teal-600' : 'bg-primary/10'}>
                                    {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <div className="flex gap-2 shrink-0">
                          <Input placeholder="輸入回覆..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} />
                          <Button size="icon" onClick={handleChatSend}><Send className="w-4 h-4" /></Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            </div>
          </div>

          {/* Metric Detail Dialog */}
          <Dialog open={showMetricDetailDialog} onOpenChange={setShowMetricDetailDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{selectedMetricDetail && getStatusIcon(selectedMetricDetail.status)}{selectedMetricDetail?.name} - 分析結果</DialogTitle>
                <DialogDescription>{selectedMetricDetail?.agents.join(" & ")} 的評估詳情</DialogDescription>
              </DialogHeader>
              {selectedMetricDetail && c04MetricDetails[selectedMetricDetail.id] && (
                <div className="space-y-4">
                  <Card className={`p-4 ${getStatusBg(selectedMetricDetail.status)}`}>
                    <p className="font-medium mb-2">分析結果</p>
                    <p className="text-sm text-muted-foreground">{c04MetricDetails[selectedMetricDetail.id].analysis}</p>
                  </Card>
                  <div>
                    <p className="font-medium mb-2 text-sm">Agent 意見</p>
                    <div className="grid grid-cols-2 gap-3">
                      {c04MetricDetails[selectedMetricDetail.id].agentOpinions.map((op, idx) => (
                        <Card key={idx} className="p-3">
                          <span className="text-xs text-muted-foreground">{op.agent}</span>
                          <Badge variant="outline" className="text-xs ml-2">信心度: {op.confidence}%</Badge>
                          <p className="text-sm mt-1">{op.opinion}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                  {c04MetricDetails[selectedMetricDetail.id].debate && (
                    <div>
                      <p className="font-medium mb-2 text-sm flex items-center gap-2"><Users className="w-4 h-4 text-purple-600" />Agent Debate</p>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">{c04MetricDetails[selectedMetricDetail.id].debate!.agentA.name}</p>
                          <p className="text-sm">{c04MetricDetails[selectedMetricDetail.id].debate!.agentA.opinion}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">{c04MetricDetails[selectedMetricDetail.id].debate!.agentB.name}</p>
                          <p className="text-sm">{c04MetricDetails[selectedMetricDetail.id].debate!.agentB.opinion}</p>
                        </div>
                      </div>
                      <div className="p-2 bg-teal-500/10 rounded text-sm text-teal-700"><strong>結論：</strong>{c04MetricDetails[selectedMetricDetail.id].debate!.consensus}</div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowMetricDetailDialog(false)} className="bg-transparent">關閉</Button>
                    <Button><CheckCircle2 className="w-4 h-4 mr-2" />已確認</Button>
                  </div>
                </div>
              )}
              {selectedMetricDetail && !c04MetricDetails[selectedMetricDetail.id] && (
                <div className="p-4 text-center text-muted-foreground"><p>此 Metric 資料尚未載入</p></div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}

export default function UploadAnalyzePage() {
  return (<Suspense fallback={null}><UploadAnalyzeContent /></Suspense>)
}
