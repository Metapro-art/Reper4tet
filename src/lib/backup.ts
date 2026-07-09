import type { OverrideMap, SetList } from '../types';

export interface OverridesExport {
  app: 'gig-repertoire';
  type: 'overrides';
  schema: 1;
  exportedAt: string;
  overrides: OverrideMap;
}

export interface FullBackup {
  app: 'gig-repertoire';
  type: 'backup';
  schema: 1;
  exportedAt: string;
  overrides: OverrideMap;
  sets: SetList[];
}

export function buildOverridesExport(overrides: OverrideMap): OverridesExport {
  return {
    app: 'gig-repertoire',
    type: 'overrides',
    schema: 1,
    exportedAt: new Date().toISOString(),
    overrides,
  };
}

export function buildBackup(overrides: OverrideMap, sets: SetList[]): FullBackup {
  return {
    app: 'gig-repertoire',
    type: 'backup',
    schema: 1,
    exportedAt: new Date().toISOString(),
    overrides,
    sets,
  };
}

export type ParsedImport =
  | { type: 'overrides'; overrides: OverrideMap }
  | { type: 'backup'; overrides: OverrideMap; sets: SetList[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validOverrides(v: unknown): v is OverrideMap {
  if (!isRecord(v)) return false;
  return Object.values(v).every(
    (o) =>
      isRecord(o) &&
      (o.kind === 'remove' ||
        (o.kind === 'edit' && isRecord(o.patch)) ||
        (o.kind === 'add' && isRecord(o.tune) && typeof o.tune.title === 'string')),
  );
}

function validSets(v: unknown): v is SetList[] {
  return (
    Array.isArray(v) &&
    v.every(
      (s) =>
        isRecord(s) &&
        typeof s.id === 'string' &&
        typeof s.name === 'string' &&
        Array.isArray(s.entries) &&
        s.entries.every((e: unknown) => isRecord(e) && typeof e.tuneId === 'string'),
    )
  );
}

/** Acepta tanto exportes de cambios locales como respaldos completos. */
export function parseImport(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es JSON válido.');
  }
  if (!isRecord(data) || data.app !== 'gig-repertoire') {
    throw new Error('Este JSON no es de Gig Repertoire.');
  }
  if (data.schema !== 1) throw new Error(`Versión de esquema no soportada: ${String(data.schema)}`);
  if (!validOverrides(data.overrides)) throw new Error('El bloque de overrides está corrupto.');

  if (data.type === 'overrides') return { type: 'overrides', overrides: data.overrides };
  if (data.type === 'backup') {
    if (!validSets(data.sets)) throw new Error('El bloque de sets está corrupto.');
    return { type: 'backup', overrides: data.overrides, sets: data.sets };
  }
  throw new Error(`Tipo de archivo desconocido: ${String(data.type)}`);
}
