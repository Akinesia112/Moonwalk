"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  Pencil, 
  Circle, 
  Square, 
  Type, 
  MousePointer2,
  Eraser,
  Undo,
  ZoomIn,
  ZoomOut,
  MessageSquare,
  FileText,
  ImageIcon,
  Send,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Bot,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Wand2
} from "lucide-react"

interface Annotation {
  id: string
  tool: "pencil" | "circle" | "rect" | "text"
  points?: number[]
  x?: number
  y?: number
  width?: number
  height?: number
  text?: string
  color: string
  author: string
  timestamp: string
}

interface FeedbackItem {
  id: string
  content: string
  priority: "high" | "medium" | "low"
  status: "pending" | "accepted" | "rejected"
  aiGenerated: boolean
  polishedContent?: string
  annotationId?: string
}

interface SupervisorFeedbackCanvasProps {
  workImage: string
  referenceImages: string[]
  specs: {
    title: string
    items: string[]
  }[]
  onSaveFeedback?: (feedback: FeedbackItem[]) => void
}

export function SupervisorFeedbackCanvas({
  workImage,
  referenceImages,
  specs,
  onSaveFeedback
}: SupervisorFeedbackCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeTool, setActiveTool] = useState<"select" | "pencil" | "circle" | "rect" | "text" | "eraser">("select")
  const [activeColor, setActiveColor] = useState("#ef4444")
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<number[]>([])
  
  const [showSpecs, setShowSpecs] = useState(true)
  const [showRefs, setShowRefs] = useState(false)
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [activeRefIndex, setActiveRefIndex] = useState(0)
  
  // Feedback items with AI analysis
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([
    { id: "1", content: "主體 rim light 不足，需加強", priority: "high", status: "pending", aiGenerated: true, polishedContent: "建議增強主體的 rim light，讓角色輪廓更加清晰突出，與背景產生更好的層次分離。參考 Reference #1 的光影強度約 80%。" },
    { id: "2", content: "色溫偏冷，建議調至 4500K", priority: "medium", status: "pending", aiGenerated: true, polishedContent: "目前畫面色溫偏冷（約 6500K），建議調整至 4500K 左右的暖色調，以符合場景氛圍設定。" },
    { id: "3", content: "前景物件銳利度可再提升", priority: "low", status: "pending", aiGenerated: true, polishedContent: "前景物件的銳利度略有不足，建議在後製階段適度增加銳化處理，提升畫面整體質感。" },
  ])
  
  const [newFeedback, setNewFeedback] = useState("")
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [toneStyle, setToneStyle] = useState("supportive")

  const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#000000"]

  const tools = [
    { id: "select", icon: MousePointer2, label: "選取" },
    { id: "pencil", icon: Pencil, label: "畫筆" },
    { id: "circle", icon: Circle, label: "圓形" },
    { id: "rect", icon: Square, label: "方形" },
    { id: "text", icon: Type, label: "文字" },
    { id: "eraser", icon: Eraser, label: "橡皮擦" },
  ]

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    annotations.forEach(ann => {
      ctx.strokeStyle = ann.color
      ctx.lineWidth = 3
      ctx.lineCap = "round"
      
      if (ann.tool === "pencil" && ann.points) {
        ctx.beginPath()
        for (let i = 0; i < ann.points.length; i += 2) {
          if (i === 0) {
            ctx.moveTo(ann.points[i], ann.points[i + 1])
          } else {
            ctx.lineTo(ann.points[i], ann.points[i + 1])
          }
        }
        ctx.stroke()
      } else if (ann.tool === "circle" && ann.x !== undefined && ann.y !== undefined && ann.width !== undefined) {
        ctx.beginPath()
        ctx.arc(ann.x, ann.y, ann.width / 2, 0, Math.PI * 2)
        ctx.stroke()
      } else if (ann.tool === "rect" && ann.x !== undefined && ann.y !== undefined && ann.width !== undefined && ann.height !== undefined) {
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height)
      } else if (ann.tool === "text" && ann.text && ann.x !== undefined && ann.y !== undefined) {
        ctx.fillStyle = ann.color
        ctx.font = "16px sans-serif"
        ctx.fillText(ann.text, ann.x, ann.y)
      }
    })

    if (currentPath.length > 0) {
      ctx.strokeStyle = activeColor
      ctx.lineWidth = 3
      ctx.lineCap = "round"
      ctx.beginPath()
      for (let i = 0; i < currentPath.length; i += 2) {
        if (i === 0) {
          ctx.moveTo(currentPath[i], currentPath[i + 1])
        } else {
          ctx.lineTo(currentPath[i], currentPath[i + 1])
        }
      }
      ctx.stroke()
    }
  }, [annotations, currentPath, activeColor])

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "select") return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (activeTool === "pencil") {
      setIsDrawing(true)
      setCurrentPath([x, y])
    } else if (activeTool === "text") {
      const text = prompt("輸入文字：")
      if (text) {
        setAnnotations([...annotations, {
          id: Date.now().toString(),
          tool: "text",
          x, y,
          text,
          color: activeColor,
          author: "Supervisor",
          timestamp: "剛剛"
        }])
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== "pencil") return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setCurrentPath([...currentPath, x, y])
  }

  const handleCanvasMouseUp = () => {
    if (isDrawing && activeTool === "pencil" && currentPath.length > 0) {
      setAnnotations([...annotations, {
        id: Date.now().toString(),
        tool: "pencil",
        points: currentPath,
        color: activeColor,
        author: "Supervisor",
        timestamp: "剛剛"
      }])
    }
    setIsDrawing(false)
    setCurrentPath([])
  }

  const handleUndo = () => {
    setAnnotations(annotations.slice(0, -1))
  }

  const handleClear = () => {
    setAnnotations([])
  }

  const handleAddFeedback = () => {
    if (!newFeedback.trim()) return
    const item: FeedbackItem = {
      id: Date.now().toString(),
      content: newFeedback,
      priority: "medium",
      status: "pending",
      aiGenerated: false
    }
    setFeedbackItems([...feedbackItems, item])
    setNewFeedback("")
  }

  const handleAccept = (id: string) => {
    setFeedbackItems(feedbackItems.map(item => 
      item.id === id ? { ...item, status: "accepted" } : item
    ))
  }

  const handleReject = (id: string) => {
    setFeedbackItems(feedbackItems.map(item => 
      item.id === id ? { ...item, status: "rejected" } : item
    ))
  }

  const handlePolish = (id: string) => {
    // Simulate AI polishing
    setFeedbackItems(feedbackItems.map(item => {
      if (item.id === id && !item.polishedContent) {
        return { 
          ...item, 
          polishedContent: `【${toneStyle === "supportive" ? "感謝您的努力！" : ""}】${item.content}。建議可以參考 Reference 進行調整，完成標準為達到 Reference 的 80% 以上相似度。` 
        }
      }
      return item
    }))
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="w-4 h-4 text-red-500" />
      case "medium": return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case "low": return <CheckCircle2 className="w-4 h-4 text-green-500" />
      default: return null
    }
  }

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case "high": return "border-red-500/30 bg-red-500/5"
      case "medium": return "border-amber-500/30 bg-amber-500/5"
      case "low": return "border-green-500/30 bg-green-500/5"
      default: return ""
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          {tools.map(tool => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setActiveTool(tool.id as typeof activeTool)}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </Button>
          ))}
          <div className="w-px h-6 bg-border mx-2" />
          {colors.map(color => (
            <button
              key={color}
              className={`w-6 h-6 rounded-full border-2 ${activeColor === color ? "border-foreground" : "border-transparent"}`}
              style={{ backgroundColor: color }}
              onClick={() => setActiveColor(color)}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleUndo} title="復原">
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} title="清除全部">
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(50, zoom - 25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs w-12 text-center">{zoom}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button 
            variant={showSpecs ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setShowSpecs(!showSpecs)}
          >
            <FileText className="w-4 h-4 mr-1" />
            Specs
          </Button>
          <Button 
            variant={showRefs ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setShowRefs(!showRefs)}
          >
            <ImageIcon className="w-4 h-4 mr-1" />
            Refs
          </Button>
          <Button 
            variant={showFeedbackPanel ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            回饋
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Specs Panel */}
        {showSpecs && (
          <div className="w-56 border-r bg-muted/20 flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span className="font-medium text-sm">Specs</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowSpecs(false)}>
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {specs.map((section, idx) => (
                  <div key={idx}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">{section.title}</p>
                    <ul className="space-y-1">
                      {section.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="text-xs flex items-start gap-2">
                          <span className="text-teal-500 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 relative bg-neutral-900 overflow-auto">
          <div 
            className="p-4 inline-block min-w-full min-h-full"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
          >
            <div className="relative inline-block">
              <img 
                src={workImage || "/placeholder.svg"} 
                alt="Artist Work" 
                className="max-w-none rounded shadow-lg"
                style={{ maxWidth: "800px" }}
              />
              <canvas
                ref={canvasRef}
                width={800}
                height={450}
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              {/* Annotation markers */}
              {annotations.filter(a => a.tool === "text").map((ann, idx) => (
                <div 
                  key={ann.id}
                  className="absolute w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                  style={{ left: ann.x, top: ann.y, transform: "translate(-50%, -50%)" }}
                >
                  {idx + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reference Panel */}
        {showRefs && (
          <div className="w-48 border-l bg-muted/20 flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-sm">References</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowRefs(false)}>
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {referenceImages.map((img, idx) => (
                  <div 
                    key={idx}
                    className={`cursor-pointer rounded overflow-hidden border-2 transition-all ${
                      activeRefIndex === idx ? "border-purple-500" : "border-transparent hover:border-purple-500/50"
                    }`}
                    onClick={() => setActiveRefIndex(idx)}
                  >
                    <img src={img || "/placeholder.svg"} alt={`Reference ${idx + 1}`} className="w-full" />
                    <div className="p-1.5 text-xs text-center bg-muted">
                      Ref #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Feedback Panel with AI Analysis */}
        {showFeedbackPanel && (
          <div className="w-80 border-l bg-background flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-sm">回饋清單</span>
                <Badge variant="outline" className="text-xs">
                  {feedbackItems.filter(i => i.status === "pending").length} 待處理
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowFeedbackPanel(false)}>
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>

            {/* AI Analysis Toggle */}
            <Collapsible open={showAIAnalysis} onOpenChange={setShowAIAnalysis}>
              <CollapsibleTrigger asChild>
                <div className="p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-teal-600" />
                      <span className="text-sm font-medium">AI 分析結果</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600">
                        {feedbackItems.filter(i => i.priority === "high").length} High
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">
                        {feedbackItems.filter(i => i.priority === "medium").length} Med
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                        {feedbackItems.filter(i => i.priority === "low").length} Low
                      </Badge>
                      {showAIAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 border-b bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">AI 潤稿語氣</Label>
                    <Select value={toneStyle} onValueChange={setToneStyle}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neutral">中性</SelectItem>
                        <SelectItem value="supportive">支持性 (推薦)</SelectItem>
                        <SelectItem value="firm">堅定</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI 已分析畫面，識別出 {feedbackItems.length} 個待處理項目
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Feedback List */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {feedbackItems.map((item) => (
                  <Card 
                    key={item.id} 
                    className={`transition-all ${getPriorityBg(item.priority)} ${
                      item.status === "accepted" ? "opacity-60" : 
                      item.status === "rejected" ? "opacity-40 line-through" : ""
                    }`}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(item.priority)}
                          <Badge variant="outline" className="text-xs">
                            {item.priority === "high" ? "P0" : item.priority === "medium" ? "P1" : "P2"}
                          </Badge>
                          {item.aiGenerated && (
                            <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-600">
                              <Bot className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>
                        {item.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-green-600 hover:bg-green-500/10"
                              onClick={() => handleAccept(item.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-red-600 hover:bg-red-500/10"
                              onClick={() => handleReject(item.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {item.status === "accepted" && (
                          <Badge className="bg-green-500 text-xs">已接受</Badge>
                        )}
                        {item.status === "rejected" && (
                          <Badge variant="outline" className="text-xs text-red-500">已拒絕</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm">{item.content}</p>
                      
                      {item.polishedContent && (
                        <div className="p-2 bg-teal-500/10 rounded text-xs border border-teal-500/30">
                          <div className="flex items-center gap-1 text-teal-600 mb-1">
                            <Wand2 className="w-3 h-3" />
                            AI 潤稿版本
                          </div>
                          <p className="text-muted-foreground">{item.polishedContent}</p>
                        </div>
                      )}
                      
                      {!item.polishedContent && item.status === "pending" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs h-7 bg-transparent"
                          onClick={() => handlePolish(item.id)}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI 潤稿
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Add New Feedback */}
            <div className="p-3 border-t space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="新增回饋註解..."
                  value={newFeedback}
                  onChange={(e) => setNewFeedback(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddFeedback()}
                  className="text-sm h-9"
                />
                <Button size="sm" className="h-9" onClick={handleAddFeedback}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button className="w-full" size="sm">
                <Send className="w-4 h-4 mr-2" />
                發送已接受的回饋 ({feedbackItems.filter(i => i.status === "accepted").length})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
