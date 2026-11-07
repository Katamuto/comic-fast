import { describe, expect, it } from 'vitest';
import { fitText, fontCss, familyCss, wrapText, type Measure } from './textLayout';
import { balloonGeometry } from './balloon';
import { hashString, rng, speedHorizPath, speedRadialPath } from './patterns';
import type { TextStyle } from '../model/types';

// Medidor falso: cada carácter mide 0.5 × tamaño de fuente.
const measure: Measure = (font) => {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]);
  return (s) => s.length * size * 0.5;
};
const style: TextStyle = {
  fontFamily: 'Comic Neue',
  fontSize: 20,
  color: '#000',
  bold: false,
  italic: false,
  align: 'center'
};

describe('texto', () => {
  const w10 = (s: string) => s.length * 10;

  it('parte por palabras y respeta saltos de línea', () => {
    expect(wrapText('hola mundo cruel', 110, w10)).toEqual(['hola mundo', 'cruel']);
    expect(wrapText('a\n\nb', 100, w10)).toEqual(['a', '', 'b']);
  });

  it('parte palabras demasiado largas', () => {
    const lines = wrapText('abcdefghij', 40, w10);
    expect(lines.join('')).toBe('abcdefghij');
    expect(lines.every((l) => l.length <= 4)).toBe(true);
  });

  it('fitText reduce la fuente hasta que quepa', () => {
    const text = 'Este es un texto bastante largo para una caja pequeña';
    const big = fitText(text, { w: 400, h: 400 }, style, measure);
    expect(big.fontSize).toBe(20);
    const small = fitText(text, { w: 120, h: 60 }, style, measure);
    expect(small.fontSize).toBeLessThan(20);
    expect(small.lines.length * small.lineHeight).toBeLessThanOrEqual(60 + 1e-9);
  });

  it('fitText termina aunque no quepa nunca', () => {
    const r = fitText('x '.repeat(500), { w: 30, h: 10 }, style, measure);
    expect(r.fontSize).toBe(8);
  });

  it('familyCss entrecomilla solo las fuentes con nombre', () => {
    expect(familyCss('Comic Neue')).toBe('"Comic Neue", sans-serif');
    expect(familyCss('serif')).toBe('serif, sans-serif');
    expect(fontCss({ fontFamily: 'Bangers', bold: true, italic: true }, 30)).toBe(
      'italic 700 30px "Bangers", sans-serif'
    );
  });
});

describe('globos', () => {
  const base = { w: 300, h: 180, strokeWidth: 4 };

  it('el globo de diálogo con cola fuera de la elipse genera cola', () => {
    const g = balloonGeometry({ ...base, style: 'speech', tailX: -60, tailY: 153 });
    expect(g.hasTail).toBe(true);
    expect(g.d.startsWith('M ')).toBe(true);
    expect(g.d.endsWith('Z')).toBe(true);
    expect(g.d).toContain(' L ');
    expect(g.tip).toEqual({ x: 90, y: 243 });
  });

  it('con la punta dentro de la elipse no hay cola', () => {
    const g = balloonGeometry({ ...base, style: 'speech', tailX: 0, tailY: 0 });
    expect(g.hasTail).toBe(false);
    expect(g.d).not.toContain(' L ');
  });

  it('el pensamiento añade 3 círculos decrecientes', () => {
    const g = balloonGeometry({ ...base, style: 'thought', tailX: -90, tailY: 160 });
    expect(g.dots).toHaveLength(3);
    expect(g.dots[0].r).toBeGreaterThan(g.dots[1].r);
    expect(g.dots[1].r).toBeGreaterThan(g.dots[2].r);
  });

  it('susurro usa guiones; grito y narración no tienen cola', () => {
    expect(balloonGeometry({ ...base, style: 'whisper', tailX: 0, tailY: 150 }).dashed).toBe(true);
    expect(balloonGeometry({ ...base, style: 'shout', tailX: 0, tailY: 150 }).hasTail).toBe(false);
    expect(balloonGeometry({ ...base, style: 'caption', tailX: 0, tailY: 150 }).hasTail).toBe(false);
  });

  it('la caja de texto queda dentro del globo', () => {
    for (const style of ['speech', 'thought', 'shout', 'whisper', 'caption'] as const) {
      const { textBox: t } = balloonGeometry({ ...base, style, tailX: 0, tailY: 0 });
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.x + t.w).toBeLessThanOrEqual(base.w);
      expect(t.y + t.h).toBeLessThanOrEqual(base.h);
    }
  });
});

describe('tramas', () => {
  it('el PRNG y el hash son deterministas', () => {
    const a = rng(hashString('obj1'));
    const b = rng(hashString('obj1'));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('los trazados de velocidad son estables y no vacíos', () => {
    const r1 = speedRadialPath(400, 300, 1, 7);
    expect(r1.length).toBeGreaterThan(100);
    expect(speedRadialPath(400, 300, 1, 7)).toBe(r1);
    expect(speedRadialPath(400, 300, 1, 8)).not.toBe(r1);
    expect(speedHorizPath(400, 300, 1, 7).length).toBeGreaterThan(50);
  });
});

import { gradientGeometry, fillRef, isGradient, DEFAULT_GRADIENT } from './paint';
import { panelPath } from './panelShape';
import { noiseParams, voronoiCells, hexToRgb } from './textures';
import { patternClass, needsRegion } from './patterns';
import { clearLibrary, patternFromFile, registerPattern } from '../resources/patternLib';

describe('degradados', () => {
  it('lineal a 0° va de izquierda a derecha por el centro', () => {
    const g = gradientGeometry({ ...DEFAULT_GRADIENT, angle: 0 }, 200, 100);
    if (g.kind !== 'linear') throw new Error('debía ser lineal');
    expect([g.x1, g.y1, g.x2, g.y2].map((v) => Math.round(v) + 0)).toEqual([0, 50, 200, 50]);
  });

  it('lineal a 90° va de arriba abajo', () => {
    const g = gradientGeometry({ ...DEFAULT_GRADIENT, angle: 90 }, 200, 100);
    if (g.kind !== 'linear') throw new Error('debía ser lineal');
    expect([g.x1, g.y1, g.x2, g.y2].map((v) => Math.round(v) + 0)).toEqual([100, 0, 100, 100]);
  });

  it('radial: el radio llega a la esquina más lejana', () => {
    const g = gradientGeometry({ ...DEFAULT_GRADIENT, kind: 'radial', cx: 0, cy: 0 }, 30, 40);
    if (g.kind !== 'radial') throw new Error('debía ser radial');
    expect(g.r).toBe(50);
  });

  it('fillRef distingue color y degradado', () => {
    expect(fillRef('#fff', 'g1')).toBe('#fff');
    expect(fillRef(DEFAULT_GRADIENT, 'g1')).toBe('url(#g1)');
    expect(isGradient('#fff')).toBe(false);
  });
});

describe('formas de viñeta', () => {
  it('rectángulo, elipse y polígono generan trazados cerrados', () => {
    const base = { w: 100, h: 50, points: [{ x: 0.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] };
    expect(panelPath({ ...base, shape: 'rect' })).toBe('M 0 0 L 100 0 L 100 50 L 0 50 Z');
    expect(panelPath({ ...base, shape: 'ellipse' })).toContain(' A 50 25 ');
    expect(panelPath({ ...base, shape: 'poly' })).toBe('M 50 0 L 100 50 L 0 50 Z');
  });
});

describe('texturas', () => {
  it('hexToRgb entiende #rgb y #rrggbb', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('nope')).toEqual([0, 0, 0]);
  });

  it('el ruido más grande tiene frecuencia menor', () => {
    const a = noiseParams('clouds', '#000000', 1, 5);
    const b = noiseParams('clouds', '#000000', 2, 5);
    expect(Number(b.baseFrequency)).toBeLessThan(Number(a.baseFrequency));
    expect(a.matrix.split(' ')).toHaveLength(20);
  });

  it('Voronoi: determinista, celdas dentro de la caja y cubriendo su área', () => {
    const w = 300;
    const h = 200;
    const cells = voronoiCells(w, h, 50, 3);
    expect(cells.length).toBeGreaterThan(10);
    expect(voronoiCells(w, h, 50, 3)).toEqual(cells);
    expect(voronoiCells(w, h, 50, 4)).not.toEqual(cells);

    let area = 0;
    for (const c of cells) {
      const pts = [...c.d.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(-0.1);
        expect(x).toBeLessThanOrEqual(w + 0.1);
        expect(y).toBeGreaterThanOrEqual(-0.1);
        expect(y).toBeLessThanOrEqual(h + 0.1);
      }
      // Fórmula del área de Gauss.
      let a = 0;
      pts.forEach(([x, y], i) => {
        const [nx, ny] = pts[(i + 1) % pts.length];
        a += x * ny - nx * y;
      });
      area += Math.abs(a) / 2;
    }
    expect(Math.abs(area - w * h) / (w * h)).toBeLessThan(0.01);
  });

  it('clasifica las tramas y texturas', () => {
    clearLibrary();
    for (const [f, t] of [
      ['t_dots.svg', '<svg viewBox="0 0 20 20"><circle r="3"/></svg>'],
      ['n_speedRadial.svg', '<svg viewBox="0 0 100 100"><path d="M0 0"/></svg>']
    ]) registerPattern(patternFromFile(f, t)!);
    expect(patternClass('dots')).toBe('tile');
    expect(patternClass('grain')).toBe('noise');
    expect(patternClass('voronoi')).toBe('cells');
    expect(needsRegion('grain')).toBe(false);
    expect(needsRegion('speedRadial')).toBe(true);
  });
});

import { wrapParagraphs, justifySpacing } from './textLayout';
describe('justificado', () => {
  const w10: Measure = () => (s) => s.length * 10;
  it('wrapParagraphs marca el final de cada párrafo', () => {
    const r = wrapParagraphs('hola mundo cruel\nfin', 110, w10(''));
    expect(r.lines).toEqual(['hola mundo', 'cruel', 'fin']);
    expect(r.last).toEqual([false, true, true]);
  });
  it('justifySpacing reparte el espacio sobrante entre los huecos', () => {
    expect(justifySpacing('hola mundo', 120, w10(''))).toBe(20); // 100 px de texto, 20 sobran, 1 hueco
    expect(justifySpacing('uno dos tres', 140, w10(''))).toBe(10); // 120 px, 20 sobran, 2 huecos
    expect(justifySpacing('palabra', 200, w10(''))).toBe(0);
    expect(justifySpacing('hola mundo', 50, w10(''))).toBe(0);
  });
  it('fitText con tamaño forzado no reduce y avisa del desborde', () => {
    const style = { fontFamily: 'x', fontSize: 40, color: '#000', bold: false, italic: false, align: 'left' } as never;
    const f = fitText('uno dos tres cuatro cinco seis', { w: 100, h: 50 }, style, w10, 1.2, 8, true);
    expect(f.fontSize).toBe(40);
    expect(f.overflow).toBe(true);
    const g = fitText('uno dos tres cuatro cinco seis', { w: 100, h: 50 }, style, w10);
    expect(g.fontSize).toBeLessThan(40);
  });
});
