import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dotsLayout, dotsPath, MAX_DOTS } from './dotGradient';
import { DEFAULT_DOTS, DEFAULT_GRADIENT, gradientGeometry, gradientGuides } from './paint';
import type { Gradient } from '../model/types';

const g = (p: Partial<Gradient> = {}): Gradient => ({ ...DEFAULT_GRADIENT, angle: 0, dots: { ...DEFAULT_DOTS }, ...p });

test('los puntos se hacen más pequeños y más separados hacia el color 2', () => {
  const dots = dotsLayout(g(), g().dots!, 400, 100);
  const left = dots.filter((d) => d.x < 100);
  const right = dots.filter((d) => d.x > 300);
  const avg = (a: { size: number }[]) => a.reduce((s, d) => s + d.size, 0) / a.length;
  assert.ok(avg(left) > avg(right) + 3);
  assert.ok(left.length > right.length); // más densidad donde hay puntos grandes y poco hueco
});

test('el degradado reflejado es simétrico respecto al centro', () => {
  const rg = g({ kind: 'reflected' });
  const dots = dotsLayout(rg, rg.dots!, 400, 100);
  const mid = dots.filter((d) => Math.abs(d.x - 200) < 20);
  const edge = dots.filter((d) => d.x < 20 || d.x > 380);
  const avg = (a: { size: number }[]) => a.reduce((s, d) => s + d.size, 0) / a.length;
  assert.ok(avg(mid) > avg(edge) + 3);
});

test('el radial reparte anillos desde el centro', () => {
  const rg = g({ kind: 'radial', cx: 0.5, cy: 0.5 });
  const dots = dotsLayout(rg, rg.dots!, 200, 200);
  const near = dots.filter((d) => Math.hypot(d.x - 100, d.y - 100) < 30);
  const far = dots.filter((d) => Math.hypot(d.x - 100, d.y - 100) > 120);
  assert.ok(near.length > 0 && far.length > 0);
  assert.ok(near[0].size > far[0].size);
});

test('hay un tope de puntos aunque la trama sea muy fina', () => {
  const fine = g({ dots: { ...DEFAULT_DOTS, size1: 1, size2: 1, gap1: 0, gap2: 0 } });
  const dots = dotsLayout(fine, fine.dots!, 3000, 3000);
  assert.ok(dots.length <= MAX_DOTS * 1.2 + 1);
});

test('cada forma produce un trazo SVG sin NaN', () => {
  for (const shape of ['circle', 'square', 'diamond', 'cross'] as const) {
    const gg = g({ dots: { ...DEFAULT_DOTS, shape } });
    const d = dotsPath(gg, 120, 80);
    assert.ok(d.length > 50, shape);
    assert.ok(!/NaN|undefined/.test(d), shape);
    assert.ok(d.startsWith('M'), shape);
  }
  assert.equal(dotsPath({ ...DEFAULT_GRADIENT }, 100, 100), '');
});

test('geometría reflejada: centro en la caja y guías coherentes', () => {
  const geo = gradientGeometry({ ...DEFAULT_GRADIENT, kind: 'reflected', angle: 0 }, 200, 100);
  assert.equal(geo.kind, 'reflected');
  if (geo.kind === 'reflected') {
    assert.equal(geo.cx, 100);
    assert.equal(geo.cy, 50);
    assert.equal(geo.x2, 200);
  }
  const gu = gradientGuides({ ...DEFAULT_GRADIENT, kind: 'reflected', angle: 0 }, 200, 100);
  assert.deepEqual(gu.p1, { x: 0.5, y: 0.5 });
  assert.deepEqual(gu.p2, { x: 1, y: 0.5 });
});
