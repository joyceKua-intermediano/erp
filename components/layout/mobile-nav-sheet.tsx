"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { isActivePath, type NavItem } from "@/lib/navigation"
import { useUiStore } from "@/store/use-ui-store"

type MobileNavSheetProps = {
  sheetId: string
  title: string
  description: string
  items: readonly NavItem[]
  className?: string
}

export function MobileNavSheet({ sheetId, title, description, items, className }: MobileNavSheetProps) {
  const pathname = usePathname()
  const isOpen = useUiStore((state) => state.activeSheet?.id === sheetId)
  const openSheet = useUiStore((state) => state.openSheet)
  const closeSheet = useUiStore((state) => state.closeSheet)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={className}
        aria-label={`Open ${title}`}
        onClick={() => openSheet(sheetId)}
      >
        <MenuIcon />
      </Button>
      <Sheet open={isOpen} onOpenChange={(open) => (open ? openSheet(sheetId) : closeSheet())}>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3">
            {items.map((item) => {
              const active = isActivePath(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSheet}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-muted text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
