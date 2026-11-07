import { TKError } from '../i18n/core';

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp'
};

export const IMAGE_EXTENSIONS = Object.keys(MIME_BY_EXT);

export function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export function extFromMime(mime: string): string {
  const hit = Object.entries(MIME_BY_EXT).find(([, m]) => m === mime);
  return hit ? hit[0] : 'bin';
}

export function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes as unknown as BlobPart], { type });
}

/** Dimensiones naturales de una imagen a partir de su URL. */
export function imageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = () => reject(new TKError('err.imageRead', 'No se pudo leer la imagen'));
    img.src = url;
  });
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Tamaño «natural» de un SVG a partir de su texto. Los SVG sin width/height
 * explícitos (solo viewBox) no tienen tamaño en píxeles: se normaliza para que
 * el lado mayor mida `longSide`, respetando la proporción del viewBox.
 * Devuelve null si no se puede deducir.
 */
export function svgIntrinsicSize(bytes: Uint8Array, longSide = 1000): { w: number; h: number } | null {
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 4096)));
  const tag = /<svg\b[^>]*>/i.exec(head)?.[0];
  if (!tag) return null;
  const vb = /viewBox\s*=\s*["']\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*["']/i.exec(tag);
  const num = (name: string) => {
    const m = new RegExp(`\\b${name}\\s*=\\s*["']\\s*([\\d.]+)\\s*(px)?\\s*["']`, 'i').exec(tag);
    return m ? parseFloat(m[1]) : null;
  };
  const vw = vb ? parseFloat(vb[3]) : null;
  const vh = vb ? parseFloat(vb[4]) : null;
  if (vw && vh && vw > 0 && vh > 0) {
    const k = longSide / Math.max(vw, vh);
    return { w: Math.max(1, Math.round(vw * k)), h: Math.max(1, Math.round(vh * k)) };
  }
  const w = num('width');
  const h = num('height');
  return w && h ? { w, h } : null;
}
