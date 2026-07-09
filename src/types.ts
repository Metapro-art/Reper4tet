/**
 * Modelo de datos del repertorio y los sets.
 * Fuente de verdad de enums, etiquetas y duraciones por defecto.
 */

export const THEMES = [
  'ellington',
  'monk',
  'bird',
  'bebop',
  'hardbop',
  'souljazz',
  'basie',
  'songbook',
  'brasil',
  'latin',
  'miles',
  'coltrane',
  'shorter',
  'moderno',
  'beatles',
  'navidad',
  'blues',
] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  ellington: 'Ellington',
  monk: 'Monk',
  bird: 'Bird',
  bebop: 'Bebop',
  hardbop: 'Hard Bop',
  souljazz: 'Soul Jazz',
  basie: 'Basie/Swing',
  songbook: 'Songbook',
  brasil: 'Brasil',
  latin: 'Latin/Bolero',
  miles: 'Miles',
  coltrane: 'Coltrane',
  shorter: 'Shorter',
  moderno: 'Moderno',
  beatles: 'Beatles',
  navidad: 'Navidad',
  blues: 'Blues',
};

export const FEELS = [
  'balada',
  'bossa',
  'samba',
  'latin',
  'funk',
  'vals',
  'blues',
  'swing',
  'up',
] as const;
export type Feel = (typeof FEELS)[number];

export const FEEL_LABELS: Record<Feel, string> = {
  balada: 'Balada',
  bossa: 'Bossa',
  samba: 'Samba',
  latin: 'Latin',
  funk: 'Funk',
  vals: 'Vals',
  blues: 'Blues',
  swing: 'Swing',
  up: 'Up',
};

export const DANCES = [
  'vals',
  'tango',
  'foxtrot',
  'slowfox',
  'rumba',
  'chacha',
  'swing',
  'jive',
  'quickstep',
  'merengue',
] as const;
export type Dance = (typeof DANCES)[number];

export const DANCE_LABELS: Record<Dance, string> = {
  vals: 'Vals',
  tango: 'Tango',
  foxtrot: 'Foxtrot',
  slowfox: 'Slow Fox',
  rumba: 'Rumba',
  chacha: 'Cha-cha',
  swing: 'Swing',
  jive: 'Jive',
  quickstep: 'Quickstep',
  merengue: 'Merengue',
};

/** Duración por defecto (minutos) según feel — tabla DUR del seed. */
export const DEFAULT_DURATION_MIN: Record<Feel, number> = {
  balada: 6.0,
  bossa: 5.5,
  samba: 5.25,
  latin: 5.5,
  funk: 6.5,
  vals: 5.5,
  blues: 6.0,
  swing: 5.75,
  up: 5.0,
};

export interface Tune {
  id: string;
  title: string;
  composer: string;
  theme: Theme;
  feel: Feel;
  bpm: number;
  key: string;
  dance?: Dance;
  durationMin: number;
  memorized: boolean;
  /** true = todavía no tengo el chart */
  missing: boolean;
  source?: string;
  altStyles?: Feel[];
  notes?: string;
}

/* ---------- Sets ---------- */

export const TARGET_SEC = 45 * 60;
/** Verde hasta 43:30; ámbar hasta 45:00; rojo por encima. */
export const GREEN_MAX_SEC = TARGET_SEC - 90;
/** Transición fija entre temas. */
export const TRANSITION_SEC = 45;

export type SetKind = 'libre' | 'ballroom';

export interface SetEntry {
  tuneId: string;
  /** Override de duración en minutos (pasos de 0.5). Si falta, se usa la del tema. */
  durationMin?: number;
}

export interface SetList {
  id: string;
  name: string;
  kind: SetKind;
  entries: SetEntry[];
  createdAt: string;
  updatedAt: string;
}

/* ---------- Capa local (overrides sobre la base versionada) ---------- */

/**
 * Parche de edición sobre un tema base. `null` significa "borrar el campo
 * opcional" (p. ej. quitar el baile): JSON no serializa `undefined`, así que
 * el sentinela explícito sobrevive al viaje por IndexedDB y a los respaldos.
 */
export type TunePatch = { [K in keyof Omit<Tune, 'id'>]?: Tune[K] | null };

export type TuneOverride =
  { kind: 'add'; tune: Tune } | { kind: 'edit'; patch: TunePatch } | { kind: 'remove' };

export type OverrideMap = Record<string, TuneOverride>;
