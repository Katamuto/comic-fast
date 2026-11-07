import { describe, expect, it } from 'vitest';
import {
  aabb,
  coverLimits,
  coverRect,
  fitInside,
  normalizeAngle,
  rectsIntersect,
  resizeBox,
  snapTo,
  toLocal,
  toPage
} from './geometry';

const close = (a: number, b: number, d = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('geometría', () => {
  it('toLocal y toPage son inversas', () => {
    const o = { x: 100, y: 50, w: 200, h: 80, rotation: 37 };
    const p = { x: 180, y: 120 };
    const back = toPage(o, toLocal(o, p));
    close(back.x, p.x);
    close(back.y, p.y);
  });

  it('toLocal de la esquina sup. izq. sin giro es (-w/2, -h/2)', () => {
    const o = { x: 10, y: 20, w: 100, h: 60, rotation: 0 };
    const l = toLocal(o, { x: 10, y: 20 });
    close(l.x, -50);
    close(l.y, -30);
  });

  it('aabb de un rectángulo girado 90° intercambia ancho y alto', () => {
    const b = aabb({ x: 0, y: 0, w: 100, h: 40, rotation: 90 });
    close(b.w, 40);
    close(b.h, 100);
    // sigue centrado en (50, 20)
    close(b.x + b.w / 2, 50);
    close(b.y + b.h / 2, 20);
  });

  it('normalizeAngle', () => {
    expect(normalizeAngle(190)).toBe(-170);
    expect(normalizeAngle(-190)).toBe(170);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(180)).toBe(180);
  });

  it('snapTo y rectsIntersect', () => {
    expect(snapTo(47, 20)).toBe(40);
    expect(snapTo(51, 20)).toBe(60);
    expect(snapTo(51, 0)).toBe(51);
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(rectsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });

  describe('resizeBox', () => {
    it('arrastrar el tirador SE sin giro mantiene fija la esquina NO', () => {
      const o = { x: 100, y: 100, w: 200, h: 100, rotation: 0 };
      // puntero local = esquina destino relativa al centro (200,150): destino página (400,300)
      const local = toLocal(o, { x: 400, y: 300 });
      const b = resizeBox(o, 1, 1, local, false);
      close(b.x, 100);
      close(b.y, 100);
      close(b.w, 300);
      close(b.h, 200);
    });

    it('con giro el borde opuesto no se mueve', () => {
      const o = { x: 100, y: 100, w: 200, h: 100, rotation: 30 };
      const fixed = toPage(o, { x: -100, y: -50 }); // esquina NO en página
      const target = toPage(o, { x: 180, y: 90 }); // nuevo SE
      const b = resizeBox(o, 1, 1, toLocal(o, target), false);
      const after = toPage({ ...b, rotation: 30 }, { x: -b.w / 2, y: -b.h / 2 });
      close(after.x, fixed.x, 1e-6);
      close(after.y, fixed.y, 1e-6);
      close(b.w, 280);
      close(b.h, 140);
    });

    it('conserva la proporción en las esquinas si se pide', () => {
      const o = { x: 0, y: 0, w: 200, h: 100, rotation: 0 };
      const b = resizeBox(o, 1, 1, toLocal(o, { x: 400, y: 120 }), true);
      close(b.w / b.h, 2);
    });

    it('respeta el tamaño mínimo', () => {
      const o = { x: 0, y: 0, w: 200, h: 100, rotation: 0 };
      const b = resizeBox(o, 1, 0, { x: -500, y: 0 }, false, 12);
      expect(b.w).toBe(12);
      close(b.x, 0);
    });
  });

  describe('imagen que cubre la viñeta', () => {
    it('sin zoom cubre exactamente por el lado limitante y centra', () => {
      const r = coverRect(1000, 500, 200, 200, 1, 0, 0);
      close(r.h, 200);
      close(r.w, 400);
      close(r.x, -100);
      close(r.y, 0);
    });

    it('limita el desplazamiento para no dejar huecos', () => {
      const r = coverRect(1000, 500, 200, 200, 1, 9999, 9999);
      close(r.x, 0); // máximo: el borde izquierdo de la imagen toca la viñeta
      close(r.y, 0);
      const lim = coverLimits(1000, 500, 200, 200, 1);
      close(lim.maxX, 100);
      close(lim.maxY, 0);
    });

    it('un zoom menor que 1 se trata como 1', () => {
      const a = coverRect(100, 100, 100, 100, 0.2, 0, 0);
      close(a.w, 100);
    });
  });

  it('fitInside no agranda', () => {
    expect(fitInside(100, 50, 400, 400)).toEqual({ w: 100, h: 50 });
    const r = fitInside(800, 400, 200, 200);
    close(r.w, 200);
    close(r.h, 100);
  });
});

import { scaleLayers } from './geometry';
describe('scaleLayers', () => {
  it('escala imágenes con el factor mayor y desplaza el centro', () => {
    const out = scaleLayers([{ type: 'image', x: 10, y: 20, scale: 1 }, { type: 'pattern' }] as never[], 2, 1.5) as never as { x: number; y: number; scale: number; type: string }[];
    expect(out[0].scale).toBe(2);
    expect(out[0].x).toBe(20);
    expect(out[0].y).toBe(30);
    expect(out[1].type).toBe('pattern');
  });
  it('sin cambio devuelve lo mismo', () => {
    const l = [{ type: 'image', x: 1, y: 1, scale: 1 }];
    expect(scaleLayers(l, 1, 1)).toBe(l);
  });
});
