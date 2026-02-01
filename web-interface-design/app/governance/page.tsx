"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Shield, AlertTriangle, CheckCircle2, FileText, Crown, Send, ArrowRight, Users, Bot, Sparkles } from "lucide-react"
import { AIChatPanel } from "@/components/ai-chat-panel"
import { AISidebarChatbot } from "@/components/ai-sidebar-chatbot"
import Link from "next/link"

export default function GovernancePage() {
  const decisionLog = [
    {
      id: 1,
      issue: "Shot_005 光影方向衝突",
      parties: ["Director Wang (Top light)", "Supervisor Li (Side light)", "AI (Front fill)"],
      resolution: "採用 Director Wang 的 Top light 方案",
      finalAuthority: "Director Wang",
      rationale: "符合整體敘事氛圍，強調角色孤立感",
      date: "2024-01-15",
      status: "finalized",
    },
    {
      id: 2,
      issue: "龍鱗材質風格選擇",
      parties: ["Client (寫實風格)", "Art Director (風格化)", "AI (混合建議)"],
      resolution: "採用 Client 的寫實風格",
      finalAuthority: "Client",
      rationale: "符合品牌調性與市場定位",
      date: "2024-01-14",
      status: "finalized",
    },
    {
      id: 3,
      issue: "Sequence A 節奏調整",
      parties: ["PM Chen (維持原速)", "Director Wang (加快 20%)"],
      resolution: "待決定",
      finalAuthority: "Director Wang",
      rationale: "等待 test screening 回饋",
      date: "2024-01-16",
      status: "pending",
    },
  ]

  const conflictCases = [
    {
      id: 1,
      issue: "Shot_012 色溫不一致",
      aiSuggestion: "建議調整至 5600K (日光)",
      directorView: "保持 3200K (暖色調)",
      pmView: "希望折中至 4500K",
      status: "active",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <Shield className="w-5 h-5" />
            </div>
            <Badge variant="outline">C06</Badge>
            <h1 className="text-3xl font-bold">權威衝突與信任治理</h1>
          </div>
          <p className="text-muted-foreground">多頭馬車管理、決策記錄、單一事實來源</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Decision Log */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Conflicts */}
            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  進行中的衝突
                </CardTitle>
                <CardDescription>需要最終決策者介入的意見分歧</CardDescription>
              </CardHeader>
              <CardContent>
                {conflictCases.length > 0 ? (
                  <div className="space-y-4">
                    {conflictCases.map((conflict) => (
                      <div key={conflict.id} className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold">{conflict.issue}</h3>
                          <Badge variant="outline" className="text-amber-400">
                            待決定
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Badge variant="secondary" className="text-xs">
                              AI
                            </Badge>
                            <span className="text-muted-foreground">{conflict.aiSuggestion}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Director
                            </Badge>
                            <span className="text-muted-foreground">{conflict.directorView}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant="secondary" className="text-xs">
                              PM
                            </Badge>
                            <span className="text-muted-foreground">{conflict.pmView}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border">
                          <Button size="sm">
                            <Crown className="w-4 h-4 mr-2" />
                            指定最終決策者
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p>目前沒有進行中的衝突</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Decision Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  決策記錄 Decision Log
                </CardTitle>
                <CardDescription>歷史決策與理由，避免反覆修改</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {decisionLog.map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 rounded-lg border ${
                        log.status === "finalized"
                          ? "border-green-500/20 bg-green-500/5"
                          : "border-amber-500/20 bg-amber-500/5"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold mb-1">{log.issue}</h3>
                          <p className="text-xs text-muted-foreground">{log.date}</p>
                        </div>
                        <Badge variant={log.status === "finalized" ? "default" : "outline"}>
                          {log.status === "finalized" ? "已定案" : "待決定"}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm mb-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">各方意見</Label>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {log.parties.map((party, idx) => (
                              <li key={idx}>{party}</li>
                            ))}
                          </ul>
                        </div>
                        {log.status === "finalized" && (
                          <>
                            <div>
                              <Label className="text-xs text-muted-foreground">最終決議</Label>
                              <p className="text-foreground">{log.resolution}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">理由</Label>
                              <p className="text-muted-foreground">{log.rationale}</p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-medium">{log.finalAuthority}</span>
                        <span className="text-xs text-muted-foreground">最終決策者</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* New Decision */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">記錄新決策</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>議題說明</Label>
                  <Textarea placeholder="描述衝突或決策議題..." className="min-h-[100px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>最終決策者</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇決策者" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="pm">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>狀態</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇狀態" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">待決定</SelectItem>
                        <SelectItem value="finalized">已定案</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  記錄決策
                </Button>
              </CardContent>
            </Card>

            {/* Final Feedback Synthesis - Director綜合意見 */}
            <Card className="border-teal-500/30 bg-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  最終回饋綜合 Final Feedback Synthesis
                </CardTitle>
                <CardDescription>導演綜合自己、AI、客戶的意見，產生最終回饋給 Artist</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Opinion Sources */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium">Director</span>
                    </div>
                    <p className="text-xs text-muted-foreground">光影方向要改成右側，保持神秘感</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-teal-500" />
                      <span className="text-xs font-medium">AI 分析</span>
                    </div>
                    <p className="text-xs text-muted-foreground">建議色溫調至 4500K，rim light 強度 +30%</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-medium">Client</span>
                    </div>
                    <p className="text-xs text-muted-foreground">整體偏冷，希望更溫暖一些</p>
                  </div>
                </div>

                {/* Synthesized Feedback */}
                <div className="space-y-2">
                  <Label>綜合最終回饋 (導演編輯後送出)</Label>
                  <Textarea 
                    placeholder="根據以上意見，綜合出給 Artist 的最終回饋..."
                    rows={4}
                    defaultValue="【Shot_005 最終修改指示】&#10;&#10;1. 光影：主光源調整至右側 90°，保持神秘氛圍&#10;2. 色溫：整體調至 4500K，增加暖調感&#10;3. Rim light：強度增加 30%，突顯角色輪廓&#10;&#10;優先順序：光影 > 色溫 > Rim light"
                  />
                </div>

                {/* Send to Artist */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    <p>送出後，Artist 將收到此回饋並返回上傳介面</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      儲存草稿
                    </Button>
                    <Link href="/upload-analyze">
                      <Button className="gap-2">
                        <Send className="w-4 h-4" />
                        送出給 Artist
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Agent Record Notice */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Agent 將自動記錄此最終回饋至 Decision Log，供未來追溯
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Settings & Rules */}
          <div className="space-y-6">
            {/* Single Source of Truth */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">單一事實來源</CardTitle>
                <CardDescription>為不同類型任務設定最終決策者</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">視覺創意決策</Label>
                  <Select defaultValue="director">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">技術規格決策</Label>
                  <Select defaultValue="supervisor">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="lead">Technical Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">時程與資源決策</Label>
                  <Select defaultValue="pm">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pm">PM</SelectItem>
                      <SelectItem value="producer">Producer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Visibility Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">可見度設定</CardTitle>
                <CardDescription>控制哪些結論可顯示給誰</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">向藝術家顯示 AI 建議</Label>
                    <p className="text-xs text-muted-foreground">允許藝術家看到 AI 分析結果</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">向客戶顯示 AI 建議</Label>
                    <p className="text-xs text-muted-foreground">允許客戶看到 AI 分析結果</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">顯示決策歷史</Label>
                    <p className="text-xs text-muted-foreground">允許團隊查看歷史決策記錄</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* AI Rules */}
            <Card className="border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  AI 規則
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>AI 永遠不能「反駁人」</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>只能提供 alternatives + evidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>任何衝突都要落 Decision Log</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>避免反覆小改，記錄決策理由</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* ShotGrid Mapping */}
            <Card className="border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-sm">ShotGrid 對應</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Decision log → Note (標記 "Decision")</p>
                  <p>• Authority → Task custom field</p>
                  <p>• sg_final_approver 欄位</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Sidebar Chatbot - Always Visible */}
      <AISidebarChatbot
        context="Decision Loop"
        description="AI 會幫助綜合各方意見並記錄決策"
        suggestedPrompts={["整理各方共識", "記錄決定理由"]}
        initialMessages={[
          {
            role: "ai",
            content: "您好！我是決策流程助手。\n\n在這裡您可以：\n1. 查看各方意見\n2. 綜合產生最終回饋給 Artist\n\n送出後流程會返回上傳介面。",
          },
        ]}
      />
    </div>
  )
}
