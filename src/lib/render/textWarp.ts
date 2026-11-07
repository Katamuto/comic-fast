/**
 * Deformación de texto (para onomatopeyas): cada letra se coloca por separado con su propia
 * posición, giro y escala. Así sigue siendo vectorial, se puede editar y sale igual al exportar.
 *
 *  - arc:         el texto sigue un arco (amount > 0 = «∩», < 0 = «∪»);
 *  - wave:        la línea base ondula, una onda completa a lo ancho;
 *  - bulge:       el centro crece (amount > 0) o se encoge (< 0);
 *  - perspective: las letras de un lado son más altas que las del otro (como un cartel visto de lado).
 */
import type { Box, TextStyle } from '../model/types';
import type { FittedText, Measure } from './textLayout';
import { fontCss } from './textLayout';

export type WarpKind = 'arc' | 'wave' | 'bulge' | 'perspective';
export const WARP_KINDS: WarpKind[] = ['arc', 'wave', 'bulge', 'perspective'];

export interface Warp {
  kind: WarpKind;
  /** −100…100. */
  amount: number;
}

export interface Glyph {
  ch: string;
  /** Centro de la letra ya deformado (coordenadas del objeto). */
  x: number;
  y: number;
  /** Grados, sentido horario. */
  rot: number;
  sx: number;
  sy: number;
}

/** Desplazamiento vertical del centro de una letra respecto a su línea base (fracción del tamaño). */
export const GLYPH_MID = 0.32;
export const BASELINE = 0.82;

export function warpActive(w: Warp | undefined): w is Warp {
  return !!w && w.amount !== 0 && WARP_KINDS.includes(w.kind);
}

/**
 * Letras de `fit` colocadas según la deformación. Las posiciones planas son las mismas que las del texto
 * normal (misma alineación y misma región), de modo que con amount = 0 el resultado coincide.
 */
export function warpGlyphs(fit: FittedText, region: Box, style: TextStyle, measure: Measure, warp: Warp): Glyph[] {
  const width = measure(fontCss(style, fit.fontSize));
  const k = Math.max(-100, Math.min(100, warp.amount)) / 100;
  const cx = region.x + region.w / 2;
  const half = Math.max(1, region.w / 2);
  const blockMid = region.y + (fit.lines.length * fit.lineHeight) / 2;
  const out: Glyph[] = [];

  fit.lines.forEach((line, li) => {
    const total = width(line);
    const left = style.align === 'left' ? region.x : style.align === 'right' ? region.x + region.w - total : cx - total / 2;
    const base = region.y + li * fit.lineHeight + fit.fontSize * BASELINE;
    let i = 0;
    for (const ch of line) {
      const before = width(line.slice(0, i));
      i += ch.length;
      if (!ch.trim()) continue;
      const adv = width(ch);
      const gx = left + before + adv / 2; // centro de la letra, plano
      const gy = base - fit.fontSize * GLYPH_MID;
      const g = place(warp.kind, k, gx, gy, { cx, half, blockMid, region, fit, left, total });
      out.push({ ch, ...g });
    }
  });
  return out;
}

interface Ctx {
  cx: number;
  half: number;
  blockMid: number;
  region: Box;
  fit: FittedText;
  left: number;
  total: number;
}

function place(kind: WarpKind, k: number, x: number, y: number, c: Ctx): Omit<Glyph, 'ch'> {
  const u = Math.max(-1.5, Math.min(1.5, (x - c.cx) / c.half));
  switch (kind) {
    case 'arc': {
      // Ángulo en el borde de la caja: hasta 90° con amount = 100.
      const theta = Math.abs(k) * (Math.PI / 2);
      if (theta < 1e-4) return { x, y, rot: 0, sx: 1, sy: 1 };
      const R = Math.sign(k) * (c.half / theta); // con signo: R < 0 curva hacia el otro lado
      const phi = (x - c.cx) / R;
      const d = y - c.blockMid;
      const r = R - d;
      return {
        x: c.cx + r * Math.sin(phi),
        y: c.blockMid + R - r * Math.cos(phi),
        rot: (phi * 180) / Math.PI,
        sx: 1,
        sy: 1
      };
    }
    case 'wave': {
      const amp = k * c.fit.lineHeight * 0.6;
      const span = Math.max(1, c.total);
      const ph = (2 * Math.PI * (x - c.left)) / span;
      const dy = amp * Math.sin(ph);
      const slope = ((amp * 2 * Math.PI) / span) * Math.cos(ph);
      return { x, y: y + dy, rot: (Math.atan(slope) * 180) / Math.PI, sx: 1, sy: 1 };
    }
    case 'bulge': {
      const s = Math.max(0.2, 1 + k * 0.9 * (1 - Math.min(1, u * u)));
      return { x, y: c.blockMid + (y - c.blockMid) * s, rot: 0, sx: 1 + (s - 1) * 0.6, sy: s };
    }
    case 'perspective': {
      const s = Math.max(0.2, 1 - k * 0.6 * Math.max(-1, Math.min(1, u)));
      return { x, y: c.blockMid + (y - c.blockMid) * s, rot: 0, sx: 1, sy: s };
    }
  }
}
