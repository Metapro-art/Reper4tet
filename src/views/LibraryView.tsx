import { memo, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, X } from 'lucide-react';
import type { Dance, Feel, Theme, Tune } from '../types';
import { DANCE_LABELS, FEEL_LABELS, THEME_LABELS, THEMES, FEELS, DANCES } from '../types';
import { createSearcher } from '../lib/search';
import { fmtMin, fmtSec } from '../lib/time';
import { totalSec, resolveEntries, setStatus } from '../lib/setMath';
import { BASE_BY_ID } from '../lib/merge';
import { useMergedTunes, useTuneMap } from '../store/selectors';
import { useLibraryStore } from '../store/libraryStore';
import { useSetsStore } from '../store/setsStore';
import { useUiStore } from '../store/uiStore';
import s from './LibraryView.module.css';

type SortKey = 'title' | 'composer' | 'theme' | 'feel' | 'bpm' | 'key' | 'dance' | 'durationMin';

const SORT_LABELS: [SortKey, string][] = [
  ['title', 'Tema'],
  ['theme', 'Temática'],
  ['feel', 'Feel'],
  ['bpm', 'BPM'],
  ['key', 'Ton.'],
  ['dance', 'Baile'],
  ['durationMin', '⏱'],
];

function sortValue(t: Tune, key: SortKey): string | number {
  switch (key) {
    case 'bpm':
      return t.bpm;
    case 'durationMin':
      return t.durationMin;
    case 'theme':
      return THEME_LABELS[t.theme];
    case 'feel':
      return FEEL_LABELS[t.feel];
    case 'dance':
      return t.dance ? DANCE_LABELS[t.dance] : '￿'; // sin baile al final
    case 'composer':
      return t.composer.toLowerCase();
    case 'key':
      return t.key.toLowerCase();
    default:
      return t.title.toLowerCase();
  }
}

export function LibraryView() {
  const tunes = useMergedTunes();
  const overrides = useLibraryStore((st) => st.overrides);
  const toggleMemorized = useLibraryStore((st) => st.toggleMemorized);
  const openTuneEditor = useUiStore((st) => st.openTuneEditor);

  // --- modo picker: añadiendo temas a un set ---
  const pickingForSetId = useUiStore((st) => st.pickingForSetId);
  const stopPicking = useUiStore((st) => st.stopPicking);
  const pickingSet = useSetsStore((st) =>
    pickingForSetId ? st.sets.find((x) => x.id === pickingForSetId) : undefined,
  );
  const addEntry = useSetsStore((st) => st.addEntry);
  const toast = useUiStore((st) => st.toast);
  const tuneMap = useTuneMap();

  const [q, setQ] = useState('');
  const [themes, setThemes] = useState<ReadonlySet<Theme>>(new Set());
  const [feels, setFeels] = useState<ReadonlySet<Feel>>(new Set());
  const [dances, setDances] = useState<ReadonlySet<Dance>>(new Set());
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');
  const [onlyMem, setOnlyMem] = useState(false);
  const [hideMissing, setHideMissing] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'title', asc: true });

  const searcher = useMemo(() => createSearcher(tunes), [tunes]);
  const searched = useMemo(() => searcher(q), [searcher, q]);

  const min = bpmMin ? Number(bpmMin) : null;
  const max = bpmMax ? Number(bpmMax) : null;

  const baseFiltered = useMemo(
    () =>
      searched.filter((t) => {
        if (hideMissing && t.missing) return false;
        if (onlyMem && !t.memorized) return false;
        if (min !== null && t.bpm < min) return false;
        if (max !== null && t.bpm > max) return false;
        return true;
      }),
    [searched, hideMissing, onlyMem, min, max],
  );

  const filtered = useMemo(
    () =>
      baseFiltered.filter((t) => {
        if (themes.size > 0 && !themes.has(t.theme)) return false;
        if (feels.size > 0 && !feels.has(t.feel)) return false;
        if (dances.size > 0 && (!t.dance || !dances.has(t.dance))) return false;
        return true;
      }),
    [baseFiltered, themes, feels, dances],
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      const r = x < y ? -1 : x > y ? 1 : 0;
      return sort.asc ? r : -r;
    });
    return arr;
  }, [filtered, sort]);

  // conteos por faceta (cada faceta se cuenta sin su propia selección)
  const facetCounts = useMemo(() => {
    const th = new Map<Theme, number>();
    const fe = new Map<Feel, number>();
    const da = new Map<Dance, number>();
    for (const t of baseFiltered) {
      const okFe = feels.size === 0 || feels.has(t.feel);
      const okDa = dances.size === 0 || (t.dance && dances.has(t.dance));
      const okTh = themes.size === 0 || themes.has(t.theme);
      if (okFe && okDa) th.set(t.theme, (th.get(t.theme) ?? 0) + 1);
      if (okTh && okDa) fe.set(t.feel, (fe.get(t.feel) ?? 0) + 1);
      if (okTh && okFe && t.dance) da.set(t.dance, (da.get(t.dance) ?? 0) + 1);
    }
    return { th, fe, da };
  }, [baseFiltered, themes, feels, dances]);

  const anyFilter =
    q !== '' ||
    themes.size > 0 ||
    feels.size > 0 ||
    dances.size > 0 ||
    bpmMin !== '' ||
    bpmMax !== '' ||
    onlyMem ||
    hideMissing;

  const clearAll = () => {
    setQ('');
    setThemes(new Set());
    setFeels(new Set());
    setDances(new Set());
    setBpmMin('');
    setBpmMax('');
    setOnlyMem(false);
    setHideMissing(false);
  };

  function toggleIn<T>(set: ReadonlySet<T>, v: T): Set<T> {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  }

  const clickSort = (key: SortKey) =>
    setSort((prev) => (prev.key === key ? { key, asc: !prev.asc } : { key, asc: true }));

  // total en vivo del set en modo picker
  const pickerTotal = pickingSet ? totalSec(resolveEntries(pickingSet, tuneMap)) : 0;
  const pickerIds = useMemo(
    () => new Set(pickingSet?.entries.map((e) => e.tuneId) ?? []),
    [pickingSet],
  );

  const missingTotal = tunes.filter((t) => t.missing).length;

  return (
    <div>
      {pickingSet && (
        <div className={s.pickerBar}>
          <span className={s.pickerName}>Añadiendo a «{pickingSet.name}»</span>
          <span className={`${s.pickerClock} ${s[setStatus(pickerTotal)]}`}>
            {fmtSec(pickerTotal)}{' '}
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>/ 45:00</span>
          </span>
          <button className="btn primary" onClick={stopPicking}>
            <Check size={17} /> Listo
          </button>
        </div>
      )}

      <div className="page-head">
        <h1>Biblioteca</h1>
        <span className="sub">Cuarteto · gtr / pno / bajo / bat</span>
        <div className={s.headBtns}>
          <button className="btn" onClick={() => openTuneEditor('new')}>
            <Plus size={17} /> Nuevo tema
          </button>
        </div>
      </div>

      <div className={s.controls}>
        <input
          type="search"
          className={`input ${s.search}`}
          placeholder="Buscar título o compositor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar"
        />
        <span className="lbl">BPM</span>
        <input
          type="number"
          inputMode="numeric"
          className={`input mono ${s.bpm}`}
          placeholder="mín"
          value={bpmMin}
          onChange={(e) => setBpmMin(e.target.value)}
          aria-label="BPM mínimo"
        />
        <input
          type="number"
          inputMode="numeric"
          className={`input mono ${s.bpm}`}
          placeholder="máx"
          value={bpmMax}
          onChange={(e) => setBpmMax(e.target.value)}
          aria-label="BPM máximo"
        />
        <label className="check">
          <input type="checkbox" checked={onlyMem} onChange={(e) => setOnlyMem(e.target.checked)} />
          Solo de memoria
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={hideMissing}
            onChange={(e) => setHideMissing(e.target.checked)}
          />
          Ocultar faltantes
        </label>
        {anyFilter && (
          <button className="btn ghost" onClick={clearAll}>
            <X size={16} /> Limpiar
          </button>
        )}
      </div>

      <div className={`lbl ${s.facetLbl}`}>Temática</div>
      <div className="chips">
        {THEMES.filter((t) => (facetCounts.th.get(t) ?? 0) > 0 || themes.has(t)).map((t) => (
          <button
            key={t}
            className={`chip ${themes.has(t) ? 'on' : ''}`}
            onClick={() => setThemes(toggleIn(themes, t))}
          >
            {THEME_LABELS[t]}
            <span className="n">{facetCounts.th.get(t) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={`lbl ${s.facetLbl}`}>Ritmo de baile · ballroom</div>
      <div className="chips">
        {DANCES.filter((d) => (facetCounts.da.get(d) ?? 0) > 0 || dances.has(d)).map((d) => (
          <button
            key={d}
            className={`chip dance ${dances.has(d) ? 'on' : ''}`}
            onClick={() => setDances(toggleIn(dances, d))}
          >
            {DANCE_LABELS[d]}
            <span className="n">{facetCounts.da.get(d) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={`lbl ${s.facetLbl}`}>Feel</div>
      <div className="chips">
        {FEELS.filter((f) => (facetCounts.fe.get(f) ?? 0) > 0 || feels.has(f)).map((f) => (
          <button
            key={f}
            className={`chip ${feels.has(f) ? 'on' : ''}`}
            onClick={() => setFeels(toggleIn(feels, f))}
          >
            {FEEL_LABELS[f]}
            <span className="n">{facetCounts.fe.get(f) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              {pickingSet && <th style={{ width: 48 }} />}
              <th style={{ width: 48 }} title="De memoria">
                ♦
              </th>
              {SORT_LABELS.map(([key, label]) => (
                <th key={key} onClick={() => clickSort(key)}>
                  {label}
                  {sort.key === key &&
                    (sort.asc ? (
                      <ArrowUp size={13} style={{ verticalAlign: -1 }} />
                    ) : (
                      <ArrowDown size={13} style={{ verticalAlign: -1 }} />
                    ))}
                </th>
              ))}
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <TuneRow
                key={t.id}
                tune={t}
                picking={Boolean(pickingSet)}
                inSet={pickerIds.has(t.id)}
                isLocal={t.id in overrides || !BASE_BY_ID.has(t.id)}
                onToggleMem={toggleMemorized}
                onEdit={openTuneEditor}
                onAdd={
                  pickingForSetId
                    ? (id) => {
                        const t2 = tuneMap.get(id);
                        if (addEntry(pickingForSetId, id)) {
                          toast(`Añadido: ${t2?.title ?? id}`);
                        } else {
                          toast('Ya está en el set', 'warn');
                        }
                      }
                    : undefined
                }
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className={`lbl ${s.count}`}>
        {sorted.length} tema{sorted.length === 1 ? '' : 's'} en pantalla · {missingTotal} faltante
        {missingTotal === 1 ? '' : 's'} en total
      </div>
    </div>
  );
}

interface RowProps {
  tune: Tune;
  picking: boolean;
  inSet: boolean;
  isLocal: boolean;
  onToggleMem: (id: string, current: boolean) => void;
  onEdit: (id: string) => void;
  onAdd?: (id: string) => void;
}

const TuneRow = memo(function TuneRow({
  tune: t,
  picking,
  inSet,
  isLocal,
  onToggleMem,
  onEdit,
  onAdd,
}: RowProps) {
  return (
    <tr className={t.missing ? s.miss : undefined}>
      {picking && (
        <td>
          <button
            className="icon-btn"
            disabled={inSet}
            onClick={() => onAdd?.(t.id)}
            aria-label={inSet ? 'Ya está en el set' : `Añadir ${t.title} al set`}
            title={inSet ? 'Ya está en el set' : 'Añadir al set'}
          >
            {inSet ? <Check size={18} color="var(--mint)" /> : <Plus size={18} />}
          </button>
        </td>
      )}
      <td>
        <button
          className={`mem ${t.memorized ? 'on' : ''}`}
          onClick={() => onToggleMem(t.id, t.memorized)}
          aria-label={t.memorized ? 'Quitar de memoria' : 'Marcar de memoria'}
          aria-pressed={t.memorized}
        >
          ♦
        </button>
      </td>
      <td>
        <div className={s.tt}>
          {t.title} {t.missing && <span className="tag missing">falta</span>}{' '}
          {isLocal && <span className="tag local">local</span>}
        </div>
        <div className={s.cp}>{t.composer}</div>
      </td>
      <td>
        <span className="tag">{THEME_LABELS[t.theme]}</span>
      </td>
      <td>{FEEL_LABELS[t.feel]}</td>
      <td className={s.num}>{t.bpm}</td>
      <td className={s.num}>{t.key}</td>
      <td>{t.dance && <span className="tag dance">{DANCE_LABELS[t.dance]}</span>}</td>
      <td className={s.num}>{fmtMin(t.durationMin)}</td>
      <td>
        <button className="icon-btn" onClick={() => onEdit(t.id)} aria-label={`Editar ${t.title}`}>
          <Pencil size={17} />
        </button>
      </td>
    </tr>
  );
});
