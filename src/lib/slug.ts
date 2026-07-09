/** Minúsculas y sin diacríticos — para ids y para búsqueda difusa. */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function slugify(s: string): string {
  return normalizeText(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug único frente a los ids ya ocupados (base + locales). */
export function uniqueId(title: string, taken: (id: string) => boolean): string {
  const base = slugify(title) || 'tema';
  if (!taken(base)) return base;
  for (let n = 2; ; n++) {
    const id = `${base}-${n}`;
    if (!taken(id)) return id;
  }
}
