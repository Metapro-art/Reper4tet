/**
 * Genera los íconos PWA (PNG) sin dependencias: rasteriza un reloj con el
 * arco de 45 minutos (la firma visual de la app) y codifica PNG a mano
 * (IHDR/IDAT/IEND + zlib). Re-ejecutable: sobrescribe public/*.png
 *
 * Uso: node scripts/generate-icons.mjs
 */
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'public');
mkdirSync(outDir, { recursive: true });

/* ---------- codificador PNG ---------- */

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filtro None
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- raster del diseño ---------- */

const INK = [0x0b, 0x10, 0x20];
const TRACK = [0x2a, 0x35, 0x50];
const AMBER = [0xf0, 0xa9, 0x3b];
const HAND = [0xe4, 0xe7, 0xef];

/**
 * Dibuja el reloj en coordenadas unitarias [0,1]² con supermuestreo.
 * mode 'rounded' (esquinas transparentes) | 'fullbleed' (maskable/apple)
 */
function renderIcon(size, mode) {
  const SS = 3; // supersampling
  const S = size * SS;
  const img = Buffer.alloc(S * S * 4);

  const contentScale = mode === 'fullbleed' ? 0.74 : 1.0;
  const cornerR = mode === 'rounded' ? 0.175 : 0;

  const cx = 0.5;
  const cy = 0.5;
  const R = 0.345 * contentScale;
  const W = 0.08 * contentScale;
  const handW = 0.055 * contentScale;
  const handLen = R - 0.02;
  const dotR = 0.05 * contentScale;

  const capA = { x: cx, y: cy - R }; // 12:00
  const capB = { x: cx - R, y: cy }; // 45 min (9:00)

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const x = (px + 0.5) / S;
      const y = (py + 0.5) / S;

      // máscara de esquinas redondeadas
      if (cornerR > 0) {
        const qx = Math.max(Math.abs(x - 0.5) - (0.5 - cornerR), 0);
        const qy = Math.max(Math.abs(y - 0.5) - (0.5 - cornerR), 0);
        if (Math.hypot(qx, qy) > cornerR) continue; // transparente
      }

      let c = INK;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // anillo (pista)
      if (Math.abs(dist - R) <= W / 2) {
        c = TRACK;
        // arco de 45 min: de las 12 en punto (−π/2) a las 9 (π), horario
        const th = Math.atan2(dy, dx);
        if (!(th > -Math.PI && th < -Math.PI / 2)) c = AMBER;
      }
      // remates redondos del arco
      if (Math.hypot(x - capA.x, y - capA.y) <= W / 2) c = AMBER;
      if (Math.hypot(x - capB.x, y - capB.y) <= W / 2) c = AMBER;

      // manecilla apuntando a los 45 (izquierda)
      if (dy > -handW / 2 && dy < handW / 2 && dx <= 0 && dx >= -handLen) c = HAND;
      if (Math.hypot(x - (cx - handLen), y - cy) <= handW / 2) c = HAND;

      // eje central
      if (dist <= dotR) c = HAND;

      const o = (py * S + px) * 4;
      img[o] = c[0];
      img[o + 1] = c[1];
      img[o + 2] = c[2];
      img[o + 3] = 255;
    }
  }

  // downsample SS×SS → size×size (promedio, alfa incluida)
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const o = ((y * SS + sy) * S + (x * SS + sx)) * 4;
          const al = img[o + 3] / 255;
          r += img[o] * al;
          g += img[o + 1] * al;
          b += img[o + 2] * al;
          a += img[o + 3];
        }
      }
      const n = SS * SS;
      const alpha = a / n;
      const o = (y * size + x) * 4;
      const k = alpha > 0 ? 255 / alpha : 0;
      out[o] = Math.round((r / n) * k);
      out[o + 1] = Math.round((g / n) * k);
      out[o + 2] = Math.round((b / n) * k);
      out[o + 3] = Math.round(alpha);
    }
  }
  return out;
}

function writeIcon(name, size, mode) {
  const png = encodePng(size, size, renderIcon(size, mode));
  writeFileSync(join(outDir, name), png);
  console.log(`${name}  ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB`);
}

writeIcon('pwa-192.png', 192, 'rounded');
writeIcon('pwa-512.png', 512, 'rounded');
writeIcon('pwa-maskable-512.png', 512, 'fullbleed');
writeIcon('apple-touch-icon.png', 180, 'fullbleed');
console.log('Íconos generados en public/');
