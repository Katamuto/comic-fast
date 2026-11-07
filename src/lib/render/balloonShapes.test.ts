import { describe, expect, it } from 'vitest';
import { balloonGeometry, tailFrame, TAIL_STYLES } from './balloon';
import { cutPolygon, ellipseExitAngle, pointInPoly, polyBounds, rayHit, shapePoly, spanAt, type ShapeKind } from './balloonShapes';
import { fitContourText } from './contourText';
import { ellipsePoly } from './balloonShapes';
import { cloneWithNewIds } from '../model/scale';
import { mergeGroups, renderPlan, withLinkedTail } from '../model/balloonLinks';
import type { BalloonObj, Page, PageObject, TextStyle } from '../model/types';

const base = { w: 300, h: 180, strokeWidth: 4, tailX: -60, tailY: 150 };
const KINDS: ShapeKind[] = ['rounded', 'scallop', 'blob', 'angular', 'impact'];

describe('formas de globo nuevas', () => {
  for (const k of KINDS) {
    it(`${k}: el polígono cabe en la caja y es cerrado`, () => {
      const poly = shapePoly(k, 300, 180, 2);
      expect(poly.length).toBeGreaterThan(30);
      const b = polyBounds(poly);
      expect(b.minX).toBeGreaterThanOrEqual(-0.5);
      expect(b.maxX).toBeLessThanOrEqual(300.5);
      expect(b.minY).toBeGreaterThanOrEqual(-0.5);
      expect(b.maxY).toBeLessThanOrEqual(180.5);
      expect(pointInPoly({ x: 150, y: 90 }, poly)).toBe(true);
    });
    it(`${k}: es determinista`, () => {
      expect(shapePoly(k, 300, 180, 2)).toEqual(shapePoly(k, 300, 180, 2));
    });
  }
  it('los estilos con cola dibujan la cola y los demás no', () => {
    for (const style of ['rounded', 'scallop', 'blob', 'angular'] as const) {
      expect(TAIL_STYLES).toContain(style);
      const g = balloonGeometry({ ...base, style });
      expect(g.hasTail).toBe(true);
      expect(g.d).toContain(`${Math.round((150 - 60) * 100) / 100} ${150 + 90}`.slice(0, 0));
      expect(g.contour).not.toBeNull();
      expect(balloonGeometry({ ...base, style, tailX: 0, tailY: 0 }).hasTail).toBe(false);
    }
    expect(balloonGeometry({ ...base, style: 'impact' }).hasTail).toBe(false);
  });
  it('tailFrame existe para los estilos de polígono', () => {
    const fr = tailFrame({ ...base, style: 'rounded' });
    expect(fr).not.toBeNull();
    expect(fr!.len).toBeGreaterThan(10);
  });
  it('cutPolygon devuelve una base dentro del contorno', () => {
    const poly = shapePoly('rounded', 300, 180, 2);
    const hit = rayHit(poly, { x: 150, y: 90 }, { x: 0, y: 1 })!;
    const cut = cutPolygon(poly, hit.s, 20);
    expect(Math.abs(cut.p1.y - 178)).toBeLessThan(1);
    expect(cut.body.length).toBeGreaterThan(5);
  });
});

describe('origen de la cola', () => {
  it('con origen en el centro el ángulo coincide con el de siempre', () => {
    const a = ellipseExitAngle(0, 0, -60, 150, 100, 60);
    expect(a).toBeCloseTo(Math.atan2(150 / 60, -60 / 100), 6);
  });
  it('mover el origen cambia dónde sale la cola', () => {
    const a = ellipseExitAngle(0, 0, 0, 200, 100, 60);
    const b = ellipseExitAngle(60, 0, 0, 200, 100, 60);
    expect(Math.abs(a - b)).toBeGreaterThan(0.1);
  });
  it('en un polígono la cola parte del lado del origen', () => {
    const left = balloonGeometry({ ...base, style: 'rounded', tailX: 0, tailY: 150, tailOx: -80, tailOy: 0 });
    const right = balloonGeometry({ ...base, style: 'rounded', tailX: 0, tailY: 150, tailOx: 80, tailOy: 0 });
    expect(left.d).not.toBe(right.d);
  });
});

const ts: TextStyle = { fontFamily: 'sans-serif', fontSize: 24, color: '#000', bold: false, italic: false, align: 'center' };
const measure = () => (s: string) => s.length * 10;

describe('texto que sigue el contorno', () => {
  const circle = ellipsePoly(150, 90, 148, 88, 72);
  it('spanAt: el ancho es máximo en el centro y menor arriba', () => {
    const mid = spanAt(circle, 90)!;
    const top = spanAt(circle, 20)!;
    expect(mid.r - mid.l).toBeGreaterThan(top.r - top.l);
  });
  it('aprovecha mejor el espacio que una caja inscrita', () => {
    const text = 'Una frase bastante larga para llenar el globo redondo entero';
    const fit = fitContourText(text, circle, 6, ts, measure)!;
    expect(fit.lineRects!.length).toBe(fit.lines.length);
    expect(fit.overflow).toBe(false);
    // las líneas centrales son más anchas que las de los extremos
    const w = fit.lineRects!.map((r) => r.w);
    if (w.length >= 3) expect(Math.max(...w)).toBeGreaterThan(w[0]);
    // todo el texto está
    expect(fit.lines.join(' ').replace(/\s+/g, ' ')).toBe(text);
  });
  it('un margen mayor estrecha las líneas', () => {
    const a = fitContourText('Hola mundo', circle, 2, ts, measure)!;
    const b = fitContourText('Hola mundo', circle, 40, ts, measure)!;
    expect(b.lineRects![0].w).toBeLessThan(a.lineRects![0].w);
  });
  it('tamaño forzado: conserva el tamaño y avisa si no cabe', () => {
    const fit = fitContourText('palabra '.repeat(80), circle, 6, ts, measure, 1.2, 8, true)!;
    expect(fit.fontSize).toBe(24);
    expect(fit.overflow).toBe(true);
  });
});

function bal(id: string, x: number, o: Partial<BalloonObj> = {}): BalloonObj {
  return {
    id, type: 'balloon', x, y: 100, w: 200, h: 100, rotation: 0, style: 'speech', tailX: 0, tailY: 80, text: id,
    fill: '#fff', stroke: '#000', strokeWidth: 4, ...ts, ...o
  } as BalloonObj;
}

describe('globos encadenados', () => {
  it('modo cola: la punta toca el contorno del otro globo', () => {
    const a = bal('a', 0, { link: { to: 'b', mode: 'tail' } });
    const b = bal('b', 400);
    const byId = new Map<string, PageObject>([['a', a], ['b', b]]);
    const r = withLinkedTail(a, byId);
    // punta en coords de página: centro de a + (tailX, tailY); debe estar en el borde izquierdo de b (x≈400)
    const tipX = a.x + a.w / 2 + r.tailX;
    const tipY = a.y + a.h / 2 + r.tailY;
    expect(tipX).toBeGreaterThan(390);
    expect(tipX).toBeLessThan(412);
    expect(Math.abs(tipY - 150)).toBeLessThan(5);
  });
  it('sin enlace válido no cambia nada', () => {
    const a = bal('a', 0, { link: { to: 'zzz', mode: 'tail' } });
    expect(withLinkedTail(a, new Map())).toBe(a);
  });
  it('mergeGroups une en cadena y renderPlan dibuja por pasadas', () => {
    const a = bal('a', 0, { link: { to: 'b', mode: 'merge' } });
    const b = bal('b', 150, { link: { to: 'c', mode: 'merge' } });
    const c = bal('c', 300);
    const d = bal('d', 800);
    expect(mergeGroups([a, b, c, d])).toEqual([['a', 'b', 'c']]);
    const plan = renderPlan([a, b, c, d]);
    expect(plan.map((p) => `${p.obj.id}:${p.phase}`)).toEqual([
      'a:stroke', 'b:stroke', 'c:stroke', 'a:fill', 'b:fill', 'c:fill', 'a:text', 'b:text', 'c:text', 'd:all'
    ]);
  });
  it('sin fusiones el plan es el orden normal', () => {
    const plan = renderPlan([bal('a', 0), bal('b', 100)]);
    expect(plan.every((p) => p.phase === 'all')).toBe(true);
  });
  it('clonar una página reasigna los enlaces', () => {
    const page = { id: 'p', background: '#fff', objects: [bal('a', 0, { link: { to: 'b', mode: 'merge' } }), bal('b', 100)] } as unknown as Page;
    const c = cloneWithNewIds(page);
    const [a, b] = c.objects as BalloonObj[];
    expect(a.link!.to).toBe(b.id);
    expect(b.id).not.toBe('b');
  });
});
