/**
 * Puntas de pincel incluidas: todo lo que haya en `src/assets/brushes/*.{png,webp,…}`.
 * Vite las descubre solo al compilar (import.meta.glob): NO hay que registrar nada.
 * Ver el README de esa carpeta (nombres e ajustes en names.json).
 */
import { pickName, type NamesFile } from '../i18n/core';
import { tipFromRgba, type Tip } from './pixels';

interface BrushSettings {
  spacing?: number;
  angleJitter?: number;
}
interface BrushesFile extends NamesFile {
  settings?: Record<string, BrushSettings>;
}

const files = import.meta.glob('../../assets/brushes/*.{png,webp,jpg,jpeg,gif,avif,svg}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;
const metaFiles = import.meta.glob('../../assets/brushes/names.json', { eager: true, import: 'default' }) as Record<string, BrushesFile>;
const meta: BrushesFile = Object.values(metaFiles)[0] ?? {};

export interface BrushDef {
  id: string;
  /** Nombre del archivo sin extensión (si falta traducción). */
  fallback: string;
  url: string;
  spacing: number;
  angleJitter: number;
}

export const BRUSHES: BrushDef[] = Object.entries(files)
  .map(([path, url]) => {
    const id = path.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '');
    const s = meta.settings?.[id] ?? {};
    return {
      id,
      fallback: id.replace(/[-_]+/g, ' '),
      url,
      spacing: Math.min(1, Math.max(0.05, s.spacing ?? 0.15)),
      angleJitter: Math.min(1, Math.max(0, s.angleJitter ?? 0))
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const brushName = (b: BrushDef, lang: string): string => pickName(meta.items?.[b.id], lang, b.fallback);

const cache = new Map<string, Promise<Tip | null>>();

/** Carga la punta (una vez) como máscara de hasta 128 × 128. null si la imagen no se puede leer. */
export function loadTip(b: BrushDef): Promise<Tip | null> {
  let p = cache.get(b.id);
  if (!p) {
    p = (async () => {
      try {
        const im = new Image();
        im.src = b.url;
        await im.decode();
        const n = Math.max(8, Math.min(128, Math.max(im.naturalWidth, im.naturalHeight) || 64));
        const c = document.createElement('canvas');
        c.width = c.height = n;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        // Se centra y se ajusta al cuadrado conservando la proporción.
        const k = Math.min(n / im.naturalWidth, n / im.naturalHeight);
        const w = im.naturalWidth * k;
        const h = im.naturalHeight * k;
        ctx.drawImage(im, (n - w) / 2, (n - h) / 2, w, h);
        return tipFromRgba(ctx.getImageData(0, 0, n, n).data, n);
      } catch {
        return null;
      }
    })();
    cache.set(b.id, p);
  }
  return p;
}
