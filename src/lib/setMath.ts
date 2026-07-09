import type { SetEntry, SetList, SetProfile, Tune } from '../types';
import {
  TARGET_SEC,
  GREEN_MAX_SEC,
  TRANSITION_SEC,
  DEFAULT_INTRO_BARS,
  DEFAULT_CODA_BARS,
  BALLAD_CODA_BARS,
  JAZZ_TARGET_SEC,
} from '../types';
import { fmtSec, minToSec } from './time';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/* ---------- Motor de duración: forma × tempo ---------- */

/** Duración (s) de UNA vuelta = compases × pulsos ÷ tempo. */
export function chorusSec(t: Tune): number {
  return (t.bars * t.beatsPerBar * 60) / t.bpm;
}
export function introBarsOf(t: Tune): number {
  return t.introBars ?? DEFAULT_INTRO_BARS;
}
export function codaBarsOf(t: Tune): number {
  return t.codaBars ?? (t.feel === 'balada' ? BALLAD_CODA_BARS : DEFAULT_CODA_BARS);
}
export function introSec(t: Tune): number {
  return (introBarsOf(t) * t.beatsPerBar * 60) / t.bpm;
}
export function codaSec(t: Tune): number {
  return (codaBarsOf(t) * t.beatsPerBar * 60) / t.bpm;
}

/* ---------- Vueltas por tema (dependen del set, no del tema) ---------- */

export interface Repeats {
  headsIn: number;
  soloChoruses: number;
  headsOut: number;
}

function defHeadsIn(profile: SetProfile, t: Tune): number {
  if (profile === 'jazz') return t.feel === 'blues' ? 2 : 1; // forma corta = doble cabeza
  return 1; // ballroom, cocktail
}
function defHeadsOut(profile: SetProfile, t: Tune, headsIn: number): number {
  if (profile === 'ballroom') return 1;
  if (profile === 'cocktail') return t.feel === 'balada' ? 0.5 : 1;
  return t.feel === 'balada' ? 0.5 : headsIn; // jazz: igual que la entrada, media en baladas
}
function defSolos(profile: SetProfile, t: Tune, headsIn: number, headsOut: number): number {
  if (profile !== 'jazz') return 1; // ballroom y cocktail: 1 vuelta fija
  const ch = chorusSec(t);
  if (ch <= 0) return 1;
  const headSec = (headsIn + headsOut) * ch;
  return clamp(Math.round((JAZZ_TARGET_SEC - headSec - introSec(t) - codaSec(t)) / ch), 1, 12);
}

/** Vueltas efectivas: override de la entrada, o el valor por defecto del perfil. */
export function resolveRepeats(entry: SetEntry, tune: Tune, profile: SetProfile): Repeats {
  // Ballroom es fijo: 1 vuelta por tema, aunque la entrada traiga overrides
  // de un perfil anterior (la música es para bailar, no para tocar).
  if (profile === 'ballroom') return { headsIn: 1, soloChoruses: 1, headsOut: 1 };
  const headsIn = entry.headsIn ?? defHeadsIn(profile, tune);
  const headsOut = entry.headsOut ?? defHeadsOut(profile, tune, headsIn);
  const soloChoruses = entry.soloChoruses ?? defSolos(profile, tune, headsIn, headsOut);
  return { headsIn, soloChoruses, headsOut };
}

export function entryDurationSec(tune: Tune, r: Repeats): number {
  const ch = chorusSec(tune);
  return introSec(tune) + codaSec(tune) + (r.headsIn + r.soloChoruses + r.headsOut) * ch;
}

/* ---------- Resolución del set ---------- */

export interface ResolvedEntry {
  entry: SetEntry;
  /** undefined si el tema fue borrado de la biblioteca */
  tune: Tune | undefined;
  durationSec: number;
  /** duración de una vuelta; 0 si el tema no existe */
  chorusSec: number;
  repeats: Repeats;
}

const NEUTRAL: Repeats = { headsIn: 1, soloChoruses: 1, headsOut: 1 };

export function resolveEntries(set: SetList, byId: ReadonlyMap<string, Tune>): ResolvedEntry[] {
  const profile: SetProfile = set.profile ?? 'jazz';
  return set.entries.map((entry) => {
    const tune = byId.get(entry.tuneId);
    if (!tune) {
      // tema borrado: sin forma que calcular, se usa un valor neutro
      return { entry, tune: undefined, durationSec: minToSec(5.75), chorusSec: 0, repeats: NEUTRAL };
    }
    const repeats = resolveRepeats(entry, tune, profile);
    return {
      entry,
      tune,
      durationSec: entryDurationSec(tune, repeats),
      chorusSec: chorusSec(tune),
      repeats,
    };
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

/* ---------- Ayuda del reloj (sensible al perfil) ---------- */

/** Temas típicos por perfil para llegar a 45:00. */
export function tunesPerSet(profile: SetProfile): string {
  if (profile === 'ballroom') return '9–10';
  if (profile === 'cocktail') return '10–12';
  return '7';
}

function nearestByChorus(cands: ResolvedEntry[], targetSec: number): ResolvedEntry | null {
  let best: ResolvedEntry | null = null;
  let bestDiff = Infinity;
  for (const r of cands) {
    if (!r.tune || r.chorusSec <= 0) continue;
    const d = Math.abs(r.chorusSec - targetSec);
    if (d < bestDiff) {
      bestDiff = d;
      best = r;
    }
  }
  return best;
}

export function buildClockHint(
  resolved: ResolvedEntry[],
  profile: SetProfile,
): { status: SetStatus; text: string } {
  const total = totalSec(resolved);
  const status = setStatus(total);

  if (resolved.length === 0) {
    return {
      status,
      text:
        profile === 'ballroom'
          ? `Set de baile: ~${tunesPerSet(profile)} temas de ~4:00 cada uno.`
          : `~${tunesPerSet(profile)} temas para llegar a 45:00.`,
    };
  }

  if (total > TARGET_SEC) {
    const over = total - TARGET_SEC;
    if (profile === 'ballroom') {
      return { status, text: `Te pasas ${fmtSec(over)} — quita un tema.` };
    }
    const pick = nearestByChorus(
      resolved.filter((r) => r.repeats.soloChoruses >= 1),
      over,
    );
    if (pick) {
      return {
        status,
        text: `Te pasas ${fmtSec(over)} — quítale una vuelta de solo a ${pick.tune!.title} (vuelta ${fmtSec(pick.chorusSec)}).`,
      };
    }
    return { status, text: `Te pasas ${fmtSec(over)} — quita un tema.` };
  }

  const miss = TARGET_SEC - total;
  if (miss < 30) {
    return { status, text: `A punto · margen ${fmtSec(miss)}` };
  }
  if (profile === 'ballroom') {
    return {
      status,
      text: `Faltan ${fmtSec(miss)} — súmale otro tema (el baile lleva ~${tunesPerSet(profile)}, cada uno ~4:00).`,
    };
  }
  const pick = nearestByChorus(resolved, miss);
  if (pick) {
    return {
      status,
      text: `Faltan ${fmtSec(miss)} — súmale una vuelta de solo a ${pick.tune!.title} (vuelta ${fmtSec(pick.chorusSec)}).`,
    };
  }
  return { status, text: `Faltan ${fmtSec(miss)} — añade temas.` };
}
