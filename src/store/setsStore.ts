import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SetEntry, SetKind, SetList } from '../types';
import { idbStorage } from './idbStorage';

const now = () => new Date().toISOString();

function touch(s: SetList, patch: Partial<SetList>): SetList {
  return { ...s, ...patch, updatedAt: now() };
}

interface SetsState {
  sets: SetList[];
  createSet: (name: string, kind: SetKind) => string;
  updateSet: (id: string, patch: Partial<Pick<SetList, 'name' | 'kind'>>) => void;
  duplicateSet: (id: string) => string | null;
  deleteSet: (id: string) => void;
  /** false si el tema ya estaba en el set. */
  addEntry: (setId: string, tuneId: string) => boolean;
  removeEntry: (setId: string, index: number) => void;
  moveEntry: (setId: string, from: number, to: number) => void;
  /** durationMin undefined = volver a la duración del tema. */
  setEntryDuration: (setId: string, index: number, durationMin: number | undefined) => void;
  replaceSets: (sets: SetList[]) => void;
  resetLocal: () => void;
}

function mapSet(sets: SetList[], id: string, fn: (s: SetList) => SetList): SetList[] {
  return sets.map((s) => (s.id === id ? fn(s) : s));
}

export const useSetsStore = create<SetsState>()(
  persist(
    (set, get) => ({
      sets: [],

      createSet: (name, kind) => {
        const id = crypto.randomUUID();
        const s: SetList = { id, name, kind, entries: [], createdAt: now(), updatedAt: now() };
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

      setEntryDuration: (setId, index, durationMin) => {
        set({
          sets: mapSet(get().sets, setId, (s) =>
            touch(s, {
              entries: s.entries.map((e, i) => {
                if (i !== index) return e;
                const next: SetEntry = { tuneId: e.tuneId };
                if (durationMin !== undefined) next.durationMin = durationMin;
                return next;
              }),
            }),
          ),
        });
      },

      replaceSets: (sets) => set({ sets }),
      resetLocal: () => set({ sets: [] }),
    }),
    {
      name: 'gigrep.v1.sets',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ sets: s.sets }),
    },
  ),
);
