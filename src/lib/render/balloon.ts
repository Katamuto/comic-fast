import type { BalloonStyle, Box } from '../model/types';
import {
  cutPolygon,
  ellipseExitAngle,
  ellipsePoly,
  hash01,
  pointInPoly,
  polyPath,
  rayHit,
  shapePoly,
  type Pt,
  type ShapeKind
} from './balloonShapes';

const POLY_STYLES: readonly BalloonStyle[] = ['rounded', 'scallop', 'blob', 'angular'];
/** Estilos con cola (punta + origen movibles). */
export const TAIL_STYLES: readonly BalloonStyle[] = ['speech', 'whisper', 'thought', ...POLY_STYLES];

export interface BalloonInput {
  style: BalloonStyle;
  w: number;
  h: number;
  tailX: number;
  tailY: number;
  strokeWidth: number;
  /** Ancho de la base de la cola (multiplicador, 1 = normal). */
  tailWidth?: number;
  /** Curvatura de la cola, −1…1 (0 = recta). */
  tailCurve?: number;
  /** Origen de la cola, relativo al centro (0,0 = centro). */
  tailOx?: number;
  tailOy?: number;
}

export interface Dot {
  cx: number;
  cy: number;
  r: number;
}

export interface BalloonGeometry {
  /** Contorno (relleno + borde) en coordenadas locales del objeto (0,0 = esquina sup. izq.). */
  d: string;
  /** Circulitos de la cola de un globo de pensamiento. */
  dots: Dot[];
  /** Punta de la cola en coordenadas locales. */
  tip: { x: number; y: number };
  hasTail: boolean;
  /** Zona interior donde cabe el texto. */
  textBox: Box;
  /** Guion para globos de susurro. */
  dashed: boolean;
  /** Contorno (línea central del borde) que el texto debe seguir; null = usar solo textBox. */
  contour: Pt[] | null;
}

const f = (n: number) => Math.round(n * 100) / 100;

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `M ${f(cx - rx)} ${f(cy)} ` +
    `A ${f(rx)} ${f(ry)} 0 1 1 ${f(cx + rx)} ${f(cy)} ` +
    `A ${f(rx)} ${f(ry)} 0 1 1 ${f(cx - rx)} ${f(cy)} Z`
  );
}

/** Nube de pensamiento: elipse festoneada con arcos hacia afuera. */
function cloudPath(cx: number, cy: number, rx: number, ry: number, bumps: number): string {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  let d = `M ${f(pts[0].x)} ${f(pts[0].y)} `;
  for (let i = 0; i < bumps; i++) {
    const p = pts[(i + 1) % bumps];
    const q = pts[i];
    const chord = Math.hypot(p.x - q.x, p.y - q.y);
    const r = chord * 0.62;
    // sweep=1 recorriendo en sentido horario: el arco abomba hacia fuera
    d += `A ${f(r)} ${f(r)} 0 0 1 ${f(p.x)} ${f(p.y)} `;
  }
  return d + 'Z';
}

/** Explosión de grito: polígono con puntas alternas. */
function burstPath(cx: number, cy: number, rx: number, ry: number, spikes: number): string {
  const n = spikes * 2;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const k = i % 2 === 0 ? 1 : i % 4 === 1 ? 0.74 : 0.8;
    d += `${i === 0 ? 'M' : 'L'} ${f(cx + rx * k * Math.cos(a))} ${f(cy + ry * k * Math.sin(a))} `;
  }
  return d + 'Z';
}

/**
 * Globo «dentado»: lados rectos con dientes de sierra algo irregulares. Es el ejemplo de la guía
 * docs/10-globos.md: un trazado SVG calculado a partir del tamaño (w × h) y del grosor del borde.
 * La línea base de los lados queda `depth` hacia dentro y las puntas de los dientes llegan al borde,
 * así que la forma nunca se sale de su caja.
 */
export function jaggedPath(w: number, h: number, inset: number, depth: number): string {
  const a = inset + depth;
  const corners = [
    { x: a, y: a },
    { x: w - a, y: a },
    { x: w - a, y: h - a },
    { x: a, y: h - a }
  ];
  const normals = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];
  let d = `M ${f(corners[0].x)} ${f(corners[0].y)} `;
  for (let k = 0; k < 4; k++) {
    const p0 = corners[k];
    const p1 = corners[(k + 1) % 4];
    const nrm = normals[k];
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const n = Math.max(2, Math.round(len / (depth * 1.9)));
    const ux = (p1.x - p0.x) / len;
    const uy = (p1.y - p0.y) / len;
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const mid = { x: p0.x + (p1.x - p0.x) * ((t0 + t1) / 2), y: p0.y + (p1.y - p0.y) * ((t0 + t1) / 2) };
      const seg = len / n;
      const out = depth * (0.6 + 0.4 * hash01(k * 100 + i));
      const slide = (hash01(k * 100 + i + 50) - 0.5) * seg * 0.35;
      d += `L ${f(mid.x + nrm.x * out + ux * slide)} ${f(mid.y + nrm.y * out + uy * slide)} `;
      d += `L ${f(p0.x + (p1.x - p0.x) * t1)} ${f(p0.y + (p1.y - p0.y) * t1)} `;
    }
  }
  return d + 'Z';
}

const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const SPREAD = 0.3; // semiancho angular de la base de la cola (rad) con tailWidth = 1

/** Ángulo a la mitad de la base de la cola: donde el rayo origen→punta sale de la elipse. */
const tailAngle = (o: BalloonInput, rx: number, ry: number) =>
  ellipseExitAngle(o.tailOx ?? 0, o.tailOy ?? 0, o.tailX, o.tailY, rx, ry);

/** Base de la cola en un globo-polígono (rounded, scallop, blob, angular). */
function polygonTail(o: BalloonInput): { d: string; hasTail: boolean; p1: Pt; p2: Pt; poly: Pt[] } {
  const inset = o.strokeWidth / 2;
  const poly = shapePoly(o.style as ShapeKind, o.w, o.h, inset);
  const cx = o.w / 2;
  const cy = o.h / 2;
  const origin = { x: cx + (o.tailOx ?? 0), y: cy + (o.tailOy ?? 0) };
  const tip = { x: cx + o.tailX, y: cy + o.tailY };
  const dir = { x: tip.x - origin.x, y: tip.y - origin.y };
  const hit = Math.hypot(dir.x, dir.y) < 1e-6 || !pointInPoly(origin, poly) ? null : rayHit(poly, origin, dir);
  if (!hit || hit.t >= 0.96) {
    return { d: polyPath(poly), hasTail: false, p1: origin, p2: origin, poly };
  }
  const rx = o.w / 2 - inset;
  const ry = o.h / 2 - inset;
  const half = clampN(SPREAD * (o.tailWidth ?? 1), 0.02, 1.25) * ((rx + ry) / 2);
  const cut = cutPolygon(poly, hit.s, half);
  const pt = (p: Pt) => `${f(p.x)} ${f(p.y)}`;
  let d = `M ${pt(cut.body[0])} ` + cut.body.slice(1).map((p) => `L ${pt(p)}`).join(' ') + ' ';
  const curve = clampN(o.tailCurve ?? 0, -1, 1);
  if (curve === 0) {
    d += `L ${pt(tip)} Z`;
  } else {
    const bm = { x: (cut.p1.x + cut.p2.x) / 2, y: (cut.p1.y + cut.p2.y) / 2 };
    const len = Math.max(1e-6, Math.hypot(tip.x - bm.x, tip.y - bm.y));
    const nx = -(tip.y - bm.y) / len;
    const ny = (tip.x - bm.x) / len;
    const bend = bendOf(curve, len);
    const ctl = (a: Pt) => ({ x: (a.x + tip.x) / 2 + nx * bend, y: (a.y + tip.y) / 2 + ny * bend });
    const c1 = ctl(cut.p1);
    const c2 = ctl(cut.p2);
    d += `Q ${pt(c1)} ${pt(tip)} Q ${pt(c2)} ${pt(cut.p2)} Z`;
  }
  return { d, hasTail: true, p1: cut.p1, p2: cut.p2, poly };
}

export interface TailFrame {
  /** Mitad de la base de la cola (coords. locales, esquina sup. izq. = 0,0). */
  base: { x: number; y: number };
  tip: { x: number; y: number };
  /** Punto medio de la cola en línea recta. */
  mid: { x: number; y: number };
  /** Unitario, perpendicular a la cola (hacia donde se curva con tailCurve > 0). */
  normal: { x: number; y: number };
  /** Distancia base → punta. */
  len: number;
}

/** Cuánto se separa el punto de control (unidades) para una curvatura dada. */
const bendOf = (curve: number, len: number) => clampN(curve, -1, 1) * len * 0.8;

/**
 * Geometría de referencia de la cola (la usa también el tirador de curvatura
 * del lienzo). null si el globo no tiene cola en esta posición.
 */
export function tailFrame(o: BalloonInput): TailFrame | null {
  if (POLY_STYLES.includes(o.style)) {
    const pt = polygonTail({ ...o, tailCurve: 0 });
    if (!pt.hasTail) return null;
    const tip = { x: o.w / 2 + o.tailX, y: o.h / 2 + o.tailY };
    const base = { x: (pt.p1.x + pt.p2.x) / 2, y: (pt.p1.y + pt.p2.y) / 2 };
    const dx = tip.x - base.x;
    const dy = tip.y - base.y;
    const len = Math.max(1e-6, Math.hypot(dx, dy));
    return { base, tip, mid: { x: (base.x + tip.x) / 2, y: (base.y + tip.y) / 2 }, normal: { x: -dy / len, y: dx / len }, len };
  }
  if (o.style !== 'speech' && o.style !== 'whisper' && o.style !== 'thought') return null;
  const geo = balloonGeometry({ ...o, tailCurve: 0 });
  if (!geo.hasTail) return null;
  const cx = o.w / 2;
  const cy = o.h / 2;
  const inset = o.strokeWidth / 2;
  const k = o.style === 'thought' ? 0.86 : 1;
  const rx = (o.w / 2 - inset) * k;
  const ry = (o.h / 2 - inset) * k;
  const t = tailAngle(o, rx, ry);
  const tip = geo.tip;
  const base = { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const len = Math.max(1e-6, Math.hypot(dx, dy));
  return {
    base,
    tip,
    mid: { x: (base.x + tip.x) / 2, y: (base.y + tip.y) / 2 },
    normal: { x: -dy / len, y: dx / len },
    len
  };
}

/** Curvatura (−1…1) que hace pasar la cola por el punto `p` (coords. locales). */
export function curveFromPoint(o: BalloonInput, p: { x: number; y: number }): number | null {
  const fr = tailFrame(o);
  if (!fr) return null;
  const dist = (p.x - fr.mid.x) * fr.normal.x + (p.y - fr.mid.y) * fr.normal.y;
  return clampN(dist / (fr.len * 0.4), -1, 1);
}

/** Posición del tirador de curvatura (el punto central de la cola curvada). */
export function curveHandle(o: BalloonInput): { x: number; y: number } | null {
  const fr = tailFrame(o);
  if (!fr) return null;
  const d = clampN(o.tailCurve ?? 0, -1, 1) * fr.len * 0.4;
  return { x: fr.mid.x + fr.normal.x * d, y: fr.mid.y + fr.normal.y * d };
}

export function balloonGeometry(o: BalloonInput): BalloonGeometry {
  const { w, h } = o;
  const inset = o.strokeWidth / 2;
  const cx = w / 2;
  const cy = h / 2;
  const tip = { x: cx + o.tailX, y: cy + o.tailY };

  if (o.style === 'caption') {
    const sw = o.strokeWidth;
    return {
      d: `M ${f(inset)} ${f(inset)} H ${f(w - inset)} V ${f(h - inset)} H ${f(inset)} Z`,
      dots: [],
      tip,
      hasTail: false,
      textBox: { x: 12 + sw, y: 8 + sw, w: Math.max(1, w - 24 - 2 * sw), h: Math.max(1, h - 16 - 2 * sw) },
      dashed: false,
      contour: null
    };
  }

  if (o.style === 'jagged') {
    const depth = clampN(Math.min(w, h) * 0.07, 6, 28);
    return {
      d: jaggedPath(w, h, inset, depth),
      dots: [],
      tip,
      hasTail: false,
      textBox: { x: w * 0.12, y: h * 0.17, w: w * 0.76, h: h * 0.66 },
      dashed: false,
      contour: null
    };
  }

  if (o.style === 'shout') {
    const rx = w / 2 - inset;
    const ry = h / 2 - inset;
    return {
      d: burstPath(cx, cy, rx, ry, 14),
      dots: [],
      tip,
      hasTail: false,
      textBox: { x: w * 0.21, y: h * 0.21, w: w * 0.58, h: h * 0.58 },
      dashed: false,
      contour: null
    };
  }

  if (o.style === 'impact') {
    const poly = shapePoly('impact', w, h, inset);
    return {
      d: polyPath(poly),
      dots: [],
      tip,
      hasTail: false,
      textBox: { x: w * 0.24, y: h * 0.24, w: w * 0.52, h: h * 0.52 },
      dashed: false,
      contour: null
    };
  }

  if (POLY_STYLES.includes(o.style)) {
    const pt = polygonTail(o);
    const inner = o.style === 'scallop' ? ellipsePoly(cx, cy, (w / 2 - inset) * 0.86, (h / 2 - inset) * 0.86, 72) : pt.poly;
    return {
      d: pt.d,
      dots: [],
      tip,
      hasTail: pt.hasTail,
      textBox: { x: w * 0.14, y: h * 0.17, w: w * 0.72, h: h * 0.66 },
      dashed: false,
      contour: inner
    };
  }

  if (o.style === 'thought') {
    const k = 0.86; // deja sitio a los festones
    const rx = (w / 2 - inset) * k;
    const ry = (h / 2 - inset) * k;
    const dx = o.tailX;
    const dy = o.tailY;
    const outside = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1.15;
    const dots: Dot[] = [];
    if (outside) {
      const t = tailAngle(o, rx, ry);
      const b = { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
      const base = Math.min(w, h) * 0.08 * clampN(o.tailWidth ?? 1, 0.4, 2);
      const fr = [0.2, 0.55, 0.92];
      const rad = [base, base * 0.7, base * 0.45];
      // Los circulitos siguen una curva de Bézier cuadrática de la nube a la punta.
      const len = Math.max(1e-6, Math.hypot(tip.x - b.x, tip.y - b.y));
      const nx = -(tip.y - b.y) / len;
      const ny = (tip.x - b.x) / len;
      const bend = bendOf(o.tailCurve ?? 0, len);
      const c = { x: (b.x + tip.x) / 2 + nx * bend, y: (b.y + tip.y) / 2 + ny * bend };
      for (let i = 0; i < 3; i++) {
        const u = fr[i];
        const a = (1 - u) * (1 - u);
        const m = 2 * (1 - u) * u;
        const e = u * u;
        dots.push({
          cx: f(a * b.x + m * c.x + e * tip.x),
          cy: f(a * b.y + m * c.y + e * tip.y),
          r: f(Math.max(2, rad[i]))
        });
      }
    }
    return {
      d: cloudPath(cx, cy, rx, ry, 12),
      dots,
      tip,
      hasTail: outside,
      textBox: { x: w * 0.17, y: h * 0.19, w: w * 0.66, h: h * 0.62 },
      dashed: false,
      contour: ellipsePoly(cx, cy, rx * 0.95, ry * 0.95, 72)
    };
  }

  // speech / whisper: elipse con cola triangular
  const rx = w / 2 - inset;
  const ry = h / 2 - inset;
  const dx = o.tailX;
  const dy = o.tailY;
  const outside = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1.08;
  let d: string;
  if (!outside) {
    d = ellipsePath(cx, cy, rx, ry);
  } else {
    const t = tailAngle(o, rx, ry);
    const spread = clampN(SPREAD * (o.tailWidth ?? 1), 0.02, 1.25);
    const p1 = { x: cx + rx * Math.cos(t - spread), y: cy + ry * Math.sin(t - spread) };
    const p2 = { x: cx + rx * Math.cos(t + spread), y: cy + ry * Math.sin(t + spread) };
    // Del punto p2 hacia p1 por el lado largo (sentido horario), y luego a la punta.
    const curve = clampN(o.tailCurve ?? 0, -1, 1);
    if (curve === 0) {
      d =
        `M ${f(p2.x)} ${f(p2.y)} A ${f(rx)} ${f(ry)} 0 1 1 ${f(p1.x)} ${f(p1.y)} ` +
        `L ${f(tip.x)} ${f(tip.y)} Z`;
    } else {
      // Cola curva: los dos bordes se doblan hacia el mismo lado (como un cuerno).
      const bm = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const len = Math.max(1e-6, Math.hypot(tip.x - bm.x, tip.y - bm.y));
      const nx = -(tip.y - bm.y) / len;
      const ny = (tip.x - bm.x) / len;
      const bend = bendOf(curve, len);
      const ctl = (a: { x: number; y: number }) => ({
        x: (a.x + tip.x) / 2 + nx * bend,
        y: (a.y + tip.y) / 2 + ny * bend
      });
      const c1 = ctl(p1);
      const c2 = ctl(p2);
      d =
        `M ${f(p2.x)} ${f(p2.y)} A ${f(rx)} ${f(ry)} 0 1 1 ${f(p1.x)} ${f(p1.y)} ` +
        `Q ${f(c1.x)} ${f(c1.y)} ${f(tip.x)} ${f(tip.y)} ` +
        `Q ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)} Z`;
    }
  }
  return {
    d,
    dots: [],
    tip,
    hasTail: outside,
    textBox: { x: w * 0.14, y: h * 0.17, w: w * 0.72, h: h * 0.66 },
    dashed: o.style === 'whisper',
    contour: ellipsePoly(cx, cy, rx, ry, 72)
  };
}
