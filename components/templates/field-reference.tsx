"use client"

import { useMemo, useState } from "react"
import { CheckIcon, CopyIcon, SearchIcon } from "lucide-react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"
import { listRenderFields } from "@/lib/contracts/render-data-schema"

const typeHints: Record<string, string> = {
  date: "date: .iso .short .long .longEn",
  list: "list",
  group: "group",
  number: "number",
  "yes/no": "yes/no",
  text: "text",
}

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
