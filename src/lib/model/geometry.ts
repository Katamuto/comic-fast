import type { Box } from './types';

export interface Point {
  x: number;
  y: number;
}

export type Rotated = Box & { rotation: number };

const DEG = Math.PI / 180;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function snapTo(v: number, step: number): number {
  return step > 0 ? Math.round(v / step) * step : v;
}

/** Normaliza un ángulo a (-180, 180]. */
export function normalizeAngle(deg: number): number {
  let a = ((deg % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return a;
}

export function center(o: Box): Point {
  return { x: o.x + o.w / 2, y: o.y + o.h / 2 };
}

/**
 * Convierte un punto de página a coordenadas locales del objeto:
 * relativas a su centro y sin rotación.
 */
export function toLocal(o: Rotated, p: Point): Point {
  const c = center(o);
  const a = -o.rotation * DEG;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return {
    x: dx * Math.cos(a) - dy * Math.sin(a),
    y: dx * Math.sin(a) + dy * Math.cos(a)
  };
}

/** Inversa de toLocal: de local (relativo al centro) a página. */
export function toPage(o: Rotated, local: Point): Point {
  const c = center(o);
  const a = o.rotation * DEG;
  return {
    x: c.x + local.x * Math.cos(a) - local.y * Math.sin(a),
    y: c.y + local.x * Math.sin(a) + local.y * Math.cos(a)
  };
}

/** Rectángulo envolvente (alineado a los ejes) de un objeto rotado. */
export function aabb(o: Rotated): Box {
  const hw = o.w / 2;
  const hh = o.h / 2;
  const corners = [
    toPage(o, { x: -hw, y: -hh }),
    toPage(o, { x: hw, y: -hh }),
    toPage(o, { x: hw, y: hh }),
    toPage(o, { x: -hw, y: hh })
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function rectsIntersect(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function normalizeRect(a: Point, b: Point): Box {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/**
 * Redimensiona un objeto arrastrando un tirador.
 * (hx, hy) ∈ {-1, 0, 1}²: -1 = borde izquierdo/superior, 1 = derecho/inferior.
 * `local` es el puntero en coordenadas locales (ver toLocal).
 * El borde/esquina opuesto queda fijo, incluso con rotación.
 */
export function resizeBox(
  o: Rotated,
  hx: -1 | 0 | 1,
  hy: -1 | 0 | 1,
  local: Point,
  keepRatio: boolean,
  min = 12
): Box {
  const hw = o.w / 2;
  const hh = o.h / 2;
  let left = -hw;
  let right = hw;
  let top = -hh;
  let bottom = hh;

  if (hx === 1) right = Math.max(local.x, left + min);
  if (hx === -1) left = Math.min(local.x, right - min);
  if (hy === 1) bottom = Math.max(local.y, top + min);
  if (hy === -1) top = Math.min(local.y, bottom - min);

  let w = right - left;
  let h = bottom - top;

  if (keepRatio && hx !== 0 && hy !== 0) {
    const ratio = o.w / o.h;
    if (w / ratio > h) h = w / ratio;
    else w = h * ratio;
    if (hx === 1) right = left + w;
    else left = right - w;
    if (hy === 1) bottom = top + h;
    else top = bottom - h;
  }

  const c = toPage(o, { x: (left + right) / 2, y: (top + bottom) / 2 });
  return { x: c.x - w / 2, y: c.y - h / 2, w, h };
}

/**
 * Rectángulo donde se dibuja una imagen que "cubre" una viñeta, con zoom y
 * desplazamiento. Los desplazamientos se limitan para que la imagen nunca
 * deje huecos dentro de la viñeta.
 */
export function coverRect(
  iw: number,
  ih: number,
  bw: number,
  bh: number,
  zoom: number,
  ox: number,
  oy: number
): Box {
  const scale = Math.max(bw / iw, bh / ih) * Math.max(1, zoom);
  const w = iw * scale;
  const h = ih * scale;
  const maxX = Math.max(0, (w - bw) / 2);
  const maxY = Math.max(0, (h - bh) / 2);
  return {
    x: (bw - w) / 2 + clamp(ox, -maxX, maxX),
    y: (bh - h) / 2 + clamp(oy, -maxY, maxY),
    w,
    h
  };
}

/** Límite de desplazamiento válido de la imagen dentro de la viñeta. */
export function coverLimits(
  iw: number,
  ih: number,
  bw: number,
  bh: number,
  zoom: number
): { maxX: number; maxY: number } {
  const scale = Math.max(bw / iw, bh / ih) * Math.max(1, zoom);
  return { maxX: Math.max(0, (iw * scale - bw) / 2), maxY: Math.max(0, (ih * scale - bh) / 2) };
}

/** Escala (w, h) para que quepa dentro de (maxW, maxH) sin deformarse ni agrandarse. */
export function fitInside(w: number, h: number, maxW: number, maxH: number): { w: number; h: number } {
  const s = Math.min(1, maxW / w, maxH / h);
  return { w: w * s, h: h * s };
}

/** ¿El objeto (con su giro) queda por completo fuera de la página? Entonces no se vería. */
export function outsidePage(o: Rotated, pageW: number, pageH: number): boolean {
  return !rectsIntersect(aabb(o), { x: 0, y: 0, w: pageW, h: pageH });
}

/**
 * Al cambiar el tamaño de una viñeta, sus capas de imagen la acompañan: el centro se desplaza
 * en proporción y la escala crece lo justo para seguir cubriendo (el mayor de los dos factores).
 * Las tramas y degradados no se tocan (se adaptan solos a la caja).
 */
export function scaleLayers<L extends { type: string }>(layers: L[], fx: number, fy: number): L[] {
  if (!(fx > 0) || !(fy > 0) || (Math.abs(fx - 1) < 1e-9 && Math.abs(fy - 1) < 1e-9)) return layers;
  const k = Math.max(fx, fy);
  return layers.map((l) => {
    if (l.type !== 'image') return l;
    const im = l as unknown as { x: number; y: number; scale: number };
    return { ...l, x: im.x * fx, y: im.y * fy, scale: im.scale * k };
  });
}
