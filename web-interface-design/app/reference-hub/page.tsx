"use client"

import { Suspense, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Upload, Star, Lock, ExternalLink, FileImage, ChevronRight, Bot, Send, Lightbulb, AlertCircle, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

function ReferenceHubContent() {
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [refChatMessages, setRefChatMessages] = useState<{role: string; content: string; image?: string}[]>([
    { role: "ai", content: "您好！我是 Reference 助手。我會幫助您整理與釐清參考資料。\n\n我注意到目前上傳的參考圖可能需要更多說明：\n\n1. Cyberpunk Lighting Reference - 請問這張圖您想參考的是「光影方向」還是「光影品質（軟硬）」？\n\n2. Character Mood Study - 這張的風格很獨特，但與其他 ref 風格不太一致，請問這是刻意的嗎？" },
  ])
  const [refChatInput, setRefChatInput] = useState("")
  const seedFileInputRef = useRef<HTMLInputElement>(null)
  const [seedSubmitted, setSeedSubmitted] = useState(false)
  const [pageSubmitted, setPageSubmitted] = useState(false)

  // Reference seeds state
  const [seed1Priority, setSeed1Priority] = useState("main")
  const [seed1Category, setSeed1Category] = useState("lighting")
  const [seed1Note, setSeed1Note] = useState("")
  const [seed2Priority, setSeed2Priority] = useState("main")
  const [seed2Category, setSeed2Category] = useState("composition")
  const [seed2Note, setSeed2Note] = useState("")

  const handleSubmitSeeds = () => {
    const categoryMap: Record<string, string> = { lighting: "Lighting", color: "Color", composition: "Composition", style: "Style", texture: "Texture", mood: "Mood", motion: "Motion", vfx: "VFX" }
    const nextId = Math.max(...references.map(r => r.id)) + 1
    const newRefs = [
      { id: nextId, title: "Client Ref - Cyberpunk City", confidentiality: "client-sensitive" as const, isPinned: seed1Priority === "main", category: categoryMap[seed1Category] || "Lighting", note: seed1Note || "參考光影方向" },
      { id: nextId + 1, title: "Client Ref - Composition Study", confidentiality: "client-sensitive" as const, isPinned: seed2Priority === "main", category: categoryMap[seed2Category] || "Composition", note: seed2Note || "參考構圖比例" },
    ]
    setReferences(prev => [...newRefs, ...prev])
    setSeedSubmitted(true)
  }

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

  const refCategories = ["Lighting", "Color", "Composition", "Style", "Texture", "Motion", "Mood", "VFX"]

  const [references, setReferences] = useState([
    { id: 1, title: "Cyberpunk Lighting Reference", confidentiality: "internal", isPinned: true, category: "Lighting", note: "參考光影方向，主光從右側硬光" },
    { id: 2, title: "Character Mood Study", confidentiality: "client-sensitive", isPinned: true, category: "Mood", note: "角色情緒氛圍，壓抑的張力感" },
    { id: 3, title: "Material Reference - Metal", confidentiality: "internal", isPinned: false, category: "Texture", note: "" },
    { id: 4, title: "Motion Rhythm Example", confidentiality: "nda-strict", isPinned: false, category: "Motion", note: "" },
    { id: 5, title: "Color Grading Style", confidentiality: "internal", isPinned: false, category: "Color", note: "" },
    { id: 6, title: "VFX Breakdown", confidentiality: "internal", isPinned: false, category: "VFX", note: "" },
  ])

  const updateRefField = (id: number, field: string, value: string) => {
    setReferences(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const categoryColors: Record<string, string> = {
    Lighting: "bg-amber-500/20 text-amber-700 border-amber-500/30",
    Color: "bg-pink-500/20 text-pink-700 border-pink-500/30",
    Composition: "bg-blue-500/20 text-blue-700 border-blue-500/30",
    Style: "bg-purple-500/20 text-purple-700 border-purple-500/30",
    Texture: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
    Motion: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
    Mood: "bg-indigo-500/20 text-indigo-700 border-indigo-500/30",
    VFX: "bg-red-500/20 text-red-700 border-red-500/30",
  }

  const getConfidentialityColor = (level: string) => {
    switch (level) {
      case "nda-strict": return "text-red-500"
      case "client-sensitive": return "text-amber-500"
      default: return "text-slate-400"
    }
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30">C02</Badge>
                    <h1 className="text-3xl font-bold">參考資料庫 Reference Hub</h1>
                  </div>
                  <p className="text-muted-foreground">搜集、整理、管理所有專案參考資料</p>
                </div>
                <div className="flex gap-2">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    上傳參考
                  </Button>
                  <Button variant="outline" className="bg-transparent">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    匯入 URL
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Main Content - 2 cols */}
              <div className="lg:col-span-2 space-y-6">
                {/* Initial References from Client - MOVED TO TOP */}
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-amber-600" />
                      初始參考 Reference Seed (from Client)
                    </CardTitle>
                    <CardDescription>客戶提供的初始參考圖 - 導演需解釋每張圖要看什麼元素</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="border-2 border-amber-500/50 bg-amber-500/5 rounded-lg overflow-hidden">
                        <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                          <img src="/reference-movie-frame.jpg" alt="Client Ref 1" className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2 space-y-1.5">
                          <Select value={seed1Priority} onValueChange={setSeed1Priority}>
                            <SelectTrigger className="h-6 text-[11px] w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main">Main Ref</SelectItem>
                              <SelectItem value="secondary">Secondary</SelectItem>
                              <SelectItem value="supplementary">Supplementary</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={seed1Category} onValueChange={setSeed1Category}>
                            <SelectTrigger className="h-6 text-[11px] w-full">
                              <SelectValue placeholder="選擇參考面向" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lighting">光影 Lighting</SelectItem>
                              <SelectItem value="color">色彩 Color</SelectItem>
                              <SelectItem value="composition">構圖 Composition</SelectItem>
                              <SelectItem value="style">風格 Style</SelectItem>
                              <SelectItem value="texture">材質 Texture</SelectItem>
                              <SelectItem value="mood">氛圍 Mood</SelectItem>
                              <SelectItem value="motion">動態 Motion</SelectItem>
                              <SelectItem value="vfx">VFX</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="Note: 參考光影方向、不是色調..." className="text-[11px] h-6" value={seed1Note} onChange={(e) => setSeed1Note(e.target.value)} />
                        </div>
                      </div>
                      <div className="border-2 border-amber-500/50 bg-amber-500/5 rounded-lg overflow-hidden">
                        <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                          <img src="/composition-reference.jpg" alt="Client Ref 2" className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2 space-y-1.5">
                          <Select value={seed2Priority} onValueChange={setSeed2Priority}>
                            <SelectTrigger className="h-6 text-[11px] w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main">Main Ref</SelectItem>
                              <SelectItem value="secondary">Secondary</SelectItem>
                              <SelectItem value="supplementary">Supplementary</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={seed2Category} onValueChange={setSeed2Category}>
                            <SelectTrigger className="h-6 text-[11px] w-full">
                              <SelectValue placeholder="選擇參考面向" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lighting">光影 Lighting</SelectItem>
                              <SelectItem value="color">色彩 Color</SelectItem>
                              <SelectItem value="composition">構圖 Composition</SelectItem>
                              <SelectItem value="style">風格 Style</SelectItem>
                              <SelectItem value="texture">材質 Texture</SelectItem>
                              <SelectItem value="mood">氛圍 Mood</SelectItem>
                              <SelectItem value="motion">動態 Motion</SelectItem>
                              <SelectItem value="vfx">VFX</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="Note: 參考構圖比例..." className="text-[11px] h-6" value={seed2Note} onChange={(e) => setSeed2Note(e.target.value)} />
                        </div>
                      </div>
                      <div className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors min-h-[140px]" onClick={() => seedFileInputRef.current?.click()}>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">上傳更多初始參考</p>
                        <input ref={seedFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { /* handle file upload */ }} />
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Button size="sm" variant="outline" className={seedSubmitted ? "bg-green-600 border-green-600 text-white hover:bg-green-700" : "bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20"} onClick={handleSubmitSeeds}>
                        <Plus className="w-3 h-3 mr-1" />
                        {seedSubmitted ? "已加入" : "加入下方 References"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Reference Grid */}
                <ScrollArea style={{ maxHeight: '400px' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                  {references.map((ref) => (
                    <Card key={ref.id} className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all group cursor-pointer" onClick={() => {
                      setRefChatMessages(prev => [...prev, { role: "user", content: `[點擊參考] ${ref.title} (${ref.category}) - ${ref.note || "無備註"}`, image: undefined }])
                      setTimeout(() => {
                        setRefChatMessages(prev => [...prev, { role: "ai", content: `關於「${ref.title}」(${ref.category})：\n\n我注意到這張圖${ref.isPinned ? "是 Main Reference，" : ""}${ref.note ? `備註為「${ref.note}」。\n\n` : "目前沒有備註。\n\n"}幾個值得釐清的點：\n1. 您希望參考這張圖的哪個面向？\n2. 有沒有「不要參考」的部分？\n3. 與其他 reference 之間的優先序如何？` }])
                      }, 600)
                    }}>
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
                        {ref.category && (
                          <div className="absolute bottom-2 left-2">
                            <Badge className={`text-[10px] ${categoryColors[ref.category] || "bg-muted"}`}>{ref.category}</Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{ref.title}</h3>
                        <div className="flex items-center gap-2">
                          <Select value={ref.category} onValueChange={(v) => updateRefField(ref.id, "category", v)}>
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {refCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select defaultValue={ref.isPinned ? "main" : "secondary"}>
                            <SelectTrigger className="w-24 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main">Main Ref</SelectItem>
                              <SelectItem value="secondary">Secondary</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          placeholder="Note: 這張要看什麼..."
                          value={ref.note}
                          onChange={(e) => updateRefField(ref.id, "note", e.target.value)}
                          className="text-xs h-7"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
                </ScrollArea>

              </div>

              {/* Right Sidebar - AI Reference Chatbot */}
              <div>
                <Card className="border-teal-500/30 flex flex-col sticky top-8" style={{ height: 'calc(100vh - 220px)' }}>
                  <Collapsible open={chatbotOpen} onOpenChange={setChatbotOpen} className="flex flex-col flex-1 min-h-0">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-teal-600" />
                            <div>
                              <CardTitle className="text-base">AI Reference 助手</CardTitle>
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
                        <div className="py-2 bg-teal-500/10 rounded-lg mb-3 px-3 shrink-0">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-teal-700">
                              <p className="font-medium mb-1">建議：</p>
                              <ul className="space-y-0.5 text-teal-600">
                                <li>{"- 為每張 ref 說明「要參考什麼」"}</li>
                                <li>{"- 說明背後的邏輯"}</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <ScrollArea className="flex-1 min-h-0 mb-4">
                          <div className="space-y-4 pr-2">
                            {refChatMessages.map((msg, idx) => (
                              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className={msg.role === 'ai' ? 'bg-teal-500/10 text-teal-600' : 'bg-primary/10'}>
                                    {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : 'D'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                                  {msg.image && (
                                    <div className="mb-2 rounded overflow-hidden">
                                      <img src={msg.image} alt="reference" className="w-full h-24 object-cover rounded" />
                                    </div>
                                  )}
                                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <div className="flex gap-2 flex-wrap mb-3 shrink-0">
                          <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setRefChatInput("這張 ref 我想參考的是光影方向")}>
                            光影方向
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setRefChatInput("幫我找更多類似風格的參考")}>
                            找更多 ref
                          </Button>
                        </div>
                        <div className="flex gap-2 shrink-0">
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
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            </div>

            {/* Submit & Jump Buttons - below all content */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button size="lg" className={pageSubmitted ? "bg-green-600 hover:bg-green-700 text-white" : ""} onClick={() => setPageSubmitted(true)}>
                <Upload className="w-4 h-4 mr-2" />
                {pageSubmitted ? "Submitted" : "Submit"}
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent" asChild>
                <a href="/artist-reflection">
                  {'Jump to C03 Reflection'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

          </div>
        </main>
      </div>
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
