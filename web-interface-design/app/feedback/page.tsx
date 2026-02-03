"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ListChecks,
  Wand2,
  MessageSquare,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ImageIcon,
  Clock,
  User,
  Sparkles,
  Bot,
  Send,
  HelpCircle,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { AIChatPanel } from "@/components/ai-chat-panel"
import { FeedbackCanvas } from "@/components/feedback-canvas"
import { AISidebarChatbot } from "@/components/ai-sidebar-chatbot"
import { DirectorFeedbackCanvas } from "@/components/director-feedback-canvas"

export default function FeedbackPage() {
  const [rawNotes, setRawNotes] = useState("")
  const [transformedNotes, setTransformedNotes] = useState("")
  const [toneStyle, setToneStyle] = useState("supportive")
  const [showClarificationChat, setShowClarificationChat] = useState(false)
  const [clarificationMessages, setClarificationMessages] = useState([
    { role: "ai", content: "我注意到您的回饋中有一些模糊的詞彙，讓我幫您釐清：\n\n「太暗了」具體是指什麼？\n\n1. 整體曝光度不足？\n2. 對比度太低導致細節看不清？\n3. 特定區域（如臉部）需要更多光線？" },
  ])
  const [clarificationInput, setClarificationInput] = useState("")

  const handleClarificationSend = () => {
    if (!clarificationInput.trim()) return
    setClarificationMessages([...clarificationMessages, { role: "user", content: clarificationInput }])
    setClarificationInput("")
    setTimeout(() => {
      setClarificationMessages(prev => [...prev, { 
        role: "ai", 
        content: "了解！所以您希望：\n\n✓ 將整體曝光提升 0.5 EV\n✓ 臉部區域額外補光，使用 3200K 暖色調\n✓ 背景維持暗調以突顯主角\n\n這樣的調整建議是否符合您的期望？我可以幫您轉換成結構化的回饋清單。" 
      }])
    }, 1000)
  }

  const feedbackItems = [
    {
      id: 1,
      target: "Shot_005_v04",
      type: "visual",
      priority: "P0",
      request: "增強主體 rim light，使角色更突出",
      rationale: "當前光影層次不足，與參考資料差距明顯",
      acceptance: "rim light 強度達到 Reference 的 80% 以上",
      status: "pending",
      author: "Director Wang",
      timecode: "00:02:15",
    },
    {
      id: 2,
      target: "Shot_005_v04",
      type: "technical",
      priority: "P1",
      request: "修正龍鱗材質模糊問題",
      rationale: "Close-up 鏡頭需要更高精度的材質細節",
      acceptance: "鱗片法線貼圖解析度達到 4K",
      status: "completed",
      author: "Supervisor Li",
      timecode: "00:02:18-00:02:22",
    },
    {
      id: 3,
      target: "Sequence_A_Anim_v03",
      type: "rhythm",
      priority: "P2",
      request: "調整角色動作節奏，加快 0.5 秒",
      rationale: "與剪輯節奏不符，需要更緊湊的感覺",
      acceptance: "動作完成時間從 3.2s 降至 2.7s",
      status: "pending",
      author: "PM Chen",
      timecode: "00:01:45",
    },
  ]

  const handleTransform = () => {
    const transformed = `【感謝您的辛苦工作！】

根據最新的參考資料比對，我們整理了以下幾點小調整建議：

✓ [P0 優先] 增強主體 rim light
  - 目的：使角色更突出，增加層次感
  - 完成標準：rim light 強度達到 Reference 的 80% 以上
  - 位置：Shot_005_v04 @ 00:02:15

✓ [P1 次要] 修正龍鱗材質模糊
  - 目的：提升 Close-up 鏡頭的材質細節
  - 完成標準：鱗片法線貼圖解析度達到 4K
  - 位置：Shot_005_v04 @ 00:02:18-00:02:22

這些調整將讓畫面更接近我們理想的效果。如有任何疑問或需要更多參考，請隨時告知！`

    setTransformedNotes(transformed)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <ListChecks className="w-5 h-5" />
            </div>
            <Badge variant="outline">C05</Badge>
            <h1 className="text-3xl font-bold">回饋結構化</h1>
          </div>
          <p className="text-muted-foreground">清單化、圈選標註、語氣轉換</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input & Transform */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Chatbot Clarification - Replaces Tone Transformer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-teal-600" />
                  AI 回饋追問與釐清
                </CardTitle>
                <CardDescription>
                  貼上原始回饋，AI 會主動追問模糊詞彙（如「好醜」「太暗」），轉化成可操作的建議，同時調整語氣風格
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Raw Input */}
                <div className="space-y-2">
                  <Label>原始回饋 / 會議紀錄</Label>
                  <Textarea
                    value={rawNotes}
                    onChange={(e) => setRawNotes(e.target.value)}
                    placeholder="例如：這個鏡頭好醜！太暗了完全看不清楚，光影也不對，需要重做..."
                    className="min-h-[120px] font-mono text-sm"
                  />
                </div>

                {/* Vague Terms Detection with Click-to-Clarify */}
                {rawNotes && (
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div className="text-sm flex-1">
                        <p className="font-medium text-amber-700 mb-2">偵測到模糊詞彙 - 點擊讓 AI 追問釐清：</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className="bg-amber-500/20 text-amber-700 cursor-pointer hover:bg-amber-500/30" 
                            onClick={() => {
                              setClarificationMessages(prev => [...prev, { 
                                role: "ai", 
                                content: "您提到「好醜」，能幫我更具體地了解嗎？\n\n是指：\n1. 色彩搭配不協調？\n2. 構圖比例失衡？\n3. 材質/質感不夠精緻？\n4. 與參考風格差距太大？\n\n請選擇或補充說明。" 
                              }])
                              setShowClarificationChat(true)
                            }}
                          >
                            好醜
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className="bg-amber-500/20 text-amber-700 cursor-pointer hover:bg-amber-500/30" 
                            onClick={() => {
                              setClarificationMessages(prev => [...prev, { 
                                role: "ai", 
                                content: "關於「太暗了」，讓我幫您釐清：\n\n1. 整體曝光不足（需要提升 EV 值）？\n2. 對比度太低，細節看不清？\n3. 特定區域太暗（如臉部、主體）？\n4. 相對於參考圖來說偏暗？\n\n具體是哪種情況？" 
                              }])
                              setShowClarificationChat(true)
                            }}
                          >
                            太暗了
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className="bg-amber-500/20 text-amber-700 cursor-pointer hover:bg-amber-500/30" 
                            onClick={() => {
                              setClarificationMessages(prev => [...prev, { 
                                role: "ai", 
                                content: "「光影不對」可以是很多情況，您指的是：\n\n1. 光源方向錯誤？\n2. 光影軟硬度不符預期？\n3. 色溫/色調不對？\n4. rim light / fill light 強度問題？\n\n能否提供更多細節或參考圖？" 
                              }])
                              setShowClarificationChat(true)
                            }}
                          >
                            不對
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tone Style + Transform */}
                <div className="flex items-end gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>輸出語氣風格</Label>
                    <Select value={toneStyle} onValueChange={setToneStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neutral">中性 Neutral</SelectItem>
                        <SelectItem value="supportive">支持性 Supportive (推薦)</SelectItem>
                        <SelectItem value="firm">堅定 Firm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setShowClarificationChat(true)} variant="outline">
                    <Bot className="w-4 h-4 mr-2" />
                    開啟 AI 追問
                  </Button>
                  <Button onClick={handleTransform}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 轉換
                  </Button>
                </div>

                {/* Transformed Output */}
                {transformedNotes && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label>AI 轉換結果（可編輯）</Label>
                    <Textarea
                      value={transformedNotes}
                      onChange={(e) => setTransformedNotes(e.target.value)}
                      className="min-h-[150px] font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        生成回饋清單
                      </Button>
                      <Button variant="outline" size="sm">複製文字</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feedback Checklist */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>回饋清單</CardTitle>
                    <CardDescription>結構化的回饋項目，每條包含完成定義</CardDescription>
                  </div>
                  <Button size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    發送回饋
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedbackItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.status === "completed" ? "border-green-500/20 bg-green-500/5" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {item.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={
                                  item.priority === "P0"
                                    ? "destructive"
                                    : item.priority === "P1"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {item.priority}
                              </Badge>
                              <Badge variant="outline">{item.type}</Badge>
                              <span className="text-sm text-muted-foreground">{item.target}</span>
                            </div>
                            {item.timecode && (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {item.timecode}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">要改什麼</Label>
                              <p className="text-sm">{item.request}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">為什麼</Label>
                              <p className="text-sm text-muted-foreground">{item.rationale}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">完成定義</Label>
                              <p className="text-sm text-muted-foreground">{item.acceptance}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            {item.author}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Authority & Templates */}
          <div className="space-y-6">
            {/* Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">回饋模板</CardTitle>
                <CardDescription>快速套用常用模板</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-sm bg-transparent">
                  <Sparkles className="w-4 h-4 mr-2" />
                  "Ask a Small Favor" 模板
                </Button>
                <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                  先稱讚 → 小忙說明 → 列點說明 → 感謝收尾
                </div>
              </CardContent>
            </Card>

            {/* Authority Badge */}
            <Card className="border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-sm">權威標記</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">發送前選定最終決策者</Label>
                  <Select defaultValue="director">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="director">Director (最終權威)</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="pm">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="director-badge" />
                  <Label htmlFor="director-badge" className="text-xs cursor-pointer">
                    標記為「Director-final authority」
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Permission */}
            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  權限規則
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• PM 可生成回饋清單</li>
                  <li>• Director/Supervisor 可批准後發送</li>
                  <li>• 每條回饋必須含「要改什麼」+「完成定義」</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Director Review Canvas - Full Width */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-teal-600" />
              Director Review Canvas
            </CardTitle>
            <CardDescription>
              整合 Specs、作品、Reference 對照，可直接圈選標註、AI 分析優先級、潤稿與接受/拒絕回饋
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px] border-t">
              <DirectorFeedbackCanvas
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
      </div>

      {/* AI Clarification Dialog */}
      <Dialog open={showClarificationChat} onOpenChange={setShowClarificationChat}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-600" />
              AI 回饋釐清助手
            </DialogTitle>
            <p className="text-sm text-muted-foreground">幫您將「好醜」「太暗」等模糊詞彙轉換成可操作的具體建議</p>
          </DialogHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {clarificationMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={msg.role === 'ai' ? 'bg-teal-500/10 text-teal-600' : 'bg-primary/10'}>
                      {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : 'D'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`rounded-lg p-3 max-w-[80%] ${msg.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setClarificationInput("我是指對比度不夠")}>
                對比度不夠
              </Button>
              <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setClarificationInput("臉部需要更亮")}>
                臉部更亮
              </Button>
              <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setClarificationInput("整體曝光不足")}>
                曝光不足
              </Button>
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="輸入更具體的說明..." 
                value={clarificationInput}
                onChange={(e) => setClarificationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClarificationSend()}
              />
              <Button size="icon" onClick={handleClarificationSend}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Sidebar Chatbot - Always Visible */}
      <AISidebarChatbot
        context="回饋釐清"
        description="AI 會追問模糊詞彙並轉換成可操作建議"
        suggestedPrompts={["「好醜」是指什麼？", "轉成可操作建議"]}
        initialMessages={[
          {
            role: "ai",
            content: "您好！我是回饋釐清助手。\n\n我會幫您：\n1. 追問模糊詞彙（如「好醜」「太暗」）\n2. 轉換成可操作的具體建議\n\n請貼上原始回饋開始。",
          },
        ]}
      />
    </div>
  )
}
