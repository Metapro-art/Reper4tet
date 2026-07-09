# Carpeta sync/

Pon aquí el archivo `.json` exportado desde la tablet
(Ajustes → **Exportar respaldo**).

Luego dile a Claude Code:

> **Aplica el respaldo de sync/ al repertorio y súbelo**

Claude buscará el `.json` más reciente de esta carpeta, te mostrará un
resumen (cuántos temas nuevos, editados y borrados) **antes** de tocar
nada, y tras tu confirmación fusionará los cambios en
`src/data/tunes.ts`, compilará y hará push a `origin main`. El deploy a
GitHub Pages tarda 1–2 minutos.

## Notas

- Esta carpeta **no** entra al build ni al precache de la PWA (está fuera
  de `src/` y `public/`).
- Los `.json` que dejes aquí **sí** se versionan en git: quedan como
  historial de respaldos. Ponles nombre con fecha si quieres
  (p. ej. `gigrep-respaldo-2026-08-15.json`).
- Edita en un solo dispositivo (la tablet). El computador es solo para
  subir el respaldo. Ver la sección "Regla de oro" en Ayuda.
