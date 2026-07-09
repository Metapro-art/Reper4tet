import { useStoresHydrated } from './store/hydration';
import { useUiStore } from './store/uiStore';
import { TabBar } from './components/TabBar';
import { Toasts } from './components/Toasts';
import { ConfirmHost } from './components/ConfirmHost';
import { UpdatePrompt } from './components/UpdatePrompt';
import { TuneFormModal } from './components/TuneFormModal';
import { HelpModal } from './components/HelpModal';
import { LibraryView } from './views/LibraryView';
import { SetsView } from './views/SetsView';
import { SetEditorView } from './views/SetEditorView';
import { StageView } from './views/StageView';
import { MissingView } from './views/MissingView';
import { SettingsView } from './views/SettingsView';
import { PrintSheet } from './views/PrintSheet';

export default function App() {
  const hydrated = useStoresHydrated();
  const view = useUiStore((s) => s.view);
  const editingSetId = useUiStore((s) => s.editingSetId);
  const stageSetId = useUiStore((s) => s.stageSetId);
  const printSetId = useUiStore((s) => s.printSetId);
  const editingTuneId = useUiStore((s) => s.editingTuneId);
  const helpOpen = useUiStore((s) => s.helpOpen);

  if (!hydrated) return <div className="boot">Cargando repertorio…</div>;

  return (
    <>
      <div className="app-chrome">
        <main className="app-main">
          {view === 'library' && <LibraryView />}
          {view === 'sets' &&
            (editingSetId ? <SetEditorView setId={editingSetId} /> : <SetsView />)}
          {view === 'missing' && <MissingView />}
          {view === 'settings' && <SettingsView />}
        </main>
        <TabBar />
        <UpdatePrompt />
        <Toasts />
        <ConfirmHost />
        {editingTuneId !== null && <TuneFormModal tuneId={editingTuneId} />}
        {helpOpen && <HelpModal />}
        {stageSetId && <StageView setId={stageSetId} />}
      </div>
      {printSetId && <PrintSheet setId={printSetId} />}
    </>
  );
}
