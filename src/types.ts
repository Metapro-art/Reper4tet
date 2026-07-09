/**
 * Modelo de datos del repertorio y los sets.
 * Fuente de verdad de enums, etiquetas y duraciones por defecto.
 */

/** Temática = artista u ocasión (qué noche llamas al tema), nada más. */
export const THEMES = [
  'ellington',
  'monk',
  'miles',
  'coltrane',
  'shorter',
  'bird',
  'bebop-composers',
  'beatles',
  'navidad',
  'moderno',
  'songbook',
  'latin',
  'bolero',
  'brasil',
  'colombiana',
] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  ellington: 'Ellington',
  monk: 'Monk',
  miles: 'Miles',
  coltrane: 'Coltrane',
  shorter: 'Shorter',
  bird: 'Bird',
  'bebop-composers': 'Bebop compositores',
  beatles: 'Beatles',
  navidad: 'Navidad',
  moderno: 'Moderno',
  songbook: 'Songbook',
  latin: 'Latin',
  bolero: 'Bolero',
  brasil: 'Brasil',
  colombiana: 'Colombiana',
};

/** Estilo = de qué escuela es el tema (cómo se toca), independiente de la temática. */
export const STYLES = [
  'dixieland',
  'swing',
  'bebop',
  'cool',
  'hardbop',
  'souljazz',
  'modal',
  'postbop',
  'fusion',
  'latinjazz',
  'bossa',
  'gypsy',
  'blues',
  'balada',
  'colombiana',
] as const;
export type Style = (typeof STYLES)[number];

export const STYLE_LABELS: Record<Style, string> = {
  dixieland: 'Dixieland',
  swing: 'Swing',
  bebop: 'Bebop',
  cool: 'Cool',
  hardbop: 'Hard Bop',
  souljazz: 'Soul Jazz',
  modal: 'Modal',
  postbop: 'Post-Bop',
  fusion: 'Fusión',
  latinjazz: 'Latin Jazz',
  bossa: 'Bossa',
  gypsy: 'Gypsy',
  blues: 'Blues',
  balada: 'Balada',
  colombiana: 'Colombiana',
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
  'bambuco',
  'pasillo',
  'porro',
  'cumbia',
  'currulao',
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
  bambuco: 'Bambuco',
  pasillo: 'Pasillo',
  porro: 'Porro',
  cumbia: 'Cumbia',
  currulao: 'Currulao',
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

export interface Tune {
  id: string;
  title: string;
  /** Título alterno con el que se anuncia (p. ej. en inglés). */
  altTitle?: string;
  composer: string;
  /** Temática: artista u ocasión (qué noche). */
  theme: Theme;
  /** Estilo: de qué escuela es (cómo se toca). */
  style: Style;
  feel: Feel;
  bpm: number;
  key: string;
  dance?: Dance;
  /** Compases de la forma: 12 blues, 32 AABA/ABAC, 16, 64 Cherokee… */
  bars: number;
  /** 3 solo en vals y jazz waltz; 4 por defecto. */
  beatsPerBar: 3 | 4;
  /** Compases de intro (histórico; el motor actual usa overhead fijo). */
  introBars?: number;
  /** Compases de coda (histórico; el motor actual usa overhead fijo). */
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
  /**
   * Feel y tempo con los que se toca en ESTE set. Se copian de la biblioteca al
   * añadir; el músico los cambia solo si lo va a tocar distinto esa noche. Si
   * faltan (sets migrados), se toman del tema.
   */
  feel?: Feel;
  bpm?: number;
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
