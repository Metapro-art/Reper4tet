import { useEffect, useMemo } from 'react';
import { DANCE_LABELS, FEEL_LABELS, TARGET_SEC } from '../types';
import { resolveEntries, startTimes, totalSec } from '../lib/setMath';
import { fmtSec } from '../lib/time';
import { useSetsStore } from '../store/setsStore';
import { useTuneMap } from '../store/selectors';
import { useUiStore } from '../store/uiStore';
import s from './PrintSheet.module.css';

/**
 * Hoja limpia para imprimir: se monta, dispara window.print() y se
 * desmonta al cerrar el diálogo. En pantalla no se ve (.print-sheet).
 */
export function PrintSheet({ setId }: { setId: string }) {
  const set = useSetsStore((st) => st.sets.find((x) => x.id === setId));
  const requestPrint = useUiStore((st) => st.requestPrint);
  const tuneMap = useTuneMap();

  const resolved = useMemo(() => (set ? resolveEntries(set, tuneMap) : []), [set, tuneMap]);
  const total = totalSec(resolved);
  const starts = startTimes(resolved);

  useEffect(() => {
    if (!set) {
      requestPrint(null);
      return;
    }
    const done = () => requestPrint(null);
    window.addEventListener('afterprint', done);
    const t = setTimeout(() => window.print(), 80);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', done);
    };
  }, [set, requestPrint]);

  if (!set) return null;

  return (
    <div className={`print-sheet ${s.sheet}`}>
      <h1>{set.name}</h1>
      <div className={s.meta}>
        {new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
        {set.kind === 'ballroom' ? 'Set de baile (ballroom)' : 'Set libre'} · {resolved.length}{' '}
        temas · {fmtSec(total)} / {fmtSec(TARGET_SEC)}
      </div>
      <table className={s.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Empieza</th>
            <th>Tema</th>
            <th>Ton.</th>
            <th>BPM</th>
            <th>Feel</th>
            {set.kind === 'ballroom' && <th>Baile</th>}
            <th>Dur.</th>
          </tr>
        </thead>
        <tbody>
          {resolved.map((r, i) => (
            <tr key={i}>
              <td className={s.num}>{i + 1}</td>
              <td className={s.num}>{fmtSec(starts[i])}</td>
              <td>
                <span className={s.tt}>{r.tune?.title ?? '(tema eliminado)'}</span>
                {r.tune?.composer ? <span className={s.cp}> — {r.tune.composer}</span> : null}
              </td>
              <td className={s.num}>{r.tune?.key ?? ''}</td>
              <td className={s.num}>{r.tune?.bpm ?? ''}</td>
              <td>{r.tune ? FEEL_LABELS[r.tune.feel] : ''}</td>
              {set.kind === 'ballroom' && (
                <td>{r.tune?.dance ? DANCE_LABELS[r.tune.dance] : '—'}</td>
              )}
              <td className={s.num}>{fmtSec(r.durationSec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={s.foot}>
        <span>Transiciones de 45 s incluidas</span>
        <span className={s.num}>
          Total {fmtSec(total)} / {fmtSec(TARGET_SEC)}
        </span>
      </div>
    </div>
  );
}
