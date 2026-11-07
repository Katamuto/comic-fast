import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPhone, parseUiParam, pinchStep } from './device';

test('un teléfono (táctil, lado corto pequeño) usa la interfaz móvil, en vertical y en horizontal', () => {
  assert.equal(isPhone({ coarse: true, w: 390, h: 844 }), true);
  assert.equal(isPhone({ coarse: true, w: 844, h: 390 }), true);
});

test('un PC o una tableta conservan la interfaz de escritorio', () => {
  assert.equal(isPhone({ coarse: false, w: 400, h: 800 }), false); // ventana estrecha con ratón
  assert.equal(isPhone({ coarse: true, w: 820, h: 1180 }), false); // tableta
});

test('?ui= fuerza una u otra interfaz', () => {
  assert.equal(isPhone({ coarse: false, w: 1400, h: 900, override: 'mobile' }), true);
  assert.equal(isPhone({ coarse: true, w: 390, h: 844, override: 'desktop' }), false);
  assert.equal(parseUiParam('?ui=mobile'), 'mobile');
  assert.equal(parseUiParam('?ui=auto'), 'auto');
  assert.equal(parseUiParam('?x=1'), undefined);
  assert.equal(parseUiParam('?ui=otra'), undefined);
});

test('pinchStep: separar los dedos acerca; mover el centro desplaza', () => {
  const s = pinchStep([{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 90, y: 110 }, { x: 230, y: 110 }]);
  assert.equal(s.factor, 1.4);
  assert.deepEqual(s.from, { x: 150, y: 100 });
  assert.deepEqual(s.to, { x: 160, y: 110 });
});

test('pinchStep: dedos juntos no producen factores absurdos', () => {
  assert.equal(pinchStep([{ x: 1, y: 1 }, { x: 1, y: 1 }], [{ x: 0, y: 0 }, { x: 50, y: 0 }]).factor, 1);
});
