import { useRegisterSW } from 'virtual:pwa-register/react';
import { useUiStore } from '../store/uiStore';

const HOUR = 60 * 60 * 1000;

/**
 * registerType 'prompt': el SW nuevo queda en espera y AQUÍ se avisa.
 * Nunca se recarga solo — solo si el usuario toca "Actualizar ahora".
 * Estando en el barco sin red este banner simplemente nunca aparece.
 */
export function UpdatePrompt() {
  const toast = useUiStore((s) => s.toast);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Buscar updates una vez por hora, solo si hay conexión.
      setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => undefined);
      }, HOUR);
    },
    onOfflineReady() {
      toast('Lista para funcionar sin conexión ✓');
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>
        <b>Actualización lista</b>
        <br />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          Se aplicará solo cuando tú lo digas.
        </span>
      </span>
      <button className="btn primary" onClick={() => void updateServiceWorker(true)}>
        Actualizar ahora
      </button>
      <button className="btn ghost" onClick={() => setNeedRefresh(false)}>
        Después
      </button>
    </div>
  );
}
