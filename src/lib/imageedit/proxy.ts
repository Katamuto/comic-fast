/**
 * Versiones reducidas de las imágenes para dibujar rápido en el editor.
 * El original (`url`) se usa solo al exportar o con mucho zoom.
 */

export type Quality = 'full' | 'view' | 'thumb';

export const VIEW_MAX = 1400;
export const THUMB_MAX = 320;

/** Tamaño reducido manteniendo proporción; null si no hace falta reducir (ya es pequeña). */
export function proxySize(w: number, h: number, max: number): { w: number; h: number } | null {
  const m = Math.max(w, h);
  if (m <= max * 1.15) return null;
  const k = max / m;
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** Elige la URL según la calidad pedida, con respaldo al original. */
export function pickUrl(a: { url: string; viewUrl?: string; thumbUrl?: string }, q: Quality): string {
  if (q === 'thumb') return a.thumbUrl ?? a.viewUrl ?? a.url;
  if (q === 'view') return a.viewUrl ?? a.url;
  return a.url;
}

/** Crea una versión reducida y devuelve su URL temporal, o null si no hace falta o no se puede. */
export async function makeProxy(blob: Blob, w: number, h: number, max: number, mime: string): Promise<string | null> {
  if (mime === 'image/svg+xml' || mime === 'image/gif') return null; // vectoriales y animadas: tal cual
  const size = proxySize(w, h, max);
  if (!size || typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  try {
    const bmp = await createImageBitmap(blob, { resizeWidth: size.w, resizeHeight: size.h, resizeQuality: 'high' });
    const c = document.createElement('canvas');
    c.width = size.w;
    c.height = size.h;
    c.getContext('2d')!.drawImage(bmp, 0, 0);
    bmp.close?.();
    const out = await new Promise<Blob | null>((res) => c.toBlob(res, mime === 'image/jpeg' ? 'image/jpeg' : 'image/webp', 0.85));
    return out ? URL.createObjectURL(out) : null;
  } catch {
    return null;
  }
}
