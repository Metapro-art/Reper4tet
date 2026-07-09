/**
 * Migración del dataset curado en seed/repertorio.html → src/data/tunes.ts
 *
 * Extrae el array D, el mapa de temáticas TH y la tabla DUR del prototipo,
 * mapea códigos/etiquetas a los enums tipados de src/types.ts, genera ids slug
 * y verifica que el conteo origen = destino. Re-ejecutable (regenera el archivo).
 *
 * Uso: node scripts/migrate-seed.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const seedPath = join(root, 'seed', 'repertorio.html');
const outPath = join(root, 'src', 'data', 'tunes.ts');

const html = readFileSync(seedPath, 'utf8');

/* ---------- extracción ---------- */

function extractBalanced(src, startMarker, open, close) {
  const at = src.indexOf(startMarker);
  if (at < 0) throw new Error(`No se encontró "${startMarker}" en el seed`);
  const from = src.indexOf(open, at);
  let depth = 0;
  let inStr = null;
  for (let i = from; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  throw new Error(`Delimitadores sin balancear tras "${startMarker}"`);
}

const TH = new Function(`return ${extractBalanced(html, 'const TH =', '{', '}')}`)();
const DUR = new Function(`return ${extractBalanced(html, 'const DUR =', '{', '}')}`)();
const D = new Function(`return ${extractBalanced(html, 'const D=', '[', ']')}`)();

/* ---------- mapeos a enums ---------- */

const THEME_BY_CODE = {
  ELL: 'ellington',
  MNK: 'monk',
  BRD: 'bird',
  BOP: 'bebop',
  HB: 'hardbop',
  SJ: 'souljazz',
  BAS: 'basie',
  GAS: 'songbook',
  BRA: 'brasil',
  LAT: 'latin',
  MIL: 'miles',
  TRN: 'coltrane',
  SHO: 'shorter',
  MOD: 'moderno',
  BTL: 'beatles',
  XMS: 'navidad',
  BLU: 'blues',
};

const FEELS = ['balada', 'bossa', 'samba', 'latin', 'funk', 'vals', 'blues', 'swing', 'up'];

const DANCE_BY_LABEL = {
  Vals: 'vals',
  Tango: 'tango',
  Foxtrot: 'foxtrot',
  'Slow Fox': 'slowfox',
  Rumba: 'rumba',
  'Cha-cha': 'chacha',
  Swing: 'swing',
  Jive: 'jive',
  Quickstep: 'quickstep',
  Merengue: 'merengue',
};

// La tabla DUR del seed debe coincidir con la duración por feel acordada.
const EXPECTED_DUR = {
  Balada: 6.0,
  Bossa: 5.5,
  Samba: 5.25,
  Latin: 5.5,
  Funk: 6.5,
  Vals: 5.5,
  Blues: 6.0,
  Swing: 5.75,
  Up: 5.0,
};
for (const [k, v] of Object.entries(EXPECTED_DUR)) {
  if (DUR[k] !== v) throw new Error(`DUR[${k}] = ${DUR[k]}, se esperaba ${v}`);
}

// Todos los códigos del seed deben tener mapeo (y viceversa).
for (const code of Object.keys(TH)) {
  if (!THEME_BY_CODE[code]) throw new Error(`Código de temática sin mapear: ${code} (${TH[code]})`);
}

/* ---------- transformación ---------- */

function slugify(title) {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const seen = new Map();
const problems = [];
const tunes = D.map((row, i) => {
  if (!Array.isArray(row) || row.length !== 9) {
    throw new Error(`Fila ${i} malformada (${row?.length} campos): ${JSON.stringify(row)}`);
  }
  const [title, composer, themeCode, feelLabel, bpm, key, mem, danceLabel, missing] = row;

  const theme = THEME_BY_CODE[themeCode];
  if (!theme) problems.push(`Fila ${i} "${title}": temática desconocida ${themeCode}`);

  const feel = String(feelLabel).toLowerCase();
  if (!FEELS.includes(feel)) problems.push(`Fila ${i} "${title}": feel desconocido ${feelLabel}`);

  let dance;
  if (danceLabel) {
    dance = DANCE_BY_LABEL[danceLabel];
    if (!dance) problems.push(`Fila ${i} "${title}": baile desconocido "${danceLabel}"`);
  }

  if (typeof bpm !== 'number' || !Number.isFinite(bpm)) {
    problems.push(`Fila ${i} "${title}": BPM inválido ${bpm}`);
  }
  if (typeof key !== 'string' || !key) problems.push(`Fila ${i} "${title}": tonalidad vacía`);

  let id = slugify(title);
  if (seen.has(id)) {
    const n = seen.get(id) + 1;
    seen.set(id, n);
    problems.push(`AVISO colisión de slug: "${title}" → ${id}-${n}`);
    id = `${id}-${n}`;
  } else {
    seen.set(id, 1);
  }

  return {
    id,
    title,
    composer,
    theme,
    feel,
    bpm,
    key,
    dance,
    durationMin: DUR[feelLabel],
    memorized: mem === 1,
    missing: missing === 1,
  };
});

if (problems.length) {
  console.error('Problemas encontrados:');
  for (const p of problems) console.error('  - ' + p);
  const fatal = problems.some((p) => !p.startsWith('AVISO'));
  if (fatal) process.exit(1);
}

/* ---------- generación ---------- */

const q = JSON.stringify;
const lines = [];
let prevTheme = null;
const themeLabelByEnum = Object.fromEntries(
  Object.entries(THEME_BY_CODE).map(([code, en]) => [en, TH[code]]),
);
for (const t of tunes) {
  if (t.theme !== prevTheme) {
    lines.push(`  // ---- ${themeLabelByEnum[t.theme].toUpperCase()} ----`);
    prevTheme = t.theme;
  }
  const dance = t.dance ? ` dance: ${q(t.dance)},` : '';
  lines.push(
    `  { id: ${q(t.id)}, title: ${q(t.title)}, composer: ${q(t.composer)}, theme: ${q(t.theme)}, feel: ${q(t.feel)}, bpm: ${t.bpm}, key: ${q(t.key)},${dance} durationMin: ${t.durationMin}, memorized: ${t.memorized}, missing: ${t.missing} },`,
  );
}

const banner = `/**
 * CAPA BASE DEL REPERTORIO — ${tunes.length} temas.
 * Generado por scripts/migrate-seed.mjs desde seed/repertorio.html.
 * Formato: UN tema por línea (facilita diffs al agregar altas curadas).
 * Las altas nuevas se agregan aquí tras la curaduría (ver CLAUDE.md).
 */
import type { Tune } from '../types';

export const TUNES: Tune[] = [
`;

writeFileSync(outPath, banner + lines.join('\n') + '\n];\n', 'utf8');

/* ---------- verificación / reporte ---------- */

const count = (arr, fn) =>
  arr.reduce((m, x) => {
    const k = fn(x);
    if (k) m[k] = (m[k] || 0) + 1;
    return m;
  }, {});

console.log(`Origen (seed D):   ${D.length} temas`);
console.log(`Destino (tunes.ts): ${tunes.length} temas`);
console.log(D.length === tunes.length ? 'CONTEO OK ✓' : 'CONTEO NO COINCIDE ✗');
console.log(
  '\nPor temática:',
  count(tunes, (t) => t.theme),
);
console.log(
  '\nPor feel:',
  count(tunes, (t) => t.feel),
);
console.log(
  '\nPor baile:',
  count(tunes, (t) => t.dance),
);
console.log(
  `\nDe memoria: ${tunes.filter((t) => t.memorized).length} · Faltantes: ${tunes.filter((t) => t.missing).length} · Con baile: ${tunes.filter((t) => t.dance).length}`,
);
if (D.length !== tunes.length) process.exit(1);
