/**
 * Orden de apilamiento (z). Lógica pura, sin estado: el editor la usa para subir/bajar objetos,
 * tanto en las páginas normales como en la página de estilo (donde la «referencia» del
 * contenido de cada página es un elemento más de la pila).
 */
import type { ID } from './types';

export type ReorderMode = 'front' | 'back' | 'forward' | 'backward';

/** Id de la referencia del contenido de la página dentro de la pila de la página de estilo. */
export const CONTENT_REF = '@content';

/**
 * Reordena una lista de ids (de abajo hacia arriba) moviendo los seleccionados.
 * 'forward'/'backward' dan un paso (saltando por encima o por debajo del elemento vecino que no
 * esté seleccionado); 'front'/'back' los llevan al extremo.
 */
export function reorderIds(ids: ID[], sel: Set<ID>, mode: ReorderMode): ID[] {
  if (mode === 'front') return [...ids.filter((id) => !sel.has(id)), ...ids.filter((id) => sel.has(id))];
  if (mode === 'back') return [...ids.filter((id) => sel.has(id)), ...ids.filter((id) => !sel.has(id))];
  const after = [...ids];
  if (mode === 'forward') {
    for (let i = after.length - 2; i >= 0; i--) {
      if (sel.has(after[i]) && !sel.has(after[i + 1])) [after[i], after[i + 1]] = [after[i + 1], after[i]];
    }
  } else {
    for (let i = 1; i < after.length; i++) {
      if (sel.has(after[i]) && !sel.has(after[i - 1])) [after[i], after[i - 1]] = [after[i - 1], after[i]];
    }
  }
  return after;
}
