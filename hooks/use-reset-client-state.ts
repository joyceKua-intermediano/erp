import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { useUiStore } from "@/store/use-ui-store"

// Query keys aren't scoped to the signed-in person, so cached data must go whenever the session changes.
export function useResetClientState() {
  const queryClient = useQueryClient()

  return useCallback(() => {
    queryClient.clear()
    useUiStore.getState().resetUi()
  }, [queryClient])
}
