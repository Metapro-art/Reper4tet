import type { SetList } from '../types';
import { DANCE_LABELS, FEEL_LABELS, TARGET_SEC } from '../types';
import type { ResolvedEntry } from './setMath';
import { totalSec } from './setMath';
import { fmtSec } from './time';

/** Texto plano para WhatsApp / portapapeles. */
export function buildSetText(set: SetList, resolved: ResolvedEntry[]): string {
  const total = totalSec(resolved);
  const lines: string[] = [];
  lines.push(`SET: ${set.name} — ${fmtSec(total)} / ${fmtSec(TARGET_SEC)}`);
  resolved.forEach((r, i) => {
    if (!r.tune) {
      lines.push(`${i + 1}. (tema eliminado) (${fmtSec(r.durationSec)})`);
      return;
    }
    const t = r.tune;
    const dance = set.profile === 'ballroom' && t.dance ? ` · ${DANCE_LABELS[t.dance]}` : '';
    lines.push(
      `${i + 1}. ${t.title} — ${t.key} · ${t.bpm} bpm · ${FEEL_LABELS[t.feel]}${dance} (${fmtSec(r.durationSec)})`,
    );
  });
  lines.push('');
  lines.push(`${resolved.length} temas · transiciones de 45 s incluidas`);
  return lines.join('\n');
}
