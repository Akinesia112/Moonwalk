"use client"

import React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle2, AlertTriangle, Bot, ChevronRight, ChevronDown, ChevronUp, FileCheck, Sparkles, PenTool, ListChecks, Send, Plus, MessageSquare, Eraser, Type, MousePointer, ZoomIn, ZoomOut, Circle, Square, Trash2, Undo2, ImageIcon, X, Tag, Save, BookOpen, User } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import Link from "next/link"

export default function QAPage() {
  const [selectedArtwork, setSelectedArtwork] = useState(0)
  const [expandedArtwork, setExpandedArtwork] = useState<number | null>(0)
  const [selectedRef, setSelectedRef] = useState(0)
  const [showMetricDetailDialog, setShowMetricDetailDialog] = useState(false)
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<typeof metrics[0] | null>(null)
  const [checkedMetrics, setCheckedMetrics] = useState<string[]>([])
  const [showMetrics, setShowMetrics] = useState(false)
  const [analyzingFeedback, setAnalyzingFeedback] = useState(false)
  const [canvasTool, setCanvasTool] = useState<string>("pointer")
  const [brushColor, setBrushColor] = useState("#ef4444")
  const [sortByPriority, setSortByPriority] = useState(true)
  const [artworkZoom, setArtworkZoom] = useState(100)
  const [refZoom, setRefZoom] = useState(100)
  const [showSpecs, setShowSpecs] = useState(true)
  const [showRefsRow, setShowRefsRow] = useState(false)
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(true)
  const [toneStyle, setToneStyle] = useState("professional")
  const [isDrawing, setIsDrawing] = useState(false)
  const [textInputPos, setTextInputPos] = useState<{x: number; y: number; cssX: number; cssY: number} | null>(null)
  const [textInputValue, setTextInputValue] = useState("")
  const [canvasAnnotations, setCanvasAnnotations] = useState<{type: string; points?: {x:number;y:number}[]; text?: string; x?: number; y?: number; color: string}[]>([])
  const [canvasZoom, setCanvasZoom] = useState(100)
  const [qaSubmitted, setQaSubmitted] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef<{x:number;y:number}[]>([])
  const shapeStartRef = useRef<{x:number;y:number} | null>(null)

  // Feedback list
  const [feedbackItems, setFeedbackItems] = useState<{id: string; text: string; source: string; priority: string; supplement: string; addressed: boolean; aiDraft?: string}[]>([
    { id: "ai-1", text: "主體 rim light 不足，需加強", source: "AI", priority: "P0", supplement: "", addressed: false, aiDraft: "建議增強主體的 rim light，讓角色輪廓更加清晰突出，與背景產生更好的層次分離。參考 Reference #1 的光影強度約 80%。" },
    { id: "ai-2", text: "色溫偏冷，建議調至 4500K", source: "AI", priority: "P1", supplement: "", addressed: false, aiDraft: "目前畫面色溫偏冷（約 6500K），建議調整至 4500K 左右的暖色調，以符合場景氛圍設定。" },
    { id: "ai-3", text: "構圖比例基本符合，輕微右偏", source: "AI", priority: "P2", supplement: "", addressed: false, aiDraft: "構圖整體符合三分法，但主體位置輕微右偏約 5%，建議微調以達到更精確的構圖平衡。" },
  ])
  const [newAnnotationText, setNewAnnotationText] = useState("")
  const [newFeedbackText, setNewFeedbackText] = useState("")
  const [newFeedbackPriority, setNewFeedbackPriority] = useState("P1")
  const [newFeedbackSource, setNewFeedbackSource] = useState("Supervisor")

  // Annotations
  const [annotations, setAnnotations] = useState([
    { id: "d1", text: "右上角光線需要更柔和", time: "剛剛" },
    { id: "d2", text: "前景物件位置偏左", time: "2 分鐘前" },
  ])

  // Labels
  const [labels, setLabels] = useState(["Lighting", "Composition"])
  const [newLabel, setNewLabel] = useState("")

  // Inline Specs
  const [inlineSpecs, setInlineSpecs] = useState(["主光源必須從右側照射", "氛圍要 warm & cozy"])
  const [newSpecText, setNewSpecText] = useState("")

  // Artist per-frame reflection notes (from C03)
  const [showArtistNotes, setShowArtistNotes] = useState(true)
  const artistReflections: Record<number, { artist: string; notes: string; intentions: string[]; timestamp: string }> = {
    0: { artist: "Artist A", notes: "我覺得導演想要的是壓抑型的憤怒，所以我選擇用冷色調高對比的光影來表現角色的內心張力。\n\nRim light 故意壓低是為了營造壓迫感，不確定是否與 Spec 衝突。", intentions: ["壓抑型憤怒 - 冷色高對比光影", "Rim light 刻意壓低 - 營造壓迫感", "材質歲月感定義為 3-5 年輕度磨損"], timestamp: "2 小時前" },
    1: { artist: "Artist A", notes: "這個鏡頭我想嘗試非對稱構圖，參考 Ref #2 的方式但稍微收斂。前景比例刻意壓低讓視覺焦點集中在角色。", intentions: ["非對稱構圖 - 參考 Ref #2", "前景比例刻意壓低", "色溫偏暖 4800K 但保留硬光質感"], timestamp: "1 小時前" },
    2: { artist: "Artist B", notes: "嘗試用暖色 fill light 平衡右側硬光的冷感。導演說 warm & cozy 但 Ref 是硬光，我的解讀是保留光質硬度但色溫偏暖。", intentions: ["暖色 fill light 平衡硬光", "光質硬度保留，色溫偏暖", "背景虛化程度參考 Ref #1"], timestamp: "45 分鐘前" },
  }

  // Chat for meeting notes
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([])

  // Supervisor Specs
  const directorSpecs = {
    items: ["主光源必須從右側照射", "保持品牌 Logo 清晰可見", "氛圍要 warm & cozy", "主角臉部需要明確高光"],
    technical: [
      { label: "Resolution", value: "4K (3840x2160)" },
      { label: "Frame Rate", value: "24fps" },
      { label: "Color Space", value: "ACES" },
    ],
    priorities: [
      { id: "P0", text: "光影方向對齊 Ref" },
      { id: "P1", text: "構圖符合黃金比例" },
      { id: "P2", text: "色溫暖調 4500-5000K" },
    ],
  }

  // Artworks list
  const artworks = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    name: `Shot_${String(i + 1).padStart(3, "0")}_v04`,
    image: ["/vfx-work-in-progress-shot.jpg", "/reference-movie-frame.jpg", "/composition-reference.jpg", "/lighting-setup-reference.png"][i % 4],
    refs: [
      { id: 0, name: "Lighting Ref", image: "/reference-movie-frame.jpg", gapSummary: "Rim light 不足 (vs Spec P0), 光影方向偏差 15 度" },
      { id: 1, name: "Composition Ref", image: "/composition-reference.jpg", gapSummary: "構圖主體偏右 15%, 前景比例低於 Ref" },
      ...(i % 3 === 0 ? [{ id: 2, name: "Color Ref", image: "/lighting-setup-reference.png", gapSummary: "色溫偏冷 2000K, 飽和度基本匹配" }] : []),
    ],
  }))

  const currentArt = artworks[selectedArtwork]
  const currentRef = currentArt?.refs[selectedRef]

  const metrics = [
    { id: "composition", name: "構圖", status: "red", agents: ["Composition_J", "Composition_K"], consensus: false, refBasis: "Reference #2", supervisorNote: "建議參考非對稱構圖" },
    { id: "lighting", name: "光影", status: "yellow", agents: ["Light_J", "Light_K"], consensus: true, refBasis: "Reference #1", supervisorNote: "補光強度微調" },
    { id: "color", name: "色彩", status: "green", agents: ["Color_J", "Color_K"], consensus: true, refBasis: "Spec", supervisorNote: null },
    { id: "texture", name: "材質", status: "green", agents: ["Texture_J", "Texture_K"], consensus: true, refBasis: "Reference #3", supervisorNote: null },
    { id: "motion", name: "動態", status: "yellow", agents: ["Motion_J", "Motion_K"], consensus: false, refBasis: "Spec", supervisorNote: "模糊程度確認" },
    { id: "depth", name: "景深", status: "green", agents: ["Depth_J", "Depth_K"], consensus: true, refBasis: "Spec", supervisorNote: null },
    { id: "exposure", name: "曝光", status: "red", agents: ["Exposure_J", "Exposure_K"], consensus: true, refBasis: "Reference #1", supervisorNote: "優先修正" },
    { id: "style", name: "風格", status: "green", agents: ["Style_J", "Style_K"], consensus: true, refBasis: "Spec", supervisorNote: null },
  ]

  const metricDetails: Record<string, { analysis: string; suggestions: string[]; agentOpinions: { agent: string; opinion: string; confidence: number }[]; debate?: { agentA: {name: string; opinion: string; severity: string}; agentB: {name: string; opinion: string; severity: string}; consensus: string } }> = {
    composition: { analysis: "構圖重心偏左 15%", suggestions: ["主體右移 10-15%", "調整留白", "參考 Ref #2"], agentOpinions: [{ agent: "Composition_J", opinion: "不符合三分法", confidence: 85 }, { agent: "Composition_K", opinion: "動態構圖邊緣案例", confidence: 72 }], debate: { agentA: { name: "Composition_J", opinion: "偏左", severity: "high" }, agentB: { name: "Composition_K", opinion: "動態構圖可接受", severity: "medium" }, consensus: "是否嚴格遵循三分法" } },
    lighting: { analysis: "補光不足，陰影過重", suggestions: ["左側補光 +20%", "色溫 4800K"], agentOpinions: [{ agent: "Light_J", opinion: "偏暗", confidence: 88 }, { agent: "Light_K", opinion: "色溫輕微", confidence: 82 }] },
    exposure: { analysis: "高光過曝 clipping 8%", suggestions: ["曝光 -0.5 stops", "漸層濾鏡"], agentOpinions: [{ agent: "Exposure_J", opinion: "過曝", confidence: 95 }, { agent: "Exposure_K", opinion: "高光損失", confidence: 93 }] },
  }

  const specs_mentioned = ["composition", "lighting", "color", "exposure"]
  const getStatusIcon = (s: string) => s === "red" ? <AlertCircle className="w-4 h-4 text-red-500" /> : s === "yellow" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />
  const getStatusBg = (s: string) => s === "red" ? "bg-red-500/10 border-red-500/30" : s === "yellow" ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"
  const isMetricMentioned = (id: string) => specs_mentioned.includes(id)

  const handleMetricCheck = (metricId: string, checked: boolean) => {
    if (checked) {
      setCheckedMetrics(prev => [...prev, metricId])
      const metric = metrics.find(m => m.id === metricId)
      if (metric) {
        const detail = metricDetails[metricId]
        // Add to feedback list
        if (detail) {
          setFeedbackItems(prev => [...prev, { id: `metric-${Date.now()}`, text: `[${metric.name}] ${detail.analysis}. 建議：${detail.suggestions.join("、")}`, source: "AI", priority: metric.status === "red" ? "P0" : metric.status === "yellow" ? "P1" : "P2", supplement: "", addressed: false }])
        }
        // Auto-inject into AI chat
        setChatMessages(prev => [...prev, {
          role: "user",
          content: `[勾選 Metric] ${metric.name} (${metric.status === "red" ? "紅燈" : metric.status === "yellow" ? "黃燈" : "綠燈"}) - ${metric.refBasis}`
        }])
        setTimeout(() => {
          const response = detail
            ? `關於 ${metric.name}：\n\n${detail.analysis}\n\n建議：\n${detail.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}${metric.supervisorNote ? `\n\nSupervisor 備註：${metric.supervisorNote}` : ""}\n\n需要更詳細說明嗎？`
            : `${metric.name} 目前狀態為${metric.status === "green" ? "通過" : "需要關注"}。\n\n基準：${metric.refBasis}\n\n是否需要更詳細的分析？`
          setChatMessages(prev => [...prev, { role: "ai", content: response }])
        }, 600)
      }
    } else {
      setCheckedMetrics(prev => prev.filter(id => id !== metricId))
    }
  }

  const handleAddFeedback = () => {
    if (!newFeedbackText.trim()) return
    setFeedbackItems(prev => [...prev, { id: `dir-${Date.now()}`, text: newFeedbackText, source: newFeedbackSource, priority: newFeedbackPriority, supplement: "", addressed: false }])
    setNewFeedbackText("")
  }
  const handleAddAnnotation = () => { if (!newAnnotationText.trim()) return; setAnnotations(prev => [...prev, { id: `ann-${Date.now()}`, text: newAnnotationText, time: "剛剛" }]); setNewAnnotationText("") }
  const handleAddLabel = () => { if (!newLabel.trim()) return; setLabels(prev => [...prev, newLabel]); setNewLabel("") }
  const handleAddSpec = () => { if (!newSpecText.trim()) return; setInlineSpecs(prev => [...prev, newSpecText]); setNewSpecText("") }

  const handleAnalyzeFeedback = () => {
    setAnalyzingFeedback(true)
    setTimeout(() => {
      setAnalyzingFeedback(false)
      const p0Items = feedbackItems.filter(f => f.priority === "P0")
      setChatMessages(prev => [...prev, { role: "ai", content: `分析完成！共 ${feedbackItems.length} 筆回饋。\n\n重點發現：\n- ${p0Items.length} 個 P0 優先項目\n- 建議先處理光影再處理構圖\n- 發現「柔和」與「高光」的潛在衝突` }])
    }, 1500)
  }

  const handleChatSend = () => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [...prev, { role: "user", content: chatInput }])
    const input = chatInput
    setChatInput("")
    setTimeout(() => {
      let aiResponse = ""
      if (input.includes("釐清") || input.includes("模糊")) {
        aiResponse = `根據您的回饋分析，以下模糊詞需要釐清：\n\n- 「更柔和」→ 建議量化：diffusion 值 +30% 或 light softness 4/10\n- 「歲月感」→ 建議定義：磨損程度 2-3/10\n\n是否要將這些釐清加入回饋清單？`
      } else if (input.includes("轉建議") || input.includes("可操作")) {
        aiResponse = `已將模糊回饋轉為可操作建議：\n\n1. 光線柔和度：Diffusion +30%, Shadow softness 4/10\n2. 構圖修正：主體右移 80px\n3. 色溫調整：全局 -1500K (6500K → 5000K)\n\n是否加入回饋清單？`
      } else if (input.includes("語氣") || input.includes("風格")) {
        aiResponse = `我會調整輸出語氣風格：\n\n- 專業但溫和的語氣\n- 使用具體數值而非模糊描述\n- 先肯定再建議\n- 提供多個方案選擇\n\n已套用新的語氣風格。`
      } else {
        aiResponse = `根據目前分析：\n\n紅燈項目：構圖和曝光需優先處理\n黃燈項目：光影和動態可微調\n\n建議修改順序：先修正曝光，再調整構圖。`
      }
      setChatMessages(prev => [...prev, { role: "ai", content: aiResponse }])
    }, 800)
  }

  const toggleAddressed = (id: string) => setFeedbackItems(prev => prev.map(f => f.id === id ? { ...f, addressed: !f.addressed } : f))

  const sortedFeedback = [...feedbackItems].sort((a, b) => {
    if (sortByPriority) {
      const order: Record<string, number> = { P0: 0, P1: 1, P2: 2 }
      const pDiff = (order[a.priority] ?? 3) - (order[b.priority] ?? 3)
      if (pDiff !== 0) return pDiff
    }
    if (a.addressed !== b.addressed) return a.addressed ? 1 : -1
    return 0
  })

  const canvasTools = [
    { id: "pointer", icon: MousePointer, label: "選擇" },
    { id: "brush", icon: PenTool, label: "畫筆" },
    { id: "circle", icon: Circle, label: "圓形" },
    { id: "rect", icon: Square, label: "矩形" },
    { id: "text", icon: Type, label: "文字" },
    { id: "eraser", icon: Eraser, label: "橡皮擦" },
  ]
  const colorPalette = ["#ef4444", "#f59e0b", "#22c55e", "#14b8a6", "#3b82f6", "#a78bfa", "#000000"]

  // Resize canvas to match container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = canvasContainerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
      canvas.width = Math.floor(rect.width)
      canvas.height = Math.floor(rect.height)
    }
  }, [])

  // Real canvas drawing
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const ann of canvasAnnotations) {
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = 3
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      if (ann.type === "brush" && ann.points && ann.points.length > 1) {
        ctx.beginPath()
        ctx.moveTo(ann.points[0].x, ann.points[0].y)
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y)
        }
        ctx.stroke()
      } else if (ann.type === "eraser" && ann.points) {
        ctx.globalCompositeOperation = "destination-out"
        ctx.lineWidth = 20
        ctx.beginPath()
        if (ann.points.length > 1) {
          ctx.moveTo(ann.points[0].x, ann.points[0].y)
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y)
          }
          ctx.stroke()
        }
        ctx.globalCompositeOperation = "source-over"
        ctx.lineWidth = 3
      } else if (ann.type === "text" && ann.text && ann.x !== undefined && ann.y !== undefined) {
        ctx.font = "bold 14px sans-serif"
        const padding = 4
        const measured = ctx.measureText(ann.text)
        ctx.fillStyle = "rgba(255,255,255,0.85)"
        ctx.fillRect(ann.x - padding, ann.y - 14 - padding, measured.width + padding * 2, 18 + padding * 2)
        ctx.fillStyle = ann.color
        ctx.fillText(ann.text, ann.x, ann.y)
      } else if (ann.type === "circle" && ann.points && ann.points.length === 2) {
        const dx = ann.points[1].x - ann.points[0].x
        const dy = ann.points[1].y - ann.points[0].y
        const r = Math.sqrt(dx * dx + dy * dy)
        ctx.beginPath()
        ctx.arc(ann.points[0].x, ann.points[0].y, r, 0, 2 * Math.PI)
        ctx.stroke()
      } else if (ann.type === "rect" && ann.points && ann.points.length === 2) {
        const x = Math.min(ann.points[0].x, ann.points[1].x)
        const y = Math.min(ann.points[0].y, ann.points[1].y)
        const w = Math.abs(ann.points[1].x - ann.points[0].x)
        const h = Math.abs(ann.points[1].y - ann.points[0].y)
        ctx.strokeRect(x, y, w, h)
      }
    }
  }, [canvasAnnotations])

  useEffect(() => {
    resizeCanvas()
    redrawCanvas()
  }, [resizeCanvas, redrawCanvas, selectedArtwork, selectedRef])

  // Redraw when annotations change to ensure persistence
  useEffect(() => {
    redrawCanvas()
  }, [canvasAnnotations, redrawCanvas])

  useEffect(() => {
    const observer = new ResizeObserver(() => { resizeCanvas(); redrawCanvas() })
    if (canvasContainerRef.current) observer.observe(canvasContainerRef.current)
    return () => observer.disconnect()
  }, [resizeCanvas, redrawCanvas])

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      cssX: e.clientX - rect.left,
      cssY: e.clientY - rect.top,
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasTool === "pointer") return
    if (canvasTool === "text") {
      const pos = getCanvasPos(e)
      setTextInputPos({ x: pos.x, y: pos.y, cssX: pos.cssX, cssY: pos.cssY })
      setTextInputValue("")
      return
    }
    setIsDrawing(true)
    const pos = getCanvasPos(e)
    drawingRef.current = [pos]
    if (canvasTool === "circle" || canvasTool === "rect") {
      shapeStartRef.current = pos
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || canvasTool === "pointer" || canvasTool === "text") return
    const pos = getCanvasPos(e)
    if (canvasTool === "brush") {
      drawingRef.current.push(pos)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (ctx && drawingRef.current.length > 1) {
        ctx.strokeStyle = brushColor
        ctx.lineWidth = 3
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()
        const prev = drawingRef.current[drawingRef.current.length - 2]
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
    } else if (canvasTool === "eraser") {
      drawingRef.current.push(pos)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (ctx) {
        ctx.globalCompositeOperation = "destination-out"
        ctx.lineWidth = 20
        ctx.lineCap = "round"
        if (drawingRef.current.length > 1) {
          const prev = drawingRef.current[drawingRef.current.length - 2]
          ctx.beginPath()
          ctx.moveTo(prev.x, prev.y)
          ctx.lineTo(pos.x, pos.y)
          ctx.stroke()
        }
        ctx.globalCompositeOperation = "source-over"
        ctx.lineWidth = 3
      }
    } else if ((canvasTool === "circle" || canvasTool === "rect") && shapeStartRef.current) {
      // Live preview: redraw all + preview shape
      redrawCanvas()
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (ctx) {
        ctx.strokeStyle = brushColor
        ctx.lineWidth = 3
        ctx.setLineDash([5, 5])
        if (canvasTool === "circle") {
          const dx = pos.x - shapeStartRef.current.x
          const dy = pos.y - shapeStartRef.current.y
          const r = Math.sqrt(dx * dx + dy * dy)
          ctx.beginPath()
          ctx.arc(shapeStartRef.current.x, shapeStartRef.current.y, r, 0, 2 * Math.PI)
          ctx.stroke()
        } else {
          const x = Math.min(shapeStartRef.current.x, pos.x)
          const y = Math.min(shapeStartRef.current.y, pos.y)
          const w = Math.abs(pos.x - shapeStartRef.current.x)
          const h = Math.abs(pos.y - shapeStartRef.current.y)
          ctx.strokeRect(x, y, w, h)
        }
        ctx.setLineDash([])
      }
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    setIsDrawing(false)
    const pos = getCanvasPos(e)
    if (canvasTool === "brush" && drawingRef.current.length > 1) {
      setCanvasAnnotations(prev => [...prev, { type: "brush", points: [...drawingRef.current], color: brushColor }])
    } else if (canvasTool === "eraser" && drawingRef.current.length > 1) {
      setCanvasAnnotations(prev => [...prev, { type: "eraser", points: [...drawingRef.current], color: "white" }])
    } else if (canvasTool === "circle" && shapeStartRef.current) {
      setCanvasAnnotations(prev => [...prev, { type: "circle", points: [shapeStartRef.current!, pos], color: brushColor }])
    } else if (canvasTool === "rect" && shapeStartRef.current) {
      setCanvasAnnotations(prev => [...prev, { type: "rect", points: [shapeStartRef.current!, pos], color: brushColor }])
    }
    drawingRef.current = []
    shapeStartRef.current = null
  }

  const handleTextSubmit = () => {
    if (textInputPos && textInputValue.trim()) {
      setCanvasAnnotations(prev => [...prev, { type: "text", text: textInputValue, x: textInputPos.x, y: textInputPos.y, color: brushColor }])
    }
    setTextInputPos(null)
    setTextInputValue("")
  }

  const handleUndo = () => setCanvasAnnotations(prev => prev.slice(0, -1))
  const handleClearCanvas = () => setCanvasAnnotations([])

  const COL_HEIGHT = "calc(100vh - 130px)"

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="flex">
        <PipelineSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="px-4 py-3">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">C06</Badge>
                <h1 className="text-2xl font-bold">Supervisor Review</h1>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/governance"><Button variant="outline" size="sm" className="bg-transparent text-xs">Jump to Decision Loop</Button></Link>
                <Button size="sm" className={qaSubmitted ? "bg-green-600 hover:bg-green-700 text-white" : ""} onClick={() => setQaSubmitted(true)}><Send className="w-3 h-3 mr-1" />{qaSubmitted ? "Submitted" : "Submit"}</Button>
              </div>
            </div>

            {/* Main 3-Column Layout */}
            <div className="flex gap-3" style={{ height: COL_HEIGHT }}>

              {/* LEFT: Artworks Scrollable */}
              <div className="w-48 shrink-0 flex flex-col" style={{ height: COL_HEIGHT }}>
                <Card className="flex flex-col flex-1 min-h-0">
                  <CardHeader className="pb-2 shrink-0 py-2">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                      Artworks ({artworks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                    <ScrollArea className="h-full min-h-0">
                      <div className="space-y-1 px-2 pb-2">
                        {artworks.map((art, idx) => (
                          <div key={art.id}>
                            <div
                              className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${selectedArtwork === idx ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'}`}
                              onClick={() => { setSelectedArtwork(idx); setSelectedRef(0); setExpandedArtwork(expandedArtwork === idx ? null : idx) }}
                            >
                              <div className="w-10 h-7 rounded overflow-hidden bg-muted shrink-0">
                                <img src={art.image || "/placeholder.svg"} alt={art.name} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[10px] font-medium flex-1 truncate">{art.name}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${expandedArtwork === idx ? 'rotate-180' : ''}`} />
                            </div>
                            {expandedArtwork === idx && (
                              <div className="ml-3 pl-2 border-l-2 border-primary/20 space-y-0.5 mt-0.5 mb-1">
                                {art.refs.map((ref) => (
                                  <div
                                    key={ref.id}
                                    className={`flex items-center gap-1.5 p-1 rounded cursor-pointer text-[10px] ${selectedRef === ref.id ? 'bg-amber-500/10 text-amber-700' : 'hover:bg-muted text-muted-foreground'}`}
                                    onClick={() => setSelectedRef(ref.id)}
                                  >
                                    <div className="w-7 h-5 rounded overflow-hidden bg-muted shrink-0">
                                      <img src={ref.image || "/placeholder.svg"} alt={ref.name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="truncate">{ref.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* CENTER: Canvas (capped) + Multi-Agent Metrics */}
              <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-y-auto" style={{ height: COL_HEIGHT }}>
                {/* Supervisor Review Canvas */}
                <Card className="flex flex-col min-h-0 border-teal-500/30 overflow-hidden" style={{ flex: '0 1 auto', maxHeight: '48%', minHeight: 0 }}>
                  <CardHeader className="pb-1 shrink-0 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <PenTool className="w-4 h-4 text-teal-600" />
                          Supervisor Review Canvas
                        </CardTitle>
                        <CardDescription className="text-[10px] mt-0.5">
                          {"整合 Specs、作品、Reference，可直接圈選標註"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-3 py-1 border-y bg-muted/30 shrink-0">
                      <div className="flex items-center gap-0.5">
                        {canvasTools.map((tool) => (
                          <Button key={tool.id} variant={canvasTool === tool.id ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setCanvasTool(tool.id)} title={tool.label}>
                            <tool.icon className="w-3.5 h-3.5" />
                          </Button>
                        ))}
                        <div className="w-px h-5 bg-border mx-1" />
                        {colorPalette.map((color) => (
                          <button key={color} type="button" className={`rounded-full border-2 transition-all ${brushColor === color ? 'border-foreground scale-110 ring-2 ring-foreground/20' : 'border-muted-foreground/30'}`} style={{ backgroundColor: color, width: 18, height: 18 }} onClick={() => setBrushColor(color)} />
                        ))}
                        <div className="w-px h-5 bg-border mx-1" />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleUndo}><Undo2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleClearCanvas}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[8px] h-4 bg-blue-500/10 text-blue-600 border-blue-500/30">Work</Badge>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setArtworkZoom(Math.max(50, artworkZoom - 25))}><ZoomOut className="w-3 h-3" /></Button>
                        <span className="text-[10px] font-medium w-8 text-center">{artworkZoom}%</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setArtworkZoom(Math.min(200, artworkZoom + 25))}><ZoomIn className="w-3 h-3" /></Button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <Badge variant="outline" className="text-[8px] h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">Ref</Badge>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRefZoom(Math.max(50, refZoom - 25))}><ZoomOut className="w-3 h-3" /></Button>
                        <span className="text-[10px] font-medium w-8 text-center">{refZoom}%</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRefZoom(Math.min(200, refZoom + 25))}><ZoomIn className="w-3 h-3" /></Button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <Button variant={showSpecs ? "default" : "outline"} size="sm" className={`h-6 text-[10px] gap-0.5 ${!showSpecs ? 'bg-transparent' : ''}`} onClick={() => setShowSpecs(!showSpecs)}>
                          <FileCheck className="w-3 h-3" /> Specs
                        </Button>
                        <Button variant={showRefsRow ? "default" : "outline"} size="sm" className={`h-6 text-[10px] gap-0.5 ${!showRefsRow ? 'bg-transparent' : ''}`} onClick={() => setShowRefsRow(!showRefsRow)}>
                          <ImageIcon className="w-3 h-3" /> Refs
                        </Button>
                        <Button variant={showFeedbackPanel ? "default" : "outline"} size="sm" className={`h-6 text-[10px] gap-0.5 ${!showFeedbackPanel ? 'bg-transparent' : ''}`} onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}>
                          <MessageSquare className="w-3 h-3" /> {"回饋"}
                        </Button>
                      </div>
                    </div>

                    {/* Refs Row (toggle) */}
                    {showRefsRow && (
                      <div className="shrink-0 border-b bg-muted/20 px-3 py-1.5">
                        <ScrollArea className="w-full">
                          <div className="flex items-center gap-2 pb-2">
                            <span className="text-[10px] text-muted-foreground shrink-0">References:</span>
                            {currentArt?.refs.map((ref) => (
                              <div
                                key={ref.id}
                                className={`shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedRef === ref.id ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-border hover:border-amber-500/50'}`}
                                onClick={() => setSelectedRef(ref.id)}
                              >
                                <div className="w-20 h-14 bg-muted overflow-hidden">
                                  <img src={ref.image || "/placeholder.svg"} alt={ref.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="px-1.5 py-0.5 bg-card">
                                  <p className="text-[9px] font-medium truncate">{ref.name}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    )}

                    {/* Canvas 3-panel: Specs | Image+Drawing | Feedback */}
                    <div className="flex flex-1 min-h-0 overflow-hidden">
                      {/* Specs Panel */}
                      {showSpecs && (
                        <div className="w-44 border-r flex flex-col shrink-0 bg-card overflow-hidden">
                          <div className="flex items-center justify-between px-2 py-1 border-b shrink-0">
                            <div className="flex items-center gap-1">
                              <FileCheck className="w-3 h-3 text-teal-600" />
                              <span className="text-[10px] font-semibold">Specs</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShowSpecs(false)}><X className="w-3 h-3" /></Button>
                          </div>
                          <ScrollArea className="flex-1 min-h-0">
                            <div className="p-2 space-y-2">
                              <div>
                                <h4 className="text-[10px] font-semibold text-muted-foreground mb-1">Supervisor Specs</h4>
                                <ul className="space-y-0.5">
                                  {directorSpecs.items.map((item, idx) => (
                                    <li key={idx} className="text-[10px] flex items-start gap-1"><span className="text-teal-600 mt-0.5 shrink-0">{"•"}</span><span>{item}</span></li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-semibold text-muted-foreground mb-1">Technical</h4>
                                <ul className="space-y-0.5">
                                  {directorSpecs.technical.map((t, idx) => (
                                    <li key={idx} className="text-[10px] flex items-start gap-1"><span className="text-teal-600 mt-0.5 shrink-0">{"•"}</span><span>{t.label}: {t.value}</span></li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-semibold text-muted-foreground mb-1">Priorities</h4>
                                <ul className="space-y-0.5">
                                  {directorSpecs.priorities.map((p) => (
                                    <li key={p.id} className="text-[10px] flex items-start gap-1"><span className="text-teal-600 mt-0.5 shrink-0">{"•"}</span><span>{p.id}: {p.text}</span></li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Center: Canvas with drawing overlay */}
                      <div className="flex-1 relative overflow-hidden bg-neutral-900 min-w-0 flex flex-col" ref={canvasContainerRef}>
                        {/* Side-by-side: artwork left, ref right */}
                        <div className="flex-1 flex min-h-0 relative">
                          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                            <img src={currentArt?.image || "/placeholder.svg"} alt="Artwork" className="max-w-full max-h-full object-contain" crossOrigin="anonymous" style={{ transform: `scale(${artworkZoom / 100})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }} />
                            <Badge className="absolute top-2 left-2 bg-blue-500 text-[10px] h-5">Work</Badge>
                          </div>
                          <div className="w-px bg-white/30 shrink-0" />
                          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                            <img src={currentRef?.image || "/placeholder.svg"} alt="Reference" className="max-w-full max-h-full object-contain" crossOrigin="anonymous" style={{ transform: `scale(${refZoom / 100})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }} />
                            <Badge className="absolute top-2 right-2 bg-amber-500 text-[10px] h-5">Ref</Badge>
                          </div>
                        </div>
                        {/* Canvas drawing overlay - covers the entire image area */}
                        <canvas
                          ref={canvasRef}
                          className="absolute inset-0 w-full h-full"
                          style={{ cursor: canvasTool === "pointer" ? "default" : canvasTool === "text" ? "text" : canvasTool === "eraser" ? "cell" : "crosshair", pointerEvents: canvasTool === "pointer" ? "none" : "auto", zIndex: 10 }}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={(e) => { if (isDrawing) handleCanvasMouseUp(e) }}
                        />
                        {/* Text input overlay */}
                        {textInputPos && (
                          <div className="absolute z-20" style={{ left: textInputPos.cssX, top: textInputPos.cssY }}>
                            <Input
                              autoFocus
                              value={textInputValue}
                              onChange={(e) => setTextInputValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleTextSubmit(); if (e.key === 'Escape') { setTextInputPos(null); setTextInputValue("") } }}
                              onBlur={handleTextSubmit}
                              className="text-xs h-7 w-48 bg-white text-black border-2 border-teal-500"
                              placeholder="輸入標註文字..."
                            />
                          </div>
                        )}
                        {/* Per-ref gap summary bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5 flex items-center gap-2 z-[5]">
                          <Badge variant="outline" className="text-[9px] h-4 border-amber-500/50 text-amber-300">Gap</Badge>
                          <span className="text-[10px] text-white/80 flex-1">{currentRef?.gapSummary || "選擇 Reference 以顯示差距摘要"}</span>
                        </div>
                      </div>

                      {/* Feedback Panel - scrollable */}
                      {showFeedbackPanel && (
                        <div className="w-56 border-l flex flex-col shrink-0 bg-card overflow-hidden">
                          <div className="flex items-center justify-between px-2 py-1 border-b shrink-0">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-teal-600" />
                              <span className="text-[10px] font-semibold">{"回饋清單"}</span>
                              <Badge variant="secondary" className="text-[8px] h-3.5">{feedbackItems.filter(f => !f.addressed).length} {"待處理"}</Badge>
                            </div>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShowFeedbackPanel(false)}><X className="w-3 h-3" /></Button>
                          </div>
                          {/* AI Analysis Summary */}
                          <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/20 shrink-0">
                            <Bot className="w-3 h-3 text-teal-600" />
                            <span className="text-[9px] font-semibold">AI {"分析結果"}</span>
                            <Badge variant="destructive" className="text-[7px] h-3 px-0.5">{feedbackItems.filter(f => f.priority === "P0").length} High</Badge>
                            <Badge className="text-[7px] h-3 px-0.5 bg-amber-500">{feedbackItems.filter(f => f.priority === "P1").length} Med</Badge>
                            <Badge variant="secondary" className="text-[7px] h-3 px-0.5">{feedbackItems.filter(f => f.priority === "P2").length} Low</Badge>
                          </div>
                          <ScrollArea className="flex-1 min-h-0">
                            <div className="p-1.5 space-y-1.5">
                              {sortedFeedback.map((item) => {
                                const priorityColors = { P0: "border-red-500/30 bg-red-500/5", P1: "border-amber-500/30 bg-amber-500/5", P2: "border-green-500/30 bg-green-500/5" }
                                const priorityIcon = item.priority === "P0" ? <AlertCircle className="w-2.5 h-2.5 text-red-500" /> : item.priority === "P1" ? <AlertTriangle className="w-2.5 h-2.5 text-amber-500" /> : <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                                return (
                                  <div key={item.id} className={`p-1.5 rounded border ${priorityColors[item.priority as keyof typeof priorityColors] || "border-border"} ${item.addressed ? 'opacity-40' : ''}`}>
                                    <div className="flex items-start gap-1 mb-0.5">
                                      {priorityIcon}
                                      <Badge variant="outline" className="text-[7px] h-3 px-0.5 shrink-0">{item.priority}</Badge>
                                      {item.source === "AI" && <Badge variant="outline" className="text-[7px] h-3 px-0.5 bg-teal-500/10 text-teal-600 border-teal-500/30 gap-0.5"><Bot className="w-2 h-2" />AI</Badge>}
                                      <div className="flex-1" />
                                      <Button variant="ghost" size="sm" className="h-3.5 w-3.5 p-0 text-green-600" onClick={() => toggleAddressed(item.id)}><CheckCircle2 className="w-2.5 h-2.5" /></Button>
                                      <Button variant="ghost" size="sm" className="h-3.5 w-3.5 p-0 text-red-500" onClick={() => setFeedbackItems(prev => prev.filter(f => f.id !== item.id))}><X className="w-2.5 h-2.5" /></Button>
                                    </div>
                                    <p className="text-[9px] leading-relaxed">{item.text}</p>
                                    {item.aiDraft && (
                                      <div className="p-1 mt-1 rounded bg-teal-500/10 border border-teal-500/20">
                                        <div className="flex items-center gap-0.5 mb-0.5">
                                          <Sparkles className="w-2 h-2 text-teal-600" />
                                          <span className="text-[7px] font-semibold text-teal-700">AI {"潤稿版本"}</span>
                                        </div>
                                        <p className="text-[8px] text-teal-800 leading-relaxed">{item.aiDraft}</p>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </ScrollArea>
                          {/* Add feedback */}
                          <div className="p-1.5 border-t shrink-0">
                            <div className="flex gap-1">
                              <Input placeholder="新增回饋..." value={newFeedbackText} onChange={(e) => setNewFeedbackText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddFeedback() }} className="text-[10px] h-6 flex-1" />
                              <Button size="sm" className="h-6 w-6 p-0 shrink-0" onClick={handleAddFeedback}><Plus className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Annotations + Labels + Specs - contained inside card */}
                    <div className="border-t shrink-0 overflow-hidden" style={{ maxHeight: '120px' }}>
                      <ScrollArea className="h-full">
                        <div className="divide-y">
                          <div className="px-3 py-1">
                            <h4 className="text-[10px] font-semibold mb-0.5">{"新增註解"}</h4>
                            <div className="flex gap-1 mb-0.5">
                              <Input placeholder="輸入導演註解..." value={newAnnotationText} onChange={(e) => setNewAnnotationText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddAnnotation() }} className="text-[10px] h-5" />
                              <Button size="sm" className="h-5 w-5 p-0 shrink-0" onClick={handleAddAnnotation}><Plus className="w-2.5 h-2.5" /></Button>
                            </div>
                            {annotations.length > 0 && <div className="space-y-0">{annotations.map((ann) => (
                              <div key={ann.id} className="flex items-center justify-between"><div className="flex items-center gap-1"><Tag className="w-2 h-2 text-teal-600" /><span className="text-[8px]">{ann.text}</span></div><span className="text-[7px] text-muted-foreground">{ann.time}</span></div>
                            ))}</div>}
                          </div>
                          <div className="px-3 py-1">
                            <div className="flex items-center gap-1 mb-0.5"><Tag className="w-2.5 h-2.5" /><h4 className="text-[10px] font-semibold">Labels</h4></div>
                            <div className="flex items-center gap-1 flex-wrap mb-0.5">
                              {labels.map((label, idx) => (
                                <Badge key={idx} variant="outline" className="text-[8px] gap-0.5 h-3.5">{label}<button type="button" onClick={() => setLabels(prev => prev.filter((_, i) => i !== idx))} className="ml-0.5 hover:text-red-500"><X className="w-1.5 h-1.5" /></button></Badge>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              <Input placeholder="新增 Label..." value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddLabel() }} className="text-[10px] h-5" />
                              <Button size="sm" className="h-5 w-5 p-0 shrink-0" onClick={handleAddLabel}><Plus className="w-2 h-2" /></Button>
                            </div>
                          </div>
                          <div className="px-3 py-1">
                            <div className="flex items-center gap-1 mb-0.5"><FileCheck className="w-2.5 h-2.5" /><h4 className="text-[10px] font-semibold">Specs</h4></div>
                            {inlineSpecs.length > 0 && <div className="space-y-0 mb-0.5">{inlineSpecs.map((spec, idx) => (
                              <div key={idx} className="flex items-center justify-between"><div className="flex items-center gap-1"><CheckCircle2 className="w-2 h-2 text-teal-500" /><span className="text-[8px]">{spec}</span></div><button type="button" onClick={() => setInlineSpecs(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-500"><X className="w-2 h-2" /></button></div>
                            ))}</div>}
                            <div className="flex gap-1">
                              <Input placeholder="新增 Spec..." value={newSpecText} onChange={(e) => setNewSpecText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddSpec() }} className="text-[10px] h-5" />
                              <Button size="sm" className="h-5 w-5 p-0 shrink-0" onClick={handleAddSpec}><Plus className="w-2 h-2" /></Button>
                            </div>
                          </div>
                          {/* Submit All Annotations to Agent */}
                          <div className="px-3 py-1.5 border-t bg-teal-500/5">
                            <Button size="sm" className="w-full h-7 text-xs gap-1" onClick={() => {
                              const textAnnotations = canvasAnnotations.filter(a => a.type === "text" && a.text)
                              const brushStrokes = canvasAnnotations.filter(a => a.type === "brush")
                              const shapes = canvasAnnotations.filter(a => a.type === "circle" || a.type === "rect")
                              const summary = [
                                `[Canvas Review Submit - 含圈選塗改痕跡]`,
                                `文字註解 (${annotations.length}): ${annotations.map(a => a.text).join("; ")}`,
                                `Labels: ${labels.join(", ")}`,
                                `Specs: ${inlineSpecs.join("; ")}`,
                                `---Canvas 塗改記錄---`,
                                `畫筆標記: ${brushStrokes.length} 筆 (${brushStrokes.map(b => b.color).filter((v, i, a) => a.indexOf(v) === i).join(", ")})`,
                                `圈選/框選: ${shapes.length} 個`,
                                textAnnotations.length > 0 ? `畫面文字標註: ${textAnnotations.map(t => `"${t.text}"`).join(", ")}` : "",
                                `橡皮擦: ${canvasAnnotations.filter(a => a.type === "eraser").length} 筆`,
                              ].filter(Boolean).join("\n")
                              setChatMessages(prev => [...prev, { role: "user", content: summary }])
                              setTimeout(() => {
                                setChatMessages(prev => [...prev, { role: "ai", content: `收到所有 Canvas 註解與塗改痕跡！\n\n已整理：\n- ${annotations.length} 條文字註解\n- ${labels.length} 個 Labels\n- ${inlineSpecs.length} 條 Specs\n- ${brushStrokes.length} 筆畫筆標記\n- ${shapes.length} 個圈選/框選\n- ${textAnnotations.length} 個畫面文字標註\n\n所有塗改痕跡已記錄並包含在提交結果中。建議將重點項目加入回饋清單。需要我幫您潤稿嗎？` }])
                              }, 800)
                            }}>
                              <Send className="w-3 h-3" />
                              {"Submit All to Agent"}
                            </Button>
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>

                {/* Multi-Agent Metrics - always visible below canvas */}
                <Collapsible open={showMetrics} onOpenChange={setShowMetrics}>
                  <Card className="shrink-0 mt-1">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 py-1.5 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            <CardTitle className="text-xs">Overall AI Feedback</CardTitle>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-red-500">{metrics.filter(m => m.status === "red").length}R</span>
                            <span className="text-[10px] text-amber-500">{metrics.filter(m => m.status === "yellow").length}Y</span>
                            <span className="text-[10px] text-green-500">{metrics.filter(m => m.status === "green").length}G</span>
                            {showMetrics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-2 px-3">
                        <div className="grid grid-cols-4 gap-1">
                          {metrics.map((m) => (
                            <div key={m.id} className={`p-1.5 rounded-lg ${getStatusBg(m.status)} ${isMetricMentioned(m.id) ? "border-2" : "border border-dashed"} cursor-pointer`} onClick={() => { setSelectedMetricDetail(m); setShowMetricDetailDialog(true) }}>
                              <div className="flex items-center gap-1">
                                <Checkbox checked={checkedMetrics.includes(m.id)} onCheckedChange={(c) => handleMetricCheck(m.id, c as boolean)} className="h-3 w-3" onClick={(e) => e.stopPropagation()} />
                                {getStatusIcon(m.status)}
                                <span className="text-[10px] font-medium">{m.name}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 ml-4">
                                <Badge variant="outline" className="text-[7px] h-3 px-0.5">{m.refBasis}</Badge>
                                {!m.consensus && <Badge variant="outline" className="text-[7px] h-3 px-0.5 bg-amber-500/10 text-amber-600">{"分歧"}</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Artist Per-Frame Reflection (from C03) */}
                <Collapsible open={showArtistNotes} onOpenChange={setShowArtistNotes}>
                  <Card className="shrink-0 mt-1 border-indigo-500/30 bg-indigo-500/5">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 py-1.5 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <CardTitle className="text-xs">Artist Creation Intentions</CardTitle>
                            <Badge variant="outline" className="text-[8px] h-3.5 bg-indigo-500/10 text-indigo-600 border-indigo-500/30">C03</Badge>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {artistReflections[selectedArtwork] && (
                              <Badge variant="secondary" className="text-[8px] h-3.5">
                                {artistReflections[selectedArtwork].artist}
                              </Badge>
                            )}
                            {showArtistNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-2 px-3">
                        {artistReflections[selectedArtwork] ? (
                          <div className="space-y-2">
                            {/* Artist's creation intentions */}
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <User className="w-2.5 h-2.5 text-indigo-600" />
                                <span className="text-[9px] font-semibold text-indigo-700">Creation Intentions</span>
                                <span className="text-[8px] text-muted-foreground ml-auto">{artistReflections[selectedArtwork].timestamp}</span>
                              </div>
                              <div className="space-y-0.5">
                                {artistReflections[selectedArtwork].intentions.map((intent, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 p-1 rounded bg-indigo-500/10 border border-indigo-500/20">
                                    <span className="text-indigo-600 text-[9px] mt-px shrink-0">{idx + 1}.</span>
                                    <span className="text-[9px] leading-relaxed">{intent}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Artist's reflection notes */}
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <BookOpen className="w-2.5 h-2.5 text-indigo-600" />
                                <span className="text-[9px] font-semibold text-indigo-700">Reflection Notes</span>
                              </div>
                              <div className="p-1.5 rounded bg-background border text-[9px] leading-relaxed whitespace-pre-line">
                                {artistReflections[selectedArtwork].notes}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-3 text-muted-foreground">
                            <BookOpen className="w-5 h-5 mx-auto mb-1.5 opacity-30" />
                            <p className="text-[10px]">{"此 Shot 尚無 Artist 反思記錄"}</p>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </div>

              {/* RIGHT: AI Assistant */}
              <div className="w-64 shrink-0 flex flex-col gap-3" style={{ height: COL_HEIGHT }}>
                <Card className="border-teal-500/30 flex flex-col flex-1 min-h-0">
                  <CardHeader className="pb-1 shrink-0 py-2">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-teal-600" />
                      <div>
                        <CardTitle className="text-xs">{"AI 助手"}</CardTitle>
                        <CardDescription className="text-[10px]">{"AI 調整語氣風格輸出"}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 flex flex-col p-0">
                    {/* Chat messages - scrollable */}
                    <ScrollArea className="flex-1 min-h-0">
                      <div className="px-3 py-2 space-y-2.5">
                        {chatMessages.length === 0 && (
                          <div className="text-center py-6 text-muted-foreground">
                            <Bot className="w-6 h-6 mx-auto mb-2 opacity-30" />
                            <p className="text-[10px]">{"輸入會議記錄按 Save，或直接在下方對話"}</p>
                          </div>
                        )}
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="w-6 h-6 shrink-0">
                              <AvatarFallback className={msg.role === 'ai' ? 'bg-teal-500/10 text-teal-600' : 'bg-primary/10'}>
                                {msg.role === 'ai' ? <Bot className="w-3 h-3" /> : 'D'}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`rounded-lg p-2 max-w-[85%] ${msg.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                              <p className="text-[10px] whitespace-pre-line leading-relaxed">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {/* Input area */}
                    <div className="px-3 py-2 border-t space-y-1.5 shrink-0">
                      {/* Tone/Style selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground shrink-0">{"語氣風格:"}</span>
                        <Select value={toneStyle} onValueChange={setToneStyle}>
                          <SelectTrigger className="h-5 text-[9px] flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">{"專業正式"}</SelectItem>
                            <SelectItem value="gentle">{"溫和鼓勵"}</SelectItem>
                            <SelectItem value="direct">{"簡潔直接"}</SelectItem>
                            <SelectItem value="detailed">{"詳細解釋"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={() => setChatInput("釐清模糊詞")}>{"釐清模糊詞"}</Button>
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={() => setChatInput("轉成可操作建議")}>{"轉建議"}</Button>
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={() => setChatInput("調整語氣風格")}>{"語氣風格"}</Button>
                        <Button variant="outline" size="sm" className="text-[9px] h-5 bg-transparent" onClick={handleAnalyzeFeedback} disabled={analyzingFeedback}>
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" />{analyzingFeedback ? "..." : "AI 分析"}
                        </Button>
                      </div>
                      <div className="flex gap-1.5">
                        <Input placeholder="輸入問題..." className="text-[10px] h-7" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} />
                        <Button size="sm" className="h-7 w-7 p-0" onClick={handleChatSend}><Send className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Metric Detail Dialog */}
          <Dialog open={showMetricDetailDialog} onOpenChange={setShowMetricDetailDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{selectedMetricDetail && getStatusIcon(selectedMetricDetail.status)}{selectedMetricDetail?.name}</DialogTitle>
                <DialogDescription>{selectedMetricDetail?.agents.join(" & ")}</DialogDescription>
              </DialogHeader>
              {selectedMetricDetail && metricDetails[selectedMetricDetail.id] && (
                <div className="space-y-4">
                  <Card className={`p-4 ${getStatusBg(selectedMetricDetail.status)}`}><p className="text-sm text-muted-foreground">{metricDetails[selectedMetricDetail.id].analysis}</p></Card>
                  <div className="grid grid-cols-2 gap-3">
                    {metricDetails[selectedMetricDetail.id].agentOpinions.map((op, idx) => (
                      <Card key={idx} className="p-3"><span className="text-xs text-muted-foreground">{op.agent}</span><Badge variant="outline" className="text-xs ml-2">{op.confidence}%</Badge><p className="text-sm mt-1">{op.opinion}</p></Card>
                    ))}
                  </div>
                  {metricDetails[selectedMetricDetail.id].debate && (<div className="p-2 bg-teal-500/10 rounded text-sm text-teal-700"><strong>Debate:</strong> {metricDetails[selectedMetricDetail.id].debate!.consensus}</div>)}
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowMetricDetailDialog(false)} className="bg-transparent">{"關閉"}</Button><Button><CheckCircle2 className="w-4 h-4 mr-2" />{"已確認"}</Button></div>
                </div>
              )}
              {selectedMetricDetail && !metricDetails[selectedMetricDetail.id] && (<div className="p-4 text-center text-muted-foreground">{"資料尚未載入"}</div>)}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
