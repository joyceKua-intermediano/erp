"use client"

import { useMemo, useState } from "react"
import { CheckIcon, CopyIcon, PlusIcon, SearchIcon } from "lucide-react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"
import { listRenderFields } from "@/lib/contracts/render-data-schema"
import { listInsertableFields, type InsertableField } from "@/lib/templates/blocks"

// Block editor: clicking a field inserts it at the cursor of the last text box the admin clicked in.
export function InsertFieldPanel({
  onInsert,
  hint,
}: {
  onInsert: (field: InsertableField) => void
  hint: string | null
}) {
  const [search, setSearch] = useState("")
  const fields = useMemo(() => listInsertableFields(), [])

  const needle = search.trim().toLowerCase()
  const visible = needle
    ? fields.filter((field) => field.label.toLowerCase().includes(needle) || field.description.toLowerCase().includes(needle))
    : fields
  const groups = [...new Set(visible.map((field) => field.group))]

  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Click inside a text box on the left, then pick a field. It&apos;s added as{" "}
        <code className="rounded bg-muted px-1">{"{Employee: Full name}"}</code> and replaced with the real value in the
        PDF. Empty values print as a blank line.
      </p>
      {hint && (
        <p role="status" className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
          {hint}
        </p>
      )}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search fields…"
          aria-label="Search fields"
          className="pl-8"
        />
      </div>
      <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {groups.map((group) => (
          <section key={group} className="flex flex-col">
            <h3 className="px-2 pb-1 text-xs font-semibold tracking-wide text-primary uppercase">{group}</h3>
            <ul className="flex flex-col">
              {visible
                .filter((field) => field.group === group)
                .map((field) => (
                  <li key={field.token}>
                    <button
                      type="button"
                      // Keeps focus (and the cursor position) in the text box being edited.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onInsert(field)}
                      className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-primary/5"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm">{field.label.slice(group.length + 2)}</span>
                        <span className="text-xs text-muted-foreground">{field.description}</span>
                      </span>
                      <PlusIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && <p className="px-2 text-sm text-muted-foreground">No fields match your search.</p>}
      </div>
    </div>
  )
}

const typeHints: Record<string, string> = {
  date: "date: .iso .short .long .longEn",
  list: "list",
  group: "group",
  number: "number",
  "yes/no": "yes/no",
  text: "text",
}

// Code mode: copies the Typst path of a field.
export function FieldReference() {
  const [search, setSearch] = useState("")
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const fields = useMemo(() => listRenderFields(), [])

  const needle = search.trim().toLowerCase()
  const visibleFields = needle
    ? fields.filter((field) => field.path.toLowerCase().includes(needle) || field.description.toLowerCase().includes(needle))
    : fields

  async function copy(path: string) {
    try {
      await navigator.clipboard.writeText(`#${path}`)
      setCopiedPath(path)
      window.setTimeout(() => setCopiedPath((current) => (current === path ? null : current)), 1500)
    } catch {
      setCopiedPath(null)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Every template starts with <code className="rounded bg-muted px-1">#let data = json(bytes(sys.inputs.data))</code>.
        Click a field to copy it. Fields marked &ldquo;may be empty&rdquo; can be <code className="rounded bg-muted px-1">none</code>;
        wrap them in <code className="rounded bg-muted px-1">#field(…)</code> to print a blank line instead.
      </p>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search fields…"
          aria-label="Search fields"
          className="pl-8"
        />
      </div>
      <ul className="-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {visibleFields.map((field) => {
          const depth = field.path.split(".").length - 2
          const isGroup = field.type === "group"
          return (
            <li key={field.path}>
              <button
                type="button"
                onClick={() => copy(field.path)}
                className={cn(
                  "group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-primary/5",
                  isGroup && "mt-2"
                )}
                style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <code className={cn("truncate text-xs", isGroup ? "font-semibold text-primary" : "text-foreground")}>
                    {field.path}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {field.description}
                    {!isGroup && ` · ${typeHints[field.type]}`}
                    {field.nullable && " · may be empty"}
                  </span>
                </span>
                {copiedPath === field.path ? (
                  <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-label="Copied" />
                ) : (
                  <CopyIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
