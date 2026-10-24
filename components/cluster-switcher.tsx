"use client"

import { ChevronsUpDownIcon, GlobeIcon } from "lucide-react"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useActiveCluster, useClusters } from "@/hooks/use-clusters"
import { clusterIdSchema } from "@/lib/clusters"
import { useUiStore } from "@/store/use-ui-store"

function subscribeToNothing() {
  return () => {}
}

export function ClusterSwitcher() {
  const { data: clusters, isPending, isError } = useClusters()
  const activeCluster = useActiveCluster()
  const setActiveCluster = useUiStore((state) => state.setActiveCluster)
  // Server HTML is always rendered as pending; the client cache may already be filled by the time this hydrates.
  const isHydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false)
  const activeLabel =
    activeCluster?.label ?? (!isHydrated || isPending ? "Loading clusters…" : "Select a cluster")

  function handleValueChange(value: unknown) {
    const parsed = clusterIdSchema.safeParse(value)
    if (parsed.success && clusters?.some((cluster) => cluster.id === parsed.data)) {
      setActiveCluster(parsed.data)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="h-10 gap-3 rounded-xl border-primary/30 px-3 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:border-primary focus-visible:ring-primary/25 aria-expanded:border-primary aria-expanded:bg-primary/5 dark:border-primary/50"
          >
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GlobeIcon className="size-3.5" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[0.65rem] font-medium tracking-wider text-muted-foreground uppercase">
                Active cluster
              </span>
              <span className="text-sm font-semibold">{activeLabel}</span>
            </span>
            <ChevronsUpDownIcon className="text-primary" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Intermediano Group Companies</DropdownMenuLabel>
          {isPending && <p className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</p>}
          {isError && <p className="px-2 py-1.5 text-sm text-muted-foreground">Couldn&apos;t load clusters.</p>}
          {clusters?.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No companies found.</p>
          )}
          <DropdownMenuRadioGroup value={activeCluster?.id ?? ""} onValueChange={handleValueChange}>
            {clusters?.map((cluster) => (
              <DropdownMenuRadioItem
                key={cluster.id}
                value={cluster.id}
                closeOnClick
                className="focus:bg-primary/10 focus:text-primary data-checked:font-medium data-checked:text-primary"
              >
                {cluster.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
