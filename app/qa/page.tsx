"use client"

import { useState } from "react"
import { MainNav } from "@/components/main-nav"
import { ProjectSwitcher } from "@/components/project-switcher"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle2, AlertTriangle, Bot, Users, ChevronRight, FileCheck, Sparkles, RefreshCw, ChevronDown, ChevronUp, Eye, ImageIcon, ZoomIn, ZoomOut, Maximize2, PenTool, ListChecks } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { InteractiveReviewCanvas } from "@/components/interactive-review-canvas"
import AIChatPanel from "@/components/ai-chat-panel"
import { AISidebarChatbot } from "@/components/ai-sidebar-chatbot" // Declare the AIChatPanel variable

export default function QAPage() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [showDebateDialog, setShowDebateDialog] = useState(false)
  const [showSupervisorReview, setShowSupervisorReview] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [imageZoom, setImageZoom] = useState(100)
  const [showMetricsSection, setShowMetricsSection] = useState(false)
  const [showIssuesSection, setShowIssuesSection] = useState(false)
  const [showMetricDetailDialog, setShowMetricDetailDialog] = useState(false)
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<typeof metrics[0] | null>(null)
  const [showReviewCanvas, setShowReviewCanvas] = useState(false)

  // Traffic light metrics - scores hidden, only show red/yellow/green
  const metrics = [
    { id: "composition", name: "構圖 Composition", status: "red", agents: ["Composition_J", "Composition_K"], consensus: false },
    { id: "lighting", name: "光影 Lighting", status: "yellow", agents: ["Light_J", "Light_K"], consensus: true },
    { id: "color", name: "色彩 Color", status: "green", agents: ["Color_J", "Color_K"], consensus: true },
    { id: "texture", name: "材質 Texture", status: "green", agents: ["Texture_J", "Texture_K"], consensus: true },
    { id: "motion", name: "動態 Motion", status: "yellow", agents: ["Motion_J", "Motion_K"], consensus: false },
    { id: "depth", name: "景深 Depth", status: "green", agents: ["Depth_J", "Depth_K"], consensus: true },
    { id: "exposure", name: "曝光 Exposure", status: "red", agents: ["Exposure_J", "Exposure_K"], consensus: true },
    { id: "noise", name: "噪點 Noise", status: "green", agents: ["Noise_J", "Noise_K"], consensus: true },
    { id: "sharpness", name: "銳利度 Sharpness", status: "yellow", agents: ["Sharp_J", "Sharp_K"], consensus: true },
    { id: "continuity", name: "連續性 Continuity", status: "green", agents: ["Cont_J", "Cont_K"], consensus: true },
    { id: "style", name: "風格一致 Style", status: "green", agents: ["Style_J", "Style_K"], consensus: true },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "red": return <AlertCircle className="w-5 h-5 text-red-500" />
      case "yellow": return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case "green": return <CheckCircle2 className="w-5 h-5 text-green-500" />
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

  const redCount = metrics.filter(m => m.status === "red").length
  const yellowCount = metrics.filter(m => m.status === "yellow").length
  const greenCount = metrics.filter(m => m.status === "green").length

  // Detailed metric analysis for dialog
  const metricDetails: Record<string, { analysis: string; suggestions: string[]; agentOpinions: { agent: string; opinion: string; confidence: number }[] }> = {
    composition: {
      analysis: "主體位置偏離三分法則約 15%，整體構圖重心偏左。動態構圖原則適用但需考量品牌規範。",
      suggestions: ["將主體向右移動 10-15%", "調整畫面留白比例", "參考 Reference #2 的構圖方式"],
      agentOpinions: [
        { agent: "Composition_J", opinion: "嚴格來說不符合三分法則，建議調整", confidence: 85 },
        { agent: "Composition_K", opinion: "動態構圖可接受，但邊緣案例", confidence: 72 }
      ]
    },
    lighting: {
      analysis: "主光源方向正確，但補光強度不足導致陰影過重。色溫偏冷，與 Reference 的暖調有落差。",
      suggestions: ["增加左側補光強度 20%", "色溫調整至 4800K", "檢查 rim light 強度"],
      agentOpinions: [
        { agent: "Light_J", opinion: "補光需要加強，整體偏暗", confidence: 88 },
        { agent: "Light_K", opinion: "同意補光調整，色溫問題較輕微", confidence: 82 }
      ]
    },
    exposure: {
      analysis: "高光區域（尤其是背景天空和反光面）過曝，細節損失明顯。直方圖顯示 clipping 約 8%。",
      suggestions: ["降低曝光 0.5 stops", "使用漸層濾鏡壓暗天空", "檢查反光面材質設定"],
      agentOpinions: [
        { agent: "Exposure_J", opinion: "明顯過曝，必須修正", confidence: 95 },
        { agent: "Exposure_K", opinion: "同意，高光細節完全損失", confidence: 93 }
      ]
    }
  }

  // Top 5 Issues
  const topIssues = [
    { id: 1, title: "曝光過度 - 高光細節損失", metric: "exposure", severity: "high", description: "背景天空和反光面過曝約 8%，細節完全損失" },
    { id: 2, title: "構圖偏移 - 主體位置不符規範", metric: "composition", severity: "high", description: "主體偏離三分法則 15%，需向右調整" },
    { id: 3, title: "補光不足 - 陰影過重", metric: "lighting", severity: "medium", description: "左側補光強度需增加約 20%" },
    { id: 4, title: "運動模糊程度分歧", metric: "motion", severity: "medium", description: "Agent 對模糊程度標準有不同意見" },
    { id: 5, title: "前景銳利度不足", metric: "sharpness", severity: "medium", description: "前景物件需額外銳化處理" }
  ]

  const agentDebates = [
    {
      metric: "Composition",
      agentA: { name: "Composition_J", opinion: "主體位置偏左，不符合三分法則", severity: "high" },
      agentB: { name: "Composition_K", opinion: "雖然偏左但符合動態構圖原則", severity: "medium" },
      consensus: "分歧點：是否需要嚴格遵循三分法",
      supervisorNote: "建議參考導演偏好的非對稱構圖風格"
    },
    {
      metric: "Motion",
      agentA: { name: "Motion_J", opinion: "運動模糊程度不足", severity: "medium" },
      agentB: { name: "Motion_K", opinion: "模糊程度適中，過多會影響清晰度", severity: "low" },
      consensus: "共識點：需要適度模糊；分歧點：模糊程度標準",
      supervisorNote: null
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="flex h-16 items-center px-6">
          <ProjectSwitcher />
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">C07</Badge>
                <h1 className="text-3xl font-bold">技術與品質稽核</h1>
              </div>
              <p className="text-muted-foreground">Multi-Agent Metrics Review - 紅黃綠燈號系統</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSupervisorReview(true)}>
                <Bot className="w-4 h-4 mr-2" />
                Supervisor Review
              </Button>
              <Button>
                <FileCheck className="w-4 h-4 mr-2" />
                交付狀態
              </Button>
            </div>
          </div>
        </div>

        {/* Primary: Artist Work View - Director sees this FIRST to avoid bias */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-teal-600" />
                  Artist Work - 先看作品再展開 AI 回饋
                </CardTitle>
                <CardDescription className="mt-1">
                  Director 應先獨立觀察作品，避免 AI 回饋造成先入為主的偏見
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setImageZoom(Math.max(50, imageZoom - 25))} className="bg-transparent">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm w-12 text-center">{imageZoom}%</span>
                <Button variant="outline" size="sm" onClick={() => setImageZoom(Math.min(200, imageZoom + 25))} className="bg-transparent">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative bg-neutral-900 rounded-lg overflow-auto" style={{ maxHeight: "500px" }}>
              <div 
                className="p-4 flex items-center justify-center"
                style={{ transform: `scale(${imageZoom / 100})`, transformOrigin: "center center" }}
              >
                <img 
                  src="/vfx-work-in-progress-shot.jpg" 
                  alt="Artist Work" 
                  className="max-w-full rounded shadow-lg"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Shot_005_v04</span>
                <span>|</span>
                <span>Compositing</span>
                <span>|</span>
                <span>WIP Stage</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-transparent"
                  onClick={() => setShowReviewCanvas(!showReviewCanvas)}
                >
                  <PenTool className="w-4 h-4 mr-2" />
                  {showReviewCanvas ? "收起畫布" : "開啟標註畫布"}
                </Button>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <Eye className="w-3 h-3 mr-1" />
                  請先觀察作品後再展開回饋
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Director Review Canvas - Collapsible */}
        {showReviewCanvas && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="w-4 h-4 text-teal-600" />
                Director Review Canvas
              </CardTitle>
              <CardDescription>
                同時查看 Specs、Artist 作品、Reference，並可直接在畫面上圈選標註和手寫註解
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[550px] border-t">
                <InteractiveReviewCanvas
                  workImage="/vfx-work-in-progress-shot.jpg"
                  referenceImages={[
                    "/reference-movie-frame.jpg",
                    "/composition-reference.jpg",
                    "/lighting-setup-reference.png"
                  ]}
                  specs={[
                    {
                      title: "Director Specs",
                      items: [
                        "主光源必須從右側照射",
                        "保持品牌 Logo 清晰可見",
                        "氛圍要 warm & cozy",
                        "主角臉部需要明確高光"
                      ]
                    },
                    {
                      title: "Technical Requirements",
                      items: [
                        "Resolution: 4K (3840x2160)",
                        "Frame Rate: 24fps",
                        "Color Space: ACES"
                      ]
                    },
                    {
                      title: "Priorities",
                      items: [
                        "P0: 光影方向對齊 Ref",
                        "P1: 構圖符合黃金比例",
                        "P2: 色溫暖調 4500-5000K"
                      ]
                    }
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collapsible AI Feedback Section */}
        <Collapsible open={showFeedback} onOpenChange={setShowFeedback} className="mb-6">
          <Card className={`transition-all ${showFeedback ? "" : "border-dashed"}`}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-purple-600" />
                    <div>
                      <CardTitle className="text-base">AI Agent 回饋與 Metrics</CardTitle>
                      <CardDescription>
                        {showFeedback ? "點擊收起 AI 回饋面板" : "確認已觀察作品後，點擊展開 AI 回饋"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!showFeedback && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertCircle className="w-4 h-4" /> {metrics.filter(m => m.status === "red").length}
                        </span>
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertTriangle className="w-4 h-4" /> {metrics.filter(m => m.status === "yellow").length}
                        </span>
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle2 className="w-4 h-4" /> {metrics.filter(m => m.status === "green").length}
                        </span>
                      </div>
                    )}
                    {showFeedback ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {/* Collapsible: Key Metrics Overview */}
                <Collapsible open={showMetricsSection} onOpenChange={setShowMetricsSection}>
                  <Card className={`transition-all ${showMetricsSection ? "" : "border-dashed"}`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-teal-600" />
                            <CardTitle className="text-sm">Key Metrics 概覽</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {redCount} 紅 / {yellowCount} 黃 / {greenCount} 綠
                            </Badge>
                          </div>
                          {showMetricsSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {/* Overview Stats */}
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <Card>
                            <CardContent className="pt-4 pb-4">
                              <div className="text-center">
                                <div className="text-3xl font-bold text-red-500">{redCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">需修正</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4 pb-4">
                              <div className="text-center">
                                <div className="text-3xl font-bold text-amber-500">{yellowCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">待確認</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4 pb-4">
                              <div className="text-center">
                                <div className="text-3xl font-bold text-green-500">{greenCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">通過</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className={redCount > 0 ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"}>
                            <CardContent className="pt-4 pb-4">
                              <div className="text-center">
                                {redCount > 0 ? (
                                  <>
                                    <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
                                    <p className="text-xs font-medium text-red-600 mt-1">Not Ready</p>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                                    <p className="text-xs font-medium text-green-600 mt-1">Ready</p>
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Collapsible: Top 5 Issues */}
                <Collapsible open={showIssuesSection} onOpenChange={setShowIssuesSection}>
                  <Card className={`transition-all ${showIssuesSection ? "" : "border-dashed"}`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ListChecks className="w-4 h-4 text-red-600" />
                            <CardTitle className="text-sm">Issues (Top 5)</CardTitle>
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
                              {topIssues.filter(i => i.severity === "high").length} 高優先
                            </Badge>
                          </div>
                          {showIssuesSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {topIssues.map((issue) => (
                            <div 
                              key={issue.id}
                              className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                                issue.severity === "high" 
                                  ? "border-red-500/30 bg-red-500/5" 
                                  : "border-amber-500/30 bg-amber-500/5"
                              }`}
                              onClick={() => {
                                const metric = metrics.find(m => m.id === issue.metric)
                                if (metric) {
                                  setSelectedMetricDetail(metric)
                                  setShowMetricDetailDialog(true)
                                }
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2">
                                  {issue.severity === "high" ? (
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                                  )}
                                  <div>
                                    <p className="font-medium text-sm">{issue.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className={`text-xs ${
                                  issue.severity === "high" ? "text-red-600" : "text-amber-600"
                                }`}>
                                  {issue.severity === "high" ? "High" : "Medium"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Metrics Grid */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-teal-600" />
                          Multi-Agent Metrics Review
                        </CardTitle>
                        <CardDescription>每個 metric 由兩個 Agent 獨立評估，紅燈時可檢查該 Agent 詳細結果</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {metrics.map((metric) => (
                            <Card 
                              key={metric.id}
                              className={`p-4 cursor-pointer transition-all hover:shadow-md ${getStatusBg(metric.status)} ${selectedMetric === metric.id ? 'ring-2 ring-primary' : ''}`}
                              onClick={() => {
                                setSelectedMetric(metric.id)
                                setSelectedMetricDetail(metric)
                                setShowMetricDetailDialog(true)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getStatusIcon(metric.status)}
                                  <div>
                                    <p className="font-medium">{metric.name}</p>
                                    <p className="text-xs text-muted-foreground">{metric.agents.join(" & ")}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!metric.consensus && (
                                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">分歧</Badge>
                                  )}
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Agent Debate Results */}
                    <Card className="mt-6">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-purple-600" />
                              Multi-Agent Debates
                            </CardTitle>
                            <CardDescription>顯示共識點與分歧點</CardDescription>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setShowDebateDialog(true)}>
                            查看全部討論
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {agentDebates.map((debate, idx) => (
                          <Card key={idx} className="p-4 bg-muted/50">
                            <div className="flex items-start justify-between mb-3">
                              <Badge variant="outline">{debate.metric}</Badge>
                              {debate.supervisorNote && (
                                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                                  <Bot className="w-3 h-3 mr-1" />
                                  Supervisor 已介入
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="p-3 bg-background rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">{debate.agentA.name}</p>
                                <p className="text-sm">{debate.agentA.opinion}</p>
                                <Badge variant="outline" className={`mt-2 text-xs ${debate.agentA.severity === 'high' ? 'text-red-500' : debate.agentA.severity === 'medium' ? 'text-amber-500' : 'text-green-500'}`}>
                                  {debate.agentA.severity}
                                </Badge>
                              </div>
                              <div className="p-3 bg-background rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">{debate.agentB.name}</p>
                                <p className="text-sm">{debate.agentB.opinion}</p>
                                <Badge variant="outline" className={`mt-2 text-xs ${debate.agentB.severity === 'high' ? 'text-red-500' : debate.agentB.severity === 'medium' ? 'text-amber-500' : 'text-green-500'}`}>
                                  {debate.agentB.severity}
                                </Badge>
                              </div>
                            </div>
                            <div className="p-2 bg-teal-500/10 rounded text-sm text-teal-700">
                              <strong>結論：</strong>{debate.consensus}
                            </div>
                            {debate.supervisorNote && (
                              <div className="p-2 bg-purple-500/10 rounded text-sm text-purple-700 mt-2">
                                <strong>Supervisor：</strong>{debate.supervisorNote}
                              </div>
                            )}
                          </Card>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Sidebar */}
                  <div className="space-y-6">
                    {/* Supervisor Agent Card */}
                    <Card className="border-purple-500/30 bg-purple-500/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                          <Bot className="w-5 h-5" />
                          Supervisor Agent
                        </CardTitle>
                        <CardDescription>獨立評判 Multi-Agent 結果，檢查交叉影響</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-sm font-medium mb-2">最新評估</p>
                          <p className="text-sm text-muted-foreground">
                            Composition 調整後，Lighting 指標可能受影響。建議重新評估光影一致性。
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>交叉影響分析</span>
                            <Badge variant="outline" className="text-amber-600">1 項警告</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Agent 一致性</span>
                            <Badge variant="outline" className="text-green-600">85%</Badge>
                          </div>
                        </div>
                        <Button className="w-full bg-transparent" variant="outline" onClick={() => setShowSupervisorReview(true)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          重新評估
                        </Button>
                      </CardContent>
                    </Card>

                    {/* AI Fix Suggestions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>AI 修改建議清單</CardTitle>
                        <CardDescription>依優先度排序</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="font-medium text-sm">曝光過度</span>
                                <Badge variant="destructive" className="ml-auto text-xs">High</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">高光區域細節損失，建議降低 0.5 stops</p>
                            </div>
                            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="font-medium text-sm">構圖調整</span>
                                <Badge variant="destructive" className="ml-auto text-xs">High</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">主體位置需向右移動約 10%</p>
                            </div>
                            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span className="font-medium text-sm">光影一致性</span>
                                <Badge className="ml-auto text-xs bg-amber-500">Medium</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">左側補光強度需微調</p>
                            </div>
                            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span className="font-medium text-sm">銳利度</span>
                                <Badge className="ml-auto text-xs bg-amber-500">Medium</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">前景物件需要額外銳化處理</p>
                            </div>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* ShotGrid Sync */}
                    <Card>
                      <CardHeader>
                        <CardTitle>ShotGrid 同步</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>FPS/Frame</span>
                          <span className="font-mono">24 fps</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>FPS/Duration</span>
                          <span className="font-mono">48:2</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Shoot Code</span>
                          <span className="font-mono">Z_01:02</span>
                        </div>
                        <Button variant="outline" className="w-full mt-2 bg-transparent">同步 ShotGrid</Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Metric Detail Dialog - Shows when clicking on a metric in Multi-Agent Metrics Review */}
        <Dialog open={showMetricDetailDialog} onOpenChange={setShowMetricDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedMetricDetail && getStatusIcon(selectedMetricDetail.status)}
                {selectedMetricDetail?.name} - 分析結果
              </DialogTitle>
              <DialogDescription>
                {selectedMetricDetail?.agents.join(" & ")} 的評估詳情
              </DialogDescription>
            </DialogHeader>
            {selectedMetricDetail && metricDetails[selectedMetricDetail.id] && (
              <div className="space-y-4">
                {/* Analysis */}
                <Card className={`p-4 ${getStatusBg(selectedMetricDetail.status)}`}>
                  <p className="font-medium mb-2">分析結果</p>
                  <p className="text-sm text-muted-foreground">
                    {metricDetails[selectedMetricDetail.id].analysis}
                  </p>
                </Card>

                {/* Agent Opinions */}
                <div>
                  <p className="font-medium mb-2 text-sm">Agent 評估意見</p>
                  <div className="grid grid-cols-2 gap-3">
                    {metricDetails[selectedMetricDetail.id].agentOpinions.map((opinion, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">{opinion.agent}</span>
                          <Badge variant="outline" className="text-xs">
                            信心度: {opinion.confidence}%
                          </Badge>
                        </div>
                        <p className="text-sm">{opinion.opinion}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                <div>
                  <p className="font-medium mb-2 text-sm">建議修改</p>
                  <div className="space-y-2">
                    {metricDetails[selectedMetricDetail.id].suggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-muted rounded">
                        <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowMetricDetailDialog(false)} className="bg-transparent">
                    關閉
                  </Button>
                  <Button>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    標記為已確認
                  </Button>
                </div>
              </div>
            )}
            {selectedMetricDetail && !metricDetails[selectedMetricDetail.id] && (
              <div className="p-4 text-center text-muted-foreground">
                <p>此 Metric 的詳細分析資料尚未載入</p>
                <p className="text-sm mt-2">狀態：{selectedMetricDetail.status === "green" ? "通過" : selectedMetricDetail.status === "yellow" ? "待確認" : "需修正"}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Supervisor Review Dialog */}
        <Dialog open={showSupervisorReview} onOpenChange={setShowSupervisorReview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                Supervisor Agent Review
              </DialogTitle>
              <DialogDescription>獨立評判 Multi-Agent 結果，檢查交叉影響</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700">交叉影響警告</p>
                    <p className="text-sm text-muted-foreground mt-1">Composition 修正後，可能影響以下 metrics：</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">Lighting</Badge>
                      <Badge variant="outline">Depth</Badge>
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <p className="font-medium mb-2">建議修改順序</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">1</span>
                    <span className="text-sm">先修正 Exposure（不影響其他）</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">2</span>
                    <span className="text-sm">再調整 Composition（會影響 Lighting）</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="w-6 h-6 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center">3</span>
                    <span className="text-sm">最後確認 Lighting 一致性</span>
                  </div>
                </div>
              </Card>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSupervisorReview(false)}>關閉</Button>
                <Button><RefreshCw className="w-4 h-4 mr-2" />執行重新評估</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Multi-Agent Debate Dialog */}
        <Dialog open={showDebateDialog} onOpenChange={setShowDebateDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Multi-Agent Debates - 完整討論紀錄</DialogTitle>
              <DialogDescription>所有 metrics 的 Agent 討論與共識/分歧點</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {metrics.filter(m => !m.consensus || m.status !== 'green').map((metric) => (
                  <Card key={metric.id} className={`p-4 ${getStatusBg(metric.status)}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {getStatusIcon(metric.status)}
                      <span className="font-medium">{metric.name}</span>
                      {!metric.consensus && <Badge variant="outline" className="text-amber-600">分歧</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 bg-background rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">{metric.agents[0]}</p>
                        <p>Agent J 的評估意見...</p>
                      </div>
                      <div className="p-2 bg-background rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1">{metric.agents[1]}</p>
                        <p>Agent K 的評估意見...</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* AI Sidebar Chatbot - Always Visible */}
        <AISidebarChatbot
          context="品質稽核"
          description="AI 會解釋紅黃綠燈並監督整體品質"
          suggestedPrompts={["為什麼是紅燈？", "會影響其他項目嗎？"]}
          initialMessages={[
            {
              role: "ai",
              content: "您好！我是品質稽核助手。\n\n紅黃綠燈說明：\n🔴 紅燈：重大問題\n🟡 黃燈：可改善\n🟢 綠燈：符合標準\n\nSupervisor Agent 會監督修改後是否影響其他項目。",
            },
          ]}
        />
      </div>
    </div>
  )
}
