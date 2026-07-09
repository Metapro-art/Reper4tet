import { del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/**
 * Adaptador de persistencia sobre IndexedDB (idb-keyval).
 * Todo el estado del usuario vive aquí — nada de red, nada de backend.
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};
