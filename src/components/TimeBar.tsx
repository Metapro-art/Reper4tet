import { Fragment } from 'react';
import { TARGET_SEC, TRANSITION_SEC } from '../types';
import type { ResolvedEntry } from '../lib/setMath';
import { totalSec } from '../lib/setMath';
import { fmtSec } from '../lib/time';
import s from './TimeBar.module.css';

const HUES = ['#F0A93B', '#C9A227', '#4FBF9F', '#7FA8D9', '#B98BD9', '#E88A6B', '#8FCB9B'];

/**
 * Barra a escala del set de 45:00: cada bloque es un tema, las ranuras
 * oscuras son las transiciones de 45 s, líneas ámbar en 15:00 y 30:00,
 * y lo que rebasa 45:00 se pinta en rojo.
 */
export function TimeBar({
  resolved,
  compact = false,
}: {
  resolved: ResolvedEntry[];
  compact?: boolean;
}) {
  const total = totalSec(resolved);
  const scale = Math.max(TARGET_SEC, total);
  const pct = (sec: number) => (sec / scale) * 100;

  return (
    <div className={`${s.wrap} ${compact ? s.compact : ''}`}>
      <div className={s.bar}>
        {resolved.map((r, i) => (
          <Fragment key={`${r.entry.tuneId}-${i}`}>
            {i > 0 && <div className={s.gap} style={{ width: `${pct(TRANSITION_SEC)}%` }} />}
            <div
              className={s.seg}
              style={{ width: `${pct(r.durationSec)}%`, background: HUES[i % HUES.length] }}
              title={`${r.tune?.title ?? '(tema eliminado)'} · ${fmtSec(r.durationSec)}`}
            >
              {!compact && pct(r.durationSec) > 5 ? (r.tune?.title ?? '—') : ''}
            </div>
          </Fragment>
        ))}
        {total < TARGET_SEC && <div className={s.empty} />}

        <div className={s.mark} style={{ left: `${pct(15 * 60)}%` }} />
        <div className={s.mark} style={{ left: `${pct(30 * 60)}%` }} />
        {total > TARGET_SEC && (
          <>
            <div className={s.target} style={{ left: `${pct(TARGET_SEC)}%` }} />
            <div
              className={s.overflow}
              style={{ left: `${pct(TARGET_SEC)}%`, width: `${pct(total - TARGET_SEC)}%` }}
            />
          </>
        )}
      </div>
      {!compact && (
        <div className={s.scale}>
          <span style={{ left: 0 }}>0:00</span>
          <span style={{ left: `${pct(15 * 60)}%` }}>15:00</span>
          <span style={{ left: `${pct(30 * 60)}%` }}>30:00</span>
          <span style={{ left: `${pct(TARGET_SEC)}%` }}>45:00</span>
        </div>
      )}
    </div>
  );
}
