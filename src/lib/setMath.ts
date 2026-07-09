import type { Feel, SetEntry, SetList, SetProfile, Tune } from '../types';
import { TARGET_SEC, GREEN_MAX_SEC, TRANSITION_SEC } from '../types';
import { fmtSec, minToSec } from './time';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Duración (s) de UNA vuelta = compases × pulsos ÷ tempo (usa el tempo del tema). */
export function chorusSec(t: Tune): number {
  return (t.bars * t.beatsPerBar * 60) / t.bpm;
}

/** Segundos objetivo por feel (perfil jazz): cuánto queremos que dure el tema. */
const TARGET_BY_FEEL: Record<Feel, number> = {
  balada: 360,
  bossa: 330,
  samba: 330,
  latin: 345,
  vals: 330,
  funk: 390,
  blues: 360,
  swing: 345,
  up: 330,
  bambuco: 330,
  pasillo: 330,
  porro: 345,
  cumbia: 345,
  currulao: 345,
};

/** Redondea a los 15 s más cercanos (un músico piensa en 5:30, no en 5:23). */
const round15 = (sec: number) => Math.round(sec / 15) * 15;

/**
 * Duración de un tema en el set. Cálculo INTERNO, nunca visible: el músico solo
 * ve el resultado. Depende de la forma del tema (bars/beatsPerBar), del tempo y
 * el feel efectivos (los del ítem del set) y del perfil.
 */
export function entryDurationSec(tune: Tune, feel: Feel, bpm: number, profile: SetProfile): number {
  const chorus = (tune.bars * tune.beatsPerBar * 60) / bpm;
  if (!(chorus > 0)) return minToSec(5.75);
  let total: number;
  if (profile === 'ballroom') total = 3 * chorus + 30; // cabeza · una vuelta · cabeza
  else if (profile === 'cocktail') total = 4 * chorus + 30;
  else {
    const vueltas = clamp(Math.round(TARGET_BY_FEEL[feel] / chorus), 2, 14);
    total = vueltas * chorus + 45; // intro, coda, cabezas, trades
  }
  return round15(total);
}

/* ---------- Resolución del set ---------- */

export interface ResolvedEntry {
  entry: SetEntry;
  /** undefined si el tema fue borrado de la biblioteca */
  tune: Tune | undefined;
  /** feel efectivo (el del ítem del set, o el del tema si falta) */
  feel: Feel;
  /** tempo efectivo */
  bpm: number;
  durationSec: number;
}

export function resolveEntries(set: SetList, byId: ReadonlyMap<string, Tune>): ResolvedEntry[] {
  const profile: SetProfile = set.profile ?? 'jazz';
  return set.entries.map((entry) => {
    const tune = byId.get(entry.tuneId);
    const feel: Feel = entry.feel ?? tune?.feel ?? 'swing';
    const bpm = entry.bpm ?? tune?.bpm ?? 120;
    const durationSec = tune ? entryDurationSec(tune, feel, bpm, profile) : minToSec(5.75);
    return { entry, tune, feel, bpm, durationSec };
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

/** Aviso del reloj: ya no habla de vueltas, solo de quitar/añadir o el tempo. */
export function buildClockHint(resolved: ResolvedEntry[]): { status: SetStatus; text: string } {
  const total = totalSec(resolved);
  const status = setStatus(total);
  if (resolved.length === 0) return { status, text: 'Set vacío — añade temas.' };
  if (total > TARGET_SEC) {
    const over = total - TARGET_SEC;
    return {
      status,
      text: `Te pasas ${fmtSec(over)} — quita un tema o sube un poco el tempo de alguno.`,
    };
  }
  const miss = TARGET_SEC - total;
  if (miss < 30) return { status, text: `A punto · margen ${fmtSec(miss)}` };
  return {
    status,
    text: `Faltan ${fmtSec(miss)} — añade un tema o baja un poco el tempo de alguno.`,
  };
}
