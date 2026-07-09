import type { SetEntry, SetList, Tune } from '../types';
import { TARGET_SEC, GREEN_MAX_SEC, TRANSITION_SEC } from '../types';
import { minToSec } from './time';

export interface ResolvedEntry {
  entry: SetEntry;
  /** undefined si el tema fue borrado de la biblioteca */
  tune: Tune | undefined;
  durationSec: number;
}

export function resolveEntries(set: SetList, byId: ReadonlyMap<string, Tune>): ResolvedEntry[] {
  return set.entries.map((entry) => {
    const tune = byId.get(entry.tuneId);
    const min = entry.durationMin ?? tune?.durationMin ?? 5.75;
    return { entry, tune, durationSec: minToSec(min) };
  });
}

/** Duraciones + transición fija de 45 s entre temas. */
export function totalSec(resolved: ResolvedEntry[]): number {
  const dur = resolved.reduce((a, r) => a + r.durationSec, 0);
  return dur + Math.max(0, resolved.length - 1) * TRANSITION_SEC;
}

export type SetStatus = 'ok' | 'near' | 'over';

/** Verde ≤ 43:30 · ámbar 43:30–45:00 · rojo > 45:00 */
export function setStatus(total: number): SetStatus {
  if (total > TARGET_SEC) return 'over';
  if (total > GREEN_MAX_SEC) return 'near';
  return 'ok';
}

/** Segundo en el que arranca cada tema (para la hoja impresa). */
export function startTimes(resolved: ResolvedEntry[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const r of resolved) {
    out.push(acc);
    acc += r.durationSec + TRANSITION_SEC;
  }
  return out;
}
