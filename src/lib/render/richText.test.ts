import { describe, expect, it } from 'vitest';
import { applyFormat, commonValue, lineSegments, normalizeSpans, richCtx, richWidth, shiftSpans, toggleFlag, wrapRich } from './richText';
import type { Span } from '../model/types';

const base = { bold: false, italic: false, color: '#111', fontFamily: 'Comic Neue' };
// medida simple: cada carácter 10 px, el doble si es negrita
const measure = (font: string) => (s: string) => s.length * (font.includes('700') ? 20 : 10);

describe('formato por partes', () => {
  it('aplica negrita a un rango y lo quita al repetir', () => {
    const a = toggleFlag(undefined, 11, base, 0, 5, 'bold');
    expect(a).toEqual([{ from: 0, to: 5, bold: true }]);
    expect(toggleFlag(a, 11, base, 0, 5, 'bold')).toEqual([]);
  });
  it('quitar la negrita de una parte de un objeto en negrita', () => {
    const b = { ...base, bold: true };
    expect(toggleFlag(undefined, 10, b, 2, 4, 'bold')).toEqual([{ from: 2, to: 4, bold: false }]);
  });
  it('mezcla de formatos y fusión de tramos contiguos', () => {
    let s: Span[] = applyFormat(undefined, 10, base, 0, 4, { color: '#f00' });
    s = applyFormat(s, 10, base, 4, 8, { color: '#f00' });
    expect(s).toEqual([{ from: 0, to: 8, color: '#f00' }]);
    s = applyFormat(s, 10, base, 2, 6, { italic: true });
    expect(s.length).toBe(3);
    expect(commonValue(s, 10, base, 2, 6, 'italic')).toBe(true);
    expect(commonValue(s, 10, base, 0, 10, 'italic')).toBeUndefined();
  });
  it('volver al valor del objeto elimina el tramo', () => {
    const s = applyFormat([{ from: 0, to: 4, color: '#f00' }], 10, base, 0, 4, { color: undefined });
    expect(s).toEqual([]);
  });
  it('normalizeSpans ordena y limpia', () => {
    expect(normalizeSpans([{ from: 0, to: 99, bold: false }], 5, base)).toEqual([]);
    expect(normalizeSpans([{ from: 2, to: 4, bold: true }, { from: 3, to: 6, underline: true }], 6, base)).toEqual([
      { from: 2, to: 3, bold: true },
      { from: 3, to: 4, bold: true, underline: true },
      { from: 4, to: 6, underline: true }
    ]);
  });
});

describe('spans al editar el texto', () => {
  const sp: Span[] = [{ from: 5, to: 10, bold: true }];
  it('escribir antes desplaza', () => {
    expect(shiftSpans(sp, 'hola mundo', 'oh hola mundo')).toEqual([{ from: 8, to: 13, bold: true }]);
  });
  it('escribir dentro del tramo lo agranda', () => {
    expect(shiftSpans(sp, 'hola mundo', 'hola munXdo')).toEqual([{ from: 5, to: 11, bold: true }]);
  });
  it('escribir al final del tramo hereda su formato', () => {
    expect(shiftSpans(sp, 'hola mundo!', 'hola mundoX!')).toEqual([{ from: 5, to: 11, bold: true }]);
  });
  it('borrar todo el tramo lo elimina', () => {
    expect(shiftSpans(sp, 'hola mundo', 'hola ')).toEqual([]);
  });
  it('escribir justo antes del tramo no lo ensancha', () => {
    expect(shiftSpans(sp, 'hola mundo', 'hola XXmundo')).toEqual([{ from: 7, to: 12, bold: true }]);
  });
  it('sin spans devuelve lo mismo', () => {
    expect(shiftSpans(undefined, 'a', 'ab')).toBeUndefined();
  });
});

describe('medida y ajuste con formato', () => {
  it('la negrita ensancha las palabras', () => {
    const ctx = richCtx('ab cd', [{ from: 0, to: 2, bold: true }], base);
    const w = richWidth(ctx, 10, measure);
    expect(w(0, 2)).toBe(40);
    expect(w(3, 5)).toBe(20);
    expect(w(0, 5)).toBe(40 + 10 + 20);
  });
  it('wrapRich parte con los anchos reales y conserva las posiciones', () => {
    const text = 'aa bb cc';
    const ctx = richCtx(text, [{ from: 3, to: 5, bold: true }], base);
    const r = wrapRich(text, 50, richWidth(ctx, 10, measure), 10);
    // 'aa' (20) + espacio + 'bb' negrita (40) = 70 > 50 → bb baja
    expect(r.lines[0]).toBe('aa');
    expect(r.words[1][0]).toEqual({ from: 3, to: 5 });
  });
  it('lineSegments agrupa por formato', () => {
    const text = 'uno dos tres';
    const ctx = richCtx(text, [{ from: 4, to: 7, bold: true }], base);
    const segs = lineSegments(ctx, [{ from: 0, to: 3 }, { from: 4, to: 7 }, { from: 8, to: 12 }]);
    expect(segs.map((s) => [s.text, s.bold])).toEqual([
      ['uno ', false],
      ['dos ', true],
      ['tres', false]
    ]);
  });
  it('un párrafo vacío cuenta como línea', () => {
    const ctx = richCtx('a\n\nb', [], base);
    const r = wrapRich('a\n\nb', 100, richWidth(ctx, 10, measure), 10);
    expect(r.lines).toEqual(['a', '', 'b']);
  });
});
