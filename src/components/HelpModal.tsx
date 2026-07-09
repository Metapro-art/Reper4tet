import { X } from 'lucide-react';
import ayudaMd from '../content/ayuda.md?raw';
import { renderMarkdown } from '../lib/markdown';
import { useUiStore } from '../store/uiStore';
import s from './HelpModal.module.css';

// El manual va bundleado (import ?raw): se parsea una sola vez, sin red.
const content = renderMarkdown(ayudaMd);

export function HelpModal() {
  const closeHelp = useUiStore((st) => st.closeHelp);
  return (
    <div className="modal-backdrop" onClick={closeHelp}>
      <div
        className={`modal ${s.help}`}
        role="dialog"
        aria-modal="true"
        aria-label="Ayuda"
        onClick={(e) => e.stopPropagation()}
      >
        <button className={`icon-btn ${s.close}`} onClick={closeHelp} aria-label="Cerrar ayuda">
          <X size={22} />
        </button>
        <div className={s.body}>{content}</div>
      </div>
    </div>
  );
}
