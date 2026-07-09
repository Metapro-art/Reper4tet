import { useEffect, useState } from 'react';
import { useLibraryStore } from './libraryStore';
import { useSetsStore } from './setsStore';
import { useFilterStore } from './filterStore';

const allHydrated = () =>
  useLibraryStore.persist.hasHydrated() &&
  useSetsStore.persist.hasHydrated() &&
  useFilterStore.persist.hasHydrated();

/**
 * true cuando los stores persistidos terminaron de leer IndexedDB.
 * La app no renderiza contenido antes (evita ver el estado vacío un instante).
 */
export function useStoresHydrated(): boolean {
  const [hydrated, setHydrated] = useState(allHydrated);
  useEffect(() => {
    if (hydrated) return;
    const check = () => {
      if (allHydrated()) setHydrated(true);
    };
    const u1 = useLibraryStore.persist.onFinishHydration(check);
    const u2 = useSetsStore.persist.onFinishHydration(check);
    const u3 = useFilterStore.persist.onFinishHydration(check);
    check();
    return () => {
      u1();
      u2();
      u3();
    };
  }, [hydrated]);
  return hydrated;
}
