import { create } from 'zustand';

interface SystemState {
  /** Resultado de navigator.storage.persist() al arrancar (null = sin resolver). */
  persisted: boolean | null;
  setPersisted: (v: boolean) => void;
}

export const useSystemStore = create<SystemState>()((set) => ({
  persisted: null,
  setPersisted: (persisted) => set({ persisted }),
}));

/** Se pide al iniciar; en una PWA instalada Android suele concederlo. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    const already = await navigator.storage.persisted();
    const granted = already || (await navigator.storage.persist());
    useSystemStore.getState().setPersisted(granted);
    return granted;
  } catch {
    useSystemStore.getState().setPersisted(false);
    return false;
  }
}
