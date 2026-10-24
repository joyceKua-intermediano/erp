"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArchiveIcon, ArrowLeftIcon, GlobeIcon, MailIcon, PencilIcon, PhoneIcon, RefreshCwIcon } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useConsultant } from "@/hooks/use-consultants"
import type { Consultant } from "@/lib/consultants"
import { ArchiveConsultantDialog } from "./archive-consultant-dialog"
import { ConsultantFormSheet } from "./consultant-form-sheet"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })

const consultantsBackLink = (
  <Link
    href="/admin/consultants"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All consultants
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

function ConsultantNotFound() {
  return (
    <div className="flex flex-col gap-4">
      {consultantsBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Consultant not found</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            They may have been archived, or the link is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ConsultantLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {consultantsBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This consultant couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

type ConsultantDetailProps = {
  consultantId: string
  canManage: boolean
}

export function ConsultantDetail({ consultantId, canManage }: ConsultantDetailProps) {
  const { data: consultant, isPending, isError, refetch } = useConsultant(consultantId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <ConsultantLoadError onRetry={() => refetch()} />
  if (!consultant) return <ConsultantNotFound />

  return <ConsultantDetailContent consultant={consultant} canManage={canManage} />
}

function ConsultantDetailContent({ consultant, canManage }: { consultant: Consultant; canManage: boolean }) {
  const router = useRouter()
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [isArchiveOpen, setArchiveOpen] = useState(false)

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {consultantsBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar name={consultant.name} />
            <div className="flex flex-col gap-1.5">
              <h2 className="font-heading text-xl font-semibold tracking-tight">{consultant.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                  <GlobeIcon />
                  {consultant.countryName}
                </Badge>
                <Badge variant="outline" className="text-muted-foreground tabular-nums">
                  {consultant.employeeCount} {consultant.employeeCount === 1 ? "employee" : "employees"}
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

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        <Card className="gap-0 py-0">
          <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
            <CardTitle>Consultant information</CardTitle>
            <CardDescription>Shared by every cluster in this consultant&apos;s country.</CardDescription>
          </CardHeader>
          <dl className="divide-y">
            <DetailRow label="Full name">{consultant.name}</DetailRow>
            <DetailRow label="Country">{consultant.countryName}</DetailRow>
            <DetailRow label="Employer">{consultant.employer ?? "—"}</DetailRow>
            <DetailRow label="Date of birth">
              {consultant.dateOfBirth ? dateFormatter.format(new Date(`${consultant.dateOfBirth}T00:00:00Z`)) : "—"}
            </DetailRow>
            <DetailRow label="Address">{consultant.address ?? "—"}</DetailRow>
            <DetailRow label="Added">
              {consultant.createdAt ? dateFormatter.format(new Date(consultant.createdAt)) : "—"}
            </DetailRow>
          </dl>
        </Card>

        <Card className="[--card-spacing:--spacing(5)] xl:sticky xl:top-28">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>How to reach this consultant.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {consultant.email ? (
              <a href={`mailto:${consultant.email}`} className="flex items-center gap-2 hover:text-primary">
                <MailIcon className="size-4 text-muted-foreground" />
                {consultant.email}
              </a>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <MailIcon className="size-4" />
                No email
              </span>
            )}
            {consultant.mobileNumber ? (
              <a
                href={`tel:${consultant.mobileNumber.replace(/\s+/g, "")}`}
                className="flex items-center gap-2 hover:text-primary"
              >
                <PhoneIcon className="size-4 text-muted-foreground" />
                {consultant.mobileNumber}
              </a>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <PhoneIcon className="size-4" />
                No mobile number
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <>
          <ConsultantFormSheet
            open={sheet.open}
            consultant={consultant}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <ArchiveConsultantDialog
            open={isArchiveOpen}
            consultant={consultant}
            onOpenChange={setArchiveOpen}
            onArchived={() => router.push("/admin/consultants")}
          />
        </>
      )}
    </div>
  )
}
