import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { patternFromFile, recolorBlack } from '../resources/patternLib';
import { BLEND_MODES, blendCss, isBlendMode } from './blend';
import { outsidePage } from '../model/geometry';
import { CONTENT_REF, reorderIds } from '../model/order';
import { drawOrder, pageTokens, reorderStyle, styleSplit, styleStack } from '../model/style';
import { newDoc, newStyle, panel, STYLE_ID } from '../model/defaults';
import { usedAssetIds } from '../model/scale';
import { decodeProject, encodeProject } from '../io/cfast';
import type { FontData, Page, PageObject } from '../model/types';

describe('SVG propios: el negro pasa a currentColor', () => {
  it('estilo de Inkscape', () => {
    const out = recolorBlack('<path style="fill:#000000;fill-opacity:1;stroke:none" d="M0 0"/>');
    expect(out).toContain('fill:currentColor;fill-opacity:1;stroke:none');
  });
  it('atributos fill/stroke en negro, en cualquier forma', () => {
    expect(recolorBlack('<path fill="#000" d=""/>')).toContain('fill="currentColor"');
    expect(recolorBlack("<path fill='black' d=''/>")).toContain("fill='currentColor'");
    expect(recolorBlack('<path stroke="rgb(0,0,0)" d=""/>')).toContain('stroke="currentColor"');
    expect(recolorBlack('<path fill="#111111" d=""/>')).toContain('fill="currentColor"'); // casi negro
  });
  it('respeta los demás colores, none y las propiedades parecidas', () => {
    const src = '<g fill="#ff0000" stroke="none" style="stroke-width:4;fill-opacity:.5"><path fill="url(#a)"/></g>';
    expect(recolorBlack(src)).toBe(src);
    expect(recolorBlack('<path fill="#00000080" d=""/>')).toContain('#00000080');
  });
  it('patternFromFile lo aplica al leer un SVG', () => {
    const p = patternFromFile('n_Silueta.svg', '<svg viewBox="0 0 10 10"><path style="fill:#000000" d="M0 0h10v10z"/></svg>');
    expect(p?.inner).toContain('fill:currentColor');
    expect(p?.tileable).toBe(false);
  });
});

describe('modos de fusión', () => {
  it('normal no añade nada; los demás devuelven el valor CSS', () => {
    expect(blendCss(undefined)).toBeUndefined();
    expect(blendCss('normal')).toBeUndefined();
    expect(blendCss('multiply')).toBe('multiply');
    expect(blendCss('inventado')).toBeUndefined();
    expect(isBlendMode('color-dodge')).toBe(true);
    expect(isBlendMode('divide')).toBe(false);
  });
  it('hay traducción de cada modo en todos los idiomas', () => {
    const dir = join(__dirname, '..', '..', 'locales');
    for (const lang of ['es', 'en', 'fr', 'pt', 'ja', 'ko', 'zh']) {
      const d = JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8')) as Record<string, string>;
      for (const m of BLEND_MODES) expect(d[`blend.${m}`], `${lang} blend.${m}`).toBeTruthy();
    }
  });
});

describe('objetos fuera de la página', () => {
  const box = { x: 0, y: 0, w: 100, h: 50, rotation: 0 };
  it('dentro, tocando el borde o asomando un poco: no está fuera', () => {
    expect(outsidePage({ ...box, x: 10, y: 10 }, 1000, 1500)).toBe(false);
    expect(outsidePage({ ...box, x: 950, y: 10 }, 1000, 1500)).toBe(false);
    expect(outsidePage({ ...box, x: -60, y: 10 }, 1000, 1500)).toBe(false);
  });
  it('por completo fuera: sí', () => {
    expect(outsidePage({ ...box, x: -101, y: 10 }, 1000, 1500)).toBe(true);
    expect(outsidePage({ ...box, x: 1001, y: 10 }, 1000, 1500)).toBe(true);
    expect(outsidePage({ ...box, x: 10, y: 1600 }, 1000, 1500)).toBe(true);
  });
  it('tiene en cuenta el giro', () => {
    // Barra larga vertical girada 90°: su centro está dentro y ocupa la página aunque x,y queden fuera.
    const bar = { x: -60, y: 600, w: 300, h: 20, rotation: 90 };
    expect(outsidePage(bar, 1000, 1500)).toBe(false);
  });
});

describe('orden de apilamiento', () => {
  it('reorderIds: extremos y pasos', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(reorderIds(ids, new Set(['b']), 'front')).toEqual(['a', 'c', 'd', 'b']);
    expect(reorderIds(ids, new Set(['c']), 'back')).toEqual(['c', 'a', 'b', 'd']);
    expect(reorderIds(ids, new Set(['b']), 'forward')).toEqual(['a', 'c', 'b', 'd']);
    expect(reorderIds(ids, new Set(['c']), 'backward')).toEqual(['a', 'c', 'b', 'd']);
    expect(reorderIds(ids, new Set(['d']), 'forward')).toEqual(ids);
  });
});

describe('página de estilo', () => {
  const obj = (id: string, over?: boolean): PageObject => ({ ...panel({ x: 0, y: 0, w: 10, h: 10 }), id, ...(over ? { over: true } : {}) }) as PageObject;
  const style = (...os: PageObject[]): Page => ({ ...newStyle(), objects: os });

  it('newDoc trae una página de estilo vacía', () => {
    const d = newDoc();
    expect(d.style?.id).toBe(STYLE_ID);
    expect(d.style?.objects).toEqual([]);
  });

  it('separa lo que va por debajo y por encima del contenido, cada grupo en su orden', () => {
    const s = style(obj('a'), obj('b', true), obj('c'), obj('d', true));
    const { below, above } = styleSplit(s);
    expect(below.map((o) => o.id)).toEqual(['a', 'c']);
    expect(above.map((o) => o.id)).toEqual(['b', 'd']);
    expect(drawOrder(s, true).map((o) => o.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(drawOrder(s, false).map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(styleStack(s)).toEqual(['a', 'c', CONTENT_REF, 'b', 'd']);
  });

  it('subir y bajar cruza la referencia del contenido', () => {
    const s = style(obj('a'), obj('b', true));
    // «b» está encima; un paso hacia atrás lo deja debajo de la referencia.
    let r = reorderStyle(s, new Set(['b']), 'backward');
    expect(r.over).toEqual({ a: false, b: false });
    expect(r.order).toEqual(['a', 'b']);
    // «a» está debajo; llevarlo al frente lo pone encima de la referencia y de «b».
    r = reorderStyle(s, new Set(['a']), 'front');
    expect(r.over).toEqual({ a: true, b: true });
    expect(r.order).toEqual(['b', 'a']);
    // «a» hacia adelante: salta justo encima de la referencia.
    r = reorderStyle(s, new Set(['a']), 'forward');
    expect(r.over).toEqual({ a: true, b: true });
    expect(r.order).toEqual(['a', 'b']);
  });

  it('{n} y {total} se sustituyen en los textos', () => {
    expect(pageTokens('Página {n} de {total}', 3, 12)).toBe('Página 3 de 12');
    expect(pageTokens('{N}/{Total}', 1, 2)).toBe('1/2');
    expect(pageTokens('sin marcas', 1, 2)).toBe('sin marcas');
  });

  it('las imágenes de la página de estilo cuentan como usadas', () => {
    const img = { id: 'o1', type: 'image', x: 0, y: 0, w: 10, h: 10, rotation: 0, assetId: 'logo', opacity: 1 } as PageObject;
    expect([...usedAssetIds([newStyle(), { ...newStyle(), objects: [img] }])]).toEqual(['logo']);
  });

  it('se guarda y se recupera con el proyecto (junto a las fuentes importadas)', () => {
    const doc = newDoc('Prueba');
    doc.style = style(obj('m', true));
    const font: FontData = {
      id: 'f1',
      name: 'Mi Fuente Bold.ttf',
      family: 'Mi Fuente',
      weight: '700',
      style: 'normal',
      mime: 'font/ttf',
      bytes: new Uint8Array([0, 1, 0, 0, 9, 9])
    };
    const back = decodeProject(encodeProject(doc, {}, [font]));
    expect(back.doc.style?.objects.map((o) => o.id)).toEqual(['m']);
    expect(back.doc.style?.objects[0].over).toBe(true);
    expect(back.fonts).toHaveLength(1);
    expect(back.fonts[0]).toMatchObject({ family: 'Mi Fuente', weight: '700', style: 'normal', mime: 'font/ttf' });
    expect([...back.fonts[0].bytes]).toEqual([0, 1, 0, 0, 9, 9]);
  });

  it('un proyecto anterior (sin estilo ni fuentes) se abre igual', () => {
    const doc = newDoc();
    delete doc.style;
    const back = decodeProject(encodeProject(doc, {}));
    expect(back.doc.style).toBeUndefined();
    expect(back.fonts).toEqual([]);
  });
});

import { balloonGeometry, jaggedPath } from './balloon';

describe('globo dentado (ejemplo de la guía)', () => {
  it('el trazado es estable y no se sale de su caja', () => {
    const d = jaggedPath(300, 180, 2, 12);
    expect(d).toBe(jaggedPath(300, 180, 2, 12));
    expect(d.startsWith('M ') && d.endsWith('Z')).toBe(true);
    const nums = [...d.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(nums.length).toBeGreaterThan(20);
    for (const [x, y] of nums) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(300);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(180);
    }
  });
  it('balloonGeometry lo conoce y no tiene cola', () => {
    const g = balloonGeometry({ style: 'jagged', w: 320, h: 190, tailX: 0, tailY: 0, strokeWidth: 4 });
    expect(g.hasTail).toBe(false);
    expect(g.d.length).toBeGreaterThan(100);
    expect(g.textBox.w).toBeGreaterThan(100);
  });
});
