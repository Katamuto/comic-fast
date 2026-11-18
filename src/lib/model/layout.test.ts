import { describe, expect, it } from 'vitest';
import {
  allowedRect,
  clampShift,
  contentRect,
  gridLinesIn,
  gridStepIn,
  pageSide,
  partnerIndex,
  renderPlan,
  resolveLayout,
  snapFrom
} from './layout';

const L = (p = {}) => resolveLayout({ book: true, margins: { top: 10, bottom: 20, inner: 30, outer: 5 }, ...p });

describe('resolveLayout', () => {
  it('rellena valores por defecto y sanea', () => {
    const l = resolveLayout({ ppi: 99999, bleed: -4 });
    expect(l.ppi).toBe(1200);
    expect(l.bleed).toBe(0);
    expect(l.margins).toEqual({ top: 0, bottom: 0, inner: 0, outer: 0 });
    expect(l.firstSide).toBe('right');
    expect(resolveLayout(undefined).ppi).toBe(300);
  });
});

describe('lados y parejas', () => {
  it('alterna lados según el primero', () => {
    expect(pageSide(L(), 0)).toBe('right');
    expect(pageSide(L(), 1)).toBe('left');
    expect(pageSide(L({ firstSide: 'left' }), 0)).toBe('left');
    expect(pageSide(resolveLayout({}), 0)).toBeNull();
  });
  it('la izquierda se empareja con la siguiente; la derecha con la anterior', () => {
    expect(partnerIndex(L(), 0, 5)).toBeNull(); // portada derecha sin pareja
    expect(partnerIndex(L(), 1, 5)).toBe(2);
    expect(partnerIndex(L(), 2, 5)).toBe(1);
    expect(partnerIndex(L(), 4, 5)).toBe(3);
    expect(partnerIndex(L(), 3, 4)).toBeNull(); // la 4 no existe
  });
});

describe('área útil', () => {
  it('espeja los márgenes interior/exterior', () => {
    expect(contentRect(L(), 100, 200, 'right')).toEqual({ x: 30, y: 10, w: 65, h: 170 });
    expect(contentRect(L(), 100, 200, 'left')).toEqual({ x: 5, y: 10, w: 65, h: 170 });
  });
  it('en doble página se extiende a la vecina', () => {
    // página 1 (izquierda) con vecina 2 (derecha)
    const r = allowedRect(L(), 100, 200, 1, 5, true);
    expect(r.x).toBe(5);
    expect(r.x + r.w).toBe(100 + 30 + 65);
    // página 2 (derecha) con vecina 1 (izquierda): se extiende hacia negativos
    const q = allowedRect(L(), 100, 200, 2, 5, true);
    expect(q.x).toBe(-100 + 5);
    expect(q.x + q.w).toBe(95);
  });
});

describe('rejilla relativa al área', () => {
  it('empieza en el margen y termina en el otro margen', () => {
    const area = { x: 30, y: 10, w: 60, h: 120 };
    expect(gridStepIn(area, { cols: 6, sub: 1 })).toBe(10);
    const g = gridLinesIn(area, { cols: 6, sub: 2 });
    expect(g.x[0].at).toBe(30);
    expect(g.x[g.x.length - 1].at).toBe(90);
    expect(g.y[0].at).toBe(10);
    expect(g.x[2].major).toBe(true);
    expect(g.x[1].major).toBe(false);
  });
  it('snapFrom usa el origen', () => {
    expect(snapFrom(34, 30, 10)).toBe(30);
    expect(snapFrom(36, 30, 10)).toBe(40);
  });
});

describe('clampShift', () => {
  const area = { x: 10, y: 10, w: 80, h: 80 };
  it('mantiene la caja dentro', () => {
    expect(clampShift({ x: 20, y: 20, w: 20, h: 20 }, -50, 100, area)).toEqual({ dx: -10, dy: 50 });
  });
  it('no limita un eje en el que la caja no cabe', () => {
    expect(clampShift({ x: 0, y: 20, w: 100, h: 20 }, 7, 0, area).dx).toBe(7);
  });
});

describe('renderPlan', () => {
  it('300 ppi = escala 2 y suma el sangrado', () => {
    const p = renderPlan(1000, 1500, 300, 25);
    expect(p.scale).toBe(2);
    expect(p.pxW).toBe(2100);
    expect(p.pxH).toBe(3100);
    expect(p.capped).toBe(false);
  });
  it('limita los PPI imposibles y lo avisa', () => {
    const p = renderPlan(2000, 3000, 1200, 0);
    expect(p.capped).toBe(true);
    expect(p.effectivePpi).toBeLessThan(1200);
    expect(p.pxW * p.pxH).toBeLessThanOrEqual(120_000_000 * 1.001);
  });
});

describe('rejilla estirada (fit)', () => {
  it('reparte el alto en filas exactas', async () => {
    const { gridStepYIn } = await import('./layout');
    const area = { x: 0, y: 0, w: 100, h: 155 };
    expect(gridStepYIn(area, { cols: 10, sub: 1 })).toBe(10); // sin fit: cuadradas
    const y = gridStepYIn(area, { cols: 10, sub: 1, fit: true });
    expect(y).toBeCloseTo(155 / 16, 6);
    const g = gridLinesIn(area, { cols: 10, sub: 1, fit: true });
    expect(g.y[g.y.length - 1].at).toBeCloseTo(155, 6);
  });
});
