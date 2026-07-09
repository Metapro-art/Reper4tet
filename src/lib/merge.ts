import { TUNES } from '../data/tunes';
import type { OverrideMap, Tune, TunePatch } from '../types';

export const BASE_BY_ID: ReadonlyMap<string, Tune> = new Map(TUNES.map((t) => [t.id, t]));

export function applyPatch(base: Tune, patch: TunePatch): Tune {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out as unknown as Tune;
}

/**
 * Fusión de las dos capas: base versionada (tunes.ts) + overrides locales.
 * - edit: parche sobre el tema base
 * - remove: oculta el tema base
 * - add: se agrega al final; si su id ya existe en la base (fue fusionado
 *   al repo en un deploy posterior), gana la base y el override queda
 *   obsoleto (Ajustes ofrece limpiarlos).
 */
export function mergeTunes(overrides: OverrideMap): Tune[] {
  const out: Tune[] = [];
  for (const t of TUNES) {
    const o = overrides[t.id];
    if (!o) {
      out.push(t);
      continue;
    }
    if (o.kind === 'remove') continue;
    if (o.kind === 'edit') out.push(applyPatch(t, o.patch));
    else out.push(t);
  }
  for (const [id, o] of Object.entries(overrides)) {
    if (o.kind === 'add' && !BASE_BY_ID.has(id)) out.push(o.tune);
  }
  return out;
}

function normEq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Overrides que ya no aportan nada frente a la base actual. */
export function staleOverrideIds(overrides: OverrideMap): string[] {
  const stale: string[] = [];
  for (const [id, o] of Object.entries(overrides)) {
    const base = BASE_BY_ID.get(id);
    if (o.kind === 'add' && base) stale.push(id);
    else if (o.kind === 'edit') {
      if (!base) continue;
      const noop = Object.entries(o.patch).every(([k, v]) =>
        normEq(base[k as keyof Tune], v === null ? undefined : v),
      );
      if (noop || Object.keys(o.patch).length === 0) stale.push(id);
    } else if (o.kind === 'remove' && !base) stale.push(id);
  }
  return stale;
}

export function countOverrides(overrides: OverrideMap): {
  adds: number;
  edits: number;
  removes: number;
} {
  let adds = 0,
    edits = 0,
    removes = 0;
  for (const o of Object.values(overrides)) {
    if (o.kind === 'add') adds++;
    else if (o.kind === 'edit') edits++;
    else removes++;
  }
  return { adds, edits, removes };
}
