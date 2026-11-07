import { test } from 'node:test';
import assert from 'node:assert/strict';
import { columnX, fitText, fitTextVertical, wrapVertical } from './textLayout';
import type { TextStyle } from '../model/types';

const style: TextStyle = { fontFamily: 'sans-serif', fontSize: 20, color: '#000', bold: false, italic: false, align: 'center' };
// cada carácter mide lo que la fuente en px (como un ideograma)
const measure = (font: string) => (s: string) => s.length * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]);

test('wrapVertical parte en columnas por altura', () => {
  assert.deepEqual(wrapVertical('縦書きテスト', 30, (s) => s.length * 10), ['縦書き', 'テスト']);
});

test('wrapVertical respeta saltos de línea y vacíos', () => {
  assert.deepEqual(wrapVertical('ab\n\ncd', 100, (s) => s.length * 10), ['ab', '', 'cd']);
});

test('fitTextVertical reduce la fuente hasta que las columnas quepan en el ancho', () => {
  const f = fitTextVertical('あいうえおかきくけこ', { w: 45, h: 100 }, style, measure);
  assert.ok(f.fontSize < 20);
  assert.ok(f.lines.length * f.lineHeight <= 45 || f.fontSize === 8);
});

test('fitTextVertical no cambia el modo horizontal', () => {
  const h = fitText('hola', { w: 100, h: 100 }, style, measure);
  assert.equal(h.lines.length, 1);
});

test('columnX: la primera columna está a la derecha y las demás a su izquierda', () => {
  const r = { x: 0, w: 100 };
  const a = columnX(r, 20, 3, 0, false);
  const b = columnX(r, 20, 3, 1, false);
  assert.equal(a, 90);
  assert.equal(b, 70);
  // centrado: el bloque de 3 columnas (60) queda en el medio
  assert.equal(columnX(r, 20, 3, 0, true), 70);
  assert.equal(columnX(r, 20, 3, 2, true), 30);
});
