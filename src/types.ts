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

/* ---------- Motor de duración (por forma y tempo) ---------- */

/** Compases de intro por defecto. */
export const DEFAULT_INTRO_BARS = 4;
/** Compases de coda por defecto. */
export const DEFAULT_CODA_BARS = 4;
/** Las baladas cierran con una coda más larga. */
export const BALLAD_CODA_BARS = 8;
/** Segundos a los que apunta el reparto de solos en el perfil jazz. */
export const JAZZ_TARGET_SEC = 330;

export interface Tune {
  id: string;
  title: string;
  composer: string;
  theme: Theme;
  feel: Feel;
  bpm: number;
  key: string;
  dance?: Dance;
  /** Compases de la forma: 12 blues, 32 AABA/ABAC, 16, 64 Cherokee… */
  bars: number;
  /** 3 solo en vals y jazz waltz; 4 por defecto. */
  beatsPerBar: 3 | 4;
  /** Compases de intro (por defecto DEFAULT_INTRO_BARS). */
  introBars?: number;
  /** Compases de coda (por defecto 4; 8 en baladas). */
  codaBars?: number;
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

/**
 * Perfil del set: gobierna cuántas vueltas se tocan por tema.
 * - jazz: se reparten solos (gtr/pno/bajo) apuntando a ~330 s por tema.
 * - ballroom: música para bailar, 1 vuelta fija por tema (~4:00).
 * - cocktail: 1 vuelta; cabeza de salida media en baladas.
 */
export type SetProfile = 'jazz' | 'ballroom' | 'cocktail';

export interface SetEntry {
  tuneId: string;
  /** Vueltas de este tema en ESTE set. Si faltan, se toman del perfil. */
  headsIn?: number;
  soloChoruses?: number;
  headsOut?: number;
}

export interface SetList {
  id: string;
  name: string;
  profile: SetProfile;
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
