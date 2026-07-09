import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SetEntry, SetList, SetProfile } from '../types';
import { idbStorage } from './idbStorage';

const now = () => new Date().toISOString();

function touch(s: SetList, patch: Partial<SetList>): SetList {
  return { ...s, ...patch, updatedAt: now() };
}

function isProfile(v: unknown): v is SetProfile {
  return v === 'jazz' || v === 'ballroom' || v === 'cocktail';
}

/**
 * Normaliza un set posiblemente heredado: `kind` → `profile` y descarta el
 * viejo `durationMin` por entrada (ahora la duración se calcula). Se usa al
 * migrar el almacenamiento y al restaurar un respaldo.
 */
export function normalizeSet(raw: unknown): SetList {
  const s = (raw ?? {}) as Record<string, unknown>;
  const profile: SetProfile = isProfile(s.profile)
    ? s.profile
    : s.kind === 'ballroom'
      ? 'ballroom'
      : 'jazz';
  const rawEntries = Array.isArray(s.entries) ? s.entries : [];
  const entries: SetEntry[] = rawEntries.map((e) => {
    const en = (e ?? {}) as Record<string, unknown>;
    const out: SetEntry = { tuneId: String(en.tuneId) };
    if (typeof en.headsIn === 'number') out.headsIn = en.headsIn;
    if (typeof en.soloChoruses === 'number') out.soloChoruses = en.soloChoruses;
    if (typeof en.headsOut === 'number') out.headsOut = en.headsOut;
    return out;
  });
  return {
    id: String(s.id ?? crypto.randomUUID()),
    name: String(s.name ?? 'Set'),
    profile,
    entries,
    createdAt: String(s.createdAt ?? now()),
    updatedAt: String(s.updatedAt ?? now()),
  };
}

interface SetsState {
  sets: SetList[];
  createSet: (name: string, profile: SetProfile) => string;
  updateSet: (id: string, patch: Partial<Pick<SetList, 'name' | 'profile'>>) => void;
  duplicateSet: (id: string) => string | null;
  deleteSet: (id: string) => void;
  /** false si el tema ya estaba en el set. */
  addEntry: (setId: string, tuneId: string) => boolean;
  removeEntry: (setId: string, index: number) => void;
  moveEntry: (setId: string, from: number, to: number) => void;
  /** Vueltas de solo (undefined = volver al valor del perfil). */
  setEntrySolo: (setId: string, index: number, value: number | undefined) => void;
  /** Cabeza de salida: 1 entera, 0.5 media, undefined = perfil. */
  setEntryHeadsOut: (setId: string, index: number, value: number | undefined) => void;
  replaceSets: (sets: SetList[]) => void;
  resetLocal: () => void;
}

function mapSet(sets: SetList[], id: string, fn: (s: SetList) => SetList): SetList[] {
  return sets.map((s) => (s.id === id ? fn(s) : s));
}

function patchEntry(s: SetList, index: number, fn: (e: SetEntry) => SetEntry): SetList {
  return touch(s, { entries: s.entries.map((e, i) => (i === index ? fn(e) : e)) });
}

export const useSetsStore = create<SetsState>()(
  persist(
    (set, get) => ({
      sets: [],

      createSet: (name, profile) => {
        const id = crypto.randomUUID();
        const s: SetList = { id, name, profile, entries: [], createdAt: now(), updatedAt: now() };
        set({ sets: [s, ...get().sets] });
        return id;
      },

      updateSet: (id, patch) => {
        set({ sets: mapSet(get().sets, id, (s) => touch(s, patch)) });
      },

      duplicateSet: (id) => {
        const src = get().sets.find((s) => s.id === id);
        if (!src) return null;
        const names = new Set(get().sets.map((s) => s.name));
        let name = `${src.name} (copia)`;
        for (let n = 2; names.has(name); n++) name = `${src.name} (copia ${n})`;
        const newId = crypto.randomUUID();
        const copy: SetList = {
          ...src,
          id: newId,
          name,
          entries: src.entries.map((e) => ({ ...e })),
          createdAt: now(),
          updatedAt: now(),
        };
        set({ sets: [copy, ...get().sets] });
        return newId;
      },

      deleteSet: (id) => set({ sets: get().sets.filter((s) => s.id !== id) }),

      addEntry: (setId, tuneId) => {
        const s = get().sets.find((x) => x.id === setId);
        if (!s || s.entries.some((e) => e.tuneId === tuneId)) return false;
        const entry: SetEntry = { tuneId };
        set({
          sets: mapSet(get().sets, setId, (x) => touch(x, { entries: [...x.entries, entry] })),
        });
        return true;
      },

      removeEntry: (setId, index) => {
        set({
          sets: mapSet(get().sets, setId, (s) =>
            touch(s, { entries: s.entries.filter((_, i) => i !== index) }),
          ),
        });
      },

      moveEntry: (setId, from, to) => {
        set({
          sets: mapSet(get().sets, setId, (s) => {
            if (from < 0 || from >= s.entries.length || to < 0 || to >= s.entries.length) return s;
            const entries = [...s.entries];
            const [moved] = entries.splice(from, 1);
            entries.splice(to, 0, moved);
            return touch(s, { entries });
          }),
        });
      },

      setEntrySolo: (setId, index, value) => {
        set({
          sets: mapSet(get().sets, setId, (s) =>
            patchEntry(s, index, (e) => {
              const next: SetEntry = { ...e };
              if (value === undefined) delete next.soloChoruses;
              else next.soloChoruses = Math.max(0, Math.min(12, Math.round(value)));
              return next;
            }),
          ),
        });
      },

      setEntryHeadsOut: (setId, index, value) => {
        set({
          sets: mapSet(get().sets, setId, (s) =>
            patchEntry(s, index, (e) => {
              const next: SetEntry = { ...e };
              if (value === undefined) delete next.headsOut;
              else next.headsOut = value;
              return next;
            }),
          ),
        });
      },

      replaceSets: (sets) => set({ sets: sets.map(normalizeSet) }),
      resetLocal: () => set({ sets: [] }),
    }),
    {
      name: 'gigrep.v1.sets',
      version: 2,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ sets: s.sets }),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as { sets?: unknown[] };
        const sets = Array.isArray(state.sets) ? state.sets.map(normalizeSet) : [];
        return { sets };
      },
    },
  ),
);
