"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Send, X } from "lucide-react"

interface Message {
  role: "ai" | "user"
  content: string
}

interface AISidebarChatbotProps {
  context: string
  description?: string
  initialMessages?: Message[]
  suggestedPrompts?: string[]
}

export function AISidebarChatbot({
  context,
  description = "AI 會追問可能遺漏的 spec 資訊",
  initialMessages = [],
  suggestedPrompts = [],
}: AISidebarChatbotProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            role: "ai",
            content: `您好！我是 AI 助手。我注意到目前的 Brief 還有一些資訊可能需要補充。請問：\n\n1. 交付日期是什麼時候？\n2. 主要的參考風格有確定了嗎？`,
          },
        ]
  )
  const [inputValue, setInputValue] = useState("")

  const handleSend = () => {
    if (!inputValue.trim()) return
    setMessages([...messages, { role: "user", content: inputValue }])
    setInputValue("")
    
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: getAIResponse(context, inputValue),
        },
      ])
    }, 800)
  }

  const getAIResponse = (ctx: string, input: string): string => {
    if (ctx.includes("Brief") || ctx.includes("Kickoff")) {
      return `了解您的需求。關於「${input.slice(0, 20)}...」，我有幾個追問：\n\n1. 這個規格是必須的還是偏好？\n2. 有沒有參考案例可以分享？`
    }
    if (ctx.includes("Reference") || ctx.includes("Ref")) {
      return `收到！關於這個參考圖：\n\n1. 您想參考的是「構圖」還是「光影」？\n2. 這個風格是整個專案的基調嗎？`
    }
    if (ctx.includes("Analyze") || ctx.includes("分析")) {
      return `明白了！針對您的問題：\n\n1. 目前這版是草稿還是接近完成？\n2. 需要重點檢查哪些項目？`
    }
    if (ctx.includes("Compare") || ctx.includes("對照")) {
      return `關於這個差異點：\n\n1. 這是刻意的藝術選擇還是疏漏？\n2. 需要我幫您整理成回饋嗎？`
    }
    if (ctx.includes("Feedback") || ctx.includes("回饋")) {
      return `讓我幫您釐清這個回饋：\n\n您說的「${input.slice(0, 15)}...」具體是指：\n\n1. 視覺上的調整？\n2. 技術上的修正？`
    }
    if (ctx.includes("Decision") || ctx.includes("Governance")) {
      return `關於這個決策：\n\n1. 這是最終決定還是仍在討論？\n2. 需要通知哪些相關人員？`
    }
    if (ctx.includes("QA") || ctx.includes("Quality") || ctx.includes("品質")) {
      return `關於這個品質問題：\n\n1. 這是客觀的技術問題還是主觀判斷？\n2. 優先級如何？`
    }
    return `收到您的訊息！讓我進一步了解：\n\n1. 能否提供更多背景說明？\n2. 有相關的參考嗎？`
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50"
      >
        <Bot className="w-5 h-5" />
      </Button>
    )
  }

  return (
    <div className="fixed top-20 bottom-6 right-6 w-[360px] bg-background border rounded-xl shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-base">AI Clarification Chat</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 -mt-1" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages - Takes up all available space */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className={`text-xs ${msg.role === "ai" ? "bg-teal-500/10 text-teal-600" : "bg-primary/10"}`}>
                  {msg.role === "ai" ? <Bot className="w-4 h-4" /> : "U"}
                </AvatarFallback>
              </Avatar>
              <div
                className={`rounded-lg px-3 py-2.5 max-w-[85%] ${
                  msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Suggested Prompts */}
      {suggestedPrompts.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap shrink-0">
          {suggestedPrompts.slice(0, 3).map((prompt, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="text-xs h-7 px-3 bg-transparent"
              onClick={() => setInputValue(prompt)}
            >
              {prompt.length > 18 ? prompt.slice(0, 18) + "..." : prompt}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 pt-2 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="輸入回覆..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="h-10 text-sm"
          />
          <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AISidebarChatbot
