import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { redirect } from "next/navigation"
import {
  FileText,
  FolderOpen,
  Upload,
  GitCompare,
  ListChecks,
  Shield,
  Film,
  CheckCircle2,
  Database,
  Bell,
  Brain,
  Lock,
} from "lucide-react"

export default function HomePage() {
  redirect("/dashboard")

  const modules = [
    {
      id: "c01",
      title: "專案啟動與 Brief 對焦",
      titleEn: "Project Kickoff & Brief",
      description: "源頭資訊匯入、規格確認、參考點對焦",
      icon: FileText,
      color: "text-blue-400",
      href: "/kickoff",
    },
    {
      id: "c02",
      title: "參考資料庫",
      titleEn: "Reference Hub",
      description: "搜集、整理、管理 Ref 可用性",
      icon: FolderOpen,
      color: "text-purple-400",
      href: "/reference-hub",
    },
    {
      id: "c03",
      title: "上傳與 AI 分析",
      titleEn: "Upload & AI Analysis",
      description: "指出哪裡要改、怎麼改",
      icon: Upload,
      color: "text-emerald-400",
      href: "/upload-analyze",
    },
    {
      id: "c04",
      title: "Ref 對照/差距比對",
      titleEn: "Compare & Gap Analysis",
      description: "Before/After、Ref-Work 並排",
      icon: GitCompare,
      color: "text-cyan-400",
      href: "/compare",
    },
    {
      id: "c05",
      title: "回饋結構化",
      titleEn: "Structured Feedback",
      description: "清單化、圈選標註、語氣轉換",
      icon: ListChecks,
      color: "text-amber-400",
      href: "/feedback",
    },
    {
      id: "c06",
      title: "權威衝突與信任治理",
      titleEn: "Governance & Authority",
      description: "多頭馬車、誰說了算",
      icon: Shield,
      color: "text-red-400",
      href: "/governance",
    },
    {
      id: "c07",
      title: "節奏/鏡頭/動態檢查",
      titleEn: "Motion & Rhythm Review",
      description: "Timing、Focal length、Rhythm",
      icon: Film,
      color: "text-pink-400",
      href: "/motion-review",
    },
    {
      id: "c08",
      title: "技術與品質稽核",
      titleEn: "Technical QA",
      description: "曝光、漏光、噪點、穿模、規格",
      icon: CheckCircle2,
      color: "text-green-400",
      href: "/qa",
    },
    {
      id: "c09",
      title: "資產/檔案路徑與 ShotGrid",
      titleEn: "Asset Navigator",
      description: "串檔、可追溯",
      icon: Database,
      color: "text-indigo-400",
      href: "/assets",
    },
    {
      id: "c10",
      title: "通知與節點管控",
      titleEn: "Notifications & Gates",
      description: "強制提醒、避免一開始做錯",
      icon: Bell,
      color: "text-orange-400",
      href: "/notifications",
    },
    {
      id: "c11",
      title: "客戶/導演偏好記憶",
      titleEn: "Preference Memory",
      description: "Memory、LoRA/Finetune",
      icon: Brain,
      color: "text-violet-400",
      href: "/preferences",
    },
    {
      id: "c12",
      title: "資料策略與隱私",
      titleEn: "Data & Privacy",
      description: "用哪種資料訓練、外洩風險",
      icon: Lock,
      color: "text-slate-400",
      href: "/privacy",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-4">
              v0.1 Alpha
            </Badge>
            <h1 className="text-5xl font-bold text-balance mb-6">
              VFX Production Feedback & Reference Management System
            </h1>
            <p className="text-xl text-muted-foreground text-pretty mb-8">
              專為 VFX/動畫製作團隊設計的智能反饋與參考管理系統。整合 AI 分析、ShotGrid 串接，提升製作效率與溝通品質。
            </p>
            <div className="flex gap-3">
              <Button size="lg" asChild>
                <Link href="/kickoff">開始新專案</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/reference-hub">瀏覽參考庫</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Modules Grid */}
      <div className="container mx-auto px-6 py-16">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-3">核心模組 Core Modules</h2>
          <p className="text-muted-foreground">12 個專為 VFX 製作流程設計的功能模組，從專案啟動到交付管理</p>
        </div>

        {/* Main Workflow */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-primary rounded-full" />
            <h3 className="text-xl font-semibold">主流程 Main Workflow</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.slice(0, 5).map((module) => {
              const Icon = module.icon
              return (
                <Link key={module.id} href={module.href}>
                  <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg bg-background ${module.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {module.id.toUpperCase()}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {module.title}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground font-mono">{module.titleEn}</div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{module.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Governance & Settings */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-muted rounded-full" />
            <h3 className="text-xl font-semibold">治理與設定 Governance & Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.slice(5).map((module) => {
              const Icon = module.icon
              return (
                <Link key={module.id} href={module.href}>
                  <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg bg-background ${module.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {module.id.toUpperCase()}
                        </Badge>
                      </div>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {module.title}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground font-mono">{module.titleEn}</div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">{module.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="border-t border-border bg-card">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold mb-1">30%</div>
              <div className="text-sm text-muted-foreground">減少統整時間</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">50%</div>
              <div className="text-sm text-muted-foreground">降低溝通成本</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">AI</div>
              <div className="text-sm text-muted-foreground">智能分析引擎</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">ShotGrid</div>
              <div className="text-sm text-muted-foreground">原生整合</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
