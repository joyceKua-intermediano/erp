import { LockIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function AccessDenied({ message }: { message: string }) {
  return (
    <Card className="animate-in fade-in-0 duration-300 [--card-spacing:--spacing(10)]">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <LockIcon className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold">You don&apos;t have access</h2>
          <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}
