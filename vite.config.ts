import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// La app vive en https://metapro-art.github.io/Reper4tet/ — la base respeta mayúsculas.
export default defineConfig({
  base: '/Reper4tet/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: { target: 'es2020' },
  plugins: [
    react(),
    VitePWA({
      // 'prompt': la actualización NUNCA se aplica sola; la app muestra
      // "Actualización lista" y solo recarga si el usuario lo toca.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/Reper4tet/',
        name: 'Gig Repertoire',
        short_name: 'Repertoire',
        description: 'Repertorio y sets de 45:00 del cuarteto — funciona sin conexión',
        lang: 'es',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0B1020',
        theme_color: '#0B1020',
        start_url: '/Reper4tet/',
        scope: '/Reper4tet/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache TOTAL del build: la app debe abrir en modo avión semanas después.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/Reper4tet/index.html',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
