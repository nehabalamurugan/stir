import React from "react"
import { cn } from "@/lib/utils"

interface MemberAvatarProps {
  member: { name: string; avatarColor: string } | null
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
  style?: React.CSSProperties
}

const sizeClasses = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
}

export function MemberAvatar({ member, size = "md", className, style }: MemberAvatarProps) {
  if (!member) {
    return (
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground",
          sizeClasses[size],
          className
        )}
        style={style}
      >
        ?
      </div>
    )
  }
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: member.avatarColor, ...style }}
    >
      {member.name.charAt(0).toUpperCase()}
    </div>
  )
}
