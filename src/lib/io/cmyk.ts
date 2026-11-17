/**
 * Conversión RGB → CMYK y escritores para imprenta (TIFF CMYK y marcas de corte).
 *
 * OJO: no hay perfil ICC; la conversión es matemática (GCR + límite de tinta). Sirve para
 * entregar a imprenta con los parámetros que ellas piden (sangrado, marcas, tinta total, negro
 * solo en K), pero los colores muy saturados saldrán más apagados que en pantalla y el
 * archivo no está certificado como PDF/X. Conviene pedir una prueba impresa.
 */
import { zlibSync } from 'fflate';

export interface CmykOptions {
  /** Cuánto del componente neutro pasa a la tinta negra: 0 (nada) … 1 (toda, «GCR máximo»). */
  gcr: number;
  /** Límite de tinta total (suma de C+M+Y+K) en %, típico 240–320. */
  tac: number;
  /** Los grises (R=G=B) se imprimen solo con negro (línea y texto nítidos, sin registro). */
  neutralK: boolean;
}

export const DEFAULT_CMYK: CmykOptions = { gcr: 0.8, tac: 300, neutralK: true };

export const clampCmyk = (o: Partial<CmykOptions>): CmykOptions => ({
  gcr: Math.min(1, Math.max(0, Number.isFinite(o.gcr) ? o.gcr! : DEFAULT_CMYK.gcr)),
  tac: Math.min(400, Math.max(150, Math.round(Number.isFinite(o.tac) ? o.tac! : DEFAULT_CMYK.tac))),
  neutralK: o.neutralK ?? DEFAULT_CMYK.neutralK
});

/** Un píxel: r,g,b en 0..255 → [c,m,y,k] en 0..1. */
export function rgbToCmyk(r: number, g: number, b: number, o: CmykOptions): [number, number, number, number] {
  let c = 1 - r / 255;
  let m = 1 - g / 255;
  let y = 1 - b / 255;
  const kmin = Math.min(c, m, y);
  if (o.neutralK && Math.max(r, g, b) - Math.min(r, g, b) <= 2) {
    return [0, 0, 0, 1 - (r + g + b) / 765];
  }
  const k = kmin * o.gcr;
  c -= k;
  m -= k;
  y -= k;
  const limit = o.tac / 100;
  const cmy = c + m + y;
  if (cmy + k > limit) {
    const room = Math.max(0, limit - k);
    const f = cmy > 0 ? room / cmy : 0;
    c *= f;
    m *= f;
    y *= f;
  }
  return [c, m, y, k];
}

/** Convierte datos RGBA de un lienzo a CMYK entrelazado de 8 bits (el alfa se compone sobre blanco). */
export function rgbaToCmyk(rgba: Uint8ClampedArray | Uint8Array, o: CmykOptions): Uint8Array {
  const n = rgba.length / 4;
  const out = new Uint8Array(n * 4);
  // Los dibujos tienen muy pocos colores distintos: una caché pequeña evita repetir cuentas.
  let lastKey = -1;
  let lc = 0, lm = 0, ly = 0, lk = 0;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const a = rgba[j + 3];
    let r = rgba[j], g = rgba[j + 1], b = rgba[j + 2];
    if (a !== 255) {
      const t = a / 255;
      r = Math.round(r * t + 255 * (1 - t));
      g = Math.round(g * t + 255 * (1 - t));
      b = Math.round(b * t + 255 * (1 - t));
    }
    const key = (r << 16) | (g << 8) | b;
    if (key !== lastKey) {
      const [c, m, y, k] = rgbToCmyk(r, g, b, o);
      lc = Math.round(c * 255);
      lm = Math.round(m * 255);
      ly = Math.round(y * 255);
      lk = Math.round(k * 255);
      lastKey = key;
    }
    out[j] = lc;
    out[j + 1] = lm;
    out[j + 2] = ly;
    out[j + 3] = lk;
  }
  return out;
}

/** Tinta total máxima (en %) de unos datos CMYK entrelazados; útil para comprobar el límite. */
export function maxInk(cmyk: Uint8Array): number {
  let max = 0;
  for (let i = 0; i < cmyk.length; i += 4) {
    const t = cmyk[i] + cmyk[i + 1] + cmyk[i + 2] + cmyk[i + 3];
    if (t > max) max = t;
  }
  return Math.round((max / 255) * 100);
}

/** TIFF CMYK (Photometric = Separated, 8 bits por canal) con resolución en ppp y compresión Deflate opcional. */
export function buildTiffCmyk(cmyk: Uint8Array, w: number, h: number, ppi: number, deflate = true): Uint8Array {
  const data = deflate ? zlibSync(cmyk, { level: 6 }) : cmyk;
  const entries = 13;
  const ifdSize = 2 + entries * 12 + 4;
  const extraAt = 8 + ifdSize; // BitsPerSample (8 bytes) + X/YResolution (16 bytes)
  const dataAt = extraAt + 8 + 16;
  const out = new Uint8Array(dataAt + data.length);
  const v = new DataView(out.buffer);
  out[0] = 0x49;
  out[1] = 0x49;
  v.setUint16(2, 42, true);
  v.setUint32(4, 8, true);
  let p = 8;
  v.setUint16(p, entries, true);
  p += 2;
  const entry = (tag: number, type: number, count: number, value: number) => {
    v.setUint16(p, tag, true);
    v.setUint16(p + 2, type, true);
    v.setUint32(p + 4, count, true);
    if (type === 3 && count === 1) v.setUint16(p + 8, value, true);
    else v.setUint32(p + 8, value, true);
    p += 12;
  };
  const SHORT = 3, LONG = 4, RATIONAL = 5;
  entry(256, LONG, 1, w);
  entry(257, LONG, 1, h);
  entry(258, SHORT, 4, extraAt);
  entry(259, SHORT, 1, deflate ? 8 : 1);
  entry(262, SHORT, 1, 5); // Separated
  entry(273, LONG, 1, dataAt);
  entry(277, SHORT, 1, 4);
  entry(278, LONG, 1, h);
  entry(279, LONG, 1, data.length);
  entry(282, RATIONAL, 1, extraAt + 8);
  entry(283, RATIONAL, 1, extraAt + 16);
  entry(296, SHORT, 1, 2); // pulgadas
  entry(332, SHORT, 1, 1); // InkSet = CMYK
  v.setUint32(p, 0, true);
  for (let i = 0; i < 4; i++) v.setUint16(extraAt + i * 2, 8, true);
  v.setUint32(extraAt + 8, Math.round(ppi), true);
  v.setUint32(extraAt + 12, 1, true);
  v.setUint32(extraAt + 16, Math.round(ppi), true);
  v.setUint32(extraAt + 20, 1, true);
  out.set(data, dataAt);
  return out;
}

/**
 * Marcas de corte como operadores PDF en «registro» (100 % de las cuatro tintas), fuera del sangrado.
 * `trim` y `bleed` en puntos (origen abajo-izquierda); `gap` = separación entre el sangrado y la marca.
 */
export function cropMarksPdf(trim: [number, number, number, number], bleedPt: number, markLen: number, gap = 3): string {
  const [x0, y0, x1, y1] = trim;
  const off = bleedPt + gap;
  const L = markLen;
  const seg = (ax: number, ay: number, bx: number, by: number) => `${ax.toFixed(2)} ${ay.toFixed(2)} m ${bx.toFixed(2)} ${by.toFixed(2)} l S\n`;
  let ops = 'q 1 1 1 1 K 0.25 w\n';
  for (const x of [x0, x1]) {
    ops += seg(x, y0 - off, x, y0 - off - L); // vertical inferior
    ops += seg(x, y1 + off, x, y1 + off + L); // vertical superior
  }
  for (const y of [y0, y1]) {
    ops += seg(x0 - off, y, x0 - off - L, y); // horizontal izquierda
    ops += seg(x1 + off, y, x1 + off + L, y); // horizontal derecha
  }
  return ops + 'Q\n';
}
