"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, Crown, Send, ArrowRight, Users, Bot, Sparkles, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, CheckCircle2, Loader2, ImageIcon, FileText } from "lucide-react"
import { TopBar } from "@/components/top-bar"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Link from "next/link"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001"

async function deleteItem(type: "references" | "artworks", id: string) {
  try { await fetch(`${API}/search/${type}/${encodeURIComponent(id)}`, { method: "DELETE" }) } catch {}
  if (type === "references") {
    try { const arr = JSON.parse(sessionStorage.getItem("refhub_refs") || "[]"); sessionStorage.setItem("refhub_refs", JSON.stringify(arr.filter((r: any) => String(r.id) !== String(id)))) } catch {}
    try { const arr = JSON.parse(sessionStorage.getItem("c04_ref_previews") || "[]"); sessionStorage.setItem("c04_ref_previews", JSON.stringify(arr.filter((r: any) => String(r.id) !== String(id)))) } catch {}
    try { const ids = JSON.parse(sessionStorage.getItem("deleted_ref_ids") || "[]"); if (!ids.includes(String(id))) ids.push(String(id)); sessionStorage.setItem("deleted_ref_ids", JSON.stringify(ids)) } catch {}
    try { window.dispatchEvent(new StorageEvent("storage", { key: "deleted_ref_ids" })) } catch {}
  } else {
    try { const arr = JSON.parse(sessionStorage.getItem("c04_artwork_previews") || "[]"); sessionStorage.setItem("c04_artwork_previews", JSON.stringify(arr.filter((r: any) => String(r.id) !== String(id)))) } catch {}
  }
}

const PROJECT_ID = "proj_001"
const SS = {
  get: (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v) } catch {} },
}

function stripMd(t: string) {
  return t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/^---+$/gm, "").replace(/^#{1,6} /gm, "").trim()
}

type FeedbackItem = { id: string; text: string; source: string; priority: string; addressed: boolean; aiDraft?: string }
type ChatMsg = { role: string; content: string }

export default function GovernancePage() {
  const [chatbotOpen, setChatbotOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: "ai", content: "Hello! I'm the Decision Loop assistant. I've loaded the QA feedback list and image data. I can help you:\n1. Clarify conflicts between multiple opinions\n2. Consolidate final feedback\n3. Draft actionable revision instructions for the Artist." },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [artworkImage, setArtworkImage] = useState("")
  const [artworkName, setArtworkName] = useState("")
  const [artworkId, setArtworkId] = useState("")
  const [refImage, setRefImage] = useState("")
  const [refName, setRefName] = useState("")
  const [refId, setRefId] = useState("")
  const [artistNote, setArtistNote] = useState("")
  const [reflectionNote, setReflectionNote] = useState("")
  const [supervisorSpec, setSupervisorSpec] = useState("")
  const [allRefsContext, setAllRefsContext] = useState<any[]>([])

  const [supervisorFeedback, setSupervisorFeedback] = useState("")
  const [aiFeedback, setAiFeedback] = useState("")
  const [clientFeedback, setClientFeedback] = useState("")
  const [finalAuthority, setFinalAuthority] = useState("")
  const [synthText, setSynthText] = useState("")

  useEffect(() => {
    let items: FeedbackItem[] = []
    try {
      const raw = SS.get("c04_analysis")
      if (raw) {
        const a = JSON.parse(raw)
        if (Array.isArray(a.metrics) && a.metrics.length > 0) {
          items = a.metrics.map((m: any) => ({
            id: "c04-" + (m.id || m.name),
            text: "[" + m.name + "] " + (m.agentA?.opinion || m.summary || ""),
            source: "AI", priority: m.status === "red" ? "P0" : m.status === "yellow" ? "P1" : "P2",
            addressed: false, aiDraft: m.suggestions?.join("; ") || m.agentB?.opinion || "",
          }))
          const issues = a.metrics.filter((m: any) => m.status !== "green").map((m: any) => `${m.name}: ${m.agentA?.opinion || m.summary || ""}`)
          if (issues.length > 0) setAiFeedback(issues.join("\n"))
        }
      }
    } catch {}
    try {
      const raw = SS.get("compare_delta_list")
      if (raw) {
        const deltas = JSON.parse(raw)
        if (Array.isArray(deltas)) {
          const existingIds = new Set(items.map(f => f.id))
          const newItems = deltas.filter((d: any) => !existingIds.has("delta-" + (d.id || d.metric))).map((d: any) => ({
            id: "delta-" + (d.id || d.metric), text: "[" + (d.metric || d.name) + "] " + (d.gap || d.summary || ""),
            source: "AI", priority: d.severity === "high" ? "P0" : d.severity === "medium" ? "P1" : "P2",
            addressed: false, aiDraft: d.suggestion || d.fix || "",
          }))
          items = [...items, ...newItems]
        }
      }
    } catch {}
    setFeedbackItems(items)
    try { const raw = SS.get("qa_chat"); if (raw) { const msgs = JSON.parse(raw); const lastAI = [...msgs].reverse().find((m: any) => m.role === "ai"); if (lastAI?.content) setSynthText(lastAI.content.slice(0, 400)) } } catch {}
    try { const aw = SS.get("c04_artwork_previews"); if (aw) { const parsed = JSON.parse(aw); if (parsed.length > 0) { setArtworkImage(parsed[0].preview || ""); setArtworkName(parsed[0].name || ""); setArtworkId(parsed[0].id || "") } } } catch {}
    try {
      const refs: any[] = []
      const hr = SS.get("refhub_refs"); const cp = SS.get("c04_ref_previews")
      if (hr) JSON.parse(hr).forEach((r: any) => { refs.push({ id: r.id, title: r.title || r.id, preview: r.preview || r.file_url || "", category: r.category || "", note: r.note || "", is_pinned: r.is_pinned, priority: r.priority }) })
      if (cp) JSON.parse(cp).forEach((r: any) => { const idx = refs.findIndex(x => x.id === r.id || x.title?.toLowerCase() === (r.title || "").toLowerCase()); if (idx >= 0 && r.preview?.startsWith("data:")) refs[idx].preview = r.preview; else if (idx < 0 && r.preview?.startsWith("data:")) refs.push({ id: r.id, title: r.title || r.id, preview: r.preview, category: r.category || "", note: r.note || "" }) })
      setAllRefsContext(refs)
      const mainRef = refs.find(r => r.is_pinned || r.priority === "main" || r.priority === "Main") || refs[0]
      if (mainRef) { setRefImage(mainRef.preview || ""); setRefName(mainRef.title || ""); setRefId(mainRef.id || "") }
    } catch {}
    try { setArtistNote(SS.get("reflection_notes") || "") } catch {}
    try { setReflectionNote(SS.get("c04_notes") || "") } catch {}
    try { const b = JSON.parse(SS.get("kickoff_brief") || "{}"); setSupervisorSpec(b.supervisor_spec || "") } catch {}
    try { const draft = SS.get("governance_draft"); if (draft) { const d = JSON.parse(draft); if (d.supervisorFeedback) setSupervisorFeedback(d.supervisorFeedback); if (d.clientFeedback) setClientFeedback(d.clientFeedback); if (d.finalAuthority) setFinalAuthority(d.finalAuthority); if (d.synthText) setSynthText(d.synthText) } } catch {}
  }, [])

  useEffect(() => { chatScrollRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chatMessages])

  const saveDraft = () => SS.set("governance_draft", JSON.stringify({ supervisorFeedback, clientFeedback, finalAuthority, synthText }))

  const callAgent = useCallback(async (msg: string) => {
    setChatLoading(true)
    const context = [
      artworkName ? `Artwork: ${artworkName}` : "",
      refName ? `Reference: ${refName}` : "",
      artistNote?.trim() ? `Understanding Notes:\n${artistNote.trim()}` : "",
      reflectionNote?.trim() ? `Creative Reflection Notes:\n${reflectionNote.trim()}` : "",
      supervisorSpec?.trim() ? `Supervisor Spec:\n${supervisorSpec.trim()}` : "",
      supervisorFeedback?.trim() ? `Supervisor feedback:\n${supervisorFeedback.trim()}` : "",
      clientFeedback?.trim() ? `Client feedback:\n${clientFeedback.trim()}` : "",
      feedbackItems.length > 0
        ? `QA Feedback List:\n${feedbackItems.map(f => `[${f.priority}] ${f.text}`).join("\n")}`
        : "(No QA feedback data available.)",
    ].filter(Boolean).join("\n\n")
    const history = chatMessages.slice(-6).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }))
    let replied = false
    for (const endpoint of [`${API}/suggestion/chat/governance`, `${API}/suggestion/chat/analysis`]) {
      try {
        const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: PROJECT_ID, message: msg, context, all_refs_context: allRefsContext, history }) })
        if (!res.ok) continue
        const data = await res.json()
        const reply = data.response || data.reply || ""
        if (reply.trim()) { setChatMessages(p => [...p, { role: "ai", content: stripMd(reply) }]); replied = true; break }
      } catch {}
    }
    if (!replied) setChatMessages(p => [...p, { role: "ai", content: "Connection failed. Please confirm the backend is running." }])
    setChatLoading(false)
  }, [chatMessages, artworkName, refName, artistNote, reflectionNote, supervisorSpec, supervisorFeedback, clientFeedback, feedbackItems, allRefsContext])

  const handleChatSend = () => {
    const msg = chatInput.trim(); if (!msg || chatLoading) return
    setChatMessages(p => [...p, { role: "user", content: msg }]); setChatInput(""); callAgent(msg)
  }

  const handleSendQAToChat = () => {
    if (feedbackItems.length === 0) return
    const summary = `Based on the following QA feedback list, provide a final consolidated recommendation:\n${feedbackItems.map(f => `[${f.priority}] ${f.text}`).join("\n")}`
    setChatMessages(p => [...p, { role: "user", content: "[QA Feedback Imported — Please Analyze]" }]); callAgent(summary)
  }

  const p0 = feedbackItems.filter(f => f.priority === "P0")
  const p1 = feedbackItems.filter(f => f.priority === "P1")
  const p2 = feedbackItems.filter(f => f.priority === "P2")
  const priColor = (p: string) => p === "P0" ? "bg-red-500/10 text-red-600 border-red-500/30" : p === "P1" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-green-500/10 text-green-600 border-green-500/30"
  const visionCount = allRefsContext.filter(r => r.preview?.startsWith("data:")).length

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="flex h-[calc(100vh-57px)]">
        <PipelineSidebar />
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          <div className="border-b border-border bg-card px-6 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400"><Shield className="w-4 h-4" /></div>
              <Badge variant="outline" className="text-xs">C07</Badge>
              <h1 className="text-lg font-bold">Decision Loop</h1>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">

            {/* ── Col 1: QA Feedback ── */}
            <div className="col-span-3 border-r border-border flex flex-col min-h-0">
              <div className="px-4 py-2.5 border-b border-border shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold">QA Feedback List</span>
                </div>
                <div className="flex items-center gap-1">
                  {p0.length > 0 && <Badge className="text-[10px] h-4 px-1.5 bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/10">{p0.length} P0</Badge>}
                  {p1.length > 0 && <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/10">{p1.length} P1</Badge>}
                </div>
              </div>
              {(artworkImage || refImage) && (
                <div className="px-3 pt-2.5 pb-2 grid grid-cols-2 gap-2 shrink-0 border-b border-border">
                  {artworkImage && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 truncate">{artworkName || "Artwork"}</p>
                      <div className="relative group aspect-video rounded border overflow-hidden bg-muted">
                        <img src={artworkImage} alt="artwork" className="w-full h-full object-cover" />
                        <button className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => { if (artworkId) deleteItem("artworks", artworkId); setArtworkImage(""); setArtworkName(""); setArtworkId("") }} title="Remove artwork"><span className="text-white text-[11px] leading-none">✕</span></button>
                      </div>
                    </div>
                  )}
                  {refImage && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 truncate">{refName || "Reference"}</p>
                      <div className="relative group aspect-video rounded border overflow-hidden bg-muted">
                        <img src={refImage} alt="ref" className="w-full h-full object-cover" />
                        <button className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => { if (refId) deleteItem("references", refId); setRefImage(""); setRefName(""); setRefId("") }} title="Remove Reference"><span className="text-white text-[11px] leading-none">✕</span></button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-3 py-2.5 space-y-1.5">
                  {feedbackItems.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-10">No QA feedback yet<br />Please complete QA analysis first</div>
                  ) : feedbackItems.map(f => (
                    <div key={f.id} className={`px-2.5 py-2 rounded-lg border text-xs ${priColor(f.priority)}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {f.priority === "P0" ? <AlertCircle className="w-3 h-3 shrink-0" /> : f.priority === "P1" ? <AlertTriangle className="w-3 h-3 shrink-0" /> : <CheckCircle2 className="w-3 h-3 shrink-0" />}
                        <span className="font-semibold">{f.priority}</span>
                        <span className="text-[10px] opacity-60">{f.source}</span>
                      </div>
                      <p className="text-foreground/80 leading-relaxed">{f.text}</p>
                      {f.aiDraft && <p className="mt-1 text-[10px] opacity-60 border-t border-current/10 pt-1 line-clamp-2">{f.aiDraft}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {feedbackItems.length > 0 && (
                <div className="px-3 pb-3 shrink-0">
                  <Button size="sm" variant="outline" className="w-full text-xs h-7 bg-transparent gap-1.5" onClick={handleSendQAToChat}>
                    <Sparkles className="w-3 h-3" />Send to AI for analysis
                  </Button>
                </div>
              )}
            </div>

            {/* ── Col 2: Final Synthesis ── */}
            <div className="col-span-5 border-r border-border flex flex-col min-h-0 overflow-hidden">

              {/* Stats bar — fixed height */}
              {feedbackItems.length > 0 && (
                <div className="px-4 pt-4 pb-2 shrink-0">
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: "P0 Critical", count: p0.length, cls: "bg-red-500/5 border-red-500/20 text-red-500" },
                      { label: "P1 Important", count: p1.length, cls: "bg-amber-500/5 border-amber-500/20 text-amber-500" },
                      { label: "P2 Suggested", count: p2.length, cls: "bg-green-500/5 border-green-500/20 text-green-500" }
                    ].map(s => (
                      <div key={s.label} className={`p-2 rounded-lg border text-center ${s.cls}`}>
                        <p className="text-xl font-bold">{s.count}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card header — fixed */}
              <div className="px-4 pt-2 pb-1 shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold">Final Feedback Summary</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Consolidate three-party feedback; final authority sends after review</p>
              </div>

              {/* Three columns — fixed height */}
              <div className="px-4 pb-2 shrink-0">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: <Crown className="w-3 h-3 text-amber-500" />, label: "Supervisor", val: supervisorFeedback, set: setSupervisorFeedback, ph: "Supervisor feedback..." },
                    { icon: <Bot className="w-3 h-3 text-teal-500" />, label: "AI Analysis", val: aiFeedback, set: setAiFeedback, ph: "AI analysis (auto-imported)", muted: true },
                    { icon: <Users className="w-3 h-3 text-purple-500" />, label: "Client", val: clientFeedback, set: setClientFeedback, ph: "Client feedback..." },
                  ].map(col => (
                    <div key={col.label} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {col.icon}
                        <span className="text-xs font-medium">{col.label}</span>
                      </div>
                      <Textarea
                        placeholder={col.ph}
                        className={`text-xs resize-none ${col.muted ? "bg-muted/40" : ""}`}
                        style={{ height: 350 }}
                        value={col.val}
                        onChange={e => col.set(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Maker — fixed */}
              <div className="px-4 py-2 shrink-0 border-t border-teal-500/20 flex items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <Label className="text-xs font-medium">Decision Maker</Label>
                </div>
                <Select value={finalAuthority} onValueChange={setFinalAuthority}>
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Supervisor", "Art Director", "Director", "Client", "PM"].map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {finalAuthority && (
                  <span className="text-xs text-muted-foreground">Decided by <strong className="text-foreground">{finalAuthority}</strong> (final authority)</span>
                )}
              </div>

              {/* Synthesis label — fixed */}
              <div className="px-4 pt-1 shrink-0">
                <Label className="text-xs">Final Consolidated Feedback (edit before sending)</Label>
              </div>

              {/* Synthesis textarea — fills remaining space */}
              <div className="px-4 pb-2 flex-1 min-h-0">
                <Textarea
                  placeholder="Consolidate the above feedback into final instructions for the Artist..."
                  className="w-full h-full text-sm resize-none"
                  value={synthText}
                  onChange={e => setSynthText(e.target.value)}
                />
              </div>

              {/* Footer — fixed */}
              <div className="px-4 pb-4 shrink-0 flex items-center justify-between border-t border-teal-500/20 pt-2">
                <p className="text-xs text-muted-foreground">After sending, the Artist will receive this feedback</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" onClick={saveDraft}>Save Draft</Button>
                  <Link href="/upload-analyze">
                    <Button size="sm" className="h-7 text-xs gap-1">
                      <Send className="w-3 h-3" />Send to Artist<ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Col 3: AI Chatbot ── */}
            <div className="col-span-4 flex flex-col min-h-0">
              <Collapsible open={chatbotOpen} onOpenChange={setChatbotOpen} className="flex flex-col flex-1 min-h-0">
                <CollapsibleTrigger asChild>
                  <div className="px-4 py-2.5 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-teal-600" />
                      <div>
                        <p className="text-xs font-semibold">AI Decision Assistant</p>
                        <p className="text-[10px] text-muted-foreground">{visionCount > 0 ? `Vision: ${visionCount} image(s) loaded` : "AI Clarification Chatbot"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {visionCount > 0 && <Badge className="text-[10px] h-4 px-1.5 bg-teal-500/10 text-teal-600 border border-teal-500/30 hover:bg-teal-500/10"><ImageIcon className="w-2.5 h-2.5 mr-0.5" />Vision</Badge>}
                      {chatbotOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="flex-1 min-h-0 flex flex-col">
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 space-y-3">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarFallback className={`text-[10px] ${msg.role === "ai" ? "bg-teal-500/10 text-teal-600" : "bg-primary/10"}`}>
                              {msg.role === "ai" ? <Bot className="w-3 h-3" /> : "D"}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg px-3 py-2 max-w-[86%] text-xs leading-relaxed ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                            <p className="whitespace-pre-line">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex gap-2">
                          <Avatar className="w-6 h-6 shrink-0"><AvatarFallback className="bg-teal-500/10 text-teal-600"><Bot className="w-3 h-3" /></AvatarFallback></Avatar>
                          <div className="rounded-lg px-3 py-2 bg-muted flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
                            <span className="text-xs text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatScrollRef} />
                    </div>
                  </ScrollArea>
                  <div className="px-3 py-2 border-t border-border flex flex-wrap gap-1 shrink-0">
                    {[
                      { label: "Summarize QA", prompt: "Based on the current QA feedback list, consolidate the 3 most important revision directions with specific numeric suggestions." },
                      { label: "Clarify Conflicts", prompt: "What are the key conflicts between the three parties? How can we reach consensus while respecting the Spec?" },
                      { label: "Draft Feedback", prompt: "Based on the QA analysis and three-party opinions, draft a final revision instruction list for the Artist with specific numeric values." },
                      { label: "Analyze Images", prompt: "Directly describe the visual gap between the current artwork and the Reference images, covering lighting, color temperature, and composition." },
                    ].map(q => (
                      <Button key={q.label} variant="outline" size="sm" className="text-[10px] h-6 px-2 bg-transparent"
                        onClick={() => { setChatMessages(p => [...p, { role: "user", content: q.label }]); callAgent(q.prompt) }}>
                        {q.label}
                      </Button>
                    ))}
                  </div>
                  <div className="px-3 pb-3 flex gap-2 shrink-0">
                    <Input placeholder="Type your question..." className="text-xs h-8" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleChatSend() }} />
                    <Button size="icon" className="w-8 h-8 shrink-0" onClick={handleChatSend} disabled={chatLoading}><Send className="w-3.5 h-3.5" /></Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}