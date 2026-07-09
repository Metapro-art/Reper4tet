import { useEffect, useMemo, useState } from 'react';
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
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ClipboardCopy,
  Copy,
  GripVertical,
  ListPlus,
  Play,
  Printer,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { DANCE_LABELS, FEELS, FEEL_LABELS, TARGET_SEC } from '../types';
import type { Feel, SetProfile } from '../types';
import { buildClockHint, resolveEntries, totalSec, type ResolvedEntry } from '../lib/setMath';
import { validateBallroom } from '../lib/ballroom';
import { buildSetText } from '../lib/setText';
import { copyText, shareText } from '../lib/download';
import { fmtSec } from '../lib/time';
import { TimeBar } from '../components/TimeBar';
import { useSetsStore } from '../store/setsStore';
import { useTuneMap } from '../store/selectors';
import { useUiStore } from '../store/uiStore';
import s from './SetEditorView.module.css';

const PROFILES: { id: SetProfile; label: string; dance?: boolean }[] = [
  { id: 'jazz', label: 'Jazz' },
  { id: 'cocktail', label: 'Cóctel' },
  { id: 'ballroom', label: 'Baile', dance: true },
];

export function SetEditorView({ setId }: { setId: string }) {
  const set = useSetsStore((st) => st.sets.find((x) => x.id === setId));
  const updateSet = useSetsStore((st) => st.updateSet);
  const duplicateSet = useSetsStore((st) => st.duplicateSet);
  const deleteSet = useSetsStore((st) => st.deleteSet);
  const removeEntry = useSetsStore((st) => st.removeEntry);
  const moveEntry = useSetsStore((st) => st.moveEntry);
  const setEntryFeel = useSetsStore((st) => st.setEntryFeel);
  const setEntryBpm = useSetsStore((st) => st.setEntryBpm);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!set) openSet(null);
  }, [set, openSet]);
  if (!set) return null;

  const profile = set.profile;
  const ballroom = profile === 'ballroom';
  const total = totalSec(resolved);
  const hint = buildClockHint(resolved);
  const status = hint.status;

  const ids = set.entries.map((e) => e.tuneId);

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) moveEntry(set.id, from, to);
  };

  const issues = ballroom ? validateBallroom(resolved) : [];
  const dupIndexes = new Set<number>();
  if (ballroom) {
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
        <div className={s.kind} role="radiogroup" aria-label="Perfil del set">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              className={`chip ${p.dance ? 'dance' : ''} ${profile === p.id ? 'on' : ''}`}
              role="radio"
              aria-checked={profile === p.id}
              onClick={() => updateSet(set.id, { profile: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={s.clockRow}>
        <div className={`${s.clock} ${s[status]}`}>
          {fmtSec(total)}
          <small>/ {fmtSec(TARGET_SEC)}</small>
        </div>
        <span className={`${s.statusTxt} ${s[status]}`}>{hint.text}</span>
        <span className={`lbl ${s.clockMeta}`} style={{ marginLeft: 'auto' }}>
          {set.entries.length} tema{set.entries.length === 1 ? '' : 's'} · transiciones 45 s
        </span>
      </div>

      <TimeBar resolved={resolved} />

      {set.entries.length === 0 ? (
        <div className={s.emptySet}>
          Set vacío. Toca <b>Añadir temas</b> para armar los 45:00.
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
                  ballroom={ballroom}
                  warnDup={dupIndexes.has(i)}
                  count={resolved.length}
                  onMove={(dir) => moveEntry(set.id, i, i + dir)}
                  onFeel={(feel) => setEntryFeel(set.id, i, feel)}
                  onBpm={(bpm) => setEntryBpm(set.id, i, bpm)}
                  onRemove={() => removeEntry(set.id, i)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {ballroom && set.entries.length > 0 && (
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
  count,
  ballroom,
  warnDup,
  onMove,
  onFeel,
  onBpm,
  onRemove,
}: {
  r: ResolvedEntry;
  index: number;
  count: number;
  ballroom: boolean;
  warnDup: boolean;
  onMove: (dir: number) => void;
  onFeel: (feel: Feel) => void;
  onBpm: (bpm: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: r.entry.tuneId,
  });
  const t = r.tune;
  const edited = t !== undefined && (r.feel !== t.feel || r.bpm !== t.bpm);
  const [bpmStr, setBpmStr] = useState(String(r.bpm));

  const commitBpm = () => {
    const n = Number(bpmStr);
    if (Number.isFinite(n) && n > 0) {
      const clamped = Math.max(30, Math.min(400, Math.round(n)));
      onBpm(clamped);
      setBpmStr(String(clamped));
    } else {
      setBpmStr(String(r.bpm));
    }
  };

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
      <div className={s.reorder}>
        <button
          className={s.reorderBtn}
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label={`Subir ${t?.title ?? 'tema'}`}
        >
          <ChevronUp size={20} />
        </button>
        <button
          className={s.reorderBtn}
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label={`Bajar ${t?.title ?? 'tema'}`}
        >
          <ChevronDown size={20} />
        </button>
      </div>
      <span className={s.idx}>{index + 1}</span>
      <div className={s.info}>
        <div className={s.titleRow}>
          <span className={s.title}>{t ? t.title : '(tema eliminado de la biblioteca)'}</span>
          <span className={`${s.dur} ${edited ? s.durEdited : ''}`}>{fmtSec(r.durationSec)}</span>
        </div>
        {t && (
          <div className={s.controls}>
            <select
              className={`select ${s.feelSel}`}
              value={r.feel}
              onChange={(e) => onFeel(e.target.value as Feel)}
              aria-label={`Feel de ${t.title}`}
            >
              {FEELS.map((f) => (
                <option key={f} value={f}>
                  {FEEL_LABELS[f]}
                </option>
              ))}
            </select>
            <input
              className={`input mono ${s.bpmInput}`}
              type="number"
              inputMode="numeric"
              value={bpmStr}
              onChange={(e) => setBpmStr(e.target.value)}
              onBlur={commitBpm}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              aria-label={`Tempo de ${t.title} (bpm)`}
            />
            <span className={s.bpmLbl}>bpm</span>
            {ballroom && t.dance && <span className="tag dance">{DANCE_LABELS[t.dance]}</span>}
            {t.memorized && <span className={s.mem}>♦</span>}
            <button
              className={s.removeBtn}
              onClick={onRemove}
              aria-label={`Quitar ${t.title}`}
            >
              <X size={19} />
            </button>
          </div>
        )}
        {!t && (
          <div className={s.controls}>
            <button className={s.removeBtn} onClick={onRemove} aria-label="Quitar tema eliminado">
              <X size={19} />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
