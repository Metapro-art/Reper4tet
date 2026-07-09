import { useMemo, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { Dance, Feel, Theme, Tune } from '../types';
import {
  DANCES,
  DANCE_LABELS,
  DEFAULT_DURATION_MIN,
  FEELS,
  FEEL_LABELS,
  THEMES,
  THEME_LABELS,
} from '../types';
import { BASE_BY_ID } from '../lib/merge';
import { useTuneMap } from '../store/selectors';
import { useLibraryStore } from '../store/libraryStore';
import { useUiStore } from '../store/uiStore';
import s from './TuneFormModal.module.css';

const KEYS = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
  'Cm',
  'C#m',
  'Dm',
  'Ebm',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'G#m',
  'Am',
  'Bbm',
  'Bm',
];

interface FormState {
  title: string;
  composer: string;
  theme: Theme;
  feel: Feel;
  bpm: string;
  key: string;
  dance: Dance | '';
  durationMin: number;
  memorized: boolean;
  missing: boolean;
  source: string;
  notes: string;
  altStyles: ReadonlySet<Feel>;
}

function fromTune(t: Tune): FormState {
  return {
    title: t.title,
    composer: t.composer,
    theme: t.theme,
    feel: t.feel,
    bpm: String(t.bpm),
    key: t.key,
    dance: t.dance ?? '',
    durationMin: t.durationMin,
    memorized: t.memorized,
    missing: t.missing,
    source: t.source ?? '',
    notes: t.notes ?? '',
    altStyles: new Set(t.altStyles ?? []),
  };
}

const EMPTY: FormState = {
  title: '',
  composer: '',
  theme: 'songbook',
  feel: 'swing',
  bpm: '120',
  key: 'C',
  dance: '',
  durationMin: DEFAULT_DURATION_MIN.swing,
  memorized: false,
  missing: false,
  source: '',
  notes: '',
  altStyles: new Set(),
};

export function TuneFormModal({ tuneId }: { tuneId: string }) {
  const isNew = tuneId === 'new';
  const tuneMap = useTuneMap();
  const existing = isNew ? undefined : tuneMap.get(tuneId);

  const openTuneEditor = useUiStore((st) => st.openTuneEditor);
  const confirm = useUiStore((st) => st.confirm);
  const toast = useUiStore((st) => st.toast);
  const addTune = useLibraryStore((st) => st.addTune);
  const updateTune = useLibraryStore((st) => st.updateTune);
  const removeTune = useLibraryStore((st) => st.removeTune);
  const restoreTune = useLibraryStore((st) => st.restoreTune);
  const hasOverride = useLibraryStore((st) => (isNew ? false : tuneId in st.overrides));

  const [form, setForm] = useState<FormState>(() => (existing ? fromTune(existing) : EMPTY));

  const isBase = useMemo(() => BASE_BY_ID.has(tuneId), [tuneId]);
  const close = () => openTuneEditor(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const changeFeel = (feel: Feel) =>
    setForm((f) => ({
      ...f,
      feel,
      // si la duración seguía en el valor por defecto del feel anterior, seguir al nuevo
      durationMin:
        f.durationMin === DEFAULT_DURATION_MIN[f.feel] ? DEFAULT_DURATION_MIN[feel] : f.durationMin,
    }));

  const save = () => {
    const title = form.title.trim();
    if (!title) {
      toast('El título es obligatorio', 'warn');
      return;
    }
    const bpm = Math.round(Number(form.bpm));
    if (!Number.isFinite(bpm) || bpm < 30 || bpm > 330) {
      toast('BPM fuera de rango (30–330)', 'warn');
      return;
    }
    const durationMin = Math.min(20, Math.max(1, Math.round(form.durationMin * 4) / 4));
    const alt = [...form.altStyles].filter((f) => f !== form.feel);
    const data: Omit<Tune, 'id'> = {
      title,
      composer: form.composer.trim(),
      theme: form.theme,
      feel: form.feel,
      bpm,
      key: form.key.trim() || 'C',
      dance: form.dance === '' ? undefined : form.dance,
      durationMin,
      memorized: form.memorized,
      missing: form.missing,
      source: form.source.trim() || undefined,
      altStyles: alt.length > 0 ? alt : undefined,
      notes: form.notes.trim() || undefined,
    };
    if (isNew) {
      addTune(data);
      toast(`Alta local: ${title}`);
    } else {
      updateTune(tuneId, data);
      toast('Guardado en esta tablet');
    }
    close();
  };

  const del = async () => {
    const ok = await confirm({
      title: isBase ? 'Ocultar tema base' : 'Borrar tema local',
      body: isBase
        ? `«${existing?.title}» se ocultará de la biblioteca de esta tablet. La base versionada no se toca; puedes restaurarlo desde Ajustes.`
        : `«${existing?.title}» es un alta local y se borrará definitivamente de esta tablet.`,
      confirmLabel: isBase ? 'Ocultar' : 'Borrar',
      danger: true,
    });
    if (!ok) return;
    removeTune(tuneId);
    toast(isBase ? 'Tema oculto' : 'Tema borrado');
    close();
  };

  const restore = async () => {
    const ok = await confirm({
      title: 'Restaurar versión base',
      body: 'Se descartan los cambios locales de este tema y vuelve la versión del repositorio.',
      confirmLabel: 'Restaurar',
    });
    if (!ok) return;
    restoreTune(tuneId);
    toast('Restaurado a la versión base');
    close();
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Nuevo tema' : `Editar ${existing?.title ?? ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{isNew ? 'Nuevo tema (alta local)' : 'Editar tema'}</h2>

        {!isNew && isBase && hasOverride && (
          <div className={`note info ${s.restore}`}>
            <span>Este tema base tiene cambios locales.</span>
            <button className="btn ghost" onClick={() => void restore()}>
              <RotateCcw size={16} /> Restaurar versión base
            </button>
          </div>
        )}

        <div className={s.grid}>
          <div className={`${s.field} ${s.full}`}>
            <label className="lbl" htmlFor="tf-title">
              Título *
            </label>
            <input
              id="tf-title"
              className="input"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>
          <div className={s.field}>
            <label className="lbl" htmlFor="tf-composer">
              Compositor
            </label>
            <input
              id="tf-composer"
              className="input"
              value={form.composer}
              onChange={(e) => set('composer', e.target.value)}
            />
          </div>
          <div className={s.field}>
            <label className="lbl" htmlFor="tf-theme">
              Temática
            </label>
            <select
              id="tf-theme"
              className="select"
              value={form.theme}
              onChange={(e) => set('theme', e.target.value as Theme)}
            >
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {THEME_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className={s.field}>
            <label className="lbl" htmlFor="tf-feel">
              Feel
            </label>
            <select
              id="tf-feel"
              className="select"
              value={form.feel}
              onChange={(e) => changeFeel(e.target.value as Feel)}
            >
              {FEELS.map((f) => (
                <option key={f} value={f}>
                  {FEEL_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <div className={s.field}>
            <label className="lbl" htmlFor="tf-bpm">
              BPM
            </label>
            <input
              id="tf-bpm"
              type="number"
              inputMode="numeric"
              className="input mono"
              value={form.bpm}
              onChange={(e) => set('bpm', e.target.value)}
            />
          </div>
          <div className={s.field}>
            <label className="lbl" htmlFor="tf-key">
              Tonalidad
            </label>
            <input
              id="tf-key"
              className="input mono"
              list="tf-keys"
              value={form.key}
              onChange={(e) => set('key', e.target.value)}
            />
            <datalist id="tf-keys">
              {KEYS.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>
          <div className={s.field}>
            <label className="lbl" htmlFor="tf-dance">
              Baile (ballroom)
            </label>
            <select
              id="tf-dance"
              className="select"
              value={form.dance}
              onChange={(e) => set('dance', e.target.value as Dance | '')}
            >
              <option value="">— sin baile —</option>
              {DANCES.map((d) => (
                <option key={d} value={d}>
                  {DANCE_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div className={s.field}>
            <label className="lbl" htmlFor="tf-dur">
              Duración (min)
            </label>
            <input
              id="tf-dur"
              type="number"
              inputMode="decimal"
              step={0.25}
              min={1}
              max={20}
              className="input mono"
              value={form.durationMin}
              onChange={(e) => set('durationMin', Number(e.target.value))}
            />
            <span className="lbl" style={{ textTransform: 'none', letterSpacing: 0 }}>
              Por defecto {FEEL_LABELS[form.feel]}: {DEFAULT_DURATION_MIN[form.feel]} min
            </span>
          </div>
          <div className={`${s.field} ${s.full}`}>
            <span className="lbl">Estilos alternativos</span>
            <div className={s.altChips}>
              {FEELS.filter((f) => f !== form.feel).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`chip ${form.altStyles.has(f) ? 'on' : ''}`}
                  onClick={() => {
                    const next = new Set(form.altStyles);
                    if (next.has(f)) next.delete(f);
                    else next.add(f);
                    set('altStyles', next);
                  }}
                >
                  {FEEL_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
          <div className={`${s.field} ${s.full}`}>
            <div className={s.checks}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.memorized}
                  onChange={(e) => set('memorized', e.target.checked)}
                />
                ♦ De memoria
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.missing}
                  onChange={(e) => set('missing', e.target.checked)}
                />
                Falta el chart
              </label>
            </div>
          </div>
          <div className={s.field}>
            <label className="lbl" htmlFor="tf-source">
              Fuente
            </label>
            <input
              id="tf-source"
              className="input"
              placeholder="p. ej. Screenshot_20260701…"
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
            />
          </div>
          <div className={`${s.field} ${s.full}`}>
            <label className="lbl" htmlFor="tf-notes">
              Notas
            </label>
            <textarea
              id="tf-notes"
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        {!isNew && <div className={s.meta}>id: {tuneId}</div>}

        <div className="modal-actions">
          {!isNew && (
            <button
              className="btn danger"
              onClick={() => void del()}
              style={{ marginRight: 'auto' }}
            >
              <Trash2 size={16} /> {isBase ? 'Ocultar' : 'Borrar'}
            </button>
          )}
          <button className="btn ghost" onClick={close}>
            Cancelar
          </button>
          <button className="btn primary" onClick={save}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
