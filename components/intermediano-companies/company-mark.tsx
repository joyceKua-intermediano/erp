import { cn } from "cn"

function initialsOf(name: string) {
  const [firstWord] = name
    .replace(/^intermediano\s+/i, "")
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word))
  return (firstWord ?? name).slice(0, 2).toUpperCase()
}

export function CompanyMark({ name, size = "default" }: { name: string; size?: "default" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary",
        size === "lg" ? "size-14 text-lg" : "size-9 text-xs"
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
