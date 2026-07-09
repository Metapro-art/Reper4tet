import { Library, ListMusic, FileQuestion, Settings, HelpCircle } from 'lucide-react';
import { useUiStore, type View } from '../store/uiStore';
import { useMergedTunes } from '../store/selectors';

const TABS: { view: View; label: string; icon: typeof Library }[] = [
  { view: 'library', label: 'Biblioteca', icon: Library },
  { view: 'sets', label: 'Sets', icon: ListMusic },
  { view: 'missing', label: 'Faltantes', icon: FileQuestion },
  { view: 'settings', label: 'Ajustes', icon: Settings },
];

export function TabBar() {
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const stopPicking = useUiStore((s) => s.stopPicking);
  const pickingForSetId = useUiStore((s) => s.pickingForSetId);
  const openHelp = useUiStore((s) => s.openHelp);
  const missingCount = useMergedTunes().filter((t) => t.missing).length;

  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map(({ view: v, label, icon: Icon }) => (
        <button
          key={v}
          className={view === v ? 'on' : ''}
          onClick={() => {
            // salir del modo picker al navegar manualmente
            if (pickingForSetId && v !== 'library') stopPicking();
            setView(v);
          }}
          aria-current={view === v ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={1.8} />
          {label}
          {v === 'missing' && missingCount > 0 && <span className="badge">{missingCount}</span>}
        </button>
      ))}
      <button onClick={openHelp} aria-haspopup="dialog">
        <HelpCircle size={22} strokeWidth={1.8} />
        Ayuda
      </button>
    </nav>
  );
}
