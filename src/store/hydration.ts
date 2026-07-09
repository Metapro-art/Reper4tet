import { useEffect, useState } from 'react';
import { useLibraryStore } from './libraryStore';
import { useSetsStore } from './setsStore';

/**
 * true cuando los stores persistidos terminaron de leer IndexedDB.
 * La app no renderiza contenido antes (evita ver el estado vacío un instante).
 */
export function useStoresHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    () => useLibraryStore.persist.hasHydrated() && useSetsStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    const check = () => {
      if (useLibraryStore.persist.hasHydrated() && useSetsStore.persist.hasHydrated()) {
        setHydrated(true);
      }
    };
    const u1 = useLibraryStore.persist.onFinishHydration(check);
    const u2 = useSetsStore.persist.onFinishHydration(check);
    check();
    return () => {
      u1();
      u2();
    };
  }, [hydrated]);
  return hydrated;
}
