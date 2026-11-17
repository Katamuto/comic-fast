import { describe, expect, it } from 'vitest';
import { findGutters, gutterRange, moveGutter, normalizeGutters, type RectLike } from './gutters';

const r = (id: string, x: number, y: number, w: number, h: number): RectLike => ({ id, x, y, w, h });
const O = { maxGap: 60 };

// A | B arriba (hueco 20 en x=100..120); C | D abajo con el canal en la misma línea; todo separado 20 en vertical
const grid = [r('A', 0, 0, 100, 100), r('B', 120, 0, 80, 100), r('C', 0, 120, 100, 80), r('D', 120, 120, 80, 80)];

describe('findGutters', () => {
  it('agrupa los canales alineados en uno solo por eje', () => {
    const gs = findGutters(grid, O);
    const v = gs.filter((g) => g.axis === 'v');
    const h = gs.filter((g) => g.axis === 'h');
    expect(v).toHaveLength(1);
    expect(v[0].a.sort()).toEqual(['A', 'C']);
    expect(v[0].b.sort()).toEqual(['B', 'D']);
    expect(v[0].gap).toBe(20);
    expect(v[0].pos).toBe(110);
    expect(v[0].from).toBe(0);
    expect(v[0].to).toBe(200);
    // los horizontales: A/C y B/D comparten línea (y=100..120) → un grupo
    expect(h).toHaveLength(1);
    expect(h[0].a.sort()).toEqual(['A', 'B']);
  });
  it('no mezcla canales desalineados', () => {
    const rs = [r('A', 0, 0, 100, 50), r('B', 120, 0, 80, 50), r('C', 0, 70, 90, 50), r('D', 110, 70, 90, 50)];
    expect(findGutters(rs, O).filter((g) => g.axis === 'v')).toHaveLength(2);
  });
  it('ignora huecos grandes y viñetas que no se solapan', () => {
    expect(findGutters([r('A', 0, 0, 50, 50), r('B', 500, 0, 50, 50)], O)).toHaveLength(0);
    expect(findGutters([r('A', 0, 0, 50, 50), r('B', 60, 200, 50, 50)], O)).toHaveLength(0);
  });
});

describe('moveGutter', () => {
  const g = findGutters(grid, O).find((x) => x.axis === 'v')!;
  it('mueve juntos los bordes y conserva el hueco', () => {
    const m = moveGutter(g, grid, 30);
    expect(m.A).toEqual({ x: 0, y: 0, w: 130, h: 100 });
    expect(m.C.w).toBe(130);
    expect(m.B).toEqual({ x: 150, y: 0, w: 50, h: 100 });
    expect(m.D.x).toBe(150);
    expect(m.B.x - (m.A.x + m.A.w)).toBe(20);
  });
  it('limita para no aplastar viñetas', () => {
    const { lo, hi } = gutterRange(g, grid);
    expect(lo).toBe(-80); // A mide 100, mínimo 20
    expect(hi).toBe(60); // B/D miden 80
    expect(moveGutter(g, grid, 500).B.w).toBe(20);
    expect(moveGutter(g, grid, -500).A.w).toBe(20);
  });
});

describe('normalizeGutters', () => {
  it('iguala el hueco repartiendo la diferencia', () => {
    const m = normalizeGutters(grid, 10, O);
    expect(m.A.w).toBe(105);
    expect(m.B.x).toBe(115);
    expect(m.B.w).toBe(85);
    expect(m.A.h).toBe(105); // canal horizontal
    expect(m.C.y).toBe(115);
    // A: w crece 5 por el vertical y h 5 por el horizontal
    const a = m.A;
    expect(m.B.x - (a.x + a.w)).toBe(10);
  });
  it('no toca lo que ya está bien', () => {
    expect(Object.keys(normalizeGutters(grid, 20, O))).toHaveLength(0);
  });
  it('un hueco menor se abre', () => {
    const rs = [r('A', 0, 0, 100, 100), r('B', 104, 0, 100, 100)];
    const m = normalizeGutters(rs, 10, O);
    expect(m.B.x - (m.A.x + m.A.w)).toBe(10);
  });
});
