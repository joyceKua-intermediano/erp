"use client"

import { DownloadIcon, ExternalLinkIcon, FileSignatureIcon, RefreshCwIcon } from "lucide-react"
import { SignatureBadges } from "@/components/contracts/contract-badges"
import { ContractStatusBadge, formatContractDate } from "@/components/employees/contract-status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { myContractPdfUrl, useMyContracts } from "@/hooks/use-employee-profile"
import type { MyContract } from "@/lib/employee-profile"

function ContractCard({ contract }: { contract: MyContract }) {

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-col gap-3 border-b py-5 sm:flex-row sm:items-start sm:justify-between [--card-spacing:--spacing(6)]">
        <div className="flex flex-col gap-1">
          <CardTitle>{contract.jobTitle ?? "Untitled position"}</CardTitle>
          <CardDescription>
            {[contract.clientName, contract.clusterName].filter(Boolean).join(" · ") || "Intermediano"}
          </CardDescription>
        </div>
        <ContractStatusBadge status={contract.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-end sm:justify-between [--card-spacing:--spacing(6)]">
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          <div className="flex flex-col">
            <dt className="text-muted-foreground">Start</dt>
            <dd>{formatContractDate(contract.startDate)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted-foreground">End</dt>
            <dd>{contract.endDate ? formatContractDate(contract.endDate) : "Open-ended"}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted-foreground">Country of work</dt>
            <dd>{contract.countryOfWork ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-3">
            <dt className="text-muted-foreground">Signatures</dt>
            <dd>
              <SignatureBadges kind={contract.kind} employeeSigned={contract.employeeSigned} adminSigned={contract.adminSigned} />
            </dd>
          </div>
        </dl>
        {contract.hasTemplate ? (
          <div className="flex gap-2">
            <a
              href={myContractPdfUrl(contract.id)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLinkIcon />
              View
            </a>
            <a href={myContractPdfUrl(contract.id, true)} className={buttonVariants({ size: "sm" })}>
              <DownloadIcon />
              Download
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">The PDF isn&apos;t ready yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function MyContractList() {
  const { data, isPending, isError, refetch } = useMyContracts()

  if (isPending) return <Skeleton className="h-64 rounded-xl" />
  if (isError) {
    return (
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Your contracts couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }
  if (data.length === 0) {
    return (
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <FileSignatureIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Your contract appears here once Intermediano sends it to you.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex animate-in flex-col gap-4 duration-300 fade-in-0 slide-in-from-bottom-2">
      {data.map((contract) => (
        <ContractCard key={contract.id} contract={contract} />
      ))}
    </div>
  )
}
