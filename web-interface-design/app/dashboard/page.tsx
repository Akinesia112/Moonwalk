"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  ListVideo, Clock, Settings, MessageSquare, Upload, GitCompare, PenTool, Sparkles,
  Bell, Eye, EyeOff, Mail, Loader2, CheckCircle2, AlertCircle, LogOut, User, KeyRound,
} from "lucide-react"
import Link from "next/link"
import { PipelineSidebar } from "@/components/pipeline-sidebar"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

async function apiFetch(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || "Request failed")
  return data
}

/* ─────────────────────────────────────────────────────────
   Agent Chat Types
───────────────────────────────────────────────────────── */
interface Attachment {
  id: string
  name: string
  type: "image" | "text" | "file"
  preview?: string
  size: string
}

interface Message {
  id: string
  role: "user" | "agent"
  content: string
  attachments?: Attachment[]
  ts: Date
}

const QUICK_PROMPTS = [
  { label: "分析作品", icon: "✦", prompt: "幫我分析這張作品的光影與構圖" },
  { label: "差距對比", icon: "◈", prompt: "比對 Artwork 與 Reference 的差距" },
  { label: "導演意見", icon: "◎", prompt: "整理需要上報給導演的修改重點" },
  { label: "風格建議", icon: "⟡", prompt: "根據 Reference 給我風格調整建議" },
]

const HOURS = new Date().getHours()
const GREETING =
  HOURS < 5 ? "深夜了，還在工作" :
  HOURS < 12 ? "早安，Moonwalk" :
  HOURS < 18 ? "午後繼續" :
  HOURS < 22 ? "晚上好" : "夜深了"

/* ─────────────────────────────────────────────────────────
   AgentChatPanel
───────────────────────────────────────────────────────── */
function AgentChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const processed: Attachment[] = []
    for (const f of arr) {
      const isImg = f.type.startsWith("image/")
      let preview: string | undefined
      if (isImg) {
        preview = await new Promise<string>((res) => {
          const r = new FileReader()
          r.onload = () => res(r.result as string)
          r.readAsDataURL(f)
        })
      }
      processed.push({
        id: crypto.randomUUID(),
        name: f.name,
        type: isImg ? "image" : f.type.startsWith("text/") ? "text" : "file",
        preview,
        size: f.size < 1024 * 1024
          ? `${(f.size / 1024).toFixed(1)} KB`
          : `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      })
    }
    setAttachments((p) => [...p, ...processed])
  }, [])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content && attachments.length === 0) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments: [...attachments],
      ts: new Date(),
    }
    setMessages((p) => [...p, userMsg])
    setInput("")
    setAttachments([])
    setLoading(true)

    try {
      const msgHistory = [...messages, userMsg].map((m) => ({
        role: m.role === "agent" ? "assistant" : "user",
        content: m.content || "(附件)",
      }))
      const chatHistory = msgHistory.slice(0, -1)

      // 帶上所有可能的欄位名，backend 取它認識的，422 時 catch 會顯示 detail
      const res = await fetch(`${API}/suggestion/chat/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message:  content,
          message:       content,
          query:         content,
          prompt:        content,
          chat_history:  chatHistory,
          history:       chatHistory,
          messages:      chatHistory,
          artwork_name:  "",
          ref_name:      "",
          ref_desc:      "",
          spec:          "",
          context:       "",
        }),
      })

      const data = await res.json()
      console.log("[AgentChat] status:", res.status, "body:", JSON.stringify(data))

      if (!res.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((d: any) => `${d.loc?.join(".")}: ${d.msg}`).join(" | ")
          : JSON.stringify(data.detail ?? data)
        throw new Error(`HTTP ${res.status} — ${detail}`)
      }

      const reply: string =
        data.reply ??
        data.message ??
        data.response ??
        data.answer ??
        data.text ??
        data.result ??
        data.output ??
        (typeof data.content === "string" ? data.content : undefined) ??
        data.content?.[0]?.text ??
        data.choices?.[0]?.message?.content ??
        (typeof data === "string" ? data : undefined) ??
        `[未知格式] keys: ${Object.keys(data).join(", ")}`

      setMessages((p) => [...p, {
        id: crypto.randomUUID(),
        role: "agent",
        content: reply,
        ts: new Date(),
      }])
    } catch (e: any) {
      setMessages((p) => [...p, {
        id: crypto.randomUUID(),
        role: "agent",
        content: e?.message ?? "連線失敗",
        ts: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }, [input, attachments, messages])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col" style={{ height: "100%", minHeight: 0 }}>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center gap-6 pb-4 select-none" style={{ flex: 1, minHeight: 0 }}>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span style={{
                color: "var(--color-teal-500)",
                fontSize: "24px",
                lineHeight: 1,
                display: "inline-block",
                animation: "mw-spin 12s linear infinite",
              }}>✳</span>
              <h2 style={{
                fontSize: "22px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "hsl(var(--foreground))",
                margin: 0,
                fontFamily: "system-ui, sans-serif",
              }}>
                {GREETING}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              告訴我你需要什麼，或上傳作品開始分析
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                onClick={() => send(q.prompt)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm transition-colors hover:bg-accent"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                <span style={{ color: "var(--color-teal-500)", fontSize: "12px" }}>{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message thread */}
      {!isEmpty && (
        <div className="overflow-y-auto px-4 py-4 flex flex-col gap-4" style={{ flex: 1, minHeight: 0 }}>
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px",
                background: m.role === "agent" ? "var(--color-teal-500)" : "hsl(var(--muted))",
                color: m.role === "agent" ? "#fff" : "hsl(var(--muted-foreground))",
              }}>
                {m.role === "agent" ? "✳" : "U"}
              </div>

              <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: "6px" }}>
                {m.attachments && m.attachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {m.attachments.map((a) => (
                      <div key={a.id} className="border rounded-lg overflow-hidden bg-card">
                        {a.type === "image" && a.preview
                          ? <img src={a.preview} alt={a.name} style={{ width: 120, height: 80, objectFit: "cover", display: "block" }} />
                          : (
                            <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-muted-foreground">
                              <span>📄</span>
                              <span className="max-w-[100px] truncate">{a.name}</span>
                              <span className="opacity-60">{a.size}</span>
                            </div>
                          )
                        }
                      </div>
                    ))}
                  </div>
                )}

                {m.content && (
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    background: m.role === "user" ? "hsl(var(--primary))" : "hsl(var(--card))",
                    border: m.role === "agent" ? "1px solid hsl(var(--border))" : "none",
                    color: m.role === "user" ? "hsl(var(--primary-foreground))" : "hsl(var(--card-foreground))",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    fontFamily: "system-ui, sans-serif",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {m.content}
                  </div>
                )}

                <span className="text-[11px] text-muted-foreground" style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                }}>
                  {m.ts.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--color-teal-500)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", flexShrink: 0,
              }}>✳</div>
              <div className="border rounded-[4px_16px_16px_16px] px-3.5 py-2.5 bg-card flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--color-teal-500)", opacity: 0.4,
                    animation: `mw-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    display: "inline-block",
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-2">
          {attachments.map((a) => (
            <div key={a.id} className="relative border rounded-lg overflow-hidden bg-card">
              {a.type === "image" && a.preview
                ? <img src={a.preview} alt={a.name} style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} />
                : (
                  <div style={{ width: 64, height: 64 }} className="flex flex-col items-center justify-center text-xl gap-0.5">
                    <span>📄</span>
                    <span className="text-[9px] text-muted-foreground text-center px-1 break-all leading-tight">
                      {a.name.length > 10 ? a.name.slice(0, 8) + "…" : a.name}
                    </span>
                  </div>
                )
              }
              <button
                onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white leading-none"
                style={{ background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer" }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          margin: isEmpty ? "0 12px 12px" : "8px 12px 12px",
          borderRadius: 12,
          border: dragOver ? "2px solid var(--color-teal-500)" : "1px solid hsl(var(--border))",
          background: dragOver ? "rgba(45,122,79,0.04)" : "hsl(var(--background))",
          transition: "border-color 0.15s, background 0.15s",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          position: "relative",
        }}
      >
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center text-sm pointer-events-none"
            style={{ color: "var(--color-teal-500)", zIndex: 1 }}>
            放開以上傳
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isEmpty ? "有什麼需要幫忙的？" : "繼續對話…（Enter 送出，Shift+Enter 換行）"}
          rows={1}
          style={{
            width: "100%", border: "none", outline: "none", resize: "none",
            background: "transparent", padding: "12px 14px 0",
            fontSize: "14px", fontFamily: "system-ui, sans-serif",
            color: "hsl(var(--foreground))", lineHeight: 1.6,
            minHeight: 40, maxHeight: 200, overflowY: "auto",
            boxSizing: "border-box",
          }}
        />

        <div className="flex items-center justify-between px-3 pb-2.5 pt-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef} type="file" multiple
              accept="image/*,text/*,.pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => e.target.files && processFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              title="上傳檔案"
              className="w-8 h-8 rounded-lg border flex items-center justify-center text-base text-muted-foreground hover:bg-accent transition-colors"
              style={{ background: "transparent", cursor: "pointer" }}
            >+</button>
            <span className="text-[11px] text-muted-foreground opacity-70">
              圖片 / 文件 / 拖曳上傳
            </span>
          </div>

          <button
            onClick={() => send()}
            disabled={loading || (!input.trim() && attachments.length === 0)}
            style={{
              height: 30, padding: "0 14px", borderRadius: 999, border: "none",
              background: (loading || (!input.trim() && attachments.length === 0))
                ? "hsl(var(--muted))" : "var(--color-teal-500)",
              color: (loading || (!input.trim() && attachments.length === 0))
                ? "hsl(var(--muted-foreground))" : "#fff",
              fontSize: "13px", fontFamily: "system-ui, sans-serif",
              cursor: (loading || (!input.trim() && attachments.length === 0)) ? "not-allowed" : "pointer",
              transition: "background 0.15s",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {loading ? "思考中…" : "送出"}
            {!loading && <span style={{ fontSize: "11px", opacity: 0.8 }}>↵</span>}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes mw-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes mw-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Auth types
───────────────────────────────────────────────────────── */
type AuthView = "login" | "register" | "forgot" | "change-password"

/* ─────────────────────────────────────────────────────────
   Dashboard Page
───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter()

  // ── Auth state ──────────────────────────────────────────
  const [authToken,    setAuthToken]    = useState<string | null>(null)
  const [authUsername, setAuthUsername] = useState("")
  const [authEmail,    setAuthEmail]    = useState("")
  const [authOpen,     setAuthOpen]     = useState(false)
  const [authView,     setAuthView]     = useState<AuthView>("login")

  const [loginEmail,  setLoginEmail]  = useState("")
  const [loginPw,     setLoginPw]     = useState("")
  const [regName,     setRegName]     = useState("")
  const [regEmail,    setRegEmail]    = useState("")
  const [regPw,       setRegPw]       = useState("")
  const [regPw2,      setRegPw2]      = useState("")
  const [forgotEmail, setForgotEmail] = useState("")
  const [oldPw,       setOldPw]       = useState("")
  const [newPw,       setNewPw]       = useState("")
  const [newPw2,      setNewPw2]      = useState("")
  const [showPw,      setShowPw]      = useState(false)

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [ok,  setOk]  = useState("")

  useEffect(() => {
    const t = sessionStorage.getItem("auth_token")
    const u = sessionStorage.getItem("auth_username") || ""
    const e = sessionStorage.getItem("auth_email") || ""
    if (t) { setAuthToken(t); setAuthUsername(u); setAuthEmail(e) }
  }, [])

  const clear = () => { setErr(""); setOk("") }
  const openAuth = (view: AuthView) => { clear(); setAuthView(view); setAuthOpen(true) }

  const handleLogin = async () => {
    clear()
    if (!loginEmail || !loginPw) { setErr("請填寫電子郵件與密碼"); return }
    setLoading(true)
    try {
      const res = await apiFetch("/auth/login", { email: loginEmail, password: loginPw })
      sessionStorage.setItem("auth_token", res.token)
      sessionStorage.setItem("auth_username", res.username)
      sessionStorage.setItem("auth_email", res.email)
      setAuthToken(res.token); setAuthUsername(res.username); setAuthEmail(res.email)
      setLoginEmail(""); setLoginPw("")
      setOk("登入成功！"); setTimeout(() => setAuthOpen(false), 800)
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const handleRegister = async () => {
    clear()
    if (!regName || !regEmail || !regPw) { setErr("請填寫所有必填欄位"); return }
    if (regPw !== regPw2) { setErr("兩次密碼不一致"); return }
    if (regPw.length < 6) { setErr("密碼至少 6 個字元"); return }
    setLoading(true)
    try {
      await apiFetch("/auth/register", { username: regName, email: regEmail, password: regPw })
      setOk("註冊成功！請檢查電子郵件並點擊驗證連結後登入。")
      setRegName(""); setRegEmail(""); setRegPw(""); setRegPw2("")
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const handleForgot = async () => {
    clear()
    if (!forgotEmail) { setErr("請輸入電子郵件"); return }
    setLoading(true)
    try {
      await apiFetch("/auth/forgot-password", { email: forgotEmail })
      setOk("重設連結已發送，請檢查您的收件匣（包含垃圾郵件）。")
      setForgotEmail("")
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const handleChangePw = async () => {
    clear()
    if (!oldPw || !newPw || !newPw2) { setErr("請填寫所有欄位"); return }
    if (newPw !== newPw2) { setErr("兩次新密碼不一致"); return }
    if (newPw.length < 6) { setErr("新密碼至少 6 個字元"); return }
    setLoading(true)
    try {
      await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
      }).then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.detail) }); return r.json() })
      setOk("密碼已成功更新！"); setOldPw(""); setNewPw(""); setNewPw2("")
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch(`${API}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${authToken}` } })
      } catch {}
    }
    sessionStorage.removeItem("auth_token")
    sessionStorage.removeItem("auth_username")
    sessionStorage.removeItem("auth_email")
    setAuthToken(null); setAuthUsername(""); setAuthEmail("")
  }

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase()

  // ── Auth Modal ──────────────────────────────────────────
  const AuthModal = () => (
    <Dialog open={authOpen} onOpenChange={v => { setAuthOpen(v); if (!v) clear() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-teal-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">VFX</span>
            </div>
            {authView === "login"           && "登入帳號"}
            {authView === "register"        && "建立新帳號"}
            {authView === "forgot"          && "重設密碼"}
            {authView === "change-password" && "修改密碼"}
          </DialogTitle>
          <DialogDescription>
            {authView === "login"           && "輸入您的電子郵件與密碼"}
            {authView === "register"        && "填寫以下資料建立帳號，系統會寄送驗證信"}
            {authView === "forgot"          && "輸入註冊時的電子郵件，系統會寄送重設連結"}
            {authView === "change-password" && "輸入目前密碼與新密碼"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {err && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}
          {ok && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{ok}</AlertDescription>
            </Alert>
          )}

          {authView === "login" && (
            <>
              <div className="space-y-1.5">
                <Label>電子郵件</Label>
                <Input type="email" placeholder="you@example.com" value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label>密碼</Label>
                  <button className="text-xs text-teal-600 hover:underline"
                    onClick={() => { clear(); setAuthView("forgot") }}>忘記密碼？</button>
                </div>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} placeholder="輸入密碼" value={loginPw}
                    onChange={e => setLoginPw(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleLogin() }} />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPw(v => !v)}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleLogin} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />登入中...</> : "登入"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                還沒有帳號？{" "}
                <button className="text-teal-600 hover:underline" onClick={() => { clear(); setAuthView("register") }}>
                  立即註冊
                </button>
              </p>
            </>
          )}

          {authView === "register" && (
            <>
              <div className="space-y-1.5">
                <Label>使用者名稱 <span className="text-red-500">*</span></Label>
                <Input placeholder="您的名字" value={regName} onChange={e => setRegName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>電子郵件 <span className="text-red-500">*</span></Label>
                <Input type="email" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>密碼 <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input type={showPw ? "text" : "password"} placeholder="≥ 6 字元" value={regPw} onChange={e => setRegPw(e.target.value)} />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPw(v => !v)}>
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>確認密碼 <span className="text-red-500">*</span></Label>
                  <Input type="password" placeholder="再次輸入" value={regPw2} onChange={e => setRegPw2(e.target.value)} />
                </div>
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleRegister} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />建立中...</> : "建立帳號"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">註冊後需驗證電子郵件才能登入</p>
              <p className="text-center text-sm text-muted-foreground">
                已有帳號？{" "}
                <button className="text-teal-600 hover:underline" onClick={() => { clear(); setAuthView("login") }}>登入</button>
              </p>
            </>
          )}

          {authView === "forgot" && (
            <>
              <div className="space-y-1.5">
                <Label>電子郵件</Label>
                <Input type="email" placeholder="輸入您的電子郵件" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleForgot() }} />
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleForgot} disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />發送中...</>
                  : <><Mail className="w-4 h-4 mr-2" />發送重設連結</>
                }
              </Button>
              <button className="w-full text-sm text-center text-teal-600 hover:underline"
                onClick={() => { clear(); setAuthView("login") }}>
                ← 返回登入
              </button>
            </>
          )}

          {authView === "change-password" && (
            <>
              <div className="space-y-1.5">
                <Label>目前密碼</Label>
                <Input type="password" placeholder="輸入目前密碼" value={oldPw} onChange={e => setOldPw(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>新密碼</Label>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} placeholder="至少 6 個字元" value={newPw} onChange={e => setNewPw(e.target.value)} />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPw(v => !v)}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>確認新密碼</Label>
                <Input type="password" placeholder="再次輸入新密碼" value={newPw2} onChange={e => setNewPw2(e.target.value)} />
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleChangePw} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />更新中...</> : "更新密碼"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

  // ── Top bar user section ──────────────────────────────
  const UserSection = () => (
    <div className="flex items-center gap-2">
      {authToken ? (
        <>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{authUsername}</p>
            <p className="text-xs text-muted-foreground">{authEmail}</p>
          </div>
          <Avatar className="w-8 h-8 cursor-pointer" onClick={() => openAuth("change-password")}>
            <AvatarFallback className="bg-teal-500/20 text-teal-700 text-xs">
              {initials(authUsername || "U")}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" title="修改密碼" onClick={() => openAuth("change-password")}>
            <KeyRound className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="登出" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => openAuth("login")}>登入</Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => openAuth("register")}>註冊</Button>
        </>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <AuthModal />

      {/* Top Navigation */}
      <div className="border-b border-border">
        <div className="flex h-16 items-center px-6 gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">VFX</span>
            </div>
            <span className="font-semibold text-lg">MoonWalk</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
            <div className="w-px h-6 bg-border" />
            <UserSection />
          </div>
        </div>
      </div>

      <div className="flex">
        <PipelineSidebar />

        <main className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {authToken ? `Welcome back, ${authUsername}.` : "Welcome to MoonWalk VFX."}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {authToken
                    ? `目前登入：${authEmail}`
                    : <span>請 <button className="text-teal-600 hover:underline" onClick={() => openAuth("login")}>登入</button> 或 <button className="text-teal-600 hover:underline" onClick={() => openAuth("register")}>註冊</button> 以儲存您的工作</span>
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Active Shots",     value: "142", sub: "Shots in Progress",  color: "text-teal-600",   icon: <ListVideo className="w-4 h-4 text-muted-foreground" />,   bar: true },
              { label: "Pending Reviews",  value: "38",  sub: "Awaiting Feedback",  color: "text-amber-600",  icon: <Clock className="w-4 h-4 text-muted-foreground" /> },
              { label: "AI Analysis Queue",value: "15",  sub: "Assets Processing",  color: "text-cyan-600",   icon: <Settings className="w-4 h-4 text-muted-foreground animate-spin" style={{ animationDuration: "3s" }} /> },
              { label: "Recent Feedback",  value: "24",  sub: "New Comments Today", color: "text-purple-600", icon: <MessageSquare className="w-4 h-4 text-muted-foreground" /> },
            ].map((s, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                  {s.icon}
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                  {s.bar && <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full w-3/4 bg-teal-500 rounded-full" /></div>}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Agent Chat Panel (replaces Recent Activity Timeline) ── */}
            <Card className="lg:col-span-2 overflow-hidden" style={{ minHeight: 520, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <AgentChatPanel />
              </div>
            </Card>

            {/* Quick Actions + Auth */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" asChild>
                    <Link href="/upload-analyze"><Upload className="w-4 h-4 mr-2" />Upload & Analyze</Link>
                  </Button>
                  <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                    <Link href="/compare"><GitCompare className="w-4 h-4 mr-2" />Compare Versions</Link>
                  </Button>
                  <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                    <Link href="/qa"><PenTool className="w-4 h-4 mr-2" />Supervisor Review</Link>
                  </Button>
                  <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                    <Link href="/qa"><Sparkles className="w-4 h-4 mr-2" />Quality Check</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-teal-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" />
                    {authToken ? "帳號管理" : "登入 / 註冊"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {authToken ? (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-teal-500/20 text-teal-700">
                            {initials(authUsername || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{authUsername}</p>
                          <p className="text-xs text-muted-foreground truncate">{authEmail}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full justify-start bg-transparent text-sm"
                        onClick={() => openAuth("change-password")}>
                        <KeyRound className="w-4 h-4 mr-2" />修改密碼
                      </Button>
                      <Button variant="outline" className="w-full justify-start bg-transparent text-sm text-red-600 border-red-200 hover:bg-red-50"
                        onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />登出
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">登入後可儲存您的專案進度與設定</p>
                      <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => openAuth("login")}>
                        登入
                      </Button>
                      <Button variant="outline" className="w-full bg-transparent" onClick={() => openAuth("register")}>
                        建立新帳號
                      </Button>
                      <button className="w-full text-xs text-center text-teal-600 hover:underline pt-1"
                        onClick={() => openAuth("forgot")}>
                        忘記密碼？
                      </button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}