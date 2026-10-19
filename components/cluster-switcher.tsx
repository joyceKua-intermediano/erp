"use client"

import { ChevronsUpDownIcon, GlobeIcon } from "lucide-react"
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
import { clusterIdSchema, clusters, getCluster } from "@/lib/clusters"
import { useUiStore } from "@/store/use-ui-store"

export function ClusterSwitcher() {
  const activeCluster = useUiStore((state) => state.activeCluster)
  const setActiveCluster = useUiStore((state) => state.setActiveCluster)
  const activeLabel = activeCluster ? getCluster(activeCluster).label : "Select a cluster"

  function handleValueChange(value: unknown) {
    const parsed = clusterIdSchema.safeParse(value)
    if (parsed.success) {
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
          <DropdownMenuRadioGroup value={activeCluster ?? ""} onValueChange={handleValueChange}>
            {clusters.map((cluster) => (
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
