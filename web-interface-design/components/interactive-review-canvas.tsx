"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Pencil, 
  Circle, 
  Square, 
  Type, 
  MousePointer2,
  Eraser,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MessageSquare,
  FileText,
  ImageIcon,
  Layers,
  Send,
  Trash2,
  Eye,
  EyeOff,
  PanelRightOpen,
  PanelRightClose
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

interface Comment {
  id: string
  x: number
  y: number
  content: string
  author: string
  timestamp: string
}

interface InteractiveReviewCanvasProps {
  workImage: string
  referenceImages: string[]
  specs: {
    title: string
    items: string[]
  }[]
  onSaveAnnotations?: (annotations: Annotation[]) => void
  onSaveComments?: (comments: Comment[]) => void
}

export function InteractiveReviewCanvas({
  workImage,
  referenceImages,
  specs,
  onSaveAnnotations,
  onSaveComments
}: InteractiveReviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeTool, setActiveTool] = useState<"select" | "pencil" | "circle" | "rect" | "text" | "eraser">("select")
  const [activeColor, setActiveColor] = useState("#ef4444")
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [comments, setComments] = useState<Comment[]>([
    { id: "1", x: 30, y: 25, content: "這裡的光影方向需要調整", author: "Director", timestamp: "2 分鐘前" },
    { id: "2", x: 70, y: 60, content: "色溫太冷，要更暖一點", author: "Director", timestamp: "5 分鐘前" },
  ])
  const [newComment, setNewComment] = useState("")
  const [selectedComment, setSelectedComment] = useState<string | null>(null)
  const [showSpecs, setShowSpecs] = useState(true)
  const [showRefs, setShowRefs] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<number[]>([])
  const [activeRefIndex, setActiveRefIndex] = useState(0)

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

    // Clear and redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw existing annotations
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

    // Draw current path
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
          author: "Director",
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
        author: "Director",
        timestamp: "剛剛"
      }])
    }
    setIsDrawing(false)
    setCurrentPath([])
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return
    const comment: Comment = {
      id: Date.now().toString(),
      x: 50,
      y: 50,
      content: newComment,
      author: "Director",
      timestamp: "剛剛"
    }
    setComments([...comments, comment])
    setNewComment("")
  }

  const handleUndo = () => {
    setAnnotations(annotations.slice(0, -1))
  }

  const handleClear = () => {
    setAnnotations([])
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Specs Panel */}
        {showSpecs && (
          <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span className="font-medium text-sm">Specs</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowSpecs(false)}>
                <PanelRightClose className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-4">
                {specs.map((section, idx) => (
                  <div key={idx}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{section.title}</h4>
                    <ul className="space-y-1.5">
                      {section.items.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                          {item}
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
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative bg-neutral-900 overflow-auto">
            {/* Work Image + Canvas Overlay */}
            <div 
              className="relative inline-block m-4"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
            >
              <img 
                src={workImage || "/placeholder.svg"} 
                alt="Artist Work" 
                className="max-w-none"
                style={{ width: 800 }}
              />
              <canvas
                ref={canvasRef}
                width={800}
                height={450}
                className="absolute top-0 left-0 cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              {/* Comment Markers */}
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-110 transition-transform ${selectedComment === comment.id ? "ring-2 ring-white" : ""}`}
                  style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                  onClick={() => setSelectedComment(selectedComment === comment.id ? null : comment.id)}
                >
                  {comments.indexOf(comment) + 1}
                </div>
              ))}
              {/* Selected Comment Popup */}
              {selectedComment && (
                <div 
                  className="absolute bg-white rounded-lg shadow-lg p-3 max-w-xs z-10"
                  style={{ 
                    left: `${comments.find(c => c.id === selectedComment)?.x}%`, 
                    top: `${(comments.find(c => c.id === selectedComment)?.y || 0) + 5}%` 
                  }}
                >
                  <p className="text-sm">{comments.find(c => c.id === selectedComment)?.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {comments.find(c => c.id === selectedComment)?.author} - {comments.find(c => c.id === selectedComment)?.timestamp}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Comments Input */}
          <div className="p-3 border-t bg-background flex gap-2">
            <Input
              placeholder="新增註解..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              className="flex-1"
            />
            <Button onClick={handleAddComment}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Reference Panel */}
        {showRefs && (
          <div className="w-72 border-l bg-muted/20 flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-sm">References</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowRefs(false)}>
                <PanelRightOpen className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {referenceImages.map((img, idx) => (
                  <div 
                    key={idx}
                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${activeRefIndex === idx ? "border-purple-500" : "border-transparent hover:border-muted-foreground/30"}`}
                    onClick={() => setActiveRefIndex(idx)}
                  >
                    <img src={img || "/placeholder.svg"} alt={`Reference ${idx + 1}`} className="w-full aspect-video object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <span className="text-white text-xs font-medium">Reference #{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Comments List */}
            <div className="border-t">
              <div className="p-3 border-b flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-sm">註解 ({comments.length})</span>
              </div>
              <ScrollArea className="h-48">
                <div className="p-3 space-y-2">
                  {comments.map((comment, idx) => (
                    <div 
                      key={comment.id}
                      className={`p-2 rounded-lg text-sm cursor-pointer transition-colors ${selectedComment === comment.id ? "bg-amber-500/20 border border-amber-500/30" : "bg-muted hover:bg-muted/80"}`}
                      onClick={() => setSelectedComment(selectedComment === comment.id ? null : comment.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                        <span className="font-medium text-xs">{comment.author}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{comment.timestamp}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-7">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Panels (when hidden) */}
      {(!showSpecs || !showRefs) && (
        <div className="absolute top-16 left-4 flex flex-col gap-2">
          {!showSpecs && (
            <Button variant="outline" size="sm" onClick={() => setShowSpecs(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Specs
            </Button>
          )}
          {!showRefs && (
            <Button variant="outline" size="sm" onClick={() => setShowRefs(true)}>
              <Layers className="w-4 h-4 mr-2" />
              Refs
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
