import { describe, expect, it } from 'vitest';
import { clampPagePx, COMMON_SIZES, exportScale, formatUnit, fromPx, MAX_PAGE_PX, MIN_PAGE_PX, toPx } from './units';

describe('unidades de página', () => {
  it('convierte a píxeles a 150 dpi', () => {
    expect(toPx(1, 'in')).toBe(150);
    expect(Math.round(toPx(25.4, 'mm'))).toBe(150);
    expect(Math.round(toPx(2.54, 'cm'))).toBe(150);
    expect(toPx(300, 'px')).toBe(300);
  });

  it('ida y vuelta conserva el valor', () => {
    for (const u of ['px', 'mm', 'cm', 'in'] as const) {
      expect(Math.abs(fromPx(toPx(123.4, u), u) - 123.4)).toBeLessThan(1e-9);
    }
  });

  it('A4 mide 1240 × 1754 px', () => {
    const a4 = COMMON_SIZES.find((s) => s.id === 'a4')!;
    expect([a4.w, a4.h]).toEqual([1240, 1754]);
  });

  it('clampPagePx limita, redondea y rechaza lo que no es número', () => {
    expect(clampPagePx(10)).toBe(MIN_PAGE_PX);
    expect(clampPagePx(99999)).toBe(MAX_PAGE_PX);
    expect(clampPagePx(500.6)).toBe(501);
    expect(clampPagePx(NaN)).toBeNull();
  });

  it('formatUnit usa pocos decimales', () => {
    expect(formatUnit(210.04, 'mm')).toBe('210');
    expect(formatUnit(8.5, 'in')).toBe('8.5');
    expect(formatUnit(1240.4, 'px')).toBe('1240');
  });

  it('exportScale baja si la página es enorme', () => {
    expect(exportScale(994, 1538)).toBe(2);
    expect(exportScale(6000, 6000)).toBeLessThan(2);
    expect(6000 * exportScale(6000, 6000)).toBeLessThanOrEqual(9000);
  });
});
