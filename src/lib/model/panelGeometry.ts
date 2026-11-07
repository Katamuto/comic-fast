/**
 * Geometría de viñetas: polígonos, elipses y capas. Todo puro y con pruebas.
 *
 * Convenciones:
 *  - `points` de una viñeta están en FRACCIONES (0..1) de su caja, así al
 *    redimensionar la viñeta la forma se escala sola.
 *  - "px" = unidades de página, relativas a la esquina superior izquierda de
 *    la caja (sin rotar).
 *  - "local" = relativo al CENTRO de la caja (ver geometry.ts: toLocal/toPage).
 */
import type { Box, ImageLayer, PanelLayer, PanelObj, Pt } from './types';
import { toPage, type Rotated } from './geometry';

export const unitSquare = (): Pt[] => [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 }
];

/** Aproxima una elipse inscrita en la caja con `n` vértices. */
export function ellipsePoints(n = 16): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) };
  });
}

export function pointsPx(points: Pt[], w: number, h: number): Pt[] {
  return points.map((p) => ({ x: p.x * w, y: p.y * h }));
}

export interface NormalizedPoly {
  box: Box;
  /** Vértices en fracciones de la nueva caja. */
  points: Pt[];
  /** Cuánto se movió el centro de la caja (en ejes locales de la viñeta). */
  centerShift: Pt;
}

/**
 * Ajusta la caja de una viñeta para que envuelva justo a unos vértices
 * (dados en px respecto a la caja actual). Los vértices no se mueven en la
 * página aunque la viñeta esté girada.
 */
export function normalizePoly(o: Rotated, px: Pt[], min = 12): NormalizedPoly {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of px) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  let w = maxX - minX;
  let h = maxY - minY;
  if (w < min) {
    minX -= (min - w) / 2;
    w = min;
  }
  if (h < min) {
    minY -= (min - h) / 2;
    h = min;
  }
  const centerShift = { x: minX + w / 2 - o.w / 2, y: minY + h / 2 - o.h / 2 };
  const c = toPage(o, centerShift);
  return {
    box: { x: c.x - w / 2, y: c.y - h / 2, w, h },
    points: px.map((p) => ({ x: (p.x - minX) / w, y: (p.y - minY) / h })),
    centerShift
  };
}

/**
 * Cambios (patch) que aplican nuevos vértices a una viñeta: nueva caja,
 * vértices en fracciones y capas de imagen compensadas para que no se muevan.
 */
export function panelWithPoints(o: PanelObj, px: Pt[]): Record<string, unknown> {
  const n = normalizePoly(o, px);
  const patch: Record<string, unknown> = { ...n.box, points: n.points };
  if (o.layers.some((l) => l.type === 'image')) {
    patch.layers = o.layers.map((l) =>
      l.type === 'image' ? { ...l, x: l.x - n.centerShift.x, y: l.y - n.centerShift.y } : { ...l }
    );
  }
  return patch;
}

/** ¿Está el punto dentro del polígono? (par-impar) */
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** ¿Contiene la viñeta el punto `local` (relativo a su centro)? */
export function panelContains(o: PanelObj, local: Pt): boolean {
  const x = local.x + o.w / 2;
  const y = local.y + o.h / 2;
  if (x < 0 || y < 0 || x > o.w || y > o.h) return false;
  if (o.shape === 'ellipse') {
    const dx = (x - o.w / 2) / (o.w / 2);
    const dy = (y - o.h / 2) / (o.h / 2);
    return dx * dx + dy * dy <= 1;
  }
  if (o.shape === 'poly') return pointInPolygon({ x, y }, pointsPx(o.points, o.w, o.h));
  return true;
}

export interface EdgeHit {
  /** El vértice nuevo iría entre `index` y `index + 1`. */
  index: number;
  point: Pt;
  dist: number;
}

/** Arista del polígono (px) más cercana al punto. */
export function nearestEdge(poly: Pt[], p: Pt): EdgeHit | null {
  let best: EdgeHit | null = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const dist = Math.hypot(p.x - q.x, p.y - q.y);
    if (!best || dist < best.dist) best = { index: i, point: q, dist };
  }
  return best;
}

/** Escala con la que una imagen cubre justo una caja. */
export function coverScale(iw: number, ih: number, bw: number, bh: number): number {
  return Math.max(bw / iw, bh / ih);
}

/** Escala con la que una imagen cabe entera dentro de una caja. */
export function containScale(iw: number, ih: number, bw: number, bh: number): number {
  return Math.min(bw / iw, bh / ih);
}

export function isImageLayer(l: PanelLayer): l is ImageLayer {
  return l.type === 'image';
}
