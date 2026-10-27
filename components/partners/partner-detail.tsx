"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArchiveIcon, ArrowLeftIcon, GlobeIcon, MailIcon, PencilIcon, PhoneIcon, RefreshCwIcon, UserIcon } from "lucide-react"
import { CompanyMark } from "@/components/intermediano-companies/company-mark"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePartner } from "@/hooks/use-partners"
import { isPartnerType, partnerTypeLabel, type Partner } from "@/lib/partners"
import { ArchivePartnerDialog } from "./archive-partner-dialog"
import { PartnerFormSheet } from "./partner-form-sheet"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })

const partnersBackLink = (
  <Link
    href="/admin/partners"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All partners
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

function PartnerNotFound() {
  return (
    <div className="flex flex-col gap-4">
      {partnersBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Partner not found</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            They may have been archived, or the link is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function PartnerLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {partnersBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">This partner couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

type PartnerDetailProps = {
  partnerId: string
  canManage: boolean
}

export function PartnerDetail({ partnerId, canManage }: PartnerDetailProps) {
  const { data: partner, isPending, isError, refetch } = usePartner(partnerId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <PartnerLoadError onRetry={() => refetch()} />
  if (!partner) return <PartnerNotFound />

  return <PartnerDetailContent partner={partner} canManage={canManage} />
}

function PartnerDetailContent({ partner, canManage }: { partner: Partner; canManage: boolean }) {
  const router = useRouter()
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [isArchiveOpen, setArchiveOpen] = useState(false)
  const typeLabel = partnerTypeLabel(partner.partnerType)

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {partnersBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <CompanyMark name={partner.name} size="lg" />
            <div className="flex flex-col gap-1.5">
              <h2 className="font-heading text-xl font-semibold tracking-tight">{partner.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                  <GlobeIcon />
                  {partner.countryName ?? "Unknown country"}
                </Badge>
                {typeLabel && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {typeLabel}
                  </Badge>
                )}
                <Badge variant="outline" className="text-muted-foreground tabular-nums">
                  {partner.contractCount} {partner.contractCount === 1 ? "contract" : "contracts"}
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
            <CardTitle>Partner information</CardTitle>
            <CardDescription>Shared by every cluster. Contract counts only include clusters you can see.</CardDescription>
          </CardHeader>
          <dl className="divide-y">
            <DetailRow label="Company name">{partner.name}</DetailRow>
            <DetailRow label="Country">{partner.countryName ?? "—"}</DetailRow>
            <DetailRow label="Partner type">
              {typeLabel ?? "—"}
              {partner.partnerType && !isPartnerType(partner.partnerType) && (
                <span className="ml-2 text-xs text-muted-foreground">(legacy value)</span>
              )}
            </DetailRow>
            <DetailRow label="Tax ID">{partner.taxId ?? "—"}</DetailRow>
            <DetailRow label="Address">
              <span className="whitespace-pre-line">{partner.address || "—"}</span>
            </DetailRow>
            <DetailRow label="Contracts">{partner.contractCount}</DetailRow>
            <DetailRow label="Portal accounts">{partner.portalAccountCount}</DetailRow>
            <DetailRow label="Added">
              {partner.createdAt ? dateFormatter.format(new Date(partner.createdAt)) : "—"}
            </DetailRow>
          </dl>
        </Card>

        <Card className="[--card-spacing:--spacing(5)] xl:sticky xl:top-28">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Who the team talks to at this partner.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <span className="flex items-center gap-2">
              <UserIcon className="size-4 text-muted-foreground" />
              {partner.contactName ?? <span className="text-muted-foreground">No contact name</span>}
            </span>
            <a href={`mailto:${partner.email}`} className="flex items-center gap-2 hover:text-primary">
              <MailIcon className="size-4 text-muted-foreground" />
              {partner.email}
            </a>
            <a
              href={`tel:${partner.mobileNumber.replace(/\s+/g, "")}`}
              className="flex items-center gap-2 hover:text-primary"
            >
              <PhoneIcon className="size-4 text-muted-foreground" />
              {partner.mobileNumber}
            </a>
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <>
          <PartnerFormSheet
            open={sheet.open}
            partner={partner}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <ArchivePartnerDialog
            open={isArchiveOpen}
            partner={partner}
            onOpenChange={setArchiveOpen}
            onArchived={() => router.push("/admin/partners")}
          />
        </>
      )}
    </div>
  )
}
