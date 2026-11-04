"use client"

import { useId, useRef, useState } from "react"
import { CheckIcon, ExternalLinkIcon, Loader2Icon, PlusIcon, RefreshCwIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { FormCard, withCurrentOption } from "@/components/employee/profile/my-profile-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { uploadEmployeeDocument, useMyDocuments, useSaveMyDocuments } from "@/hooks/use-employee-profile"
import {
  accountTypeOptions,
  DOCUMENT_ACCEPT,
  documentFileUrl,
  documentsFormSchema,
  documentTypeLabels,
  documentTypes,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_FILES,
  socialSecurityFields,
  storedFileRef,
  taxIdLabel,
  type DocumentsFormInput,
  type EmployeeDocuments,
} from "@/lib/employee-profile"

type DraftFile = {
  key: string
  documentType: string
  path: string
  fileName: string
}

type SocialFileKey = (typeof socialSecurityFields)[number]["fileKey"]

let draftKeyCounter = 0
function nextDraftKey() {
  draftKeyCounter += 1
  return `file-${draftKeyCounter}`
}

const documentTypeItems = documentTypes.map((value) => ({ value, label: documentTypeLabels[value] }))

export function MyDocumentsEditor() {
  const { data, isPending, isError, refetch } = useMyDocuments()

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) {
    return (
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Your documents couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }
  return <MyDocumentsForm documents={data} />
}

function FileUploadButton({
  label,
  disabled,
  onFile,
}: {
  label: string
  disabled: boolean
  onFile: (file: File) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) onFile(file)
        }}
      />
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
        {disabled ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
        {label}
      </Button>
    </>
  )
}

function MyDocumentsForm({ documents }: { documents: EmployeeDocuments }) {
  const fieldId = useId()
  const save = useSaveMyDocuments()
  // Files are edited as draft rows below, so only the other fields live here.
  const [values, setValues] = useState<DocumentsFormInput>(documents.values)
  const [files, setFiles] = useState<DraftFile[]>(() =>
    documents.values.files.map((file) => ({ ...file, key: nextDraftKey() })),
  )
  const [uploading, setUploading] = useState<Set<string>>(() => new Set())
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [isSaved, setSaved] = useState(false)

  const storedFileIds = new Map(documents.files.map((file) => [file.path, file.id]))
  const input = {
    ...values,
    files: files.map(({ documentType, path, fileName }) => ({ documentType, path, fileName })),
  } as DocumentsFormInput
  const parsed = documentsFormSchema.safeParse(input)
  const formError = showErrors && !parsed.success ? (parsed.error.issues[0]?.message ?? null) : null
  const isUploading = uploading.size > 0

  function update(patch: Partial<typeof values>) {
    setValues((current) => ({ ...current, ...patch }))
    setSaved(false)
  }

  function updateFile(key: string, patch: Partial<DraftFile>) {
    setFiles((current) => current.map((file) => (file.key === key ? { ...file, ...patch } : file)))
    setSaved(false)
  }

  async function upload(key: string, file: File, onDone: (result: { path: string; fileName: string }) => void) {
    if (file.size > MAX_DOCUMENT_BYTES) {
      setUploadErrors((current) => ({ ...current, [key]: "Files can be at most 10 MB." }))
      return
    }
    setUploading((current) => new Set(current).add(key))
    setUploadErrors((current) => ({ ...current, [key]: "" }))
    try {
      onDone(await uploadEmployeeDocument(file))
      setSaved(false)
    } catch (error) {
      setUploadErrors((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : "Could not upload this file. Try again.",
      }))
    } finally {
      setUploading((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
    }
  }

  function textField(
    group: "root" | "bank" | "social",
    key: string,
    label: string,
    options: { type?: string } = {},
  ) {
    const id = `${fieldId}-${group}-${key}`
    const source = (group === "root" ? values : values[group]) as Record<string, unknown>
    return (
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          type={options.type ?? "text"}
          value={source[key] as string}
          maxLength={255}
          onChange={(event) => {
            const next = event.target.value
            if (group === "root") update({ [key]: next })
            else update({ [group]: { ...values[group], [key]: next } })
          }}
        />
      </Field>
    )
  }

  function handleSave() {
    setShowErrors(true)
    if (!parsed.success || isUploading) return
    save.mutate(input, { onSuccess: () => setSaved(true) })
  }

  const accountTypes = withCurrentOption(accountTypeOptions, values.bank.accountType)

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {!documents.hasRecord && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          You haven&apos;t added your documents yet. HR needs them to prepare your contract and pay you.
        </p>
      )}

      <FormCard title="Identification">
        {textField("root", "personalId", "Personal ID")}
        {textField("root", "organism", "Issuing organism")}
        {textField("root", "taxId", taxIdLabel(documents.countryName))}
        {textField("root", "expiration", "Expiration", { type: "date" })}
        {textField("root", "other", "Other")}
        {textField("root", "category", "Category")}
        <FieldLabel htmlFor={`${fieldId}-insurance`}>
          <Field orientation="horizontal">
            <Checkbox
              id={`${fieldId}-insurance`}
              checked={values.hasInsurance}
              onCheckedChange={(checked) => update({ hasInsurance: checked })}
            />
            <FieldContent>
              <FieldTitle>Health insurance</FieldTitle>
              <FieldDescription>You already have health insurance.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
        <FieldLabel htmlFor={`${fieldId}-license`}>
          <Field orientation="horizontal">
            <Checkbox
              id={`${fieldId}-license`}
              checked={values.isDriverLicense}
              onCheckedChange={(checked) => update({ isDriverLicense: checked })}
            />
            <FieldContent>
              <FieldTitle>Driver licence</FieldTitle>
              <FieldDescription>You hold a valid driver licence.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </FormCard>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Uploaded documents</CardTitle>
          <CardDescription>Copies of your ID, certificates and other paperwork. PDF, PNG, JPEG or WebP, up to 10 MB.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3 px-6 py-5">
          {files.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
          {files.map((file, index) => {
            const storedId = storedFileIds.get(file.path)
            const items = withCurrentOption(documentTypeItems, file.documentType)
            return (
              <div key={file.key} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
                <Select
                  value={file.documentType || null}
                  onValueChange={(next) => updateFile(file.key, { documentType: (next as string | null) ?? "" })}
                  items={items}
                >
                  <SelectTrigger className="w-full sm:w-72" aria-label={`Type of document ${index + 1}`}>
                    <SelectValue placeholder="Choose a document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {file.path ? (
                    storedId ? (
                      <a
                        href={documentFileUrl(documents.employeeId, storedFileRef(storedId))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 truncate text-sm font-medium text-primary hover:underline"
                      >
                        <ExternalLinkIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{file.fileName}</span>
                      </a>
                    ) : (
                      <span className="truncate text-sm">
                        {file.fileName} <span className="text-muted-foreground">· save to keep it</span>
                      </span>
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">No file yet</span>
                  )}
                  {uploadErrors[file.key] && (
                    <p role="alert" className="text-xs text-destructive">
                      {uploadErrors[file.key]}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <FileUploadButton
                    label={file.path ? "Replace" : "Upload"}
                    disabled={uploading.has(file.key)}
                    onFile={(picked) => upload(file.key, picked, (result) => updateFile(file.key, result))}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={uploading.has(file.key)}
                    onClick={() => {
                      setFiles((current) => current.filter((item) => item.key !== file.key))
                      setSaved(false)
                    }}
                    aria-label={`Remove document ${index + 1}`}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            )
          })}
          <Button
            variant="outline"
            className="w-fit"
            disabled={files.length >= MAX_DOCUMENT_FILES}
            onClick={() => setFiles((current) => [...current, { key: nextDraftKey(), documentType: "", path: "", fileName: "" }])}
          >
            <PlusIcon />
            Add document
          </Button>
        </div>
      </Card>

      <FormCard title="Banking details" description="The account your salary is paid into.">
        {textField("bank", "bankName", "Bank name")}
        {textField("bank", "bankCode", "Interbank code (Clave interbancaria)")}
        {textField("bank", "branchName", "Branch name")}
        {textField("bank", "accountNumber", "Account number")}
        <Field>
          <FieldLabel htmlFor={`${fieldId}-accountType`}>Account type</FieldLabel>
          <Select
            value={values.bank.accountType || null}
            onValueChange={(next) => update({ bank: { ...values.bank, accountType: (next as string | null) ?? "" } })}
            items={accountTypes}
          >
            <SelectTrigger id={`${fieldId}-accountType`} className="w-full">
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {accountTypes.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {textField("bank", "currency", "Account currency")}
      </FormCard>

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Social security</CardTitle>
          <CardDescription>Fill in the ones that apply in your country, with a copy of each if you have it.</CardDescription>
        </CardHeader>
        <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
          {socialSecurityFields.map((field) => {
            const fileKey: SocialFileKey = field.fileKey
            const filePath = values.social[fileKey]
            const isStored = filePath !== "" && filePath === documents.values.social[fileKey]
            const uploadKey = `social-${fileKey}`
            return (
              <div key={field.key} className="flex flex-col gap-2">
                {textField("social", field.key, field.label)}
                <div className="flex flex-wrap items-center gap-2">
                  <FileUploadButton
                    label={filePath ? "Replace copy" : "Upload copy"}
                    disabled={uploading.has(uploadKey)}
                    onFile={(picked) =>
                      upload(uploadKey, picked, (result) =>
                        setValues((current) => ({ ...current, social: { ...current.social, [fileKey]: result.path } })),
                      )
                    }
                  />
                  {filePath &&
                    (isStored ? (
                      <a
                        href={documentFileUrl(documents.employeeId, field.column)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLinkIcon className="size-3.5" />
                        View copy
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">Uploaded · save to keep it</span>
                    ))}
                  {filePath && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => update({ social: { ...values.social, [fileKey]: "" } })}
                      aria-label={`Remove the ${field.label} copy`}
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
                {uploadErrors[uploadKey] && (
                  <p role="alert" className="text-xs text-destructive">
                    {uploadErrors[uploadKey]}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex flex-col items-end gap-2">
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            {save.error.message}
          </p>
        )}
        <div className="flex items-center gap-3">
          {isSaved && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <CheckIcon className="size-4 text-primary" />
              Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={save.isPending || isUploading}>
            {(save.isPending || isUploading) && <Loader2Icon className="animate-spin" />}
            Save documents
          </Button>
        </div>
      </div>
    </div>
  )
}
