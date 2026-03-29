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

/* ---------------------------------------------------------
   Auth — Types & Role config
--------------------------------------------------------- */
type Role = "admin" | "senior_artist" | "junior_artist"

interface AuthUser {
  username: string
  email:    string
  role:     Role
  token:    string
}

interface UserRecord {
  email:       string
  username:    string
  role:        Role
  verified:    boolean
  created_at:  number
}

export const ROLE_PAGES: Record<Role, string[]> = {
  admin:         ["/", "/kickoff", "/reference-hub", "/upload-analyze", "/compare", "/qa", "/governance"],
  senior_artist: ["/", "/kickoff", "/reference-hub", "/qa", "/governance"],
  junior_artist: ["/", "/upload-analyze", "/compare", "/qa"],
}

export function canAccess(role: Role | null, path: string): boolean {
  if (!role) return path === "/"
  return ROLE_PAGES[role].includes(path)
}

/* Authenticated fetch helper */
async function authFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  let res: Response
  try {
    res = await fetch(`${API}${path}`, { ...options, headers })
  } catch (err: any) {
    // Network error (backend not running, CORS blocked, DNS failure, etc.)
    const msg = err?.message ?? String(err)
    if (msg.toLowerCase().includes("fetch")) {
      throw new Error(`Cannot connect to backend (${API}). Please ensure the backend is running.`)
    }
    throw new Error(msg)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data.detail
    if (Array.isArray(detail)) throw new Error(detail.map((d: any) => d.msg ?? JSON.stringify(d)).join("; "))
    if (typeof detail === "string") throw new Error(detail)
    if (detail) throw new Error(JSON.stringify(detail))
    throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`)
  }
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
  { label: "Analyze Artwork", icon: "✦", prompt: "Analyze the lighting and composition of this artwork" },
  { label: "Gap Analysis", icon: "◈", prompt: "Compare gaps between Artwork and Reference" },
  { label: "Director Notes", icon: "◎", prompt: "Summarize key revision points to escalate to the director" },
  { label: "Style Suggestions", icon: "⟡", prompt: "Give me style adjustment suggestions based on the Reference" },
]

const HOURS = new Date().getHours()
const GREETING =
  HOURS < 5 ? "Still working late" :
  HOURS < 12 ? "Good morning, Moonwalk" :
  HOURS < 18 ? "Afternoon session" :
  HOURS < 22 ? "Good evening" : "Late night"

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
        content: m.content || "(attachment)",
      }))
      const chatHistory = msgHistory.slice(0, -1)

      // Convert image attachments to all_refs_context format so Claude Vision can see them
      const imageRefs = userMsg.attachments
        ?.filter(a => a.type === "image" && a.preview)
        .map(a => ({
          id: a.id,
          title: a.name,
          category: "Uploaded",
          note: "",
          is_pinned: false,
          priority: "secondary",
          preview: a.preview,   // base64 data URL — parsed by _build_ref_image_blocks
        })) ?? []

      // With images → /chat/reference (Claude Vision); text only → /chat/compare (3-AI debate)
      const endpoint = imageRefs.length > 0
        ? `${API}/suggestion/chat/reference`
        : `${API}/suggestion/chat/compare`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:           content || "(attachment)",
          history:           chatHistory,
          all_refs_context:  imageRefs,
          context:           "",
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
        `[Unknown format] keys: ${Object.keys(data).join(', ')}`

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
        content: e?.message ?? "Connection failed",
        ts: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }, [input, attachments, messages])

  // Fix: isComposing check prevents IME composition from triggering Send
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
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
              Tell me what you need, or upload artwork to start analysis
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
            Drop to upload
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isEmpty ? "How can I help?" : "Continue the conversation… (Enter to send, Shift+Enter for new line)"}
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
              title="Upload file"
              className="w-8 h-8 rounded-lg border flex items-center justify-center text-base text-muted-foreground hover:bg-accent transition-colors"
              style={{ background: "transparent", cursor: "pointer" }}
            >+</button>
            <span className="text-[11px] text-muted-foreground opacity-70">
              Images / Files / Drag & drop
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
            {loading ? "Thinking…" : "Send"}
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
   Dashboard Page
───────────────────────────────────────────────────────── */

const ROLE_LABEL: Record<Role, string> = {
  admin:         "Admin",
  senior_artist: "Senior Artist",
  junior_artist: "Junior Artist",
}

const ROLE_COLOR: Record<Role, string> = {
  admin:         "bg-purple-500/15 text-purple-700 border-purple-300",
  senior_artist: "bg-teal-500/15 text-teal-700 border-teal-300",
  junior_artist: "bg-sky-500/15 text-sky-700 border-sky-300",
}

// Auth modal tab type
type AuthTab = "login" | "register"

/* ─────────────────────────────────────────────────────────
   AuthModal — standalone top-level component to avoid remounting on every keystroke
───────────────────────────────────────────────────────── */
interface AuthModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  authTab: AuthTab
  setAuthTab: (t: AuthTab) => void
  // login
  loginEmail: string
  setLoginEmail: (v: string) => void
  loginPw: string
  setLoginPw: (v: string) => void
  showPw: boolean
  setShowPw: (v: boolean) => void
  loginErr: string
  authLoading: boolean
  handleLogin: () => void
  // register
  regUsername: string
  setRegUsername: (v: string) => void
  regPw: string
  setRegPw: (v: string) => void
  regPwConfirm: string
  setRegPwConfirm: (v: string) => void
  showRegPw: boolean
  setShowRegPw: (v: boolean) => void
  regRole: Role
  setRegRole: (v: Role) => void
  regErr: string
  regOk: string
  handleRegister: () => void
}

function AuthModal({
  open, onOpenChange, authTab, setAuthTab,
  loginEmail, setLoginEmail, loginPw, setLoginPw, showPw, setShowPw, loginErr, authLoading, handleLogin,
  regUsername, setRegUsername, regPw, setRegPw,
  regPwConfirm, setRegPwConfirm, showRegPw, setShowRegPw, regRole, setRegRole, regErr, regOk, handleRegister,
}: AuthModalProps) {
  const makeInputKeyDown = (onEnter: () => void) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.nativeEvent.isComposing) onEnter()
    }

  return (
    <Dialog open={open} onOpenChange={v => {
      onOpenChange(v)
    }}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-teal-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">VFX</span>
            </div>
            {authTab === "login" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {authTab === "login" ? "Enter your username and password" : "Fill in your details to create an account"}
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {(["login", "register"] as AuthTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setAuthTab(tab)}
              className="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{
                background: authTab === tab ? "hsl(var(--background))" : "transparent",
                color: authTab === tab ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                border: "none", cursor: "pointer",
                boxShadow: authTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {tab === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Login Form */}
        {authTab === "login" && (
          <div className="space-y-4 pt-1">
            {loginErr && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{loginErr}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                placeholder="Enter username"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                onKeyDown={makeInputKeyDown(handleLogin)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter password"
                  value={loginPw}
                  onChange={e => setLoginPw(e.target.value)}
                  onKeyDown={makeInputKeyDown(handleLogin)}
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleLogin} disabled={authLoading}>
              {authLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Don't have an account?
              <button className="text-teal-600 hover:underline ml-1" onClick={() => setAuthTab("register")}>
                Create Account
              </button>
            </p>
          </div>
        )}

        {/* Register Form */}
        {authTab === "register" && (
          <div className="space-y-3 pt-1">
            {regErr && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{regErr}</AlertDescription>
              </Alert>
            )}
            {regOk && (
              <Alert className="border-teal-300 bg-teal-50 text-teal-700">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{regOk}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                placeholder="Letters, numbers, underscores allowed"
                value={regUsername}
                onChange={e => setRegUsername(e.target.value)}
                onKeyDown={makeInputKeyDown(handleRegister)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showRegPw ? "text" : "password"}
                  placeholder="At least 6 characters, special characters allowed"
                  value={regPw}
                  onChange={e => setRegPw(e.target.value)}
                  onKeyDown={makeInputKeyDown(handleRegister)}
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowRegPw(!showRegPw)}>
                  {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input
                type={showRegPw ? "text" : "password"}
                placeholder="Re-enter password"
                value={regPwConfirm}
                onChange={e => setRegPwConfirm(e.target.value)}
                onKeyDown={makeInputKeyDown(handleRegister)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["junior_artist", "Junior Artist", "bg-sky-500/15 text-sky-700 border-sky-300"],
                  ["senior_artist", "Senior Artist", "bg-teal-500/15 text-teal-700 border-teal-300"],
                  ["admin",         "Admin",         "bg-purple-500/15 text-purple-700 border-purple-300"],
                ] as [Role, string, string][]).map(([val, label, cls]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRegRole(val)}
                    className={`py-1.5 rounded-md text-xs font-medium border transition-all ${cls}`}
                    style={{
                      opacity: regRole === val ? 1 : 0.4,
                      transform: regRole === val ? "scale(1.03)" : "scale(1)",
                      fontWeight: regRole === val ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 mt-1" onClick={handleRegister} disabled={authLoading}>
              {authLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Account"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?
              <button className="text-teal-600 hover:underline ml-1" onClick={() => setAuthTab("login")}>
                Sign in
              </button>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function DashboardPage() {
  const router = useRouter()

  // ── Auth state ────────────────────────────────────────────
  const [authUser,    setAuthUser]    = useState<AuthUser | null>(null)
  const [users,       setUsers]       = useState<UserRecord[]>([])
  const [authOpen,    setAuthOpen]    = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  // Login/Register tab toggle
  const [authTab,     setAuthTab]     = useState<AuthTab>("login")

  // Login form
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPw,    setLoginPw]    = useState("")
  const [showPw,     setShowPw]     = useState(false)
  const [loginErr,   setLoginErr]   = useState("")

  // Register form
  const [regUsername, setRegUsername] = useState("")
  const [regPw,       setRegPw]       = useState("")
  const [regPwConfirm,setRegPwConfirm]= useState("")
  const [showRegPw,   setShowRegPw]   = useState(false)
  const [regRole,     setRegRole]     = useState<Role>("junior_artist")
  const [regErr,      setRegErr]      = useState("")
  const [regOk,       setRegOk]       = useState("")

  // Admin: add-user form
  const [newEmail,  setNewEmail]  = useState("")
  const [newName,   setNewName]   = useState("")
  const [newPw,     setNewPw]     = useState("")
  const [newRole,   setNewRole]   = useState<Role>("junior_artist")
  const [addErr,    setAddErr]    = useState("")
  const [addOk,     setAddOk]     = useState("")

  // Restore session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("auth_user")
    if (!saved) return
    try {
      const u: AuthUser = JSON.parse(saved)
      authFetch("/auth/me", { method: "GET" }, u.token)
        .then(me => setAuthUser({ ...u, username: me.username, role: me.role }))
        .catch(() => sessionStorage.removeItem("auth_user"))
    } catch {}
  }, [])

  useEffect(() => {
    if (authUser?.role === "admin") fetchUsers()
  }, [authUser])

  const fetchUsers = async () => {
    if (!authUser?.token) return
    try {
      const data: UserRecord[] = await authFetch("/auth/admin/users", { method: "GET" }, authUser.token)
      setUsers(data)
    } catch {}
  }

  const handleLogin = async () => {
    setLoginErr("")
    if (!loginEmail.trim() || !loginPw) { setLoginErr("Please fill in your username and password"); return }
    setAuthLoading(true)
    try {
      const data = await authFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: loginEmail.trim(), password: loginPw }),
      })
      const u: AuthUser = { username: data.username, email: data.email, role: data.role, token: data.token }
      sessionStorage.setItem("auth_user", JSON.stringify(u))
      setAuthUser(u)
      setLoginEmail(""); setLoginPw("")
      setAuthOpen(false)
    } catch (e: any) { setLoginErr(e.message) }
    finally { setAuthLoading(false) }
  }

  // handleRegister handler
  const handleRegister = async () => {
    setRegErr(""); setRegOk("")
    if (!regUsername.trim() || !regPw) {
      setRegErr("Please fill in all fields"); return
    }
    if (regPw !== regPwConfirm) {
      setRegErr("Passwords do not match"); return
    }
    if (regPw.length < 6) {
      setRegErr("Password must be at least 6 characters"); return
    }
    setAuthLoading(true)
    try {
      await authFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: regUsername.trim(),
          password: regPw,
          role: regRole,
          email: `${regUsername.trim()}@placeholder.local`,
        }),
      })
      setRegOk("Registration successful! Please sign in.")
      setTimeout(() => {
        setRegOk("")
        setAuthTab("login")
        setLoginEmail(regUsername.trim())
        setRegUsername(""); setRegPw(""); setRegPwConfirm(""); setRegRole("junior_artist")
      }, 1500)
    } catch (e: any) { setRegErr(e.message) }
    finally { setAuthLoading(false) }
  }

  const handleLogout = async () => {
    if (authUser?.token) {
      try { await authFetch("/auth/logout", { method: "POST" }, authUser.token) } catch {}
    }
    sessionStorage.removeItem("auth_user")
    setAuthUser(null); setUsers([])
  }

  const handleAddUser = async () => {
    setAddErr(""); setAddOk("")
    if (!newEmail.trim() || !newName.trim() || !newPw.trim()) { setAddErr("Please fill in all fields"); return }
    try {
      await authFetch("/auth/admin/users", {
        method: "POST",
        body: JSON.stringify({ email: newEmail.trim(), username: newName.trim(), password: newPw.trim(), role: newRole }),
      }, authUser!.token)
      setNewEmail(""); setNewName(""); setNewPw(""); setNewRole("junior_artist")
      setAddOk(`User ${newEmail.trim()} added`)
      setTimeout(() => setAddOk(""), 2500)
      fetchUsers()
    } catch (e: any) { setAddErr(e.message) }
  }

  const handleDeleteUser = async (email: string) => {
    try {
      await authFetch(`/auth/admin/users/${encodeURIComponent(email)}`, { method: "DELETE" }, authUser!.token)
      fetchUsers()
    } catch (e: any) { setAddErr(e.message) }
  }

  const initials = (name: string) => name.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      {/* Top-level AuthModal — not defined inside render to avoid remounting on keystroke */}
      <AuthModal
        open={authOpen}
        onOpenChange={v => { setAuthOpen(v); setLoginErr(""); setRegErr(""); setRegOk("") }}
        authTab={authTab} setAuthTab={setAuthTab}
        loginEmail={loginEmail} setLoginEmail={setLoginEmail}
        loginPw={loginPw} setLoginPw={setLoginPw}
        showPw={showPw} setShowPw={setShowPw}
        loginErr={loginErr} authLoading={authLoading} handleLogin={handleLogin}
        regUsername={regUsername} setRegUsername={setRegUsername}
        regPw={regPw} setRegPw={setRegPw}
        regPwConfirm={regPwConfirm} setRegPwConfirm={setRegPwConfirm}
        showRegPw={showRegPw} setShowRegPw={setShowRegPw}
        regRole={regRole} setRegRole={setRegRole}
        regErr={regErr} regOk={regOk} handleRegister={handleRegister}
      />

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
            {/* UserSection inlined to avoid remounting */}
            <div className="flex items-center gap-2">
              {authUser ? (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{authUser.username}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ROLE_COLOR[authUser.role]}`}>
                      {ROLE_LABEL[authUser.role]}
                    </span>
                  </div>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-teal-500/20 text-teal-700 text-xs">
                      {initials(authUser.username)}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon" title="Sign Out" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { setAuthTab("register"); setAuthOpen(true) }}>
                    Sign Up
                  </Button>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => { setAuthTab("login"); setAuthOpen(true) }}>
                    Sign In
                  </Button>
                </>
              )}
            </div>
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
                  {authUser ? `Welcome back, ${authUser.username}.` : "Welcome to MoonWalk."}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {authUser
                    ? <span>Current role: <span className={`font-medium px-1.5 py-0.5 rounded border text-xs ${ROLE_COLOR[authUser.role]}`}>{ROLE_LABEL[authUser.role]}</span></span>
                    : <span>Please <button className="text-teal-600 hover:underline" onClick={() => { setAuthTab("login"); setAuthOpen(true) }}>Sign In</button> to get started</span>
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
            {[
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
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent Chat Panel */}
            <Card className="lg:col-span-2 overflow-hidden" style={{ minHeight: 520, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <AgentChatPanel />
              </div>
            </Card>

            {/* Account Panel */}
            <div className="space-y-4">
              <Card className="border-teal-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" />
                    {authUser ? "Account Info" : "Sign In / Sign Up"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {authUser ? (
                    <>
                      {/* User info */}
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-teal-500/20 text-teal-700">
                            {initials(authUser.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{authUser.username}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ROLE_COLOR[authUser.role]}`}>
                            {ROLE_LABEL[authUser.role]}
                          </span>
                        </div>
                      </div>

                      {/* Accessible pages */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Accessible Pages</p>
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const PAGE_LABELS: Record<string, string> = {
                              "/kickoff":       "C01 · Kickoff",
                              "/reference-hub": "C02 · Reference Hub",
                              "/upload-analyze":"C03 · Upload & Analyze",
                              "/compare":       "C04 · Compare Versions",
                              "/qa":            "C05/C06 · QA Review",
                              "/governance":    "C07 · Governance",
                            }
                            return ROLE_PAGES[authUser.role].filter(p => p !== "/").map(path => (
                              <Link key={path} href={path}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-foreground">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                                {PAGE_LABELS[path] ?? path}
                              </Link>
                            ))
                          })()}
                        </div>
                      </div>

                      {/* Admin: user management */}
                      {authUser.role === "admin" && (
                        <div className="border-t pt-3 space-y-2.5">
                          <p className="text-xs font-medium text-muted-foreground">User Management</p>

                          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                            {users.map(u => (
                              <div key={u.email} className="rounded-md bg-muted/40 text-xs overflow-hidden">
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                  <span className={`px-1.5 py-0.5 rounded border font-medium text-[10px] flex-shrink-0 ${ROLE_COLOR[u.role]}`}>
                                    {ROLE_LABEL[u.role].split(" ")[0]}
                                  </span>
                                  <span className="flex-1 font-medium truncate">{u.username}</span>
                                  <span className="text-muted-foreground truncate max-w-[80px] text-[10px]">{u.email}</span>
                                  {u.email !== authUser?.email && (
                                    <button
                                      onClick={() => handleDeleteUser(u.email)}
                                      className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                                      title="Delete account"
                                    >✕</button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-1.5 border rounded-md p-2.5 bg-muted/20">
                            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Add Account</p>
                            {addErr && <p className="text-[11px] text-red-600">{addErr}</p>}
                            {addOk  && <p className="text-[11px] text-teal-600">{addOk}</p>}
                            <Input className="h-7 text-xs" type="email" placeholder="Email" value={newEmail}
                              onChange={e => setNewEmail(e.target.value)} />
                            <Input className="h-7 text-xs" placeholder="Display name" value={newName}
                              onChange={e => setNewName(e.target.value)} />
                            <Input className="h-7 text-xs" type="password" placeholder="Password" value={newPw}
                              onChange={e => setNewPw(e.target.value)} />
                            <select
                              className="w-full h-7 text-xs rounded-md border border-input bg-background px-2"
                              value={newRole}
                              onChange={e => setNewRole(e.target.value as Role)}
                            >
                              <option value="junior_artist">Junior Artist</option>
                              <option value="senior_artist">Senior Artist</option>
                              <option value="admin">Admin</option>
                            </select>
                            <Button className="w-full h-7 text-xs bg-teal-600 hover:bg-teal-700" onClick={handleAddUser}>
                              Add
                            </Button>
                          </div>
                        </div>
                      )}

                      <Button variant="outline" className="w-full justify-start bg-transparent text-sm text-red-600 border-red-200 hover:bg-red-50"
                        onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">Sign in to access pages based on your role</p>
                      <div className="space-y-1.5 text-xs text-muted-foreground border rounded-md p-2.5 bg-muted/30">
                        <p className="font-medium text-foreground mb-1">Role Permissions</p>
                        <p><span className="font-medium text-purple-700">Admin</span> — All pages</p>
                        <p><span className="font-medium text-teal-700">Senior Artist</span> — C01, C02, C06, C07</p>
                        <p><span className="font-medium text-sky-700">Junior Artist</span> — C03, C04, C05</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { setAuthTab("register"); setAuthOpen(true) }}>
                          Sign Up
                        </Button>
                        <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={() => { setAuthTab("login"); setAuthOpen(true) }}>
                          Sign In
                        </Button>
                      </div>
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