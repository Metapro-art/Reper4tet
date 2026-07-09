import { create } from 'zustand';

export type View = 'library' | 'sets' | 'missing' | 'settings';

export interface Toast {
  id: number;
  msg: string;
  tone: 'ok' | 'warn';
}

interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (v: boolean) => void;
}

interface UiState {
  view: View;
  setView: (v: View) => void;

  /** Set abierto en el editor (dentro del tab Sets). */
  editingSetId: string | null;
  openSet: (id: string | null) => void;

  /** Biblioteca en modo picker: añadiendo temas a este set. */
  pickingForSetId: string | null;
  startPicking: (setId: string) => void;
  stopPicking: () => void;

  stageSetId: string | null;
  openStage: (id: string | null) => void;

  printSetId: string | null;
  requestPrint: (id: string | null) => void;

  editingTuneId: string | null; // modal editor de temas ('new' = alta)
  openTuneEditor: (id: string | null) => void;

  helpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;

  toasts: Toast[];
  toast: (msg: string, tone?: 'ok' | 'warn') => void;
  dismissToast: (id: number) => void;

  confirmState: ConfirmRequest | null;
  confirm: (opts: {
    title: string;
    body: string;
    confirmLabel?: string;
    danger?: boolean;
  }) => Promise<boolean>;
  resolveConfirm: (v: boolean) => void;
}

let toastSeq = 1;

export const useUiStore = create<UiState>()((set, get) => ({
  view: 'library',
  setView: (view) => set({ view }),

  editingSetId: null,
  openSet: (editingSetId) => set({ editingSetId, view: 'sets' }),

  pickingForSetId: null,
  startPicking: (setId) => set({ pickingForSetId: setId, view: 'library' }),
  stopPicking: () => set({ pickingForSetId: null, view: 'sets' }),

  stageSetId: null,
  openStage: (stageSetId) => set({ stageSetId }),

  printSetId: null,
  requestPrint: (printSetId) => set({ printSetId }),

  editingTuneId: null,
  openTuneEditor: (editingTuneId) => set({ editingTuneId }),

  helpOpen: false,
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),

  toasts: [],
  toast: (msg, tone = 'ok') => {
    const id = toastSeq++;
    set({ toasts: [...get().toasts, { id, msg, tone }] });
    setTimeout(() => get().dismissToast(id), 3500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  confirmState: null,
  confirm: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        confirmState: {
          title: opts.title,
          body: opts.body,
          confirmLabel: opts.confirmLabel ?? 'Confirmar',
          danger: opts.danger ?? false,
          resolve,
        },
      });
    }),
  resolveConfirm: (v) => {
    get().confirmState?.resolve(v);
    set({ confirmState: null });
  },
}));
