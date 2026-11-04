"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  MailIcon,
  PencilIcon,
  RefreshCwIcon,
} from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useActiveCluster } from "@/hooks/use-clusters"
import { useEmployee, useEmployeeProfile } from "@/hooks/use-employees"
import {
  documentFileUrl,
  documentTypeLabel,
  educationAttainmentOptions,
  educationStatusOptions,
  socialSecurityFields,
  storedFileRef,
  taxIdLabel,
} from "@/lib/employee-profile"
import type { EmployeeDetail } from "@/lib/employees"
import { ArchiveEmployeeDialog } from "./archive-employee-dialog"
import { ContractStatusBadge, formatContractDate } from "./contract-status-badge"
import { EmployeeFormSheet } from "./employee-form-sheet"
import { ChooseClusterCard, ModuleDisabledCard } from "./employee-workspace"
import { ResetEmployeePasswordDialog } from "./reset-employee-password-dialog"
import type { RecordPermissions } from "@/lib/permissions"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })

const employeesBackLink = (
  <Link
    href="/admin/employees"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All employees
  </Link>
)

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-6 py-3.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function EmployeeNotFound({ clusterLabel }: { clusterLabel: string }) {
  return (
    <div className="flex flex-col gap-4">
      {employeesBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Employee not found in {clusterLabel}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            They may have been archived, belong to another cluster, or the link is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function EmployeeLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {employeesBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This employee couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

type EmployeeDetailViewProps = {
  employeeId: string
  can: RecordPermissions
}

export function EmployeeDetailView({ employeeId, can }: EmployeeDetailViewProps) {
  const activeCluster = useActiveCluster()

  if (!activeCluster) return <ChooseClusterCard />
  if (!activeCluster.modules.includes("employees")) {
    return <ModuleDisabledCard module="employees" clusterLabel={activeCluster.label} />
  }

  return (
    <ClusterEmployeeDetail
      key={activeCluster.id}
      employeeId={employeeId}
      clusterLabel={activeCluster.label}
      can={can}
    />
  )
}

function ClusterEmployeeDetail({
  employeeId,
  clusterLabel,
  can,
}: EmployeeDetailViewProps & { clusterLabel: string }) {
  const { data: employee, isPending, isError, refetch } = useEmployee(employeeId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <EmployeeLoadError onRetry={() => refetch()} />
  if (!employee) return <EmployeeNotFound clusterLabel={clusterLabel} />

  return <EmployeeDetailContent employee={employee} can={can} />
}

function EmployeeDetailContent({ employee, can }: { employee: EmployeeDetail; can: RecordPermissions }) {
  const router = useRouter()
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [isArchiveOpen, setArchiveOpen] = useState(false)
  const [isResetPasswordOpen, setResetPasswordOpen] = useState(false)

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {employeesBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar name={employee.name} />
            <div className="flex flex-col gap-1.5">
              <h2 className="font-heading text-xl font-semibold tracking-tight">{employee.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {employee.clusterLabel}
                </Badge>
                <a
                  href={`mailto:${employee.email}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
                >
                  <MailIcon className="size-3.5" />
                  {employee.email}
                </a>
              </div>
            </div>
          </div>
          {(can.edit || can.delete) && (
            <div className="flex gap-2">
              {can.edit && (
                <Button variant="outline" onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                  <PencilIcon />
                  Edit
                </Button>
              )}
              {can.edit && (
                <Button variant="outline" onClick={() => setResetPasswordOpen(true)}>
                  <KeyRoundIcon />
                  Reset password
                </Button>
              )}
              {can.delete && (
                <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                  <ArchiveIcon />
                  Archive
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Employee information</CardTitle>
          <CardDescription>Basic record used across contracts, timesheets and payroll.</CardDescription>
        </CardHeader>
        <dl className="divide-y">
          <DetailRow label="Full name">{employee.name}</DetailRow>
          <DetailRow label="Email">{employee.email}</DetailRow>
          <DetailRow label="Consultant">{employee.consultantName ?? "—"}</DetailRow>
          <DetailRow label="Cluster">{employee.clusterLabel}</DetailRow>
          <DetailRow label="Added">
            {employee.createdAt ? dateFormatter.format(new Date(employee.createdAt)) : "—"}
          </DetailRow>
        </dl>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Contracts</CardTitle>
          <CardDescription>Contracts with this employee under {employee.clusterLabel}.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">
                  Position
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                  Client
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  Start
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  End
                </TableHead>
                <TableHead className="pr-6 text-xs font-semibold tracking-wide text-primary uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employee.contracts.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No contracts yet.
                  </TableCell>
                </TableRow>
              ) : (
                employee.contracts.map((contract) => (
                  <TableRow key={contract.id} className="hover:bg-primary/5">
                    <TableCell className="pl-6 font-medium">
                      <Link href={`/admin/contracts/${contract.id}`} className="hover:text-primary">
                        {contract.jobTitle ?? "Untitled position"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {contract.clientCompany ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                      {formatContractDate(contract.startDate)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                      {formatContractDate(contract.endDate)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <ContractStatusBadge status={contract.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmployeeProfileSections employeeId={employee.id} clusterId={employee.clusterId} />

      {can.edit && (
        <EmployeeFormSheet
          open={sheet.open}
          employee={employee}
          clusterLabel={employee.clusterLabel}
          formKey={sheet.key}
          onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        />
      )}
      {can.edit && (
        <ResetEmployeePasswordDialog
          open={isResetPasswordOpen}
          employee={employee}
          onOpenChange={setResetPasswordOpen}
        />
      )}
      {can.delete && (
        <ArchiveEmployeeDialog
          open={isArchiveOpen}
          employee={employee}
          onOpenChange={setArchiveOpen}
          onArchived={() => router.push("/admin/employees")}
        />
      )}
    </div>
  )
}

function orDash(value: string) {
  return value.trim() || "—"
}

function formatIsoDate(value: string) {
  return value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : "—"
}

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? orDash(value)
}

function SectionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children}
    </Card>
  )
}

function FileLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      <ExternalLinkIcon className="size-3.5 shrink-0" />
      {children}
    </a>
  )
}

// Read-only: employees maintain these from their own portal.
function EmployeeProfileSections({ employeeId, clusterId }: { employeeId: string; clusterId: string }) {
  const { data, isPending, isError, refetch } = useEmployeeProfile(employeeId)

  if (isPending) return <Skeleton className="h-64 rounded-xl" />
  if (isError || !data) {
    return (
      <Card className="[--card-spacing:--spacing(8)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This employee&apos;s profile and documents couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const profile = data.profile.values
  const documents = data.documents.values
  const contact = profile.emergencyContact
  const socialRows = socialSecurityFields.filter(
    (field) => documents.social[field.key].trim() || documents.social[field.fileKey],
  )

  return (
    <>
      <SectionCard
        title="Personal information"
        description={data.profile.hasRecord ? "Filled in by the employee from their portal." : "The employee hasn't filled this in yet."}
      >
        <dl className="divide-y">
          <DetailRow label="Gender">{orDash(profile.gender)}</DetailRow>
          <DetailRow label="Civil status">{orDash(profile.civilStatus)}</DetailRow>
          <DetailRow label="Date of birth">{formatIsoDate(profile.dateOfBirth)}</DetailRow>
          <DetailRow label="Nationality">{orDash(profile.nationality)}</DetailRow>
          <DetailRow label="Address">
            {[profile.address, profile.city, profile.state, profile.country, profile.postalCode]
              .map((part) => part.trim())
              .filter(Boolean)
              .join(", ") || "—"}
          </DetailRow>
          <DetailRow label="Phone">{orDash(profile.phone)}</DetailRow>
          <DetailRow label="Mobile">{orDash(profile.mobile)}</DetailRow>
          <DetailRow label="Education">
            {[
              profile.educationAttainment && optionLabel(educationAttainmentOptions, profile.educationAttainment),
              profile.educationStatus && optionLabel(educationStatusOptions, profile.educationStatus),
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </DetailRow>
          <DetailRow label="Expat">{profile.expat === "yes" ? "Yes" : profile.expat === "no" ? "No" : "—"}</DetailRow>
          <DetailRow label="Passport number">{orDash(profile.passportNumber)}</DetailRow>
          <DetailRow label="Work visa">{orDash(profile.workVisa)}</DetailRow>
        </dl>
      </SectionCard>

      <SectionCard title="Dependents and emergency contact" description="Who depends on the employee, and who to call.">
        <dl className="divide-y">
          <DetailRow label="Dependents">
            {profile.dependents.length === 0 ? (
              orDash(profile.numberOfDependents)
            ) : (
              <ul className="flex flex-col gap-1">
                {profile.dependents.map((dependent, index) => (
                  <li key={index}>
                    <span className="font-medium">{dependent.fullName || "Unnamed"}</span>
                    <span className="text-muted-foreground">
                      {[
                        dependent.relationship,
                        dependent.dateOfBirth && formatIsoDate(dependent.dateOfBirth),
                        dependent.taxId && `Tax ID ${dependent.taxId}`,
                      ]
                        .filter(Boolean)
                        .map((part) => ` · ${part}`)
                        .join("")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DetailRow>
          <DetailRow label="Emergency contact">
            {contact.name ? (
              <span>
                <span className="font-medium">{contact.name}</span>
                <span className="text-muted-foreground">
                  {[contact.relationship, contact.mobile, contact.email]
                    .filter(Boolean)
                    .map((part) => ` · ${part}`)
                    .join("")}
                </span>
              </span>
            ) : (
              "—"
            )}
          </DetailRow>
        </dl>
      </SectionCard>

      <SectionCard
        title="Documents and banking"
        description={data.documents.hasRecord ? "Provided by the employee from their portal." : "The employee hasn't added documents yet."}
      >
        <dl className="divide-y">
          <DetailRow label="Personal ID">{orDash(documents.personalId)}</DetailRow>
          <DetailRow label="Issuing organism">{orDash(documents.organism)}</DetailRow>
          <DetailRow label={taxIdLabel(data.documents.countryName)}>{orDash(documents.taxId)}</DetailRow>
          <DetailRow label="Expiration">{formatIsoDate(documents.expiration)}</DetailRow>
          <DetailRow label="Other">{orDash(documents.other)}</DetailRow>
          <DetailRow label="Category">{orDash(documents.category)}</DetailRow>
          <DetailRow label="Health insurance">{documents.hasInsurance ? "Yes" : "No"}</DetailRow>
          <DetailRow label="Driver licence">{documents.isDriverLicense ? "Yes" : "No"}</DetailRow>
          <DetailRow label="Bank">
            {[documents.bank.bankName, documents.bank.branchName].map((part) => part.trim()).filter(Boolean).join(" · ") ||
              "—"}
          </DetailRow>
          <DetailRow label="Account">
            {[
              documents.bank.accountNumber,
              documents.bank.accountType,
              documents.bank.currency,
              documents.bank.bankCode && `Code ${documents.bank.bankCode}`,
            ]
              .map((part) => part.trim())
              .filter(Boolean)
              .join(" · ") || "—"}
          </DetailRow>
          {socialRows.map((field) => (
            <DetailRow key={field.key} label={field.label}>
              <span className="flex flex-wrap items-center gap-3">
                {orDash(documents.social[field.key])}
                {documents.social[field.fileKey] && (
                  <FileLink href={documentFileUrl(employeeId, field.column, clusterId)}>Copy</FileLink>
                )}
              </span>
            </DetailRow>
          ))}
          <DetailRow label="Uploaded files">
            {data.documents.files.length === 0 ? (
              "—"
            ) : (
              <ul className="flex flex-col gap-1.5">
                {data.documents.files.map((file) => (
                  <li key={file.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">{documentTypeLabel(file.documentType)}:</span>
                    <FileLink href={documentFileUrl(employeeId, storedFileRef(file.id), clusterId)}>{file.fileName}</FileLink>
                  </li>
                ))}
              </ul>
            )}
          </DetailRow>
        </dl>
      </SectionCard>
    </>
  )
}
