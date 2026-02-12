"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Lightbulb, FileText, ImageIcon, Bot, Send, ChevronRight, ChevronDown, ChevronUp,
  HelpCircle, MessageSquare, Sparkles, BookOpen, GripVertical, ArrowDown, ArrowUp,
  Search, RefreshCw, Beaker, Trash2,
} from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"

export default function ArtistReflectionPage() {
  const [specsOpen, setSpecsOpen] = useState(true)
  const [refsOpen, setRefsOpen] = useState(true)
  const [reflectionNotes, setReflectionNotes] = useState("")
  const [agentInput, setAgentInput] = useState("")
  const [responseMode, setResponseMode] = useState<string | null>(null)
  const [pageSubmitted, setPageSubmitted] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  // Project-based questions auto-generated from Spec+Ref (shown as checkboxes in Agent panel)
  const [projectQuestions] = useState([
    { id: "pq1", text: "導演提到「被背叛後的憤怒」，您認為這應該是壓抑的怒氣還是外顯的爆發？不同的詮釋會如何影響光影選擇？" },
    { id: "pq2", text: "Reference #1 是右側硬光，但 Spec 中提到 warm & cozy。這兩者可以共存嗎？您計畫如何處理這個張力？" },
    { id: "pq3", text: "「歲月感但不要太舊」- 在材質處理上，您會如何定義這個邊界？能舉一個具體的例子嗎？" },
    { id: "pq4", text: "Ref #2 的構圖偏非對稱，但其他 Ref 偏古典。您會選擇哪一種方向？為什麼？" },
    { id: "pq5", text: "動態節奏參考某某 MV 的剪接風格，但角色情感偏沉重。如何平衡節奏與情緒？" },
    { id: "pq6", text: "「科技感與人文溫暖的平衡」在場景設計中，您會如何具體呈現？比例分配是什麼？" },
    { id: "pq7", text: "禁忌中提到避免過度飽和的紅色，但如果劇情需要火焰/爆炸場景，您會如何處理？" },
    { id: "pq8", text: "近未來都市的世界觀中，建築風格偏向哪種？Blade Runner 式還是 Her 式？" },
  ])
  const [checkedQuestions, setCheckedQuestions] = useState<string[]>([])

  const handleQuestionCheck = (questionId: string, checked: boolean) => {
    if (checked) {
      setCheckedQuestions(prev => [...prev, questionId])
      const q = projectQuestions.find(p => p.id === questionId)
      if (q) {
        setCreativeAgentMessages(prev => [...prev, { role: "user", content: `[選擇問題] ${q.text}` }])
        setTimeout(() => {
          let response = ""
          if (q.text.includes("憤怒")) {
            response = "很好的選擇！這是一個核心的詮釋問題。\n\n「被背叛後的憤怒」有兩種常見處理方式：\n\n1. 壓抑型：眼神銳利但身體語言克制，光影偏冷色對比\n2. 外顯型：肢體張力大，光影偏暖且高反差\n\n您傾向哪一種？這會直接影響整體光影策略。"
          } else if (q.text.includes("硬光")) {
            response = "這是 Spec 和 Ref 之間最明顯的張力點。\n\n右側硬光 = 戲劇性、對比強烈\nWarm & cozy = 柔和、包裹感\n\n可能的解法：\n- 主光維持硬光方向，但降低 contrast ratio\n- 用暖色 fill light 平衡冷感\n- 色溫偏暖但保留光質硬度\n\n您覺得哪個方向最符合導演意圖？"
          } else if (q.text.includes("歲月感")) {
            response = "材質的「歲月感」是一個光譜。讓我們量化它：\n\n輕度 (1-3年)：微刮痕、輕微色偏\n中度 (5-10年)：明顯磨損、氧化、色調偏暖\n重度 (20年+)：破損、裂紋、鏽蝕\n\n「不要太舊」暗示在輕度到中度之間。您認為導演要的是哪個區間？"
          } else {
            response = `這個問題觸及了核心的創意決策。\n\n讓我追問幾個更具體的面向：\n1. 您目前的直覺傾向是什麼？\n2. 有沒有其他作品可以作為您想法的參考？\n3. 這個決定會連帶影響哪些其他元素？\n\n請分享您的想法，我會幫您驗證邏輯。`
          }
          setCreativeAgentMessages(prev => [...prev, { role: "ai", content: response }])
        }, 600)
      }
    } else {
      setCheckedQuestions(prev => prev.filter(id => id !== questionId))
    }
  }

  // Mind map / tree nodes for feedback workflow
  const [mindMapNodes, setMindMapNodes] = useState([
    { id: "n1", text: "光影方向確認", priority: 1, done: false },
    { id: "n2", text: "色溫範圍定義", priority: 2, done: false },
    { id: "n3", text: "材質歲月感處理", priority: 3, done: false },
    { id: "n4", text: "構圖方式選擇", priority: 4, done: false },
  ])

  const [creativeAgentMessages, setCreativeAgentMessages] = useState<{role: string; content: string; image?: string}[]>([
    {
      role: "ai",
      content: "我是 Creative Exploration Agent。根據 Spec + Reference 的分析，我為您準備了一些 project-based 問題。\n\n這些問題基於導演輸入的 Spec 和挑選的 References 中我觀察到的潛在張力和需要澄清的地方。\n\n您也可以點選畫面中的 Ref 或 Spec 項目，我會自動針對那個項目進行追問。\n\n請選擇一個問題開始探索，或直接輸入您的想法。",
    },
  ])

  const directorSpecs = {
    sellingPoints: "產品科技感與人文溫暖的平衡",
    keywords: "詭譎、溫暖、未來感",
    restrictions: "不可出現純黑背景、避免過度飽和的紅色",
    style: "寫實偏風格化",
    mood: "暖色調、對比適中",
    worldview: "近未來都市，科技與自然共存的世界觀",
    directorNotes: "主角的眼神要有「被背叛後的憤怒」\n光線要像《乙乙一一》第三幕的氛圍\n龍的材質要有「歲月感」但不要太舊\n動態節奏參考某某 MV 的剪接風格",
  }

  const references = [
    { id: 1, title: "Lighting Reference", note: "參考光影方向，主光從右側", isPinned: true, image: "/reference-movie-frame.jpg" },
    { id: 2, title: "Composition Reference", note: "參考構圖比例，前景 vs 背景", isPinned: true, image: "/composition-reference.jpg" },
    { id: 3, title: "Mood & Color Reference", note: "整體色調參考，暖色系", isPinned: false, image: "/lighting-setup-reference.png" },
  ]

  const handleAgentSend = useCallback(() => {
    if (!agentInput.trim()) return
    const modePrefix = responseMode ? `[${responseMode}] ` : ""
    setCreativeAgentMessages(prev => [...prev, { role: "user", content: modePrefix + agentInput }])
    const input = agentInput
    setAgentInput("")
    setResponseMode(null)
    setTimeout(() => {
      let response = ""
      if (input.includes("光影") || input.includes("Lighting")) {
        response = "關於光影方向的選擇：\n\nRef #1 採用右側硬光，創造了強烈的戲劇感。但導演 Spec 提到 warm & cozy，通常暗示柔和擴散光。\n\n這裡的關鍵判斷是：導演想要的「溫暖」是「光質」上的溫暖（柔光），還是「色溫」上的溫暖（低K值）？\n\n建議您問問自己：如果只能選一個，您會優先保留硬光的戲劇性還是柔光的溫暖感？\n\n[Evidence: Spec line 1 vs Ref #1 光質衝突]"
      } else if (input.includes("材質") || input.includes("歲月")) {
        response = "關於「歲月感但不要太舊」：\n\n這是典型的模糊指令。從物理現象來看，歲月感通常包含：\n- 邊緣磨損 / 刮痕\n- 色調偏黃偏暖\n- 表面反射不均勻\n\n「不要太舊」可能意味著保留部分全新感。建議用「使用時間」來量化：\n- 1-2年 = 輕微磨損\n- 5-10年 = 中度歲月感\n\n您認為導演心目中是哪個程度？"
      } else {
        response = `您提到的觀點很有意思。讓我從另一個角度追問：\n\n1. 這個選擇是基於您的審美直覺，還是有對照到某個 Reference？\n2. 如果導演不同意這個方向，您有備案嗎？\n3. 從戲劇需求的角度，這個決定是否服務於故事？\n\n請用您自己的判斷回答，我會幫您檢視邏輯一致性。`
      }
      setCreativeAgentMessages(prev => [...prev, { role: "ai", content: response }])
    }, 800)
  }, [agentInput, responseMode])

  const injectToChat = (text: string) => {
    setCreativeAgentMessages(prev => [...prev, { role: "user", content: text }])
    setTimeout(() => {
      let response = ""
      if (text.includes("Spec") || text.includes("賣點") || text.includes("關鍵詞") || text.includes("風格") || text.includes("氛圍") || text.includes("世界觀") || text.includes("禁忌")) {
        response = `收到！讓我分析這條 Spec 項目：\n\n「${text.replace(/關於 Spec「|」，我想了解更多/g, "")}」\n\n這裡有幾個值得深入的方向：\n1. 這個意圖背後的核心需求是什麼？\n2. 與現有 Reference 是否一致？\n3. 在執行上有什麼模糊地帶需要釐清？\n\n請分享您的理解，我來幫您驗證。`
      } else if (text.includes("Reference") || text.includes("Lighting") || text.includes("Composition") || text.includes("Mood")) {
        response = `收到這個 Reference 項目！\n\n讓我從幾個角度分析：\n1. 這張 ref 的核心特質是什麼？\n2. 與其他 ref 有沒有衝突之處？\n3. 您打算從中借鑑哪些元素？\n\n請告訴我您的想法，我會幫您建立更清晰的方向。`
      } else if (text.includes("工作流排序") || text.includes("確認目前")) {
        response = `分析目前的工作流排序：\n\n${mindMapNodes.map((n, i) => `${i + 1}. ${n.text} - ${i === 0 ? "優先處理，影響後續所有決策" : i === 1 ? "與第一項高度相關" : "可在前項確定後處理"}`).join("\n")}\n\n建議：這個排序${mindMapNodes.length > 2 ? "整體合理" : "項目偏少"}。${mindMapNodes[0] ? `「${mindMapNodes[0].text}」確實應該最先處理。` : ""}\n\n需要調整嗎？`
      } else {
        response = `您提到的觀點很有意思。讓我追問：\n\n1. 這個想法是基於哪個 Reference 或 Spec？\n2. 有沒有替代方案？\n3. 從故事需求角度，這個方向是否合理？\n\n請分享更多想法。`
      }
      setCreativeAgentMessages(prev => [...prev, { role: "ai", content: response }])
    }, 600)
  }

  const moveNode = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx > 0) {
      setMindMapNodes(prev => {
        const arr = [...prev]
        const tmp = arr[idx]
        arr[idx] = arr[idx - 1]
        arr[idx - 1] = tmp
        return arr.map((n, i) => ({ ...n, priority: i + 1 }))
      })
    }
    if (direction === "down" && idx < mindMapNodes.length - 1) {
      setMindMapNodes(prev => {
        const arr = [...prev]
        const tmp = arr[idx]
        arr[idx] = arr[idx + 1]
        arr[idx + 1] = tmp
        return arr.map((n, i) => ({ ...n, priority: i + 1 }))
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="flex">
        <PipelineSidebar />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">C03</Badge>
                <h1 className="text-3xl font-bold">Artist Spec + Ref Reflection</h1>
              </div>
              <p className="text-muted-foreground">使用者主導路徑 - 促進批判思考，不被系統帶著走</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Mind Map + Reflection Notes */}
              <div className="lg:col-span-3 space-y-4">
                {/* Draggable Feedback Mind Map / Tree */}
                <Card className="border-indigo-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <GripVertical className="w-4 h-4 text-indigo-600" />
                      Feedback 心智圖 / 工作流
                    </CardTitle>
                    <CardDescription className="text-xs">拖曳排序工作優先順序，自動歸納</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mindMapNodes.map((node, idx) => (
                        <div 
                          key={node.id} 
                          className="flex items-center gap-2 p-2.5 rounded-lg border transition-colors bg-card border-border hover:border-indigo-500/50"
                        >
                          <div className="flex flex-col gap-0.5">
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveNode(idx, "up")} disabled={idx === 0}>
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveNode(idx, "down")} disabled={idx === mindMapNodes.length - 1}>
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 shrink-0 w-6 justify-center">{node.priority}</Badge>
                          {editingNodeId === node.id ? (
                            <Input
                              autoFocus
                              value={node.text}
                              onChange={(e) => setMindMapNodes(prev => prev.map(n => n.id === node.id ? { ...n, text: e.target.value } : n))}
                              onBlur={() => setEditingNodeId(null)}
                              onKeyDown={(e) => { if (e.key === 'Enter') setEditingNodeId(null) }}
                              className="text-xs h-6 flex-1"
                            />
                          ) : (
                            <span className="text-xs flex-1 cursor-text hover:text-indigo-600 transition-colors" onClick={() => setEditingNodeId(node.id)}>{node.text}</span>
                          )}
                          <Button 
                            variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-red-500"
                            onClick={() => setMindMapNodes(prev => prev.filter(n => n.id !== node.id).map((n, i) => ({ ...n, priority: i + 1 })))}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3 text-xs bg-transparent" onClick={() => {
                      setMindMapNodes(prev => [...prev, { id: `n${Date.now()}`, text: "新增項目...", priority: prev.length + 1, done: false }])
                    }}>
                      + 新增工作項
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => {
                      injectToChat(`請確認目前的工作流排序是否合理：\n${mindMapNodes.map((n, i) => `${i + 1}. ${n.text}`).join("\n")}`)
                    }}>
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Agent分析排序
                    </Button>
                  </CardContent>
                </Card>

                {/* Reflection Notes */}
                <Card className="border-indigo-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      我的理解筆記
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={reflectionNotes}
                      onChange={(e) => setReflectionNotes(e.target.value)}
                      placeholder={"寫下理解...\n- 我覺得導演想要的是...\n- 「被背叛後的憤怒」我打算用...來表現"}
                      rows={8}
                      className="text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 bg-transparent" disabled={!reflectionNotes.trim()}>
                        <BookOpen className="w-3 h-3" />
                        Save
                      </Button>
                      <Button size="sm" className="flex-1 text-xs gap-1" disabled={!reflectionNotes.trim()} onClick={() => {
                        if (reflectionNotes.trim()) {
                          setCreativeAgentMessages(prev => [...prev, { role: "user", content: `[我的理解筆記] ${reflectionNotes}` }])
                          setTimeout(() => {
                            setCreativeAgentMessages(prev => [...prev, { role: "ai", content: `收到您的理解筆記！\n\n我注意到幾個重點：\n- 共提及 ${reflectionNotes.split('\n').filter(l => l.trim()).length} 個觀點\n- 建議針對模糊的部分進一步釐清\n\n需要我幫您檢視邏輯一致性嗎？` }])
                          }, 800)
                        }
                      }}>
                        <Send className="w-3 h-3" />
                        Submit to Agent
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Center: Specs + References (clickable items inject to chat) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Supervisor Spec - clickable items */}
                <Collapsible open={specsOpen} onOpenChange={setSpecsOpen}>
                  <Card className="border-teal-500/30 bg-teal-500/5">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-teal-600" />
                            <CardTitle className="text-base">Supervisor Spec & Intention</CardTitle>
                          </div>
                          {specsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-3 pt-0">
                        <p className="text-xs text-muted-foreground italic">點擊任何項目可自動加入 Agent 對話追問</p>
                        {[
                          { label: "賣點", value: directorSpecs.sellingPoints },
                          { label: "關鍵詞", value: directorSpecs.keywords },
                          { label: "風格", value: directorSpecs.style },
                          { label: "氛圍", value: directorSpecs.mood },
                          { label: "世界觀", value: directorSpecs.worldview },
                          { label: "禁忌", value: directorSpecs.restrictions },
                        ].map((item, idx) => (
                          <div 
                            key={idx} 
                            className="p-2.5 bg-background rounded-lg border cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all"
                            onClick={() => injectToChat(`關於 Spec「${item.label}: ${item.value}」，我想了解更多`)}
                          >
                            <span className="text-[10px] text-muted-foreground uppercase">{item.label}</span>
                            <p className="text-sm mt-0.5">{item.value}</p>
                          </div>
                        ))}
                        <div 
                          className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/30 cursor-pointer hover:ring-2 hover:ring-teal-500/50 transition-all"
                          onClick={() => injectToChat(`關於 Supervisor 額外說明：「${directorSpecs.directorNotes.substring(0, 40)}...」，我想了解更多`)}
                        >
                          <span className="text-[10px] font-semibold text-teal-700">SUPERVISOR 額外說明</span>
                          <p className="text-sm whitespace-pre-line mt-1">{directorSpecs.directorNotes}</p>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* References - clickable */}
                <Collapsible open={refsOpen} onOpenChange={setRefsOpen}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-indigo-600" />
                            <CardTitle className="text-base">References</CardTitle>
                          </div>
                          {refsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground italic mb-3">點擊 Reference 可自動加入 Agent 追問</p>
                        <ScrollArea style={{ maxHeight: '240px' }}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-2">
                          {references.map((ref) => (
                            <Card 
                              key={ref.id} 
                              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all"
                              onClick={() => {
                                setCreativeAgentMessages(prev => [...prev, { role: "user", content: `[點擊 Reference] ${ref.title}\n備註：${ref.note}`, image: ref.image }])
                                setTimeout(() => {
                                  setCreativeAgentMessages(prev => [...prev, { role: "ai", content: `收到「${ref.title}」！\n\n${ref.isPinned ? "這是 Main Reference，" : ""}這張圖的備註是：「${ref.note}」。\n\n我有幾個追問：\n1. 您最想從這張圖借鑑的 top 1 元素是什麼？\n2. 有沒有「看起來很像但不要參考」的部分？\n3. 這張 ref 與 Spec 中的哪個描述最相關？\n\n請分享您的觀察。` }])
                                }, 600)
                              }}
                            >
                              <div className="aspect-video bg-muted overflow-hidden">
                                <img src={ref.image || "/placeholder.svg"} alt={ref.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="p-2.5">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {ref.isPinned && <Badge className="bg-amber-500 text-white text-[10px] h-4">Main</Badge>}
                                  <h4 className="font-medium text-xs">{ref.title}</h4>
                                </div>
                                <p className="text-[10px] text-muted-foreground">{ref.note}</p>
                              </div>
                            </Card>
                          ))}
                        </div>
                        </ScrollArea>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Jump buttons */}
                <div className="flex items-center justify-end gap-3">
                  <Button size="lg" variant="outline" className="bg-transparent" asChild>
                    <a href="/reference-hub">Back to Reference Hub</a>
                  </Button>
                  {pageSubmitted ? (
                    <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white" asChild>
                      <a href="/upload-analyze">
                        Submitted - Jump to Upload & Analyze
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  ) : (
                    <Button size="lg" onClick={() => setPageSubmitted(true)}>
                      Ready - Submit & Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Right: Creative Agent Panel with Project Questions */}
              <div className="lg:col-span-4">
                <Card className="border-indigo-500/30 bg-indigo-500/5 flex flex-col sticky top-8" style={{ height: 'calc(100vh - 200px)' }}>
                  <CardHeader className="pb-2 shrink-0">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Creative Exploration Agent
                    </CardTitle>
                    <CardDescription className="text-xs">
                      主動引導思考探索。勾選感興趣的問題深入對話。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
                    {/* Project-Based Questions - collapsible with scroll; chat below shifts down */}
                    <Collapsible defaultOpen={false} className="border-b bg-indigo-500/5 shrink-0">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-medium">Project-Based 預設問題</span>
                            <Badge variant="secondary" className="text-[10px] h-4">{projectQuestions.length}</Badge>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{checkedQuestions.length} 已選</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent forceMount className="data-[state=closed]:hidden">
                        <div className="border-t" style={{ height: '200px' }}>
                          <ScrollArea className="h-full">
                            <div className="px-4 py-3 space-y-1.5 pr-6">
                              {projectQuestions.map((q) => (
                                <div
                                  key={q.id}
                                  className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer ${checkedQuestions.includes(q.id) ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'}`}
                                  onClick={() => handleQuestionCheck(q.id, !checkedQuestions.includes(q.id))}
                                >
                                  <Checkbox
                                    checked={checkedQuestions.includes(q.id)}
                                    onCheckedChange={(checked) => handleQuestionCheck(q.id, checked as boolean)}
                                    className="mt-0.5 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <p className="text-[11px] leading-relaxed">{q.text}</p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Chat Messages - flex-1 + min-h-0 ensures it shrinks when questions expand */}
                    <ScrollArea className="flex-1 min-h-0 p-4">
                      <div className="space-y-4 pr-2">
                        {creativeAgentMessages.map((msg, idx) => (
                          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback className={msg.role === 'ai' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-primary/10'}>
                                {msg.role === 'ai' ? <Sparkles className="w-4 h-4" /> : 'A'}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`rounded-lg p-3 max-w-[85%] ${msg.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                              {msg.image && (
                                <div className="mb-2 rounded overflow-hidden">
                                  <img src={msg.image} alt="reference" className="w-full h-24 object-cover rounded" />
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-line">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="p-4 border-t space-y-3 shrink-0">
                      {/* Response Mode Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant={responseMode === "rephrase" ? "default" : "outline"}
                          size="sm" className="text-xs gap-1 bg-transparent"
                          onClick={() => setResponseMode(responseMode === "rephrase" ? null : "rephrase")}
                        >
                          <RefreshCw className="w-3 h-3" />
                          換句話說
                        </Button>
                        <Button
                          variant={responseMode === "logic" ? "default" : "outline"}
                          size="sm" className="text-xs gap-1 bg-transparent"
                          onClick={() => setResponseMode(responseMode === "logic" ? null : "logic")}
                        >
                          <Beaker className="w-3 h-3" />
                          講邏輯
                        </Button>
                        <Button
                          variant={responseMode === "evidence" ? "default" : "outline"}
                          size="sm" className="text-xs gap-1 bg-transparent"
                          onClick={() => setResponseMode(responseMode === "evidence" ? null : "evidence")}
                        >
                          <Lightbulb className="w-3 h-3" />
                          Evidence Binding
                        </Button>
                      </div>
                      {responseMode && (
                        <div className="text-[10px] text-indigo-600 bg-indigo-500/10 rounded px-2 py-1">
                          模式：{responseMode === "rephrase" ? "換句話說" : responseMode === "logic" ? "講邏輯（物理現象/戲劇需求）" : "Evidence Binding（綁定畫面/Ref/Spec）"}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          placeholder="分享您的想法..."
                          value={agentInput}
                          onChange={(e) => setAgentInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAgentSend()}
                        />
                        <Button size="icon" onClick={handleAgentSend}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
