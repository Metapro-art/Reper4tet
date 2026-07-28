import type { ResolvedEntry } from './setMath';

/**
 * Texto plano para portapapeles / WhatsApp: solo numeración y título de cada
 * track, nada más (sin tonalidad, bpm, feel, duración ni totales).
 */
export function buildSetText(resolved: ResolvedEntry[]): string {
  return resolved
    .map((r, i) => `${i + 1}. ${r.tune ? r.tune.title : '(tema eliminado)'}`)
    .join('\n');
}
