import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warpActive, warpGlyphs } from './textWarp';
import type { TextStyle } from '../model/types';

const style: TextStyle = { fontFamily: 'sans-serif', fontSize: 20, color: '#000', bold: false, italic: false, align: 'center' };
const measure = () => (s: string) => s.length * 10;
const fit = { lines: ['ABCDE'], fontSize: 20, lineHeight: 24 };
const region = { x: 0, y: 0, w: 200, h: 60 };

test('sin deformación no se activa', () => {
  assert.equal(warpActive(undefined), false);
  assert.equal(warpActive({ kind: 'arc', amount: 0 }), false);
  assert.equal(warpActive({ kind: 'arc', amount: 40 }), true);
});

test('arco positivo: el centro queda más alto que los extremos y las letras giran', () => {
  const g = warpGlyphs(fit, region, style, measure, { kind: 'arc', amount: 80 });
  assert.equal(g.length, 5);
  assert.ok(g[2].y < g[0].y && g[2].y < g[4].y);
  assert.ok(g[0].rot < 0 && g[4].rot > 0);
  assert.ok(Math.abs(g[2].rot) < 1);
});

test('arco negativo: al revés (forma de ∪)', () => {
  const g = warpGlyphs(fit, region, style, measure, { kind: 'arc', amount: -80 });
  assert.ok(g[2].y > g[0].y && g[2].y > g[4].y);
});

test('onda: las letras suben y bajan', () => {
  const g = warpGlyphs(fit, region, style, measure, { kind: 'wave', amount: 60 });
  const ys = g.map((x) => x.y);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 5);
});

test('inflar: el centro crece; perspectiva: un lado es más alto que el otro', () => {
  const b = warpGlyphs(fit, region, style, measure, { kind: 'bulge', amount: 80 });
  assert.ok(b[2].sy > b[0].sy);
  const p = warpGlyphs(fit, region, style, measure, { kind: 'perspective', amount: 80 });
  assert.ok(p[0].sy !== p[4].sy);
});

test('los espacios no generan letras y no hay NaN', () => {
  const g = warpGlyphs({ ...fit, lines: ['A B', ''] }, region, style, measure, { kind: 'arc', amount: 100 });
  assert.equal(g.length, 2);
  assert.ok(g.every((x) => Number.isFinite(x.x) && Number.isFinite(x.y) && Number.isFinite(x.rot)));
});
