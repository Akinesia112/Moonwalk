"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProjectSwitcher } from "@/components/project-switcher"
import { UserNav } from "@/components/user-nav"
import { ListVideo, Clock, Settings, MessageSquare, Upload, GitCompare, PenTool, Sparkles } from "lucide-react"
import Link from "next/link"
import { PipelineSidebar } from "@/components/pipeline-sidebar"
import { Bell } from "lucide-react"

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
            <span className="font-semibold text-lg">MoonWalk</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
            <UserNav />
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Shared Sidebar */}
        <PipelineSidebar />

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
                  <div className="h-full w-3/4 bg-teal-500 rounded-full" />
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
                  <Link href="/qa">
                    <PenTool className="w-4 h-4 mr-2" />
                    Supervisor Review
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
    </div>
  )
}
