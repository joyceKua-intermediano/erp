import { CheckIcon, ClockIcon } from "lucide-react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { contractKindLabels, type ContractKind } from "@/lib/contracts"

export function ContractKindBadge({ kind }: { kind: ContractKind | null }) {
  return (
    <Badge variant="outline" className={cn(kind === "employee" ? "border-primary/30 text-primary" : "text-muted-foreground")}>
      {kind ? contractKindLabels[kind] : "Unspecified"}
    </Badge>
  )
}

function SignatureBadge({ label, signed }: { label: string; signed: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        signed ? "border-transparent bg-primary/10 text-primary" : "border-dashed text-muted-foreground"
      )}
    >
      {signed ? <CheckIcon className="size-3" /> : <ClockIcon className="size-3" />}
      {label}
      <span className="sr-only">{signed ? "signed" : "pending"}</span>
    </Badge>
  )
}

export function SignatureBadges({
  kind,
  employeeSigned,
  adminSigned,
}: {
  kind: ContractKind | null
  employeeSigned: boolean
  adminSigned: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <SignatureBadge label={kind === "customer" ? "Customer" : "Employee"} signed={employeeSigned} />
      <SignatureBadge label="Admin" signed={adminSigned} />
    </div>
  )
}
