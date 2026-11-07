import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { decodeProject } from './cfast';
import { pageInfo } from '../model/style';

const dir = new URL('../../assets/templates/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.cfast'));
const load = (name: string) => decodeProject(new Uint8Array(readFileSync(new URL(name + '.cfast', dir)))).doc;

describe('plantillas incluidas', () => {
  it('hay al menos cómic, storyboard y manhwa', () => {
    for (const n of ['comic', 'storyboard', 'manhwa']) expect(files).toContain(n + '.cfast');
  });
  it('todas se leen y no tienen imágenes ni objetos sin id', () => {
    for (const f of files) {
      const r = decodeProject(new Uint8Array(readFileSync(new URL(f, dir))));
      expect(r.doc.pages.length).toBeGreaterThan(0);
      expect(r.assets.length).toBe(0);
      for (const p of r.doc.pages) for (const o of p.objects) expect(o.id).toBeTruthy();
    }
  });
  it('el cómic tiene portada fuera de estilo y numeración, y dos páginas numeradas 1 y 2', () => {
    const d = load('comic');
    expect(d.pages.length).toBe(3);
    expect(pageInfo(d, 0)).toMatchObject({ style: null, pageNo: null, pageCount: 2 });
    expect(pageInfo(d, 1).pageNo).toBe(1);
    expect(pageInfo(d, 2).pageNo).toBe(2);
    expect(d.style?.objects.some((o) => o.type === 'text' && o.text.includes('{n}'))).toBe(true);
  });
  it('el storyboard son 6 viñetas 16:9 por página', () => {
    const d = load('storyboard');
    for (const p of d.pages) {
      const panels = p.objects.filter((o) => o.type === 'panel');
      expect(panels.length).toBe(6);
      for (const o of panels) expect(o.w / o.h).toBeCloseTo(16 / 9, 1);
    }
  });
  it('el manhwa es una tira vertical con viñetas sin borde', () => {
    const d = load('manhwa');
    expect(d.pageH).toBeGreaterThan(d.pageW * 2);
    for (const o of d.pages[0].objects) if (o.type === 'panel') expect(o.strokeWidth).toBe(0);
  });
});
