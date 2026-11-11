/**
 * Operaciones booleanas entre polígonos simples (sin huecos): unión, intersección, diferencia.
 * Se parte cada arista por sus cruces con el otro polígono, se clasifica cada trozo (dentro,
 * fuera o sobre el borde del otro) y se vuelven a unir los trozos elegidos en anillos.
 * Admite aristas coincidentes (viñetas pegadas). Lógica pura, con pruebas.
 *
 * Los anillos del resultado con orientación contraria (huecos) se devuelven aparte: las
 * viñetas no pueden tener agujeros.
 */
import type { Pt } from './types';

export type BoolOp = 'union' | 'intersect' | 'difference';

export interface BoolResult {
  /** Polígonos exteriores del resultado. */
  polys: Pt[][];
  /** Cuántos huecos habría (no representables). */
  holes: number;
}

const EPS = 1e-7;

/** Área con signo (positiva si el recorrido es horario en pantalla, con y hacia abajo). */
export function signedArea(p: Pt[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i].x * q.y - q.x * p[i].y;
  }
  return a / 2;
}

/** Quita vértices repetidos y colineales. */
export function clean(p: Pt[], eps = 1e-6): Pt[] {
  let pts = p.filter((q, i) => Math.hypot(q.x - p[(i + p.length - 1) % p.length].x, q.y - p[(i + p.length - 1) % p.length].y) > eps);
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length];
      const b = pts[i];
      const c = pts[(i + 1) % pts.length];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      const scale = Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(c.x - b.x, c.y - b.y);
      if (Math.abs(cross) <= 1e-9 * Math.max(1, scale)) {
        pts = pts.filter((_, k) => k !== i);
        changed = true;
        break;
      }
    }
  }
  return pts;
}

export function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/** Parámetros t (0..1) de `a→b` donde cruza o toca las aristas de `poly`. */
function splitParams(a: Pt, b: Pt, poly: Pt[]): number[] {
  const ts: number[] = [];
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const len = Math.hypot(rx, ry) || 1;
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i];
    const d = poly[(i + 1) % poly.length];
    const sx = d.x - c.x;
    const sy = d.y - c.y;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) > 1e-12) {
      const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
      const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
      if (t > -EPS && t < 1 + EPS && u > -EPS && u < 1 + EPS) ts.push(Math.min(1, Math.max(0, t)));
    } else {
      // paralelas: si son colineales, los extremos del otro segmento parten este
      for (const q of [c, d]) {
        if (distToSeg(q, a, b) < 1e-6) {
          const t = ((q.x - a.x) * rx + (q.y - a.y) * ry) / (len * len);
          if (t > EPS && t < 1 - EPS) ts.push(t);
        }
      }
    }
  }
  return ts;
}

interface Edge {
  a: Pt;
  b: Pt;
}

function splitEdges(poly: Pt[], other: Pt[]): Edge[] {
  const out: Edge[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ts = [0, 1, ...splitParams(a, b, other)].sort((x, y) => x - y);
    for (let k = 0; k < ts.length - 1; k++) {
      if (ts[k + 1] - ts[k] < 1e-9) continue;
      const p = { x: a.x + (b.x - a.x) * ts[k], y: a.y + (b.y - a.y) * ts[k] };
      const q = { x: a.x + (b.x - a.x) * ts[k + 1], y: a.y + (b.y - a.y) * ts[k + 1] };
      if (Math.hypot(q.x - p.x, q.y - p.y) > 1e-7) out.push({ a: p, b: q });
    }
  }
  return out;
}

type Where = 'in' | 'out' | 'same' | 'opp';

/** Dónde queda una arista respecto al otro polígono ('same'/'opp': sobre su borde, mismo/contrario sentido). */
function classify(e: Edge, other: Pt[]): Where {
  const mid = { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 };
  for (let i = 0; i < other.length; i++) {
    const c = other[i];
    const d = other[(i + 1) % other.length];
    if (distToSeg(mid, c, d) < 1e-6) {
      const dot = (e.b.x - e.a.x) * (d.x - c.x) + (e.b.y - e.a.y) * (d.y - c.y);
      return dot > 0 ? 'same' : 'opp';
    }
  }
  return pointInPoly(mid, other) ? 'in' : 'out';
}

const key = (p: Pt) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)}`;

function stitch(edges: Edge[]): Pt[][] {
  const byStart = new Map<string, Edge[]>();
  for (const e of edges) {
    const k = key(e.a);
    byStart.set(k, [...(byStart.get(k) ?? []), e]);
  }
  const used = new Set<Edge>();
  const rings: Pt[][] = [];
  for (const first of edges) {
    if (used.has(first)) continue;
    const ring: Pt[] = [];
    let cur: Edge | undefined = first;
    let guard = 0;
    while (cur && !used.has(cur) && guard++ < 100000) {
      used.add(cur);
      ring.push(cur.a);
      const cands: Edge[] = (byStart.get(key(cur.b)) ?? []).filter((c) => !used.has(c) || c === first);
      if (cands.length === 0) break;
      if (cands.length === 1) {
        cur = cands[0];
      } else {
        // varias salidas (vértice compartido): la que más gira hacia la izquierda mantiene el mismo recinto
        const ang = (e: Edge) => Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x);
        const inc = ang(cur);
        const score = (c: Edge) => {
          let d = ang(c) - inc;
          while (d <= -Math.PI) d += 2 * Math.PI;
          while (d > Math.PI) d -= 2 * Math.PI;
          return d;
        };
        cur = cands.sort((p, q) => score(p) - score(q))[0];
      }
      if (cur === first) break;
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

/** Orienta como horario en pantalla (área > 0). */
const orient = (p: Pt[]): Pt[] => (signedArea(p) < 0 ? [...p].reverse() : [...p]);

/** Operación booleana A (op) B entre dos polígonos simples. */
export function boolean(op: BoolOp, A: Pt[], B: Pt[]): BoolResult {
  const a = orient(clean(A));
  const b = orient(clean(B));
  const ea = splitEdges(a, b);
  const eb = splitEdges(b, a);
  const out: Edge[] = [];
  const rev = (e: Edge): Edge => ({ a: e.b, b: e.a });
  for (const e of ea) {
    const w = classify(e, b);
    if (op === 'union' && (w === 'out' || w === 'same')) out.push(e);
    else if (op === 'intersect' && (w === 'in' || w === 'same')) out.push(e);
    else if (op === 'difference' && (w === 'out' || w === 'opp')) out.push(e);
  }
  for (const e of eb) {
    const w = classify(e, a);
    if (op === 'union' && w === 'out') out.push(e);
    else if (op === 'intersect' && w === 'in') out.push(e);
    else if (op === 'difference' && w === 'in') out.push(rev(e));
  }
  const rings = stitch(out).map((r) => clean(r)).filter((r) => r.length >= 3 && Math.abs(signedArea(r)) > 1e-6);
  const polys: Pt[][] = [];
  let holes = 0;
  for (const r of rings) {
    if (signedArea(r) > 0) polys.push(r);
    else holes++;
  }
  return { polys, holes };
}

/** Plano lateral grande: el semiplano a la izquierda (lado = 1) o derecha (−1) de la recta p→q, desplazado `shift`. */
export function halfPlane(p: Pt, q: Pt, side: 1 | -1, shift: number, reach = 1e5): Pt[] {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * side; // normal hacia el lado elegido
  const ny = ux * side;
  const o = { x: p.x + nx * shift, y: p.y + ny * shift };
  return [
    { x: o.x - ux * reach, y: o.y - uy * reach },
    { x: o.x + ux * reach, y: o.y + uy * reach },
    { x: o.x + ux * reach + nx * reach, y: o.y + uy * reach + ny * reach },
    { x: o.x - ux * reach + nx * reach, y: o.y - uy * reach + ny * reach }
  ];
}

/** Corta un polígono con la recta p→q dejando una separación `gap` entre las dos mitades. */
export function splitByLine(poly: Pt[], p: Pt, q: Pt, gap = 0): Pt[][] {
  const out: Pt[][] = [];
  for (const side of [1, -1] as const) {
    const r = boolean('intersect', poly, halfPlane(p, q, side, gap / 2));
    out.push(...r.polys);
  }
  return out;
}
