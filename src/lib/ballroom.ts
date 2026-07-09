import { DANCE_LABELS } from '../types';
import type { ResolvedEntry } from './setMath';

export interface BallroomIssue {
  level: 'warn' | 'info';
  text: string;
}

/**
 * Reglas del set bailable: sin ritmos consecutivos repetidos y al menos
 * 4 ritmos distintos en el set.
 */
export function validateBallroom(resolved: ResolvedEntry[]): BallroomIssue[] {
  const issues: BallroomIssue[] = [];
  if (resolved.length === 0) return issues;

  const dances = resolved.map((r) => r.tune?.dance);
  for (let i = 1; i < dances.length; i++) {
    const d = dances[i];
    if (d && d === dances[i - 1]) {
      issues.push({
        level: 'warn',
        text: `${DANCE_LABELS[d]} dos veces seguidas (posiciones ${i}–${i + 1})`,
      });
    }
  }

  const distinct = new Set(dances.filter((d): d is NonNullable<typeof d> => Boolean(d)));
  if (distinct.size < 4) {
    issues.push({
      level: 'warn',
      text: `Solo ${distinct.size} ritmo${distinct.size === 1 ? '' : 's'} de baile distinto${distinct.size === 1 ? '' : 's'} — se recomiendan al menos 4`,
    });
  }

  const noDance = resolved.filter((r) => r.tune && !r.tune.dance);
  if (noDance.length > 0) {
    issues.push({
      level: 'info',
      text: `Sin ritmo de baile: ${noDance.map((r) => r.tune?.title).join(', ')}`,
    });
  }
  return issues;
}
