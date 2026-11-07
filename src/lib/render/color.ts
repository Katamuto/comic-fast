/**
 * Colores con transparencia (canal alfa).
 *
 * En el documento un color es una cadena CSS: '#rrggbb' (opaco) o '#rrggbbaa'
 * (con alfa); 'none' significa «sin color». Los navegadores entienden las dos
 * formas en los atributos de SVG, así que el dibujo no cambia: estas funciones
 * solo sirven para separar y volver a juntar el color y su opacidad (selectores,
 * degradados con stop-opacity, filtros, texturas).
 */

export interface ColorParts {
  /** Siempre '#rrggbb' en minúsculas. */
  hex: string;
  /** 0 (transparente) … 1 (opaco). */
  alpha: number;
}

const h2 = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');

/** Separa un color. Lo que no se entiende (o 'none') se toma como negro; 'none' como alfa 0. */
export function parseColor(c: string | null | undefined): ColorParts {
  const s = (c ?? '').trim().toLowerCase();
  if (s === 'none' || s === 'transparent') return { hex: '#000000', alpha: 0 };
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (!m) return { hex: '#000000', alpha: 1 };
  let h = m[1];
  if (h.length <= 4) h = [...h].map((x) => x + x).join('');
  return {
    hex: `#${h.slice(0, 6)}`,
    alpha: h.length === 8 ? Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100 : 1
  };
}

/** Une color y alfa: alfa ≥ 1 da '#rrggbb'; menos, '#rrggbbaa'. */
export function composeColor(hex: string, alpha: number): string {
  const { hex: base } = parseColor(hex);
  const a = Math.min(1, Math.max(0, alpha));
  return a >= 1 ? base : `${base}${h2(a * 255)}`;
}

export const colorAlpha = (c: string | null | undefined): number => parseColor(c).alpha;
export const colorHex = (c: string | null | undefined): string => parseColor(c).hex;

/** [r, g, b] en 0–255. */
export function colorRgb(c: string | null | undefined): [number, number, number] {
  const n = parseInt(parseColor(c).hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
