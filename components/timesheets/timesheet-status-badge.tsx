import { Badge } from "@/components/ui/badge"
import { timesheetStatusLabels, type TimesheetStatus } from "@/lib/timesheets"

const statusClassNames: Record<TimesheetStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
}

export function TimesheetStatusBadge({ status }: { status: TimesheetStatus }) {
  return <Badge className={statusClassNames[status]}>{timesheetStatusLabels[status]}</Badge>
}
