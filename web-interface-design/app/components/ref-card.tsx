"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Save, ImageIcon, FileText, Link2, MessageSquare } from "lucide-react"

export const CATEGORY_OPTIONS = [
  "Lighting", "Color", "Composition", "Style",
  "Texture", "Motion", "Mood", "VFX", "Character", "Environment",
]

export const IMPORTANCE_OPTIONS = ["Main", "Secondary"]

export const USAGE_OPTIONS = [
  "Internal", "External", "Concept", "Final", "Draft",
]

export const IMPORTANCE_COLOR: Record<string, string> = {
  Main:        "bg-amber-500 text-white border-amber-600",
  Secondary:   "bg-sky-500 text-white border-sky-600",
  Style:       "bg-violet-500 text-white border-violet-600",
  Composition: "bg-teal-500 text-white border-teal-600",
  Color:       "bg-pink-500 text-white border-pink-600",
  Lighting:    "bg-orange-500 text-white border-orange-600",
}

export const CATEGORY_COLOR: Record<string, string> = {
  Lighting:    "bg-amber-400/90 text-amber-900",
  Color:       "bg-pink-400/90 text-pink-900",
  Composition: "bg-teal-400/90 text-teal-900",
  Style:       "bg-violet-400/90 text-violet-900",
  Texture:     "bg-stone-400/90 text-stone-900",
  Motion:      "bg-blue-400/90 text-blue-900",
  Mood:        "bg-indigo-400/90 text-indigo-900",
  VFX:         "bg-cyan-400/90 text-cyan-900",
  Character:   "bg-rose-400/90 text-rose-900",
  Environment: "bg-green-400/90 text-green-900",
}

export interface RefCardData {
  id: string
  title: string
  preview?: string | null
  category?: string
  importance?: string
  usage?: string
  note?: string
  artworkId?: string
}

interface RefCardProps {
  data: RefCardData
  onChange: (updated: RefCardData) => void
  onDelete?: () => void
  onSave?: (data: RefCardData) => void
  /** Called when user double-clicks thumbnail — inject to chat */
  onDiscuss?: (data: RefCardData) => void
  showSave?: boolean
  className?: string
  artworkOptions?: { id: string; name: string }[]
}

export function RefCard({
  data,
  onChange,
  onDelete,
  onSave,
  onDiscuss,
  showSave = true,
  className = "",
  artworkOptions,
}: RefCardProps) {
  const [saved, setSaved] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  const update = (patch: Partial<RefCardData>) => {
    setSaved(false)
    onChange({ ...data, ...patch })
  }

  const handleSave = () => {
    setSaved(true)
    onSave?.(data)
  }

  const categoryColor = CATEGORY_COLOR[data.category ?? ""] ?? "bg-white/80 text-gray-800"
  const importanceCls = IMPORTANCE_COLOR[data.importance ?? ""] ?? "bg-white/80 text-gray-700 border-gray-300"
  const hasNote = !!data.note?.trim()
  const boundArtwork = artworkOptions?.find(a => a.id === data.artworkId)

  return (
    <>
      <div className={`rounded-xl border bg-card overflow-hidden flex flex-col shadow-sm ${className}`}>

        {/* ── Thumbnail
            Double-click = import to chat
            📝 button = view notes
        ── */}
        <div
          className="relative w-full select-none"
          style={{ aspectRatio: "4/3", cursor: onDiscuss ? "pointer" : "default" }}
          onDoubleClick={() => onDiscuss?.(data)}
          title={onDiscuss ? "Double-click to import to chat" : undefined}
        >
          {data.preview ? (
            <img src={data.preview} alt={data.title} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground opacity-40" />
            </div>
          )}

          {/* Category badge — top left */}
          {data.category && (
            <span className={`absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm ${categoryColor}`}>
              {data.category}
            </span>
          )}

          {/* Importance badge — top right (leave room for delete) */}
          {data.importance && (
            <span className={`absolute top-2 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm border ${importanceCls} ${onDelete ? "right-9" : "right-2"}`}>
              {data.importance}
            </span>
          )}

          {/* Note button — bottom left (only when note exists) */}
          {hasNote && (
            <button
              onClick={e => { e.stopPropagation(); setNoteOpen(true) }}
              className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow transition-colors"
              title="View notes"
            >
              <FileText className="w-2.5 h-2.5" />Notes
            </button>
          )}

          {/* Artwork binding indicator — bottom right */}
          {boundArtwork && (
            <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow max-w-[45%] truncate">
              <Link2 className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{boundArtwork.name}</span>
            </span>
          )}

          {/* Discuss hint — center, shows on hover */}
          {onDiscuss && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
              <span className="bg-black/70 text-white text-[11px] px-2 py-1 rounded-full flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />Double-click to discuss
              </span>
            </div>
          )}

          {/* Delete — top right corner */}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors shadow"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* ── Metadata ── */}
        <div className="flex flex-col gap-2 p-3">
          <p className="text-sm font-medium leading-tight truncate" title={data.title}>
            {data.title || "Untitled"}
          </p>

          <div className="flex gap-2">
            <Select value={data.category ?? ""} onValueChange={v => update({ category: v })}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={data.importance ?? ""} onValueChange={v => update({ importance: v })}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {IMPORTANCE_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Select value={data.usage ?? ""} onValueChange={v => update({ usage: v })}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="Usage" />
            </SelectTrigger>
            <SelectContent>
              {USAGE_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
            </SelectContent>
          </Select>

          {artworkOptions && artworkOptions.length > 0 && (
            <Select value={data.artworkId ?? "__none__"} onValueChange={v => update({ artworkId: v === "__none__" ? undefined : v })}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Bind to artwork (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs text-muted-foreground">— None</SelectItem>
                {artworkOptions.map(a => (
                  <SelectItem key={a.id} value={a.id} className="text-xs truncate">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Textarea
            value={data.note ?? ""}
            onChange={e => update({ note: e.target.value })}
            placeholder="What to reference? e.g. Key light from right, hard light quality, sharp shadow edges..."
            rows={3}
            className="text-xs resize-none"
          />

          {showSave && (
            <div className="flex justify-end">
              <Button
                variant="outline" size="sm"
                className={`h-7 text-xs gap-1.5 ${saved ? "text-green-600 border-green-500" : ""}`}
                onClick={handleSave}
              >
                <Save className="w-3 h-3" />
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              {data.title || "Notes"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {data.preview && (
              <div className="rounded-lg overflow-hidden border" style={{ aspectRatio: "4/3" }}>
                <img src={data.preview} alt={data.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {data.category && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLOR[data.category] ?? "bg-muted text-foreground"}`}>
                  {data.category}
                </span>
              )}
              {data.importance && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${IMPORTANCE_COLOR[data.importance] ?? "bg-muted text-foreground border-border"}`}>
                  {data.importance}
                </span>
              )}
              {data.usage && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {data.usage}
                </span>
              )}
              {boundArtwork && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                  <Link2 className="w-2.5 h-2.5" />{boundArtwork.name}
                </span>
              )}
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm leading-relaxed whitespace-pre-wrap min-h-[60px]">
              {data.note || "(No notes)"}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}