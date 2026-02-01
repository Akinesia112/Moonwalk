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
import { AlertCircle, CheckCircle2, AlertTriangle, Bot, Users, ChevronRight, FileCheck, Sparkles, RefreshCw } from "lucide-react"
import AIChatPanel from "@/components/ai-chat-panel"
import { AISidebarChatbot } from "@/components/ai-sidebar-chatbot" // Declare the AIChatPanel variable

export default function QAPage() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [showDebateDialog, setShowDebateDialog] = useState(false)
  const [showSupervisorReview, setShowSupervisorReview] = useState(false)

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

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-red-500">{redCount}</div>
                <p className="text-sm text-muted-foreground mt-1">需修正</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-amber-500">{yellowCount}</div>
                <p className="text-sm text-muted-foreground mt-1">待確認</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-500">{greenCount}</div>
                <p className="text-sm text-muted-foreground mt-1">通過</p>
              </div>
            </CardContent>
          </Card>
          <Card className={redCount > 0 ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"}>
            <CardContent className="pt-6">
              <div className="text-center">
                {redCount > 0 ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                    <p className="text-sm font-medium text-red-600 mt-2">Not Ready for Delivery</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
                    <p className="text-sm font-medium text-green-600 mt-2">Ready for Delivery</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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
                      onClick={() => setSelectedMetric(metric.id)}
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
      </div>

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
  )
}
