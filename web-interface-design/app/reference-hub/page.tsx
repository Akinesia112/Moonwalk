"use client"

import { Suspense, useState } from "react"
import { MainNav } from "@/components/main-nav"
import { ProjectSwitcher } from "@/components/project-switcher"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Search, Upload, Grid3x3, LayoutGrid, Star, Lock, ExternalLink, Plus, FileImage, Presentation, MessageSquare, X, Check, Bot, Send, Lightbulb, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import AIChatPanel from "@/components/ai-chat-panel"
import { AISidebarChatbot } from "@/components/ai-sidebar-chatbot"

function ReferenceHubContent() {
  const [budgetN, setBudgetN] = useState([5])
  const [showSlideDiscussion, setShowSlideDiscussion] = useState(false)
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null)
  const [showRefChatbot, setShowRefChatbot] = useState(false)
  const [refChatMessages, setRefChatMessages] = useState([
    { role: "ai", content: "您好！我是 Reference 助手。我會幫助您整理與釐清參考資料。\n\n我注意到目前上傳的參考圖可能需要更多說明：\n\n1. Cyberpunk Lighting Reference - 請問這張圖您想參考的是「光影方向」還是「光影品質（軟硬）」？\n\n2. Character Mood Study - 這張的風格很獨特，但與其他 ref 風格不太一致，請問這是刻意的嗎？" },
  ])
  const [refChatInput, setRefChatInput] = useState("")

  const handleRefChatSend = () => {
    if (!refChatInput.trim()) return
    setRefChatMessages([...refChatMessages, { role: "user", content: refChatInput }])
    setRefChatInput("")
    setTimeout(() => {
      setRefChatMessages(prev => [...prev, { 
        role: "ai", 
        content: "了解！那麼我建議：\n\n1. 為這張 ref 添加更詳細的標註，說明「只參考光影方向，不是色調」\n\n2. 是否能分享一個過去類似專案的案例？這樣能幫助 Artist 更準確理解您的期望。\n\n3. 關於「暖色調」的定義，能否提供一個具體的 K 色溫數值範圍（例如 3200K-4500K）？" 
      }])
    }, 1000)
  }

  const references = [
    { id: 1, title: "Cyberpunk Lighting Reference", stage: "Brief", intent: "lighting", quality: "final", department: "Composition", confidentiality: "internal", isPinned: true },
    { id: 2, title: "Character Mood Study", stage: "Previz", intent: "mood", quality: "final", department: "Concept", confidentiality: "client-sensitive", isPinned: true },
    { id: 3, title: "Material Reference - Metal", stage: "WIP", intent: "material", quality: "final", department: "3D", confidentiality: "internal", isPinned: false },
    { id: 4, title: "Motion Rhythm Example", stage: "Final", intent: "rhythm", quality: "final", department: "Ad", confidentiality: "nda-strict", isPinned: false },
    { id: 5, title: "Color Grading Style", stage: "Brief", intent: "composition", quality: "final", department: "Comp", confidentiality: "internal", isPinned: false },
    { id: 6, title: "VFX Breakdown", stage: "Final", intent: "lighting", quality: "final", department: "FX", confidentiality: "internal", isPinned: false },
  ]

  const slides = [
    { id: 1, title: "Creative Direction Overview", page: 1, hasDiscussion: true },
    { id: 2, title: "Color Palette", page: 2, hasDiscussion: false },
    { id: 3, title: "Reference Examples", page: 3, hasDiscussion: true },
    { id: 4, title: "Technical Requirements", page: 4, hasDiscussion: false },
  ]

  const getConfidentialityColor = (level: string) => {
    switch (level) {
      case "nda-strict": return "text-red-500"
      case "client-sensitive": return "text-amber-500"
      default: return "text-slate-400"
    }
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
                <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30">C02</Badge>
                <h1 className="text-3xl font-bold">參考資料庫 Reference Hub</h1>
              </div>
              <p className="text-muted-foreground">搜集、整理、管理所有專案參考資料</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setShowRefChatbot(true)}>
                <Bot className="w-4 h-4" />
                AI Reference 助手
                <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-600">2</Badge>
              </Button>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                上傳參考
              </Button>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                匯入 URL
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜尋參考資料..." className="pl-9" />
              </div>
            </div>
            <Select>
              <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="brief">Brief</SelectItem>
                <SelectItem value="previz">Previz</SelectItem>
                <SelectItem value="wip">WIP</SelectItem>
                <SelectItem value="final">Final</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="concept">Concept</SelectItem>
                <SelectItem value="3d">3D</SelectItem>
                <SelectItem value="comp">Composition</SelectItem>
                <SelectItem value="fx">FX</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger><SelectValue placeholder="Intent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Intents</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
                <SelectItem value="composition">Composition</SelectItem>
                <SelectItem value="mood">Mood</SelectItem>
                <SelectItem value="material">Material</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm">Final-only</Button>
            <Button variant="outline" size="sm">Internal Only</Button>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="icon"><Grid3x3 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon"><LayoutGrid className="w-4 h-4" /></Button>
            </div>
          </div>
        </Card>

        {/* Reference Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {references.map((ref) => (
            <Card key={ref.id} className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer group">
              <div className="aspect-video bg-gradient-to-br from-teal-500/20 to-cyan-500/20 relative">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-4xl font-bold opacity-20">{ref.id}</div>
                </div>
                {ref.confidentiality === "nda-strict" && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="destructive" className="gap-1"><Lock className="w-3 h-3" />NDA</Badge>
                  </div>
                )}
                {ref.isPinned && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-amber-500 text-white">Main Ref</Badge>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{ref.title}</h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline" className="text-xs">{ref.stage}</Badge>
                  <Badge variant="secondary" className="text-xs">{ref.department}</Badge>
                  <Badge variant="secondary" className="text-xs capitalize">{ref.intent}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Lock className={`w-3 h-3 ${getConfidentialityColor(ref.confidentiality)}`} />
                    <span className="text-xs text-muted-foreground capitalize">{ref.confidentiality}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7">
                    <Star className="w-3 h-3 mr-1" />
                    Pin
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Spec Canvas Section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <FileImage className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <CardTitle>專案情境與 Spec Canvas</CardTitle>
                <CardDescription>設定分析的專案背景、參考與標準規格</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="context" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="context">專案情境</TabsTrigger>
                <TabsTrigger value="spec">Spec Canvas</TabsTrigger>
                <TabsTrigger value="slides">客戶 Slides</TabsTrigger>
              </TabsList>

              <TabsContent value="context" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project / Sequence / Shot</Label>
                    <Select defaultValue="shot_005">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shot_005">Chronos Legacy / SEQ_A / Shot_005</SelectItem>
                        <SelectItem value="shot_006">Chronos Legacy / SEQ_A / Shot_006</SelectItem>
                        <SelectItem value="shot_007">Chronos Legacy / SEQ_B / Shot_001</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Task / Stage</Label>
                    <Select defaultValue="wip">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wip">WIP (Work in Progress)</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select defaultValue="compositing">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compositing">Compositing</SelectItem>
                        <SelectItem value="lighting">Lighting</SelectItem>
                        <SelectItem value="animation">Animation</SelectItem>
                        <SelectItem value="fx">FX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ref Pack</Label>
                    <Select defaultValue="lighting">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lighting">Lighting Pack</SelectItem>
                        <SelectItem value="composition">Composition Pack</SelectItem>
                        <SelectItem value="color">Color Pack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Budget-Aware Filter (回傳 Top N Issues)</Label>
                  <div className="flex items-center gap-4">
                    <Slider value={budgetN} onValueChange={setBudgetN} max={20} min={1} step={1} className="flex-1" />
                    <span className="text-sm font-medium w-16 text-right">Top {budgetN}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">限制回傳的 Issue 數量，避免 feedback 過多</p>
                </div>
              </TabsContent>

              <TabsContent value="spec" className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 border-2 border-dashed border-amber-500/50 bg-amber-500/5">
                    <div className="text-center">
                      <Badge className="mb-2 bg-amber-500">Main Ref 1 *</Badge>
                      <div className="aspect-video bg-muted rounded-lg mb-2 flex items-center justify-center">
                        <Plus className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">必填 - 主要參考</p>
                    </div>
                  </Card>
                  <Card className="p-4 border-2 border-dashed border-amber-500/50 bg-amber-500/5">
                    <div className="text-center">
                      <Badge className="mb-2 bg-amber-500">Main Ref 2 *</Badge>
                      <div className="aspect-video bg-muted rounded-lg mb-2 flex items-center justify-center">
                        <Plus className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">必填 - 次要參考</p>
                    </div>
                  </Card>
                  <Card className="p-4 border-2 border-dashed">
                    <div className="text-center">
                      <Badge variant="outline" className="mb-2">Secondary Ref</Badge>
                      <div className="aspect-video bg-muted rounded-lg mb-2 flex items-center justify-center">
                        <Plus className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">選填 - 補充參考</p>
                    </div>
                  </Card>
                </div>
                <div className="space-y-2">
                  <Label>Spec 規格說明 *</Label>
                  <Textarea placeholder="描述這個鏡頭的規格要求、技術標準..." rows={3} />
                  <p className="text-xs text-muted-foreground">必填 - 說明期望的技術規格與品質標準</p>
                </div>
              </TabsContent>

              <TabsContent value="slides" className="mt-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">客戶簡報 Slides</h4>
                    <p className="text-sm text-muted-foreground">上傳客戶簡報，邊討論邊加入 Reference</p>
                  </div>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    上傳 PDF/PPT
                  </Button>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  {slides.map((slide) => (
                    <Card 
                      key={slide.id} 
                      className={`p-3 cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${selectedSlide === slide.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => {
                        setSelectedSlide(slide.id)
                        setShowSlideDiscussion(true)
                      }}
                    >
                      <div className="aspect-[4/3] bg-muted rounded mb-2 flex items-center justify-center">
                        <Presentation className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-xs font-medium truncate">{slide.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Page {slide.page}</span>
                        {slide.hasDiscussion && (
                          <Badge variant="secondary" className="text-[10px] px-1">
                            <MessageSquare className="w-3 h-3 mr-0.5" />
                            討論
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Slide Discussion Dialog */}
                <Dialog open={showSlideDiscussion} onOpenChange={setShowSlideDiscussion}>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Slide Discussion - Page {selectedSlide}</DialogTitle>
                      <DialogDescription>邊討論邊標記，可直接加入 Reference Hub</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
                        <Presentation className="w-16 h-16 text-muted-foreground" />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>討論筆記</Label>
                          <Textarea placeholder="記錄討論內容..." rows={4} />
                        </div>
                        <div className="space-y-2">
                          <Label>從此頁加入 Reference</Label>
                          <div className="flex gap-2">
                            <Select>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="選擇參考用途" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lighting">Lighting Reference</SelectItem>
                                <SelectItem value="composition">Composition Reference</SelectItem>
                                <SelectItem value="color">Color Reference</SelectItem>
                                <SelectItem value="mood">Mood Reference</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button>
                              <Plus className="w-4 h-4 mr-1" />
                              加入 Ref Hub
                            </Button>
                          </div>
                        </div>
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">已標記的 References</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">Lighting Reference from Page 3</span>
                              <Check className="w-4 h-4 text-green-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Load More */}
        <div className="mt-8 text-center">
          <Button variant="outline">載入更多 Load More</Button>
        </div>
      </div>

      {/* AI Reference Chatbot Dialog */}
      <Dialog open={showRefChatbot} onOpenChange={setShowRefChatbot}>
        <DialogContent className="sm:max-w-[600px] h-[700px] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-600" />
              AI Reference 助手
            </DialogTitle>
            <p className="text-sm text-muted-foreground">幫助您釐清參考資料的用途、找到更多合適的 reference、確保風格一致性</p>
          </DialogHeader>
          
          {/* Tips Banner */}
          <div className="px-6 py-3 bg-teal-500/10 border-b">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-teal-700">
                <p className="font-medium mb-1">提供給導演的建議：</p>
                <ul className="space-y-0.5 text-teal-600">
                  <li>• 為每張 ref 說明「要參考什麼」（光影/構圖/氛圍）</li>
                  <li>• 分享過去類似專案的經驗作為參考</li>
                  <li>• 說明背後的邏輯（物理現象/戲劇需求）</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Common Mistakes Alert */}
          <div className="px-6 py-2 bg-amber-500/10 border-b">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700">
                <p className="font-medium">常見問題提醒：</p>
                <p className="text-amber-600">ref 圖風格不一致 / 說明太抽象 / Reference 標準抓不到</p>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {refChatMessages.map((msg, idx) => (
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
              <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setRefChatInput("這張 ref 我想參考的是光影方向")}>
                光影方向
              </Button>
              <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setRefChatInput("幫我找更多類似風格的參考")}>
                找更多 ref
              </Button>
              <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setRefChatInput("這是我過去專案的經驗...")}>
                分享經驗
              </Button>
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="輸入問題或說明..." 
                value={refChatInput}
                onChange={(e) => setRefChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRefChatSend()}
              />
              <Button size="icon" onClick={handleRefChatSend}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Sidebar Chatbot - Always Visible */}
      <AISidebarChatbot
        context="Reference Hub"
        description="AI 會追問 Ref 的用途與風格一致性"
        suggestedPrompts={["這張 ref 參考光影", "幫我找更多類似風格"]}
        initialMessages={[
          {
            role: "ai",
            content: "您好！我是 Reference 助手。\n\n我注意到目前的參考圖可能需要更多說明：\n\n1. 這張圖您想參考的是「光影」還是「構圖」？\n2. 這張的風格與其他 ref 不太一致，是刻意的嗎？",
          },
        ]}
      />
    </div>
  )
}

export default function ReferenceHubPage() {
  return (
    <Suspense fallback={null}>
      <ReferenceHubContent />
    </Suspense>
  )
}
