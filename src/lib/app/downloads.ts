/**
 * Descargas de la versión de escritorio, ofrecidas desde la versión web.
 *
 * La web pide `descargas/descargas.json` (en este proyecto: `public/descargas/descargas.json`;
 * en el servidor, esa carpeta junto a index.html). Cada opción apunta a un archivo y a un icono
 * que están en la MISMA carpeta que el .json. Sin opciones disponibles, no aparece el botón.
 *
 *   {
 *     "downloads": [
 *       { "id": "windows",
 *         "name": { "es": "Windows (64 bits)", "en": "Windows (64-bit)" },
 *         "file": "Comic-Fast_0.14.0_x64-setup.exe",
 *         "icon": "windows.svg",
 *         "note": { "es": "Windows 10 u 11", "en": "Windows 10 or 11" } }
 *     ]
 *   }
 *
 * - `name` (y `note`, opcional) pueden ser un texto o un objeto con un texto por idioma.
 * - `file` e `icon` son nombres de archivo de esa carpeta. `file` también puede ser una dirección
 *   https completa (p. ej. una release de GitHub): útil con archivos grandes, porque Cloudflare
 *   Pages no admite archivos de más de 25 MiB.
 * - También se admite una lista directa `[ {…}, {…} ]`.
 */
import { asLocalized, type Localized } from './notices';

export interface DownloadOption {
  id: string;
  name: Localized;
  note?: Localized;
  /** Dirección completa del archivo (ya resuelta respecto al .json). */
  url: string;
  /** Dirección del icono, si hay. */
  icon?: string;
  /** ¿Está en el mismo sitio (se puede comprobar que existe)? */
  local: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Resuelve un nombre de archivo respecto a la dirección del .json. Solo admite http(s):
 * cualquier otra cosa (javascript:, data:, …) da `null`.
 */
export function resolveAsset(file: unknown, base: string): { url: string; local: boolean } | null {
  if (typeof file !== 'string' || file.trim() === '') return null;
  try {
    const b = new URL(base);
    const u = new URL(file.trim(), b);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return { url: u.href, local: u.origin === b.origin };
  } catch {
    return null;
  }
}

/** Interpreta descargas.json. Lo que no sirva (o no sea JSON) da una lista vacía. */
export function parseDownloads(text: string, base: string): DownloadOption[] {
  const t = text.trim();
  if (t === '') return [];
  let raw: unknown;
  try {
    raw = JSON.parse(t);
  } catch {
    return []; // p. ej. el servidor devolvió una página HTML porque el archivo no existe
  }
  const list = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.downloads) ? raw.downloads : [];
  const out: DownloadOption[] = [];
  for (const item of list) {
    if (!isRecord(item)) continue;
    const file = resolveAsset(item.file, base);
    const name = asLocalized(item.name);
    if (!file || !name) continue;
    const icon = resolveAsset(item.icon, base)?.url;
    out.push({
      id: typeof item.id === 'string' && item.id !== '' ? item.id : `d${out.length}`,
      name,
      note: asLocalized(item.note),
      url: file.url,
      icon,
      local: file.local
    });
  }
  return out;
}
