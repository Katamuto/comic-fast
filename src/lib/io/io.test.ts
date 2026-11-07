import { describe, expect, it } from 'vitest';
import { buildPdf } from './pdf';
import { svgIntrinsicSize } from './images';
import { decodeProject, encodeProject } from './cfast';
import { cloneWithNewIds, scalePages, usedAssetIds } from '../model/scale';
import { balloon, gradientLayer, imageLayer, newDoc, panel, patternLayer } from '../model/defaults';
import { strToU8, zipSync } from 'fflate';
import type { AssetData, ComicDoc, Page, PageObject, PanelLayer } from '../model/types';

const withId = (l: ReturnType<typeof imageLayer>, id: string) => ({ id, ...l }) as PanelLayer;

const text = (b: Uint8Array) => new TextDecoder('latin1').decode(b);

describe('PDF', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); // JPEG mínimo (SOI+EOI)

  it('genera estructura válida con xref correcto', () => {
    const pdf = buildPdf(
      [
        { jpeg, pxW: 10, pxH: 20, ptW: 100, ptH: 200 },
        { jpeg, pxW: 10, pxH: 20, ptW: 100, ptH: 200 }
      ],
      'Cómic ñandú'
    );
    const s = text(pdf);
    expect(s.startsWith('%PDF-1.4')).toBe(true);
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(s).toContain('/Count 2');

    // Cada entrada del xref apunta al "N 0 obj" correspondiente.
    const xrefAt = Number(/startxref\n(\d+)/.exec(s)![1]);
    expect(s.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const entries = [...s.slice(xrefAt).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(entries).toHaveLength(3 + 3 * 2);
    entries.forEach((off, i) => {
      expect(s.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
  });

  it('incrusta los bytes del JPEG intactos', () => {
    const data = new Uint8Array(300).map((_, i) => i % 256);
    const pdf = buildPdf([{ jpeg: data, pxW: 1, pxH: 1, ptW: 10, ptH: 10 }]);
    const s = text(pdf);
    const start = s.indexOf('stream\n', s.indexOf('/DCTDecode')) + 7;
    expect(Array.from(pdf.slice(start, start + data.length))).toEqual(Array.from(data));
    expect(s).toContain(`/Length ${data.length}`);
  });
});

describe('escala y utilidades de documento', () => {
  const mk = (): Page => ({
    id: 'p1',
    background: '#fff',
    objects: [
      { id: 'a', ...panel({ x: 10, y: 20, w: 100, h: 50 }, { strokeWidth: 4 }) } as PageObject,
      {
        id: 'b',
        ...balloon({ x: 0, y: 0, w: 200, h: 100 }, { fontSize: 30, tailX: -20, tailY: 80, text: 'hi' })
      } as PageObject
    ]
  });

  it('scalePages multiplica geometría y no toca el original', () => {
    const pages = [mk()];
    const out = scalePages(pages, 2);
    const p = out[0].objects[0] as PageObject & { strokeWidth: number };
    expect([p.x, p.y, p.w, p.h, p.strokeWidth]).toEqual([20, 40, 200, 100, 8]);
    const b = out[0].objects[1] as PageObject & { fontSize: number; tailX: number; tailY: number };
    expect([b.fontSize, b.tailX, b.tailY]).toEqual([60, -40, 160]);
    expect(pages[0].objects[0].x).toBe(10);
  });

  it('cloneWithNewIds renueva ids', () => {
    const src = mk();
    const c = cloneWithNewIds(src);
    expect(c.id).not.toBe(src.id);
    expect(c.objects.map((o) => o.id)).not.toContain('a');
    expect(c.objects).toHaveLength(2);
  });

  it('scalePages escala las capas de las viñetas', () => {
    const page: Page = {
      id: 'p',
      background: '#fff',
      objects: [
        {
          id: '1',
          ...panel(
            { x: 0, y: 0, w: 10, h: 10 },
            { layers: [withId(imageLayer('a', 0.5, { x: 4, y: -2 }), 'l1'), withId(patternLayer({ x: 6 }), 'l2'), withId(gradientLayer(), 'l3')] }
          )
        } as PageObject
      ]
    };
    const out = scalePages([page], 2);
    const layers = (out[0].objects[0] as PageObject & { layers: PanelLayer[] }).layers;
    expect(layers[0]).toMatchObject({ x: 8, y: -4, scale: 1 });
    expect(layers[1]).toMatchObject({ x: 12 });
    expect(out[0].objects[0]).not.toBe(page.objects[0]);
  });

  it('usedAssetIds recoge capas de viñetas e imágenes', () => {
    const page: Page = {
      id: 'p',
      background: '#fff',
      objects: [
        { id: '1', ...panel({ x: 0, y: 0, w: 1, h: 1 }, { layers: [withId(imageLayer('imgA', 1), 'l1')] }) } as PageObject,
        { id: '2', type: 'image', x: 0, y: 0, w: 1, h: 1, rotation: 0, assetId: 'imgB', opacity: 1 }
      ]
    };
    expect([...usedAssetIds([page])].sort()).toEqual(['imgA', 'imgB']);
  });
});

describe('formato .cfast', () => {
  const asset = (id: string): AssetData => ({
    id,
    name: `${id}.png`,
    mime: 'image/png',
    w: 4,
    h: 3,
    bytes: new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4, 5])
  });

  it('ida y vuelta conserva documento e imágenes usadas (y descarta las huérfanas)', () => {
    const doc: ComicDoc = newDoc();
    doc.title = 'Mi cómic ñ';
    doc.pages[0].objects.push({
      id: 'x',
      ...panel({ x: 1, y: 2, w: 30, h: 40 }, { layers: [withId(imageLayer('usada', 1), 'l1')] })
    } as PageObject);

    const bytes = encodeProject(doc, { usada: asset('usada'), huerfana: asset('huerfana') });
    const back = decodeProject(bytes);
    expect(back.doc).toEqual(doc);
    expect(back.assets.map((a) => a.id)).toEqual(['usada']);
    expect(Array.from(back.assets[0].bytes)).toEqual(Array.from(asset('usada').bytes));
    expect(back.assets[0].w).toBe(4);
  });

  it('migra proyectos v1: la imagen de la viñeta pasa a ser una capa', () => {
    const v1 = {
      format: 'comicfast',
      version: 1,
      assets: [{ id: 'img', name: 'a.png', mime: 'image/png', w: 400, h: 200, file: 'assets/img.png' }],
      doc: {
        title: 'viejo',
        pageW: 994,
        pageH: 1538,
        pages: [
          {
            id: 'p1',
            background: '#fff',
            objects: [
              { id: 'a', type: 'panel', x: 0, y: 0, w: 200, h: 200, rotation: 0, fill: '#fff', stroke: '#000', strokeWidth: 6, assetId: 'img', imgZoom: 2, imgX: 10, imgY: -5 },
              { id: 'b', type: 'panel', x: 0, y: 0, w: 50, h: 50, rotation: 0, fill: '#fff', stroke: '#000', strokeWidth: 6, assetId: null, imgZoom: 1, imgX: 0, imgY: 0 },
              { id: 'c', type: 'pattern', x: 0, y: 0, w: 50, h: 50, rotation: 0, kind: 'dots', color: '#000', bg: 'none', scale: 1, opacity: 1 }
            ]
          }
        ]
      }
    };
    const bytes = zipSync({
      'project.json': strToU8(JSON.stringify(v1)),
      'assets/img.png': new Uint8Array([1, 2, 3])
    });
    const { doc, assets } = decodeProject(bytes);
    expect(assets.map((a) => a.id)).toEqual(['img']);
    const [a, b, c] = doc.pages[0].objects as unknown as Record<string, unknown>[];
    expect(a.shape).toBe('rect');
    expect(a.assetId).toBeUndefined();
    expect(a.layers).toMatchObject([{ type: 'image', assetId: 'img', x: 10, y: -5, rotation: 0, opacity: 1 }]);
    // cubrir 200×200 con una imagen 400×200 = 1; ×2 de zoom.
    expect((a.layers as { scale: number }[])[0].scale).toBe(2);
    expect(b.layers).toEqual([]);
    expect(c.seed).toBe(0);
  });

  it('rechaza proyectos de una versión futura', () => {
    const bytes = zipSync({ 'project.json': strToU8(JSON.stringify({ format: 'comicfast', version: 99, doc: {}, assets: [] })) });
    expect(() => decodeProject(bytes)).toThrow(/más nueva/);
  });

  it('rechaza archivos que no son proyectos', () => {
    expect(() => decodeProject(new Uint8Array([1, 2, 3, 4]))).toThrow(/válido/);
  });
});

describe('SVG y filtros en el modelo', () => {
  const enc = (t: string) => new TextEncoder().encode(t);

  it('tamaño de un SVG: viewBox normalizado a 1000 px por el lado mayor', () => {
    expect(svgIntrinsicSize(enc('<svg xmlns="x" viewBox="0 0 100 50"></svg>'))).toEqual({ w: 1000, h: 500 });
    expect(svgIntrinsicSize(enc('<?xml version="1.0"?>\n<svg viewBox="0 0 24 24" width="24" height="24"></svg>'))).toEqual({ w: 1000, h: 1000 });
  });

  it('sin viewBox usa width y height; sin nada devuelve null', () => {
    expect(svgIntrinsicSize(enc('<svg width="80px" height="40"></svg>'))).toEqual({ w: 80, h: 40 });
    expect(svgIntrinsicSize(enc('<svg></svg>'))).toBeNull();
    expect(svgIntrinsicSize(enc('no es svg'))).toBeNull();
  });

  it('scalePages escala el desenfoque de los filtros', () => {
    const fx = { brightness: 0, contrast: 0, saturation: 0, hue: 0, sepia: 0, blur: 3, invert: false, tint: null };
    const page: Page = {
      id: 'p',
      background: '#fff',
      objects: [
        { id: 'i', type: 'image', x: 0, y: 0, w: 10, h: 10, rotation: 0, assetId: 'a', opacity: 1, fx } as PageObject,
        { id: 'q', ...panel({ x: 0, y: 0, w: 1, h: 1 }, { layers: [withId(imageLayer('a', 1, { fx: { ...fx } }), 'l')] }) } as PageObject
      ]
    };
    const out = scalePages([page], 2);
    expect((out[0].objects[0] as PageObject & { fx: { blur: number } }).fx.blur).toBe(6);
    const layers = (out[0].objects[1] as PageObject & { layers: { fx: { blur: number } }[] }).layers;
    expect(layers[0].fx.blur).toBe(6);
    expect(fx.blur).toBe(3); // el original no cambia
  });

  it('un proyecto con filtros, bloqueos y cola curva sobrevive a guardar y abrir', () => {
    const doc: ComicDoc = newDoc();
    const fx = { brightness: 10, contrast: 0, saturation: -20, hue: 0, sepia: 0, blur: 0, invert: false, tint: '#ff0000' };
    doc.pages[0].objects.push(
      { id: 'b', ...balloon({ x: 0, y: 0, w: 100, h: 50 }, { tailWidth: 0.5, tailCurve: -0.4 }), locked: true } as PageObject,
      { id: 'i', type: 'image', x: 0, y: 0, w: 5, h: 5, rotation: 0, assetId: 'u', opacity: 1, fx } as PageObject
    );
    const asset: AssetData = { id: 'u', name: 'u.png', mime: 'image/png', w: 1, h: 1, bytes: new Uint8Array([1, 2, 3]) };
    const back = decodeProject(encodeProject(doc, { u: asset }));
    expect(back.doc).toEqual(doc);
  });
});
