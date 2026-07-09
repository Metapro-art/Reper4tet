import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { OverrideMap, Tune, TunePatch } from '../types';
import { BASE_BY_ID } from '../lib/merge';
import { uniqueId } from '../lib/slug';
import { idbStorage } from './idbStorage';

type TuneData = Omit<Tune, 'id'>;

const PATCHABLE: (keyof TuneData)[] = [
  'title',
  'composer',
  'theme',
  'feel',
  'bpm',
  'key',
  'dance',
  'bars',
  'beatsPerBar',
  'introBars',
  'codaBars',
  'memorized',
  'missing',
  'source',
  'altStyles',
  'notes',
];

function normEq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Ajusta un solo campo booleano respetando la capa a la que pertenece el tema. */
function withFieldPatch(
  overrides: OverrideMap,
  id: string,
  field: 'memorized' | 'missing',
  value: boolean,
): OverrideMap {
  const out = { ...overrides };
  const base = BASE_BY_ID.get(id);
  const existing = out[id];
  if (existing?.kind === 'remove') return out;
  if (base) {
    const patch: TunePatch = existing?.kind === 'edit' ? { ...existing.patch } : {};
    if (base[field] === value) delete patch[field];
    else patch[field] = value;
    if (Object.keys(patch).length === 0) delete out[id];
    else out[id] = { kind: 'edit', patch };
  } else if (existing?.kind === 'add') {
    out[id] = { kind: 'add', tune: { ...existing.tune, [field]: value } };
  }
  return out;
}

/** Diferencia contra la base; `null` marca campos opcionales borrados. */
function diffFromBase(base: Tune, data: TuneData): TunePatch {
  const patch: Record<string, unknown> = {};
  for (const f of PATCHABLE) {
    const nv = data[f];
    const bv = base[f];
    if (!normEq(nv, bv)) patch[f] = nv === undefined ? null : nv;
  }
  return patch as TunePatch;
}

interface LibraryState {
  overrides: OverrideMap;
  /** Alta local; devuelve el id generado. */
  addTune: (data: TuneData) => string;
  /** Edición (tema base → parche; tema local → reemplazo). */
  updateTune: (id: string, data: TuneData) => void;
  /** Baja (tema base → override remove; tema local → se borra). */
  removeTune: (id: string) => void;
  /** Quita el override de un tema base (vuelve a la versión versionada). */
  restoreTune: (id: string) => void;
  toggleMemorized: (id: string, current: boolean) => void;
  setMissing: (id: string, missing: boolean) => void;
  /** Fusiona overrides importados (lo importado gana por id). */
  importOverrides: (map: OverrideMap) => void;
  /** Restauración de respaldo completo. */
  replaceOverrides: (map: OverrideMap) => void;
  clearOverrides: (ids: string[]) => void;
  resetLocal: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      overrides: {},

      addTune: (data) => {
        const { overrides } = get();
        const id = uniqueId(data.title, (cand) => BASE_BY_ID.has(cand) || cand in overrides);
        set({ overrides: { ...overrides, [id]: { kind: 'add', tune: { id, ...data } } } });
        return id;
      },

      updateTune: (id, data) => {
        const overrides = { ...get().overrides };
        const base = BASE_BY_ID.get(id);
        if (base) {
          const patch = diffFromBase(base, data);
          if (Object.keys(patch).length === 0) delete overrides[id];
          else overrides[id] = { kind: 'edit', patch };
        } else {
          overrides[id] = { kind: 'add', tune: { id, ...data } };
        }
        set({ overrides });
      },

      removeTune: (id) => {
        const overrides = { ...get().overrides };
        if (BASE_BY_ID.has(id)) overrides[id] = { kind: 'remove' };
        else delete overrides[id];
        set({ overrides });
      },

      restoreTune: (id) => {
        const overrides = { ...get().overrides };
        delete overrides[id];
        set({ overrides });
      },

      toggleMemorized: (id, current) => {
        set({ overrides: withFieldPatch(get().overrides, id, 'memorized', !current) });
      },

      setMissing: (id, missing) => {
        set({ overrides: withFieldPatch(get().overrides, id, 'missing', missing) });
      },

      importOverrides: (map) => {
        set({ overrides: { ...get().overrides, ...map } });
      },

      replaceOverrides: (map) => set({ overrides: map }),

      clearOverrides: (ids) => {
        const overrides = { ...get().overrides };
        for (const id of ids) delete overrides[id];
        set({ overrides });
      },

      resetLocal: () => set({ overrides: {} }),
    }),
    {
      name: 'gigrep.v1.library',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ overrides: s.overrides }),
    },
  ),
);
