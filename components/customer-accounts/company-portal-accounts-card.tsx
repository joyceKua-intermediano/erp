"use client"

import { KeyRoundIcon, PlusIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompanyCustomerAccounts } from "@/hooks/use-customer-accounts"
import { CUSTOMER_PORTAL_LOGIN_PATH } from "@/lib/customer-accounts"
import { CustomerAccountActions, CustomerAccountStatusBadge } from "./customer-account-actions"
import { useCustomerAccountDialogs } from "./use-customer-account-dialogs"

type CompanyPortalAccountsCardProps = {
  company: { id: string; name: string }
  canManage: boolean
}

export function CompanyPortalAccountsCard({ company, canManage }: CompanyPortalAccountsCardProps) {
  const { data: accounts, isPending, isError, refetch } = useCompanyCustomerAccounts(company.id)
  const { openCreate, handlers, dialogs } = useCustomerAccountDialogs(company)
  const activeCount = accounts?.filter((account) => !account.archived).length ?? 0

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-1 border-b py-5 [--card-spacing:--spacing(6)] sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-primary" />
            Portal accounts
          </CardTitle>
          <CardDescription>
            {isPending
              ? "People at this company who can sign in to the Client portal."
              : activeCount === 0
                ? "No one at this company can sign in to the Client portal yet."
                : `${activeCount} ${activeCount === 1 ? "person" : "people"} can sign in to the Client portal.`}
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={openCreate}>
            <PlusIcon />
            Add portal account
          </Button>
        )}
      </CardHeader>

      {isPending ? (
        <div className="flex flex-col gap-3 px-6 py-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">Portal accounts couldn&apos;t be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon />
            Try again
          </Button>
        </div>
      ) : accounts.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">No portal accounts yet.</p>
      ) : (
        <ul className="divide-y">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center gap-3 px-6 py-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">{account.name}</span>
                <span className="truncate text-xs text-muted-foreground">{account.email}</span>
              </div>
              <CustomerAccountStatusBadge archived={account.archived} />
              {canManage && <CustomerAccountActions account={account} handlers={handlers} />}
            </li>
          ))}
        </ul>
      )}

      <CardFooter className="px-6 py-3 text-xs text-muted-foreground">
        Customers sign in at {CUSTOMER_PORTAL_LOGIN_PATH} with the email and password set here.
      </CardFooter>

      {canManage && dialogs}
    </Card>
  )
}
