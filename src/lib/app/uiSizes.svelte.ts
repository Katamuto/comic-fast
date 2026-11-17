/**
 * Tamaños de los paneles laterales que la persona ajusta arrastrando sus bordes (en px).
 * null = el tamaño por defecto del diseño. Se recuerdan entre sesiones.
 */
import { readPref, writePref } from './prefs';

export type PanelKey = 'left' | 'right' | 'insp';

function load(): Record<PanelKey, number | null> {
  const out: Record<PanelKey, number | null> = { left: null, right: null, insp: null };
  try {
    const v = JSON.parse(readPref('uiSizes') ?? '{}') as Partial<Record<PanelKey, unknown>>;
    for (const k of Object.keys(out) as PanelKey[]) if (typeof v[k] === 'number' && Number.isFinite(v[k])) out[k] = v[k] as number;
  } catch {
    /* sin preferencias: tamaños por defecto */
  }
  return out;
}

export const uiSizes = $state<Record<PanelKey, number | null>>(load());

export function setSize(key: PanelKey, px: number | null): void {
  uiSizes[key] = px === null ? null : Math.round(px);
  writePref('uiSizes', JSON.stringify($state.snapshot(uiSizes)));
}

/** Límites razonables de cada panel (px). */
export const LIMITS: Record<PanelKey, { min: number; max: number }> = {
  left: { min: 110, max: 520 },
  right: { min: 220, max: 760 },
  insp: { min: 120, max: 900 }
};

export const clampSize = (key: PanelKey, px: number, avail = Infinity) =>
  Math.round(Math.min(Math.min(LIMITS[key].max, avail), Math.max(LIMITS[key].min, px)));
