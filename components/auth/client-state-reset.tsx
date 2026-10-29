"use client"

import { useEffect } from "react"
import { useResetClientState } from "@/hooks/use-reset-client-state"

// Every sign-out and expired session lands on a login page, and every sign-in starts there, so clearing here
// keeps one person's cached data from showing to the next person in the same tab.
export function ClientStateReset() {
  const resetClientState = useResetClientState()

  useEffect(() => {
    resetClientState()
  }, [resetClientState])

  return null
}
