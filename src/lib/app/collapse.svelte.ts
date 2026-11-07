/**
 * Qué categorías del panel de recursos están plegadas. Se recuerda entre sesiones.
 * Clave = «pestaña/categoría». Sin entrada = se usa el valor por defecto de cada sección.
 */
import { readPref, writePref } from './prefs';

function load(): Record<string, boolean> {
  try {
    const v = JSON.parse(readPref('collapsed') ?? '{}');
    return typeof v === 'object' && v !== null ? (v as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/** true = abierta. */
export const openState = $state<Record<string, boolean>>(load());

export function isOpen(key: string, fallback: boolean): boolean {
  return key in openState ? openState[key] : fallback;
}

export function setOpen(key: string, open: boolean): void {
  openState[key] = open;
  writePref('collapsed', JSON.stringify($state.snapshot(openState)));
}
