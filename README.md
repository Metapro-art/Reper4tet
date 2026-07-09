# Gig Repertoire — Reper4tet

Repertorio y armador de sets de **45:00 exactos** para el cuarteto (guitarra, piano,
bajo, batería) en contrato de crucero. **Funciona 100 % sin internet**: es una PWA que
vive en la tablet; toda tu información (sets, temas nuevos, memoria, duraciones) se
guarda en la propia tablet.

**URL de la app**: <https://metapro-art.github.io/Reper4tet/>

- **Biblioteca**: 363 temas con búsqueda difusa, filtros por temática / feel / baile /
  BPM, «solo de memoria», «ocultar faltantes», orden por columnas y toggle ♦ de memoria.
- **Sets con reloj 45:00**: barra a escala con transiciones de 45 s, marcas en 15:00 y
  30:00, verde ≤ 43:30 · ámbar hasta 45:00 · rojo si te pasas. Drag & drop, duración
  editable en pasos de 30 s.
- **Validador de ballroom**: avisa ritmos consecutivos repetidos o menos de 4 ritmos.
- **Modo escenario**: letra gigante, pantalla siempre encendida, siguiente tema visible.
- **Exportar**: set como texto (WhatsApp), impresión limpia, respaldos JSON.

---

## Instalación en la tablet (UNA VEZ, con internet)

1. Abre **Chrome** en la tablet y entra a `https://metapro-art.github.io/Reper4tet/`.
2. Espera el aviso **«Lista para funcionar sin conexión ✓»** (unos segundos): ya quedó
   todo descargado en la tablet.
3. Menú de Chrome (⋮) → **«Añadir a pantalla de inicio»** (o «Instalar aplicación»).
4. Abre la app **desde su ícono** (el reloj ámbar), no desde el navegador.
5. Ve a **Ajustes** dentro de la app y confirma que diga
   **«Persistente ✓»** en Almacenamiento. Si no, toca «Solicitar persistencia otra vez»
   (instalada como app casi siempre lo concede).
6. Prueba de fuego: activa **modo avión**, cierra la app del todo y vuelve a abrirla.
   Debe abrir, filtrar y guardar sets normalmente.

> A partir de aquí la tablet no necesita internet nunca más para trabajar.
> Solo la necesitará si quieres **actualizar** la app o subir cambios al repositorio.

## Uso diario

- **Armar un set**: Sets → «Set libre» o «Set de baile» → «Añadir temas» (se abre la
  biblioteca con el total en vivo arriba) → «Listo». Reordena arrastrando el asa ≡,
  ajusta duraciones con − / + (pasos de 30 s). El reloj y la barra te dicen si vas bien:
  verde vas sobrado, ámbar al límite, rojo te pasas.
- **En el escenario**: botón «Escenario» → letra gigante, con el siguiente tema siempre
  visible abajo. La pantalla no se apaga sola.
- **Pasar el set al grupo**: «Copiar» y pégalo en WhatsApp, o «Compartir», o «Imprimir».
- **♦ De memoria**: toca el rombo en la biblioteca. **Faltantes** lista los charts por
  conseguir agrupados por temática; cuando lo consigas, «Ya lo tengo».

## Agregar temas

- **En la tablet (sin internet)**: Biblioteca → «Nuevo tema». Queda guardado como
  _alta local_ en la tablet (etiqueta `local`). También puedes editar cualquier tema
  (BPM, tono, baile…) — el cambio vive en la tablet hasta que lo fusiones al repo.
- **En el repositorio (con el laptop)**: deja las capturas nuevas de MobileSheets en
  `screenshots/` y dile a Claude Code: **«procesa los screenshots nuevos»**. Claude
  extrae los títulos, aplica la curaduría (ver `CLAUDE.md`), te propone la lista y solo
  con tu confirmación los agrega a la base.

## Respaldos (hazlo cada semana)

1. Ajustes → **«Exportar respaldo»**: descarga un JSON con TODO lo local
   (temas nuevos, ediciones, memoria, sets, duraciones).
2. Guárdalo **fuera de la tablet**: mándatelo por WhatsApp/correo cuando haya puerto
   con datos, o cópialo a un USB.
3. También puedes «Copiar» y pegarlo donde quieras — es texto.

### Subir tus cambios al repositorio

Cuando tengas laptop e internet: Ajustes → **«Exportar cambios (JSON)»** → pásale el
archivo a Claude Code en el repo: _«fusiona este JSON de overrides a tunes.ts»_.
Tras el siguiente deploy, la app te ofrecerá «Limpiar obsoletos» (ya vienen en la base).

## Actualizar la app

1. Con el repo actualizado: `git push` a `main` → GitHub Actions construye y publica
   solo (pestaña _Actions_ del repo, workflow «Deploy a GitHub Pages»).
2. La tablet, **cuando vuelva a tener internet**, detectará la nueva versión y mostrará
   **«Actualización lista»**. La app **nunca se reinicia sola**: tú decides cuándo,
   tocando «Actualizar ahora» (nunca a mitad de un set 😄). También puedes forzar la
   búsqueda en Ajustes → «Buscar actualización».

## Si la tablet muere

1. En otra tablet/teléfono: instala la PWA (pasos de arriba, necesita internet una vez).
2. Ajustes → **«Importar archivo…»** → elige tu último respaldo JSON.
3. Listo: temas locales, memoria y sets de vuelta. (Por eso el respaldo semanal.)

---

## Checklist offline (verificación)

Protocolo: `npm run build && npm run preview` → cargar la app UNA vez → simular modo
avión (cortar la red/server) → cerrar y reabrir → debe abrir, filtrar, armar y guardar
sets sin red.

Automatizado en `scripts/offline-test.mjs` (usa el Edge/Chrome del sistema):
`npm run build && node scripts/offline-test.mjs`.

**Resultado (verificado el 2026-07-08, Edge headless + servidor apagado): TODO OK**

- [x] `npm run build` limpio (tsc + vite + SW generado)
- [x] Carga inicial con red: service worker activo, precache completo
      (33 entradas · ~698 KiB: JS, CSS, HTML, fuentes woff/woff2, íconos, manifest)
- [x] **Servidor apagado** (equivale a modo avión) + recarga dura → la app abre desde
      el precache
- [x] Sin red: búsqueda difusa y filtros funcionan (dataset bundleado)
- [x] Sin red: crear set y añadir temas → guardado en IndexedDB
- [x] Sin red + recarga: el set persiste
- [x] `dist/` sin referencias a recursos externos y sin `screenshots/` ni `seed/`

En la tablet real (una sola vez tras instalar):

- [ ] Modo avión → abrir desde el ícono → biblioteca visible
- [ ] Crear un set de prueba en modo avión → cerrar del todo → reabrir → sigue ahí
- [ ] Ajustes muestra «Persistente ✓»

## Desarrollo

```bash
npm install
npm run dev        # desarrollo
npm run build      # producción (tsc + vite + PWA)
npm run preview    # servir dist/ para probar la PWA
npm run lint       # ESLint
npm run migrate    # regenerar tunes.ts desde seed/ (histórico)
```

Detalles de arquitectura, curaduría y flujo de screenshots: **`CLAUDE.md`**.
