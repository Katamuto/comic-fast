import { describe, expect, it } from 'vitest';
import { buildPdf } from './pdf';
import { buildTiffCmyk, clampCmyk, cropMarksPdf, DEFAULT_CMYK, maxInk, rgbaToCmyk, rgbToCmyk } from './cmyk';
import { crc32, pngWithDpi } from './pngmeta';

const latin = (b: Uint8Array) => new TextDecoder('latin1').decode(b);
const o = DEFAULT_CMYK;

describe('RGB → CMYK', () => {
  it('negro y grises neutros salen solo en K', () => {
    expect(rgbToCmyk(0, 0, 0, o)).toEqual([0, 0, 0, 1]);
    const g = rgbToCmyk(128, 128, 128, o);
    expect(g.slice(0, 3)).toEqual([0, 0, 0]);
    expect(g[3]).toBeCloseTo(0.498, 2);
    expect(rgbToCmyk(255, 255, 255, o)).toEqual([0, 0, 0, 0]);
  });
  it('un color puro lleva solo sus tintas', () => {
    const [c, m, y, k] = rgbToCmyk(255, 0, 0, o);
    expect(c).toBe(0);
    expect(m).toBeCloseTo(1, 5);
    expect(y).toBeCloseTo(1, 5);
    expect(k).toBe(0);
  });
  it('respeta el límite de tinta total', () => {
    const lim = { gcr: 0, tac: 200, neutralK: false };
    const [c, m, y, k] = rgbToCmyk(10, 10, 40, lim);
    expect((c + m + y + k) * 100).toBeLessThanOrEqual(200.001);
    const px = rgbaToCmyk(new Uint8ClampedArray([10, 10, 40, 255, 0, 0, 0, 255]), lim);
    expect(maxInk(px)).toBeLessThanOrEqual(201);
  });
  it('el alfa se compone sobre blanco', () => {
    const px = rgbaToCmyk(new Uint8ClampedArray([0, 0, 0, 0]), o);
    expect(Array.from(px)).toEqual([0, 0, 0, 0]);
  });
  it('sanea los parámetros', () => {
    expect(clampCmyk({ tac: 9999, gcr: 7 })).toEqual({ gcr: 1, tac: 400, neutralK: true });
    expect(clampCmyk({}).tac).toBe(300);
  });
});

describe('TIFF CMYK', () => {
  it('cabecera, etiquetas y datos', () => {
    const w = 3, h = 2;
    const data = new Uint8Array(w * h * 4).map((_, i) => i);
    const t = buildTiffCmyk(data, w, h, 300, false);
    const v = new DataView(t.buffer);
    expect(String.fromCharCode(t[0], t[1])).toBe('II');
    expect(v.getUint16(2, true)).toBe(42);
    const n = v.getUint16(8, true);
    const tags: Record<number, number> = {};
    for (let i = 0; i < n; i++) {
      const at = 10 + i * 12;
      const type = v.getUint16(at + 2, true);
      tags[v.getUint16(at, true)] = type === 3 && v.getUint32(at + 4, true) === 1 ? v.getUint16(at + 8, true) : v.getUint32(at + 8, true);
    }
    expect(tags[256]).toBe(3);
    expect(tags[257]).toBe(2);
    expect(tags[262]).toBe(5);
    expect(tags[277]).toBe(4);
    expect(tags[259]).toBe(1);
    const off = tags[273];
    expect(Array.from(t.slice(off, off + data.length))).toEqual(Array.from(data));
    expect(tags[279]).toBe(data.length);
    expect(v.getUint32(tags[282], true)).toBe(300);
  });
});

describe('PDF de imprenta', () => {
  it('escribe TrimBox, BleedBox, DeviceCMYK y marcas', () => {
    const trim: [number, number, number, number] = [20, 20, 120, 220];
    const pdf = buildPdf([
      {
        jpeg: new Uint8Array([1, 2, 3]),
        cmyk: true,
        pxW: 1,
        pxH: 1,
        ptW: 110,
        ptH: 210,
        media: { w: 140, h: 240 },
        image: { x: 15, y: 15, w: 110, h: 210 },
        trim,
        bleedBox: [15, 15, 125, 225],
        marks: cropMarksPdf(trim, 5, 14)
      }
    ]);
    const s = latin(pdf);
    expect(s).toContain('/MediaBox [0 0 140 240]');
    expect(s).toContain('/TrimBox [20 20 120 220]');
    expect(s).toContain('/BleedBox [15 15 125 225]');
    expect(s).toContain('/DeviceCMYK');
    expect(s).toContain('/FlateDecode');
    expect(s).toContain('1 1 1 1 K');
    expect(s).toContain('110 0 0 210 15 15 cm');
  });
  it('8 marcas de corte', () => {
    const m = cropMarksPdf([10, 10, 50, 90], 5, 14);
    expect((m.match(/ l S/g) ?? []).length).toBe(8);
  });
});

describe('PNG con resolución', () => {
  it('inserta pHYs tras IHDR con CRC correcto', () => {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const ihdr = new Uint8Array(25);
    ihdr.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 0);
    const png = new Uint8Array([...sig, ...ihdr, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
    const out = pngWithDpi(png, 300);
    expect(out.length).toBe(png.length + 21);
    const v = new DataView(out.buffer);
    expect(String.fromCharCode(...out.slice(37, 41))).toBe('pHYs');
    expect(v.getUint32(41)).toBe(11811);
    expect(v.getUint32(50)).toBe(crc32(out.subarray(37, 50)));
  });
});
