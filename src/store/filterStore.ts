import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

interface FilterState {
  /** true/false explícito por grupo; ausente = usar el default del viewport. */
  openGroups: Record<string, boolean>;
  setGroupOpen: (id: string, open: boolean) => void;
}

/** Recuerda qué grupos de filtros dejó abiertos el usuario (IndexedDB). */
export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      openGroups: {},
      setGroupOpen: (id, open) => set({ openGroups: { ...get().openGroups, [id]: open } }),
    }),
    {
      name: 'gigrep.v1.filters',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ openGroups: s.openGroups }),
    },
  ),
);
