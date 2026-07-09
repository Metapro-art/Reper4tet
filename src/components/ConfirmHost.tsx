import { useUiStore } from '../store/uiStore';

/** Diálogo de confirmación global (promesa desde uiStore.confirm). */
export function ConfirmHost() {
  const state = useUiStore((s) => s.confirmState);
  const resolve = useUiStore((s) => s.resolveConfirm);
  if (!state) return null;
  return (
    <div className="modal-backdrop" onClick={() => resolve(false)}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={state.title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{state.title}</h2>
        <p style={{ color: 'var(--muted)', margin: 0, whiteSpace: 'pre-line' }}>{state.body}</p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => resolve(false)}>
            Cancelar
          </button>
          <button
            className={`btn ${state.danger ? 'danger' : 'primary'}`}
            onClick={() => resolve(true)}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
