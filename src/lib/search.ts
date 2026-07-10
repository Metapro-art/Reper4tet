import Fuse from 'fuse.js';
import type { Tune } from '../types';
import { normalizeText } from './slug';

interface Indexed {
  tune: Tune;
  nTitle: string;
  haystack: string;
  nAlt: string;
  nComposer: string;
}

/**
 * Búsqueda por subcadena exacta: todos los tokens de la query deben aparecer
 * en título + título alterno + compositor (sin diacríticos). Fuse queda solo
 * como respaldo para typos y palabras pegadas ("moonriver") cuando la exacta
 * no encuentra nada.
 */
export function createSearcher(tunes: Tune[]): (q: string) => Tune[] {
  const items: Indexed[] = tunes.map((tune) => {
    const nTitle = normalizeText(tune.title);
    const nAlt = tune.altTitle ? normalizeText(tune.altTitle) : '';
    const nComposer = normalizeText(tune.composer);
    return { tune, nTitle, nAlt, nComposer, haystack: `${nTitle} ${nAlt} ${nComposer}` };
  });
  const fuse = new Fuse(items, {
    keys: [
      { name: 'nTitle', weight: 0.7 },
      { name: 'nAlt', weight: 0.2 },
      { name: 'nComposer', weight: 0.1 },
    ],
    threshold: 0.2,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });
  return (q: string) => {
    const nq = normalizeText(q.trim());
    if (!nq) return tunes;
    const tokens = nq.split(/\s+/).filter(Boolean);
    const phrase = tokens.join(' ');
    // Primaria: subcadena exacta. Primero títulos que empiezan con la query,
    // luego títulos que la contienen, al final coincidencias por alt/compositor.
    const starts: Tune[] = [];
    const inTitle: Tune[] = [];
    const rest: Tune[] = [];
    for (const item of items) {
      if (!tokens.every((t) => item.haystack.includes(t))) continue;
      if (item.nTitle.startsWith(phrase)) starts.push(item.tune);
      else if (tokens.every((t) => item.nTitle.includes(t))) inTitle.push(item.tune);
      else rest.push(item.tune);
    }
    const exact = [...starts, ...inTitle, ...rest];
    if (exact.length > 0) return exact;
    return fuse.search(phrase, { limit: 30 }).map((r) => r.item.tune);
  };
}
