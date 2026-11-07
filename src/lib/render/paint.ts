/** Rellenos: colores sólidos y degradados. */
import type { DotSpec, Fill, Gradient, Pt } from '../model/types';

const DEG = Math.PI / 180;

export const DEFAULT_GRADIENT: Gradient = {
  kind: 'linear',
  c1: '#ffd400',
  c2: '#e53935',
  angle: 90,
  cx: 0.5,
  cy: 0.5
};

export const DEFAULT_DOTS: DotSpec = { shape: 'circle', size1: 9, size2: 2, gap1: 2, gap2: 9, bg: false };

export function isGradient(f: Fill): f is Gradient {
  return typeof f === 'object' && f !== null;
}

/** Valor del atributo `fill` de SVG: el color, o una referencia al degradado `id`. */
export function fillRef(f: Fill, id: string): string {
  return isGradient(f) ? `url(#${id})` : f;
}

/** Un color representativo (para mostrar en selectores). */
export function fillColor(f: Fill): string {
  return isGradient(f) ? f.c1 : f;
}

export type GradientGeo =
  | { kind: 'linear'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'radial'; cx: number; cy: number; r: number }
  /** Centro (color 1) y extremo (color 2); el otro lado es el espejo. */
  | { kind: 'reflected'; cx: number; cy: number; x2: number; y2: number };

/** Coordenadas SVG (userSpaceOnUse) de un degradado sobre una caja w × h. */
export function gradientGeometry(g: Gradient, w: number, h: number): GradientGeo {
  if (g.kind === 'reflected') {
    const l = gradientGeometry({ ...g, kind: 'linear' }, w, h);
    if (l.kind !== 'linear') return l;
    // Con guías, p1 es el centro; sin ellas, el centro de la caja (línea de esquina a esquina).
    const own = !!(g.p1 && g.p2);
    return {
      kind: 'reflected',
      cx: own ? l.x1 : (l.x1 + l.x2) / 2,
      cy: own ? l.y1 : (l.y1 + l.y2) / 2,
      x2: l.x2,
      y2: l.y2
    };
  }
  if (g.p1 && g.p2) {
    if (g.kind === 'radial') {
      return {
        kind: 'radial',
        cx: g.p1.x * w,
        cy: g.p1.y * h,
        r: Math.max(1, Math.hypot((g.p2.x - g.p1.x) * w, (g.p2.y - g.p1.y) * h))
      };
    }
    return { kind: 'linear', x1: g.p1.x * w, y1: g.p1.y * h, x2: g.p2.x * w, y2: g.p2.y * h };
  }
  if (g.kind === 'radial') {
    const cx = g.cx * w;
    const cy = g.cy * h;
    const r = Math.max(
      1,
      Math.hypot(cx, cy),
      Math.hypot(w - cx, cy),
      Math.hypot(cx, h - cy),
      Math.hypot(w - cx, h - cy)
    );
    return { kind: 'radial', cx, cy, r };
  }
  const dx = Math.cos(g.angle * DEG);
  const dy = Math.sin(g.angle * DEG);
  // Como en CSS: la línea del degradado llega justo a las esquinas.
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return { kind: 'linear', x1: cx - dx * half, y1: cy - dy * half, x2: cx + dx * half, y2: cy + dy * half };
}

/**
 * Las dos guías del degradado en fracciones de la caja (0..1). Si el degradado no
 * las tiene todavía, salen de su ángulo / centro, así que se ven donde ya estaba.
 */
export function gradientGuides(g: Gradient, w: number, h: number): { p1: Pt; p2: Pt } {
  if (g.p1 && g.p2) return { p1: g.p1, p2: g.p2 };
  const geo = gradientGeometry(g, w, h);
  const W = Math.max(1, w);
  const H = Math.max(1, h);
  if (geo.kind === 'radial') return { p1: { x: geo.cx / W, y: geo.cy / H }, p2: { x: (geo.cx + geo.r) / W, y: geo.cy / H } };
  if (geo.kind === 'reflected') return { p1: { x: geo.cx / W, y: geo.cy / H }, p2: { x: geo.x2 / W, y: geo.y2 / H } };
  return { p1: { x: geo.x1 / W, y: geo.y1 / H }, p2: { x: geo.x2 / W, y: geo.y2 / H } };
}

/** Mueve una de las guías (la otra se conserva tal cual estaba). */
export function moveGuide(g: Gradient, which: 'p1' | 'p2', pt: Pt, w: number, h: number): Gradient {
  const cur = gradientGuides(g, w, h);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const p = { x: round(pt.x), y: round(pt.y) };
  return { ...g, ...cur, [which]: p };
}

/** Vuelve a las guías automáticas (según ángulo o centro). */
export function resetGuides(g: Gradient): Gradient {
  const { p1: _p1, p2: _p2, ...rest } = g;
  return rest;
}

const lin = (c1: string, c2: string, angle = 90): Gradient => ({ kind: 'linear', c1, c2, angle, cx: 0.5, cy: 0.5 });
const rad = (c1: string, c2: string, cx = 0.5, cy = 0.5): Gradient => ({ kind: 'radial', c1, c2, angle: 0, cx, cy });

export const GRADIENT_PRESETS: { id: string; label: string; gradient: Gradient }[] = [
  { id: 'sky', label: 'Cielo', gradient: lin('#4aa8ff', '#d9f0ff') },
  { id: 'sunset', label: 'Atardecer', gradient: lin('#3b2a73', '#ff8a3d') },
  { id: 'fire', label: 'Fuego', gradient: lin('#ffd400', '#e53935') },
  { id: 'night', label: 'Noche', gradient: lin('#0b1030', '#3a3f8f') },
  { id: 'mint', label: 'Menta', gradient: lin('#b9f6ca', '#00897b', 45) },
  { id: 'steel', label: 'Acero', gradient: lin('#eceff1', '#78909c', 0) },
  { id: 'sun', label: 'Sol', gradient: rad('#fff9c4', '#ff9800') },
  { id: 'glow', label: 'Resplandor', gradient: rad('#ffffff', '#29b6f6') },
  { id: 'vignette', label: 'Viñeteado', gradient: rad('#ffffff', '#455a64') },
  { id: 'spot', label: 'Foco', gradient: rad('#fff3b0', '#2b2b33', 0.3, 0.3) },
  // Degradados de puntos (trama de medios tonos)
  { id: 'dots-fade', label: 'Puntos: desvanecer', gradient: { ...lin('#111111', '#111111', 90), dots: { ...DEFAULT_DOTS, size1: 11, size2: 1.5, gap1: 2, gap2: 12 } } },
  { id: 'dots-diag', label: 'Puntos: diagonal', gradient: { ...lin('#111111', '#111111', 45), dots: { ...DEFAULT_DOTS, size1: 10, size2: 1.5, gap1: 2, gap2: 11 } } },
  { id: 'dots-radial', label: 'Puntos: radial', gradient: { ...rad('#111111', '#111111'), dots: { ...DEFAULT_DOTS, size1: 1.5, size2: 11, gap1: 11, gap2: 2 } } },
  { id: 'dots-reflected', label: 'Puntos: reflejado', gradient: { kind: 'reflected', c1: '#111111', c2: '#111111', angle: 90, cx: 0.5, cy: 0.5, dots: { ...DEFAULT_DOTS, size1: 11, size2: 1.5, gap1: 2, gap2: 12 } } },
  { id: 'dots-diamond', label: 'Puntos: rombos', gradient: { ...lin('#5b2a86', '#5b2a86', 0), dots: { ...DEFAULT_DOTS, shape: 'diamond', size1: 12, size2: 2, gap1: 2, gap2: 12 } } },
  { id: 'dots-color', label: 'Puntos: color', gradient: { ...lin('#ff4081', '#ffd400', 90), dots: { ...DEFAULT_DOTS, size1: 10, size2: 4, gap1: 3, gap2: 9 } } },
  { id: 'dots-inverse', label: 'Puntos: fondo de color', gradient: { ...lin('#29b6f6', '#e1f5fe', 90), dots: { ...DEFAULT_DOTS, size1: 8, size2: 3, gap1: 3, gap2: 8, bg: true } } }
];
