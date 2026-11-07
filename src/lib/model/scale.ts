import type { ID, Page, PageObject, PanelLayer } from './types';
import { uid } from './ids';

const SCALED_KEYS = ['x', 'y', 'w', 'h', 'strokeWidth', 'fontSize', 'tailX', 'tailY', 'tailOx', 'tailOy', 'textMargin', 'outlineWidth'] as const;

function scaleLayer(l: PanelLayer, s: number): PanelLayer {
  if (l.type === 'image') {
    return { ...l, x: l.x * s, y: l.y * s, scale: l.scale * s, ...(l.fx ? { fx: { ...l.fx, blur: l.fx.blur * s } } : {}) };
  }
  if (l.type === 'pattern') return { ...l, x: l.x * s, y: l.y * s };
  return l;
}

/** Copia profunda de las páginas con toda la geometría multiplicada por `s`. */
export function scalePages(pages: Page[], s: number): Page[] {
  return structuredClone(pages).map((p) => ({
    ...p,
    objects: p.objects.map((o) => {
      const copy = o as unknown as Record<string, unknown>;
      for (const k of SCALED_KEYS) {
        if (typeof copy[k] === 'number') copy[k] = (copy[k] as number) * s;
      }
      if (o.type === 'image' && o.fx) o.fx.blur *= s;
      if (o.type === 'panel') o.layers = o.layers.map((l) => scaleLayer(l, s));
      return o as PageObject;
    })
  }));
}

/** Clona una página dándole ids nuevos a ella y a sus objetos. */
export function cloneWithNewIds(page: Page): Page {
  const copy = structuredClone(page);
  copy.id = uid();
  const ids = new Map<string, string>();
  for (const o of copy.objects) {
    const nid = uid();
    ids.set(o.id, nid);
    o.id = nid;
  }
  for (const o of copy.objects) {
    if (o.type === 'balloon' && o.link) {
      const to = ids.get(o.link.to);
      if (to) o.link = { ...o.link, to };
      else delete o.link;
    }
  }
  return copy;
}

/** Ids de assets referenciados por las páginas. */
export function usedAssetIds(pages: Page[]): Set<ID> {
  const ids = new Set<ID>();
  for (const p of pages) {
    for (const o of p.objects) {
      if (o.type === 'image') ids.add(o.assetId);
      else if (o.type === 'panel') {
        for (const l of o.layers) if (l.type === 'image') ids.add(l.assetId);
      }
    }
  }
  return ids;
}
