/**
 * Formas de globo calculadas como polígonos (listas de puntos) y utilidades para
 * pegarles una cola. Lógica pura: sin DOM, se prueba con node.
 * Los polígonos se recorren en sentido horario en pantalla (ángulo creciente, y hacia abajo).
 */

export interface Pt {
  x: number;
  y: number;
}

export type ShapeKind = 'rounded' | 'scallop' | 'blob' | 'angular' | 'impact' | 'serrated';

export interface ShapeOpts {
  /** Largo de los picos de sierra, como fracción del lado menor (0.03…0.3). */
  toothLen?: number;
  /** Ancho de los picos, como fracción del lado menor (0.04…0.4). */
  toothWidth?: number;
}

/** Número pseudoaleatorio estable (0…1): el mismo globo siempre sale igual. */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const TAU = Math.PI * 2;
const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Elipse como polígono. */
export function ellipsePoly(cx: number, cy: number, rx: number, ry: number, n = 96): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return out;
}

/** Rectángulo de esquinas muy redondeadas (más «cuadrado» que una elipse). */
export function roundedPoly(w: number, h: number, inset: number): Pt[] {
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  const r = clampN(Math.min(x1 - x0, y1 - y0) * 0.3, 1, 1e9);
  const out: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 14; i++) {
      const a = a0 + (i / 14) * (Math.PI / 2);
      out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  };
  corner(x1 - r, y0 + r, -Math.PI / 2); // arriba-derecha
  corner(x1 - r, y1 - r, 0); // abajo-derecha
  corner(x0 + r, y1 - r, Math.PI / 2); // abajo-izquierda
  corner(x0 + r, y0 + r, Math.PI); // arriba-izquierda
  return out;
}

/** Nube suave de cómic antiguo: muchos arcos poco profundos con cúspides marcadas. */
export function scallopPoly(cx: number, cy: number, rx: number, ry: number, steps = 10): Pt[] {
  const perim = Math.PI * (rx + ry);
  const bumps = Math.round(clampN(perim / clampN(Math.min(rx, ry) * 0.62, 26, 64), 8, 26));
  // los arcos abomban hacia fuera (0.2 de la cuerda): se encoge la base para no salirse de la caja
  const pad = (0.2 * perim) / bumps;
  rx = Math.max(1, rx - pad);
  ry = Math.max(1, ry - pad);
  const base: Pt[] = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * TAU;
    base.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  const out: Pt[] = [];
  for (let i = 0; i < bumps; i++) {
    const p = base[i];
    const q = base[(i + 1) % bumps];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const chord = Math.hypot(dx, dy);
    // normal hacia fuera: del centro al punto medio
    let nx = dy;
    let ny = -dx;
    const mx = (p.x + q.x) / 2 - cx;
    const my = (p.y + q.y) / 2 - cy;
    if (nx * mx + ny * my < 0) {
      nx = -nx;
      ny = -ny;
    }
    const nl = Math.hypot(nx, ny) || 1;
    const bulge = chord * 0.2;
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      out.push({
        x: p.x + dx * u + (nx / nl) * bulge * Math.sin(Math.PI * u),
        y: p.y + dy * u + (ny / nl) * bulge * Math.sin(Math.PI * u)
      });
    }
  }
  return out;
}

/** Radio normalizado (≤ 1) de un óvalo «orgánico»: casi circular, con ondulaciones suaves. */
function blobRadius(a: number, seed: number): number {
  const p2 = hash01(seed + 1) * TAU;
  const p3 = hash01(seed + 2) * TAU;
  const p5 = hash01(seed + 3) * TAU;
  return 1 + 0.06 * Math.cos(2 * a + p2) + 0.045 * Math.cos(3 * a + p3) + 0.03 * Math.cos(5 * a + p5);
}
const BLOB_MAX = 1.135;

/** Óvalo irregular, sin esquinas. */
export function blobPoly(cx: number, cy: number, rx: number, ry: number, seed = 3): Pt[] {
  const n = 120;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = blobRadius(a, seed) / BLOB_MAX;
    out.push({ x: cx + rx * k * Math.cos(a), y: cy + ry * k * Math.sin(a) });
  }
  return out;
}

/** Como el óvalo irregular, pero con algunas esquinas (hundimientos puntiagudos). */
export function angularPoly(cx: number, cy: number, rx: number, ry: number, seed = 7): Pt[] {
  const n = 144;
  const corners = 5 + Math.floor(hash01(seed) * 3);
  const dips: { a: number; wid: number; depth: number }[] = [];
  for (let i = 0; i < corners; i++) {
    dips.push({
      a: ((i + hash01(seed + 10 + i) * 0.6) / corners) * TAU,
      wid: 0.28 + hash01(seed + 20 + i) * 0.22,
      depth: 0.07 + hash01(seed + 30 + i) * 0.07
    });
  }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let k = (0.9 * blobRadius(a, seed)) / BLOB_MAX + 0.1;
    for (const d of dips) {
      let da = Math.abs(a - d.a);
      da = Math.min(da, TAU - da);
      if (da < d.wid) k -= d.depth * (1 - da / d.wid);
    }
    out.push({ x: cx + rx * k * Math.cos(a), y: cy + ry * k * Math.sin(a) });
  }
  return out;
}

/** Explosión de impacto: puntas irregulares unidas por arcos cóncavos. */
export function impactPoly(cx: number, cy: number, rx: number, ry: number, seed = 11): Pt[] {
  const spikes = 12;
  const tips: Pt[] = [];
  const valleys: Pt[] = [];
  for (let i = 0; i < spikes; i++) {
    const a0 = ((i + (hash01(seed + i) - 0.5) * 0.4) / spikes) * TAU - Math.PI / 2;
    const k = 0.8 + hash01(seed + 40 + i) * 0.2;
    tips.push({ x: cx + rx * k * Math.cos(a0), y: cy + ry * k * Math.sin(a0) });
    const a1 = (((i + 0.5) + (hash01(seed + 80 + i) - 0.5) * 0.4) / spikes) * TAU - Math.PI / 2;
    const kv = 0.45 + hash01(seed + 120 + i) * 0.2;
    valleys.push({ x: cx + rx * kv * Math.cos(a1), y: cy + ry * kv * Math.sin(a1) });
  }
  const out: Pt[] = [];
  const steps = 8;
  for (let i = 0; i < spikes; i++) {
    const p = tips[i];
    const q = tips[(i + 1) % spikes];
    const v = valleys[i];
    // Bézier cuadrática que pasa por el valle: el control se aleja el doble del punto medio.
    const c = { x: 2 * v.x - (p.x + q.x) / 2, y: 2 * v.y - (p.y + q.y) / 2 };
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      const a = (1 - u) * (1 - u);
      const m = 2 * (1 - u) * u;
      const e = u * u;
      out.push({ x: a * p.x + m * c.x + e * q.x, y: a * p.y + m * c.y + e * q.y });
    }
  }
  return out;
}

/** Radios de la base (valles) de los dientes de sierra: dejan sitio a los picos dentro de la caja. */
export function serratedBase(w: number, h: number, inset: number, o: ShapeOpts = {}): { rx: number; ry: number; len: number } {
  const len = clampN(o.toothLen ?? 0.09, 0.03, 0.3) * Math.min(w, h);
  return { rx: Math.max(1, w / 2 - inset - len * 1.3), ry: Math.max(1, h / 2 - inset - len * 1.3), len };
}

/** Elipse con picos de sierra de ancho y largo variables (siempre iguales para el mismo globo). */
export function serratedPoly(w: number, h: number, inset: number, o: ShapeOpts = {}, seed = 5): Pt[] {
  const { rx, ry, len } = serratedBase(w, h, inset, o);
  const cx = w / 2;
  const cy = h / 2;
  const wid = clampN(o.toothWidth ?? 0.1, 0.04, 0.4) * Math.min(w, h);
  // longitud de arco acumulada de la elipse base
  const N = 720;
  const cum = [0];
  for (let i = 1; i <= N; i++) {
    const a0 = ((i - 1) / N) * TAU;
    const a1 = (i / N) * TAU;
    cum.push(cum[i - 1] + Math.hypot(rx * (Math.cos(a1) - Math.cos(a0)), ry * (Math.sin(a1) - Math.sin(a0))));
  }
  const perim = cum[N];
  const teeth = Math.max(6, Math.round(perim / wid));
  const raw: number[] = [];
  for (let i = 0; i < teeth; i++) raw.push(0.65 + 0.7 * hash01(seed + i * 3));
  const sum = raw.reduce((a, b) => a + b, 0);
  const angleAt = (sArc: number) => {
    let lo = 0;
    let hi = N;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] <= sArc) lo = m;
      else hi = m;
    }
    const u = (sArc - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
    return ((lo + u) / N) * TAU;
  };
  const pt = (a: number, out: number): Pt => {
    // normal de la elipse en el ángulo paramétrico a
    const nx = Math.cos(a) / rx;
    const ny = Math.sin(a) / ry;
    const nl = Math.hypot(nx, ny) || 1;
    return { x: cx + rx * Math.cos(a) + (nx / nl) * out, y: cy + ry * Math.sin(a) + (ny / nl) * out };
  };
  const out: Pt[] = [];
  let sArc = 0;
  for (let i = 0; i < teeth; i++) {
    const width = (raw[i] / sum) * perim;
    const lift = len * (0.55 + 0.9 * hash01(seed + i * 3 + 1));
    const lean = 0.2 + 0.6 * hash01(seed + i * 3 + 2); // dónde cae la punta dentro del diente (sierra asimétrica)
    out.push(pt(angleAt(sArc), 0));
    out.push(pt(angleAt(sArc + width * lean), Math.min(lift, len * 1.3)));
    sArc += width;
  }
  return out;
}

export function shapePoly(kind: ShapeKind, w: number, h: number, inset: number, opts: ShapeOpts = {}): Pt[] {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - inset;
  const ry = h / 2 - inset;
  switch (kind) {
    case 'rounded':
      return roundedPoly(w, h, inset);
    case 'scallop':
      return scallopPoly(cx, cy, rx, ry);
    case 'blob':
      return blobPoly(cx, cy, rx, ry);
    case 'angular':
      return angularPoly(cx, cy, rx, ry);
    case 'impact':
      return impactPoly(cx, cy, rx, ry);
    case 'serrated':
      return serratedPoly(w, h, inset, opts);
  }
}

/** Trazado SVG de un polígono cerrado. */
export function polyPath(pts: Pt[]): string {
  const f = (n: number) => Math.round(n * 100) / 100;
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${f(p.x)} ${f(p.y)}`).join(' ') + ' Z';
}

export function pointInPoly(p: Pt, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Cota inferior y superior del polígono en y. */
export function polyBounds(pts: Pt[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

/** Extremos izquierdo y derecho del interior a la altura y (null si y queda fuera). */
export function spanAt(pts: Pt[], y: number): { l: number; r: number } | null {
  let l = Infinity;
  let r = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (a.y === b.y) {
      if (a.y === y) {
        l = Math.min(l, a.x, b.x);
        r = Math.max(r, a.x, b.x);
      }
      continue;
    }
    if (y < Math.min(a.y, b.y) || y > Math.max(a.y, b.y)) continue;
    const x = a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
    l = Math.min(l, x);
    r = Math.max(r, x);
  }
  return l <= r ? { l, r } : null;
}

/** Longitud acumulada: cum[i] = distancia del punto 0 al punto i; el último valor es el perímetro. */
function cumulative(pts: Pt[]): number[] {
  const cum = [0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    cum.push(cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return cum;
}

function pointAt(pts: Pt[], cum: number[], s: number): Pt {
  const total = cum[cum.length - 1];
  s = ((s % total) + total) % total;
  let i = 0;
  while (i < pts.length - 1 && cum[i + 1] < s) i++;
  const a = pts[i];
  const b = pts[(i + 1) % pts.length];
  const seg = cum[i + 1] - cum[i] || 1;
  const u = (s - cum[i]) / seg;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** Primer cruce del rayo (origen o, dirección d) con el polígono: distancia (en múltiplos de d) y arco. */
export function rayHit(pts: Pt[], o: Pt, d: Pt): { t: number; s: number } | null {
  const cum = cumulative(pts);
  let best: { t: number; s: number } | null = null;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((a.x - o.x) * ey - (a.y - o.y) * ex) / den;
    const u = ((a.x - o.x) * d.y - (a.y - o.y) * d.x) / den;
    if (t > 1e-6 && u >= 0 && u <= 1 && (!best || t < best.t)) best = { t, s: cum[i] + u * (cum[i + 1] - cum[i]) };
  }
  return best;
}

export interface PolyTail {
  /** Puntos del cuerpo recorridos desde la base «p2» hasta la base «p1» (por el lado largo). */
  body: Pt[];
  p1: Pt;
  p2: Pt;
}

/**
 * Recorta de un polígono el tramo de ancho 2·half centrado en el arco s: devuelve los
 * puntos del lado largo y los extremos de la base de la cola.
 */
export function cutPolygon(pts: Pt[], s: number, half: number): PolyTail {
  const cum = cumulative(pts);
  const total = cum[cum.length - 1];
  half = clampN(half, 1, total * 0.2);
  const sa = s + half; // p2, inicio del lado largo
  const sb = s - half + total; // p1, final del lado largo
  const p2 = pointAt(pts, cum, sa);
  const p1 = pointAt(pts, cum, sb);
  const body: Pt[] = [p2];
  const start = ((sa % total) + total) % total;
  // puntos cuyo arco queda estrictamente entre sa y sb (dando la vuelta)
  const rel = (v: number) => (((v - start) % total) + total) % total;
  const span = rel(sb);
  const inner: { r: number; p: Pt }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const r = rel(cum[i]);
    if (r > 1e-6 && r < span - 1e-6) inner.push({ r, p: pts[i] });
  }
  inner.sort((a, b) => a.r - b.r);
  for (const q of inner) body.push(q.p);
  body.push(p1);
  return { body, p1, p2 };
}

/** Ángulo paramétrico (sobre la elipse rx×ry centrada en 0,0) donde el rayo origen→punta sale de la elipse. */
export function ellipseExitAngle(ox: number, oy: number, tx: number, ty: number, rx: number, ry: number): number {
  const dx = tx - ox;
  const dy = ty - oy;
  const A = (dx / rx) ** 2 + (dy / ry) ** 2;
  if (A < 1e-12) return Math.atan2(ty / ry, tx / rx);
  const B = 2 * ((ox * dx) / (rx * rx) + (oy * dy) / (ry * ry));
  const C = (ox / rx) ** 2 + (oy / ry) ** 2 - 1;
  const disc = Math.max(0, B * B - 4 * A * C);
  const tau = (-B + Math.sqrt(disc)) / (2 * A);
  return Math.atan2((oy + tau * dy) / ry, (ox + tau * dx) / rx);
}
