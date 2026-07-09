import { Copy, ClipboardCopy, Play, Plus, Printer, Trash2 } from 'lucide-react';
import { TARGET_SEC } from '../types';
import type { SetList } from '../types';
import { resolveEntries, setStatus, totalSec } from '../lib/setMath';
import { fmtSec } from '../lib/time';
import { buildSetText } from '../lib/setText';
import { copyText } from '../lib/download';
import { TimeBar } from '../components/TimeBar';
import { useSetsStore } from '../store/setsStore';
import { useTuneMap } from '../store/selectors';
import { useUiStore } from '../store/uiStore';
import s from './SetsView.module.css';

function defaultName(kind: 'libre' | 'ballroom'): string {
  const d = new Date();
  const stamp = `${d.getDate()}/${d.getMonth() + 1}`;
  return kind === 'ballroom' ? `Baile ${stamp}` : `Libre ${stamp}`;
}

export function SetsView() {
  const sets = useSetsStore((st) => st.sets);
  const createSet = useSetsStore((st) => st.createSet);
  const duplicateSet = useSetsStore((st) => st.duplicateSet);
  const deleteSet = useSetsStore((st) => st.deleteSet);
  const openSet = useUiStore((st) => st.openSet);
  const openStage = useUiStore((st) => st.openStage);
  const requestPrint = useUiStore((st) => st.requestPrint);
  const confirm = useUiStore((st) => st.confirm);
  const toast = useUiStore((st) => st.toast);
  const tuneMap = useTuneMap();

  const create = (kind: 'libre' | 'ballroom') => {
    const id = createSet(defaultName(kind), kind);
    openSet(id);
  };

  const del = async (set: SetList) => {
    const ok = await confirm({
      title: 'Borrar set',
      body: `«${set.name}» (${set.entries.length} temas) se borrará de esta tablet.`,
      confirmLabel: 'Borrar',
      danger: true,
    });
    if (ok) {
      deleteSet(set.id);
      toast('Set borrado');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Sets</h1>
        <span className="sub">4 al día · 45:00 exactos</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => create('ballroom')}>
            <Plus size={17} /> Set de baile
          </button>
          <button className="btn primary" onClick={() => create('libre')}>
            <Plus size={17} /> Set libre
          </button>
        </div>
      </div>

      <div className={s.grid}>
        {sets.length === 0 && (
          <div className={s.empty}>
            Todavía no hay sets. Crea uno y arma tus 45:00 exactos con la barra a escala.
          </div>
        )}
        {sets.map((set) => {
          const resolved = resolveEntries(set, tuneMap);
          const total = totalSec(resolved);
          const status = setStatus(total);
          return (
            <div
              key={set.id}
              className={s.card}
              onClick={() => openSet(set.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openSet(set.id);
              }}
            >
              <div className={s.cardHead}>
                <span className={s.cardName}>{set.name}</span>
                {set.kind === 'ballroom' && <span className="tag dance">Baile</span>}
                <span className={`${s.clock} ${s[status]}`}>
                  {fmtSec(total)}
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {' '}
                    / {fmtSec(TARGET_SEC)}
                  </span>
                </span>
              </div>
              <TimeBar resolved={resolved} compact />
              <div className={s.meta}>
                <span>
                  {set.entries.length} tema{set.entries.length === 1 ? '' : 's'}
                </span>
                <span>·</span>
                <span>
                  Actualizado{' '}
                  {new Date(set.updatedAt).toLocaleDateString('es', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
              <div className={s.actions} onClick={(e) => e.stopPropagation()}>
                <button
                  className="icon-btn"
                  title="Modo escenario"
                  aria-label="Modo escenario"
                  disabled={set.entries.length === 0}
                  onClick={() => openStage(set.id)}
                >
                  <Play size={18} />
                </button>
                <button
                  className="icon-btn"
                  title="Copiar como texto (WhatsApp)"
                  aria-label="Copiar como texto"
                  onClick={() => {
                    void copyText(buildSetText(set, resolveEntries(set, tuneMap))).then((ok) =>
                      toast(
                        ok ? 'Set copiado como texto' : 'No se pudo copiar',
                        ok ? 'ok' : 'warn',
                      ),
                    );
                  }}
                >
                  <ClipboardCopy size={18} />
                </button>
                <button
                  className="icon-btn"
                  title="Imprimir"
                  aria-label="Imprimir"
                  onClick={() => requestPrint(set.id)}
                >
                  <Printer size={18} />
                </button>
                <button
                  className="icon-btn"
                  title="Duplicar"
                  aria-label="Duplicar"
                  onClick={() => {
                    duplicateSet(set.id);
                    toast('Set duplicado');
                  }}
                >
                  <Copy size={18} />
                </button>
                <button
                  className="icon-btn"
                  title="Borrar"
                  aria-label="Borrar"
                  onClick={() => void del(set)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
