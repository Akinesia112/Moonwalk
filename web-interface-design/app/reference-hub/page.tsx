"use client"

import { Suspense, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Upload, Star, Lock, ExternalLink, FileImage, ChevronRight, Bot, Send, Lightbulb, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { api } from "@/lib/api"
import { useProject } from "@/lib/context/ProjectContext"

interface Reference {
  id: string
  title: string
  confidentiality: string
  isPinned: boolean
  is_pinned: boolean
  category: string
  note: string
  thumbnail_url?: string
  priority?: string
}

function ReferenceHubContent() {
  const { projectId } = useProject()
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [references, setReferences] = useState<Reference[]>([])
  const [loading, setLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([
    { role: "ai", content: "您好！我是 Reference 助手。我會幫助您整理與釐清參考資料。" }
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // seed state
  const [seed1Priority, setSeed1Priority] = useState("main")
  const [seed1Category, setSeed1Category] = useState("lighting")
  const [seed1Note, setSeed1Note] = useState("")
  const [seed2Priority, setSeed2Priority] = useState("main")
  const [seed2Category, setSeed2Category] = useState("composition")
  const [seed2Note, setSeed2Note] = useState("")
  const [seedSubmitted, setSeedSubmitted] = useState(false)
  const [pageSubmitted, setPageSubmitted] = useState(false)
  const [urlInput, setUrlInput] = useState("")

  const refCategories = ["Lighting", "Color", "Composition", "Style", "Texture", "Motion", "Mood", "VFX"]

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

  // Load references from API
  useEffect(() => {
    setLoading(true)
    api.getReferences(projectId)
      .then(data => setReferences(data.map((r: any) => ({ ...r, isPinned: r.is_pinned }))))
      .catch(() => setReferences([]))
      .finally(() => setLoading(false))
  }, [projectId])

  const updateRefField = async (id: string, field: string, value: string) => {
    setReferences(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    try {
      await api.updateReference(id, { [field]: value })
    } catch {}
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("image", file)
    formData.append("type", "reference")
    formData.append("project_id", projectId)
    try {
      const result = await api.uploadImage(formData)
      const newRef: Reference = {
        id: result.id,
        title: file.name,
        confidentiality: "internal",
        isPinned: false,
        is_pinned: false,
        category: "Lighting",
        note: "",
        thumbnail_url: result.thumbnail_url,
      }
      setReferences(prev => [newRef, ...prev])
    } catch {}
  }

  const handleImportUrl = async () => {
    if (!urlInput.trim()) return
    try {
      const result = await api.importUrl({ url: urlInput, project_id: projectId })
      const newRef: Reference = {
        id: result.id,
        title: urlInput,
        confidentiality: "internal",
        isPinned: false,
        is_pinned: false,
        category: "Lighting",
        note: "",
        thumbnail_url: result.thumbnail_url,
      }
      setReferences(prev => [newRef, ...prev])
      setUrlInput("")
    } catch {}
  }

  const handleSubmitSeeds = async () => {
    try {
      const seeds = [
        { priority: seed1Priority, category: seed1Category, note: seed1Note },
        { priority: seed2Priority, category: seed2Category, note: seed2Note },
      ]
      const result = await api.seedToRef(projectId, seeds)
      if (Array.isArray(result)) {
        setReferences(prev => [...result.map((r: any) => ({ ...r, isPinned: r.is_pinned })), ...prev])
      }
      setSeedSubmitted(true)
    } catch {}
  }

  const handleSubmitPage = async () => {
    try {
      const body = references.map(r => ({ id: r.id, priority: r.priority || (r.isPinned ? "main" : "secondary"), category: r.category, note: r.note }))
      await api.batchUpdateReferences(body)
      setPageSubmitted(true)
    } catch {}
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }])
    setChatInput("")
    setChatLoading(true)
    try {
      const res = await api.chatReference({
        project_id: projectId,
        message: userMsg,
        history: chatMessages,
        all_refs_context: references,
      })
      setChatMessages(prev => [...prev, { role: "ai", content: res.reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", content: "抱歉，目前無法連接 AI 助手。" }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleRefClick = async (ref: Reference) => {
    setChatMessages(prev => [...prev, { role: "user", content: `[點擊參考] ${ref.title} (${ref.category})` }])
    setChatLoading(true)
    try {
      const res = await api.chatReference({
        project_id: projectId,
        message: `請幫我分析這張參考圖：${ref.title}`,
        clicked_ref_id: ref.id,
        history: chatMessages,
        all_refs_context: references,
      })
      setChatMessages(prev => [...prev, { role: "ai", content: res.reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", content: `關於「${ref.title}」，請問您想了解哪個面向？` }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="flex">
        <PipelineSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
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
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />上傳參考
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  <div className="flex gap-1">
                    <Input placeholder="貼上圖片 URL..." value={urlInput} onChange={e => setUrlInput(e.target.value)} className="w-48 h-9 text-sm" onKeyDown={e => e.key === 'Enter' && handleImportUrl()} />
                    <Button variant="outline" className="bg-transparent" onClick={handleImportUrl}>
                      <ExternalLink className="w-4 h-4 mr-1" />匯入
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Seed Section */}
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-amber-600" />
                      初始參考 Reference Seed (from Client)
                    </CardTitle>
                    <CardDescription>客戶提供的初始參考圖 - 導演需解釋每張圖要看什麼元素</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ priority: seed1Priority, setPriority: setSeed1Priority, category: seed1Category, setCategory: setSeed1Category, note: seed1Note, setNote: setSeed1Note },
                        { priority: seed2Priority, setPriority: setSeed2Priority, category: seed2Category, setCategory: setSeed2Category, note: seed2Note, setNote: setSeed2Note }].map((seed, i) => (
                        <div key={i} className="border-2 border-amber-500/50 bg-amber-500/5 rounded-lg overflow-hidden">
                          <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground text-sm">
                            Client Ref {i + 1}
                          </div>
                          <div className="p-2 space-y-1.5">
                            <Select value={seed.priority} onValueChange={seed.setPriority}>
                              <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="main">Main Ref</SelectItem>
                                <SelectItem value="secondary">Secondary</SelectItem>
                                <SelectItem value="supplementary">Supplementary</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={seed.category} onValueChange={seed.setCategory}>
                              <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["lighting","color","composition","style","texture","mood","motion","vfx"].map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input placeholder="Note..." className="text-[11px] h-6" value={seed.note} onChange={e => seed.setNote(e.target.value)} />
                          </div>
                        </div>
                      ))}
                      <div className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 min-h-[140px]" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">上傳更多初始參考</p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Button size="sm" variant="outline" className={seedSubmitted ? "bg-green-600 text-white" : "bg-amber-500/10 border-amber-500/30 text-amber-700"} onClick={handleSubmitSeeds}>
                        <Plus className="w-3 h-3 mr-1" />
                        {seedSubmitted ? "已加入" : "加入下方 References"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Reference Grid */}
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">載入中...</div>
                ) : (
                  <ScrollArea style={{ maxHeight: '400px' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                      {references.map(ref => (
                        <Card key={ref.id} className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all group cursor-pointer" onClick={() => handleRefClick(ref)}>
                          <div className="aspect-video bg-gradient-to-br from-teal-500/20 to-cyan-500/20 relative">
                            {ref.thumbnail_url ? (
                              <img src={ref.thumbnail_url} alt={ref.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-muted-foreground/20">{ref.id}</div>
                            )}
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
                          <div className="p-3 space-y-2" onClick={e => e.stopPropagation()}>
                            <h3 className="font-semibold text-sm group-hover:text-primary">{ref.title}</h3>
                            <div className="flex gap-2">
                              <Select value={ref.category} onValueChange={v => updateRefField(ref.id, "category", v)}>
                                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{refCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                              </Select>
                              <Select value={ref.isPinned ? "main" : "secondary"} onValueChange={v => updateRefField(ref.id, "isPinned", v === "main" ? "true" : "false")}>
                                <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="main">Main Ref</SelectItem>
                                  <SelectItem value="secondary">Secondary</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Input placeholder="Note: 這張要看什麼..." value={ref.note} onChange={e => updateRefField(ref.id, "note", e.target.value)} className="text-xs h-7" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* AI Chatbot */}
              <div>
                <Card className="border-teal-500/30 flex flex-col sticky top-8" style={{ height: 'calc(100vh - 220px)' }}>
                  <Collapsible open={chatbotOpen} onOpenChange={setChatbotOpen} className="flex flex-col flex-1 min-h-0">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-teal-600" />
                            <div>
                              <CardTitle className="text-base">AI Reference 助手</CardTitle>
                              <CardDescription className="text-xs">AI Clarification Chatbot</CardDescription>
                            </div>
                          </div>
                          {chatbotOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                            {chatLoading && <div className="text-sm text-muted-foreground pl-11">AI 思考中...</div>}
                          </div>
                        </ScrollArea>
                        <div className="flex gap-2 flex-wrap mb-3 shrink-0">
                          <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setChatInput("這張 ref 我想參考的是光影方向")}>光影方向</Button>
                          <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => setChatInput("幫我找更多類似風格的參考")}>找更多 ref</Button>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Input placeholder="輸入問題或說明..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChatSend()} />
                          <Button size="icon" onClick={handleChatSend} disabled={chatLoading}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button size="lg" className={pageSubmitted ? "bg-green-600 hover:bg-green-700 text-white" : ""} onClick={handleSubmitPage}>
                <Upload className="w-4 h-4 mr-2" />
                {pageSubmitted ? "Submitted" : "Submit"}
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent" asChild>
                <a href="/artist-reflection">Jump to C03 Reflection <ChevronRight className="w-4 h-4 ml-2" /></a>
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
