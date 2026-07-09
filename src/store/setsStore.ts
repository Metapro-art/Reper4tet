import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Feel, SetEntry, SetList, SetProfile } from '../types';
import { BASE_BY_ID } from '../lib/merge';
import { idbStorage } from './idbStorage';

const now = () => new Date().toISOString();

function touch(s: SetList, patch: Partial<SetList>): SetList {
  return { ...s, ...patch, updatedAt: now() };
}

function isProfile(v: unknown): v is SetProfile {
  return v === 'jazz' || v === 'ballroom' || v === 'cocktail';
}

const clampBpm = (n: number) => Math.max(30, Math.min(400, Math.round(n)));

/**
 * Normaliza un set posiblemente heredado: `kind` → `profile`, y las entradas al
 * modelo nuevo `{ tuneId, feel, bpm }`. Descarta los viejos campos de vueltas
 * (headsIn/headsOut/soloChoruses/durationMin/length) y copia feel y bpm desde la
 * biblioteca base cuando la entrada no los trae (sets guardados con el modelo viejo).
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
    const tuneId = String(en.tuneId);
    const base = BASE_BY_ID.get(tuneId);
    const feel = typeof en.feel === 'string' ? (en.feel as Feel) : base?.feel;
    const bpm = typeof en.bpm === 'number' ? en.bpm : base?.bpm;
    const out: SetEntry = { tuneId };
    if (feel !== undefined) out.feel = feel;
    if (bpm !== undefined) out.bpm = bpm;
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
  /** false si el tema ya estaba. feel/bpm se copian de la biblioteca al añadir. */
  addEntry: (setId: string, tuneId: string, feel: Feel, bpm: number) => boolean;
  removeEntry: (setId: string, index: number) => void;
  moveEntry: (setId: string, from: number, to: number) => void;
  /** Feel con el que se toca este tema en ESTE set. */
  setEntryFeel: (setId: string, index: number, feel: Feel) => void;
  /** Tempo con el que se toca este tema en ESTE set. */
  setEntryBpm: (setId: string, index: number, bpm: number) => void;
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

      addEntry: (setId, tuneId, feel, bpm) => {
        const s = get().sets.find((x) => x.id === setId);
        if (!s || s.entries.some((e) => e.tuneId === tuneId)) return false;
        const entry: SetEntry = { tuneId, feel, bpm: clampBpm(bpm) };
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

      setEntryFeel: (setId, index, feel) => {
        set({
          sets: mapSet(get().sets, setId, (s) => patchEntry(s, index, (e) => ({ ...e, feel }))),
        });
      },

      setEntryBpm: (setId, index, bpm) => {
        if (!Number.isFinite(bpm)) return;
        set({
          sets: mapSet(get().sets, setId, (s) =>
            patchEntry(s, index, (e) => ({ ...e, bpm: clampBpm(bpm) })),
          ),
        });
      },

      replaceSets: (sets) => set({ sets: sets.map(normalizeSet) }),
      resetLocal: () => set({ sets: [] }),
    }),
    {
      name: 'gigrep.v1.sets',
      version: 3,
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
