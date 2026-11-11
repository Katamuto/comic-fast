/** Cortar y combinar viñetas (lógica pura; la parte con historial está en store.svelte.ts). */
import type { PanelObj, Pt } from './types';
import { toLocal, toPage } from './geometry';
import { boolean, splitByLine, type BoolOp } from './polyBool';
import { ellipsePoints, panelWithPoints, pointsPx } from './panelGeometry';

/** Contorno de la viñeta en coordenadas de página (con su giro). */
export function panelPolyPage(o: PanelObj): Pt[] {
  const local: Pt[] =
    o.shape === 'ellipse'
      ? pointsPx(ellipsePoints(64), o.w, o.h)
      : o.shape === 'poly'
        ? pointsPx(o.points, o.w, o.h)
        : [
            { x: 0, y: 0 },
            { x: o.w, y: 0 },
            { x: o.w, y: o.h },
            { x: 0, y: o.h }
          ];
  return local.map((p) => toPage(o, { x: p.x - o.w / 2, y: p.y - o.h / 2 }));
}

/**
 * Viñeta nueva con el estilo de `base` y el contorno `polyPage` (coordenadas de página).
 * Conserva el giro de `base` y deja las imágenes de las capas en su sitio.
 */
export function panelLike(base: PanelObj, polyPage: Pt[]): Omit<PanelObj, 'id'> {
  const px = polyPage.map((p) => {
    const l = toLocal(base, p);
    return { x: l.x + base.w / 2, y: l.y + base.h / 2 };
  });
  const patch = panelWithPoints(base, px);
  const { id: _id, ...rest } = structuredClone(base);
  return { ...rest, ...patch, shape: 'poly', locked: undefined } as Omit<PanelObj, 'id'>;
}

export interface PanelOpResult {
  /** Contornos resultantes (página). */
  polys: Pt[][];
  holes: number;
  /** El resultado no cambió nada (p. ej. unir viñetas que no se tocan). */
  unchanged: boolean;
}

/**
 * Combina viñetas en el orden dado (la primera es la base: la de más abajo).
 * 'union' y 'intersect' encadenan todas; 'difference' resta las demás de la primera.
 */
export function combinePanels(op: BoolOp, panels: PanelObj[]): PanelOpResult {
  let acc: Pt[][] = [panelPolyPage(panels[0])];
  let holes = 0;
  let changed = false;
  for (const next of panels.slice(1)) {
    const np = panelPolyPage(next);
    const out: Pt[][] = [];
    for (const poly of acc) {
      const r = boolean(op, poly, np);
      holes += r.holes;
      if (op === 'union' && r.polys.length > 1) {
        // sin solape ni contacto: se conservan tal cual
        out.push(poly);
        out.push(np);
        continue;
      }
      if (op === 'union' || r.polys.length > 0 || op === 'difference') changed = true;
      out.push(...r.polys);
    }
    acc = op === 'union' ? dedupe(out) : out;
  }
  return { polys: acc, holes, unchanged: !changed };
}

function dedupe(polys: Pt[][]): Pt[][] {
  const seen = new Set<string>();
  return polys.filter((p) => {
    const k = p.map((q) => `${Math.round(q.x)},${Math.round(q.y)}`).sort().join('|');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Líneas de corte (en coordenadas de página) que dividen la viñeta en `cols` × `rows` partes iguales de su caja. */
export function gridCuts(o: PanelObj, cols: number, rows: number): [Pt, Pt][] {
  const cuts: [Pt, Pt][] = [];
  const hw = o.w / 2;
  const hh = o.h / 2;
  for (let i = 1; i < cols; i++) {
    const x = -hw + (o.w * i) / cols;
    cuts.push([toPage(o, { x, y: -hh - 10 }), toPage(o, { x, y: hh + 10 })]);
  }
  for (let j = 1; j < rows; j++) {
    const y = -hh + (o.h * j) / rows;
    cuts.push([toPage(o, { x: -hw - 10, y }), toPage(o, { x: hw + 10, y })]);
  }
  return cuts;
}

/** Corta una lista de contornos con una recta; las piezas que no se parten se conservan. */
export function cutPolys(polys: Pt[][], p: Pt, q: Pt, gap: number): Pt[][] {
  const out: Pt[][] = [];
  for (const poly of polys) {
    const pieces = splitByLine(poly, p, q, gap);
    if (pieces.length >= 2) out.push(...pieces);
    else out.push(poly);
  }
  return out;
}
