import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Stroke, FingerStroke, tipFromRgba, bucketFill, dilate, pressureFactor, tipAt, type Tip, RasterHistory, clearMask, clearOutside, colorToAlpha, combineMask, cropMask, cropRaster, invertMask,
  magicWand, maskBounds, newRaster, polygonMask, rectMask, type Raster
} from './pixels';

function solid(w: number, h: number, rgba: [number, number, number, number]): Raster {
  const r = newRaster(w, h);
  for (let i = 0; i < w * h; i++) r.data.set(rgba, i * 4);
  return r;
}
const px = (r: Raster, x: number, y: number) => Array.from(r.data.slice((y * r.w + x) * 4, (y * r.w + x) * 4 + 4));
const count = (m: Uint8Array) => m.reduce((n, v) => n + (v ? 1 : 0), 0);

test('rectMask y polygonMask', () => {
  assert.equal(count(rectMask(10, 10, 2, 3, 6, 5)), 8);
  assert.equal(count(rectMask(10, 10, 6, 5, 2, 3)), 8); // al revés
  const tri = polygonMask(10, 10, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]);
  assert.ok(count(tri) > 40 && count(tri) < 60);
  assert.equal(tri[0], 255);
  assert.equal(tri[99], 0);
  assert.equal(count(polygonMask(10, 10, [{ x: 1, y: 1 }, { x: 5, y: 5 }])), 0);
});

test('combinar selecciones: añadir, restar, invertir, límites', () => {
  const a = rectMask(10, 10, 0, 0, 5, 10);
  const b = rectMask(10, 10, 3, 0, 8, 10);
  assert.equal(count(combineMask(a, b, 'add')), 80);
  assert.equal(count(combineMask(a, b, 'sub')), 30);
  assert.equal(count(combineMask(a, b, 'replace')), 50);
  assert.equal(count(invertMask(a)), 50);
  assert.deepEqual(maskBounds(b, 10, 10), { x: 3, y: 0, w: 5, h: 10 });
  assert.equal(maskBounds(new Uint8Array(100), 10, 10), null);
});

test('varita: contigua o no, con tolerancia', () => {
  const r = solid(10, 4, [255, 255, 255, 255]);
  for (let y = 0; y < 4; y++) { r.data.set([255, 0, 0, 255], (y * 10 + 5) * 4); } // columna roja que parte en dos
  const contiguous = magicWand(r, 0, 0, 10, true);
  assert.equal(count(contiguous), 20); // solo el lado izquierdo
  const all = magicWand(r, 0, 0, 10, false);
  assert.equal(count(all), 36); // ambos lados
  assert.equal(count(magicWand(r, 0, 0, 255, true)), 40); // tolerancia máxima: todo
  assert.equal(count(magicWand(r, 99, 99, 10, true)), 0);
});

test('varita: los píxeles transparentes son iguales aunque su color oculto cambie', () => {
  const r = newRaster(4, 1);
  r.data.set([255, 0, 0, 0, 0, 255, 0, 0, 0, 0, 255, 255, 9, 9, 9, 0], 0);
  assert.deepEqual(Array.from(magicWand(r, 0, 0, 0, true)), [255, 255, 0, 0]);
});

test('borrar selección y borrar fuera de la selección', () => {
  const r = solid(4, 4, [10, 20, 30, 255]);
  clearMask(r, rectMask(4, 4, 0, 0, 2, 2));
  assert.equal(px(r, 0, 0)[3], 0);
  assert.equal(px(r, 3, 3)[3], 255);
  const q = solid(4, 4, [10, 20, 30, 255]);
  clearOutside(q, rectMask(4, 4, 1, 1, 3, 3));
  assert.equal(px(q, 0, 0)[3], 0);
  assert.equal(px(q, 1, 1)[3], 255);
});

test('recortar imagen y máscara', () => {
  const r = solid(6, 6, [0, 0, 0, 255]);
  r.data.set([1, 2, 3, 4], (2 * 6 + 3) * 4);
  const c = cropRaster(r, 3, 2, 2, 2);
  assert.equal(c.w, 2);
  assert.deepEqual(px(c, 0, 0), [1, 2, 3, 4]);
  const m = cropMask(rectMask(6, 6, 3, 2, 5, 4), 6, 3, 2, 2, 2);
  assert.equal(count(m), 4);
  assert.equal(cropRaster(r, 5, 5, 99, 99).w, 1); // se ajusta a la imagen
});

test('color a alfa: el color pasa a transparente y el resto se conserva', () => {
  const r = newRaster(3, 1);
  r.data.set([255, 255, 255, 255, 255, 0, 0, 255, 255, 128, 128, 255], 0); // blanco, rojo, rosa
  colorToAlpha(r, [255, 255, 255], null);
  assert.equal(px(r, 0, 0)[3], 0); // el blanco desaparece
  assert.deepEqual(px(r, 1, 0), [255, 0, 0, 255]); // el rojo puro queda intacto y opaco
  const rosa = px(r, 2, 0);
  assert.deepEqual(rosa.slice(0, 3), [255, 0, 0]); // rosa = rojo semitransparente
  assert.ok(rosa[3] > 100 && rosa[3] < 140);
});

test('color a alfa: respeta la selección y la transparencia previa; umbrales', () => {
  const r = solid(2, 1, [255, 255, 255, 255]);
  colorToAlpha(r, [255, 255, 255], new Uint8Array([255, 0]));
  assert.equal(px(r, 0, 0)[3], 0);
  assert.equal(px(r, 1, 0)[3], 255); // fuera de la selección
  const t = newRaster(1, 1);
  t.data.set([255, 128, 128, 100], 0);
  colorToAlpha(t, [255, 255, 255], null);
  assert.ok(t.data[3] < 100); // se multiplica por la opacidad que ya tenía
  const u = newRaster(1, 1);
  u.data.set([250, 250, 250, 255], 0); // casi blanco
  colorToAlpha(u, [255, 255, 255], null, { transparencyThreshold: 0.1 });
  assert.equal(u.data[3], 0);
});

test('pincel: pinta con borde suave, respeta la selección y la opacidad es del trazo', () => {
  const r = newRaster(20, 20);
  const s = new Stroke(r, { size: 6, hardness: 1, opacity: 0.5, color: [255, 0, 0], erase: false }, null);
  s.add(5, 10);
  s.add(15, 10);
  const mid = px(r, 10, 10);
  assert.deepEqual(mid.slice(0, 3), [255, 0, 0]);
  assert.ok(Math.abs(mid[3] - 128) <= 2); // 50 % aunque se pase varias veces por el mismo píxel
  assert.equal(px(r, 10, 2)[3], 0);
  assert.ok(s.dirty.x1 >= 15 && s.dirty.y0 <= 7);

  const masked = newRaster(20, 20);
  const m = rectMask(20, 20, 0, 0, 10, 20);
  const s2 = new Stroke(masked, { size: 8, hardness: 1, opacity: 1, color: [0, 0, 255], erase: false }, m);
  s2.add(10, 10);
  assert.equal(px(masked, 8, 10)[3], 255);
  assert.equal(px(masked, 12, 10)[3], 0); // fuera de la selección
});

test('borrador: baja la opacidad sin tocar el color', () => {
  const r = solid(10, 10, [10, 20, 30, 255]);
  const s = new Stroke(r, { size: 6, hardness: 1, opacity: 1, color: [0, 0, 0], erase: true }, null);
  s.add(5, 5);
  assert.equal(px(r, 5, 5)[3], 0);
  assert.equal(px(r, 0, 0)[3], 255);
});

test('historial: deshacer y rehacer', () => {
  const h = new RasterHistory();
  let cur = solid(2, 2, [1, 1, 1, 255]);
  h.push(cur);
  cur = solid(2, 2, [2, 2, 2, 255]);
  assert.ok(h.canUndo && !h.canRedo);
  const back = h.undo(cur)!;
  assert.equal(back.data[0], 1);
  assert.ok(h.canRedo);
  const fwd = h.redo(back)!;
  assert.equal(fwd.data[0], 2);
  assert.equal(h.undo(solid(1, 1, [0, 0, 0, 0])) !== null, true);
});

test('historial: el tope de memoria descarta lo más antiguo', () => {
  const h = new RasterHistory(100);
  for (let i = 0; i < 10; i++) h.push(solid(4, 4, [i, 0, 0, 255])); // 64 bytes cada una
  let n = 0;
  let cur = solid(4, 4, [99, 0, 0, 255]);
  for (let r = h.undo(cur); r; r = h.undo(cur)) { cur = r; n++; }
  assert.ok(n <= 2 && n >= 1);
});

test('pressureFactor va de min a 1', () => {
  assert.ok(Math.abs(pressureFactor(0, { min: 0.2 }) - 0.2) < 1e-9);
  assert.equal(pressureFactor(1, { min: 0.2 }), 1);
  assert.ok(Math.abs(pressureFactor(0.5, { min: 0 }) - 0.5) < 1e-9);
  assert.equal(pressureFactor(0.3, null), 1);
});

test('tipAt interpola y devuelve 0 fuera', () => {
  const tip: Tip = { n: 2, alpha: new Float32Array([1, 0, 0, 1]) };
  assert.equal(tipAt(tip, -0.1, 0.5), 0);
  assert.ok(Math.abs(tipAt(tip, 0.25, 0.25) - 1) < 1e-6);
  assert.ok(Math.abs(tipAt(tip, 0.75, 0.25)) < 1e-6);
});

test('con presión baja el trazo es más fino y más transparente', () => {
  const draw = (p: number) => {
    const r = newRaster(40, 40);
    const s = new Stroke(r, { size: 20, hardness: 1, opacity: 1, color: [0, 0, 0], erase: false, pressureSize: { min: 0.2 }, pressureOpacity: { min: 0.1 } }, null);
    s.add(20, 20, p);
    let covered = 0;
    for (let i = 0; i < 1600; i++) if (r.data[i * 4 + 3] > 0) covered++;
    return { covered, centerAlpha: r.data[(20 * 40 + 20) * 4 + 3] };
  };
  const lo = draw(0.1);
  const hi = draw(1);
  assert.ok(lo.covered < hi.covered);
  assert.ok(lo.centerAlpha < hi.centerAlpha);
  assert.equal(hi.centerAlpha, 255);
});

test('una punta de imagen pinta su forma', () => {
  const r = newRaster(30, 30);
  const tip: Tip = { n: 4, alpha: new Float32Array(16).fill(1) };
  const s = new Stroke(r, { size: 10, hardness: 1, opacity: 1, color: [255, 0, 0], erase: false, tip }, null);
  s.add(15, 15);
  assert.equal(r.data[(15 * 30 + 15) * 4 + 3], 255);
  assert.equal(r.data[(2 * 30 + 2) * 4 + 3], 0);
});

test('bucketFill rellena la zona contigua y respeta la selección', () => {
  const r = solid(10, 10, [255, 255, 255, 255]);
  for (let y = 0; y < 10; y++) r.data.set([0, 0, 0, 255], (y * 10 + 5) * 4); // pared negra
  bucketFill(r, 1, 1, 10, true, [255, 0, 0], 1, null, 0);
  assert.deepEqual(Array.from(r.data.slice((1 * 10 + 1) * 4, (1 * 10 + 1) * 4 + 4)), [255, 0, 0, 255]);
  assert.deepEqual(Array.from(r.data.slice((1 * 10 + 8) * 4, (1 * 10 + 8) * 4 + 4)), [255, 255, 255, 255]);
  const r2 = solid(10, 10, [255, 255, 255, 255]);
  const sel = new Uint8Array(100);
  sel[0] = 255;
  bucketFill(r2, 0, 0, 10, true, [0, 0, 255], 1, sel, 0);
  assert.deepEqual(Array.from(r2.data.slice(0, 4)), [0, 0, 255, 255]);
  assert.deepEqual(Array.from(r2.data.slice(4, 8)), [255, 255, 255, 255]);
});

test('dilate engorda un píxel', () => {
  const m = new Uint8Array(25);
  m[12] = 255;
  const d = dilate(m, 5, 5, 1);
  assert.equal(d[11], 255);
  assert.equal(d[7], 255);
  assert.equal(d[6], 0);
});

test('la gota difumina un borde duro', () => {
  const r = newRaster(20, 20);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) r.data.set(x < 10 ? [0, 0, 0, 255] : [255, 255, 255, 255], (y * 20 + x) * 4);
  const before = r.data[(10 * 20 + 10) * 4];
  const s = new FingerStroke(r, { mode: 'blur', size: 16, strength: 1, hardness: 1 }, null);
  s.add(10, 10);
  s.add(10, 10.2);
  assert.ok(r.data[(10 * 20 + 10) * 4] < before);
  assert.ok(r.data[(10 * 20 + 9) * 4] > 0);
});

test('el dedo arrastra el color en la dirección del trazo', () => {
  const r = newRaster(40, 20);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 40; x++) r.data.set(x < 12 ? [255, 0, 0, 255] : [255, 255, 255, 255], (y * 40 + x) * 4);
  const s = new FingerStroke(r, { mode: 'smudge', size: 12, strength: 0.9, hardness: 1 }, null);
  for (let x = 8; x <= 30; x += 2) s.add(x, 10);
  assert.ok(r.data[(10 * 40 + 20) * 4 + 1] < 255);
});

test('la selección protege los píxeles de la gota', () => {
  const r = solid(10, 10, [255, 255, 255, 255]);
  r.data.set([0, 0, 0, 255], (5 * 10 + 4) * 4);
  const sel = new Uint8Array(100);
  new FingerStroke(r, { mode: 'blur', size: 8, strength: 1, hardness: 1 }, sel).add(5, 5);
  assert.equal(r.data[(5 * 10 + 4) * 4], 0);
});

test('tipFromRgba usa alfa, o la oscuridad si no hay transparencia', () => {
  const a = new Uint8ClampedArray([255, 255, 255, 128, 0, 0, 0, 0, 0, 0, 0, 255, 9, 9, 9, 255].slice(0, 16));
  // n = 2: con transparencia (hay un 0) se usa el alfa
  const t1 = tipFromRgba(a, 2);
  assert.ok(Math.abs(t1.alpha[0] - 128 / 255) < 1e-6);
  assert.equal(t1.alpha[1], 0);
  // sin transparencia: negro pinta, blanco no
  const opaque = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
  const t2 = tipFromRgba(opaque, 2);
  assert.equal(t2.alpha[0], 1);
  assert.equal(t2.alpha[1], 0);
});
