import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm shadow-sm [--card-spacing:--spacing(7)]">
        <CardHeader className="justify-items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
            I
          </span>
          <div className="grid gap-1">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && <CardFooter className="justify-center text-xs text-muted-foreground">{footer}</CardFooter>}
      </Card>
    </main>
  )
}
