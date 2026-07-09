import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { Check, Copy, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Tune } from '../types';
import { DANCE_LABELS, FEEL_LABELS, STYLE_LABELS, THEME_LABELS } from '../types';
import { chorusSec } from '../lib/setMath';
import { fmtSec } from '../lib/time';
import { ALPHABET, sectionLetter } from '../lib/alpha';
import { BASE_BY_ID } from '../lib/merge';
import type { OverrideMap } from '../types';
import s from './MobileLibraryList.module.css';

const ROW_H = 56;
const BAR_H = 24;
const INDEX_W = 24;

interface Props {
  sorted: Tune[];
  /** El índice A-Z y la barra de sección solo tienen sentido con orden por título. */
  showIndex: boolean;
  picking: boolean;
  pickerIds: ReadonlySet<string>;
  overrides: OverrideMap;
  onToggleMem: (id: string, current: boolean) => void;
  onAdd?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (t: Tune) => void;
  onDuplicate: (t: Tune) => void;
}

export function MobileLibraryList({
  sorted,
  showIndex,
  picking,
  pickerIds,
  overrides,
  onToggleMem,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<FixedSizeList>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [activeLetter, setActiveLetter] = useState('#');
  const activeRef = useRef('#');
  const [dragLetter, setDragLetter] = useState<string | null>(null);
  const [bubbleText, setBubbleText] = useState('');
  const [detail, setDetail] = useState<Tune | null>(null);

  // medir el área disponible (flex:1) para dar altura/anchura a react-window
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // letra por tema + primer índice de cada letra (solo con orden por título)
  const { perTune, firstIndex } = useMemo(() => {
    if (!showIndex) return { perTune: [] as string[], firstIndex: new Map<string, number>() };
    const pt = sorted.map((t) => sectionLetter(t.title));
    const fi = new Map<string, number>();
    pt.forEach((L, i) => {
      if (!fi.has(L)) fi.set(L, i);
    });
    return { perTune: pt, firstIndex: fi };
  }, [sorted, showIndex]);

  // al cambiar la lista (filtro/orden) hay que volver arriba y reajustar la letra
  // de la barra. Depende de los datos, no de valores que el propio efecto cambie,
  // así que no hay cascada de renders.
  useEffect(() => {
    listRef.current?.scrollTo(0);
    const L = perTune[0] ?? '#';
    activeRef.current = L;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveLetter(L);
  }, [sorted, perTune]);

  const indexW = showIndex ? INDEX_W : 0;
  const barH = showIndex ? BAR_H : 0;
  const listW = Math.max(0, size.w - indexW);
  const listH = Math.max(0, size.h - barH);

  const jumpToLetter = (clientY: number, barEl: HTMLElement) => {
    const r = barEl.getBoundingClientRect();
    const step = r.height / ALPHABET.length;
    const i = Math.min(ALPHABET.length - 1, Math.max(0, Math.floor((clientY - r.top) / step)));
    const letter = ALPHABET[i];
    setDragLetter(letter);
    setBubbleText(letter);
    const first = firstIndex.get(letter);
    if (first !== undefined) listRef.current?.scrollToItem(first, 'start');
  };

  const Row = ({ index, style }: ListChildComponentProps) => {
    const t = sorted[index];
    const inSet = pickerIds.has(t.id);
    return (
      <div style={style} className={s.row}>
        <button className={s.main} onClick={() => setDetail(t)}>
          <div className={`${s.title} ${t.missing ? s.missing : ''}`}>
            {t.missing && <span className={s.dot} />}
            {t.title}
          </div>
          <div className={s.sub}>
            {t.composer} · {FEEL_LABELS[t.feel]} · {t.bpm} · {t.key}
            {t.dance ? ` · ${DANCE_LABELS[t.dance]}` : ''}
          </div>
        </button>
        <button
          className={`${s.icon} ${t.memorized ? s.memOn : ''}`}
          onClick={() => onToggleMem(t.id, t.memorized)}
          aria-label={t.memorized ? 'Quitar de memoria' : 'Marcar de memoria'}
          aria-pressed={t.memorized}
        >
          ♦
        </button>
        {picking && (
          <button
            className={`${s.icon} ${inSet ? s.memOn : ''}`}
            disabled={inSet}
            onClick={() => onAdd?.(t.id)}
            aria-label={inSet ? 'Ya está en el set' : `Añadir ${t.title} al set`}
          >
            {inSet ? <Check size={20} /> : <Plus size={22} />}
          </button>
        )}
      </div>
    );
  };

  const isBase = detail ? BASE_BY_ID.has(detail.id) : false;
  const isLocal = detail ? detail.id in overrides || !BASE_BY_ID.has(detail.id) : false;

  return (
    <div className={s.area} ref={areaRef}>
      {showIndex && (
        <div className={s.sectionBar} style={{ width: listW }}>
          {activeLetter}
        </div>
      )}

      {size.h > 0 && (
        <FixedSizeList
          ref={listRef}
          height={listH}
          width={listW}
          itemCount={sorted.length}
          itemSize={ROW_H}
          overscanCount={6}
          onScroll={({ scrollOffset }) => {
            if (!showIndex) return;
            const top = Math.min(sorted.length - 1, Math.max(0, Math.floor(scrollOffset / ROW_H)));
            const L = perTune[top];
            if (L && L !== activeRef.current) {
              activeRef.current = L;
              setActiveLetter(L);
            }
          }}
        >
          {Row}
        </FixedSizeList>
      )}

      {showIndex && (
        <div
          className={s.indexBar}
          style={{ width: INDEX_W }}
          role="slider"
          aria-label="Índice alfabético"
          aria-valuetext={activeLetter}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            jumpToLetter(e.clientY, e.currentTarget);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) jumpToLetter(e.clientY, e.currentTarget);
          }}
          onPointerUp={() => setDragLetter(null)}
          onPointerCancel={() => setDragLetter(null)}
        >
          {ALPHABET.map((L) => (
            <span
              key={L}
              className={`${s.letter} ${L === activeLetter ? s.letterActive : ''} ${
                firstIndex.has(L) ? '' : s.letterOff
              }`}
            >
              {L}
            </span>
          ))}
        </div>
      )}

      <div className={`${s.bubble} ${dragLetter ? s.bubbleOn : ''}`}>{bubbleText}</div>

      {detail && (
        <div className={s.sheetBackdrop} onClick={() => setDetail(null)}>
          <div className={s.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={detail.title}>
            <button className={s.sheetClose} onClick={() => setDetail(null)} aria-label="Cerrar">
              <X size={22} />
            </button>
            <div className={s.sheetTitle}>{detail.title}</div>
            {detail.altTitle && <div className={s.sheetAlt}>{detail.altTitle}</div>}
            <div className={s.sheetMeta}>
              {detail.composer} · {THEME_LABELS[detail.theme]} · {STYLE_LABELS[detail.style]} ·{' '}
              {FEEL_LABELS[detail.feel]} · {detail.bpm} bpm · {detail.key}
              {detail.dance ? ` · ${DANCE_LABELS[detail.dance]}` : ''} · vuelta {fmtSec(chorusSec(detail))}
              {detail.missing ? ' · falta el chart' : ''}
              {isLocal ? ' · local' : ''}
            </div>
            {detail.notes && <div className={s.sheetNotes}>{detail.notes}</div>}
            <div className={s.sheetActions}>
              <button
                className="btn"
                onClick={() => {
                  onEdit(detail.id);
                  setDetail(null);
                }}
              >
                <Pencil size={16} /> Editar
              </button>
              <button
                className="btn"
                onClick={() => {
                  onDuplicate(detail);
                  setDetail(null);
                }}
              >
                <Copy size={16} /> Duplicar
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  const t = detail;
                  setDetail(null);
                  void onDelete(t);
                }}
              >
                <Trash2 size={16} /> {isBase ? 'Ocultar' : 'Borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
