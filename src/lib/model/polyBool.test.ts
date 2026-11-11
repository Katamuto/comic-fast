import { describe, expect, it } from 'vitest';
import { boolean, signedArea, splitByLine } from './polyBool';
import type { Pt } from './types';

const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }
];
const area = (ps: Pt[][]) => ps.reduce((s, p) => s + Math.abs(signedArea(p)), 0);

describe('booleanas de polígonos', () => {
  it('unión de dos rectángulos solapados', () => {
    const r = boolean('union', rect(0, 0, 100, 100), rect(50, 50, 100, 100));
    expect(r.polys.length).toBe(1);
    expect(area(r.polys)).toBeCloseTo(100 * 100 * 2 - 50 * 50);
  });
  it('unión de viñetas pegadas por un lado (aristas coincidentes)', () => {
    const r = boolean('union', rect(0, 0, 100, 100), rect(100, 0, 100, 100));
    expect(r.polys.length).toBe(1);
    expect(area(r.polys)).toBeCloseTo(20000);
    expect(r.polys[0].length).toBe(4);
  });
  it('unión con un lado compartido parcialmente', () => {
    const r = boolean('union', rect(0, 0, 100, 100), rect(100, 30, 50, 40));
    expect(r.polys.length).toBe(1);
    expect(area(r.polys)).toBeCloseTo(10000 + 2000);
  });
  it('intersección', () => {
    const r = boolean('intersect', rect(0, 0, 100, 100), rect(50, 50, 100, 100));
    expect(r.polys.length).toBe(1);
    expect(area(r.polys)).toBeCloseTo(2500);
  });
  it('intersección vacía', () => {
    expect(boolean('intersect', rect(0, 0, 10, 10), rect(50, 50, 10, 10)).polys.length).toBe(0);
  });
  it('diferencia: forma de L', () => {
    const r = boolean('difference', rect(0, 0, 100, 100), rect(50, 50, 100, 100));
    expect(r.polys.length).toBe(1);
    expect(area(r.polys)).toBeCloseTo(7500);
    expect(r.polys[0].length).toBe(6);
  });
  it('diferencia que parte en dos', () => {
    const r = boolean('difference', rect(0, 0, 100, 30), rect(40, -10, 20, 50));
    expect(r.polys.length).toBe(2);
    expect(area(r.polys)).toBeCloseTo(100 * 30 - 20 * 30);
  });
  it('diferencia con hueco: se avisa', () => {
    const r = boolean('difference', rect(0, 0, 100, 100), rect(30, 30, 20, 20));
    expect(r.holes).toBe(1);
    expect(r.polys.length).toBe(1);
  });
  it('diferencia con aristas coincidentes', () => {
    const r = boolean('difference', rect(0, 0, 100, 100), rect(0, 0, 100, 50));
    expect(r.polys.length).toBe(1);
    expect(area(r.polys)).toBeCloseTo(5000);
  });
  it('triángulo y cuadrado', () => {
    const tri: Pt[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }];
    const r = boolean('intersect', tri, rect(0, 0, 50, 50));
    expect(area(r.polys)).toBeCloseTo(2500 - 0, 0);
  });
});

describe('cortar viñetas con una recta', () => {
  it('corta un rectángulo en dos mitades', () => {
    const r = splitByLine(rect(0, 0, 100, 100), { x: 50, y: -10 }, { x: 50, y: 110 });
    expect(r.length).toBe(2);
    expect(area(r)).toBeCloseTo(10000);
  });
  it('deja separación entre las piezas', () => {
    const r = splitByLine(rect(0, 0, 100, 100), { x: 50, y: -10 }, { x: 50, y: 110 }, 10);
    expect(r.length).toBe(2);
    expect(area(r)).toBeCloseTo(9000);
  });
  it('un corte oblicuo también parte', () => {
    const r = splitByLine(rect(0, 0, 100, 100), { x: -10, y: -10 }, { x: 110, y: 110 });
    expect(r.length).toBe(2);
    expect(area(r)).toBeCloseTo(10000);
  });
  it('una recta que no toca no parte', () => {
    const r = splitByLine(rect(0, 0, 100, 100), { x: 200, y: 0 }, { x: 200, y: 100 });
    expect(r.length).toBe(1);
  });
});
