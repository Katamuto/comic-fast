import { describe, expect, it } from 'vitest';
import { balloonGeometry, curveFromPoint, curveHandle, tailFrame } from './balloon';
import { FX_PRESETS, fxParams, hasFx, NEUTRAL_FX } from './imageFx';
import { parseFontFile } from './fontFiles';

const base = { w: 300, h: 180, strokeWidth: 4, tailX: -60, tailY: 153 };

describe('cola del globo: grosor y curvatura', () => {
  const nums = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

  it('sin parámetros nuevos la cola es la de siempre (recta)', () => {
    const g = balloonGeometry({ ...base, style: 'speech' });
    expect(g.d).toContain(' L ');
    expect(g.d).not.toContain(' Q ');
    const same = balloonGeometry({ ...base, style: 'speech', tailWidth: 1, tailCurve: 0 });
    expect(same.d).toBe(g.d);
  });

  it('una cola más fina tiene la base más estrecha', () => {
    const thin = balloonGeometry({ ...base, style: 'speech', tailWidth: 0.3 });
    const wide = balloonGeometry({ ...base, style: 'speech', tailWidth: 2 });
    // Los dos primeros números tras la «M» son p2; tras el arco, p1. Comparamos la distancia p1–p2.
    const gap = (d: string) => {
      const n = nums(d);
      const p2 = { x: n[0], y: n[1] };
      const p1 = { x: n[7], y: n[8] };
      return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    };
    expect(gap(thin.d)).toBeLessThan(gap(wide.d));
    expect(thin.tip).toEqual(wide.tip);
  });

  it('con curvatura la cola usa curvas y conserva la punta', () => {
    const g = balloonGeometry({ ...base, style: 'speech', tailCurve: 0.6 });
    expect(g.d).toContain(' Q ');
    expect(g.d.endsWith('Z')).toBe(true);
    expect(g.tip).toEqual({ x: 90, y: 243 });
    // El signo cambia el lado hacia donde se curva.
    expect(balloonGeometry({ ...base, style: 'speech', tailCurve: -0.6 }).d).not.toBe(g.d);
  });

  it('el tirador de curvatura y su inversa coinciden', () => {
    const o = { ...base, style: 'speech' as const };
    for (const c of [-0.8, -0.2, 0, 0.35, 1]) {
      const h = curveHandle({ ...o, tailCurve: c })!;
      expect(curveFromPoint(o, h)!).toBeCloseTo(c, 5);
    }
  });

  it('sin cola (punta dentro) no hay marco de cola', () => {
    expect(tailFrame({ ...base, style: 'speech', tailX: 0, tailY: 0 })).toBeNull();
    expect(tailFrame({ ...base, style: 'shout' })).toBeNull();
    expect(tailFrame({ ...base, style: 'speech' })).not.toBeNull();
  });

  it('el pensamiento: los círculos siguen la curva y se agrandan con el grosor', () => {
    const t = { ...base, style: 'thought' as const, tailX: -90, tailY: 160 };
    const straight = balloonGeometry(t);
    const curved = balloonGeometry({ ...t, tailCurve: 0.8 });
    expect(curved.dots).toHaveLength(3);
    expect(curved.dots[1]).not.toEqual(straight.dots[1]);
    const fat = balloonGeometry({ ...t, tailWidth: 2 });
    expect(fat.dots[0].r).toBeGreaterThan(straight.dots[0].r);
  });
});

describe('filtros de imagen', () => {
  it('lo neutro no hace nada', () => {
    expect(hasFx(undefined)).toBe(false);
    expect(hasFx({})).toBe(false);
    expect(hasFx(NEUTRAL_FX)).toBe(false);
    const p = fxParams(NEUTRAL_FX);
    expect(Object.values(p.steps).some(Boolean)).toBe(false);
    expect(p.slope).toBe(1);
    expect(p.intercept).toBe(0);
    expect(p.saturate).toBe(1);
  });

  it('cualquier ajuste activa el filtro', () => {
    for (const fx of [{ brightness: 1 }, { contrast: -5 }, { saturation: 10 }, { hue: 3 }, { sepia: 1 }, { blur: 0.5 }, { invert: true }, { tint: '#f00' }]) {
      expect(hasFx(fx)).toBe(true);
    }
  });

  it('contraste y brillo: pendiente y desplazamiento', () => {
    expect(fxParams({ contrast: 50 }).slope).toBe(2);
    expect(fxParams({ contrast: 50 }).intercept).toBe(-0.5);
    expect(fxParams({ contrast: -100 }).slope).toBe(0); // todo gris medio
    expect(fxParams({ contrast: -100 }).intercept).toBe(0.5);
    expect(fxParams({ brightness: 100 }).intercept).toBe(0.5);
    expect(fxParams({ brightness: -100 }).intercept).toBe(-0.5);
  });

  it('saturación: −100 = grises, +100 = doble', () => {
    expect(fxParams({ saturation: -100 }).saturate).toBe(0);
    expect(fxParams({ saturation: 100 }).saturate).toBe(2);
  });

  it('sepia total coincide con la matriz clásica y 0 no genera matriz', () => {
    expect(fxParams({ sepia: 0 }).sepiaMatrix).toBeNull();
    const m = fxParams({ sepia: 100 }).sepiaMatrix!.split(' ').map(Number);
    expect(m).toHaveLength(20);
    expect(m.slice(0, 3)).toEqual([0.393, 0.769, 0.189]);
  });

  it('limita los valores fuera de rango', () => {
    expect(fxParams({ brightness: 999 }).intercept).toBe(0.5);
    expect(fxParams({ hue: 500 }).hue).toBe(180);
    expect(fxParams({ blur: -3 }).steps.blur).toBe(false);
  });

  it('los ajustes rápidos están completos', () => {
    expect(FX_PRESETS[0].id).toBe('none');
    for (const p of FX_PRESETS.slice(1)) expect(hasFx(p.fx)).toBe(true);
  });
});

describe('nombres de archivos de fuentes', () => {
  it('nombre con palabras', () => {
    expect(parseFontFile('Patrick Hand.woff2')).toMatchObject({ family: 'Patrick Hand', weight: '400', style: 'normal', format: 'woff2' });
    expect(parseFontFile('Patrick Hand Bold.woff2')).toMatchObject({ family: 'Patrick Hand', weight: '700', style: 'normal' });
    expect(parseFontFile('Patrick Hand Italic.woff2')).toMatchObject({ family: 'Patrick Hand', weight: '400', style: 'italic' });
    expect(parseFontFile('Patrick Hand Bold Italic.woff2')).toMatchObject({ weight: '700', style: 'italic' });
  });

  it('estilo de Google Fonts con guion', () => {
    expect(parseFontFile('PatrickHand-Regular.ttf')).toMatchObject({ family: 'Patrick Hand', weight: '400', format: 'truetype', mime: 'font/ttf' });
    expect(parseFontFile('PatrickHand-BoldItalic.ttf')).toMatchObject({ family: 'Patrick Hand', weight: '700', style: 'italic' });
    expect(parseFontFile('Roboto-Italic.otf')).toMatchObject({ family: 'Roboto', style: 'italic', format: 'opentype' });
  });

  it('acepta rutas y rechaza lo que no es una fuente', () => {
    expect(parseFontFile('../../assets/fonts/Bangers.woff')?.family).toBe('Bangers');
    expect(parseFontFile('../../assets/fonts/Bangers.woff')?.format).toBe('woff');
    expect(parseFontFile('README.txt')).toBeNull();
    expect(parseFontFile('sinextension')).toBeNull();
  });

  it('un nombre que solo es una palabra de estilo no se vacía', () => {
    expect(parseFontFile('Bold.ttf')?.family).toBe('Bold');
  });
});
