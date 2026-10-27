"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  FileSignatureIcon,
  GlobeIcon,
  InfoIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useIntermedianoCompany } from "@/hooks/use-clusters"
import type { IntermedianoCompany } from "@/lib/intermediano-companies"
import { ArchiveCompanyDialog } from "./archive-company-dialog"
import { CompanyFormSheet } from "./company-form-sheet"
import { CompanyMark } from "./company-mark"
import { CompanyModulesCard } from "./company-modules-card"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })

const companiesBackLink = (
  <Link
    href="/admin/intermediano-companies"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All companies
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

export function CompanyNotFound() {
  return (
    <div className="flex flex-col gap-4">
      {companiesBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Company not found</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            It may have been archived, or the link is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function CompanyLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {companiesBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This company couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

type CompanyDetailProps = {
  companyId: string
  canManage: boolean
}

export function CompanyDetail({ companyId, canManage }: CompanyDetailProps) {
  const { data: company, isPending, isError, refetch } = useIntermedianoCompany(companyId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <CompanyLoadError onRetry={() => refetch()} />
  if (!company) return <CompanyNotFound />

  return <CompanyDetailContent company={company} canManage={canManage} />
}

function CompanyDetailContent({ company, canManage }: { company: IntermedianoCompany; canManage: boolean }) {
  const router = useRouter()
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [isArchiveOpen, setArchiveOpen] = useState(false)

  const stats = [
    { label: "Employees", value: company.employeeCount, icon: UsersIcon },
    { label: "Active contracts", value: company.activeContractCount, icon: FileSignatureIcon },
    { label: "Staff trackers", value: company.staffTrackerCount, icon: ClipboardListIcon },
  ]

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {companiesBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <CompanyMark name={company.name} size="lg" />
            <div className="flex flex-col gap-1.5">
              <h2 className="font-heading text-xl font-semibold tracking-tight">{company.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                  <GlobeIcon />
                  {company.countryName}
                </Badge>
                <Badge variant="outline" className="font-mono text-muted-foreground">
                  {company.taxId}
                </Badge>
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSheet((current) => ({ open: true, key: current.key + 1 }))}>
                <PencilIcon />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setArchiveOpen(true)}>
                <ArchiveIcon />
                Archive
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3" aria-label={`${company.name} summary`}>
        {stats.map((stat) => (
          <Card key={stat.label} className="[--card-spacing:--spacing(5)]">
            <CardContent className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="text-2xl font-semibold tabular-nums">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-0 py-0">
            <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
              <CardTitle>Company information</CardTitle>
              <CardDescription>Legal details used on contracts, invoices and payroll documents.</CardDescription>
            </CardHeader>
            <dl className="divide-y">
              <DetailRow label="Legal name">{company.name}</DetailRow>
              <DetailRow label="Country">{company.countryName}</DetailRow>
              <DetailRow label="Tax ID">
                <span className="font-mono">{company.taxId}</span>
              </DetailRow>
              <DetailRow label="Registered address">
                <span className="flex items-start gap-1.5">
                  <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  {company.address}
                </span>
              </DetailRow>
              <DetailRow label="Added">
                {company.createdAt ? dateFormatter.format(new Date(company.createdAt)) : "—"}
              </DetailRow>
            </dl>
          </Card>

          <Card className="[--card-spacing:--spacing(6)]">
            <CardHeader>
              <CardTitle>Main contact</CardTitle>
              <CardDescription>The person to reach about this entity.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar name={company.contactName} />
                <span className="font-medium">{company.contactName}</span>
              </div>
              <div className="flex flex-col gap-2 text-sm sm:items-end">
                <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:text-primary">
                  <MailIcon className="size-4 text-muted-foreground" />
                  {company.email}
                </a>
                <a
                  href={`tel:${company.mobileNumber.replace(/\s+/g, "")}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <PhoneIcon className="size-4 text-muted-foreground" />
                  {company.mobileNumber}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-28">
          <CompanyModulesCard
            key={company.modules.join(",")}
            companyId={company.id}
            modules={company.modules}
            canManage={canManage}
          />
          <Card className="[--card-spacing:--spacing(5)]">
            <CardHeader>
              <CardTitle>Roles with access</CardTitle>
              <CardDescription>Roles that can pick this entity in the cluster switcher.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1">
                {company.roles.map((role) => (
                  <li key={role.id}>
                    <Link
                      href={`/admin/users/roles/${role.id}`}
                      className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-primary/5"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShieldCheckIcon className="size-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium capitalize">{role.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          role.scope === "all" ? "text-muted-foreground" : "border-primary/30 text-primary"
                        }
                      >
                        {role.scope === "all" ? "All clusters" : "Selected"}
                      </Badge>
                      <ChevronRightIcon className="size-4 text-muted-foreground group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <div className="flex gap-3 rounded-xl bg-muted/60 p-4 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <p>Change which roles can work in this entity from each role&apos;s Cluster access settings.</p>
          </div>
        </div>
      </div>

      {canManage && (
        <>
          <CompanyFormSheet
            open={sheet.open}
            company={company}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <ArchiveCompanyDialog
            open={isArchiveOpen}
            company={company}
            onOpenChange={setArchiveOpen}
            onArchived={() => router.push("/admin/intermediano-companies")}
          />
        </>
      )}
    </div>
  )
}
