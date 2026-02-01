"use client"

import React from "react"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Layers,
  SplitSquareHorizontal,
  GitCompare,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  Target,
  Palette,
  Sun,
  Grid3X3
} from "lucide-react"

interface SimilarityMetric {
  name: string
  score: number
  status: "match" | "close" | "mismatch"
  details: string
  icon: React.ReactNode
}

interface RefFrameCompareProps {
  workImage: string
  referenceImages: string[]
  onSelectReference?: (index: number) => void
}

export function RefFrameCompare({
  workImage = "/vfx-work-in-progress-shot.jpg",
  referenceImages = ["/reference-movie-frame.jpg", "/composition-reference.jpg"],
  onSelectReference
}: RefFrameCompareProps) {
  const [viewMode, setViewMode] = useState<"slider" | "split" | "overlay">("slider")
  const [sliderPosition, setSliderPosition] = useState(50)
  const [currentRefIndex, setCurrentRefIndex] = useState(0)
  const [overallSimilarity] = useState(87)

  const metrics: SimilarityMetric[] = [
    {
      name: "Composition",
      score: 92,
      status: "match",
      details: "Rule of thirds 對齊良好，主體位置相符",
      icon: <Grid3X3 className="h-4 w-4" />
    },
    {
      name: "Lighting",
      score: 78,
      status: "close",
      details: "主光方向一致，但 rim light 強度偏高",
      icon: <Sun className="h-4 w-4" />
    },
    {
      name: "Color Palette",
      score: 85,
      status: "match",
      details: "色調整體相符，暖色調略有偏差",
      icon: <Palette className="h-4 w-4" />
    },
    {
      name: "Focal Point",
      score: 95,
      status: "match",
      details: "視覺焦點位置與參考高度一致",
      icon: <Target className="h-4 w-4" />
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "match": return "text-green-600 bg-green-50"
      case "close": return "text-amber-600 bg-amber-50"
      case "mismatch": return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "match": return <CheckCircle className="h-4 w-4 text-green-600" />
      case "close": return <Info className="h-4 w-4 text-amber-600" />
      case "mismatch": return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return null
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-teal-600" />
            Ref-Frame 對照比較
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-teal-100 text-teal-700">
              相似度 {overallSimilarity}%
            </Badge>
          </div>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant={viewMode === "slider" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("slider")}
            className={viewMode === "slider" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            <SplitSquareHorizontal className="h-4 w-4 mr-1" />
            滑桿
          </Button>
          <Button
            variant={viewMode === "split" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("split")}
            className={viewMode === "split" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            <GitCompare className="h-4 w-4 mr-1" />
            並排
          </Button>
          <Button
            variant={viewMode === "overlay" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("overlay")}
            className={viewMode === "overlay" ? "bg-teal-600 hover:bg-teal-700" : ""}
          >
            <Layers className="h-4 w-4 mr-1" />
            疊加
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="flex gap-4">
          {/* Image Comparison Area */}
          <div className="flex-1">
            {/* Reference Selector */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">參考圖:</span>
                <Badge variant="outline">
                  {currentRefIndex + 1} / {referenceImages.length}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-transparent"
                  onClick={() => {
                    const newIndex = Math.max(0, currentRefIndex - 1)
                    setCurrentRefIndex(newIndex)
                    onSelectReference?.(newIndex)
                  }}
                  disabled={currentRefIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-transparent"
                  onClick={() => {
                    const newIndex = Math.min(referenceImages.length - 1, currentRefIndex + 1)
                    setCurrentRefIndex(newIndex)
                    onSelectReference?.(newIndex)
                  }}
                  disabled={currentRefIndex === referenceImages.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Comparison View */}
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {viewMode === "slider" && (
                <>
                  {/* Reference Image (Background) */}
                  <div className="absolute inset-0">
                    <Image
                      src={referenceImages[currentRefIndex] || "/reference-movie-frame.jpg"}
                      alt="Reference"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-amber-100 text-amber-700">參考</Badge>
                    </div>
                  </div>
                  
                  {/* Work Image (Clipped) */}
                  <div 
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  >
                    <Image
                      src={workImage || "/placeholder.svg"}
                      alt="Work"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-teal-100 text-teal-700">作品</Badge>
                    </div>
                  </div>
                  
                  {/* Slider Handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                      <SplitSquareHorizontal className="h-4 w-4 text-teal-600" />
                    </div>
                  </div>
                </>
              )}

              {viewMode === "split" && (
                <div className="grid grid-cols-2 h-full">
                  <div className="relative border-r">
                    <Image
                      src={workImage || "/placeholder.svg"}
                      alt="Work"
                      fill
                      className="object-cover"
                    />
                    <Badge className="absolute top-2 left-2 bg-teal-100 text-teal-700">作品</Badge>
                  </div>
                  <div className="relative">
                    <Image
                      src={referenceImages[currentRefIndex] || "/reference-movie-frame.jpg"}
                      alt="Reference"
                      fill
                      className="object-cover"
                    />
                    <Badge className="absolute top-2 right-2 bg-amber-100 text-amber-700">參考</Badge>
                  </div>
                </div>
              )}

              {viewMode === "overlay" && (
                <div className="relative h-full">
                  <Image
                    src={referenceImages[currentRefIndex] || "/reference-movie-frame.jpg"}
                    alt="Reference"
                    fill
                    className="object-cover"
                  />
                  <div 
                    className="absolute inset-0"
                    style={{ opacity: sliderPosition / 100 }}
                  >
                    <Image
                      src={workImage || "/placeholder.svg"}
                      alt="Work"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge className="bg-teal-100 text-teal-700">作品 {sliderPosition}%</Badge>
                    <Badge className="bg-amber-100 text-amber-700">參考 {100 - sliderPosition}%</Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Slider Control */}
            {(viewMode === "slider" || viewMode === "overlay") && (
              <div className="mt-3 px-2">
                <Slider
                  value={[sliderPosition]}
                  onValueChange={([value]) => setSliderPosition(value)}
                  max={100}
                  step={1}
                />
              </div>
            )}
          </div>

          {/* Metrics Panel */}
          <div className="w-72">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">分析指標</span>
              <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
                <Sparkles className="h-3 w-3 mr-1" />
                重新分析
              </Button>
            </div>
            
            {/* Overall Score */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-teal-700">整體相似度</span>
                <span className="text-2xl font-bold text-teal-700">{overallSimilarity}%</span>
              </div>
              <Progress value={overallSimilarity} className="h-2" />
            </div>

            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {metrics.map((metric, i) => (
                  <Card key={i} className="shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${getStatusColor(metric.status)}`}>
                            {metric.icon}
                          </div>
                          <span className="text-sm font-medium">{metric.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(metric.status)}
                          <span className="text-sm font-bold">{metric.score}%</span>
                        </div>
                      </div>
                      <Progress value={metric.score} className="h-1.5 mb-2" />
                      <p className="text-xs text-muted-foreground">{metric.details}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* AI Insights */}
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                AI 洞察
              </div>
              <p className="text-xs text-muted-foreground">
                整體構圖與參考高度一致。建議調整 rim light 強度以更貼近參考的光影氛圍。
                色調可以稍微增加暖色比重約 5-10%。
              </p>
              <Button variant="outline" size="sm" className="w-full mt-2 text-xs h-7 bg-transparent">
                <ZoomIn className="h-3 w-3 mr-1" />
                查看詳細分析
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
