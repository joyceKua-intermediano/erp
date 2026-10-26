"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  FileCodeIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTemplates } from "@/hooks/use-templates"
import { contractKindLabels } from "@/lib/contracts"
import type { ContractTemplate } from "@/lib/templates"
import { ArchiveTemplateDialog } from "./archive-template-dialog"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

function matchesSearch(template: ContractTemplate, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [template.name, template.clusterName, template.countryName]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle))
}

export function FormatBadge({ template }: { template: Pick<ContractTemplate, "format"> }) {
  if (template.format === "blocks") {
    return <Badge className="border-transparent bg-primary/10 text-primary">Ready</Badge>
  }
  if (template.format === "code") {
    return <Badge className="border-transparent bg-secondary text-secondary-foreground">Ready · code</Badge>
  }
  if (template.format === "legacy") {
    return (
      <Badge variant="outline" className="gap-1 border-dashed text-muted-foreground">
        <TriangleAlertIcon className="size-3" />
        Legacy only
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-dashed text-muted-foreground">
      Empty
    </Badge>
  )
}

type TemplatesWorkspaceProps = {
  canManage: boolean
}

export function TemplatesWorkspace({ canManage }: TemplatesWorkspaceProps) {
  const [search, setSearch] = useState("")
  const [archive, setArchive] = useState<{ open: boolean; template: ContractTemplate | null }>({
    open: false,
    template: null,
  })
  const { data, isPending, isError, isFetching, refetch } = useTemplates()

  const templates = data ?? []
  const visibleTemplates = templates.filter((template) => matchesSearch(template, search))
  const legacyOnlyCount = templates.filter((template) => template.format === "legacy").length
  const readyCount = templates.filter((template) => template.format === "blocks" || template.format === "code").length

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Contract templates summary">
        {[
          { label: "Templates", value: templates.length, icon: FileTextIcon },
          { label: "Ready for PDF", value: readyCount, icon: FileCodeIcon },
          { label: "Legacy only, to port", value: legacyOnlyCount, icon: TriangleAlertIcon },
        ].map((stat) => (
          <Card key={stat.label} className="[--card-spacing:--spacing(5)]">
            <CardContent className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                {isPending ? (
                  <Skeleton className="mt-1 h-6 w-10" />
                ) : (
                  <span className="text-2xl font-semibold tabular-nums">{stat.value}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1">
            <CardTitle>Contract templates</CardTitle>
            <CardDescription>
              The documents that turn a contract into its PDF. Each cluster can have its own format.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, cluster, country…"
                aria-label="Search templates"
                className="pl-8 focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>
            {canManage && (
              <Link href="/admin/templates/new" className={buttonVariants()}>
                <PlusIcon />
                New template
              </Link>
            )}
            {isFetching && !isPending && (
              <RefreshCwIcon className="size-3.5 animate-spin text-primary" aria-label="Refreshing" />
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold tracking-wide text-primary uppercase">Template</TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase md:table-cell">
                  Cluster
                </TableHead>
                <TableHead className="hidden text-xs font-semibold tracking-wide text-primary uppercase lg:table-cell">
                  Kind
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-primary uppercase">Format</TableHead>
                <TableHead className="hidden text-right text-xs font-semibold tracking-wide text-primary uppercase sm:table-cell">
                  Contracts
                </TableHead>
                <TableHead className="w-14 pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={isPending ? "loading" : "ready"} className="animate-in duration-300 fade-in-0">
              {isPending ? (
                Array.from({ length: 3 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-6">
                      <Skeleton className="h-4 w-56" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="ml-auto h-4 w-6" />
                    </TableCell>
                    <TableCell className="pr-6" />
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-muted-foreground">Contract templates couldn&apos;t be loaded.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCwIcon />
                        Try again
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleTemplates.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {templates.length === 0 ? "No contract templates yet." : "No templates match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleTemplates.map((template) => {
                  const href = `/admin/templates/${template.id}`
                  return (
                    <TableRow key={template.id} className="hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <Link href={href} className="group flex flex-col">
                          <span className="font-medium group-hover:text-primary">{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {template.updatedAt ? `Updated ${dateFormatter.format(new Date(template.updatedAt))}` : "—"}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {template.clusterName ?? (template.countryName ? `Any cluster in ${template.countryName}` : "All clusters")}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {template.contractKind ? contractKindLabels[template.contractKind] : "Any"}
                      </TableCell>
                      <TableCell>
                        <FormatBadge template={template} />
                      </TableCell>
                      <TableCell className="hidden text-right font-medium tabular-nums sm:table-cell">
                        {template.contractCount}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${template.name}`}>
                                <MoreHorizontalIcon />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem render={<Link href={href} />}>
                              <PencilIcon />
                              {canManage ? "Edit" : "View"}
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchive({ open: true, template })}
                                >
                                  <ArchiveIcon />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <ArchiveTemplateDialog
          open={archive.open}
          template={archive.template}
          onOpenChange={(open) => setArchive((current) => ({ ...current, open }))}
        />
      )}
    </div>
  )
}
