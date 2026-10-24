"use client"

import { GlobeIcon, RefreshCwIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { useAssignableClusters } from "@/hooks/use-clusters"

type ClusterAccessCardProps = {
  allClusters: boolean
  clusterIds: string[]
  readOnly: boolean
  errors?: string[]
  onChange: (next: { allClusters: boolean; clusterIds: string[] }) => void
}

const scopeOptions = [
  { value: "all", title: "All clusters", description: "Includes any Intermediano company added later." },
  { value: "selected", title: "Only selected clusters", description: "Limit this role to specific companies." },
] as const

export function ClusterAccessCard({ allClusters, clusterIds, readOnly, errors, onChange }: ClusterAccessCardProps) {
  const { data: clusters, isPending, isError, refetch } = useAssignableClusters()
  const selected = new Set(clusterIds)

  function toggleCluster(clusterId: string, checked: boolean) {
    const next = checked ? [...clusterIds, clusterId] : clusterIds.filter((id) => id !== clusterId)
    onChange({ allClusters, clusterIds: next })
  }

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Cluster access
          <Badge className="bg-primary/10 text-primary tabular-nums">
            {allClusters ? "All clusters" : `${clusterIds.length} of ${clusters?.length ?? "…"}`}
          </Badge>
        </CardTitle>
        <CardDescription>
          Which Intermediano companies this role can pick in the cluster switcher. This limits the cluster workspace
          modules: quotations, employees, contracts, timesheets, expenses and payroll.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <RadioGroup
          value={allClusters ? "all" : "selected"}
          onValueChange={(value) => onChange({ allClusters: value === "all", clusterIds })}
          disabled={readOnly}
          className="grid gap-3 sm:grid-cols-2"
          aria-label="Cluster access"
        >
          {scopeOptions.map((option) => (
            <FieldLabel key={option.value} htmlFor={`cluster-scope-${option.value}`}>
              <Field orientation="horizontal">
                <RadioGroupItem id={`cluster-scope-${option.value}`} value={option.value} />
                <FieldContent>
                  <FieldTitle>{option.title}</FieldTitle>
                  <FieldDescription>{option.description}</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>

        {!allClusters && (
          <div className="flex flex-col gap-3">
            {isPending ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            ) : isError ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                Clusters couldn&apos;t be loaded.
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCwIcon />
                  Try again
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Allowed clusters">
                {clusters.map((cluster) => (
                  <FieldLabel key={cluster.id} htmlFor={`cluster-${cluster.id}`}>
                    <Field orientation="horizontal">
                      <Checkbox
                        id={`cluster-${cluster.id}`}
                        checked={selected.has(cluster.id)}
                        onCheckedChange={(checked) => toggleCluster(cluster.id, checked)}
                        disabled={readOnly}
                      />
                      <FieldContent>
                        <FieldTitle>{cluster.label}</FieldTitle>
                        <FieldDescription className="flex items-center gap-1.5">
                          <GlobeIcon className="size-3.5" />
                          {cluster.country}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </div>
            )}
            <FieldError errors={errors?.map((message) => ({ message }))} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
