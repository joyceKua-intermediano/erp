"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArchiveIcon, ArrowLeftIcon, Loader2Icon, RefreshCwIcon, SaveIcon, TriangleAlertIcon } from "lucide-react"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useClusters } from "@/hooks/use-clusters"
import { useSampleContracts, useSaveTemplate, useTemplate, useTemplatePreview } from "@/hooks/use-templates"
import { contractKindLabels, contractKinds } from "@/lib/contracts"
import {
  templateFormSchema,
  toTemplateFormInput,
  type ContractTemplateDetail,
  type SampleContractOption,
  type TemplateFormInput,
} from "@/lib/templates"
import type { TypstDiagnostic } from "@/lib/typst/diagnostics"
import { ArchiveTemplateDialog } from "./archive-template-dialog"
import { FieldReference } from "./field-reference"
import { FormatBadge } from "./templates-workspace"

type FieldErrors = Partial<Record<keyof TemplateFormInput, string[]>>

const ALL_CLUSTERS = "all"
const ANY_KIND = "any"
const PREVIEW_DELAY_MS = 700

const templatesBackLink = (
  <Link
    href="/admin/templates"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    All templates
  </Link>
)

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

type TemplateEditorProps = {
  templateId: string | null
  canManage: boolean
}

export function TemplateEditor({ templateId, canManage }: TemplateEditorProps) {
  const { data: template, isPending, isError, refetch } = useTemplate(templateId)

  if (templateId && isPending) return <Skeleton className="h-[40rem] rounded-xl" />
  if (templateId && isError) {
    return (
      <div className="flex flex-col gap-4">
        {templatesBackLink}
        <Card className="[--card-spacing:--spacing(10)]">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">This template couldn&apos;t be loaded.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCwIcon />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  if (templateId && !template) {
    return (
      <div className="flex flex-col gap-4">
        {templatesBackLink}
        <Card className="[--card-spacing:--spacing(10)]">
          <CardContent className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-heading text-lg font-semibold">Template not found</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              It may have been archived, belong to a cluster you can&apos;t access, or the link is wrong.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <TemplateEditorForm key={template?.id ?? "new"} template={template ?? null} canManage={canManage} />
}

function lineStartOffset(source: string, line: number) {
  let offset = 0
  for (let current = 1; current < line; current += 1) {
    const next = source.indexOf("\n", offset)
    if (next === -1) return source.length
    offset = next + 1
  }
  return offset
}

function TemplateEditorForm({ template, canManage }: { template: ContractTemplateDetail | null; canManage: boolean }) {
  const router = useRouter()
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const [values, setValues] = useState<TemplateFormInput>(() => toTemplateFormInput(template))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [panel, setPanel] = useState<"preview" | "fields">("preview")
  const [sampleId, setSampleId] = useState<string | null>(null)
  const [isArchiveOpen, setArchiveOpen] = useState(false)
  const clusters = useClusters()
  const samples = useSampleContracts()
  const saveTemplate = useSaveTemplate()
  const readOnly = !canManage

  const sampleOptions = samples.data ?? []
  const clusterLabel = clusters.data?.find((cluster) => cluster.id === values.clusterId)?.label ?? null
  const defaultSample =
    sampleOptions.find((sample) => sample.clusterId === values.clusterId) ?? sampleOptions[0] ?? null
  const sample: SampleContractOption | null = sampleOptions.find((option) => option.id === sampleId) ?? defaultSample

  const debouncedSource = useDebouncedValue(values.typstSource, PREVIEW_DELAY_MS)
  const preview = useTemplatePreview(
    debouncedSource,
    sample ? { contractId: sample.id, clusterId: sample.clusterId } : null
  )
  const previewData = preview.data ?? null
  const previewUrl = previewData?.status === "ready" ? previewData.url : null
  const isPreviewStale = debouncedSource !== values.typstSource || preview.isFetching

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function update<Key extends keyof TemplateFormInput>(key: Key, value: TemplateFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readOnly) return
    const parsed = templateFormSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors)
      return
    }
    saveTemplate.mutate(
      { templateId: template?.id ?? null, input: values },
      {
        onSuccess: ({ id }) => {
          if (!template) router.replace(`/admin/templates/${id}`)
        },
      }
    )
  }

  // Tab indents inside the editor instead of moving focus; Shift+Tab still leaves the field.
  function handleSourceKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab" || event.shiftKey || readOnly) return
    event.preventDefault()
    const target = event.currentTarget
    const { selectionStart, selectionEnd, value } = target
    const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`
    update("typstSource", next)
    requestAnimationFrame(() => target.setSelectionRange(selectionStart + 2, selectionStart + 2))
  }

  function jumpTo(diagnostic: TypstDiagnostic) {
    const textarea = sourceRef.current
    if (!textarea || diagnostic.line === null) return
    const start = lineStartOffset(values.typstSource, diagnostic.line) + Math.max((diagnostic.column ?? 1) - 1, 0)
    textarea.focus()
    textarea.setSelectionRange(start, start)
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 20
    textarea.scrollTop = Math.max((diagnostic.line - 3) * lineHeight, 0)
  }

  const clusterItems = [
    { label: "All clusters", value: ALL_CLUSTERS },
    ...(clusters.data ?? []).map((cluster) => ({ label: cluster.label, value: cluster.id })),
  ]
  if (template?.clusterId && template.clusterName && !clusterItems.some((item) => item.value === template.clusterId)) {
    clusterItems.push({ label: template.clusterName, value: template.clusterId })
  }
  const kindItems = [
    { label: "Any kind", value: ANY_KIND },
    ...contractKinds.map((kind) => ({ label: contractKindLabels[kind], value: kind })),
  ]
  const sampleItems = sampleOptions.map((option) => ({ label: option.label, value: option.id }))
  const diagnostics = previewData?.status === "error" ? previewData.diagnostics : []

  return (
    <form onSubmit={handleSubmit} className="flex animate-in flex-col gap-6 duration-300 fade-in-0" noValidate>
      {templatesBackLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                {template ? template.name : "New contract template"}
              </h2>
              {template && <FormatBadge template={template} />}
              {template && template.contractCount > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  Used by {template.contractCount} {template.contractCount === 1 ? "contract" : "contracts"}
                </Badge>
              )}
            </div>
            {canManage && (
              <div className="flex gap-2">
                {template && (
                  <Button type="button" variant="destructive" onClick={() => setArchiveOpen(true)}>
                    <ArchiveIcon />
                    Archive
                  </Button>
                )}
                <Button type="submit" disabled={saveTemplate.isPending}>
                  {saveTemplate.isPending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                  {template ? "Save changes" : "Create template"}
                </Button>
              </div>
            )}
          </div>
          {saveTemplate.isError && (
            <p role="alert" className="text-sm text-destructive">
              {saveTemplate.error.message}
            </p>
          )}
          {saveTemplate.isSuccess && !saveTemplate.isPending && template && (
            <p role="status" className="text-sm text-primary">
              Saved.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <Field data-invalid={Boolean(fieldErrors.name)}>
              <FieldLabel htmlFor="template-name">Name</FieldLabel>
              <Input
                id="template-name"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Colombia - Ordinary employment contract"
                readOnly={readOnly}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              <FieldError errors={fieldErrors.name?.map((message) => ({ message }))} />
            </Field>
            <Field data-invalid={Boolean(fieldErrors.clusterId)}>
              <FieldLabel htmlFor="template-cluster">Cluster</FieldLabel>
              <Select
                value={values.clusterId || ALL_CLUSTERS}
                onValueChange={(value) => {
                  const next = (value as string | null) ?? ALL_CLUSTERS
                  update("clusterId", next === ALL_CLUSTERS ? "" : next)
                }}
                items={clusterItems}
                disabled={readOnly || clusters.isPending}
              >
                <SelectTrigger id="template-cluster" className="w-full" aria-invalid={Boolean(fieldErrors.clusterId)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clusterItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={fieldErrors.clusterId?.map((message) => ({ message }))} />
            </Field>
            <Field>
              <FieldLabel htmlFor="template-kind">Contract kind</FieldLabel>
              <Select
                value={values.contractKind || ANY_KIND}
                onValueChange={(value) => {
                  const next = (value as string | null) ?? ANY_KIND
                  update("contractKind", next === ANY_KIND ? "" : (next as TemplateFormInput["contractKind"]))
                }}
                items={kindItems}
                disabled={readOnly}
              >
                <SelectTrigger id="template-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kindItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {template && !template.hasTypstSource && template.hasLegacyContent && (
            <p className="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              This template only has legacy Tiptap content, which the old app keeps using. Write its Typst version below
              to generate PDFs here; the legacy content is left untouched.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="gap-1 border-b py-4 [--card-spacing:--spacing(5)]">
            <CardTitle>Typst source</CardTitle>
            <CardDescription>
              Shared helpers live in <code>/lib/layout.typ</code>, <code>/lib/format.typ</code> and{" "}
              <code>/lib/signatures.typ</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 py-4 [--card-spacing:--spacing(5)]">
            <Textarea
              ref={sourceRef}
              value={values.typstSource}
              onChange={(event) => update("typstSource", event.target.value)}
              onKeyDown={handleSourceKeyDown}
              readOnly={readOnly}
              spellCheck={false}
              aria-label="Typst source"
              aria-invalid={Boolean(fieldErrors.typstSource)}
              className="field-sizing-fixed h-[68vh] resize-none font-mono text-xs leading-5 md:text-xs"
            />
            <FieldError errors={fieldErrors.typstSource?.map((message) => ({ message }))} />
            {diagnostics.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2" role="alert">
                {diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.line}-${diagnostic.column}-${index}`}>
                    <button
                      type="button"
                      onClick={() => jumpTo(diagnostic)}
                      disabled={diagnostic.line === null || !diagnostic.inTemplate}
                      className="w-full rounded px-2 py-1 text-left text-xs text-destructive hover:bg-destructive/10 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      {diagnostic.line !== null && diagnostic.inTemplate && (
                        <span className="mr-2 font-mono font-semibold">
                          {diagnostic.line}:{diagnostic.column ?? 1}
                        </span>
                      )}
                      {!diagnostic.inTemplate && <span className="mr-2 font-semibold">shared library</span>}
                      {diagnostic.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-4 [--card-spacing:--spacing(5)]">
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[panel]}
              onValueChange={(next) => {
                const value = next[0] as "preview" | "fields" | undefined
                if (value) setPanel(value)
              }}
              aria-label="Side panel"
            >
              <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
              <ToggleGroupItem value="fields">Fields</ToggleGroupItem>
            </ToggleGroup>
            {panel === "preview" && (
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                {isPreviewStale && sample && (
                  <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" aria-label="Updating preview" />
                )}
                <Select
                  value={sample?.id ?? null}
                  onValueChange={(value) => setSampleId((value as string | null) ?? null)}
                  items={sampleItems}
                  disabled={sampleItems.length === 0}
                >
                  <SelectTrigger className="w-full max-w-xs" aria-label="Sample contract">
                    <SelectValue placeholder={samples.isPending ? "Loading contracts…" : "No sample contract"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="h-[calc(68vh+3.5rem)] py-4 [--card-spacing:--spacing(5)]">
            {panel === "fields" ? (
              <FieldReference />
            ) : !sample ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                {samples.isPending
                  ? "Loading sample contracts…"
                  : "There's no contract you can preview with yet. Create a contract first."}
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title={`Preview with ${sample.label}${clusterLabel ? ` for ${clusterLabel}` : ""}`}
                className="size-full rounded-lg border bg-muted"
              />
            ) : previewData?.status === "error" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <TriangleAlertIcon className="size-6 text-destructive" />
                <p className="text-sm font-medium">{previewData.message}</p>
                {diagnostics.length > 0 && (
                  <p className="text-xs text-muted-foreground">Click an error under the editor to jump to its line.</p>
                )}
              </div>
            ) : preview.isError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">The preview couldn&apos;t be loaded.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => preview.refetch()}>
                  <RefreshCwIcon />
                  Try again
                </Button>
              </div>
            ) : (
              <Skeleton className="size-full rounded-lg" />
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && template && (
        <ArchiveTemplateDialog
          open={isArchiveOpen}
          template={template}
          onOpenChange={setArchiveOpen}
          onArchived={() => router.push("/admin/templates")}
        />
      )}
    </form>
  )
}
