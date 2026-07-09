import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DANCE_LABELS, FEEL_LABELS } from '../types';
import { resolveEntries } from '../lib/setMath';
import { fmtSec } from '../lib/time';
import { useWakeLock } from '../hooks/useWakeLock';
import { useSetsStore } from '../store/setsStore';
import { useTuneMap } from '../store/selectors';
import { useUiStore } from '../store/uiStore';
import s from './StageView.module.css';

/**
 * Modo escenario: letra gigante, alto contraste, pantalla siempre
 * encendida, siguiente tema visible y cero scroll.
 */
export function StageView({ setId }: { setId: string }) {
  const set = useSetsStore((st) => st.sets.find((x) => x.id === setId));
  const openStage = useUiStore((st) => st.openStage);
  const tuneMap = useTuneMap();
  const wakeActive = useWakeLock();
  const [index, setIndex] = useState(0);

  const resolved = useMemo(() => (set ? resolveEntries(set, tuneMap) : []), [set, tuneMap]);
  const count = resolved.length;
  const clamped = Math.min(index, Math.max(0, count - 1));

  // pantalla completa mientras dura el set
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => undefined);
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(count - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      else if (e.key === 'Escape') openStage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, openStage]);

  // si el set desaparece o queda vacío, salir del escenario
  useEffect(() => {
    if (!set || count === 0) openStage(null);
  }, [set, count, openStage]);
  if (!set || count === 0) return null;

  const cur = resolved[clamped];
  const next = clamped + 1 < count ? resolved[clamped + 1] : null;
  const t = cur.tune;

  return (
    <div className={s.stage}>
      <div className={s.top}>
        <span>{set.name}</span>
        <span className={s.pos}>
          {clamped + 1}/{count}
        </span>
        <span className={`${s.wake} ${wakeActive ? s.wakeOn : ''}`}>
          {wakeActive ? '● pantalla siempre encendida' : '○ wake lock no disponible'}
        </span>
        <button
          className={s.close}
          onClick={() => openStage(null)}
          aria-label="Salir del escenario"
        >
          <X size={26} />
        </button>
      </div>

      <div className={s.main}>
        <div className={s.title}>{t ? t.title : '(tema eliminado)'}</div>
        {t && (
          <div className={s.data}>
            <span>{t.key}</span>
            <span>{t.bpm} bpm</span>
            <span className={s.feel}>
              {FEEL_LABELS[t.feel]}
              {set.kind === 'ballroom' && t.dance ? ` · ${DANCE_LABELS[t.dance]}` : ''}
            </span>
            <span>{fmtSec(cur.durationSec)}</span>
            {t.memorized && <span className={s.mem}>♦</span>}
          </div>
        )}
      </div>

      <div className={s.next}>
        <div className={s.nextLbl}>{next ? 'Siguiente' : 'Fin del set'}</div>
        {next && (
          <>
            <div className={s.nextTitle}>{next.tune?.title ?? '(tema eliminado)'}</div>
            {next.tune && (
              <div className={s.nextData}>
                {next.tune.key} · {next.tune.bpm} bpm · {FEEL_LABELS[next.tune.feel]}
                {set.kind === 'ballroom' && next.tune.dance
                  ? ` · ${DANCE_LABELS[next.tune.dance]}`
                  : ''}
              </div>
            )}
          </>
        )}
      </div>

      <div className={s.controls}>
        <button
          className={s.navBtn}
          disabled={clamped === 0}
          onClick={() => setIndex(Math.max(0, clamped - 1))}
          aria-label="Tema anterior"
        >
          <ChevronLeft size={44} />
        </button>
        <button
          className={s.navBtn}
          disabled={clamped >= count - 1}
          onClick={() => setIndex(Math.min(count - 1, clamped + 1))}
          aria-label="Tema siguiente"
        >
          <ChevronRight size={44} />
        </button>
      </div>
    </div>
  );
}
