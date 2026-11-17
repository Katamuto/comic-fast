import { describe, expect, it } from 'vitest';
import { pageInfo, pageTokens } from './style';
import type { Page } from './types';

const pg = (id: string, extra: Partial<Page> = {}): Page => ({ id, background: '#fff', objects: [], ...extra });
const style = pg('style');

describe('pageInfo', () => {
  it('numera solo las páginas que cuentan y excluye el estilo por página', () => {
    const doc = { style, pages: [pg('a', { noStyle: true, noNumber: true }), pg('b'), pg('c'), pg('d', { noNumber: true })] };
    expect(pageInfo(doc, 0)).toEqual({ style: null, pageNo: null, pageCount: 2, globals: null });
    expect(pageInfo(doc, 1)).toEqual({ style, pageNo: 1, pageCount: 2, globals: null });
    expect(pageInfo(doc, 2)).toEqual({ style, pageNo: 2, pageCount: 2, globals: null });
    expect(pageInfo(doc, 3)).toEqual({ style, pageNo: null, pageCount: 2, globals: null });
  });
  it('las dos exclusiones son independientes', () => {
    const doc = { style, pages: [pg('a', { noStyle: true }), pg('b', { noNumber: true })] };
    expect(pageInfo(doc, 0)).toEqual({ style: null, pageNo: 1, pageCount: 1, globals: null });
    expect(pageInfo(doc, 1)).toEqual({ style, pageNo: null, pageCount: 1, globals: null });
  });
  it('noGlobals quita los parámetros globales de esa página', () => {
    const globals = { textSize: 20 };
    const doc = { style, globals, pages: [pg('a', { noGlobals: true }), pg('b')] };
    expect(pageInfo(doc, 0).globals).toBeNull();
    expect(pageInfo(doc, 1).globals).toBe(globals);
  });
  it('{n} queda vacío si la página no cuenta', () => {
    expect(pageTokens('Pág. {n}/{total}', null, 5)).toBe('Pág. /5');
    expect(pageTokens('Pág. {n}/{total}', 2, 5)).toBe('Pág. 2/5');
  });
});

describe('pageSpill (arte a doble página)', () => {
  const W = 100;
  const obj = (id: string, x: number): never => ({ id, type: 'panel', x, y: 10, w: 60, h: 50, rotation: 0 }) as never;
  const doc = (objs0: never[], objs1: never[]) => ({
    pageW: W,
    pageH: 200,
    layout: { book: true, firstSide: 'left' as const },
    pages: [pg('a', { objects: objs0 }), pg('b', { objects: objs1 })]
  });
  it('la vecina aporta lo que invade esta página', async () => {
    const { pageSpill } = await import('./style');
    const d = doc([obj('x', 70)], []); // página 0 (izquierda), panel de 70 a 130 invade la derecha
    expect(pageSpill(d, 1)?.dx).toBe(-W);
    expect(pageSpill(d, 0)).toBeNull(); // la derecha está vacía
  });
  it('sin invasión o sin libro no hay nada', async () => {
    const { pageSpill } = await import('./style');
    expect(pageSpill(doc([obj('x', 10)], []), 1)).toBeNull();
    expect(pageSpill({ ...doc([obj('x', 70)], []), layout: {} }, 1)).toBeNull();
  });
});
