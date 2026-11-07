/// <reference types="svelte" />
/// <reference types="vite/client" />

/** Versión de la app, inyectada por Vite desde package.json. */
declare const __APP_VERSION__: string;

/** Variables de entorno propias (ver .env.example). Todas son opcionales. */
interface ImportMetaEnv {
  readonly VITE_DONATE_URL?: string;
}
