import { describe, expect, it } from 'vitest';
import { distribute, linearPartition, readingOrder } from './distribute';

const box = { x: 0, y: 0, w: 1000, h: 1400 };
const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;

describe('distribute', () => {
  it('un solo elemento se centra y llena lo que puede conservando la proporción', () => {
    const [p] = distribute([{ id: 'a', w: 200, h: 100 }], box, 20);
    expect(p.w / p.h).toBeCloseTo(2);
    expect(p.w).toBeCloseTo(1000);
    expect(p.y).toBeCloseTo((1400 - 500) / 2);
  });
  it('mantiene el orden, no se superpone y cabe en la caja', () => {
    const items = [
      { id: 'a', w: 400, h: 300 },
      { id: 'b', w: 300, h: 400 },
      { id: 'c', w: 500, h: 500 },
      { id: 'd', w: 200, h: 100 },
      { id: 'e', w: 100, h: 300 }
    ];
    const out = distribute(items, box, 16);
    expect(out.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    for (const p of out) {
      expect(p.x).toBeGreaterThanOrEqual(-0.01);
      expect(p.y).toBeGreaterThanOrEqual(-0.01);
      expect(p.x + p.w).toBeLessThanOrEqual(1000.01);
      expect(p.y + p.h).toBeLessThanOrEqual(1400.01);
    }
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) expect(overlap(out[i], out[j])).toBe(false);
  });
  it('conserva la proporción de cada elemento', () => {
    const out = distribute([{ id: 'a', w: 300, h: 200 }, { id: 'b', w: 100, h: 400 }], box, 10);
    expect(out[0].w / out[0].h).toBeCloseTo(1.5);
    expect(out[1].w / out[1].h).toBeCloseTo(0.25);
  });
  it('en una caja ancha pone dos cuadrados en una fila', () => {
    const out = distribute([{ id: 'a', w: 100, h: 100 }, { id: 'b', w: 100, h: 100 }], { x: 0, y: 0, w: 1000, h: 400 }, 0);
    expect(out[0].y).toBeCloseTo(out[1].y);
  });
  it('lista vacía', () => {
    expect(distribute([], box, 10)).toEqual([]);
  });
});

describe('linearPartition y readingOrder', () => {
  it('equilibra las sumas', () => {
    expect(linearPartition([1, 1, 1, 1, 4], 2)).toEqual([[0, 1, 2, 3], [4]]);
  });
  it('ordena por filas y luego por x', () => {
    const o = readingOrder([
      { id: 'c', x: 0, y: 300, h: 100 },
      { id: 'b', x: 200, y: 5, h: 100 },
      { id: 'a', x: 0, y: 0, h: 100 }
    ]);
    expect(o.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});
