"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  FileText,
  FolderOpen,
  Brain,
  GitCompare,
  CheckCircle,
  Lightbulb,
} from "lucide-react"

export function PipelineSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border min-h-[calc(100vh-4rem)] bg-card shrink-0">
      <div className="p-4 space-y-6">
        {/* Dashboard */}
        <div>
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
              pathname === "/dashboard"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent"
            )}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-sm font-medium">Dashboard</span>
          </Link>
        </div>

        {/* DC1: Input */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2 px-3">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-teal-500/10 text-teal-600 border-teal-500/30"
            >
              DC1
            </Badge>
            <span>INPUT</span>
          </div>
          <p className="text-[10px] text-muted-foreground px-3 mb-2">
            {"Brief/Spec + Ref Hub"}
          </p>
          <nav className="space-y-1">
            <Link
              href="/kickoff"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === "/kickoff"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>C01 Brief/Spec</span>
            </Link>
            <Link
              href="/reference-hub"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === "/reference-hub"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              )}
            >
              <FolderOpen className="w-4 h-4" />
              <span>C02 Ref Hub</span>
            </Link>
          </nav>
        </div>

        {/* DC2: Artist */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2 px-3">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30"
            >
              DC2
            </Badge>
            <span>Artist</span>
          </div>
          <p className="text-[10px] text-muted-foreground px-3 mb-2">
            {"Ref Compare + Quality Metrics"}
          </p>
          <nav className="space-y-1">
            <Link
              href="/artist-reflection"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === "/artist-reflection"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              )}
            >
              <Lightbulb className="w-4 h-4" />
              <span>C03 Artist Reflection</span>
            </Link>
            <Link
              href="/upload-analyze"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === "/upload-analyze"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              )}
            >
              <Brain className="w-4 h-4" />
              <span>C04 AI Analyze</span>
            </Link>
            <Link
              href="/compare"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === "/compare"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              )}
            >
              <GitCompare className="w-4 h-4" />
              <span>C05 Ref Compare</span>
            </Link>
          </nav>
        </div>

        {/* DC3: Output */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2 px-3">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/30"
            >
              DC3
            </Badge>
            <span>Supervisor</span>
          </div>
          <p className="text-[10px] text-muted-foreground px-3 mb-2">
            {"Review + Decision"}
          </p>
          <nav className="space-y-1">
            <Link
              href="/qa"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === "/qa"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              )}
            >
              <CheckCircle className="w-4 h-4" />
              <span>C06 Supervisor Review</span>
            </Link>
            <Link
              href="/governance"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === "/governance"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              )}
            >
              <GitCompare className="w-4 h-4" />
              <span>C07 Decision Loop</span>
            </Link>
          </nav>
        </div>
      </div>
    </aside>
  )
}
