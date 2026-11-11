/**
 * Texto que sigue el contorno de un globo: en vez de una caja rectangular inscrita, cada
 * línea usa el ancho real que queda dentro de la forma a su altura (menos el margen).
 * Lógica pura (sin DOM); la medida de texto se inyecta.
 */
import type { TextStyle } from '../model/types';
import { polyBounds, spanAt, type Pt } from './balloonShapes';
import { fontCss, wrapParagraphs, type FittedText, type Measure, type RichFn } from './textLayout';

export const DEFAULT_TEXT_MARGIN = 6;

type Rect = { x: number; w: number; y: number };

/** Ancho útil de una franja [y0, y1] del polígono: el tramo común a ambos bordes, menos el margen. */
function bandRect(poly: Pt[], y0: number, y1: number, margin: number): Rect | null {
  const a = spanAt(poly, y0);
  const b = spanAt(poly, y1);
  if (!a || !b) return null;
  const l = Math.max(a.l, b.l) + margin;
  const r = Math.min(a.r, b.r) - margin;
  // con formas redondeadas la franja también debe respetar el punto medio
  const m = spanAt(poly, (y0 + y1) / 2);
  const l2 = m ? Math.max(l, m.l + margin) : l;
  const r2 = m ? Math.min(r, m.r - margin) : r;
  return r2 - l2 > 1 ? { x: l2, w: r2 - l2, y: y0 } : null;
}

/** Reparte N líneas centradas verticalmente en el polígono; null si alguna no tiene sitio. */
export function layoutBands(poly: Pt[], n: number, lh: number, margin: number): Rect[] | null {
  const bb = polyBounds(poly);
  const cy = (bb.minY + bb.maxY) / 2;
  const top = cy - (n * lh) / 2;
  if (top < bb.minY + margin * 0.5 || top + n * lh > bb.maxY - margin * 0.5) return null;
  const out: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const r = bandRect(poly, top + i * lh, top + (i + 1) * lh, margin);
    if (!r) return null;
    out.push(r);
  }
  return out;
}

/**
 * Ajusta el texto al polígono. Reduce el tamaño de fuente hasta que quepa (como fitText);
 * con `force` conserva el tamaño y marca overflow si no cabe. null si el polígono no tiene
 * espacio ni para una línea (el llamador usa entonces la caja rectangular).
 */
export function fitContourText(
  text: string,
  poly: Pt[],
  margin: number,
  style: TextStyle,
  measure: Measure,
  lineHeightRatio = 1.2,
  minSize = 8,
  force = false,
  rich?: RichFn
): FittedText | null {
  const bb = polyBounds(poly);
  const height = bb.maxY - bb.minY - margin;
  let size = force ? Math.max(1, style.fontSize) : Math.max(minSize, style.fontSize);
  for (;;) {
    const width = measure(fontCss(style, size));
    const lh = size * lineHeightRatio;
    const maxN = Math.floor(height / lh);
    for (let n = 1; n <= maxN; n++) {
      const bands = layoutBands(poly, n, lh, margin);
      if (!bands) continue;
      const wr = rich ? rich(size, (i) => bands[Math.min(i, n - 1)].w) : null;
      const { lines, last } = wr ?? wrapParagraphs(text, (i) => bands[Math.min(i, n - 1)].w, width);
      if (lines.length <= n) {
        return { lines, last, fontSize: size, lineHeight: lh, lineRects: bands.slice(0, lines.length), overflow: false, words: wr?.words, lineWidths: wr?.widths };
      }
    }
    if (size <= minSize || force) {
      if (!force && maxN < 1) return null;
      // no cabe: se usa la mejor aproximación (máximo de líneas) y se avisa
      const n = Math.max(1, maxN);
      const bands = layoutBands(poly, n, lh, margin);
      if (!bands) return null;
      const wr = rich ? rich(size, (i) => bands[Math.min(i, n - 1)].w) : null;
      const { lines, last } = wr ?? wrapParagraphs(text, (i) => bands[Math.min(i, n - 1)].w, width);
      const shown = lines.slice(0, Math.max(lines.length, 1));
      const rects: Rect[] = shown.map((_, i) => bands[Math.min(i, n - 1)]);
      return { lines: shown, last, fontSize: size, lineHeight: lh, lineRects: rects.map((r, i) => ({ ...r, y: bands[0].y + i * lh })), overflow: lines.length > n, words: wr?.words, lineWidths: wr?.widths };
    }
    size = Math.max(minSize, Math.floor(size * 0.94 * 10) / 10);
  }
}
