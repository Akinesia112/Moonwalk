"use client"

import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"
import { Bell } from "lucide-react"

export function TopBar() {
  return (
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
  )
}
