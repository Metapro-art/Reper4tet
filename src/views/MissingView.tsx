import { Check } from 'lucide-react';
import { FEEL_LABELS, THEMES, THEME_LABELS } from '../types';
import { useMergedTunes } from '../store/selectors';
import { useLibraryStore } from '../store/libraryStore';
import { useUiStore } from '../store/uiStore';
import s from './MissingView.module.css';

/** Charts por conseguir en los puertos con internet, agrupados por temática. */
export function MissingView() {
  const tunes = useMergedTunes();
  const setMissing = useLibraryStore((st) => st.setMissing);
  const toast = useUiStore((st) => st.toast);

  const missing = tunes.filter((t) => t.missing);

  return (
    <div>
      <div className="page-head">
        <h1>Faltantes</h1>
        <span className="sub">
          {missing.length} chart{missing.length === 1 ? '' : 's'} por conseguir
        </span>
      </div>
      <p className="note info" style={{ maxWidth: 640 }}>
        Los marcados ♦ están de memoria: se pueden tocar aunque falte el chart. Cuando consigas un
        chart, toca «Ya lo tengo».
      </p>

      {missing.length === 0 && (
        <p className="note good" style={{ marginTop: 18 }}>
          No falta ningún chart. Biblioteca completa.
        </p>
      )}

      {THEMES.map((theme) => {
        const group = missing.filter((t) => t.theme === theme);
        if (group.length === 0) return null;
        return (
          <section key={theme} className={s.group}>
            <h2 className={s.groupTitle}>
              {THEME_LABELS[theme]} <span className="n mono">{group.length}</span>
            </h2>
            <ul className={s.list}>
              {group.map((t) => (
                <li key={t.id} className={s.row}>
                  <div className={s.info}>
                    <span className={s.title}>
                      {t.title} {t.memorized && <span style={{ color: 'var(--mint)' }}>♦</span>}
                    </span>
                    <span className={s.sub}>
                      {t.composer} · {FEEL_LABELS[t.feel]} · <span className="mono">{t.bpm}</span> ·{' '}
                      <span className="mono">{t.key}</span>
                    </span>
                  </div>
                  <button
                    className="btn"
                    onClick={() => {
                      setMissing(t.id, false);
                      toast(`Conseguido: ${t.title}`);
                    }}
                  >
                    <Check size={16} /> Ya lo tengo
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
