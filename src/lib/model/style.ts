/**
 * Página de estilo: una página extra (en blanco por defecto) cuyo contenido se copia en todas
 * las páginas del cómic como elementos fijos, no seleccionables: márgenes, encabezados, pies,
 * marcos, números de página…
 *
 * En ella hay una «referencia» no editable que representa el contenido de cada página. Cada
 * objeto de estilo queda por encima (`over: true`) o por debajo de esa referencia, y eso decide
 * si se dibuja encima o debajo del contenido de las páginas.
 *
 * Los textos aceptan {n} (número de la página) y {total} (cuántas páginas hay).
 */
import { CONTENT_REF, reorderIds, type ReorderMode } from './order';
import type { Globals, ID, Page, PageObject } from './types';

/** Objetos de estilo que van por debajo y por encima del contenido, cada grupo en su orden. */
export function styleSplit(style: Page | null | undefined): { below: PageObject[]; above: PageObject[] } {
  const below: PageObject[] = [];
  const above: PageObject[] = [];
  for (const o of style?.objects ?? []) (o.over ? above : below).push(o);
  return { below, above };
}

/** Los objetos de una página de arriba hacia abajo en z, de abajo hacia arriba (orden de dibujo). */
export function drawOrder(page: Page, isStyle: boolean): PageObject[] {
  if (!isStyle) return page.objects;
  const { below, above } = styleSplit(page);
  return [...below, ...above];
}

/** La pila completa de la página de estilo, con la referencia, de abajo hacia arriba. */
export function styleStack(style: Page): ID[] {
  const { below, above } = styleSplit(style);
  return [...below.map((o) => o.id), CONTENT_REF, ...above.map((o) => o.id)];
}

/**
 * Reordena en la página de estilo. Devuelve el orden nuevo de los objetos y, para cada uno,
 * si queda por encima (true) o por debajo (false) de la referencia.
 */
export function reorderStyle(style: Page, sel: Set<ID>, mode: ReorderMode): { order: ID[]; over: Record<ID, boolean> } {
  const stack = reorderIds(styleStack(style), sel, mode);
  const at = stack.indexOf(CONTENT_REF);
  const over: Record<ID, boolean> = {};
  stack.forEach((id, i) => {
    if (id !== CONTENT_REF) over[id] = i > at;
  });
  return { order: stack.filter((id) => id !== CONTENT_REF), over };
}

/** Sustituye {n} y {total} en un texto. Con n = null (página fuera de la cuenta), {n} queda vacío. */
export function pageTokens(text: string, n: number | null, total: number): string {
  if (!text.includes('{')) return text;
  return text.replace(/\{n\}/gi, n === null ? '' : String(n)).replace(/\{total\}/gi, String(total));
}

/**
 * Lo que la página `index` toma del cómic: la página de estilo (salvo que la excluya), su número
 * (null si la excluye de la cuenta; si no, su posición entre las páginas que cuentan) y el total
 * de páginas que cuentan, más los parámetros globales (salvo que la página los excluya).
 */
export function pageInfo(
  doc: { pages: Page[]; style?: Page; globals?: Globals },
  index: number
): { style: Page | null; pageNo: number | null; pageCount: number; globals: Globals | null } {
  const page = doc.pages[index];
  let counted = 0;
  let pageNo: number | null = null;
  doc.pages.forEach((p, i) => {
    if (p.noNumber) return;
    counted++;
    if (i === index) pageNo = counted;
  });
  return {
    style: page && !page.noStyle ? (doc.style ?? null) : null,
    pageNo,
    pageCount: Math.max(1, counted),
    globals: page && !page.noGlobals ? (doc.globals ?? null) : null
  };
}
