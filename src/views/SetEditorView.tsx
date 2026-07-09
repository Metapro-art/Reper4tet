import { useEffect, useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronLeft,
  ClipboardCopy,
  Copy,
  GripVertical,
  ListPlus,
  Minus,
  Play,
  Plus,
  Printer,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { DANCE_LABELS, FEEL_LABELS, TARGET_SEC } from '../types';
import type { SetKind } from '../types';
import { resolveEntries, setStatus, totalSec, type ResolvedEntry } from '../lib/setMath';
import { validateBallroom } from '../lib/ballroom';
import { buildSetText } from '../lib/setText';
import { copyText, shareText } from '../lib/download';
import { fmtSec } from '../lib/time';
import { TimeBar } from '../components/TimeBar';
import { useSetsStore } from '../store/setsStore';
import { useTuneMap } from '../store/selectors';
import { useUiStore } from '../store/uiStore';
import s from './SetEditorView.module.css';

export function SetEditorView({ setId }: { setId: string }) {
  const set = useSetsStore((st) => st.sets.find((x) => x.id === setId));
  const updateSet = useSetsStore((st) => st.updateSet);
  const duplicateSet = useSetsStore((st) => st.duplicateSet);
  const deleteSet = useSetsStore((st) => st.deleteSet);
  const removeEntry = useSetsStore((st) => st.removeEntry);
  const moveEntry = useSetsStore((st) => st.moveEntry);
  const setEntryDuration = useSetsStore((st) => st.setEntryDuration);

  const openSet = useUiStore((st) => st.openSet);
  const openStage = useUiStore((st) => st.openStage);
  const startPicking = useUiStore((st) => st.startPicking);
  const requestPrint = useUiStore((st) => st.requestPrint);
  const confirm = useUiStore((st) => st.confirm);
  const toast = useUiStore((st) => st.toast);

  const tuneMap = useTuneMap();
  const resolved: ResolvedEntry[] = useMemo(
    () => (set ? resolveEntries(set, tuneMap) : []),
    [set, tuneMap],
  );
  const total = totalSec(resolved);
  const status = setStatus(total);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // si el set fue borrado, volver a la lista
  useEffect(() => {
    if (!set) openSet(null);
  }, [set, openSet]);
  if (!set) return null;

  const ids = set.entries.map((e) => e.tuneId);

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) moveEntry(set.id, from, to);
  };

  const statusText =
    status === 'over'
      ? `Te pasas ${fmtSec(total - TARGET_SEC)} — quita un tema o recorta solos`
      : status === 'near'
        ? `Al límite · margen ${fmtSec(TARGET_SEC - total)}`
        : `Margen ${fmtSec(TARGET_SEC - total)}`;

  const issues = set.kind === 'ballroom' ? validateBallroom(resolved) : [];
  const dupIndexes = new Set<number>();
  if (set.kind === 'ballroom') {
    for (let i = 1; i < resolved.length; i++) {
      const d = resolved[i].tune?.dance;
      if (d && d === resolved[i - 1].tune?.dance) {
        dupIndexes.add(i - 1);
        dupIndexes.add(i);
      }
    }
  }

  const exportCopy = async () => {
    const ok = await copyText(buildSetText(set, resolved));
    toast(ok ? 'Set copiado como texto' : 'No se pudo copiar', ok ? 'ok' : 'warn');
  };
  const exportShare = async () => {
    const ok = await shareText(set.name, buildSetText(set, resolved));
    if (!ok) await exportCopy();
  };

  const del = async () => {
    const ok = await confirm({
      title: 'Borrar set',
      body: `«${set.name}» se borrará de esta tablet.`,
      confirmLabel: 'Borrar',
      danger: true,
    });
    if (ok) {
      deleteSet(set.id);
      toast('Set borrado');
      openSet(null);
    }
  };

  return (
    <div>
      <div className={s.head}>
        <button className="icon-btn" onClick={() => openSet(null)} aria-label="Volver a sets">
          <ChevronLeft size={22} />
        </button>
        <input
          className={`input ${s.name}`}
          value={set.name}
          onChange={(e) => updateSet(set.id, { name: e.target.value })}
          aria-label="Nombre del set"
        />
        <div className={s.kind} role="radiogroup" aria-label="Tipo de set">
          {(['libre', 'ballroom'] as SetKind[]).map((k) => (
            <button
              key={k}
              className={`chip ${k === 'ballroom' ? 'dance' : ''} ${set.kind === k ? 'on' : ''}`}
              role="radio"
              aria-checked={set.kind === k}
              onClick={() => updateSet(set.id, { kind: k })}
            >
              {k === 'libre' ? 'Libre' : 'Baile'}
            </button>
          ))}
        </div>
      </div>

      <div className={s.clockRow}>
        <div className={`${s.clock} ${s[status]}`}>
          {fmtSec(total)}
          <small>/ {fmtSec(TARGET_SEC)}</small>
        </div>
        <span className={`${s.statusTxt} ${s[status]}`}>{statusText}</span>
        <span className="lbl" style={{ marginLeft: 'auto' }}>
          {set.entries.length} tema{set.entries.length === 1 ? '' : 's'} · transiciones 45 s
        </span>
      </div>

      <TimeBar resolved={resolved} />

      {set.entries.length === 0 ? (
        <div className={s.emptySet}>
          Set vacío. Toca <b>Añadir temas</b> para armar los 45:00 — 7 temas ≈ 44:45 con
          transiciones.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ol className={s.list}>
              {resolved.map((r, i) => (
                <SortableEntryRow
                  key={r.entry.tuneId}
                  r={r}
                  index={i}
                  ballroom={set.kind === 'ballroom'}
                  warnDup={dupIndexes.has(i)}
                  onStep={(delta) => {
                    const cur = r.entry.durationMin ?? r.tune?.durationMin ?? 5.75;
                    const next = Math.min(20, Math.max(1, Math.round((cur + delta) * 2) / 2));
                    setEntryDuration(set.id, i, next);
                  }}
                  onRemove={() => removeEntry(set.id, i)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {set.kind === 'ballroom' && set.entries.length > 0 && (
        <div className={s.validator}>
          {issues.length === 0 ? (
            <div className="note good">Rotación de ritmos OK</div>
          ) : (
            issues.map((issue, i) => (
              <div key={i} className={`note ${issue.level === 'warn' ? 'warn' : 'info'}`}>
                {issue.text}
              </div>
            ))
          )}
        </div>
      )}

      <div className={s.footer}>
        <button className="btn primary" onClick={() => startPicking(set.id)}>
          <ListPlus size={18} /> Añadir temas
        </button>
        <button
          className="btn"
          disabled={set.entries.length === 0}
          onClick={() => openStage(set.id)}
        >
          <Play size={17} /> Escenario
        </button>
        <button className="btn" onClick={() => void exportCopy()}>
          <ClipboardCopy size={17} /> Copiar
        </button>
        <button className="btn" onClick={() => void exportShare()}>
          <Share2 size={17} /> Compartir
        </button>
        <button className="btn" onClick={() => requestPrint(set.id)}>
          <Printer size={17} /> Imprimir
        </button>
        <button
          className="btn"
          onClick={() => {
            const nid = duplicateSet(set.id);
            if (nid) {
              toast('Set duplicado');
              openSet(nid);
            }
          }}
        >
          <Copy size={17} /> Duplicar
        </button>
        <button className="btn danger" onClick={() => void del()}>
          <Trash2 size={17} /> Borrar
        </button>
      </div>
    </div>
  );
}

function SortableEntryRow({
  r,
  index,
  ballroom,
  warnDup,
  onStep,
  onRemove,
}: {
  r: ResolvedEntry;
  index: number;
  ballroom: boolean;
  warnDup: boolean;
  onStep: (delta: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: r.entry.tuneId,
  });
  const t = r.tune;
  const edited = r.entry.durationMin !== undefined;

  return (
    <li
      ref={setNodeRef}
      className={`${s.rowLi} ${isDragging ? s.dragging : ''} ${warnDup ? s.warnDup : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        className={`icon-btn ${s.grip}`}
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${t?.title ?? 'tema'}`}
      >
        <GripVertical size={19} />
      </button>
      <span className={s.idx}>{index + 1}</span>
      <div className={s.info}>
        <div className={s.title}>{t ? t.title : '(tema eliminado de la biblioteca)'}</div>
        {t && (
          <div className={s.subInfo}>
            <span className="mono">{t.key}</span>
            <span className="mono">{t.bpm} bpm</span>
            <span>{FEEL_LABELS[t.feel]}</span>
            {ballroom &&
              (t.dance ? (
                <span className="tag dance">{DANCE_LABELS[t.dance]}</span>
              ) : (
                <span className="tag">sin baile</span>
              ))}
            {t.memorized && <span style={{ color: 'var(--mint)' }}>♦</span>}
          </div>
        )}
      </div>
      <button className="icon-btn" onClick={() => onStep(-0.5)} aria-label="Restar 30 segundos">
        <Minus size={18} />
      </button>
      <span className={`${s.dur} ${edited ? s.durEdited : ''}`} title="Duración de este tema">
        {fmtSec(r.durationSec)}
      </span>
      <button className="icon-btn" onClick={() => onStep(0.5)} aria-label="Sumar 30 segundos">
        <Plus size={18} />
      </button>
      <button className="icon-btn" onClick={onRemove} aria-label={`Quitar ${t?.title ?? 'tema'}`}>
        <X size={19} />
      </button>
    </li>
  );
}
