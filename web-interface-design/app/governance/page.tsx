"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, AlertTriangle, CheckCircle2, FileText, Crown, Send, ArrowRight, Users, Bot, Sparkles, ImageIcon, ChevronDown, ChevronUp } from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Link from "next/link"

export default function GovernancePage() {
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", content: "您好！我是 Decision Loop 助手。\n\n我可以幫助您：\n1. 釐清多方意見衝突\n2. 記錄決策理由\n3. 追蹤歷史決策\n\n有什麼需要協助的嗎？" },
  ])
  const [chatInput, setChatInput] = useState("")

  const handleChatSend = () => {
    if (!chatInput.trim()) return
    setChatMessages([...chatMessages, { role: "user", content: chatInput }])
    setChatInput("")
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: "ai", 
        content: "了解！根據 Decision Log 的歷史記錄，類似的衝突曾在 2024-01-14 發生過。當時的決策是優先尊重 Client 的品牌調性。\n\n建議您參考該案例的決策理由，並確認此次是否適用相同原則。" 
      }])
    }, 1000)
  }

  const decisionLog = [
    { id: 1, issue: "Shot_005 光影方向衝突", parties: ["Supervisor Wang (Top light)", "Supervisor Li (Side light)", "AI (Front fill)"], resolution: "採用 Supervisor Wang 的 Top light 方案", finalAuthority: "Supervisor Wang", rationale: "符合整體敘事氛圍，強調角色孤立感", date: "2024-01-15", status: "finalized" },
    { id: 2, issue: "龍鱗材質風格選擇", parties: ["Client (寫實風格)", "Art Supervisor (風格化)", "AI (混合建議)"], resolution: "採用 Client 的寫實風格", finalAuthority: "Client", rationale: "符合品牌調性與市場定位", date: "2024-01-14", status: "finalized" },
    { id: 3, issue: "Sequence A 節奏調整", parties: ["PM Chen (維持原速)", "Supervisor Wang (加快 20%)"], resolution: "待決定", finalAuthority: "Supervisor Wang", rationale: "等待 test screening 回饋", date: "2024-01-16", status: "pending" },
  ]

  const reviewedArtworks = [
    { id: 1, name: "Shot_005_v04", status: "reviewed", thumbnail: "/vfx-work-in-progress-shot.jpg", reviewer: "Supervisor Wang", date: "2024-01-16" },
    { id: 2, name: "Shot_012_v02", status: "reviewed", thumbnail: "/reference-movie-frame.jpg", reviewer: "Supervisor Wang", date: "2024-01-15" },
    { id: 3, name: "Shot_008_v03", status: "pending", thumbnail: "/composition-reference.jpg", reviewer: "Supervisor Li", date: "2024-01-15" },
    { id: 4, name: "Seq_A_Anim_v03", status: "reviewed", thumbnail: "/lighting-setup-reference.png", reviewer: "Supervisor Wang", date: "2024-01-14" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="flex">
        <PipelineSidebar />

        <main className="flex-1 overflow-auto">
          <div className="border-b border-border bg-card">
            <div className="container mx-auto px-6 py-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                  <Shield className="w-5 h-5" />
                </div>
                <Badge variant="outline">C07</Badge>
                <h1 className="text-3xl font-bold">權威衝突與信任治理</h1>
              </div>
              <p className="text-muted-foreground">多頭馬車管理、決策記錄、回饋綜合</p>
            </div>
          </div>

          <div className="container mx-auto px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Artworks - scrollable conversation history style */}
              <div className="lg:col-span-3">
                <Card className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
                  <CardHeader className="pb-3 shrink-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ImageIcon className="w-5 h-5 text-teal-600" />
                      審核過的 Artworks
                    </CardTitle>
                    <CardDescription className="text-xs">已通過 Supervisor Review 的作品 ({reviewedArtworks.length})</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 p-0">
                    <ScrollArea className="h-full">
                      <div className="px-4 pb-4 space-y-3">
                        {reviewedArtworks.map((artwork) => (
                          <div key={artwork.id} className="p-2.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="w-full aspect-video rounded overflow-hidden bg-neutral-900 mb-2">
                              <img src={artwork.thumbnail} alt={artwork.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-xs truncate">{artwork.name}</p>
                              <Badge variant={artwork.status === "reviewed" ? "default" : "outline"} className="text-[10px] h-5 shrink-0">
                                {artwork.status === "reviewed" ? "已審核" : "待審核"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground">{artwork.reviewer}</span>
                              <span className="text-[10px] text-muted-foreground">{artwork.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Center: Final Synthesis + Decision Log + New Decision */}
              <div className="lg:col-span-6 space-y-6">
                {/* Final Feedback Synthesis */}
                <Card className="border-teal-500/30 bg-teal-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-teal-600" />
                      最終回饋綜合 Final Feedback Synthesis
                    </CardTitle>
                    <CardDescription>導演綜合自己、AI、客戶的意見，產生最終回饋給 Artist</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-medium">Supervisor</span>
                        </div>
                        <p className="text-xs text-muted-foreground">光影方向要改成右側，保持神秘感</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-teal-500" />
                          <span className="text-xs font-medium">AI 分析</span>
                        </div>
                        <p className="text-xs text-muted-foreground">建議色溫調至 4500K，rim light +30%</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-medium">Client</span>
                        </div>
                        <p className="text-xs text-muted-foreground">整體偏冷，希望更溫暖一些</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>綜合最終回饋 (導演編輯後送出)</Label>
                      <Textarea placeholder="根據以上意見，綜合出給 Artist 的最終回饋..." rows={4} defaultValue={`【Shot_005 最終修改指示】\n\n1. 光影：主光源調整至右側 90度\n2. 色溫：整體調至 4500K\n3. Rim light：強度增加 30%`} />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">送出後，Artist 將收到此回饋</p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="bg-transparent">儲存草稿</Button>
                        <Link href="/upload-analyze">
                          <Button className="gap-2">
                            <Send className="w-4 h-4" />
                            送出給 Artist
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Decision Log */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      決策記錄 Decision Log
                    </CardTitle>
                    <CardDescription>歷史決策與理由</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {decisionLog.map((log) => (
                        <div key={log.id} className={`p-4 rounded-lg border ${log.status === "finalized" ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
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
                                {log.parties.map((party, idx) => <li key={idx}>{party}</li>)}
                              </ul>
                            </div>
                            {log.status === "finalized" && (
                              <>
                                <div><Label className="text-xs text-muted-foreground">最終決議</Label><p>{log.resolution}</p></div>
                                <div><Label className="text-xs text-muted-foreground">理由</Label><p className="text-muted-foreground">{log.rationale}</p></div>
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
                  <CardHeader><CardTitle className="text-lg">記錄新決策</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>議題說明</Label>
                      <Textarea placeholder="描述衝突或決策議題..." className="min-h-[100px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>最終決策者</Label>
                        <Select><SelectTrigger><SelectValue placeholder="選擇決策者" /></SelectTrigger><SelectContent><SelectItem value="director">Supervisor</SelectItem><SelectItem value="supervisor">Supervisor</SelectItem><SelectItem value="client">Client</SelectItem></SelectContent></Select>
                      </div>
                      <div className="space-y-2">
                        <Label>狀態</Label>
                        <Select><SelectTrigger><SelectValue placeholder="選擇狀態" /></SelectTrigger><SelectContent><SelectItem value="pending">待決定</SelectItem><SelectItem value="finalized">已定案</SelectItem></SelectContent></Select>
                      </div>
                    </div>
                    <Button className="w-full"><FileText className="w-4 h-4 mr-2" />記錄決策</Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right: AI Chatbot (lengthened + aligned) */}
              <div className="lg:col-span-3">
                <Card className="border-teal-500/30 flex flex-col sticky top-8" style={{ height: 'calc(100vh - 220px)' }}>
                  <Collapsible open={chatbotOpen} onOpenChange={setChatbotOpen} className="flex flex-col flex-1 min-h-0">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-teal-600" />
                            <div>
                              <CardTitle className="text-base">AI Decision 助手</CardTitle>
                              <CardDescription className="text-xs">AI Clarification Chatbot</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
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
                                    {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : 'D'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <div className="flex gap-2 shrink-0">
                          <Input 
                            placeholder="輸入問題..." 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                          />
                          <Button size="icon" onClick={handleChatSend}>
                            <Send className="w-4 h-4" />
                          </Button>
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
