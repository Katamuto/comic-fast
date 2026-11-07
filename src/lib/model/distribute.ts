/**
 * Distribuidor: reparte imágenes y cuadros de texto por la página en filas, en orden de lectura,
 * conservando la proporción de cada uno y aprovechando al máximo el espacio.
 *
 * Método: para cada número de filas k se parten los elementos (en orden) en k tandas con la suma
 * de proporciones lo más pareja posible (así las filas salen de alturas parecidas); cada fila se
 * escala para ocupar el ancho de la caja y, si el conjunto se pasa del alto, se reduce todo. Se
 * queda con la disposición cuyos elementos suman más área.
 */

export interface Item {
  id: string;
  w: number;
  h: number;
}
export interface Placed extends Item {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Parte `a` en k tandas contiguas minimizando la mayor suma (programación dinámica). Devuelve los índices de corte. */
export function linearPartition(a: number[], k: number): number[][] {
  const n = a.length;
  k = Math.min(k, n);
  const pre = [0];
  for (const v of a) pre.push(pre[pre.length - 1] + v);
  const INF = Infinity;
  const dp: number[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(INF));
  const cut: number[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(0));
  dp[0][0] = 0;
  for (let j = 1; j <= k; j++) {
    for (let i = j; i <= n; i++) {
      for (let p = j - 1; p < i; p++) {
        const cost = Math.max(dp[j - 1][p], pre[i] - pre[p]);
        if (cost < dp[j][i]) {
          dp[j][i] = cost;
          cut[j][i] = p;
        }
      }
    }
  }
  const rows: number[][] = [];
  let end = n;
  for (let j = k; j >= 1; j--) {
    const start = cut[j][end];
    rows.unshift(Array.from({ length: end - start }, (_, i) => start + i));
    end = start;
  }
  return rows;
}

function layoutRows(items: Item[], rows: number[][], box: Rect, gap: number): { placed: Placed[]; area: number } | null {
  const ratio = (i: number) => items[i].w / items[i].h;
  const heights = rows.map((r) => {
    const sum = r.reduce((s, i) => s + ratio(i), 0);
    return Math.max(1, (box.w - gap * (r.length - 1)) / sum);
  });
  const gaps = gap * (rows.length - 1);
  const total = heights.reduce((s, h) => s + h, 0);
  let s = 1;
  if (total + gaps > box.h) s = (box.h - gaps) / total;
  if (!(s > 0)) return null;
  const blockH = total * s + gaps;
  let y = box.y + (box.h - blockH) / 2;
  const placed: Placed[] = [];
  let area = 0;
  rows.forEach((r, ri) => {
    const hh = heights[ri] * s;
    const widths = r.map((i) => ratio(i) * hh);
    const rowW = widths.reduce((a, b) => a + b, 0) + gap * (r.length - 1);
    let x = box.x + (box.w - rowW) / 2;
    r.forEach((i, ci) => {
      placed.push({ id: items[i].id, x, y, w: widths[ci], h: hh });
      area += widths[ci] * hh;
      x += widths[ci] + gap;
    });
    y += hh + gap;
  });
  return { placed, area };
}

/** Coloca los elementos (en el orden dado) dentro de `box`, separados por `gap`. */
export function distribute(items: Item[], box: Rect, gap: number): Placed[] {
  const n = items.length;
  if (n === 0 || box.w <= 0 || box.h <= 0) return [];
  const valid = items.map((it) => ({ ...it, w: Math.max(1, it.w), h: Math.max(1, it.h) }));
  const ratios = valid.map((it) => it.w / it.h);
  let best: { placed: Placed[]; area: number } | null = null;
  const maxRows = Math.min(n, 12);
  for (let k = 1; k <= maxRows; k++) {
    const res = layoutRows(valid, linearPartition(ratios, k), box, gap);
    if (res && (!best || res.area > best.area + 1e-6)) best = res;
  }
  return best ? best.placed : [];
}

/** Orden de lectura: de arriba abajo en «bandas» de altura parecida y, dentro de cada banda, de izquierda a derecha. */
export function readingOrder<T extends { x: number; y: number; h: number }>(items: T[]): T[] {
  const byY = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: T[][] = [];
  for (const it of byY) {
    const row = rows.find((r) => Math.abs(r[0].y + r[0].h / 2 - (it.y + it.h / 2)) < Math.min(r[0].h, it.h) * 0.5);
    if (row) row.push(it);
    else rows.push([it]);
  }
  return rows.flatMap((r) => r.sort((a, b) => a.x - b.x));
}
