import { describe, expect, it } from 'vitest';
import { colorAlpha, colorHex, colorRgb, composeColor, parseColor } from './color';
import { gradientGeometry, gradientGuides, moveGuide, resetGuides } from './paint';
import { noiseParams } from './textures';
import { clearLibrary, parsePatternName, parseSvg, patternFromFile, registerPattern, registerTexture, textureFromFile, IMG_PREFIX } from '../resources/patternLib';
import { listPatterns, listTextures, patternClass, tileDims, needsRegion, usesSeed } from './patterns';
import { allNames, pickName, type NamesFile } from '../i18n/core';
import { buildStock } from '../resources/stockTree';
import { parseNotices, localizedText, noticesSignature } from '../app/notices';
import type { Gradient } from '../model/types';

describe('colores con alfa', () => {
  it('separa y une color y transparencia', () => {
    expect(parseColor('#ff8000')).toEqual({ hex: '#ff8000', alpha: 1 });
    expect(parseColor('#ff800080')).toEqual({ hex: '#ff8000', alpha: 0.5 });
    expect(parseColor('#f80')).toEqual({ hex: '#ff8800', alpha: 1 });
    expect(parseColor('none').alpha).toBe(0);
    expect(parseColor('basura')).toEqual({ hex: '#000000', alpha: 1 });
    expect(composeColor('#ff8000', 1)).toBe('#ff8000');
    expect(composeColor('#ff8000', 0)).toBe('#ff800000');
    expect(composeColor('#ff8000', 0.5)).toBe('#ff800080');
    expect(colorAlpha(composeColor('#123456', 0.25))).toBeCloseTo(0.25, 1);
    expect(colorHex('#12345678')).toBe('#123456');
    expect(colorRgb('#ff800080')).toEqual([255, 128, 0]);
  });

  it('ida y vuelta sin perder el color', () => {
    for (const a of [0, 0.1, 0.5, 0.9, 1]) {
      const c = composeColor('#abcdef', a);
      expect(colorHex(c)).toBe('#abcdef');
      expect(Math.abs(colorAlpha(c) - a)).toBeLessThan(0.01);
    }
  });

  it('el ruido respeta la transparencia del color y el parámetro de intensidad', () => {
    const solid = noiseParams('grain', '#000000', 1, 1).matrix.split(' ');
    const half = noiseParams('grain', '#00000080', 1, 1).matrix.split(' ');
    expect(Math.abs(Number(half[15]))).toBeLessThan(Math.abs(Number(solid[15])));
    const more = noiseParams('clouds', '#000000', 1, 1, 0.8).matrix.split(' ');
    const less = noiseParams('clouds', '#000000', 1, 1, 0.2).matrix.split(' ');
    expect(Number(more[19])).toBeGreaterThan(Number(less[19]));
    expect(noiseParams('streaks', '#000', 1, 1).baseFrequency).toContain(' ');
  });
});

describe('guías de degradado', () => {
  const lin: Gradient = { kind: 'linear', c1: '#000', c2: '#fff', angle: 90, cx: 0.5, cy: 0.5 };
  const rad: Gradient = { kind: 'radial', c1: '#000', c2: '#fff', angle: 0, cx: 0.5, cy: 0.5 };

  it('sin guías salen del ángulo (igual que antes)', () => {
    const g = gradientGeometry(lin, 200, 100);
    expect(g).toMatchObject({ kind: 'linear', x1: 100, x2: 100 });
    const { p1, p2 } = gradientGuides(lin, 200, 100);
    expect(p1.x).toBeCloseTo(0.5, 3);
    expect(p1.y).toBeCloseTo(0, 3);
    expect(p2.y).toBeCloseTo(1, 3);
  });

  it('con guías mandan las guías: lineal = inicio/fin, radial = centro/radio', () => {
    const g1 = moveGuide(lin, 'p2', { x: 1, y: 0 }, 200, 100);
    expect(gradientGeometry(g1, 200, 100)).toMatchObject({ x2: 200, y2: 0 });
    const r0 = gradientGeometry(rad, 200, 100);
    const g2 = moveGuide(rad, 'p2', { x: 0.5, y: 0.5 + 40 / 100 }, 200, 100);
    const r1 = gradientGeometry(g2, 200, 100);
    expect(r0.kind).toBe('radial');
    expect(r1).toMatchObject({ kind: 'radial', cx: 100, cy: 50 });
    expect((r1 as { r: number }).r).toBeCloseTo(40, 0);
  });

  it('mover una guía conserva la otra y resetGuides vuelve al ángulo', () => {
    const a = moveGuide(lin, 'p1', { x: 0.1, y: 0.2 }, 200, 100);
    const orig = gradientGuides(lin, 200, 100);
    expect(a.p2).toEqual({ x: Math.round(orig.p2.x * 1000) / 1000 === orig.p2.x ? orig.p2.x : a.p2!.x, y: a.p2!.y });
    expect(a.p1).toEqual({ x: 0.1, y: 0.2 });
    const back = resetGuides(a);
    expect(back.p1).toBeUndefined();
    expect(back.p2).toBeUndefined();
    expect(back.angle).toBe(90);
  });
});

describe('tramas SVG de carpeta', () => {
  it('el código del nombre indica si es tileable y no se muestra', () => {
    expect(parsePatternName('t_Puntos.svg')).toEqual({ id: 'Puntos', tileable: true });
    expect(parsePatternName('n_Rayos.svg')).toEqual({ id: 'Rayos', tileable: false });
    expect(parsePatternName('N_Rayos.svg').tileable).toBe(false);
    expect(parsePatternName('Puntos.svg')).toEqual({ id: 'Puntos', tileable: true });
    expect(parsePatternName('dir/t_a_b.svg')).toEqual({ id: 'a_b', tileable: true });
  });

  it('lee viewBox, preserveAspectRatio y quita scripts y eventos', () => {
    const p = parseSvg('<svg xmlns="x" viewBox="0 0 30 40" preserveAspectRatio="none"><script>alert(1)</script><circle onclick="x()" r="2"/></svg>')!;
    expect(p.vb).toEqual({ x: 0, y: 0, w: 30, h: 40 });
    expect(p.par).toBe('none');
    expect(p.inner).not.toContain('script');
    expect(p.inner).not.toContain('onclick');
    expect(p.inner).toContain('<circle');
    expect(parseSvg('<svg width="50" height="20"></svg>')!.vb).toMatchObject({ w: 50, h: 20 });
    expect(parseSvg('no es svg')).toBeNull();
  });

  it('se registran, se clasifican y su escala fija el tamaño del mosaico', () => {
    clearLibrary();
    registerPattern(patternFromFile('t_dots.svg', '<svg viewBox="0 0 20 10"><circle r="3"/></svg>')!);
    registerPattern(patternFromFile('n_rays.svg', '<svg viewBox="0 0 100 100"><path d="M0 0"/></svg>')!);
    registerTexture(textureFromFile('papel.png', '/papel.png'));
    expect(listPatterns().map((p) => [p.kind, p.tiled])).toEqual([
      ['dots', true],
      ['rays', false]
    ]);
    expect(patternClass('dots')).toBe('tile');
    expect(patternClass('rays')).toBe('figure');
    expect(patternClass(IMG_PREFIX + 'papel')).toBe('image');
    expect(patternClass('no-existe')).toBe('none');
    expect(patternClass(IMG_PREFIX + 'no-existe')).toBe('none');
    expect(needsRegion('dots') && needsRegion('rays') && needsRegion(IMG_PREFIX + 'papel')).toBe(true);
    expect(tileDims('dots', 1)).toEqual({ w: 20, h: 10 });
    expect(tileDims('dots', 2)).toEqual({ w: 40, h: 20 });
    const kinds = listTextures().map((t) => t.kind);
    expect(kinds).toContain('grain');
    expect(kinds).toContain(IMG_PREFIX + 'papel');
    expect(usesSeed('voronoi')).toBe(true);
    expect(usesSeed('dots')).toBe(false);
    clearLibrary();
  });
});

describe('nombres traducidos', () => {
  it('pickName: idioma → base → inglés → reserva', () => {
    const n = { es: 'Gato', en: 'Cat', pt: 'Gato (pt)' };
    expect(pickName(n, 'es', 'x')).toBe('Gato');
    expect(pickName(n, 'pt-BR', 'x')).toBe('Gato (pt)');
    expect(pickName(n, 'ja', 'x')).toBe('Cat');
    expect(pickName({ es: 'Gato' }, 'ja', 'carpeta')).toBe('carpeta');
    expect(pickName(undefined, 'ja', 'carpeta')).toBe('carpeta');
    expect(pickName({ ja: ' ' }, 'ja', 'carpeta')).toBe('carpeta');
    expect(allNames(n)).toContain('Cat');
  });

  it('las carpetas usan names.json y, si no hay, su propio nombre', () => {
    const R = '../../assets/resources/';
    const files = {
      [R + '01-Animales/gato.png']: '/g',
      [R + '01-Animales/Casa/perro.png']: '/p',
      [R + '02-Cosas/mesa.png']: '/m'
    };
    const meta: Record<string, NamesFile> = {
      [R + '01-Animales/names.json']: { name: { es: 'Animales', en: 'Animals' }, items: { gato: { en: 'Cat', ja: '猫' } } },
      [R + '01-Animales/Casa/names.json']: { name: { en: 'Pets' } }
    };
    const [a, b] = buildStock(files, R, meta);
    expect(a.label).toBe('Animales');
    expect(pickName(a.names, 'en', a.label)).toBe('Animals');
    expect(pickName(a.names, 'ja', a.label)).toBe('Animals');
    expect(a.items[0].names).toEqual({ en: 'Cat', ja: '猫' });
    expect(a.items[0].search).toContain('猫');
    expect(a.groups[0].parts[0].names).toEqual({ en: 'Pets' });
    expect(b.names).toBeUndefined();
    expect(pickName(b.names, 'en', b.label)).toBe('Cosas');
  });
});

describe('avisos de la web', () => {
  it('vacío, ilegible o sin mensaje = sin avisos', () => {
    expect(parseNotices('')).toEqual([]);
    expect(parseNotices('  \n')).toEqual([]);
    expect(parseNotices('{}')).toEqual([]);
    expect(parseNotices('[]')).toEqual([]);
    expect(parseNotices('<!doctype html><html>')).toEqual([]);
    expect(parseNotices('{"message": "  "}')).toEqual([]);
    expect(parseNotices('null')).toEqual([]);
  });

  it('un aviso con texto simple, multiidioma o una lista', () => {
    const [a] = parseNotices('{"message":"Hola"}');
    expect(a.message).toBe('Hola');
    expect(a.id.length).toBeGreaterThan(0);
    const [b] = parseNotices('{"id":"v2","title":{"es":"Novedades","en":"News"},"message":{"es":"Hola","en":"Hello","ja":""}}');
    expect(b.id).toBe('v2');
    expect(localizedText(b.title, 'en')).toBe('News');
    expect(localizedText(b.message, 'ja')).toBe('Hello'); // «ja» vacío se ignora → inglés
    expect(localizedText(b.message, 'es')).toBe('Hola');
    expect(localizedText({ fr: 'Salut' }, 'ja')).toBe('Salut'); // el primero que haya
    const list = parseNotices('{"messages":[{"id":1,"message":"a"},{"message":"b"},{"x":1}]}');
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('1');
    expect(noticesSignature(list)).toContain('|');
  });

  it('el id sin escribir cambia si cambia el contenido', () => {
    const [a] = parseNotices('{"message":"uno"}');
    const [b] = parseNotices('{"message":"dos"}');
    expect(a.id).not.toBe(b.id);
    expect(parseNotices('{"message":"uno"}')[0].id).toBe(a.id);
  });
});
