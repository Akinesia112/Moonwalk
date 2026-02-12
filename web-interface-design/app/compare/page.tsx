"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  GitCompare, SlidersHorizontal, AlertCircle, CheckCircle2, ArrowLeftRight,
  Flag, MessageSquare, Send, ChevronRight, ChevronDown, ChevronUp, Bot,
  ZoomIn, ZoomOut, RotateCcw,
} from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export default function ComparePage() {
  const [compareMode, setCompareMode] = useState("split")
  const [sliderValue, setSliderValue] = useState([50])
  const [selectedArtwork, setSelectedArtwork] = useState(0)
  const [selectedRef, setSelectedRef] = useState(0)
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([
    { role: "ai", content: "您好！我是對照比較助手。\n\n選擇 Artwork 和 Reference 後，我會分析差異。\n\n勾選差距清單項目後，我會自動針對該差異進行追問。有疑慮可點「上報導演」。" },
  ])
  const [chatInput, setChatInput] = useState("")
  const [checkedDeltas, setCheckedDeltas] = useState<string[]>([])
  const [artworkZoom, setArtworkZoom] = useState(1)
  const [refZoom, setRefZoom] = useState(1)
  const [deltaAnnotations, setDeltaAnnotations] = useState<Record<string, string>>({})
  const [expandedAnnotation, setExpandedAnnotation] = useState<string | null>(null)
  const [compareSubmitted, setCompareSubmitted] = useState(false)

  const handleArtworkZoomIn = () => setArtworkZoom(prev => Math.min(prev + 0.25, 3))
  const handleArtworkZoomOut = () => setArtworkZoom(prev => Math.max(prev - 0.25, 0.5))
  const handleArtworkZoomReset = () => setArtworkZoom(1)
  const handleRefZoomIn = () => setRefZoom(prev => Math.min(prev + 0.25, 3))
  const handleRefZoomOut = () => setRefZoom(prev => Math.max(prev - 0.25, 0.5))
  const handleRefZoomReset = () => setRefZoom(1)

  const handleChatSend = () => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [...prev, { role: "user", content: chatInput }])
    setChatInput("")
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: "ai", 
        content: "了解您的觀點！讓我重新分析：\n\n根據您的說明，這是刻意的藝術選擇。我會在報告中標註「Artist intentional deviation」。\n\n是否還有其他項目需要說明？" 
      }])
    }, 1000)
  }

  // Artworks row
  const artworks = [
    { id: 0, name: "Shot_005_v04", image: "/vfx-work-in-progress-shot.jpg" },
    { id: 1, name: "Shot_005_v03", image: "/reference-movie-frame.jpg" },
    { id: 2, name: "Shot_012_v02", image: "/composition-reference.jpg" },
    { id: 3, name: "Shot_008_v03", image: "/lighting-setup-reference.png" },
  ]

  // References per artwork
  const refsPerArtwork: Record<number, {id: number; name: string; image: string}[]> = {
    0: [
      { id: 0, name: "Lighting Ref", image: "/reference-movie-frame.jpg" },
      { id: 1, name: "Composition Ref", image: "/composition-reference.jpg" },
      { id: 2, name: "Color Ref", image: "/lighting-setup-reference.png" },
    ],
    1: [
      { id: 0, name: "Motion Ref", image: "/composition-reference.jpg" },
      { id: 1, name: "Style Ref", image: "/lighting-setup-reference.png" },
    ],
    2: [
      { id: 0, name: "Mood Ref", image: "/reference-movie-frame.jpg" },
    ],
    3: [
      { id: 0, name: "Texture Ref", image: "/reference-movie-frame.jpg" },
      { id: 1, name: "Detail Ref", image: "/composition-reference.jpg" },
    ],
  }

  const currentRefs = refsPerArtwork[selectedArtwork] || []

  const deltas = [
    { id: "d1", type: "構圖", severity: "medium", detail: "主體位置偏右 15%" },
    { id: "d2", type: "光影", severity: "high", detail: "高光不足，建議增強 rim light" },
    { id: "d3", type: "色調", severity: "low", detail: "暖色調偏弱，建議色溫 -500K" },
  ]

  const handleDeltaCheck = (deltaId: string, checked: boolean) => {
    if (checked) {
      setCheckedDeltas(prev => [...prev, deltaId])
      const delta = deltas.find(d => d.id === deltaId)
      if (delta) {
        setChatMessages(prev => [...prev, {
          role: "user",
          content: `[勾選差距] ${delta.type}：${delta.detail} (嚴重度: ${delta.severity})`
        }])
        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            role: "ai",
            content: `關於「${delta.type}: ${delta.detail}」：\n\n這個差距是否為刻意的藝術選擇？\n\n如果不是，建議修正方向是：\n- 調整相關參數以對齊 Reference\n- 預估修改成本：${delta.severity === "high" ? "中" : "低"}\n\n需要更具體的修改建議嗎？`
          }])
        }, 600)
      }
    } else {
      setCheckedDeltas(prev => prev.filter(id => id !== deltaId))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="flex">
        <PipelineSidebar />

        <main className="flex-1 overflow-auto">
          <div className="border-b border-border bg-card">
            <div className="container mx-auto px-6 py-6">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline">C05</Badge>
                <h1 className="text-2xl font-bold">Ref 對照 / 差距比對</h1>
              </div>
              <p className="text-muted-foreground text-sm">選擇 Artwork 和 Reference 進行差距比對</p>
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Panel: Artwork + Reference scrollable lists */}
              <div className="lg:col-span-2 flex flex-col gap-3" style={{ height: 'calc(100vh - 200px)' }}>
                {/* Artworks scrollable list */}
                <Card className="flex flex-col flex-1 min-h-0">
                  <CardHeader className="pb-1.5 shrink-0 py-2">
                    <CardTitle className="text-xs flex items-center gap-1.5">Artworks <Badge variant="secondary" className="text-[10px] h-4">{artworks.length}</Badge></CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="px-3 pb-2 space-y-1.5">
                        {artworks.map((art) => (
                          <div 
                            key={art.id} 
                            className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedArtwork === art.id ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}
                            onClick={() => { setSelectedArtwork(art.id); setSelectedRef(0) }}
                          >
                            <div className="aspect-video bg-muted overflow-hidden">
                              <img src={art.image || "/placeholder.svg"} alt={art.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-1.5">
                              <p className="text-[10px] font-medium truncate">{art.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                {/* References scrollable list */}
                <Card className="flex flex-col shrink-0" style={{ maxHeight: '40%' }}>
                  <CardHeader className="pb-1.5 shrink-0 py-2">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-xs">References</CardTitle>
                      <Badge variant="secondary" className="text-[10px] h-4">{currentRefs.length}</Badge>
                      <span className="text-[10px] text-muted-foreground font-normal">for {artworks[selectedArtwork]?.name}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="px-3 pb-2 space-y-1.5">
                        {currentRefs.map((ref) => (
                          <div 
                            key={ref.id} 
                            className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedRef === ref.id ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-border hover:border-amber-500/50'}`}
                            onClick={() => setSelectedRef(ref.id)}
                          >
                            <div className="aspect-video bg-muted overflow-hidden">
                              <img src={ref.image || "/placeholder.svg"} alt={ref.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-1.5">
                              <p className="text-[10px] font-medium truncate">{ref.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Center: Comparison + Deltas */}
              <div className="lg:col-span-6 flex flex-col gap-4 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
                {/* Comparison Viewer */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Tabs value={compareMode} onValueChange={setCompareMode}>
                        <TabsList>
                          <TabsTrigger value="split">分割</TabsTrigger>
                          <TabsTrigger value="slider">Wipe</TabsTrigger>
                          <TabsTrigger value="side-by-side">並排</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <span className="text-xs text-muted-foreground">
                        {artworks[selectedArtwork]?.name} vs {currentRefs[selectedRef]?.name}
                      </span>
                    </div>
                    {/* Independent zoom controls for artwork and reference */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-600 border-blue-500/30">Artwork</Badge>
                        <div className="flex items-center gap-0.5 border rounded-lg px-0.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleArtworkZoomOut} disabled={artworkZoom <= 0.5}>
                            <ZoomOut className="w-3 h-3" />
                          </Button>
                          <span className="text-[10px] font-medium w-8 text-center">{Math.round(artworkZoom * 100)}%</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleArtworkZoomIn} disabled={artworkZoom >= 3}>
                            <ZoomIn className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleArtworkZoomReset}>
                            <RotateCcw className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] h-5 bg-purple-500/10 text-purple-600 border-purple-500/30">Reference</Badge>
                        <div className="flex items-center gap-0.5 border rounded-lg px-0.5">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRefZoomOut} disabled={refZoom <= 0.5}>
                            <ZoomOut className="w-3 h-3" />
                          </Button>
                          <span className="text-[10px] font-medium w-8 text-center">{Math.round(refZoom * 100)}%</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRefZoomIn} disabled={refZoom >= 3}>
                            <ZoomIn className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRefZoomReset}>
                            <RotateCcw className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {compareMode === "split" && (
                      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                        <div className="grid grid-cols-2 h-full">
                          <div className="relative overflow-hidden border-r border-border">
                            <img src={artworks[selectedArtwork]?.image || "/placeholder.svg"} alt="Work" className="w-full h-full object-cover" style={{ transform: `scale(${artworkZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }} />
                            <Badge className="absolute top-3 left-3 bg-blue-500">Work</Badge>
                          </div>
                          <div className="relative overflow-hidden">
                            <img src={currentRefs[selectedRef]?.image || "/placeholder.svg"} alt="Reference" className="w-full h-full object-cover" style={{ transform: `scale(${refZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }} />
                            <Badge className="absolute top-3 right-3 bg-purple-500">Ref</Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    {compareMode === "slider" && (
                      <div className="space-y-4">
                        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                          <div className="absolute inset-0" style={{ transform: `scale(${refZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}>
                            <img src={currentRefs[selectedRef]?.image || "/placeholder.svg"} alt="Ref" className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)` }}>
                            <div className="w-full h-full" style={{ transform: `scale(${artworkZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}>
                              <img src={artworks[selectedArtwork]?.image || "/placeholder.svg"} alt="Work" className="w-full h-full object-cover" />
                            </div>
                          </div>
                          <div className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10" style={{ left: `${sliderValue[0]}%` }}>
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
                          <Badge variant="outline">Work</Badge>
                          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <img src={artworks[selectedArtwork]?.image || "/placeholder.svg"} alt="Work" className="w-full h-full object-cover" style={{ transform: `scale(${artworkZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Badge variant="outline">Reference</Badge>
                          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <img src={currentRefs[selectedRef]?.image || "/placeholder.svg"} alt="Ref" className="w-full h-full object-cover" style={{ transform: `scale(${refZoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Delta List with checkboxes - scrollable */}
                <Card className="flex-1 min-h-0 flex flex-col">
                  <CardHeader className="pb-2 shrink-0">
                    <CardTitle className="text-base flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" />差距清單 Delta List</CardTitle>
                    <CardDescription className="text-xs">勾選差距項目會自動送入對話框追問</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 p-0">
                    <ScrollArea className="h-full">
                      <div className="px-6 pb-4 space-y-3">
                        {deltas.map((delta) => (
                          <div key={delta.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50">
                            <Checkbox id={`delta-${delta.id}`} checked={checkedDeltas.includes(delta.id)} onCheckedChange={(checked) => handleDeltaCheck(delta.id, checked as boolean)} className="mt-1" />
                            <div className="mt-0.5">
                              {delta.severity === "high" ? <AlertCircle className="w-4 h-4 text-red-400" /> : delta.severity === "medium" ? <AlertCircle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">{delta.type}</Badge>
                                <Badge variant={delta.severity === "high" ? "destructive" : delta.severity === "medium" ? "default" : "secondary"} className="text-xs">
                                  {delta.severity === "high" ? "高" : delta.severity === "medium" ? "中" : "低"}
                                </Badge>
                              </div>
                              <p className="text-sm">{delta.detail}</p>
                              <div className="mt-2 pt-2 border-t border-dashed space-y-2">
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600"><Flag className="w-3 h-3 mr-1" />上報導演</Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandedAnnotation(expandedAnnotation === delta.id ? null : delta.id)}>
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    {expandedAnnotation === delta.id ? '收起註解' : '寫註解'}
                                  </Button>
                                  {deltaAnnotations[delta.id] && expandedAnnotation !== delta.id && (
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{deltaAnnotations[delta.id]}</span>
                                  )}
                                </div>
                                {expandedAnnotation === delta.id && (
                                  <Textarea
                                    placeholder="輸入註解..."
                                    value={deltaAnnotations[delta.id] || ""}
                                    onChange={(e) => setDeltaAnnotations(prev => ({ ...prev, [delta.id]: e.target.value }))}
                                    rows={2}
                                    className="text-xs"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 shrink-0">
                  <Button size="lg" className={compareSubmitted ? "bg-green-600 hover:bg-green-700 text-white" : ""} onClick={() => setCompareSubmitted(true)}><Send className="w-4 h-4 mr-2" />{compareSubmitted ? "Submitted" : "Submit"}</Button>
                  <Button size="lg" variant="outline" className="bg-transparent" asChild>
                    <a href="/qa">{"Supervisor: Jump to QA"}<ChevronRight className="w-4 h-4 ml-2" /></a>
                  </Button>
                </div>
              </div>

              {/* Right: AI Chat (aligned with other columns) */}
              <div className="lg:col-span-4">
                <Card className="border-teal-500/30 flex flex-col sticky top-8" style={{ height: 'calc(100vh - 200px)' }}>
                  <Collapsible open={chatbotOpen} onOpenChange={setChatbotOpen} className="flex flex-col flex-1 min-h-0">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-teal-600" />
                            <div>
                              <CardTitle className="text-base">AI 比對助手</CardTitle>
                              <CardDescription className="text-xs">勾選差距自動追問</CardDescription>
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
                        <div className="flex gap-2 flex-wrap mb-3 shrink-0">
                          <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setChatInput("這是刻意的選擇")}>刻意選擇</Button>
                          <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setChatInput("幫我整理回饋")}>整理回饋</Button>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Input placeholder="輸入問題..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} />
                          <Button size="icon" onClick={handleChatSend}><Send className="w-4 h-4" /></Button>
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
