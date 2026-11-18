/**
 * Maquetación profesional: PPI de salida, márgenes por lado, sangrado, canal estándar entre
 * viñetas y páginas enfrentadas (libro con páginas izquierda/derecha).
 *
 * Todas las medidas del documento van en «px de página» (150 por pulgada, ver units.ts). El PPI
 * solo decide con cuántos píxeles reales se exporta cada px de página.
 */
import { PAGE_DPI } from './units';
import { clampGrid, type GridSpec } from './grid';

export type Side = 'left' | 'right';

/** Márgenes de la maquetación. «inner» es el del lomo (junto al canal del libro) y «outer» el del borde exterior. */
export interface Margins {
  top: number;
  bottom: number;
  inner: number;
  outer: number;
}

export interface Layout {
  /** Píxeles por pulgada de las imágenes exportadas. */
  ppi: number;
  margins: Margins;
  /** Sangrado extra por fuera de cada borde, en el render final. */
  bleed: number;
  /** Separación estándar entre viñetas. */
  gutter: number;
  /** Libro: las páginas se alternan izquierda/derecha (y se pueden ver en doble página). */
  book: boolean;
  /** Lado de la primera página (en un libro occidental la 1 es derecha). */
  firstSide: Side;
  /** No dejar colocar elementos fuera del área de márgenes (salvo en la página de estilo). */
  restrict: boolean;
}

export const PPI_MIN = 72;
export const PPI_MAX = 1200;
export const PPI_PRESETS = [150, 200, 300, 400, 600, 1200];

export const DEFAULT_LAYOUT: Layout = {
  ppi: 300,
  margins: { top: 0, bottom: 0, inner: 0, outer: 0 },
  bleed: 0,
  gutter: 0,
  book: false,
  firstSide: 'right',
  restrict: true
};

const num = (v: unknown, lo: number, hi: number, def: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : def;
  return Math.min(hi, Math.max(lo, n));
};

/** Completa y sanea el diseño guardado en el documento (todo es opcional ahí). */
export function resolveLayout(l?: Partial<Layout> | null): Layout {
  const m: Partial<Margins> = l?.margins ?? {};
  const d = DEFAULT_LAYOUT;
  return {
    ppi: Math.round(num(l?.ppi, PPI_MIN, PPI_MAX, d.ppi)),
    margins: {
      top: num(m.top, 0, 2000, 0),
      bottom: num(m.bottom, 0, 2000, 0),
      inner: num(m.inner, 0, 2000, 0),
      outer: num(m.outer, 0, 2000, 0)
    },
    bleed: num(l?.bleed, 0, 600, 0),
    gutter: num(l?.gutter, 0, 400, 0),
    book: !!l?.book,
    firstSide: l?.firstSide === 'left' ? 'left' : 'right',
    restrict: l?.restrict !== false
  };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lado de una página dentro del libro (null si el documento no es un libro). */
export function pageSide(l: Layout, index: number): Side | null {
  if (!l.book) return null;
  const first = l.firstSide;
  const other: Side = first === 'right' ? 'left' : 'right';
  return index % 2 === 0 ? first : other;
}

/** Página con la que forma doble página (la izquierda con la derecha que le sigue), o null. */
export function partnerIndex(l: Layout, index: number, count: number): number | null {
  const side = pageSide(l, index);
  if (!side) return null;
  const p = side === 'left' ? index + 1 : index - 1;
  return p >= 0 && p < count ? p : null;
}

/** Márgenes izquierdo/derecho reales según el lado de la página. Sin libro: interior = izquierda. */
export function sideMargins(l: Layout, side: Side | null): { left: number; right: number; top: number; bottom: number } {
  const { inner, outer, top, bottom } = l.margins;
  return side === 'left' ? { left: outer, right: inner, top, bottom } : { left: inner, right: outer, top, bottom };
}

/** Área útil (dentro de márgenes) de una página de tamaño w × h. Nunca queda con tamaño ≤ 0. */
export function contentRect(l: Layout, w: number, h: number, side: Side | null): Rect {
  const m = sideMargins(l, side);
  const x = Math.min(m.left, w / 2 - 1);
  const y = Math.min(m.top, h / 2 - 1);
  return { x, y, w: Math.max(2, w - x - Math.min(m.right, w / 2 - 1)), h: Math.max(2, h - y - Math.min(m.bottom, h / 2 - 1)) };
}

/**
 * Zona donde se pueden colocar elementos en la página `index`. En doble página se extiende al
 * área útil de la vecina (en coordenadas de la página activa).
 */
export function allowedRect(l: Layout, w: number, h: number, index: number, count: number, spread: boolean): Rect {
  const side = pageSide(l, index);
  const own = contentRect(l, w, h, side);
  if (!spread) return own;
  const p = partnerIndex(l, index, count);
  if (p === null) return own;
  const pc = contentRect(l, w, h, pageSide(l, p));
  if (side === 'left') {
    const right = w + pc.x + pc.w;
    return { x: own.x, y: own.y, w: right - own.x, h: own.h };
  }
  const left = -w + pc.x;
  return { x: left, y: own.y, w: own.x + own.w - left, h: own.h };
}

/** Rejilla dentro de un área: `cols` columnas sobre el ancho del área; el paso es el mismo en vertical. */
export function gridStepIn(area: Rect, g: GridSpec): number {
  const c = clampGrid(g);
  return area.w / (c.cols * c.sub);
}

/** Paso vertical: igual al horizontal o, con `fit`, el que reparte el alto del área en filas exactas. */
export function gridStepYIn(area: Rect, g: GridSpec): number {
  const sx = gridStepIn(area, g);
  if (!g.fit || sx <= 0) return sx;
  return area.h / Math.max(1, Math.round(area.h / sx));
}

export function gridLinesIn(area: Rect, g: GridSpec): { x: { at: number; major: boolean }[]; y: { at: number; major: boolean }[] } {
  const { sub } = clampGrid(g);
  const stepX = gridStepIn(area, g);
  const stepY = gridStepYIn(area, g);
  const axis = (from: number, len: number, step: number) => {
    const out: { at: number; major: boolean }[] = [];
    const n = Math.floor(len / step + 1e-6);
    for (let i = 0; i <= n; i++) out.push({ at: from + i * step, major: i % sub === 0 });
    return out;
  };
  return { x: axis(area.x, area.w, stepX), y: axis(area.y, area.h, stepY) };
}

/** Ajusta v a la rejilla que empieza en `origin`. */
export function snapFrom(v: number, origin: number, step: number): number {
  return step > 0 ? origin + Math.round((v - origin) / step) * step : v;
}

/** Limita un punto al área. */
export function clampPoint(p: { x: number; y: number }, area: Rect): { x: number; y: number } {
  return {
    x: Math.min(area.x + area.w, Math.max(area.x, p.x)),
    y: Math.min(area.y + area.h, Math.max(area.y, p.y))
  };
}

/**
 * Desplazamiento (dx, dy) corregido para que la caja `b` siga dentro de `area`. Si la caja es
 * más grande que el área en un eje, ese eje no se limita (no hay posición válida).
 */
export function clampShift(b: Rect, dx: number, dy: number, area: Rect): { dx: number; dy: number } {
  const axis = (pos: number, len: number, d: number, from: number, alen: number) => {
    if (len > alen + 1e-6) return d;
    return Math.min(from + alen - len - pos, Math.max(from - pos, d));
  };
  return { dx: axis(b.x, b.w, dx, area.x, area.w), dy: axis(b.y, b.h, dy, area.y, area.h) };
}

// ---------------------------------------------------------------------------
// Exportación
// ---------------------------------------------------------------------------

/** Lado máximo y área máxima (px reales) que se piden al lienzo del navegador. */
export const MAX_SIDE_PX = 14000;
export const MAX_AREA_PX = 120_000_000;

export interface RenderPlan {
  /** Píxeles reales por px de página. */
  scale: number;
  /** PPI pedido y PPI realmente logrado (menor si el lienzo no da más). */
  ppi: number;
  effectivePpi: number;
  capped: boolean;
  /** Tamaño en px reales de la imagen con sangrado. */
  pxW: number;
  pxH: number;
  /** Sangrado en px de página. */
  bleed: number;
}

/** Calcula la escala de salida para un PPI y un sangrado, respetando los límites del lienzo. */
export function renderPlan(pageW: number, pageH: number, ppi: number, bleed: number): RenderPlan {
  const wantScale = ppi / PAGE_DPI;
  const fullW = pageW + 2 * bleed;
  const fullH = pageH + 2 * bleed;
  const maxBySide = MAX_SIDE_PX / Math.max(fullW, fullH);
  const maxByArea = Math.sqrt(MAX_AREA_PX / (fullW * fullH));
  const scale = Math.max(0.1, Math.min(wantScale, maxBySide, maxByArea));
  return {
    scale,
    ppi,
    effectivePpi: Math.round(scale * PAGE_DPI),
    capped: scale < wantScale - 1e-9,
    pxW: Math.round(fullW * scale),
    pxH: Math.round(fullH * scale),
    bleed
  };
}
