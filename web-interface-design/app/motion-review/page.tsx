"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Film, Play, SkipBack, SkipForward, Clock, Camera, Gauge, AlertTriangle } from "lucide-react"

export default function MotionReviewPage() {
  const rhythmMismatches = [
    {
      id: 1,
      segment: "00:02:15 - 00:02:18",
      reason: "動作節奏過慢，與背景音樂不符",
      suggestion: "加快 0.3 秒",
      severity: "high",
    },
    {
      id: 2,
      segment: "00:03:22 - 00:03:25",
      reason: "鏡頭切換時機延遲",
      suggestion: "提前 5 frames 切換",
      severity: "medium",
    },
    {
      id: 3,
      segment: "00:04:10 - 00:04:12",
      reason: "角色反應速度不自然",
      suggestion: "調整 timing curve",
      severity: "low",
    },
  ]

  const shotSpecs = [
    { shot: "Shot_005", fps: 24, length: "3.2s", focal: "50mm", cameraMove: "Static" },
    { shot: "Shot_006", fps: 24, length: "2.8s", focal: "35mm", cameraMove: "Dolly In" },
    { shot: "Shot_007", fps: 24, length: "4.1s", focal: "85mm", cameraMove: "Pan Right" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
              <Film className="w-5 h-5" />
            </div>
            <Badge variant="outline">C07</Badge>
            <h1 className="text-3xl font-bold">節奏/鏡頭/動態檢查</h1>
          </div>
          <p className="text-muted-foreground">Timing、Focal length、Rhythm 分析</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Timeline Viewer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="w-5 h-5" />
                  Timeline Viewer
                </CardTitle>
                <CardDescription>時間軸檢視與節奏標記</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src="/vfx-shot-sequence-animation.jpg"
                    alt="Video Player"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Playback Controls */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Button size="icon" variant="outline">
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button size="icon">
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline">
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>00:00:00</span>
                      <span>00:02:45</span>
                      <span>00:05:30</span>
                    </div>
                    <Slider defaultValue={[33]} max={100} step={1} />
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline">00:02:15</Badge>
                      <span className="text-muted-foreground">24 FPS</span>
                    </div>
                  </div>
                </div>

                {/* Beat Markers */}
                <div className="pt-4 border-t border-border">
                  <Label className="text-sm mb-3 block">節奏標記 (Director 可直接標記)</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">Beat 1 @ 00:00:15</Badge>
                    <Badge variant="secondary">Beat 2 @ 00:01:05</Badge>
                    <Badge variant="secondary">Beat 3 @ 00:02:15</Badge>
                    <Button size="sm" variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      新增標記
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rhythm Diff */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="w-5 h-5" />
                  節奏差異分析 Rhythm Diff
                </CardTitle>
                <CardDescription>Motion board vs cut 比對</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rhythmMismatches.map((mismatch) => (
                    <div
                      key={mismatch.id}
                      className={`p-4 rounded-lg border ${
                        mismatch.severity === "high"
                          ? "border-red-500/20 bg-red-500/5"
                          : mismatch.severity === "medium"
                            ? "border-amber-500/20 bg-amber-500/5"
                            : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            mismatch.severity === "high"
                              ? "text-red-400"
                              : mismatch.severity === "medium"
                                ? "text-amber-400"
                                : "text-muted-foreground"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {mismatch.segment}
                            </Badge>
                            <Badge
                              variant={
                                mismatch.severity === "high"
                                  ? "destructive"
                                  : mismatch.severity === "medium"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {mismatch.severity === "high" ? "高" : mismatch.severity === "medium" ? "中" : "低"}
                            </Badge>
                          </div>
                          <p className="text-sm mb-1">{mismatch.reason}</p>
                          <p className="text-xs text-muted-foreground">建議：{mismatch.suggestion}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          跳至
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shot Specs Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  鏡頭規格與單位
                </CardTitle>
                <CardDescription>Shot Scale & Units checklist</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium">Shot</th>
                        <th className="text-left py-2 px-3 font-medium">FPS</th>
                        <th className="text-left py-2 px-3 font-medium">Length</th>
                        <th className="text-left py-2 px-3 font-medium">Focal Length</th>
                        <th className="text-left py-2 px-3 font-medium">Camera Move</th>
                        <th className="text-center py-2 px-3 font-medium">Check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shotSpecs.map((spec, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-accent/50">
                          <td className="py-3 px-3 font-mono">{spec.shot}</td>
                          <td className="py-3 px-3">{spec.fps}</td>
                          <td className="py-3 px-3">{spec.length}</td>
                          <td className="py-3 px-3">{spec.focal}</td>
                          <td className="py-3 px-3">
                            <Badge variant="secondary">{spec.cameraMove}</Badge>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Checkbox />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Controls & Settings */}
          <div className="space-y-6">
            {/* Speed/Focal Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI 建議</CardTitle>
                <CardDescription>速度與焦段建議</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Label className="text-sm font-medium mb-2 block">建議焦段</Label>
                  <p className="text-sm mb-1">Shot_005: 建議從 50mm 改為 35mm</p>
                  <p className="text-xs text-muted-foreground">原因：增加環境資訊，加強空間感</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Label className="text-sm font-medium mb-2 block">建議速度</Label>
                  <p className="text-sm mb-1">Sequence_A: 建議加快 15%</p>
                  <p className="text-xs text-muted-foreground">原因：與音樂節奏更匹配</p>
                </div>
              </CardContent>
            </Card>

            {/* Playback Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">播放設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">播放速度</Label>
                  <Select defaultValue="1.0">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.25">0.25x</SelectItem>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="1.0">1.0x (正常)</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2.0">2.0x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">顯示模式</Label>
                  <Select defaultValue="timecode">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="timecode">Timecode</SelectItem>
                      <SelectItem value="frame">Frame Number</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Budget Awareness */}
            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  預算提醒
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  目前僅列出 Top 3 最重要的節奏問題，以符合預算限制。
                </p>
                <Button size="sm" variant="outline" className="w-full bg-transparent">
                  查看完整清單
                </Button>
              </CardContent>
            </Card>

            {/* ShotGrid Mapping */}
            <Card className="border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-sm">ShotGrid 對應</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Version (影片) + Note</p>
                  <p>• Timecode annotations</p>
                  <p>• Playlist (一組鏡頭 review)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
