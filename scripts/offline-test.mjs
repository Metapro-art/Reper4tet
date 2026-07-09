/**
 * Test offline de verdad (checklist del README):
 *   1. Sirve dist/ y carga la app UNA vez (el SW precachea todo).
 *   2. MATA el servidor (equivale a modo avión).
 *   3. Recarga dura → debe abrir desde el precache.
 *   4. Sin red: busca en la biblioteca, crea un set, recarga → el set persiste.
 *
 * Requiere Edge o Chrome instalado (puppeteer-core, sin descargas).
 * Uso: npm run build && node scripts/offline-test.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import puppeteer from 'puppeteer-core';

const PORT = 4181;
const URL_APP = `http://localhost:${PORT}/Reper4tet/`;

const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];
const executablePath = BROWSERS.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No se encontró Edge/Chrome instalado.');
  process.exit(2);
}

const results = [];
const check = (name, ok, extra = '') => {
  results.push([name, ok]);
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) throw new Error(`FALLÓ: ${name}`);
};

let server = null;
let browser = null;

function startServer() {
  server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore' },
  );
}

async function waitServer(up) {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(URL_APP, { signal: AbortSignal.timeout(900) });
      if (up) return;
    } catch {
      if (!up) return;
    }
    await sleep(400);
  }
  throw new Error(`El servidor no ${up ? 'arrancó' : 'se detuvo'}`);
}

function killServer() {
  if (!server) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/T', '/F', '/PID', String(server.pid)], { stdio: 'ignore' });
    } else {
      server.kill('SIGKILL');
    }
  } catch {
    /* ya muerto */
  }
  server = null;
}

// case-insensitive: el CSS transforma títulos/botones a mayúsculas
const textOnPage = (page, txt) =>
  page.waitForFunction(
    (t) => document.body && document.body.innerText.toLowerCase().includes(t),
    { timeout: 15000 },
    txt.toLowerCase(),
  );

async function clickByText(page, selector, txt) {
  const ok = await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((b) =>
        b.innerText.toLowerCase().includes(t),
      );
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    txt.toLowerCase(),
  );
  if (!ok) throw new Error(`No se encontró "${txt}" (${selector})`);
}

try {
  console.log(`Navegador: ${executablePath}`);
  startServer();
  await waitServer(true);
  console.log('Servidor preview arriba.');

  browser = await puppeteer.launch({ executablePath, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      console.log(`  [console.${m.type()}]`, m.text());
  });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  // 1) carga inicial CON red → SW instala y precachea (activo = precache completo)
  await page.goto(URL_APP, { waitUntil: 'networkidle2', timeout: 30000 });
  await textOnPage(page, 'Biblioteca');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  check('Carga inicial + service worker activo (precache completo)', true);

  // segunda navegación con red: la página ya queda bajo control del SW
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await textOnPage(page, 'Biblioteca');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, {
    timeout: 15000,
  });
  check('Página controlada por el SW', true);

  // 2) MODO AVIÓN: servidor muerto
  killServer();
  await waitServer(false);
  check('Servidor apagado (modo avión)', true);

  // 3) recarga dura sin red → precache
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await textOnPage(page, 'Biblioteca');
  await textOnPage(page, 'Temática');
  check('Recarga sin red: la app abre desde el precache', true);

  // 4) sin red: búsqueda difusa
  await page.type('input[type="search"]', 'caravan');
  await textOnPage(page, 'Ellington/Tizol');
  check('Sin red: búsqueda difusa funciona (Caravan)', true);
  await page.screenshot({ path: 'scripts/.offline-library.png' });

  // 5) sin red: crear un set y añadir un tema
  await clickByText(page, '.tabbar button', 'Sets');
  await textOnPage(page, 'Jazz');
  await clickByText(page, 'button', 'Jazz');
  await textOnPage(page, 'Añadir temas');
  await clickByText(page, 'button', 'Añadir temas');
  await textOnPage(page, 'Añadiendo a');
  // añadir el primer tema visible
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('tbody button')].find((b) =>
      (b.getAttribute('aria-label') || '').startsWith('Añadir'),
    );
    btn?.click();
  });
  await clickByText(page, 'button', 'Listo');
  await textOnPage(page, 'transiciones 45 s');
  await page.screenshot({ path: 'scripts/.offline-editor.png' });
  check('Sin red: set creado con un tema (guardado en IndexedDB)', true);

  // 6) recarga otra vez sin red → el set sigue ahí
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await textOnPage(page, 'Biblioteca');
  await clickByText(page, '.tabbar button', 'Sets');
  await textOnPage(page, 'Jazz ');
  await textOnPage(page, '1 tema');
  check('Sin red + recarga: el set persiste (IndexedDB)', true);

  console.log('\nRESULTADO: TODO OK — la app funciona en modo avión.');
} catch (e) {
  console.error('\nRESULTADO: FALLO —', e.message);
  try {
    const page = (await browser?.pages())?.at(-1);
    if (page) {
      const body = await page.evaluate(() => document.body?.innerText?.slice(0, 600));
      console.error('--- body ---\n' + body);
      await page.screenshot({ path: 'scripts/.offline-fail.png' });
      console.error('screenshot: scripts/.offline-fail.png');
    }
  } catch {
    /* sin diagnóstico */
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  killServer();
}
