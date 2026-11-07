import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync, rmSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const host = process.env.TAURI_DEV_HOST;

// Solo la versión web usa estos archivos del servidor: la app de escritorio los descarta del paquete
// (así los instaladores de descargas/ no acaban dentro de la propia app).
const webOnly = () => ({
  name: 'comicfast-web-only',
  apply: 'build' as const,
  closeBundle() {
    if (!process.env.TAURI_ENV_PLATFORM) return;
    for (const f of ['descargas', 'avisos.json', '_headers']) rmSync(new URL(`./dist/${f}`, import.meta.url), { recursive: true, force: true });
  }
});

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [svelte(), webOnly()],
  // Rutas relativas: el mismo `dist/` funciona en la raíz de un dominio, en una subcarpeta
  // (GitHub Pages de un repositorio) y dentro de Tauri.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] }
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // Nada se incrusta como base64: así las imágenes incluidas siempre se pueden leer con fetch().
    assetsInlineLimit: 0,
    target: ['chrome105', 'safari15'],
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: !!process.env.TAURI_ENV_DEBUG
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
