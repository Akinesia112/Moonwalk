"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
export function UserNav() {
  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src="" alt="User" />
      <AvatarFallback>U</AvatarFallback>
    </Avatar>
  )
}
