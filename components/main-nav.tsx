"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const routes = [
  {
    href: "/dashboard",
    label: "Inbox",
  },
  {
    href: "/tasks",
    label: "My Tasks",
  },
  {
    href: "/projects",
    label: "Projects",
  },
  {
    href: "/media",
    label: "Media",
  },
]

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex items-center space-x-6", className)} {...props}>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary pb-0.5",
            pathname === route.href ? "text-foreground border-b-2 border-primary" : "text-muted-foreground",
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  )
}
