import { create } from "zustand"
import type { ClusterId } from "@/lib/clusters"

export type UiOverlay = {
  id: string
  payload?: unknown
}

type UiState = {
  isSidebarOpen: boolean
  activeCluster: ClusterId | null
  activeSheet: UiOverlay | null
  activeModal: UiOverlay | null
}

type UiActions = {
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setActiveCluster: (cluster: ClusterId | null) => void
  openSheet: (id: string, payload?: unknown) => void
  closeSheet: () => void
  openModal: (id: string, payload?: unknown) => void
  closeModal: () => void
  resetUi: () => void
}

const initialUiState: UiState = {
  isSidebarOpen: true,
  activeCluster: null,
  activeSheet: null,
  activeModal: null,
}

export const useUiStore = create<UiState & UiActions>()((set) => ({
  ...initialUiState,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActiveCluster: (cluster) => set({ activeCluster: cluster }),
  openSheet: (id, payload) => set({ activeSheet: { id, payload } }),
  closeSheet: () => set({ activeSheet: null }),
  openModal: (id, payload) => set({ activeModal: { id, payload } }),
  closeModal: () => set({ activeModal: null }),
  resetUi: () => set(initialUiState),
}))
