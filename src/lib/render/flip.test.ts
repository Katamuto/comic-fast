import { describe, expect, it } from 'vitest';
import { flipOf } from './flip';

describe('flipOf', () => {
  it('sin reflejo no hay transformación', () => {
    expect(flipOf({}, 100, 50)).toBeUndefined();
  });
  it('horizontal: traslada el ancho y escala -1 en x', () => {
    expect(flipOf({ flipH: true }, 100, 50)).toBe('translate(100 0) scale(-1 1)');
  });
  it('vertical y ambos', () => {
    expect(flipOf({ flipV: true }, 100, 50)).toBe('translate(0 50) scale(1 -1)');
    expect(flipOf({ flipH: true, flipV: true }, 100, 50)).toBe('translate(100 50) scale(-1 -1)');
  });
});
