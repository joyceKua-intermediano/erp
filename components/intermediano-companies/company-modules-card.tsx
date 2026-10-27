"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field"
import { useSaveCompanyModules } from "@/hooks/use-clusters"
import { clusterModuleDetails, clusterModuleKeys, type ClusterModuleKey } from "@/lib/cluster-modules"

type CompanyModulesCardProps = {
  companyId: string
  modules: ClusterModuleKey[]
  canManage: boolean
}

export function CompanyModulesCard({ companyId, modules, canManage }: CompanyModulesCardProps) {
  const [selected, setSelected] = useState<ClusterModuleKey[]>(modules)
  const saveModules = useSaveCompanyModules()
  const isDirty = selected.length !== modules.length || selected.some((module) => !modules.includes(module))

  function toggleModule(module: ClusterModuleKey, checked: boolean) {
    setSelected((current) => (checked ? [...current, module] : current.filter((key) => key !== module)))
  }

  return (
    <Card className="[--card-spacing:--spacing(5)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Modules
          <Badge className="bg-primary/10 text-primary tabular-nums">
            {modules.length} of {clusterModuleKeys.length}
          </Badge>
        </CardTitle>
        <CardDescription>What this entity offers. Disabled modules are hidden from its cluster workspace.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2" role="group" aria-label="Enabled modules">
          {clusterModuleKeys.map((module) => (
            <FieldLabel key={module} htmlFor={`module-${module}`}>
              <Field orientation="horizontal">
                <Checkbox
                  id={`module-${module}`}
                  checked={selected.includes(module)}
                  onCheckedChange={(checked) => toggleModule(module, checked)}
                  disabled={!canManage || saveModules.isPending}
                />
                <FieldContent>
                  <FieldTitle>{clusterModuleDetails[module].label}</FieldTitle>
                  <FieldDescription>{clusterModuleDetails[module].description}</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          ))}
        </div>
        {saveModules.error && <FieldError errors={[{ message: saveModules.error.message }]} />}
        {canManage && isDirty && (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={saveModules.isPending}
              onClick={() => {
                saveModules.reset()
                setSelected(modules)
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saveModules.isPending}
              onClick={() => saveModules.mutate({ companyId, modules: selected })}
            >
              {saveModules.isPending ? "Saving…" : "Save modules"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
