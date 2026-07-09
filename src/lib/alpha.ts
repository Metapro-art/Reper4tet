/** Índice alfabético: # agrupa los títulos que empiezan por número. */
export const ALPHABET = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

/** Clave de orden por título: sin diacríticos, sin puntuación inicial ('Round → round). */
export function sortTitleKey(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .toLowerCase();
}

/** Letra de sección para el índice A-Z. */
export function sectionLetter(title: string): string {
  const c = sortTitleKey(title).charAt(0);
  if (c >= '0' && c <= '9') return '#';
  const u = c.toUpperCase();
  return u >= 'A' && u <= 'Z' ? u : '#';
}
