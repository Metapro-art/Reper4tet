import { useMemo } from 'react';
import type { Tune } from '../types';
import { mergeTunes } from '../lib/merge';
import { useLibraryStore } from './libraryStore';

/** Biblioteca visible = base versionada + overrides locales. */
export function useMergedTunes(): Tune[] {
  const overrides = useLibraryStore((s) => s.overrides);
  return useMemo(() => mergeTunes(overrides), [overrides]);
}

export function useTuneMap(): ReadonlyMap<string, Tune> {
  const tunes = useMergedTunes();
  return useMemo(() => new Map(tunes.map((t) => [t.id, t])), [tunes]);
}
