"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Send, Bot, ChevronRight, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export default function KickoffPage() {
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [specAnalyzed, setSpecAnalyzed] = useState(false)
  const [analyzingSpec, setAnalyzingSpec] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([
    { role: "ai", content: "您好！我是 AI 追問助手。我注意到目前的 Brief 還有一些資訊可能需要補充。請問：\n\n1. 交付日期是什麼時候？\n2. 主要的參考風格有確定了嗎？\n3. 「溫暖氛圍」具體是指色溫 3200K 還是視覺上的暖色調？" },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [kickoffSubmitted, setKickoffSubmitted] = useState(false)

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return
    setChatMessages([...chatMessages, { role: "user", content: inputMessage }])
    setInputMessage("")
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: "ai", 
        content: "了解！我已記錄這些資訊。還有幾個建議確認的項目：\n\n- 色彩空間是否確定為 sRGB？\n- 節奏風格偏向快節奏還是慢節奏？\n- 有任何禁忌事項嗎？",
      }])
    }, 1000)
  }

  const handleAnalyzeSpec = () => {
    setAnalyzingSpec(true)
    setTimeout(() => {
      setAnalyzingSpec(false)
      setSpecAnalyzed(true)
      setChatMessages(prev => [...prev, {
        role: "ai",
        content: "Spec 分析完成！\n\n我發現以下需要確認的項目：\n- 「溫暖氛圍」定義仍較模糊，建議加上色溫數值範圍\n- 禁忌事項欄位尚未填寫\n- 風格關鍵字與情緒關鍵詞有部分重疊，建議區分\n\n所有必填項目已填寫完成，可以 Submit 了。",
      }])
    }, 1500)
  }

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form - 2 columns */}
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

                {/* Merged: Client Goals + Visual Direction + Supervisor Spec */}
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
                      <Textarea id="selling-points" placeholder="客戶想強調的產品特色..." rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="keywords">情緒關鍵詞</Label>
                      <Input id="keywords" placeholder="例如：活潑、詭譎、溫暖、未來感..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restrictions">禁忌事項</Label>
                      <Textarea id="restrictions" placeholder="不可出現的元素、顏色、風格..." rows={2} />
                    </div>
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
                      <Textarea id="worldview" placeholder="描述整體的視覺世界觀..." rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rhythm">節奏（若為影片）</Label>
                      <Select>
                        <SelectTrigger id="rhythm"><SelectValue placeholder="選擇節奏風格" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fast">快節奏 Fast-paced</SelectItem>
                          <SelectItem value="medium">中速 Medium</SelectItem>
                          <SelectItem value="slow">慢節奏 Slow/Cinematic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border-t border-teal-500/20 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="director-spec">Supervisor Spec 額外補充說明 (自由輸入)</Label>
                        <Textarea 
                          id="director-spec" 
                          placeholder={"在此輸入任何額外的 Spec 說明...\n\n例如：\n- 主角的眼神要有「被背叛後的憤怒」\n- 光線要像《某某電影》第三幕的氛圍"}
                          rows={6} 
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <AlertCircle className="w-3 h-3" />
                        <span>AI 會根據此欄位追問更具體的定義與參考</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions: Analyze Spec + Submit */}
                <div className="flex items-center gap-3">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className={`flex-1 ${specAnalyzed ? 'border-green-500 text-green-600 bg-green-500/10' : 'bg-transparent'}`}
                    onClick={handleAnalyzeSpec}
                    disabled={analyzingSpec}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {analyzingSpec ? "分析中..." : specAnalyzed ? "Spec 分析完成" : "開始分析 Spec"}
                  </Button>
                  <Button 
                    size="lg" 
                    className={`flex-1 transition-colors ${!specAnalyzed ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted' : kickoffSubmitted ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                    disabled={!specAnalyzed}
                    onClick={() => setKickoffSubmitted(true)}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {kickoffSubmitted ? "Submitted" : "Submit & Save to DB"}
                  </Button>
                </div>
                <Button size="lg" variant="outline" className="w-full bg-transparent" asChild>
                  <a href="/reference-hub">
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Jump to Reference Hub
                  </a>
                </Button>
              </div>

              {/* Right Sidebar - AI Chatbot */}
              <div>
                <Card className="border-teal-500/30 flex flex-col sticky top-8" style={{ height: 'calc(100vh - 220px)' }}>
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
                            <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">2</Badge>
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
