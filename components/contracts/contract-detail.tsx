"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  FileDownIcon,
  PencilIcon,
  RefreshCwIcon,
} from "lucide-react"
import { ChooseClusterCard } from "@/components/employees/employee-workspace"
import { ContractStatusBadge, formatContractDate } from "@/components/employees/contract-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useContract } from "@/hooks/use-contracts"
import { salaryModeLabels, stripHtml, type ContractDetail } from "@/lib/contracts"
import { ArchiveContractDialog } from "./archive-contract-dialog"
import { ContractKindBadge, SignatureBadges } from "./contract-badges"
import { ContractFormSheet } from "./contract-form-sheet"

const dateTimeFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })
const salaryFormatter = new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const contractsBackLink = (
  <Link
    href="/admin/contracts"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All contracts
  </Link>
)

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-6 py-3.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function formatSalary(value: string | null) {
  if (!value) return "—"
  const amount = Number(value)
  return Number.isFinite(amount) ? salaryFormatter.format(amount) : value
}

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : null
}

function ContractNotFound({ clusterLabel }: { clusterLabel: string }) {
  return (
    <div className="flex flex-col gap-4">
      {contractsBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Contract not found in {clusterLabel}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            It may have been archived, belong to another cluster, or the link is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ContractLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {contractsBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This contract couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

type ContractDetailViewProps = {
  contractId: string
  canManage: boolean
}

export function ContractDetailView({ contractId, canManage }: ContractDetailViewProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) {
    return <ChooseClusterCard description="Contracts are scoped to one Intermediano legal entity at a time." />
  }

  return (
    <ClusterContractDetail
      key={activeCluster.id}
      contractId={contractId}
      clusterId={activeCluster.id}
      clusterLabel={activeCluster.label}
      canManage={canManage}
    />
  )
}

function ClusterContractDetail({
  contractId,
  clusterId,
  clusterLabel,
  canManage,
}: ContractDetailViewProps & { clusterId: string; clusterLabel: string }) {
  const { data: contract, isPending, isError, refetch } = useContract(contractId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <ContractLoadError onRetry={() => refetch()} />
  if (!contract) return <ContractNotFound clusterLabel={clusterLabel} />

  return <ContractDetailContent contract={contract} clusterId={clusterId} canManage={canManage} />
}

function PdfActions({ contract, clusterId }: { contract: ContractDetail; clusterId: string }) {
  if (!contract.hasTypstTemplate) {
    return (
      <Button variant="outline" disabled title="Choose a template with Typst source to generate the PDF.">
        <FileDownIcon />
        No PDF template
      </Button>
    )
  }

  const pdfUrl = `/api/contracts/${contract.id}/pdf?cluster=${encodeURIComponent(clusterId)}`
  return (
    <>
      <a href={pdfUrl} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline" })}>
        <ExternalLinkIcon />
        Open PDF
      </a>
      <a href={`${pdfUrl}&download=1`} className={buttonVariants({ variant: "outline" })}>
        <FileDownIcon />
        Download
      </a>
    </>
  )
}

function TextBlock({ value }: { value: string | null }) {
  const text = stripHtml(value)
  if (!text) return <p className="text-sm text-muted-foreground">Not provided.</p>
  return <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>
}

function ContractDetailContent({
  contract,
  clusterId,
  canManage,
}: {
  contract: ContractDetail
  clusterId: string
  canManage: boolean
}) {
  const router = useRouter()
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [isArchiveOpen, setArchiveOpen] = useState(false)
  const canEdit = canManage && contract.kind === "employee"
  const employeeSignedAt = formatDateTime(contract.employeeSignedAt)
  const adminSignedAt = formatDateTime(contract.adminSignedAt)
  const signerLabel = contract.kind === "customer" ? "Customer" : "Employee"

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {contractsBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              {contract.jobTitle ?? "Untitled position"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link href={`/admin/employees/${contract.employeeId}`} className="font-medium text-foreground hover:text-primary">
                {contract.employeeName}
              </Link>
              {contract.counterparty && <span>for {contract.counterparty}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ContractKindBadge kind={contract.kind} />
              <Badge variant="outline" className="border-primary/30 text-primary">
                {contract.clusterLabel}
              </Badge>
              <ContractStatusBadge status={contract.status} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PdfActions contract={contract} clusterId={clusterId} />
            {canEdit && (
              <Button variant="outline" onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                <PencilIcon />
                Edit
              </Button>
            )}
            {canManage && (
              <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                <ArchiveIcon />
                Archive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {canManage && contract.kind !== "employee" && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          {contract.kind
            ? "Customer and partner contracts become editable here once the Quotations and Partners modules exist."
            : `This contract's type ("${contract.rawContractType ?? "empty"}") isn't one of employee, customer or partner, so it can't be edited here.`}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="gap-0 py-0">
          <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
            <CardTitle>Contract terms</CardTitle>
            <CardDescription>The values used to fill the contract template.</CardDescription>
          </CardHeader>
          <dl className="divide-y">
            <DetailRow label="Employee">{contract.employeeName}</DetailRow>
            {contract.companyName && <DetailRow label="Client company">{contract.companyName}</DetailRow>}
            {contract.partnerName && <DetailRow label="Partner">{contract.partnerName}</DetailRow>}
            {contract.quotationTitle && <DetailRow label="Quotation">{contract.quotationTitle}</DetailRow>}
            <DetailRow label="Translated position">{contract.translatedPosition ?? "—"}</DetailRow>
            <DetailRow label="Country of work">{contract.countryName ?? contract.countryWork ?? "—"}</DetailRow>
            <DetailRow label="Start date">{formatContractDate(contract.startDate)}</DetailRow>
            <DetailRow label="End date">{contract.endDate ? formatContractDate(contract.endDate) : "Open-ended"}</DetailRow>
            <DetailRow label="Gross salary">
              <span className="tabular-nums">{formatSalary(contract.grossSalary)}</span>
            </DetailRow>
            {contract.isIntegral && <DetailRow label="Salary mode">{salaryModeLabels.integral}</DetailRow>}
            <DetailRow label="PDF template">{contract.templateName ?? "—"}</DetailRow>
          </dl>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="gap-0 py-0">
            <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
              <CardTitle>Signatures</CardTitle>
              <CardDescription>
                {contract.isSentToEmployee ? "Sent for signature." : "Not sent for signature yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 py-5">
              <SignatureBadges
                kind={contract.kind}
                employeeSigned={contract.employeeSigned}
                adminSigned={contract.adminSigned}
              />
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{signerLabel}</dt>
                  <dd>{employeeSignedAt ?? "Pending"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Admin</dt>
                  <dd className="text-right">
                    {adminSignedAt ? (
                      <>
                        {adminSignedAt}
                        {contract.adminSignedBy && (
                          <span className="block text-xs text-muted-foreground">by {contract.adminSignedBy}</span>
                        )}
                      </>
                    ) : (
                      "Pending"
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {contract.supplementary && (
            <Card className="gap-0 py-0">
              <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
                <CardTitle>Supplementary details</CardTitle>
              </CardHeader>
              <dl className="flex flex-col gap-2 px-6 py-5 text-sm">
                {(
                  [
                    ["Working hours", contract.supplementary.standardWorkingHours],
                    ["Shift schedule", contract.supplementary.shiftSchedule],
                    ["Notice period", contract.supplementary.noticePeriod],
                    ["Payment terms", contract.supplementary.paymentTerms],
                    ["Billing currency", contract.supplementary.billingCurrency],
                    ["Payment currency", contract.supplementary.paymentCurrency],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right">{value ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Job description</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 py-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">Original</h3>
            <TextBlock value={contract.jobDescription} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">Translated</h3>
            <TextBlock value={contract.translatedJobDescription} />
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <>
          {canEdit && (
            <ContractFormSheet
              open={sheet.open}
              contract={contract}
              clusterLabel={contract.clusterLabel}
              formKey={sheet.key}
              onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
            />
          )}
          <ArchiveContractDialog
            open={isArchiveOpen}
            contract={contract}
            onOpenChange={setArchiveOpen}
            onArchived={() => router.push("/admin/contracts")}
          />
        </>
      )}
    </div>
  )
}
