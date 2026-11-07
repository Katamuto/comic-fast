/**
 * Globos encadenados. Un globo puede enlazarse a otro de la misma página:
 *  - modo 'tail': la punta de su cola se calcula sola y toca el contorno del globo enlazado;
 *  - modo 'merge': los cuerpos se funden en una sola silueta (borde solo por fuera).
 * Lógica pura, sin DOM.
 */
import type { BalloonObj, ID, PageObject } from './types';

export type Phase = 'all' | 'stroke' | 'fill' | 'text';
export interface PlanItem {
  obj: PageObject;
  phase: Phase;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const rot = (x: number, y: number, deg: number) => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return { x: x * c - y * s, y: x * s + y * c };
};

/** Globo al que apunta `o` (si existe, es otro globo y no es él mismo). */
export function linkTarget(o: BalloonObj, byId: Map<ID, PageObject>): BalloonObj | null {
  if (!o.link) return null;
  const t = byId.get(o.link.to);
  return t && t.type === 'balloon' && t.id !== o.id ? t : null;
}

/**
 * Para el modo 'tail': copia de `o` con tailX/tailY calculados para que la punta toque el
 * contorno (elipse de su caja) del globo enlazado. Sin enlace válido devuelve `o` tal cual.
 */
export function withLinkedTail(o: BalloonObj, byId: Map<ID, PageObject>): BalloonObj {
  if (o.link?.mode !== 'tail') return o;
  const t = linkTarget(o, byId);
  if (!t) return o;
  const cs = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  const ct = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
  const off = rot(o.tailOx ?? 0, o.tailOy ?? 0, o.rotation);
  const from = { x: cs.x + off.x, y: cs.y + off.y };
  // al marco local del globo destino
  const q = rot(from.x - ct.x, from.y - ct.y, -t.rotation);
  const rx = Math.max(1, t.w / 2);
  const ry = Math.max(1, t.h / 2);
  const k = Math.hypot(q.x / rx, q.y / ry);
  const gap = Math.max(0, t.strokeWidth * 0.5);
  let tipT = { x: 0, y: 0 };
  if (k > 1e-6) {
    // punto del borde de la elipse en la línea origen→centro, separado `gap` hacia fuera
    const n = Math.hypot(q.x, q.y);
    tipT = { x: q.x / k + (q.x / n) * gap, y: q.y / k + (q.y / n) * gap };
  }
  const back = rot(tipT.x, tipT.y, t.rotation);
  const tip = { x: ct.x + back.x, y: ct.y + back.y };
  const local = rot(tip.x - cs.x, tip.y - cs.y, -o.rotation);
  return { ...o, tailX: local.x, tailY: local.y };
}

/** Grupos de globos fundidos (cada grupo con 2 o más globos), con unión-búsqueda. */
export function mergeGroups(objects: PageObject[]): ID[][] {
  const byId = new Map<ID, PageObject>(objects.map((o) => [o.id, o]));
  const parent = new Map<ID, ID>();
  const find = (a: ID): ID => {
    let r = a;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(a, r);
    return r;
  };
  for (const o of objects) if (o.type === 'balloon') parent.set(o.id, o.id);
  for (const o of objects) {
    if (o.type !== 'balloon' || o.link?.mode !== 'merge') continue;
    const t = linkTarget(o, byId);
    if (t) parent.set(find(o.id), find(t.id));
  }
  const groups = new Map<ID, ID[]>();
  for (const o of objects) {
    if (o.type !== 'balloon') continue;
    const r = find(o.id);
    groups.set(r, [...(groups.get(r) ?? []), o.id]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

/**
 * Orden de dibujo de una página. Los globos fundidos se dibujan juntos, en la posición
 * del más alto del grupo: primero todos los bordes, luego todos los rellenos, luego los textos.
 */
export function renderPlan(objects: PageObject[]): PlanItem[] {
  const groups = mergeGroups(objects);
  if (groups.length === 0) return objects.map((obj) => ({ obj, phase: 'all' as Phase }));
  const groupOf = new Map<ID, ID[]>();
  for (const g of groups) for (const id of g) groupOf.set(id, g);
  const byId = new Map<ID, PageObject>(objects.map((o) => [o.id, o]));
  const lastIndex = (g: ID[]) => Math.max(...g.map((id) => objects.findIndex((o) => o.id === id)));
  const out: PlanItem[] = [];
  objects.forEach((obj, i) => {
    const g = groupOf.get(obj.id);
    if (!g) return void out.push({ obj, phase: 'all' });
    if (lastIndex(g) !== i) return;
    const members = g.map((id) => byId.get(id)!).sort((a, b) => objects.indexOf(a) - objects.indexOf(b));
    for (const phase of ['stroke', 'fill', 'text'] as const) for (const m of members) out.push({ obj: m, phase });
  });
  return out;
}

/** ¿Algún globo de la página apunta a `id`? (para avisar al borrar o cambiar el enlace). */
export function linkedTo(objects: PageObject[], id: ID): BalloonObj[] {
  return objects.filter((o): o is BalloonObj => o.type === 'balloon' && o.link?.to === id);
}
