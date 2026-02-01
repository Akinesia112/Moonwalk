"use client"

import { Suspense, useState } from "react"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText,
  Zap,
  Users,
  MessageCircle,
  Settings,
  Target,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Pin,
  Plus,
  HelpCircle,
  ChevronRight,
  Send,
  ExternalLink,
  Copy,
  RefreshCw,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AIChatPanel } from "@/components/ai-chat-panel"
import { AISidebarChatbot } from "@/components/ai-sidebar-chatbot"
import { FeedbackCanvas } from "@/components/feedback-canvas"
import { RefFrameCompare } from "@/components/ref-frame-compare"

function UploadAnalyzeContent() {
  const [topN, setTopN] = useState([5])
  const [showClarification, setShowClarification] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(true)

  // Metrics - L1 (only show 3 key metrics in L0)
  const keyMetrics = {
    light: 0.72,
    composition: 0.85,
    color: 0.68,
  }

  const fullMetrics = {
    light: 0.72,
    composition: 0.85,
    color: 0.68,
    style: 0.79,
    percept: 0.75,
    faithfulness: 0.81,
    control: 0.88,
    robustness: 0.73,
    efficiency: 0.91,
    stability: 0.77,
    overall: 0.78,
  }

  const analysisResults = [
    {
      issue_id: "issue_001",
      type: "lighting",
      severity: "P0",
      title: "光影方向不符主參考",
      summary: "主光源從左上照射，但參考圖為右側硬光",
      location: { bbox: [120, 80, 450, 320], timecode: null },
      evidence_uri: "/vfx-work-in-progress-shot.jpg",
      recommended_edit: {
        action: "調整主光源至右側 90°，色溫 5600K",
        rationale: "對齊主參考 ref_lighting_hero.jpg 的光影語彙",
        acceptance_criteria: "主角臉部右側高光明確，左側有明顯陰影過渡",
        estimated_cost: "mid",
      },
      ref_support: ["ref_001", "ref_003"],
    },
    {
      issue_id: "issue_002",
      type: "composition",
      severity: "P1",
      title: "構圖重心偏移",
      summary: "主體位置在畫面 60% 處，應調整至黃金比例點",
      location: { bbox: [280, 100, 520, 400], timecode: null },
      evidence_uri: "/vfx-work-in-progress-shot.jpg",
      recommended_edit: {
        action: "主角向左移動 80px，保持視線方向",
        rationale: "符合導演 spec「畫面平衡感」要求",
        acceptance_criteria: "主體中心位於畫面左側 1/3 處",
        estimated_cost: "low",
      },
      ref_support: ["ref_002"],
    },
    {
      issue_id: "issue_003",
      type: "color",
      severity: "P2",
      title: "色溫過冷",
      summary: "整體色溫 6500K，導演要求「溫暖」氛圍建議 4500-5000K",
      location: { bbox: null, timecode: null },
      evidence_uri: null,
      recommended_edit: {
        action: "全局色溫調整 -1500K，增加橙色偏移 +8",
        rationale: "對齊導演詞彙「warm/cozy」",
        acceptance_criteria: "畫面整體呈現暖黃調性",
        estimated_cost: "low",
      },
      ref_support: ["ref_004"],
    },
  ]

  const clarificationQuestions = [
    {
      to: "director",
      question: "ref_lighting_hero.jpg 的用途是「光影方向」還是「光影品質（軟硬）」？",
      choices: ["方向 Direction", "品質 Quality", "兩者都要 Both"],
    },
    {
      to: "supervisor",
      question: "最不能改的元素是什麼？",
      choices: ["鏡頭角度", "構圖", "品牌 Logo 位置", "人物表情"],
    },
  ]

  const debateResults = {
    consensus: [
      { issue_id: "issue_001", stance: "fix_now", reason: "所有角色（Director/Supervisor/Tech）一致認為光影方向是 P0" },
    ],
    dissent: [{ issue_id: "issue_003", role: "Tech", concern: "色溫調整可能影響後續 shots 的一致性" }],
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex h-16 items-center px-6 gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">VFX</span>
            </div>
            <span className="font-semibold text-lg">VFX AI Feedback</span>
          </div>
          <MainNav />
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
            </Button>
            <UserNav />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Page Header with Context Breadcrumb - L0 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Chronos Legacy</span>
            <ChevronRight className="w-4 h-4" />
            <span>SEQ_A</span>
            <ChevronRight className="w-4 h-4" />
            <span>Shot_005</span>
            <ChevronRight className="w-4 h-4" />
            <Badge variant="outline">WIP</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-primary">C03</Badge>
              <h1 className="text-2xl font-bold">上傳與 AI 分析</h1>
            </div>
            {/* L1 Advanced Drawer Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Advanced
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>進階設定 Advanced Settings</SheetTitle>
                  <SheetDescription>Spec Canvas、Agent Mode、Prompt 設定等</SheetDescription>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {/* Canvas Spec Interface - L1 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Canvas Spec Interface</Label>
                    <Textarea placeholder="導演規格文字：要達成什麼、禁忌、優先序&#10;例如：主光源必須從右側，保持品牌 Logo 清晰可見，氛圍要 warm & cozy" rows={4} />
                  </div>

                  <Separator />

                  {/* Customer Slides - L1 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Customer Slides as Director Spec</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors">
                      <FileText className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs mb-1">上傳客戶簡報作為 Director Spec</p>
                      <Input type="url" placeholder="或貼上 URL 連結" className="mt-2" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">頁 1</Badge>
                      <Badge variant="secondary">頁 3</Badge>
                      <Badge variant="secondary">頁 5-7</Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Prompt Panel - L1 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Prompt & Art Style</Label>
                    <Textarea placeholder="描述分析目標" rows={2} />
                    <div className="grid grid-cols-2 gap-2">
                      <Select defaultValue="cyberpunk">
                        <SelectTrigger>
                          <SelectValue placeholder="Art Style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cyberpunk">Cyberpunk Product-Ad</SelectItem>
                          <SelectItem value="photoreal">Photoreal</SelectItem>
                          <SelectItem value="stylized">Stylized Animation</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Prompt Template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="template1">對齊導演 + Ref</SelectItem>
                          <SelectItem value="template2">詞義釐清 + 追問</SelectItem>
                          <SelectItem value="template3">技術檢查 QA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Agent Mode Selector - L1 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Agent Mode</Label>
                    <Select defaultValue="autogen">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Agent</SelectItem>
                        <SelectItem value="autogen">AutoGen (並行 8 tools)</SelectItem>
                        <SelectItem value="concurrent">Concurrent Agents</SelectItem>
                        <SelectItem value="handoffs">Handoffs (串行)</SelectItem>
                        <SelectItem value="leader">Leader + 8 Minors</SelectItem>
                        <SelectItem value="debate">Multi-Agent Debate</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-green-500" />
                        <span>AutoGen: 最快，並行工具呼叫</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-3 h-3 text-blue-500" />
                        <span>Leader+Minors: 最全面</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-purple-500" />
                        <span>Debate: 模擬導演辯論</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="agent-trace" />
                        <Label htmlFor="agent-trace" className="text-sm font-normal cursor-pointer">Show Agent Trace</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="director-sim" />
                        <Label htmlFor="director-sim" className="text-sm font-normal cursor-pointer">Director Simulation</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Full Metrics Dashboard - L1 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Full Metrics Dashboard (11 Metrics)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(fullMetrics).map(([key, value]) => (
                        <div key={key} className="text-center p-2 bg-muted rounded-lg">
                          <div className="text-lg font-bold" style={{ color: value >= 0.8 ? "rgb(34 197 94)" : value >= 0.6 ? "rgb(251 146 60)" : "rgb(239 68 68)" }}>
                            {(value * 100).toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">{key}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Multi-Agent Debate Results - L1 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Multi-Agent Debate Results</Label>
                    <div className="space-y-2">
                      <div className="text-xs font-medium">Consensus</div>
                      {debateResults.consensus.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium">{item.issue_id} - {item.stance}</p>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                          </div>
                        </div>
                      ))}
                      <div className="text-xs font-medium mt-3">Dissent</div>
                      {debateResults.dissent.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium">{item.issue_id} - {item.role}</p>
                            <p className="text-xs text-muted-foreground">{item.concern}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-4">
            {/* Upload Dropzone - L0 DC1 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  上傳檔案
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">拖拉檔案或點擊上傳</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, MP4, MOV, EXR, URL</p>
                </div>
              </CardContent>
            </Card>

            {/* Context Selector - L0 DC1 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  專案情境
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Shot / Task</Label>
                    <Select defaultValue="shot005">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shot005">Shot_005_v04</SelectItem>
                        <SelectItem value="shot007">Shot_007_v02</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Stage</Label>
                    <Select defaultValue="wip">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brief">Brief</SelectItem>
                        <SelectItem value="previz">Previz</SelectItem>
                        <SelectItem value="wip">WIP</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Department</Label>
                    <Select defaultValue="comp">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concept">Concept</SelectItem>
                        <SelectItem value="comp">Compositing</SelectItem>
                        <SelectItem value="fx">FX</SelectItem>
                        <SelectItem value="3d">3D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ref Pack</Label>
                    <Select defaultValue="lighting">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brief">Brief References</SelectItem>
                        <SelectItem value="lighting">Lighting Pack</SelectItem>
                        <SelectItem value="style">Style Guide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Artist Draft Status - 告訴 Agent 目前進度 */}
                <div className="space-y-2 pt-3 border-t">
                  <Label className="text-xs flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    Artist 備註 (告訴 AI 目前狀態)
                  </Label>
                  <Textarea 
                    placeholder="例如：這是草稿、我只想先看構圖對不對、光影還沒開始做、這版只做了前半段..."
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">草稿階段</Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">只看構圖</Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">光影未完成</Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">色調待調</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Refs 1-3 + Ref Purpose - L0 DC1 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Pin className="w-4 h-4" />
                    Main References (1-3)
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
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
              </CardContent>
            </Card>

            {/* Budget-aware Slider + Analyze Button - L0 */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Top-N Issues</Label>
                    <span className="text-sm font-medium text-primary">Top {topN[0]}</span>
                  </div>
                  <Slider value={topN} onValueChange={setTopN} max={20} min={1} step={1} />
                  <p className="text-xs text-muted-foreground">限制回傳的 Issue 數量</p>
                </div>

                {/* Main CTA - L0 */}
                <Button className="w-full" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  開始分析 Analyze
                </Button>
              </CardContent>
            </Card>

            {/* Key Metrics Summary - L0 (only 3) */}
            {analysisComplete && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Key Metrics</Label>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 text-xs">View All</Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Full Metrics Dashboard</SheetTitle>
                        </SheetHeader>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          {Object.entries(fullMetrics).map(([key, value]) => (
                            <div key={key} className="text-center p-3 bg-muted rounded-lg">
                              <div className="text-xl font-bold" style={{ color: value >= 0.8 ? "rgb(34 197 94)" : value >= 0.6 ? "rgb(251 146 60)" : "rgb(239 68 68)" }}>
                                {(value * 100).toFixed(0)}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">{key}</div>
                            </div>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(keyMetrics).map(([key, value]) => (
                      <div key={key} className="text-center p-2 bg-muted rounded-lg">
                        <div className="text-lg font-bold" style={{ color: value >= 0.8 ? "rgb(34 197 94)" : value >= 0.6 ? "rgb(251 146 60)" : "rgb(239 68 68)" }}>
                          {(value * 100).toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Results - L0 DC2→DC3 */}
          <div className="lg:col-span-2 space-y-4">
            {/* Results Panel - L0 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    分析結果 Issues (Top {topN[0]})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Re-analyze
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {analysisResults.slice(0, topN[0]).map((result) => (
                      <Card key={result.issue_id} className="border-l-4" style={{
                        borderLeftColor: result.severity === "P0" ? "rgb(239 68 68)" : result.severity === "P1" ? "rgb(251 146 60)" : "rgb(59 130 246)",
                      }}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2 flex-1">
                              {result.severity === "P0" && <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                              {result.severity === "P1" && <Info className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />}
                              {result.severity === "P2" && <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />}
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
                        <CardContent className="space-y-3">
                          {/* Evidence */}
                          {result.evidence_uri && (
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Evidence</Label>
                              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden max-h-32">
                                <img src={result.evidence_uri || "/placeholder.svg"} alt="Evidence" className="w-full h-full object-cover" />
                                {result.location.bbox && (
                                  <div className="absolute border-2 border-red-500 bg-red-500/20 rounded" style={{
                                    left: `${(result.location.bbox[0] / 600) * 100}%`,
                                    top: `${(result.location.bbox[1] / 400) * 100}%`,
                                    width: `${((result.location.bbox[2] - result.location.bbox[0]) / 600) * 100}%`,
                                    height: `${((result.location.bbox[3] - result.location.bbox[1]) / 400) * 100}%`,
                                  }} />
                                )}
                              </div>
                            </div>
                          )}

                          {/* Actionable Edit */}
                          <div className="bg-primary/5 rounded-lg p-3 space-y-2">
                            <Label className="text-xs font-semibold flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              Actionable Edit
                            </Label>
                            <p className="text-xs"><strong>Action:</strong> {result.recommended_edit.action}</p>
                            <p className="text-xs"><strong>Rationale:</strong> {result.recommended_edit.rationale}</p>
                            <p className="text-xs"><strong>Acceptance:</strong> {result.recommended_edit.acceptance_criteria}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">Cost: {result.recommended_edit.estimated_cost}</Badge>
                              {result.ref_support.length > 0 && (
                                <Badge variant="secondary" className="text-[10px]">Refs: {result.ref_support.join(", ")}</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Output Actions - L0 DC3 */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">一鍵輸出 Quick Output</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Copy className="w-4 h-4 mr-1" />
                      Create Note
                    </Button>
                    <Button variant="outline" size="sm">
                      <Send className="w-4 h-4 mr-1" />
                      Request Review
                    </Button>
                    <Button size="sm">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Sync ShotGrid
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Clarification Dialog - L1 (only shows when NEED_CLARIFICATION) */}
      <Dialog open={showClarification} onOpenChange={setShowClarification}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              AI Clarification
            </DialogTitle>
            <DialogDescription>AI 需要確認以下問題才能繼續分析</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {clarificationQuestions.map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex gap-2">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm mb-2">{q.question}</p>
                        <div className="flex flex-wrap gap-1">
                          {q.choices.map((choice, cidx) => (
                            <Badge key={cidx} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs">{choice}</Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">To: {q.to}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2 pt-2">
            <Input placeholder="回覆或補充說明..." className="flex-1" />
            <Button size="sm">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast for L2 automated actions */}
      <Alert className="fixed bottom-4 left-4 w-auto max-w-sm">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          AI 建議以「可能」、「建議」措辭呈現。最終決策權在 Director/Supervisor。
        </AlertDescription>
      </Alert>

      {/* AI Sidebar Chatbot - Always Visible */}
      <AISidebarChatbot
        context="AI 分析"
        description="AI 會分析作品並追問不清楚的地方"
        suggestedPrompts={["這版是草稿", "為什麼標紅燈？"]}
        initialMessages={[
          {
            role: "ai",
            content: "您好！我是 AI 分析助手。\n\n上傳作品後我會：\n1. 對照參考圖分析差距\n2. 檢測技術品質問題\n\n如果是草稿，請在「Artist 備註」欄位說明。",
          },
        ]}
      />
    </div>
  )
}

export default function UploadAnalyzePage() {
  return (
    <Suspense fallback={null}>
      <UploadAnalyzeContent />
    </Suspense>
  )
}
