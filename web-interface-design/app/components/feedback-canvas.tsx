"use client"

import React from "react"

import { useState } from "react"
import { ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  SplitSquareVertical, 
  Layers, 
  MessageSquare, 
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Move,
  Pencil,
  Circle,
  Square,
  ArrowRight,
  Sparkles,
  Users,
  Clock
} from "lucide-react"

interface Annotation {
  id: string
  x: number
  y: number
  type: "circle" | "rect" | "arrow" | "text"
  content?: string
  color: string
  author: string
  timestamp: string
}

interface FeedbackItem {
  id: string
  type: "visual" | "technical" | "rhythm"
  priority: "high" | "medium" | "low"
  content: string
  author: string
  role: string
  timestamp: string
  status: "pending" | "accepted" | "rejected"
  aiSuggestion?: string
}

interface FeedbackCanvasProps {
  workImage: string
  referenceImages?: string[]
  feedbackItems?: FeedbackItem[]
  onAddFeedback?: (feedback: Partial<FeedbackItem>) => void
  onAnnotate?: (annotation: Annotation) => void
}

export function FeedbackCanvas({
  workImage,
  referenceImages = [],
  feedbackItems = [],
  onAddFeedback,
  onAnnotate
}: FeedbackCanvasProps) {
  const [viewMode, setViewMode] = useState<"side-by-side" | "overlay" | "split">("side-by-side")
  const [currentRefIndex, setCurrentRefIndex] = useState(0)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeTool, setActiveTool] = useState<"move" | "circle" | "rect" | "arrow" | "text">("move")
  const [zoom, setZoom] = useState(100)
  const [newFeedback, setNewFeedback] = useState("")

  const defaultFeedbackItems: FeedbackItem[] = feedbackItems.length > 0 ? feedbackItems : [
    {
      id: "1",
      type: "visual",
      priority: "high",
      content: "主角的 rim light 太強，導致邊緣過曝。建議降低 20-30%。",
      author: "Supervisor Wang",
      role: "Supervisor",
      timestamp: "10 分鐘前",
      status: "pending",
      aiSuggestion: "根據參考圖分析，rim light 強度應該在 0.6-0.8 之間，目前設定可能為 1.0+"
    },
    {
      id: "2",
      type: "technical",
      priority: "medium",
      content: "背景的景深效果需要加強，目前焦點太分散。",
      author: "Supervisor Li",
      role: "Supervisor",
      timestamp: "25 分鐘前",
      status: "accepted",
      aiSuggestion: "建議 f-stop 從 2.8 調整到 1.8，可參考 Reference #2 的散景效果"
    },
    {
      id: "3",
      type: "rhythm",
      priority: "low",
      content: "這個鏡頭的節奏稍快，可以延長 0.5 秒讓觀眾有喘息空間。",
      author: "PM Chen",
      role: "PM",
      timestamp: "1 小時前",
      status: "pending"
    }
  ]

  const handleAddAnnotation = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === "move") return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      x,
      y,
      type: activeTool === "text" ? "text" : activeTool,
      content: activeTool === "text" ? "新標註" : undefined,
      color: "#0d9488",
      author: "You",
      timestamp: "剛剛"
    }
    
    setAnnotations(prev => [...prev, newAnnotation])
    onAnnotate?.(newAnnotation)
  }

  const handleSubmitFeedback = () => {
    if (!newFeedback.trim()) return
    onAddFeedback?.({
      content: newFeedback,
      type: "visual",
      priority: "medium",
      status: "pending"
    })
    setNewFeedback("")
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 border-red-200"
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200"
      case "low": return "bg-green-100 text-green-700 border-green-200"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted": return <Check className="h-4 w-4 text-green-600" />
      case "rejected": return <X className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-amber-600" />
    }
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="side-by-side" className="text-xs h-7 px-2">
                <SplitSquareVertical className="h-3 w-3 mr-1" />
                並排
              </TabsTrigger>
              <TabsTrigger value="overlay" className="text-xs h-7 px-2">
                <Layers className="h-3 w-3 mr-1" />
                疊加
              </TabsTrigger>
              <TabsTrigger value="split" className="text-xs h-7 px-2">
                <ImageIcon className="h-3 w-3 mr-1" />
                分割
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="h-6 w-px bg-border mx-2" />
          
          {/* Annotation Tools */}
          <div className="flex items-center gap-1">
            <Button
              variant={activeTool === "move" ? "default" : "ghost"}
              size="icon"
              className={`h-7 w-7 ${activeTool === "move" ? "bg-teal-600" : ""}`}
              onClick={() => setActiveTool("move")}
            >
              <Move className="h-3 w-3" />
            </Button>
            <Button
              variant={activeTool === "circle" ? "default" : "ghost"}
              size="icon"
              className={`h-7 w-7 ${activeTool === "circle" ? "bg-teal-600" : ""}`}
              onClick={() => setActiveTool("circle")}
            >
              <Circle className="h-3 w-3" />
            </Button>
            <Button
              variant={activeTool === "rect" ? "default" : "ghost"}
              size="icon"
              className={`h-7 w-7 ${activeTool === "rect" ? "bg-teal-600" : ""}`}
              onClick={() => setActiveTool("rect")}
            >
              <Square className="h-3 w-3" />
            </Button>
            <Button
              variant={activeTool === "arrow" ? "default" : "ghost"}
              size="icon"
              className={`h-7 w-7 ${activeTool === "arrow" ? "bg-teal-600" : ""}`}
              onClick={() => setActiveTool("arrow")}
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              variant={activeTool === "text" ? "default" : "ghost"}
              size="icon"
              className={`h-7 w-7 ${activeTool === "text" ? "bg-teal-600" : ""}`}
              onClick={() => setActiveTool("text")}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(50, z - 10))}>
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs w-12 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(200, z + 10))}>
            <ZoomIn className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Canvas Area */}
        <div className="flex-1 p-4">
          <div className={`grid gap-4 ${viewMode === "side-by-side" ? "grid-cols-2" : "grid-cols-1"}`}>
            {/* Work Image */}
            <div className="relative">
              <div className="text-xs font-medium mb-2 flex items-center gap-2">
                <Badge variant="outline">作品</Badge>
                Shot_005_v04
              </div>
              <div 
                className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-crosshair"
                onClick={handleAddAnnotation}
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
              >
                <ImageIcon
                  src={workImage || "/vfx-work-in-progress-shot.jpg"}
                  alt="Work in progress"
                  className="object-cover w-full h-full"
                />
                {/* Annotations */}
                {annotations.map(ann => (
                  <div
                    key={ann.id}
                    className="absolute"
                    style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    {ann.type === "circle" && (
                      <div className="w-8 h-8 rounded-full border-2 border-teal-500 bg-teal-500/20" />
                    )}
                    {ann.type === "rect" && (
                      <div className="w-10 h-8 border-2 border-teal-500 bg-teal-500/20" />
                    )}
                    {ann.type === "text" && (
                      <div className="bg-teal-600 text-white text-xs px-2 py-1 rounded">
                        {ann.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reference Image */}
            {viewMode === "side-by-side" && referenceImages.length > 0 && (
              <div className="relative">
                <div className="text-xs font-medium mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-50">參考</Badge>
                    Reference #{currentRefIndex + 1}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setCurrentRefIndex(i => Math.max(0, i - 1))}
                      disabled={currentRefIndex === 0}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-xs">{currentRefIndex + 1}/{referenceImages.length}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setCurrentRefIndex(i => Math.min(referenceImages.length - 1, i + 1))}
                      disabled={currentRefIndex === referenceImages.length - 1}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div 
                  className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
                >
                  <ImageIcon
                    src={referenceImages[currentRefIndex] || "/reference-movie-frame.jpg"}
                    alt="Reference"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            )}

            {viewMode === "side-by-side" && referenceImages.length === 0 && (
              <div className="relative">
                <div className="text-xs font-medium mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50">參考</Badge>
                </div>
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">尚未選擇參考圖</p>
                    <Button variant="outline" size="sm" className="mt-2 text-xs h-7 bg-transparent">
                      <Plus className="h-3 w-3 mr-1" />
                      從 Ref Hub 選擇
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Panel */}
        <div className="w-80 border-l bg-muted/20">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                回饋意見
              </h3>
              <Badge variant="outline" className="text-xs">
                {defaultFeedbackItems.length} 則
              </Badge>
            </div>
            
            {/* Quick Feedback Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="輸入回饋..."
                className="text-xs min-h-[60px] resize-none"
                value={newFeedback}
                onChange={e => setNewFeedback(e.target.value)}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs h-7 bg-transparent">
                <Sparkles className="h-3 w-3 mr-1" />
                AI 潤稿
              </Button>
              <Button 
                size="sm" 
                className="flex-1 text-xs h-7 bg-teal-600 hover:bg-teal-700"
                onClick={handleSubmitFeedback}
              >
                <Plus className="h-3 w-3 mr-1" />
                新增
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="p-3 space-y-3">
              {defaultFeedbackItems.map(item => (
                <Card key={item.id} className="shadow-none">
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                          {item.priority === "high" ? "高" : item.priority === "medium" ? "中" : "低"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.type === "visual" ? "視覺" : item.type === "technical" ? "技術" : "節奏"}
                        </Badge>
                      </div>
                      {getStatusIcon(item.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-xs text-foreground mb-2">{item.content}</p>
                    
                    {item.aiSuggestion && (
                      <div className="bg-teal-50 border border-teal-200 rounded p-2 mb-2">
                        <div className="flex items-center gap-1 text-xs text-teal-700 font-medium mb-1">
                          <Sparkles className="h-3 w-3" />
                          AI 分析
                        </div>
                        <p className="text-xs text-teal-600">{item.aiSuggestion}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {item.author}
                        <Badge variant="outline" className="text-xs ml-1 h-4">
                          {item.role}
                        </Badge>
                      </div>
                      <span>{item.timestamp}</span>
                    </div>
                    
                    {item.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-6 bg-transparent">
                          <Check className="h-3 w-3 mr-1" />
                          接受
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-6 bg-transparent">
                          <X className="h-3 w-3 mr-1" />
                          拒絕
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
