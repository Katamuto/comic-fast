/**
 * Degradado de puntos (trama de medios tonos): genera la forma de todos los puntos como un único trazo SVG.
 * El color lo pone después el propio degradado (el trazo se rellena con él), así que aquí solo hay geometría.
 *
 * Disposición: filas de puntos que cambian de separación según avanza el degradado (cada fila tiene su
 * propia distancia, interpolada entre los dos extremos), alternadas media posición (como una trama
 * hexagonal). En el degradado radial las filas son anillos concéntricos.
 */
import type { DotSpec, Gradient } from '../model/types';
import { gradientGeometry } from './paint';

/** Tope de puntos por degradado: más haría lenta la edición y pesados el archivo y la exportación. */
export const MAX_DOTS = 20000;
const MIN_PITCH = 1.5;
const ROW = 0.866; // separación entre filas en una trama hexagonal

export interface Dot {
  x: number;
  y: number;
  size: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Posiciones y tamaños de los puntos, en coordenadas de la caja w × h. */
export function dotsLayout(g: Gradient, d: DotSpec, w: number, h: number): Dot[] {
  w = Math.max(1, w);
  h = Math.max(1, h);
  const geo = gradientGeometry(g, w, h);

  const raw = (t: number) => {
    const size = Math.max(0.5, lerp(d.size1, d.size2, t));
    const gap = Math.max(0, lerp(d.gap1, d.gap2, t));
    return { size, pitch: Math.max(MIN_PITCH, size + gap) };
  };
  // Si saldrían demasiados puntos, todo se agranda en proporción (el aspecto se conserva).
  const minPitch = Math.min(raw(0).pitch, raw(1).pitch);
  const est = (w * h) / (minPitch * minPitch * ROW);
  const k = est > MAX_DOTS ? Math.sqrt(est / MAX_DOTS) : 1;
  const at = (t: number) => {
    const r = raw(t);
    return { size: r.size * k, pitch: r.pitch * k };
  };

  const out: Dot[] = [];
  const inside = (x: number, y: number, size: number) => x >= -size && x <= w + size && y >= -size && y <= h + size;
  const push = (x: number, y: number, size: number) => {
    if (out.length < MAX_DOTS * 1.2 && inside(x, y, size)) out.push({ x, y, size });
  };

  if (geo.kind === 'radial') {
    const R = Math.max(1, geo.r);
    const far = Math.max(Math.hypot(geo.cx, geo.cy), Math.hypot(w - geo.cx, geo.cy), Math.hypot(geo.cx, h - geo.cy), Math.hypot(w - geo.cx, h - geo.cy));
    const c0 = at(0);
    push(geo.cx, geo.cy, c0.size);
    let r = c0.pitch * ROW;
    let ring = 0;
    while (r <= far + 1 && out.length < MAX_DOTS * 1.2) {
      const { size, pitch } = at(clamp01(r / R));
      const n = Math.max(1, Math.round((2 * Math.PI * r) / pitch));
      const off = ring % 2 ? Math.PI / n : 0;
      for (let i = 0; i < n; i++) {
        const a = off + (i * 2 * Math.PI) / n;
        push(geo.cx + Math.cos(a) * r, geo.cy + Math.sin(a) * r, size);
      }
      r += pitch * ROW;
      ring++;
    }
    return out;
  }

  // Lineal y reflejado: filas perpendiculares al eje del degradado.
  let ox: number, oy: number, ex: number, ey: number;
  const reflected = geo.kind === 'reflected';
  if (geo.kind === 'linear') {
    ox = geo.x1;
    oy = geo.y1;
    ex = geo.x2;
    ey = geo.y2;
  } else {
    ox = geo.cx;
    oy = geo.cy;
    ex = geo.x2;
    ey = geo.y2;
  }
  const L = Math.max(1, Math.hypot(ex - ox, ey - oy));
  const ux = (ex - ox) / L || 1;
  const uy = (ey - oy) / L || 0;
  const vx = -uy;
  const vy = ux;
  let smin = Infinity;
  let smax = -Infinity;
  let qmin = Infinity;
  let qmax = -Infinity;
  for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
    const s = (cx - ox) * ux + (cy - oy) * uy;
    const q = (cx - ox) * vx + (cy - oy) * vy;
    smin = Math.min(smin, s);
    smax = Math.max(smax, s);
    qmin = Math.min(qmin, q);
    qmax = Math.max(qmax, q);
  }
  let s = smin;
  let row = 0;
  while (s <= smax && out.length < MAX_DOTS * 1.2) {
    const { size, pitch } = at(clamp01((reflected ? Math.abs(s) : s) / L));
    let q = qmin + (row % 2 ? pitch / 2 : 0);
    for (; q <= qmax; q += pitch) push(ox + ux * s + vx * q, oy + uy * s + vy * q, size);
    s += pitch * ROW;
    row++;
  }
  return out;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Un punto como trazo SVG (centrado en x, y). `size` = diámetro / lado / diagonal. */
function dotShape(shape: DotSpec['shape'], x: number, y: number, size: number): string {
  const r = size / 2;
  switch (shape) {
    case 'square':
      return `M${r1(x - r)} ${r1(y - r)}h${r1(size)}v${r1(size)}h${r1(-size)}z`;
    case 'diamond':
      return `M${r1(x)} ${r1(y - r)}L${r1(x + r)} ${r1(y)}L${r1(x)} ${r1(y + r)}L${r1(x - r)} ${r1(y)}z`;
    case 'cross': {
      // X: dos barras a 45° del mismo grosor que un cuarto del tamaño.
      const hl = r * 1.15;
      const hw = Math.max(0.3, size * 0.14);
      const c = Math.SQRT1_2;
      const bar = (dx: number, dy: number) => {
        const nx = -dy;
        const ny = dx;
        const p = [
          [x + dx * hl + nx * hw, y + dy * hl + ny * hw],
          [x + dx * hl - nx * hw, y + dy * hl - ny * hw],
          [x - dx * hl - nx * hw, y - dy * hl - ny * hw],
          [x - dx * hl + nx * hw, y - dy * hl + ny * hw]
        ];
        return `M${p.map(([px, py]) => `${r1(px)} ${r1(py)}`).join('L')}z`;
      };
      return bar(c, c) + bar(c, -c);
    }
    default:
      return `M${r1(x - r)} ${r1(y)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(size)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-size)} 0`;
  }
}

/** Trazo SVG con todos los puntos del degradado `g` (que debe tener `dots`). */
export function dotsPath(g: Gradient, w: number, h: number): string {
  const d = g.dots;
  if (!d) return '';
  return dotsLayout(g, d, w, h)
    .map((p) => dotShape(d.shape, p.x, p.y, p.size))
    .join('');
}
