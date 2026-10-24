import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { contractStatusLabels, type ContractStatus } from "@/lib/employees"

const statusBadgeClasses: Record<ContractStatus, string> = {
  active: "border-transparent bg-primary text-primary-foreground",
  pending_signature: "border-primary/40 bg-primary/5 text-primary",
  upcoming: "border-transparent bg-secondary text-secondary-foreground",
  ended: "border-border text-muted-foreground",
  none: "border-dashed border-border text-muted-foreground",
}

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })

export function formatContractDate(value: string | null) {
  return value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : "—"
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <Badge variant="outline" className={cn(statusBadgeClasses[status])}>
      {contractStatusLabels[status]}
    </Badge>
  )
}
