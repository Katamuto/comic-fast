import { describe, expect, it } from 'vitest';
import { applyGlobals, hasGlobals, textForced } from './globals';
import type { PageObject } from './types';

const balloon = { id: 'b', type: 'balloon', fontSize: 20, strokeWidth: 3 } as unknown as PageObject;
const panel = { id: 'p', type: 'panel', strokeWidth: 4 } as unknown as PageObject;
const img = { id: 'i', type: 'image' } as unknown as PageObject;

describe('globals', () => {
  it('sin globales no cambia nada', () => {
    expect(applyGlobals(balloon, undefined)).toBe(balloon);
    expect(applyGlobals(balloon, {})).toBe(balloon);
  });
  it('aplica texto y trazos a lo pertinente', () => {
    const b = applyGlobals(balloon, { textSize: 30, balloonStroke: 5, panelStroke: 9 }) as unknown as { fontSize: number; strokeWidth: number };
    expect(b.fontSize).toBe(30);
    expect(b.strokeWidth).toBe(5);
    const p = applyGlobals(panel, { textSize: 30, balloonStroke: 5, panelStroke: 9 }) as unknown as { strokeWidth: number };
    expect(p.strokeWidth).toBe(9);
    expect(applyGlobals(img, { textSize: 30 })).toBe(img);
  });
  it('un grosor 0 es válido', () => {
    expect((applyGlobals(panel, { panelStroke: 0 }) as unknown as { strokeWidth: number }).strokeWidth).toBe(0);
  });
  it('textForced y hasGlobals', () => {
    expect(textForced({ forceText: true })).toBe(false);
    expect(textForced({ forceText: true, textSize: 20 })).toBe(true);
    expect(hasGlobals({})).toBe(false);
    expect(hasGlobals({ panelStroke: 0 })).toBe(true);
  });
});
