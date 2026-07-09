import { useEffect, useState } from 'react';

/**
 * Mantiene la pantalla encendida mientras el componente está montado
 * (modo escenario). Se re-adquiere al volver a primer plano.
 */
export function useWakeLock(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
        setActive(true);
        s.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, []);

  return active;
}
