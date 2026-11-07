import type { Globals, PageObject } from './types';

/** ¿Hay tamaño de texto absoluto activo? */
export function textForced(g?: Globals | null): boolean {
  return !!g && !!g.forceText && (g.textSize ?? 0) > 0;
}

/** Devuelve el objeto con los parámetros globales aplicados (el mismo objeto si no cambia nada). */
export function applyGlobals<T extends PageObject>(o: T, g?: Globals | null): T {
  if (!g) return o;
  if ((o.type === 'balloon' || (o.type === 'text' && !o.role)) && (g.textSize ?? 0) > 0 && o.fontSize !== g.textSize) {
    o = { ...o, fontSize: g.textSize! };
  }
  if (o.type === 'balloon' && (g.balloonStroke ?? -1) >= 0 && o.strokeWidth !== g.balloonStroke) {
    o = { ...o, strokeWidth: g.balloonStroke! };
  }
  if (o.type === 'panel' && (g.panelStroke ?? -1) >= 0 && o.strokeWidth !== g.panelStroke) {
    o = { ...o, strokeWidth: g.panelStroke! };
  }
  return o;
}

/** ¿Hay algún parámetro global definido? */
export function hasGlobals(g?: Globals | null): boolean {
  return !!g && ((g.textSize ?? 0) > 0 || g.panelStroke !== undefined || g.balloonStroke !== undefined);
}

/** Globales escalados al cambiar el tamaño de la página (los tamaños y grosores van en px de página). */
export function scaleGlobals(g: Globals | undefined, s: number): Globals | undefined {
  if (!g) return g;
  const out: Globals = { ...g };
  if (out.textSize !== undefined) out.textSize *= s;
  if (out.panelStroke !== undefined) out.panelStroke *= s;
  if (out.balloonStroke !== undefined) out.balloonStroke *= s;
  return out;
}
