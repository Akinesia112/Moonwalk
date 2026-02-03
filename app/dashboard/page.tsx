"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MainNav } from "@/components/main-nav"
import { ProjectSwitcher } from "@/components/project-switcher"
import { UserNav } from "@/components/user-nav"
import { Badge } from "@/components/ui/badge"
import { ListVideo, Clock, Settings, MessageSquare, Upload, FileSearch, PenTool, Sparkles, FileText, FolderOpen, Brain, GitCompare, CheckCircle, Users, Shield, Bell, Sliders, Database } from "lucide-react"
import Link from "next/link"
import AIChatPanel from "@/components/ai-chat-panel" // Declare the AIChatPanel import

export default function DashboardPage() {
  const activities = [
    {
      user: "Sarah L.",
      action: "uploaded a new version for",
      target: "Shot_005_v04",
      time: "4 hours ago",
      avatar: "/placeholder.svg?height=32&width=32",
    },
    {
      user: "AI System",
      action: "completed analysis for",
      target: "Asset_Dragon_Tex_v02",
      time: "4 hours ago",
      avatar: null,
      isSystem: true,
    },
    {
      user: "Mike T.",
      action: "submitted feedback on",
      target: "Sequence_A_Anim_v03",
      time: "4 hours ago",
      avatar: "/placeholder.svg?height=32&width=32",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="border-b border-border">
        <div className="flex h-16 items-center px-6 gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">VFX</span>
            </div>
            <span className="font-semibold text-lg">VFX AI Feedback</span>
          </div>
          <MainNav />
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
            </Button>
            <UserNav />
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border min-h-[calc(100vh-4rem)] bg-card">
          <div className="p-4 space-y-6">
            {/* Dashboard */}
            <div>
              <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-sm font-medium">Dashboard</span>
              </Link>
            </div>

            {/* DC1: Input */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2 px-3">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-teal-500/10 text-teal-600 border-teal-500/30">DC1</Badge>
                <span>INPUT</span>
              </div>
              <p className="text-[10px] text-muted-foreground px-3 mb-2">Brief/Spec + Ref Hub</p>
              <nav className="space-y-1">
                <Link href="/kickoff" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <FileText className="w-4 h-4" />
                  <span>C01 Brief/Spec</span>
                </Link>
                <Link href="/reference-hub" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <FolderOpen className="w-4 h-4" />
                  <span>C02 Ref Hub</span>
                </Link>
              </nav>
            </div>

            {/* DC2: MLLM-as-Judge */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2 px-3">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">DC2</Badge>
                <span>MLLM-AS-JUDGE</span>
              </div>
              <p className="text-[10px] text-muted-foreground px-3 mb-2">Ref Compare + Quality Metrics</p>
              <nav className="space-y-1">
                <Link href="/upload-analyze" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <Brain className="w-4 h-4" />
                  <span>C03 AI Analyze</span>
                </Link>
                <Link href="/compare" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <GitCompare className="w-4 h-4" />
                  <span>C04 Ref Compare</span>
                </Link>
                <Link href="/qa" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <CheckCircle className="w-4 h-4" />
                  <span>C07 Quality Metrics</span>
                </Link>
              </nav>
            </div>

            {/* DC3: Output */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2 px-3">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/30">DC3</Badge>
                <span>OUTPUT</span>
              </div>
              <p className="text-[10px] text-muted-foreground px-3 mb-2">Feedback + Decision</p>
              <nav className="space-y-1">
                <Link href="/feedback" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <PenTool className="w-4 h-4" />
                  <span>C05 Feedback</span>
                </Link>
                <Link href="/governance" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <Users className="w-4 h-4" />
                  <span>C06 Decision Loop</span>
                </Link>
              </nav>
            </div>

            {/* System/Backstage (L3) */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2 px-3">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">L3</Badge>
                <span>BACKSTAGE</span>
              </div>
              <nav className="space-y-1">
                <Link href="/notifications" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </Link>
                <Link href="/preferences" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <Sliders className="w-4 h-4" />
                  <span>Preferences</span>
                </Link>
                <Link href="/data-privacy" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors">
                  <Database className="w-4 h-4" />
                  <span>Data & Privacy</span>
                </Link>
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
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
                <h1 className="text-2xl font-bold">Welcome back, Alex.</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Current Project:</span>
                  <ProjectSwitcher />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Shots</CardTitle>
                <ListVideo className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-teal-600">142</div>
                <p className="text-xs text-muted-foreground mt-1">Shots in Progress</p>
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-teal-500 rounded-full"></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">38</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting Feedback</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">AI Analysis Queue</CardTitle>
                <Settings className="w-4 h-4 text-muted-foreground animate-spin" style={{ animationDuration: '3s' }} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-600">15</div>
                <p className="text-xs text-muted-foreground mt-1">Assets Processing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Recent Feedback</CardTitle>
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">24</div>
                <p className="text-xs text-muted-foreground mt-1">New Comments Today</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        {activity.isSystem ? (
                          <AvatarFallback className="bg-teal-500/10 text-teal-600">
                            <Sparkles className="w-4 h-4" />
                          </AvatarFallback>
                        ) : (
                          <>
                            <AvatarImage src={activity.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{activity.user.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user}</span>{" "}
                          <span className="text-muted-foreground">{activity.action}</span>{" "}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" asChild>
                  <Link href="/upload-analyze">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Analyze
                  </Link>
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                  <Link href="/compare">
                    <GitCompare className="w-4 h-4 mr-2" />
                    Compare Versions
                  </Link>
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                  <Link href="/feedback">
                    <PenTool className="w-4 h-4 mr-2" />
                    Create Feedback
                  </Link>
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                  <Link href="/qa">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Quality Check
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel 
        context="Dashboard" 
        stakeholders={["Director", "PM", "Artist"]}
      />
    </div>
  )
}
