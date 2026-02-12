"use client"

import type React from "react"
import { cn } from "@/lib/utils"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav className={cn("flex items-center space-x-6", className)} {...props}>
      {/* Navigation links removed - using sidebar instead */}
    </nav>
  )
}
