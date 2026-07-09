import Fuse from 'fuse.js';
import type { Tune } from '../types';
import { normalizeText } from './slug';

interface Indexed {
  tune: Tune;
  nTitle: string;
  nComposer: string;
}

/** Búsqueda difusa por título/compositor, insensible a diacríticos. */
export function createSearcher(tunes: Tune[]): (q: string) => Tune[] {
  const items: Indexed[] = tunes.map((tune) => ({
    tune,
    nTitle: normalizeText(tune.title),
    nComposer: normalizeText(tune.composer),
  }));
  const fuse = new Fuse(items, {
    keys: [
      { name: 'nTitle', weight: 0.75 },
      { name: 'nComposer', weight: 0.25 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  return (q: string) => {
    const nq = normalizeText(q.trim());
    if (!nq) return tunes;
    return fuse.search(nq).map((r) => r.item.tune);
  };
}
