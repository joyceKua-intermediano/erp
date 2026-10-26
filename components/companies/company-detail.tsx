"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  FactoryIcon,
  LinkIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  SmartphoneIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react"
import { CompanyMark } from "@/components/intermediano-companies/company-mark"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompany, useSetMainContact } from "@/hooks/use-companies"
import type { CompanyContact, CompanyDetail as CompanyDetailData } from "@/lib/companies"
import { ArchiveCompanyDialog } from "./archive-company-dialog"
import { CompanyFormSheet } from "./company-form-sheet"
import { ContactFormSheet } from "./contact-form-sheet"
import { RemoveContactDialog } from "./remove-contact-dialog"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" })
const numberFormatter = new Intl.NumberFormat("en")

const companiesBackLink = (
  <Link
    href="/admin/companies"
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

function CompanyNotFound() {
  return (
    <div className="flex flex-col gap-4">
      {companiesBackLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-lg font-semibold">Company not found</h2>
          <p className="max-w-md text-sm text-muted-foreground">It may have been archived, or the link is wrong.</p>
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
  canViewContacts: boolean
  canManageContacts: boolean
}

export function CompanyDetail({ companyId, canManage, canViewContacts, canManageContacts }: CompanyDetailProps) {
  const { data: company, isPending, isError, refetch } = useCompany(companyId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <CompanyLoadError onRetry={() => refetch()} />
  if (!company) return <CompanyNotFound />

  return (
    <CompanyDetailContent
      company={company}
      canManage={canManage}
      canViewContacts={canViewContacts}
      canManageContacts={canManageContacts}
    />
  )
}

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function CompanyDetailContent({
  company,
  canManage,
  canViewContacts,
  canManageContacts,
}: {
  company: CompanyDetailData
  canManage: boolean
  canViewContacts: boolean
  canManageContacts: boolean
}) {
  const router = useRouter()
  const [sheet, setSheet] = useState({ open: false, key: 0 })
  const [isArchiveOpen, setArchiveOpen] = useState(false)
  const location = [company.address, company.city, company.state, company.postalCode, company.country]
    .filter(Boolean)
    .join(", ")

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
                {company.isCustomer ? (
                  <Badge className="bg-primary/10 text-primary">Customer</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Prospect
                  </Badge>
                )}
                {company.industryName && (
                  <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                    <FactoryIcon />
                    {company.industryName}
                  </Badge>
                )}
                <Badge variant="outline" className="text-muted-foreground tabular-nums">
                  {company.contractCount} {company.contractCount === 1 ? "contract" : "contracts"}
                </Badge>
                <Badge variant="outline" className="text-muted-foreground tabular-nums">
                  {company.leadCount} {company.leadCount === 1 ? "lead" : "leads"}
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

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="gap-0 py-0">
          <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
            <CardTitle>Company information</CardTitle>
            <CardDescription>Shared by every cluster.</CardDescription>
          </CardHeader>
          <dl className="divide-y">
            <DetailRow label="Company name">{company.name}</DetailRow>
            <DetailRow label="Website">
              {company.website ? (
                <a
                  href={websiteHref(company.website)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Tax ID">{company.taxId ?? "—"}</DetailRow>
            <DetailRow label="VAT">{company.vat ?? "—"}</DetailRow>
            <DetailRow label="Field of industry">{company.industryName ?? "—"}</DetailRow>
            <DetailRow label="Employees">
              {company.numberOfEmployees !== null ? numberFormatter.format(company.numberOfEmployees) : "—"}
            </DetailRow>
            <DetailRow label="Address">{location || "—"}</DetailRow>
            <DetailRow label="Added">
              {company.createdAt ? dateFormatter.format(new Date(company.createdAt)) : "—"}
              {company.addedBy && <span className="text-muted-foreground"> by {company.addedBy}</span>}
            </DetailRow>
          </dl>
        </Card>

        {canViewContacts && <ContactsCard company={company} canManage={canManageContacts} />}
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
            onArchived={() => router.push("/admin/companies")}
          />
        </>
      )}
    </div>
  )
}

function ContactsCard({ company, canManage }: { company: CompanyDetailData; canManage: boolean }) {
  const [sheet, setSheet] = useState<{ open: boolean; contact: CompanyContact | null; key: number }>({
    open: false,
    contact: null,
    key: 0,
  })
  const [removal, setRemoval] = useState<{ open: boolean; contact: CompanyContact | null }>({
    open: false,
    contact: null,
  })
  const setMainContact = useSetMainContact(company.id)

  function openSheet(contact: CompanyContact | null) {
    setSheet((current) => ({ open: true, contact, key: current.key + 1 }))
  }

  return (
    <Card className="gap-0 py-0 xl:sticky xl:top-28">
      <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(5)] sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            {company.contacts.length === 0
              ? "No one on file yet."
              : `${company.contacts.length} ${company.contacts.length === 1 ? "person" : "people"} at this company.`}
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => openSheet(null)}>
            <PlusIcon />
            Add
          </Button>
        )}
      </CardHeader>
      {setMainContact.isError && (
        <p role="alert" className="border-b px-5 py-3 text-sm text-destructive">
          {setMainContact.error.message}
        </p>
      )}
      <ul className="divide-y">
        {company.contacts.map((contact) => (
          <li key={contact.id} className="flex gap-3 px-5 py-4">
            <UserAvatar name={contact.fullName} muted={!contact.isMainContact} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{contact.fullName}</span>
                {contact.isMainContact && (
                  <Badge className="gap-1 bg-primary/10 text-primary">
                    <StarIcon />
                    Main
                  </Badge>
                )}
              </div>
              {(contact.position || contact.department) && (
                <span className="text-xs text-muted-foreground">
                  {[contact.position, contact.department].filter(Boolean).join(" · ")}
                </span>
              )}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-primary">
                    <MailIcon className="size-3" />
                    <span className="truncate">{contact.email}</span>
                  </a>
                )}
                {contact.mobile && (
                  <a
                    href={`tel:${contact.mobile.replace(/\s+/g, "")}`}
                    className="flex items-center gap-1.5 hover:text-primary"
                  >
                    <SmartphoneIcon className="size-3" />
                    {contact.mobile}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                    className="flex items-center gap-1.5 hover:text-primary"
                  >
                    <PhoneIcon className="size-3" />
                    {contact.phone}
                  </a>
                )}
                {contact.linkedin && (
                  <a
                    href={websiteHref(contact.linkedin)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary"
                  >
                    <LinkIcon className="size-3" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${contact.fullName}`}>
                      <MoreHorizontalIcon />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => openSheet(contact)}>
                    <PencilIcon />
                    Edit
                  </DropdownMenuItem>
                  {!contact.isMainContact && (
                    <DropdownMenuItem
                      disabled={setMainContact.isPending}
                      onClick={() => setMainContact.mutate(contact.id)}
                    >
                      <StarIcon />
                      Set as main
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setRemoval({ open: true, contact })}>
                    <Trash2Icon />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <>
          <ContactFormSheet
            open={sheet.open}
            companyId={company.id}
            companyName={company.name}
            contact={sheet.contact}
            formKey={sheet.key}
            onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
          />
          <RemoveContactDialog
            open={removal.open}
            companyId={company.id}
            contact={removal.contact}
            onOpenChange={(open) => setRemoval((current) => ({ ...current, open }))}
          />
        </>
      )}
    </Card>
  )
}
