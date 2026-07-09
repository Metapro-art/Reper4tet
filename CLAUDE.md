# gig-repertoire (Reper4tet)

App de repertorio y armador de sets para un guitarrista de jazz en contrato de crucero
(7 meses). Cuarteto: guitarra, piano, bajo, batería. 4 sets diarios de **exactamente
45:00**: uno de ballroom (bailable) y tres libres.

**Contexto crítico**: la app corre en una tablet Android EN UN BARCO, SIN INTERNET
durante semanas. Toda decisión técnica se evalúa contra: _"¿funciona en modo avión,
un mes después de la última conexión?"_. Nada de CDN, analytics, fuentes remotas ni
peticiones de red en runtime. Sin backend.

- Stack: Vite + React 18 + TypeScript estricto · PWA (vite-plugin-pwa, precache total,
  `registerType: 'prompt'` — NUNCA recargar solo) · Zustand + IndexedDB (idb-keyval) ·
  CSS Modules · dnd-kit · Fuse.js · fuentes self-hosted (@fontsource, subsets latinos).
- Deploy: push a `main` → GitHub Actions → GitHub Pages en
  <https://metapro-art.github.io/Reper4tet/> (Vite `base: '/Reper4tet/'`, respeta mayúsculas).

## Comandos

| Comando             | Qué hace                                               |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Servidor de desarrollo                                 |
| `npm run build`     | `tsc -b` + build de producción + genera SW/precache    |
| `npm run preview`   | Sirve `dist/` (probar la PWA construida)               |
| `npm run typecheck` | Solo TypeScript                                        |
| `npm run lint`      | ESLint                                                 |
| `npm run format`    | Prettier                                               |
| `npm run migrate`   | Regenera `src/data/tunes.ts` desde `seed/` (histórico) |
| `npm run icons`     | Regenera los PNG de `public/` (ícono reloj 45')        |

## Git — reglas de identidad (IMPORTANTE)

- La identidad de commits ya está configurada **localmente** en este repo
  (usuario `Metapro-art`). **NUNCA tocar la configuración global de git.**
- **NO usar `gh` CLI. NO cambiar el remote** (`origin` = `git@github.com-metapro:Metapro-art/Reper4tet.git`).
- Rama `main`, commits atómicos, push a `origin main`.

## Arquitectura de datos en dos capas (clave offline)

1. **Capa base** — `src/data/tunes.ts`: versionada, llega con cada deploy.
   Formato: **UN tema por línea** (las altas futuras son diffs de una línea). Los ids
   son slugs del título sin diacríticos (`sway-quien-sera`).
2. **Capa local** — IndexedDB en la tablet: overrides por id
   (`{kind:'add'|'edit'|'remove'}`, ver `src/types.ts`) + sets guardados. La UI muestra
   la fusión (`src/lib/merge.ts`). El toggle ♦ memoria es un override `edit`.

**Sincronizar tablet → repo**: en la tablet, Ajustes → «Exportar cambios (JSON)».
En el laptop, pedir a Claude: _"fusiona este JSON de overrides a tunes.ts"_:

- `add` → agregar la línea nueva **conservando el mismo id** del JSON.
- `edit` → aplicar el parche a la línea del tema (un `null` en el parche = borrar ese
  campo opcional, p. ej. quitar `dance`).
- `remove` → eliminar la línea, **confirmando antes con el músico**.
- Verificar `npm run typecheck` y el conteo de temas tras fusionar.
- Tras el deploy, la tablet detecta esos overrides como obsoletos y Ajustes ofrece
  «Limpiar obsoletos».

Los respaldos completos (overrides + sets) se importan/exportan en Ajustes; el esquema
está en `src/lib/backup.ts` (`schema: 1`).

## Material fuente (no tocar a la ligera)

- `screenshots/` — capturas de MobileSheets del músico. **Se versionan en git** (son la
  fuente de verdad del repertorio) pero **JAMÁS entran al build ni al precache** (están
  fuera de `src/` y `public/`; el audit de `dist/` lo verifica). El músico irá dejando
  capturas nuevas aquí durante el contrato. **No procesarlas salvo que lo pida.**
- `screenshots/procesados.json` — manifiesto de capturas ya procesadas (lo mantiene
  Claude). Las 24 iniciales ya están reflejadas vía `seed/`.
- `seed/repertorio.html` — prototipo original con el dataset curado. **Referencia
  histórica, fuera del build.** Ya migrado completo: 363 temas origen = 363 destino
  (`npm run migrate` lo verifica). No editar.

## Flujo: "procesa los screenshots nuevos"

Cuando el músico lo pida (y solo entonces):

1. Detectar capturas no procesadas: contenido de `screenshots/` vs
   `screenshots/procesados.json`.
2. Leer las imágenes nuevas (tool Read) y extraer los títulos de temas.
3. Aplicar los **criterios de curaduría** (sección siguiente).
4. Proponer la lista de altas con temática, feel, BPM, tonalidad y baile asignados —
   y **ESPERAR confirmación del músico antes de tocar `tunes.ts`**.
5. Tras confirmar: agregar a `tunes.ts` (una línea por tema, `source` = archivo de la
   captura), actualizar `procesados.json`, commit atómico.

## Aplicar respaldo desde la tablet

La carpeta `sync/` (raíz del repo) recibe los `.json` que el músico exporta desde
Ajustes → «Exportar respaldo». No entra al build ni al precache (está fuera de `src/`
y `public/`); los `.json` sí se versionan (historial de respaldos).

Cuando el usuario diga «Aplica el respaldo de sync/ al repertorio y súbelo»:

1. Busca el `.json` más reciente en `sync/`.
2. Muestra un resumen ANTES de tocar nada: cuántos temas nuevos, cuántos editados,
   cuántos borrados, con los títulos. Espera confirmación.
3. Fusiona sobre `src/data/tunes.ts` respetando el modelo `Tune` y los criterios de
   curaduría de este archivo. El respaldo es un JSON `{ overrides, sets }` (esquema en
   `src/lib/backup.ts`): `add` → alta nueva conservando su id; `edit` → parche sobre la
   línea del tema (`null` = borrar campo opcional); `remove` → eliminar la línea.
4. Verifica que el proyecto compile (`npm run build`).
5. Commit con mensaje «Respaldo tablet: N altas, M ediciones, K bajas» y push a
   `origin main`.
6. Confirma al usuario que el deploy tarda 1–2 minutos.

Nunca sobrescribas temas sin mostrar antes qué cambia.

## Curaduría

Criterios para decidir qué entra al repertorio desde las capturas:

- **Deduplicar**: el mismo título en MAYÚSCULAS y en Title Case es EL MISMO tema (los
  índices multi-fakebook van en mayúsculas). Variantes ortográficas también
  (Bouncin' / Bouncing With Bud). Un tema = una entrada.
- **PURGAR** (no son repertorio del cuarteto):
  - charts con sufijo de instrumento: «- Piano», «- Tenor», «- Guitar», «- Bass»,
    «- Trumpet», «- Trombone», «- Voice»;
  - charts con arreglador: Dale Burke, Tom Kubis, Lenny Wee, Dan Higgins,
    Peter Newberry, Derek Bomback, Chuck Farmer, Nelson Kole, John Hinchey,
    Crt Remic, Michael Kujawski;
  - nombres de show: «RWS -», «FVS -», «Bravo», «Deities and Divas», «Rock Opera»,
    «Caribbean Heat», «Belinda King», «Juliette show»;
  - «Master Rhythm», «The Bombook - NNN», archivos con timestamp
    (p. ej. «251023 122742»), y nombres de libro indexados como canción
    («Beatles Complete Fakebook», «Tango Fake Book»).
- **Excepción**: si un tema purgado es estándar de baile (La Bamba, Rock Around The
  Clock, Blue Suede Shoes, El Choclo, La Cumparsita, Por Una Cabeza), entra como TEMA
  limpio con su ritmo de baile, sin el chart del show.
- **Rangos BPM ballroom (social)**: vals 84–90 · tango 120–132 · foxtrot 120–136 ·
  slowfox 96–120 · rumba 100–108 (los boleros latinos se etiquetan rumba) ·
  chachá 112–128 · swing 136–152 · jive 168–184 · quickstep 192–208 · merengue 120–140.
- **Jazz waltz a 170+ BPM NO lleva etiqueta de baile** (no es vals de salón).
- **Bossa/samba no llevan etiqueta de baile** (no hay paso de salón estándar).
- **durationMin por feel**: balada 6.0 · bossa 5.5 · samba 5.25 · latin 5.5 · funk 6.5 ·
  vals 5.5 · blues 6.0 · swing 5.75 · up 5.0 (única fuente: `DEFAULT_DURATION_MIN` en
  `src/types.ts`).
- **Bebop rápido (200+ BPM) se conserva SIEMPRE** — el cuarteto lo toca; solo se ajusta
  el tempo al llamarlo en vivo.

Enums válidos (en `src/types.ts`): 17 temáticas (`ellington`…`blues`), 9 feels,
10 bailes. TypeScript rechaza cualquier valor fuera de enum al compilar.

## Verificación antes de cada deploy

1. `npm run lint && npm run build` limpios.
2. Audit de `dist/`: `grep -RoE "https?://[^\"')]+" dist/` → cero recursos externos
   (las únicas coincidencias aceptables son strings inertes dentro del JS: URLs de
   mensajes de error de React y namespaces `xmlns` de SVG). Cero rastros de
   `screenshots/` o `seed/` en `dist/`.
3. Test offline real: `node scripts/offline-test.mjs` (carga → mata el server →
   recarga desde el SW → usa la app sin red). Checklist completo en el README.
