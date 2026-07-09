import { useEffect, useRef, useState } from 'react';
import {
  ClipboardCopy,
  Download,
  Eraser,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { TUNES } from '../data/tunes';
import { buildBackup, buildOverridesExport, parseImport } from '../lib/backup';
import { copyText, downloadJson, todayStamp } from '../lib/download';
import { BASE_BY_ID, countOverrides, staleOverrideIds } from '../lib/merge';
import { useLibraryStore } from '../store/libraryStore';
import { useSetsStore } from '../store/setsStore';
import { useSystemStore, requestPersistentStorage } from '../store/systemStore';
import { useUiStore } from '../store/uiStore';
import s from './SettingsView.module.css';

function fmtBytes(n: number): string {
  if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

export function SettingsView() {
  const overrides = useLibraryStore((st) => st.overrides);
  const importOverrides = useLibraryStore((st) => st.importOverrides);
  const replaceOverrides = useLibraryStore((st) => st.replaceOverrides);
  const clearOverrides = useLibraryStore((st) => st.clearOverrides);
  const resetLibrary = useLibraryStore((st) => st.resetLocal);
  const sets = useSetsStore((st) => st.sets);
  const replaceSets = useSetsStore((st) => st.replaceSets);
  const resetSets = useSetsStore((st) => st.resetLocal);
  const persisted = useSystemStore((st) => st.persisted);
  const toast = useUiStore((st) => st.toast);
  const confirm = useUiStore((st) => st.confirm);

  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [pasted, setPasted] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
      .catch(() => undefined);
  }, [persisted]);

  const counts = countOverrides(overrides);
  const stale = staleOverrideIds(overrides);
  const hiddenBase = Object.entries(overrides)
    .filter(([id, o]) => o.kind === 'remove' && BASE_BY_ID.has(id))
    .map(([id]) => id);

  const exportChanges = () => {
    downloadJson(`gigrep-cambios-${todayStamp()}.json`, buildOverridesExport(overrides));
    toast('Cambios locales exportados');
  };
  const copyChanges = async () => {
    const ok = await copyText(JSON.stringify(buildOverridesExport(overrides), null, 2));
    toast(ok ? 'Cambios copiados al portapapeles' : 'No se pudo copiar', ok ? 'ok' : 'warn');
  };
  const exportBackup = () => {
    downloadJson(`gigrep-respaldo-${todayStamp()}.json`, buildBackup(overrides, sets));
    toast('Respaldo completo exportado');
  };
  const copyBackup = async () => {
    const ok = await copyText(JSON.stringify(buildBackup(overrides, sets), null, 2));
    toast(ok ? 'Respaldo copiado al portapapeles' : 'No se pudo copiar', ok ? 'ok' : 'warn');
  };

  const doImport = async (text: string) => {
    try {
      const parsed = parseImport(text);
      if (parsed.type === 'backup') {
        const c = countOverrides(parsed.overrides);
        const ok = await confirm({
          title: 'Restaurar respaldo completo',
          body: `El respaldo trae ${c.adds} altas, ${c.edits} ediciones, ${c.removes} bajas y ${parsed.sets.length} sets.\nREEMPLAZA todo el estado local actual de esta tablet.`,
          confirmLabel: 'Restaurar',
          danger: true,
        });
        if (!ok) return;
        replaceOverrides(parsed.overrides);
        replaceSets(parsed.sets);
        toast('Respaldo restaurado');
      } else {
        const c = countOverrides(parsed.overrides);
        const n = Object.keys(parsed.overrides).length;
        const ok = await confirm({
          title: 'Importar cambios locales',
          body: `${n} cambios (${c.adds} altas, ${c.edits} ediciones, ${c.removes} bajas) se fusionan con los actuales. En conflicto por id, gana lo importado.`,
          confirmLabel: 'Fusionar',
        });
        if (!ok) return;
        importOverrides(parsed.overrides);
        toast(`${n} cambios importados`);
      }
      setPasted('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo importar', 'warn');
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    await doImport(await f.text());
    if (fileRef.current) fileRef.current.value = '';
  };

  const checkUpdate = async () => {
    if (!navigator.onLine) {
      toast('Sin conexión — se buscará cuando haya red', 'warn');
      return;
    }
    const reg = await navigator.serviceWorker?.getRegistration();
    if (!reg) {
      toast('Service worker no registrado aún', 'warn');
      return;
    }
    await reg.update().catch(() => undefined);
    toast('Buscando actualización… si hay una nueva, verás el aviso');
  };

  const resetAll = async () => {
    const ok = await confirm({
      title: 'Borrar datos locales',
      body: `Se borran de esta tablet: ${counts.adds} altas, ${counts.edits} ediciones, ${counts.removes} bajas y ${sets.length} sets.\nLa base versionada (${TUNES.length} temas) no se toca. Exporta un respaldo antes.`,
      confirmLabel: 'Borrar todo',
      danger: true,
    });
    if (!ok) return;
    const really = await confirm({
      title: '¿Seguro?',
      body: 'Esta acción no se puede deshacer sin un respaldo.',
      confirmLabel: 'Sí, borrar',
      danger: true,
    });
    if (!really) return;
    resetLibrary();
    resetSets();
    toast('Datos locales borrados');
  };

  return (
    <div>
      <div className="page-head">
        <h1>Ajustes</h1>
        <span className="sub">sincronizar · respaldo · almacenamiento</span>
      </div>

      <section className={s.section}>
        <h2>
          <HardDrive size={16} style={{ verticalAlign: -2 }} /> Almacenamiento
        </h2>
        {persisted === true && (
          <p className="note good">
            Persistente ✓ — el navegador no borrará los datos aunque falte espacio.
          </p>
        )}
        {persisted === false && (
          <>
            <p className="note warn">
              No persistente — Android podría purgar los datos si se queda sin espacio.
            </p>
            <p className={s.hint}>
              Instala la app (Chrome → «Añadir a pantalla de inicio») y vuelve a intentar: las PWA
              instaladas reciben persistencia casi siempre.
            </p>
          </>
        )}
        {persisted === null && <p className="note">Comprobando…</p>}
        {estimate && (
          <div className={s.kv}>
            <span className={s.mono}>
              {fmtBytes(estimate.usage)} usados de {fmtBytes(estimate.quota)} disponibles
            </span>
          </div>
        )}
        {persisted === false && (
          <div className={s.rowBtns}>
            <button className="btn" onClick={() => void requestPersistentStorage()}>
              Solicitar persistencia otra vez
            </button>
          </div>
        )}
      </section>

      <section className={s.section}>
        <h2>Sincronizar cambios locales → repositorio</h2>
        <div className={s.kv}>
          <span>
            <b className={s.mono}>{counts.adds}</b> altas · <b className={s.mono}>{counts.edits}</b>{' '}
            ediciones · <b className={s.mono}>{counts.removes}</b> bajas
          </span>
        </div>
        <p className={s.hint}>
          Exporta este JSON y fusiónalo a <span className={s.mono}>src/data/tunes.ts</span> desde el
          laptop (el flujo está en CLAUDE.md). Los cambios ya incorporados en un deploy aparecen
          como «obsoletos» y se pueden limpiar.
        </p>
        <div className={s.rowBtns}>
          <button className="btn primary" onClick={exportChanges}>
            <Download size={16} /> Exportar cambios (JSON)
          </button>
          <button className="btn" onClick={() => void copyChanges()}>
            <ClipboardCopy size={16} /> Copiar
          </button>
          {stale.length > 0 && (
            <button
              className="btn"
              onClick={() => {
                clearOverrides(stale);
                toast(`${stale.length} overrides obsoletos limpiados`);
              }}
            >
              <Eraser size={16} /> Limpiar {stale.length} obsoletos
            </button>
          )}
        </div>
      </section>

      <section className={s.section}>
        <h2>Respaldo completo</h2>
        <p className={s.hint}>
          Temas locales + ediciones + memoria + sets + duraciones en un solo JSON. Hazlo cada semana
          y guárdalo fuera de la tablet (teléfono, USB, nube cuando haya puerto).
        </p>
        <div className={s.rowBtns}>
          <button className="btn primary" onClick={exportBackup}>
            <Download size={16} /> Exportar respaldo
          </button>
          <button className="btn" onClick={() => void copyBackup()}>
            <ClipboardCopy size={16} /> Copiar
          </button>
          <label className={`btn ${s.fileBtn}`}>
            <Upload size={16} /> Importar archivo…
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
        </div>
        <textarea
          className={`input ${s.importArea}`}
          placeholder="…o pega aquí un JSON exportado (respaldo o cambios) y toca Importar"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        {pasted.trim() !== '' && (
          <div className={s.rowBtns}>
            <button className="btn primary" onClick={() => void doImport(pasted)}>
              <Upload size={16} /> Importar lo pegado
            </button>
          </div>
        )}
      </section>

      {hiddenBase.length > 0 && (
        <section className={s.section}>
          <h2>Temas base ocultos</h2>
          <p className={s.hint}>
            {hiddenBase.length} tema{hiddenBase.length === 1 ? '' : 's'} de la base están ocultos en
            esta tablet.
          </p>
          <div className={s.rowBtns}>
            <button
              className="btn"
              onClick={() => {
                clearOverrides(hiddenBase);
                toast('Temas base restaurados');
              }}
            >
              <RotateCcw size={16} /> Restaurar todos
            </button>
          </div>
        </section>
      )}

      <section className={s.section}>
        <h2>Versión</h2>
        <div className={s.kv}>
          <span className={s.mono}>
            v{__APP_VERSION__} · build {__BUILD_DATE__} · {TUNES.length} temas en la base
          </span>
        </div>
        <div className={s.rowBtns}>
          <button className="btn" onClick={() => void checkUpdate()}>
            <RefreshCw size={16} /> Buscar actualización
          </button>
        </div>
        <p className={s.hint}>
          Las actualizaciones nunca se aplican solas: cuando haya una descargada verás el aviso
          «Actualización lista» y decides tú.
        </p>
      </section>

      <section className={`${s.section} ${s.danger}`}>
        <h2>Zona de riesgo</h2>
        <div className={s.rowBtns}>
          <button className="btn danger" onClick={() => void resetAll()}>
            <Eraser size={16} /> Borrar datos locales de esta tablet
          </button>
        </div>
      </section>
    </div>
  );
}
