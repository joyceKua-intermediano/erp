import Image from "next/image"
import { cn } from "cn"

// Decorative by default: every placement sits next to visible "Intermediano" text or a titled card.
export function AppLogo({ className, alt = "" }: { className?: string; alt?: string }) {
  return (
    <Image
      src="/brand/intermediano-logo.png"
      alt={alt}
      width={592}
      height={476}
      className={cn("size-8 shrink-0 object-contain", className)}
    />
  )
}
