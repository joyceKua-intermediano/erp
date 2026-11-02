"use client"

import { useEffect, useId, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  ImageOffIcon,
  Loader2Icon,
  LockIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"
import { TimesheetStatusBadge } from "@/components/timesheets/timesheet-status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  uploadExpenseReceipt,
  useDeleteMyExpenseClaim,
  useMyExpenseClaim,
  useMyExpenseClaims,
  useSaveMyExpenseClaim,
} from "@/hooks/use-employee-expenses"
import {
  abroadLocalAmount,
  expenseClaimFormSchema,
  expenseClaimTitle,
  expenseTypeLabels,
  expenseTypes,
  formatMoney,
  isClaimLocked,
  MAX_EXPENSE_LINES,
  MAX_RECEIPT_BYTES,
  RECEIPT_ACCEPT,
  receiptUrl,
  roundMoney,
  type ExpenseClaim,
  type ExpenseClaimFormInput,
  type ExpenseLine,
  type ExpenseStatus,
  type ExpenseType,
  type MyExpenseClaims,
} from "@/lib/expenses"

const backLink = (
  <Link
    href="/employee/expenses"
    className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit text-muted-foreground" })}
  >
    <ArrowLeftIcon />
    My expense claims
  </Link>
)

function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {backLink}
      <Card className="[--card-spacing:--spacing(10)]">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">{message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCwIcon />
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function MyExpenseEditor({ expenseId }: { expenseId: string | null }) {
  const overview = useMyExpenseClaims()

  if (overview.isPending) return <Skeleton className="h-96 rounded-xl" />
  if (overview.isError) {
    return <LoadError message="Your contract details couldn't be loaded." onRetry={() => overview.refetch()} />
  }
  if (!expenseId) return <MyExpenseForm claim={null} overview={overview.data} />
  return <ExistingExpenseClaim expenseId={expenseId} overview={overview.data} />
}

function ExistingExpenseClaim({ expenseId, overview }: { expenseId: string; overview: MyExpenseClaims }) {
  const { data: claim, isPending, isError, refetch } = useMyExpenseClaim(expenseId)

  if (isPending) return <Skeleton className="h-96 rounded-xl" />
  if (isError) return <LoadError message="This expense claim couldn't be loaded." onRetry={() => refetch()} />
  if (!claim) return <LoadError message="This expense claim doesn't exist or isn't yours." />

  return <MyExpenseForm key={claim.version} claim={claim} overview={overview} />
}

type DraftLine = {
  key: string
  // Position in the stored claim, or null for a new item.
  index: number | null
  // The stored values, to tell untouched items (sent back as-is) from edited ones.
  original: string | null
  description: string
  date: string
  amount: string
  federalAmount: string
  stateAmount: string
  localTotal: string
  usd: string
  exchangeRate: string
  receipt: string | null
  previewUrl: string | null
  status: ExpenseStatus | null
  comments: string
  isUploading: boolean
  uploadError: string | null
}

function amountText(value: number | null) {
  return value === null ? "" : String(value)
}

function parseAmountInput(text: string) {
  return text.trim() === "" ? null : Number(text)
}

function snapshot(line: Pick<DraftLine, "description" | "date" | "amount" | "federalAmount" | "stateAmount" | "localTotal" | "usd" | "exchangeRate" | "receipt">) {
  return JSON.stringify([
    line.description,
    line.date,
    line.amount,
    line.federalAmount,
    line.stateAmount,
    line.localTotal,
    line.usd,
    line.exchangeRate,
    line.receipt,
  ])
}

let draftKeyCounter = 0
function nextDraftKey() {
  draftKeyCounter += 1
  return `line-${draftKeyCounter}`
}

function emptyDraft(): DraftLine {
  return {
    key: nextDraftKey(),
    index: null,
    original: null,
    description: "",
    date: "",
    amount: "",
    federalAmount: "",
    stateAmount: "",
    localTotal: "",
    usd: "",
    exchangeRate: "",
    receipt: null,
    previewUrl: null,
    status: null,
    comments: "",
    isUploading: false,
    uploadError: null,
  }
}

function toDraft(line: ExpenseLine, index: number, expenseId: string): DraftLine {
  const values = {
    description: line.description,
    date: line.date ?? "",
    amount: amountText(line.amount),
    federalAmount: amountText(line.federalAmount),
    stateAmount: amountText(line.stateAmount),
    localTotal: amountText(line.localTotal),
    usd: amountText(line.usd),
    exchangeRate: amountText(line.exchangeRate),
    receipt: line.receipt,
  }
  return {
    ...values,
    key: nextDraftKey(),
    index,
    original: snapshot(values),
    previewUrl: line.receipt ? receiptUrl(expenseId, index) : null,
    status: line.status,
    comments: line.comments,
    isUploading: false,
    uploadError: null,
  }
}

function toLineInput(line: DraftLine, isTypeChanged: boolean): ExpenseClaimFormInput["lines"][number] {
  const isUntouched = line.index !== null && line.original === snapshot(line) && !isTypeChanged
  if (line.index !== null && (line.status === "approved" || isUntouched)) return { index: line.index, keep: true }
  return {
    index: line.index,
    description: line.description,
    date: line.date,
    amount: parseAmountInput(line.amount),
    federalAmount: parseAmountInput(line.federalAmount),
    stateAmount: parseAmountInput(line.stateAmount),
    localTotal: parseAmountInput(line.localTotal),
    usd: parseAmountInput(line.usd),
    exchangeRate: parseAmountInput(line.exchangeRate),
    receipt: line.receipt ?? "",
  }
}

function sumOf(values: (number | null)[]) {
  return roundMoney(values.reduce<number>((total, value) => total + (value !== null && Number.isFinite(value) ? value : 0), 0))
}

function MyExpenseForm({ claim, overview }: { claim: ExpenseClaim | null; overview: MyExpenseClaims }) {
  const router = useRouter()
  const costCenterId = useId()
  const currencyId = useId()
  const saveClaim = useSaveMyExpenseClaim()
  const [type, setType] = useState<ExpenseType | null>(claim?.type ?? null)
  const [costCenter, setCostCenter] = useState(claim?.costCenter ?? "")
  const [currencyName, setCurrencyName] = useState(claim?.currencyName ?? overview.contract?.currencyName ?? "")
  const [lines, setLines] = useState<DraftLine[]>(() =>
    claim ? claim.lines.map((line, index) => toDraft(line, index, claim.id)) : [emptyDraft()]
  )
  const [showErrors, setShowErrors] = useState(false)
  const [isDeleteOpen, setDeleteOpen] = useState(false)
  const objectUrls = useRef(new Set<string>())

  useEffect(() => {
    const urls = objectUrls.current
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [])

  const contract = overview.contract
  const isLocked = claim ? isClaimLocked(claim) : false
  const hasApproved = lines.some((line) => line.status === "approved")
  const canSubmitNew = claim !== null || (contract !== null && contract.hasCustomer)
  const isUploading = lines.some((line) => line.isUploading)
  const isTypeChanged = claim !== null && type !== claim.type
  const canDelete = claim !== null && !hasApproved && claim.status !== "approved"
  const localCurrency = currencyName.trim() || null
  const claimedCurrency = type === "abroad" ? "USD" : localCurrency

  const input: ExpenseClaimFormInput = {
    type: type ?? ("" as ExpenseType),
    costCenter,
    currencyName,
    lines: lines.map((line) => toLineInput(line, isTypeChanged)),
    version: claim?.version ?? null,
  }
  const parsed = expenseClaimFormSchema.safeParse(input)
  const formError = parsed.success ? null : (parsed.error.issues[0]?.message ?? "Check the claim and try again.")

  const claimedTotal = sumOf(lines.map((line) => parseAmountInput(type === "abroad" ? line.usd : line.localTotal)))
  const localEquivalent = sumOf(
    lines.map((line) => abroadLocalAmount(parseAmountInput(line.usd), parseAmountInput(line.exchangeRate)))
  )

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function removeLine(key: string) {
    setLines((current) => {
      const line = current.find((item) => item.key === key)
      if (line?.previewUrl && objectUrls.current.has(line.previewUrl)) {
        URL.revokeObjectURL(line.previewUrl)
        objectUrls.current.delete(line.previewUrl)
      }
      return current.filter((item) => item.key !== key)
    })
  }

  async function attachReceipt(line: DraftLine, file: File) {
    if (file.size > MAX_RECEIPT_BYTES) {
      updateLine(line.key, { uploadError: "Receipts can be at most 5 MB." })
      return
    }
    updateLine(line.key, { isUploading: true, uploadError: null })
    try {
      const path = await uploadExpenseReceipt(file)
      const previewUrl = URL.createObjectURL(file)
      objectUrls.current.add(previewUrl)
      if (line.previewUrl && objectUrls.current.has(line.previewUrl)) {
        URL.revokeObjectURL(line.previewUrl)
        objectUrls.current.delete(line.previewUrl)
      }
      updateLine(line.key, { receipt: path, previewUrl, isUploading: false })
    } catch (error) {
      updateLine(line.key, {
        isUploading: false,
        uploadError: error instanceof Error ? error.message : "Could not upload this receipt. Try again.",
      })
    }
  }

  function handleSave() {
    setShowErrors(true)
    if (!parsed.success || isUploading || isLocked) return
    saveClaim.mutate(
      { expenseId: claim?.id ?? null, input: parsed.data },
      { onSuccess: () => router.push("/employee/expenses") }
    )
  }

  return (
    <div className="flex animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-2">
      {backLink}

      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              {claim ? expenseClaimTitle(claim) : "New expense claim"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {claim && <TimesheetStatusBadge status={claim.status} />}
              {(claim?.companyName ?? contract?.customerName) && (
                <span>Reviewed by {claim?.companyName ?? contract?.customerName}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:items-end">
            <span className="text-xs text-muted-foreground">Total claimed</span>
            <span className="text-2xl font-semibold tabular-nums">{formatMoney(claimedTotal, claimedCurrency)}</span>
            {type === "abroad" && (
              <span className="text-xs text-muted-foreground tabular-nums">
                ≈ {formatMoney(localEquivalent, localCurrency)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {!canSubmitNew && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          {contract === null
            ? "You need a contract before you can claim expenses. Contact HR if this looks wrong."
            : "Your contract has no customer to review expenses yet. Contact HR."}
        </p>
      )}
      {isLocked && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <LockIcon className="size-4" />
          Every expense in this claim has been approved, so it can no longer be changed.
        </p>
      )}
      {claim?.status === "rejected" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Some expenses were rejected. Correct them, or remove them, and save to send the claim for review again.
        </p>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)]">
          <CardTitle>Claim details</CardTitle>
          <CardDescription>
            Local expenses were paid in your local currency; abroad expenses were paid in US dollars and are converted
            with the exchange rate you enter.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-5 px-6 py-5 sm:grid-cols-3">
          <Field>
            <FieldLabel>Type</FieldLabel>
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={type ? [type] : []}
              onValueChange={(values) => {
                const next = values[0] as ExpenseType | undefined
                if (next) setType(next)
              }}
              disabled={isLocked || hasApproved}
              aria-label="Expense type"
              className="w-full"
            >
              {expenseTypes.map((option) => (
                <ToggleGroupItem key={option} value={option} className="flex-1">
                  {expenseTypeLabels[option]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {hasApproved && !isLocked && <FieldDescription>Fixed once an expense is approved.</FieldDescription>}
          </Field>
          <Field>
            <FieldLabel htmlFor={costCenterId}>Cost center</FieldLabel>
            <Input
              id={costCenterId}
              value={costCenter}
              maxLength={255}
              disabled={isLocked}
              onChange={(event) => setCostCenter(event.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={currencyId}>Local currency</FieldLabel>
            <Input
              id={currencyId}
              value={currencyName}
              maxLength={20}
              disabled={isLocked}
              onChange={(event) => setCurrencyName(event.target.value.toUpperCase())}
              placeholder="e.g. BRL"
            />
            <FieldDescription>From your contract&apos;s quotation.</FieldDescription>
          </Field>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {lines.map((line, position) => (
          <ExpenseLineCard
            key={line.key}
            line={line}
            position={position}
            type={type}
            localCurrency={localCurrency}
            isLocked={isLocked}
            canRemove={lines.length > 1 && line.status !== "approved" && !isLocked}
            onChange={(patch) => updateLine(line.key, patch)}
            onRemove={() => removeLine(line.key)}
            onAttach={(file) => attachReceipt(line, file)}
          />
        ))}
        {!isLocked && (
          <Button
            variant="outline"
            className="w-fit"
            disabled={lines.length >= MAX_EXPENSE_LINES}
            onClick={() => setLines((current) => [...current, emptyDraft()])}
          >
            <PlusIcon />
            Add another expense
          </Button>
        )}
      </div>

      {!isLocked && (
        <div className="flex flex-col items-end gap-2">
          {showErrors && formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          {saveClaim.isError && (
            <p role="alert" className="text-sm text-destructive">
              {saveClaim.error.message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {canDelete && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2Icon />
                Delete claim
              </Button>
            )}
            <Button onClick={handleSave} disabled={!canSubmitNew || isUploading || saveClaim.isPending}>
              {(saveClaim.isPending || isUploading) && <Loader2Icon className="animate-spin" />}
              {claim ? "Save and resubmit" : "Submit claim"}
            </Button>
          </div>
        </div>
      )}

      {claim && canDelete && <DeleteExpenseDialog claim={claim} open={isDeleteOpen} onOpenChange={setDeleteOpen} />}
    </div>
  )
}

type ExpenseLineCardProps = {
  line: DraftLine
  position: number
  type: ExpenseType | null
  localCurrency: string | null
  isLocked: boolean
  canRemove: boolean
  onChange: (patch: Partial<DraftLine>) => void
  onRemove: () => void
  onAttach: (file: File) => void
}

function ExpenseLineCard({
  line,
  position,
  type,
  localCurrency,
  isLocked,
  canRemove,
  onChange,
  onRemove,
  onAttach,
}: ExpenseLineCardProps) {
  const fieldId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [isPreviewBroken, setPreviewBroken] = useState(false)
  const isReadOnly = isLocked || line.status === "approved"
  const currencyLabel = localCurrency ?? "local"
  const computedLocal = abroadLocalAmount(parseAmountInput(line.usd), parseAmountInput(line.exchangeRate))

  function amountField(key: "amount" | "federalAmount" | "stateAmount" | "localTotal" | "usd" | "exchangeRate", label: string, hint?: string) {
    const id = `${fieldId}-${key}`
    return (
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={line[key]}
          disabled={isReadOnly}
          onChange={(event) => onChange({ [key]: event.target.value })}
          className="tabular-nums"
        />
        {hint && <FieldDescription>{hint}</FieldDescription>}
      </Field>
    )
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-4 [--card-spacing:--spacing(6)]">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Expense {position + 1}</CardTitle>
          {line.status && <TimesheetStatusBadge status={line.status} />}
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label={`Remove expense ${position + 1}`}
          >
            <Trash2Icon />
            Remove
          </Button>
        )}
      </CardHeader>
      {line.comments && (
        <p className="mx-6 mt-5 rounded-lg bg-muted/60 px-4 py-3 text-sm whitespace-pre-line">
          <span className="font-medium">Reviewer comment: </span>
          <span className="text-muted-foreground">{line.comments}</span>
        </p>
      )}
      <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1fr_12rem]">
        <div className="grid gap-5 sm:grid-cols-4">
          <Field className="sm:col-span-3">
            <FieldLabel htmlFor={`${fieldId}-description`}>Description</FieldLabel>
            <Input
              id={`${fieldId}-description`}
              value={line.description}
              maxLength={500}
              disabled={isReadOnly}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="e.g. Taxi to the client office"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-date`}>Date</FieldLabel>
            <Input
              id={`${fieldId}-date`}
              type="date"
              value={line.date}
              disabled={isReadOnly}
              onChange={(event) => onChange({ date: event.target.value })}
            />
          </Field>
          {type === "local" && (
            <>
              {amountField("amount", "Amount")}
              {amountField("federalAmount", "Federal tax")}
              {amountField("stateAmount", "State tax")}
              {amountField("localTotal", `Total incl. taxes (${currencyLabel})`, "Counts towards the claim.")}
            </>
          )}
          {type === "abroad" && (
            <>
              {amountField("usd", "Amount (USD)")}
              {amountField("exchangeRate", `Exchange rate to ${currencyLabel}`)}
              <Field className="sm:col-span-2">
                <FieldLabel>Amount in {currencyLabel}</FieldLabel>
                <p className="flex h-9 items-center text-sm font-medium tabular-nums">
                  {computedLocal === null ? "—" : formatMoney(computedLocal, localCurrency)}
                </p>
              </Field>
            </>
          )}
          {type === null && (
            <p className="text-sm text-muted-foreground sm:col-span-4">Choose local or abroad above to enter the amounts.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Receipt</span>
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
            {line.previewUrl && !isPreviewBroken ? (
              <a href={line.previewUrl} target="_blank" rel="noreferrer" className="absolute inset-0">
                <Image
                  src={line.previewUrl}
                  alt={`Receipt for expense ${position + 1}`}
                  fill
                  unoptimized
                  sizes="12rem"
                  className="object-cover"
                  onError={() => setPreviewBroken(true)}
                />
              </a>
            ) : (
              <span className="flex flex-col items-center gap-1 px-3 text-center text-xs text-muted-foreground">
                <ImageOffIcon className="size-5" />
                {line.receipt ? "Receipt not available" : "No receipt yet"}
              </span>
            )}
            {line.isUploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2Icon className="size-5 animate-spin text-primary" />
              </span>
            )}
          </div>
          {!isReadOnly && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept={RECEIPT_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (file) {
                    setPreviewBroken(false)
                    onAttach(file)
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={line.isUploading}
                onClick={() => fileInput.current?.click()}
              >
                <UploadIcon />
                {line.receipt ? "Replace receipt" : "Upload receipt"}
              </Button>
              <span className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 5 MB.</span>
            </>
          )}
          {line.uploadError && (
            <p role="alert" className="text-xs text-destructive">
              {line.uploadError}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

type DeleteExpenseDialogProps = {
  claim: ExpenseClaim
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DeleteExpenseDialog({ claim, open, onOpenChange }: DeleteExpenseDialogProps) {
  const router = useRouter()
  const deleteClaim = useDeleteMyExpenseClaim()

  function handleOpenChange(open: boolean) {
    if (!open) deleteClaim.reset()
    onOpenChange(open)
  }

  function handleDelete() {
    deleteClaim.mutate(claim.id, { onSuccess: () => router.push("/employee/expenses") })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this expense claim?</AlertDialogTitle>
          <AlertDialogDescription>
            {expenseClaimTitle(claim)} · {claim.lines.length} {claim.lines.length === 1 ? "expense" : "expenses"}. The
            claim and its receipts are removed for good.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteClaim.isError && (
          <p role="alert" className="text-sm text-destructive">
            {deleteClaim.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteClaim.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteClaim.isPending}>
            {deleteClaim.isPending && <Loader2Icon className="animate-spin" />}
            Delete claim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
