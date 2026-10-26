import { cn } from "cn"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return initials.toUpperCase()
}

export function UserAvatar({
  name,
  avatarUrl,
  muted = false,
}: {
  name: string
  avatarUrl?: string | null
  muted?: boolean
}) {
  return (
    <Avatar>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback
        className={cn(
          "text-xs font-semibold",
          muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
        )}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}
