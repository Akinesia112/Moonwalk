"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  GitCompare,
  SlidersHorizontal,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  ArrowLeftRight,
  Sparkles,
  Flag,
  MessageSquare,
  Send,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { AIChatPanel } from "@/components/ai-chat-panel"
import { RefFrameCompare } from "@/components/ref-frame-compare"
import { AISidebarChatbot } from "@/components/ai-sidebar-chatbot"

export default function ComparePage() {
  const [compareMode, setCompareMode] = useState("split")
  const [sliderValue, setSliderValue] = useState([50])
  const [finalOnlyToggle, setFinalOnlyToggle] = useState(false)

  const comparisonPairs = [
    {
      id: 1,
      workVersion: "Shot_005_v04",
      refItem: "Marvel_IronMan_Flight_Reference.jpg",
      score: 87,
      deltas: [
        { type: "構圖", severity: "medium", detail: "主體位置偏右 15%" },
        { type: "光影", severity: "high", detail: "高光不足，建議增強 rim light" },
        { type: "色調", severity: "low", detail: "暖色調偏弱" },
      ],
    },
    {
      id: 2,
      workVersion: "Asset_Dragon_Texture_v02",
      refItem: "Dragon_Scale_Pattern_Final.png",
      score: 92,
      deltas: [
        { type: "材質", severity: "medium", detail: "Scale 細節模糊" },
        { type: "色調", severity: "low", detail: "飽和度略高" },
      ],
    },
  ]

  const similarRefs = [
    { id: 1, name: "Thor_Lightning_01.jpg", similarity: 94, intent: "光影" },
    { id: 2, name: "Avengers_Composition_12.jpg", similarity: 89, intent: "構圖" },
    { id: 3, name: "IronMan_ColorGrade_v3.jpg", similarity: 85, intent: "色調" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <Badge variant="outline">C04</Badge>
            <h1 className="text-3xl font-bold">Ref 對照 / 差距比對</h1>
          </div>
          <p className="text-muted-foreground">Before/After、Ref-Work 並排、差距清單分析</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Comparison View */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">比對控制</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      輸出證據圖組
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>工作版本</Label>
                    <Select defaultValue="shot_005_v04">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shot_005_v04">Shot_005_v04</SelectItem>
                        <SelectItem value="shot_005_v03">Shot_005_v03</SelectItem>
                        <SelectItem value="shot_005_v02">Shot_005_v02</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>參考資料</Label>
                    <Select defaultValue="ironman_ref">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ironman_ref">IronMan Flight Reference</SelectItem>
                        <SelectItem value="thor_ref">Thor Lightning Reference</SelectItem>
                        <SelectItem value="avengers_ref">Avengers Composition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch id="final-only" checked={finalOnlyToggle} onCheckedChange={setFinalOnlyToggle} />
                    <Label htmlFor="final-only" className="cursor-pointer">
                      僅顯示 Final-only refs
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">比對意圖：</Label>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部</SelectItem>
                        <SelectItem value="lighting">光影</SelectItem>
                        <SelectItem value="composition">構圖</SelectItem>
                        <SelectItem value="color">色調</SelectItem>
                        <SelectItem value="texture">材質</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Viewer */}
            <Card>
              <CardHeader>
                <Tabs value={compareMode} onValueChange={setCompareMode}>
                  <TabsList>
                    <TabsTrigger value="split">分割檢視</TabsTrigger>
                    <TabsTrigger value="slider">Wipe 滑桿</TabsTrigger>
                    <TabsTrigger value="side-by-side">並排</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                {compareMode === "split" && (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2 h-full">
                      <div className="relative flex items-center justify-center border-r border-border">
                        <img
                          src="/vfx-work-in-progress-shot.jpg"
                          alt="Work Version"
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-4 left-4 bg-blue-500">Work v04</Badge>
                      </div>
                      <div className="relative flex items-center justify-center">
                        <img src="/reference-movie-frame.jpg" alt="Reference" className="w-full h-full object-cover" />
                        <Badge className="absolute top-4 right-4 bg-purple-500">Reference</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {compareMode === "slider" && (
                  <div className="space-y-4">
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                      <div className="absolute inset-0">
                        <img src="/reference-movie-frame.jpg" alt="Reference" className="w-full h-full object-cover" />
                      </div>
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)` }}
                      >
                        <img
                          src="/vfx-work-in-progress-shot.jpg"
                          alt="Work Version"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                        style={{ left: `${sliderValue[0]}%` }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                          <ArrowLeftRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} className="w-full" />
                  </div>
                )}

                {compareMode === "side-by-side" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Badge variant="outline">Work Version v04</Badge>
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <img
                          src="/vfx-work-in-progress-shot.jpg"
                          alt="Work Version"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Badge variant="outline">Reference</Badge>
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <img src="/reference-movie-frame.jpg" alt="Reference" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delta List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  差距清單 Delta List
                </CardTitle>
                <CardDescription>分析比對結果，列出需要改進的項目</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonPairs[0].deltas.map((delta, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50"
                    >
                      <div className="mt-0.5">
                        {delta.severity === "high" ? (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : delta.severity === "medium" ? (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {delta.type}
                          </Badge>
                          <Badge
                            variant={
                              delta.severity === "high"
                                ? "destructive"
                                : delta.severity === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {delta.severity === "high" ? "高" : delta.severity === "medium" ? "中" : "低"}
                          </Badge>
                        </div>
                        <p className="text-sm">{delta.detail}</p>
                        
                        {/* Artist Annotation & Escalation */}
                        <div className="mt-2 pt-2 border-t border-dashed flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600">
                            <Flag className="w-3 h-3 mr-1" />
                            有疑慮，上報導演
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            寫註解
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Artist/Director Annotation Panel */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  回饋註解 Feedback Annotations
                </CardTitle>
                <CardDescription>Artist/Director 對回饋不滿意時可寫註解，Agent 會吃進去改進建議</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">新增註解</Label>
                  <Textarea placeholder="例如：這個光影建議不適用，因為場景有特殊需求...&#10;或：我不同意這個構圖修改，導演原本的意圖是..." rows={3} />
                </div>
                <div className="flex items-center justify-between">
                  <Select defaultValue="artist">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="artist">Artist</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm">
                    <Send className="w-4 h-4 mr-2" />
                    送出註解給 Agent
                  </Button>
                </div>
                
                {/* Existing Annotations */}
                <div className="pt-4 border-t space-y-2">
                  <Label className="text-xs text-muted-foreground">已有註解</Label>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">Artist</Badge>
                      <span className="text-xs text-muted-foreground">2 小時前</span>
                    </div>
                    <p className="text-sm">光影方向我認為左側打光更能表現角色的神秘感，請 Director 確認</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Similarity & Metadata */}
          <div className="space-y-6">
            {/* Comparison Score */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">比對分數</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">87%</div>
                  <p className="text-sm text-muted-foreground mb-4">與參考資料相似度</p>
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-muted-foreground">AI 分析結果</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top-K Similar References */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">類似參考資料</CardTitle>
                <CardDescription>Top-K 相關 references</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {similarRefs.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        <img
                          src={`/.jpg?height=64&width=64&query=${ref.name}`}
                          alt={ref.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate mb-1">{ref.name}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {ref.intent}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{ref.similarity}%</span>
                        </div>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">輸出選項</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  匯出證據圖組 (Before/After)
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  下載差距分析報告
                </Button>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    證據圖組將包含標註與差距說明，可直接用於 Note 或交片文件
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Permission Info */}
            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  權限提醒
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  外部客戶僅能查看「work vs approved ref」的對照。內部參考資料與未批准的 refs 不會顯示。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Sidebar Chatbot - Always Visible */}
      <AISidebarChatbot
        context="Ref 對照比較"
        description="AI 會分析作品與參考圖的差異"
        suggestedPrompts={["這是刻意的選擇", "幫我整理回饋"]}
        initialMessages={[
          {
            role: "ai",
            content: "您好！我是對照比較助手。\n\n我會分析作品與參考圖的差異：\n• 構圖 / 光影 / 色調\n\n有疑慮可點「上報導演」，不同意可寫註解。",
          },
        ]}
      />
    </div>
  )
}
