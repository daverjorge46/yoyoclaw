import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

export interface UIState {
  sidebarCollapsed: boolean;
  theme: Theme;
  powerUserMode: boolean;
}

export interface UIActions {
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setPowerUserMode: (enabled: boolean) => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // State
      sidebarCollapsed: false,
      theme: "dark",
      powerUserMode: false,

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      setPowerUserMode: (enabled) => set({ powerUserMode: enabled }),
    }),
    { name: "ui-preferences" }
  )
);
