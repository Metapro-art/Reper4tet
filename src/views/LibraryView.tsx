import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, Pencil, Plus, X } from 'lucide-react';
import type { Dance, Feel, Style, Theme, Tune } from '../types';
import {
  DANCES,
  DANCE_LABELS,
  FEELS,
  FEEL_LABELS,
  STYLES,
  STYLE_LABELS,
  THEMES,
  THEME_LABELS,
} from '../types';
import { createSearcher } from '../lib/search';
import { fmtSec } from '../lib/time';
import { chorusSec, totalSec, resolveEntries, setStatus } from '../lib/setMath';
import { sortTitleKey } from '../lib/alpha';
import { BASE_BY_ID } from '../lib/merge';
import { useMergedTunes, useTuneMap } from '../store/selectors';
import { useLibraryStore } from '../store/libraryStore';
import { useSetsStore } from '../store/setsStore';
import { useUiStore } from '../store/uiStore';
import { useFilterStore } from '../store/filterStore';
import { MobileLibraryList } from './MobileLibraryList';
import s from './LibraryView.module.css';

type SortKey = 'title' | 'theme' | 'style' | 'feel' | 'bpm' | 'key' | 'dance' | 'chorus';

const SORT_LABELS: [SortKey, string][] = [
  ['title', 'Tema'],
  ['theme', 'Temática'],
  ['style', 'Estilo'],
  ['feel', 'Feel'],
  ['bpm', 'BPM'],
  ['key', 'Ton.'],
  ['dance', 'Baile'],
  ['chorus', 'Vuelta'],
];

function sortValue(t: Tune, key: SortKey): string | number {
  switch (key) {
    case 'bpm':
      return t.bpm;
    case 'chorus':
      return chorusSec(t);
    case 'theme':
      return THEME_LABELS[t.theme];
    case 'style':
      return STYLE_LABELS[t.style];
    case 'feel':
      return FEEL_LABELS[t.feel];
    case 'dance':
      return t.dance ? DANCE_LABELS[t.dance] : '￿'; // sin baile al final
    case 'key':
      return t.key.toLowerCase();
    default:
      return sortTitleKey(t.title);
  }
}

function toggleIn<T>(set: ReadonlySet<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

/** Media query reactiva: ≥ 768px = escritorio (tabla), si no móvil (lista densa). */
function useWide(): boolean {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

function FilterSection({
  id,
  title,
  count,
  defaultOpen,
  children,
}: {
  id: string;
  title: string;
  count: number;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const stored = useFilterStore((st) => st.openGroups[id]);
  const setGroupOpen = useFilterStore((st) => st.setGroupOpen);
  const open = stored ?? defaultOpen;
  return (
    <details
      className={s.section}
      open={open}
      onToggle={(e) => {
        const o = e.currentTarget.open;
        if (o !== open) setGroupOpen(id, o);
      }}
    >
      <summary className={s.summary}>
        <span className={s.summaryTitle}>{title}</span>
        {count > 0 && <span className={s.summaryCount}>{count}</span>}
      </summary>
      <div className={s.sectionBody}>{children}</div>
    </details>
  );
}

export function LibraryView() {
  const tunes = useMergedTunes();
  const overrides = useLibraryStore((st) => st.overrides);
  const toggleMemorized = useLibraryStore((st) => st.toggleMemorized);
  const removeTune = useLibraryStore((st) => st.removeTune);
  const addTune = useLibraryStore((st) => st.addTune);
  const openTuneEditor = useUiStore((st) => st.openTuneEditor);
  const confirm = useUiStore((st) => st.confirm);

  const pickingForSetId = useUiStore((st) => st.pickingForSetId);
  const stopPicking = useUiStore((st) => st.stopPicking);
  const pickingSet = useSetsStore((st) =>
    pickingForSetId ? st.sets.find((x) => x.id === pickingForSetId) : undefined,
  );
  const addEntry = useSetsStore((st) => st.addEntry);
  const toast = useUiStore((st) => st.toast);
  const tuneMap = useTuneMap();

  const wide = useWide();
  const filtersBarOpen = useFilterStore((st) => st.openGroups['mobile-filters']) ?? false;
  const setGroupOpen = useFilterStore((st) => st.setGroupOpen);

  const [q, setQ] = useState('');
  const [themes, setThemes] = useState<ReadonlySet<Theme>>(new Set());
  const [styles, setStyles] = useState<ReadonlySet<Style>>(new Set());
  const [feels, setFeels] = useState<ReadonlySet<Feel>>(new Set());
  const [dances, setDances] = useState<ReadonlySet<Dance>>(new Set());
  const [onlyMem, setOnlyMem] = useState(false);
  const [hideMissing, setHideMissing] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'title', asc: true });

  const searcher = useMemo(() => createSearcher(tunes), [tunes]);
  const searched = useMemo(() => searcher(q), [searcher, q]);

  const baseFiltered = useMemo(
    () =>
      searched.filter((t) => {
        if (hideMissing && t.missing) return false;
        if (onlyMem && !t.memorized) return false;
        return true;
      }),
    [searched, hideMissing, onlyMem],
  );

  const filtered = useMemo(
    () =>
      baseFiltered.filter((t) => {
        if (themes.size > 0 && !themes.has(t.theme)) return false;
        if (styles.size > 0 && !styles.has(t.style)) return false;
        if (feels.size > 0 && !feels.has(t.feel)) return false;
        if (dances.size > 0 && (!t.dance || !dances.has(t.dance))) return false;
        return true;
      }),
    [baseFiltered, themes, styles, feels, dances],
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

  const facetCounts = useMemo(() => {
    const th = new Map<Theme, number>();
    const st = new Map<Style, number>();
    const fe = new Map<Feel, number>();
    const da = new Map<Dance, number>();
    for (const t of baseFiltered) {
      const okTh = themes.size === 0 || themes.has(t.theme);
      const okSt = styles.size === 0 || styles.has(t.style);
      const okFe = feels.size === 0 || feels.has(t.feel);
      const okDa = dances.size === 0 || (t.dance != null && dances.has(t.dance));
      if (okSt && okFe && okDa) th.set(t.theme, (th.get(t.theme) ?? 0) + 1);
      if (okTh && okFe && okDa) st.set(t.style, (st.get(t.style) ?? 0) + 1);
      if (okTh && okSt && okDa) fe.set(t.feel, (fe.get(t.feel) ?? 0) + 1);
      if (okTh && okSt && okFe && t.dance) da.set(t.dance, (da.get(t.dance) ?? 0) + 1);
    }
    return { th, st, fe, da };
  }, [baseFiltered, themes, styles, feels, dances]);

  const anyFilter =
    q !== '' ||
    themes.size > 0 ||
    styles.size > 0 ||
    feels.size > 0 ||
    dances.size > 0 ||
    onlyMem ||
    hideMissing;

  const clearAll = () => {
    setQ('');
    setThemes(new Set());
    setStyles(new Set());
    setFeels(new Set());
    setDances(new Set());
    setOnlyMem(false);
    setHideMissing(false);
  };

  const activeChips: { key: string; label: string; remove: () => void }[] = [];
  if (q) activeChips.push({ key: 'q', label: `«${q}»`, remove: () => setQ('') });
  themes.forEach((t) =>
    activeChips.push({ key: `t-${t}`, label: THEME_LABELS[t], remove: () => setThemes(toggleIn(themes, t)) }),
  );
  styles.forEach((st) =>
    activeChips.push({ key: `s-${st}`, label: STYLE_LABELS[st], remove: () => setStyles(toggleIn(styles, st)) }),
  );
  feels.forEach((f) =>
    activeChips.push({ key: `f-${f}`, label: FEEL_LABELS[f], remove: () => setFeels(toggleIn(feels, f)) }),
  );
  dances.forEach((d) =>
    activeChips.push({ key: `d-${d}`, label: DANCE_LABELS[d], remove: () => setDances(toggleIn(dances, d)) }),
  );
  if (onlyMem) activeChips.push({ key: 'mem', label: 'De memoria', remove: () => setOnlyMem(false) });
  if (hideMissing)
    activeChips.push({ key: 'miss', label: 'Sin faltantes', remove: () => setHideMissing(false) });

  const clickSort = (key: SortKey) =>
    setSort((prev) => (prev.key === key ? { key, asc: !prev.asc } : { key, asc: true }));

  const pickerTotal = pickingSet ? totalSec(resolveEntries(pickingSet, tuneMap)) : 0;
  const pickerIds = useMemo(
    () => new Set(pickingSet?.entries.map((e) => e.tuneId) ?? []),
    [pickingSet],
  );
  const missingTotal = tunes.filter((t) => t.missing).length;

  const handleAdd = (id: string) => {
    if (!pickingForSetId) return;
    const t2 = tuneMap.get(id);
    if (addEntry(pickingForSetId, id)) toast(`Añadido: ${t2?.title ?? id}`);
    else toast('Ya está en el set', 'warn');
  };

  const handleDelete = async (t: Tune) => {
    const isBase = BASE_BY_ID.has(t.id);
    const ok = await confirm({
      title: isBase ? 'Ocultar tema base' : 'Borrar tema local',
      body: isBase
        ? `«${t.title}» se ocultará de esta tablet. La base versionada no se toca.`
        : `«${t.title}» es un alta local y se borrará de esta tablet.`,
      confirmLabel: isBase ? 'Ocultar' : 'Borrar',
      danger: true,
    });
    if (ok) {
      removeTune(t.id);
      toast(isBase ? 'Tema oculto' : 'Tema borrado');
    }
  };

  const handleDuplicate = (t: Tune) => {
    const { id: _id, ...rest } = t;
    void _id;
    const newId = addTune({ ...rest, title: `${rest.title} (copia)` });
    toast('Copia local creada');
    openTuneEditor(newId);
  };

  const pickerBar = pickingSet ? (
    <div className={s.pickerBar}>
      <span className={s.pickerName}>Añadiendo a «{pickingSet.name}»</span>
      <span className={`${s.pickerClock} ${s[setStatus(pickerTotal)]}`}>
        {fmtSec(pickerTotal)} <span style={{ color: 'var(--muted)', fontSize: 13 }}>/ 45:00</span>
      </span>
      <button className="btn primary" onClick={stopPicking}>
        <Check size={17} /> Listo
      </button>
    </div>
  ) : null;

  const searchInput = (
    <input
      type="search"
      className={`input ${s.search}`}
      placeholder="Buscar título o compositor…"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      aria-label="Buscar"
    />
  );

  const activeBar = anyFilter ? (
    <div className={s.activeBar}>
      {activeChips.map((c) => (
        <button key={c.key} className={s.activeChip} onClick={c.remove}>
          {c.label} <X size={13} />
        </button>
      ))}
      <button className={`btn ghost ${s.clearBtn}`} onClick={clearAll}>
        Limpiar todo
      </button>
    </div>
  ) : null;

  const filters = (
    <>
      <FilterSection id="theme" title="Temática" count={themes.size} defaultOpen={wide}>
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
      </FilterSection>

      <FilterSection id="style" title="Estilo" count={styles.size} defaultOpen={wide}>
        <div className="chips">
          {STYLES.filter((st) => (facetCounts.st.get(st) ?? 0) > 0 || styles.has(st)).map((st) => (
            <button
              key={st}
              className={`chip ${styles.has(st) ? 'on' : ''}`}
              onClick={() => setStyles(toggleIn(styles, st))}
            >
              {STYLE_LABELS[st]}
              <span className="n">{facetCounts.st.get(st) ?? 0}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection id="feel" title="Feel" count={feels.size} defaultOpen={wide}>
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
      </FilterSection>

      <FilterSection id="dance" title="Ritmo de baile" count={dances.size} defaultOpen={wide}>
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
      </FilterSection>

      <FilterSection
        id="opts"
        title="Opciones"
        count={(onlyMem ? 1 : 0) + (hideMissing ? 1 : 0)}
        defaultOpen={wide}
      >
        <div className={s.optsRow}>
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
        </div>
      </FilterSection>
    </>
  );

  // ---------- Móvil: lista densa virtualizada ----------
  if (!wide) {
    const filterChips = activeChips.filter((c) => c.key !== 'q');
    const activeFilterCount =
      themes.size + styles.size + feels.size + dances.size + (onlyMem ? 1 : 0) + (hideMissing ? 1 : 0);
    return (
      <div className={s.mobileRoot}>
        <div className={s.mobileChrome}>
          {pickerBar}
          <div className={s.mobileTop}>
            {searchInput}
            <button
              className="icon-btn"
              onClick={() => openTuneEditor('new')}
              aria-label="Nuevo tema"
              title="Nuevo tema"
            >
              <Plus size={22} />
            </button>
          </div>

          <button
            className={s.filtersBar}
            aria-expanded={filtersBarOpen}
            onClick={() => setGroupOpen('mobile-filters', !filtersBarOpen)}
          >
            <span className={s.filtersBarLabel}>
              Filtros
              {activeFilterCount > 0 && <span className={s.filtersCount}>{activeFilterCount}</span>}
            </span>
            {filtersBarOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {filtersBarOpen ? (
            <div className={s.filtersPanel}>
              <div className={s.filtersPanelTop}>
                <label className={`lbl ${s.mSort}`}>
                  Orden
                  <select
                    className="select"
                    value={sort.key}
                    onChange={(e) => setSort({ key: e.target.value as SortKey, asc: true })}
                  >
                    {SORT_LABELS.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {anyFilter && (
                  <button className="btn ghost" onClick={clearAll}>
                    Limpiar todo
                  </button>
                )}
              </div>
              {filters}
            </div>
          ) : (
            filterChips.length > 0 && (
              <div className={s.chipRow}>
                {filterChips.map((c) => (
                  <button key={c.key} className={s.chipRowItem} onClick={c.remove}>
                    {c.label} <X size={12} />
                  </button>
                ))}
                <button className={s.chipRowClear} onClick={clearAll}>
                  Limpiar
                </button>
              </div>
            )
          )}
        </div>
        <MobileLibraryList
          sorted={sorted}
          showIndex={sort.key === 'title'}
          picking={Boolean(pickingSet)}
          pickerIds={pickerIds}
          overrides={overrides}
          onToggleMem={toggleMemorized}
          onAdd={pickingForSetId ? handleAdd : undefined}
          onEdit={openTuneEditor}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </div>
    );
  }

  // ---------- Escritorio: tabla ----------
  return (
    <div>
      {pickerBar}

      <div className="page-head">
        <h1>Biblioteca</h1>
        <span className="sub">Cuarteto · gtr / pno / bajo / bat</span>
        <div className={s.headBtns}>
          <button className="btn" onClick={() => openTuneEditor('new')}>
            <Plus size={17} /> Nuevo tema
          </button>
        </div>
      </div>

      <div className={s.controls}>{searchInput}</div>

      {activeBar}
      {filters}

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
                onAdd={pickingForSetId ? handleAdd : undefined}
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
        {t.altTitle && <div className={s.altTitle}>{t.altTitle}</div>}
        <div className={s.cp}>{t.composer}</div>
      </td>
      <td>
        <span className="tag">{THEME_LABELS[t.theme]}</span>
      </td>
      <td>{STYLE_LABELS[t.style]}</td>
      <td>{FEEL_LABELS[t.feel]}</td>
      <td className={s.num}>{t.bpm}</td>
      <td className={s.num}>{t.key}</td>
      <td>{t.dance && <span className="tag dance">{DANCE_LABELS[t.dance]}</span>}</td>
      <td className={s.num} title="Duración de una vuelta (forma × tempo)">
        {fmtSec(chorusSec(t))}
      </td>
      <td>
        <button className="icon-btn" onClick={() => onEdit(t.id)} aria-label={`Editar ${t.title}`}>
          <Pencil size={17} />
        </button>
      </td>
    </tr>
  );
});
