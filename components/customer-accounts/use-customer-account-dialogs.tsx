"use client"

import { useState } from "react"
import type { CustomerAccount, CustomerAccountOption } from "@/lib/customer-accounts"
import { ArchiveCustomerAccountDialog } from "./archive-customer-account-dialog"
import type { CustomerAccountHandlers } from "./customer-account-actions"
import { CustomerAccountFormSheet } from "./customer-account-form-sheet"
import { ResetPasswordDialog } from "./reset-password-dialog"

// The add/edit sheet and the reset and archive dialogs, shared by the global list and the company card.
export function useCustomerAccountDialogs(lockedCompany?: CustomerAccountOption) {
  const [sheet, setSheet] = useState<{ open: boolean; account: CustomerAccount | null; key: number }>({
    open: false,
    account: null,
    key: 0,
  })
  const [resetting, setResetting] = useState<CustomerAccount | null>(null)
  const [archiving, setArchiving] = useState<CustomerAccount | null>(null)

  function openSheet(account: CustomerAccount | null) {
    setSheet((current) => ({ open: true, account, key: current.key + 1 }))
  }

  const handlers: CustomerAccountHandlers = {
    onEdit: openSheet,
    onResetPassword: setResetting,
    onToggleArchived: setArchiving,
  }

  const dialogs = (
    <>
      <CustomerAccountFormSheet
        open={sheet.open}
        account={sheet.account}
        formKey={sheet.key}
        lockedCompany={sheet.account ? undefined : lockedCompany}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
      />
      <ResetPasswordDialog account={resetting} onOpenChange={(open) => !open && setResetting(null)} />
      <ArchiveCustomerAccountDialog account={archiving} onOpenChange={(open) => !open && setArchiving(null)} />
    </>
  )

  return { openCreate: () => openSheet(null), handlers, dialogs }
}
