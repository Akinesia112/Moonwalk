"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Send, Bot, User, Sparkles, Users, RefreshCw, Lightbulb, ArrowRight } from "lucide-react"

interface Message {
  id: string
  role: "user" | "ai" | "stakeholder"
  stakeholder?: string
  content: string
  suggestions?: string[]
  actions?: { label: string; action: string }[]
}

interface AIChatPanelProps {
  context?: string
  stakeholders?: string[]
  onAction?: (action: string) => void
}

export function AIChatPanel({ context = "general", stakeholders = ["Director", "PM", "Artist"], onAction }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "我是你的 AI 助手。我可以幫助你分析作品、提供建議、或協調不同利害關係人的觀點。有什麼我可以幫忙的嗎？",
      suggestions: ["分析目前的作品", "查看其他利害關係人的觀點", "建議下一步行動"],
      actions: [
        { label: "自動分析", action: "auto_analyze" },
        { label: "收集意見", action: "gather_feedback" }
      ]
    }
  ])
  const [input, setInput] = useState("")
  const [activeStakeholder, setActiveStakeholder] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)

  const handleSend = () => {
    if (!input.trim()) return
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input
    }
    setMessages(prev => [...prev, newMessage])
    setInput("")
    setIsThinking(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "根據你的問題，我已經分析了目前的情況。以下是我的建議：",
        suggestions: ["繼續調整 Lighting", "檢查 Composition 參考", "提交給 Director 審核"],
        actions: [
          { label: "執行建議", action: "execute_suggestion" },
          { label: "詢問更多", action: "ask_more" }
        ]
      }
      setMessages(prev => [...prev, aiResponse])
      setIsThinking(false)
    }, 1500)
  }

  const handleStakeholderView = (stakeholder: string) => {
    setActiveStakeholder(stakeholder)
    const stakeholderMessage: Message = {
      id: Date.now().toString(),
      role: "stakeholder",
      stakeholder,
      content: getStakeholderPerspective(stakeholder),
      suggestions: getStakeholderSuggestions(stakeholder)
    }
    setMessages(prev => [...prev, stakeholderMessage])
  }

  const getStakeholderPerspective = (stakeholder: string): string => {
    const perspectives: Record<string, string> = {
      "Director": "從導演的角度來看，這個鏡頭的情緒張力還不夠強。建議加強光影對比，讓觀眾更能感受到角色的內心掙扎。",
      "PM": "從專案管理的角度，這個版本已經符合基本規格要求。但考慮到時程，建議先確認 Director 的核心意見後再進行修改。",
      "Artist": "從技術執行的角度，目前的 Lighting setup 是合理的。如果要增強對比，可能需要額外 2-3 小時的調整時間。",
      "Client": "從客戶的角度，整體視覺風格符合品牌調性。希望能確保最終成品與參考圖的風格一致。"
    }
    return perspectives[stakeholder] || "這位利害關係人尚未提供意見。"
  }

  const getStakeholderSuggestions = (stakeholder: string): string[] => {
    const suggestions: Record<string, string[]> = {
      "Director": ["加強主光源對比", "調整角色視線方向", "增加環境氛圍"],
      "PM": ["確認時程影響", "協調資源分配", "更新進度報告"],
      "Artist": ["優化 Render 設定", "調整材質反射", "檢查 AOV 輸出"],
      "Client": ["對照品牌色彩指南", "確認 Logo 位置", "檢查法規合規性"]
    }
    return suggestions[stakeholder] || []
  }

  const handleAction = (action: string) => {
    onAction?.(action)
    
    // Add feedback about the action
    const actionMessage: Message = {
      id: Date.now().toString(),
      role: "ai",
      content: `正在執行: ${action}...`,
      actions: [{ label: "取消", action: "cancel" }]
    }
    setMessages(prev => [...prev, actionMessage])
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-teal-600 hover:bg-teal-700 z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-teal-600" />
            AI 助手
            <Badge variant="outline" className="ml-2 text-xs">
              {context}
            </Badge>
          </SheetTitle>
          
          {/* Stakeholder Tabs */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={activeStakeholder === null ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveStakeholder(null)}
              className={activeStakeholder === null ? "bg-teal-600 hover:bg-teal-700" : ""}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Button>
            {stakeholders.map(s => (
              <Button
                key={s}
                variant={activeStakeholder === s ? "default" : "outline"}
                size="sm"
                onClick={() => handleStakeholderView(s)}
                className={activeStakeholder === s ? "bg-teal-600 hover:bg-teal-700" : ""}
              >
                <Users className="h-3 w-3 mr-1" />
                {s}
              </Button>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={
                    message.role === "ai" ? "bg-teal-100 text-teal-700" :
                    message.role === "stakeholder" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-700"
                  }>
                    {message.role === "ai" ? <Bot className="h-4 w-4" /> :
                     message.role === "stakeholder" ? message.stakeholder?.[0] :
                     <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex-1 space-y-2 ${message.role === "user" ? "text-right" : ""}`}>
                  {message.stakeholder && (
                    <Badge variant="outline" className="text-xs mb-1">
                      {message.stakeholder} 的觀點
                    </Badge>
                  )}
                  <div className={`inline-block rounded-lg px-3 py-2 text-sm ${
                    message.role === "user" 
                      ? "bg-teal-600 text-white" 
                      : "bg-muted"
                  }`}>
                    {message.content}
                  </div>
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.suggestions.map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 bg-transparent"
                          onClick={() => setInput(suggestion)}
                        >
                          <Lightbulb className="h-3 w-3 mr-1 text-amber-500" />
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {message.actions.map((action, i) => (
                        <Button
                          key={i}
                          size="sm"
                          className="text-xs h-7 bg-teal-600 hover:bg-teal-700"
                          onClick={() => handleAction(action.action)}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-teal-100 text-teal-700">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  思考中...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Autonomy Panel */}
        <div className="border-t p-3 bg-teal-50">
          <div className="flex items-center gap-2 text-xs text-teal-700 mb-2">
            <Sparkles className="h-3 w-3" />
            <span className="font-medium">AI 建議的下一步行動</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs flex-1 bg-transparent" onClick={() => handleAction("auto_compare")}>
              自動比對參考
            </Button>
            <Button variant="outline" size="sm" className="text-xs flex-1 bg-transparent" onClick={() => handleAction("auto_feedback")}>
              生成回饋草稿
            </Button>
          </div>
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="輸入訊息或選擇上方建議..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
            />
            <Button onClick={handleSend} className="bg-teal-600 hover:bg-teal-700">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default AIChatPanel
