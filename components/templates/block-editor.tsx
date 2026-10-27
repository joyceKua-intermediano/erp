"use client"

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BriefcaseBusinessIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  HeadingIcon,
  PenLineIcon,
  PilcrowIcon,
  PlusIcon,
  SeparatorHorizontalIcon,
  TableIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  blockConditionLabels,
  blockConditions,
  blockTypeDescriptions,
  blockTypeLabels,
  createBlock,
  emptyDetailRow,
  type BlockCondition,
  type DetailRow,
  type TemplateBlock,
  type TemplateBlockType,
  type TemplateDocument,
} from "@/lib/templates/blocks"

export type TextTarget = {
  element: HTMLInputElement | HTMLTextAreaElement
  setValue: (value: string) => void
}

type BlockEditorContextValue = {
  readOnly: boolean
  bilingual: boolean
  onFocusText: (target: TextTarget) => void
}

const BlockEditorContext = createContext<BlockEditorContextValue>({
  readOnly: false,
  bilingual: false,
  onFocusText: () => {},
})

const blockIcons: Record<TemplateBlockType, LucideIcon> = {
  title: HeadingIcon,
  clause: PilcrowIcon,
  details: TableIcon,
  jobDescription: BriefcaseBusinessIcon,
  signatures: PenLineIcon,
  pageBreak: SeparatorHorizontalIcon,
}

const blockTypes = Object.keys(blockTypeLabels) as TemplateBlockType[]

// "long" is for clause text; "short" is a one-line box that still grows when the value wraps.
function TextField({
  label,
  value,
  onChange,
  placeholder,
  size = "line",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  size?: "line" | "short" | "long"
}) {
  const { readOnly, onFocusText } = useContext(BlockEditorContext)
  const shared = {
    value,
    placeholder,
    readOnly,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    onFocus: (event: { currentTarget: HTMLInputElement | HTMLTextAreaElement }) =>
      onFocusText({ element: event.currentTarget, setValue: onChange }),
  }

  return (
    <Field className="gap-1.5">
      <FieldLabel className="text-xs text-muted-foreground">{label}</FieldLabel>
      {size === "line" ? (
        <Input {...shared} />
      ) : (
        <Textarea {...shared} rows={1} className={size === "long" ? "min-h-28" : "min-h-8 py-1.5"} />
      )}
    </Field>
  )
}

// Contract language and English sit side by side when the editor is wide enough, and stack when it isn't.
function Sides({ primary, translation }: { primary: ReactNode; translation: ReactNode }) {
  const { bilingual } = useContext(BlockEditorContext)
  if (!bilingual) return <div className="@container flex flex-col gap-3">{primary}</div>
  return (
    <div className="grid gap-4 @2xl:grid-cols-2">
      <div className="@container flex flex-col gap-3">{primary}</div>
      <div className="@container flex flex-col gap-3 border-t pt-4 @2xl:border-t-0 @2xl:border-l @2xl:pt-0 @2xl:pl-4">
        {translation}
      </div>
    </div>
  )
}

function DetailsRows({ rows, onChange }: { rows: DetailRow[]; onChange: (rows: DetailRow[]) => void }) {
  const { readOnly, bilingual } = useContext(BlockEditorContext)

  function updateRow(index: number, patch: Partial<DetailRow>) {
    onChange(rows.map((row, current) => (current === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={index} className="flex gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex-1">
            <Sides
              primary={
                <div className="grid gap-2 @sm:grid-cols-[1fr_2fr]">
                  <TextField
                    label="Label"
                    value={row.label}
                    onChange={(label) => updateRow(index, { label })}
                    placeholder="Trabajador"
                    size="short"
                  />
                  <TextField
                    label="Value"
                    value={row.value}
                    onChange={(value) => updateRow(index, { value })}
                    placeholder="{Employee: Full name}"
                    size="short"
                  />
                </div>
              }
              translation={
                <div className="grid gap-2 @sm:grid-cols-[1fr_2fr]">
                  <TextField
                    label="Label (English)"
                    value={row.labelTranslation}
                    onChange={(labelTranslation) => updateRow(index, { labelTranslation })}
                    placeholder="Employee"
                    size="short"
                  />
                  <TextField
                    label="Value (English, optional)"
                    value={row.valueTranslation}
                    onChange={(valueTranslation) => updateRow(index, { valueTranslation })}
                    placeholder="Same as the left value"
                    size="short"
                  />
                </div>
              }
            />
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="self-start text-muted-foreground"
              aria-label={`Remove row ${index + 1}`}
              onClick={() => onChange(rows.filter((_, current) => current !== index))}
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...rows, emptyDetailRow()])}>
          <PlusIcon />
          Add row
        </Button>
      )}
      {bilingual && (
        <p className="text-xs text-muted-foreground">Leave an English value empty to reuse the left value.</p>
      )}
    </div>
  )
}

function BlockFields({ block, update }: { block: TemplateBlock; update: (block: TemplateBlock) => void }) {
  switch (block.type) {
    case "title":
      return (
        <Sides
          primary={<TextField label="Title" value={block.text} onChange={(text) => update({ ...block, text })} />}
          translation={
            <TextField
              label="Subtitle (English)"
              value={block.translation}
              onChange={(translation) => update({ ...block, translation })}
            />
          }
        />
      )
    case "clause":
      return (
        <Sides
          primary={
            <>
              <TextField
                label="Heading (optional)"
                value={block.heading}
                onChange={(heading) => update({ ...block, heading })}
                placeholder="PRIMERA. – OBJETO."
              />
              <TextField
                label="Text"
                value={block.text}
                onChange={(text) => update({ ...block, text })}
                placeholder="Leave a blank line between paragraphs."
                size="long"
              />
            </>
          }
          translation={
            <>
              <TextField
                label="Heading (English)"
                value={block.headingTranslation}
                onChange={(headingTranslation) => update({ ...block, headingTranslation })}
                placeholder="FIRST. – PURPOSE."
              />
              <TextField
                label="Text (English)"
                value={block.translation}
                onChange={(translation) => update({ ...block, translation })}
                size="long"
              />
            </>
          }
        />
      )
    case "details":
      return <DetailsRows rows={block.rows} onChange={(rows) => update({ ...block, rows })} />
    case "jobDescription":
      return (
        <Sides
          primary={
            <TextField label="Heading" value={block.heading} onChange={(heading) => update({ ...block, heading })} />
          }
          translation={
            <TextField
              label="Heading (English)"
              value={block.headingTranslation}
              onChange={(headingTranslation) => update({ ...block, headingTranslation })}
            />
          }
        />
      )
    default:
      return <p className="text-sm text-muted-foreground">{blockTypeDescriptions[block.type]}</p>
  }
}

function firstLine(text: string) {
  return text.trim().split("\n")[0] ?? ""
}

// The one-line description shown on a collapsed block, so admins can scan the whole contract.
function blockSummary(block: TemplateBlock) {
  switch (block.type) {
    case "title":
      return firstLine(block.text)
    case "clause":
      return firstLine(block.heading) || firstLine(block.text)
    case "details": {
      const labels = block.rows.map((row) => row.label.trim()).filter(Boolean)
      return `${block.rows.length} ${block.rows.length === 1 ? "row" : "rows"}${labels.length ? `: ${labels.join(", ")}` : ""}`
    }
    case "jobDescription":
      return firstLine(block.heading)
    default:
      return ""
  }
}

function BlockCard({
  block,
  index,
  total,
  collapsed,
  onToggle,
  update,
  move,
  remove,
}: {
  block: TemplateBlock
  index: number
  total: number
  collapsed: boolean
  onToggle: () => void
  update: (block: TemplateBlock) => void
  move: (offset: -1 | 1) => void
  remove: () => void
}) {
  const { readOnly } = useContext(BlockEditorContext)
  const Icon = blockIcons[block.type]
  const conditionItems = blockConditions.map((condition) => ({ label: blockConditionLabels[condition], value: condition }))
  const summary = blockSummary(block)
  const hasFields = block.type !== "signatures" && block.type !== "pageBreak"

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4",
        collapsed && "py-2.5",
        block.condition !== "always" && "border-dashed border-primary/40"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          disabled={!hasFields}
          aria-expanded={hasFields ? !collapsed : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left disabled:cursor-default"
        >
          {hasFields ? (
            <ChevronRightIcon
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !collapsed && "rotate-90")}
            />
          ) : (
            <span className="size-4 shrink-0" />
          )}
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="shrink-0 text-sm font-medium">
            {index + 1}. {blockTypeLabels[block.type]}
          </span>
          {collapsed && summary && <span className="truncate text-sm text-muted-foreground">· {summary}</span>}
        </button>
        <div className="ml-auto flex items-center gap-1">
          <Select
            value={block.condition}
            onValueChange={(value) => update({ ...block, condition: (value as BlockCondition | null) ?? "always" })}
            items={conditionItems}
            disabled={readOnly}
          >
            <SelectTrigger size="sm" className="w-52" aria-label={`When to show block ${index + 1}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {conditionItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!readOnly && (
            <>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => move(-1)}>
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Move down"
                disabled={index === total - 1}
                onClick={() => move(1)}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Delete block ${index + 1}`}
                onClick={remove}
              >
                <Trash2Icon />
              </Button>
            </>
          )}
        </div>
      </div>
      {(!collapsed || !hasFields) && <BlockFields block={block} update={update} />}
    </li>
  )
}

function AddBlockMenu({ onAdd }: { onAdd: (type: TemplateBlockType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" className="w-full border-dashed">
            <PlusIcon />
            Add block
          </Button>
        }
      />
      <DropdownMenuContent align="center" className="w-80">
        {blockTypes.map((type) => {
          const Icon = blockIcons[type]
          return (
            <DropdownMenuItem key={type} onClick={() => onAdd(type)} className="items-start gap-3 py-2">
              <Icon className="mt-0.5" />
              <span className="flex flex-col">
                <span className="font-medium">{blockTypeLabels[type]}</span>
                <span className="text-xs text-muted-foreground">{blockTypeDescriptions[type]}</span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type BlockEditorProps = {
  document: TemplateDocument
  setDocument: Dispatch<SetStateAction<TemplateDocument>>
  readOnly: boolean
  onFocusText: (target: TextTarget) => void
}

export function BlockEditor({ document, setDocument, readOnly, onFocusText }: BlockEditorProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())
  const allCollapsed = document.blocks.length > 0 && document.blocks.every((block) => collapsedIds.has(block.id))

  function toggleBlock(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updateBlock(id: string, next: TemplateBlock) {
    setDocument((current) => ({ ...current, blocks: current.blocks.map((block) => (block.id === id ? next : block)) }))
  }

  function moveBlock(index: number, offset: -1 | 1) {
    setDocument((current) => {
      const blocks = [...current.blocks]
      const target = index + offset
      if (target < 0 || target >= blocks.length) return current
      ;[blocks[index], blocks[target]] = [blocks[target], blocks[index]]
      return { ...current, blocks }
    })
  }

  function removeBlock(id: string) {
    setDocument((current) => ({ ...current, blocks: current.blocks.filter((block) => block.id !== id) }))
  }

  function addBlock(type: TemplateBlockType) {
    setDocument((current) => ({ ...current, blocks: [...current.blocks, createBlock(type)] }))
  }

  return (
    <BlockEditorContext.Provider value={{ readOnly, bilingual: document.bilingual, onFocusText }}>
      <div className="@container flex flex-col gap-4">
        <div className="grid gap-3 @xl:grid-cols-2">
          <FieldLabel>
            <Field orientation="horizontal">
              <Checkbox
                checked={document.bilingual}
                disabled={readOnly}
                onCheckedChange={(checked) => setDocument((current) => ({ ...current, bilingual: checked }))}
              />
              <FieldContent>
                <FieldTitle>Two languages side by side</FieldTitle>
                <FieldDescription>Each clause is one row: contract language left, English right.</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
          {document.bilingual && (
            <FieldLabel>
              <Field orientation="horizontal">
                <Checkbox
                  checked={document.bordered}
                  disabled={readOnly}
                  onCheckedChange={(checked) => setDocument((current) => ({ ...current, bordered: checked }))}
                />
                <FieldContent>
                  <FieldTitle>Table borders</FieldTitle>
                  <FieldDescription>Draws the rows as one bordered table, like the legacy contracts.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          )}
        </div>

        {document.blocks.length > 0 && (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {document.blocks.length} {document.blocks.length === 1 ? "block" : "blocks"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setCollapsedIds(allCollapsed ? new Set() : new Set(document.blocks.map((block) => block.id)))
              }
            >
              {allCollapsed ? <ChevronsUpDownIcon /> : <ChevronsDownUpIcon />}
              {allCollapsed ? "Expand all" : "Collapse all"}
            </Button>
          </div>
        )}

        {document.blocks.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No blocks yet. Add a title, then the clauses of the contract.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {document.blocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                index={index}
                total={document.blocks.length}
                collapsed={collapsedIds.has(block.id)}
                onToggle={() => toggleBlock(block.id)}
                update={(next) => updateBlock(block.id, next)}
                move={(offset) => moveBlock(index, offset)}
                remove={() => removeBlock(block.id)}
              />
            ))}
          </ol>
        )}

        {!readOnly && <AddBlockMenu onAdd={addBlock} />}
      </div>
    </BlockEditorContext.Provider>
  )
}
