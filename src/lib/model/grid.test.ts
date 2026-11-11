import { describe, expect, it } from 'vitest';
import { cellSize, clampGrid, gridLines, gridStep } from './grid';

describe('cuadrícula relativa', () => {
  it('la celda es proporcional al ancho de la página', () => {
    expect(cellSize(1200, { cols: 12, sub: 1 })).toBe(100);
    expect(cellSize(2400, { cols: 12, sub: 1 })).toBe(200);
  });
  it('el paso del imán es la subdivisión', () => {
    expect(gridStep(1200, { cols: 12, sub: 4 })).toBe(25);
  });
  it('limita valores absurdos', () => {
    expect(clampGrid({ cols: 0, sub: 99 })).toEqual({ cols: 12, sub: 16 });
    expect(clampGrid({ cols: 500, sub: 2.4 })).toEqual({ cols: 100, sub: 2 });
  });
  it('líneas principales y secundarias', () => {
    const l = gridLines(400, 200, { cols: 4, sub: 2 });
    expect(l.x.length).toBe(9);
    expect(l.x.filter((v) => v.major).map((v) => v.at)).toEqual([0, 100, 200, 300, 400]);
    expect(l.y.map((v) => v.at)).toEqual([0, 50, 100, 150, 200]);
  });
});
