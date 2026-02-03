"use client"

import { useState } from "react"
import { MainNav } from "@/components/main-nav"
import { ProjectSwitcher } from "@/components/project-switcher"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Upload, MessageSquare, Settings, Send, Bot, ChevronRight, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AIChatPanel } from "@/components/ai-chat-panel"
import { AISidebarChatbot } from "@/components/ai-sidebar-chatbot"

export default function KickoffPage() {
  const [showChatbot, setShowChatbot] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", content: "您好！我是 AI 助手。我注意到目前的 Brief 還有一些資訊可能需要補充。請問：\n\n1. 交付日期是什麼時候？\n2. 主要的參考風格有確定了嗎？" },
  ])
  const [inputMessage, setInputMessage] = useState("")

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return
    setChatMessages([...chatMessages, { role: "user", content: inputMessage }])
    setInputMessage("")
    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: "ai", 
        content: "了解！我已記錄這些資訊。還有幾個建議確認的項目：\n\n- 色彩空間是否確定為 sRGB？\n- 是否有任何技術限制需要注意？" 
      }])
    }, 1000)
  }

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30">C01</Badge>
                <h1 className="text-3xl font-bold">專案啟動與 Brief 對焦</h1>
              </div>
              <p className="text-muted-foreground">Project Kickoff & Brief Alignment - 源頭資訊匯入、避免模糊焦點</p>
            </div>
            <div className="flex gap-2">
              {/* AI Chatbot Button */}
              <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setShowChatbot(true)}>
                <MessageSquare className="w-4 h-4" />
                AI 追問助手
                <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-600">2</Badge>
              </Button>
              {/* Settings Drawer */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Brief Settings</SheetTitle>
                    <SheetDescription>進階設定與偏好</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">AI 助手設定</h4>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-check">自動檢查遺漏項目</Label>
                        <Switch id="auto-check" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="suggest">智慧建議</Label>
                        <Switch id="suggest" defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">通知設定</h4>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify-incomplete">不完整時提醒</Label>
                        <Switch id="notify-incomplete" defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">預設值</h4>
                      <div className="space-y-2">
                        <Label>預設色彩空間</Label>
                        <Select defaultValue="srgb">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="srgb">sRGB</SelectItem>
                            <SelectItem value="rec709">Rec. 709</SelectItem>
                            <SelectItem value="aces">ACES</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Ambiguity Warnings */}
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            <strong>提醒：</strong>規格尺寸、交付日期、參考點為必填項目。確保一開始不要做錯。
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
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
                    <Input id="project-name" placeholder="輸入專案名稱" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">客戶 *</Label>
                    <Input id="client" placeholder="客戶名稱" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="director">導演/創意總監</Label>
                    <Input id="director" placeholder="導演名稱" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisor">Supervisor</Label>
                    <Input id="supervisor" placeholder="負責 Supervisor" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confidentiality">密等 Confidentiality</Label>
                  <Select defaultValue="internal">
                    <SelectTrigger id="confidentiality">
                      <SelectValue />
                    </SelectTrigger>
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

            {/* Client Goals */}
            <Card>
              <CardHeader>
                <CardTitle>客戶目標 Client Goals</CardTitle>
                <CardDescription>產品賣點、情緒關鍵詞、禁忌事項</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="selling-points">產品賣點/重點訊息</Label>
                  <Textarea id="selling-points" placeholder="客戶想強調的產品特色、希望傳達的訊息..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">情緒關鍵詞</Label>
                  <Input id="keywords" placeholder="例如：活潑、詭譎、溫暖、未來感..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restrictions">禁忌事項</Label>
                  <Textarea id="restrictions" placeholder="不可出現的元素、顏色、風格..." rows={2} />
                </div>
              </CardContent>
            </Card>

            {/* Visual Direction */}
            <Card>
              <CardHeader>
                <CardTitle>視覺方向 Visual Direction</CardTitle>
                <CardDescription>風格、色調、材質、世界觀</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="style">風格關鍵字</Label>
                    <Input id="style" placeholder="寫實、插畫、賽博龐克..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mood">色調/氛圍</Label>
                    <Input id="mood" placeholder="暖色調、冷色調、高對比..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worldview">世界觀/概念</Label>
                  <Textarea id="worldview" placeholder="描述整體的視覺世界觀..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rhythm">節奏（若為影片）</Label>
                  <Select>
                    <SelectTrigger id="rhythm">
                      <SelectValue placeholder="選擇節奏風格" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">快節奏 Fast-paced</SelectItem>
                      <SelectItem value="medium">中速 Medium</SelectItem>
                      <SelectItem value="slow">慢節奏 Slow/Cinematic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Director Spec - Extra Notes */}
            <Card className="border-teal-500/30 bg-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-teal-500 text-white text-xs flex items-center justify-center font-bold">D</span>
                  Director Spec 額外補充說明
                </CardTitle>
                <CardDescription>導演可以在此填入任何想說的規格說明、特別要求、或補充資訊</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="director-spec">額外說明 (自由輸入)</Label>
                  <Textarea 
                    id="director-spec" 
                    placeholder="在此輸入任何額外的 Spec 說明...&#10;&#10;例如：&#10;- 主角的眼神要有「被背叛後的憤怒」&#10;- 光線要像《乙乙一一》第三幕的氛圍&#10;- 龍的材質要有「歲月感」但不要太舊&#10;- 動態節奏參考某某 MV 的剪接風格" 
                    rows={6} 
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="w-3 h-3" />
                  <span>AI 會根據此欄位追問更具體的定義與參考</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Deliverables */}
            <Card>
              <CardHeader>
                <CardTitle>交付規格 Deliverables</CardTitle>
                <CardDescription>格式、尺寸、截止日期</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="format">格式 *</Label>
                  <Select>
                    <SelectTrigger id="format">
                      <SelectValue placeholder="選擇格式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image (PNG/JPG)</SelectItem>
                      <SelectItem value="video">Video (MP4/MOV)</SelectItem>
                      <SelectItem value="sequence">Sequence (EXR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">寬度 *</Label>
                    <Input id="width" type="number" placeholder="1920" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">高度 *</Label>
                    <Input id="height" type="number" placeholder="1080" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fps">FPS (if video)</Label>
                  <Input id="fps" type="number" placeholder="24" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colorspace">色域</Label>
                  <Select defaultValue="srgb">
                    <SelectTrigger id="colorspace">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="srgb">sRGB</SelectItem>
                      <SelectItem value="rec709">Rec. 709</SelectItem>
                      <SelectItem value="p3">DCI-P3</SelectItem>
                      <SelectItem value="aces">ACES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">交付日期 *</Label>
                  <Input id="deadline" type="date" />
                </div>
              </CardContent>
            </Card>

            {/* Reference Seed */}
            <Card>
              <CardHeader>
                <CardTitle>初始參考 Reference Seed</CardTitle>
                <CardDescription>客戶提供的初始參考圖</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" size="lg">
                  <Upload className="w-4 h-4 mr-2" />
                  上傳參考圖
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  每張 Ref 需標註「要參考什麼」（光影/構圖/氛圍/材質/動態）
                </p>
              </CardContent>
            </Card>

            {/* Constraints */}
            <Card>
              <CardHeader>
                <CardTitle>限制條件 Constraints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">預算</Label>
                  <Input id="budget" placeholder="預算範圍" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech-constraints">技術限制</Label>
                  <Textarea id="tech-constraints" placeholder="例如：必須 UE5、不可用真人拍攝..." rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button size="lg" className="w-full">
                送出審核 Submit for Approval
              </Button>
              <Button size="lg" variant="outline" className="w-full bg-transparent">
                儲存草稿 Save Draft
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Clarification Chatbot Dialog */}
      <Dialog open={showChatbot} onOpenChange={setShowChatbot}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-600" />
              AI Clarification Chat
            </DialogTitle>
            <DialogDescription>AI 會追問可能遺漏的 spec 資訊</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={msg.role === 'ai' ? 'bg-teal-500/10 text-teal-600' : 'bg-primary/10'}>
                      {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`rounded-lg p-3 max-w-[80%] ${msg.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input 
                placeholder="輸入回覆..." 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button size="icon" onClick={handleSendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Sidebar Chatbot - Always Visible */}
      <AISidebarChatbot
        context="Brief/Spec"
        description="AI 會追問可能遺漏的 spec 資訊"
        suggestedPrompts={["檢查遺漏項目", "這是必須還是偏好？"]}
        initialMessages={[
          {
            role: "ai",
            content: "您好！我是 AI 助手。我注意到目前的 Brief 還有一些資訊可能需要補充。請問：\n\n1. 交付日期是什麼時候？\n2. 主要的參考風格有確定了嗎？",
          },
        ]}
      />
    </div>
  )
}
