import { describe, expect, it } from 'vitest';
import {
  coverScale,
  containScale,
  ellipsePoints,
  nearestEdge,
  normalizePoly,
  panelContains,
  panelWithPoints,
  pointInPolygon,
  pointsPx,
  unitSquare
} from './panelGeometry';
import { toPage } from './geometry';
import { panel, imageLayer } from './defaults';
import type { PanelObj } from './types';

const mk = (o: Partial<PanelObj> = {}): PanelObj =>
  ({ id: 'p', ...panel({ x: 100, y: 50, w: 200, h: 100 }), ...o }) as PanelObj;

const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6);

describe('polígonos', () => {
  it('pointInPolygon distingue dentro y fuera (también en cóncavos)', () => {
    const sq = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ];
    expect(pointInPolygon({ x: 5, y: 5 }, sq)).toBe(true);
    expect(pointInPolygon({ x: 11, y: 5 }, sq)).toBe(false);
    const L = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 10 },
      { x: 0, y: 10 }
    ];
    expect(pointInPolygon({ x: 7, y: 7 }, L)).toBe(false);
    expect(pointInPolygon({ x: 2, y: 7 }, L)).toBe(true);
  });

  it('panelContains: rectángulo, elipse y polígono', () => {
    expect(panelContains(mk(), { x: 99, y: 49 })).toBe(true);
    expect(panelContains(mk(), { x: 101, y: 0 })).toBe(false);
    const e = mk({ shape: 'ellipse' });
    expect(panelContains(e, { x: 0, y: 0 })).toBe(true);
    expect(panelContains(e, { x: 95, y: 45 })).toBe(false); // esquina de la caja
    const tri = mk({ shape: 'poly', points: [{ x: 0.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] });
    expect(panelContains(tri, { x: 0, y: 40 })).toBe(true);
    expect(panelContains(tri, { x: -90, y: -40 })).toBe(false);
  });

  it('ellipsePoints genera n puntos dentro de la caja unidad', () => {
    const pts = ellipsePoints(12);
    expect(pts).toHaveLength(12);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(-1e-9);
      expect(p.x).toBeLessThanOrEqual(1 + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(-1e-9);
      expect(p.y).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('nearestEdge encuentra la arista y el punto proyectado', () => {
    const hit = nearestEdge(pointsPx(unitSquare(), 100, 100), { x: 50, y: 4 })!;
    expect(hit.index).toBe(0);
    near(hit.dist, 4);
    near(hit.point.x, 50);
    near(hit.point.y, 0);
  });
});

describe('normalizePoly', () => {
  it('los vértices no se mueven en la página aunque la viñeta esté girada', () => {
    for (const rotation of [0, 30, 90, -70]) {
      const o = mk({ rotation });
      // Se arrastra el vértice 2 (esquina inferior derecha) hacia fuera de la caja.
      const px = pointsPx(unitSquare(), o.w, o.h);
      const before = px.map((p) => toPage(o, { x: p.x - o.w / 2, y: p.y - o.h / 2 }));
      px[2] = { x: o.w + 60, y: o.h + 20 };
      const n = normalizePoly(o, px);
      const moved = { ...o, ...n.box };
      const after = n.points.map((p) => toPage(moved, { x: (p.x - 0.5) * n.box.w, y: (p.y - 0.5) * n.box.h }));
      // Los vértices no movidos siguen en el mismo sitio de la página.
      for (const i of [0, 1, 3]) {
        near(after[i].x, before[i].x);
        near(after[i].y, before[i].y);
      }
      // Y el movido está donde se pidió.
      const want = toPage(o, { x: px[2].x - o.w / 2, y: px[2].y - o.h / 2 });
      near(after[2].x, want.x);
      near(after[2].y, want.y);
      // La caja envuelve justo la forma.
      expect(Math.min(...n.points.map((p) => p.x))).toBe(0);
      expect(Math.max(...n.points.map((p) => p.x))).toBe(1);
    }
  });

  it('respeta un tamaño mínimo', () => {
    const o = mk();
    const n = normalizePoly(o, [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 }
    ]);
    expect(n.box.w).toBe(12);
    expect(n.box.h).toBe(12);
  });

  it('panelWithPoints compensa las capas de imagen para que no se muevan', () => {
    const o = mk({ layers: [{ id: 'l1', ...imageLayer('a', 1, { x: 10, y: -5 }) } as PanelObj['layers'][number]] });
    const px = pointsPx(unitSquare(), o.w, o.h);
    px[0] = { x: -40, y: -10 };
    const patch = panelWithPoints(o, px) as { x: number; y: number; w: number; h: number; layers: { x: number; y: number }[] };
    // Posición de página del centro de la imagen, antes y después.
    const before = toPage(o, { x: 10, y: -5 });
    const after = toPage({ ...o, ...patch, rotation: 0 }, { x: patch.layers[0].x, y: patch.layers[0].y });
    near(after.x, before.x);
    near(after.y, before.y);
  });
});

describe('escalas de imagen', () => {
  it('cubrir llena la caja y encajar cabe entera', () => {
    near(coverScale(400, 200, 100, 100), 0.5);
    near(containScale(400, 200, 100, 100), 0.25);
  });
});
