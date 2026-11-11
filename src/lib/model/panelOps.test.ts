import { describe, expect, it } from 'vitest';
import { combinePanels, cutPolys, gridCuts, panelLike, panelPolyPage } from './panelOps';
import { signedArea } from './polyBool';
import type { PanelObj } from './types';

const P = (x: number, y: number, w: number, h: number, o: Partial<PanelObj> = {}): PanelObj =>
  ({ id: 'p', type: 'panel', x, y, w, h, rotation: 0, shape: 'rect', points: [], fill: '#fff', stroke: '#000', strokeWidth: 4, layers: [], ...o }) as PanelObj;
const area = (ps: { x: number; y: number }[][]) => ps.reduce((s, p) => s + Math.abs(signedArea(p)), 0);

describe('operaciones con viñetas', () => {
  it('contorno de página de una viñeta girada conserva el área', () => {
    expect(area([panelPolyPage(P(10, 10, 100, 50, { rotation: 30 }))])).toBeCloseTo(5000);
  });
  it('unir dos viñetas solapadas', () => {
    const r = combinePanels('union', [P(0, 0, 100, 100), P(50, 0, 100, 100)]);
    expect(r.polys.length).toBe(1);
    expect(area(r.polys)).toBeCloseTo(15000);
  });
  it('unir viñetas separadas no cambia nada', () => {
    const r = combinePanels('union', [P(0, 0, 10, 10), P(100, 0, 10, 10)]);
    expect(r.polys.length).toBe(2);
  });
  it('intersección y diferencia', () => {
    expect(area(combinePanels('intersect', [P(0, 0, 100, 100), P(50, 0, 100, 100)]).polys)).toBeCloseTo(5000);
    expect(area(combinePanels('difference', [P(0, 0, 100, 100), P(50, 0, 100, 100)]).polys)).toBeCloseTo(5000);
  });
  it('unir tres viñetas en cadena', () => {
    const r = combinePanels('union', [P(0, 0, 100, 100), P(90, 0, 100, 100), P(180, 0, 100, 100)]);
    expect(r.polys.length).toBe(1);
    expect(area(r.polys)).toBeCloseTo(28000);
  });
  it('una elipse y un rectángulo', () => {
    const r = combinePanels('intersect', [P(0, 0, 100, 100, { shape: 'ellipse' }), P(0, 0, 50, 100)]);
    expect(area(r.polys)).toBeGreaterThan(3500);
    expect(area(r.polys)).toBeLessThan(4000);
  });
  it('panelLike crea una viñeta poligonal con la caja ajustada', () => {
    const base = P(0, 0, 100, 100, { rotation: 0 });
    const piece = [{ x: 20, y: 30 }, { x: 80, y: 30 }, { x: 80, y: 90 }, { x: 20, y: 90 }];
    const n = panelLike(base, piece);
    expect(n.shape).toBe('poly');
    expect(n.x).toBeCloseTo(20);
    expect(n.y).toBeCloseTo(30);
    expect(n.w).toBeCloseTo(60);
    expect(n.points.length).toBe(4);
  });
  it('panelLike con giro mantiene el contorno en la página', () => {
    const base = P(100, 100, 200, 100, { rotation: 45 });
    const outline = panelPolyPage(base);
    const n = panelLike(base, outline);
    const back = panelPolyPage({ ...(n as PanelObj), id: 'x' });
    expect(area([back])).toBeCloseTo(area([outline]), 3);
  });
  it('dividir en cuadrícula 2×2 con separación', () => {
    const o = P(0, 0, 200, 200);
    let polys = [panelPolyPage(o)];
    for (const [p, q] of gridCuts(o, 2, 2)) polys = cutPolys(polys, p, q, 10);
    expect(polys.length).toBe(4);
    expect(area(polys)).toBeCloseTo(200 * 200 - 10 * 200 * 2 + 100);
  });
});
