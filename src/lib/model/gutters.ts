/**
 * Canales (separaciones) entre viñetas rectangulares. Se detectan los pares de viñetas que se
 * miran a través de un hueco estrecho y se agrupan los que comparten la misma línea, de modo
 * que arrastrar el canal mueva a la vez el borde de todas las viñetas de ambos lados, y se
 * puede igualar el hueco de todos al canal estándar.
 */
export interface RectLike {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Gutter {
  /** 'v': canal vertical (viñetas a izquierda y derecha); 'h': horizontal (arriba y abajo). */
  axis: 'v' | 'h';
  /** Viñetas del lado izquierdo/superior y del derecho/inferior. */
  a: string[];
  b: string[];
  /** Posición del centro del hueco en el eje del movimiento y su anchura. */
  pos: number;
  gap: number;
  /** Tramo del canal en el otro eje. */
  from: number;
  to: number;
}

export interface GutterOpts {
  /** Un hueco mayor que esto no se considera canal. */
  maxGap: number;
  /** Solape mínimo entre las dos viñetas (en el eje del canal) para contar como vecinas. */
  minOverlap?: number;
  /** Tolerancia para decir que dos bordes están en la misma línea. */
  tol?: number;
}

export const MIN_PANEL = 20;

type Axis = 'v' | 'h';

const lo = (r: RectLike, ax: Axis) => (ax === 'v' ? r.x : r.y);
const len = (r: RectLike, ax: Axis) => (ax === 'v' ? r.w : r.h);
const olo = (r: RectLike, ax: Axis) => (ax === 'v' ? r.y : r.x);
const olen = (r: RectLike, ax: Axis) => (ax === 'v' ? r.h : r.w);

/** Detecta los canales de un conjunto de viñetas rectangulares. */
export function findGutters(rects: RectLike[], o: GutterOpts): Gutter[] {
  const minOv = o.minOverlap ?? 12;
  const tol = o.tol ?? 1.5;
  const out: Gutter[] = [];
  for (const axis of ['v', 'h'] as const) {
    // pares vecinos: A termina antes de que empiece B, con hueco ≤ maxGap, y se solapan en el otro eje
    type Pair = { a: RectLike; b: RectLike; end: number; start: number };
    const pairs: Pair[] = [];
    for (const a of rects) {
      for (const b of rects) {
        if (a === b) continue;
        const end = lo(a, axis) + len(a, axis);
        const start = lo(b, axis);
        const gap = start - end;
        if (gap < -tol || gap > o.maxGap) continue;
        const ov = Math.min(olo(a, axis) + olen(a, axis), olo(b, axis) + olen(b, axis)) - Math.max(olo(a, axis), olo(b, axis));
        if (ov < minOv) continue;
        pairs.push({ a, b, end, start });
      }
    }
    // agrupa por (borde de A, borde de B)
    const groups: Pair[][] = [];
    for (const p of pairs) {
      const g = groups.find((q) => Math.abs(q[0].end - p.end) <= tol && Math.abs(q[0].start - p.start) <= tol);
      if (g) g.push(p);
      else groups.push([p]);
    }
    for (const g of groups) {
      const a = [...new Set(g.map((p) => p.a.id))];
      const b = [...new Set(g.map((p) => p.b.id))];
      // un panel en ambos lados del mismo canal no tiene sentido (se descarta)
      if (a.some((id) => b.includes(id))) continue;
      const rs = (ids: string[]) => ids.map((id) => rects.find((r) => r.id === id)!);
      const all = [...rs(a), ...rs(b)];
      out.push({
        axis,
        a,
        b,
        gap: g[0].start - g[0].end,
        pos: (g[0].start + g[0].end) / 2,
        from: Math.min(...all.map((r) => olo(r, axis))),
        to: Math.max(...all.map((r) => olo(r, axis) + olen(r, axis)))
      });
    }
  }
  return out;
}

export interface BoxPatch {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Límites del desplazamiento del canal para que ninguna viñeta baje de MIN_PANEL. */
export function gutterRange(g: Gutter, rects: RectLike[], min = MIN_PANEL): { lo: number; hi: number } {
  const get = (id: string) => rects.find((r) => r.id === id)!;
  // A crece con d > 0 y se encoge con d < 0 (d ≥ −(largo − mín)); B al revés.
  const lowest = -Math.min(...g.a.map((id) => len(get(id), g.axis) - min));
  const highest = Math.min(...g.b.map((id) => len(get(id), g.axis) - min));
  return { lo: lowest, hi: highest };
}

/**
 * Mueve el canal `d` unidades: los bordes finales de las viñetas de A y los iniciales de las de B
 * se desplazan juntos (el hueco no cambia). Devuelve las cajas nuevas por id.
 */
export function moveGutter(g: Gutter, rects: RectLike[], d: number, min = MIN_PANEL): Record<string, BoxPatch> {
  const { lo: l, hi: h } = gutterRange(g, rects, min);
  const dd = Math.min(h, Math.max(l, d));
  const out: Record<string, BoxPatch> = {};
  const get = (id: string) => rects.find((r) => r.id === id)!;
  for (const id of g.a) {
    const r = get(id);
    out[id] = g.axis === 'v' ? { x: r.x, y: r.y, w: r.w + dd, h: r.h } : { x: r.x, y: r.y, w: r.w, h: r.h + dd };
  }
  for (const id of g.b) {
    const r = get(id);
    out[id] = g.axis === 'v' ? { x: r.x + dd, y: r.y, w: r.w - dd, h: r.h } : { x: r.x, y: r.y + dd, w: r.w, h: r.h - dd };
  }
  return out;
}

/**
 * Iguala todos los canales detectados a `gutter`, repartiendo la diferencia por igual entre los
 * dos lados. Las viñetas que no cambian no aparecen en el resultado.
 */
export function normalizeGutters(rects: RectLike[], gutter: number, o: GutterOpts, min = MIN_PANEL): Record<string, BoxPatch> {
  const edges: Record<string, { l: number; r: number; t: number; b: number }> = {};
  const e = (id: string) => (edges[id] ??= { l: 0, r: 0, t: 0, b: 0 });
  for (const g of findGutters(rects, o)) {
    const diff = g.gap - gutter; // >0: hay que acercar
    if (Math.abs(diff) < 0.01) continue;
    for (const id of g.a) {
      if (g.axis === 'v') e(id).r += diff / 2; // el borde final de A avanza diff/2 hacia B
      else e(id).b += diff / 2;
    }
    for (const id of g.b) {
      if (g.axis === 'v') e(id).l += -diff / 2; // el borde inicial de B retrocede diff/2 hacia A
      else e(id).t += -diff / 2;
    }
  }
  const out: Record<string, BoxPatch> = {};
  for (const [id, d] of Object.entries(edges)) {
    const r = rects.find((q) => q.id === id)!;
    const x = r.x + d.l;
    const y = r.y + d.t;
    const w = r.w - d.l + d.r;
    const h = r.h - d.t + d.b;
    if (w < min || h < min) continue;
    if (x === r.x && y === r.y && w === r.w && h === r.h) continue;
    out[id] = { x, y, w, h };
  }
  return out;
}
