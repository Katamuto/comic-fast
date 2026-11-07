/**
 * Lógica pura (sin DOM) de la interfaz móvil: detección de teléfono y gestos de pellizco.
 * Está separada de device.svelte.ts para poder probarla con node.
 */

export type UiOverride = 'mobile' | 'desktop' | null;

export interface Env {
  /** El dispositivo principal de entrada es táctil (matchMedia('(pointer: coarse)')). */
  coarse: boolean;
  /** Tamaño de la ventana en px CSS. */
  w: number;
  h: number;
  override?: UiOverride;
}

/** Lado corto máximo (px CSS) para considerar "teléfono". Las tabletas (≥ 600) usan la interfaz de escritorio. */
export const PHONE_MAX_SHORT_SIDE = 600;

/** ¿Se debe mostrar la interfaz móvil? */
export function isPhone(env: Env): boolean {
  if (env.override === 'mobile') return true;
  if (env.override === 'desktop') return false;
  return env.coarse && Math.min(env.w, env.h) <= PHONE_MAX_SHORT_SIDE;
}

/** Lee `?ui=mobile|desktop|auto` de la URL (sirve para probar en un PC). 'auto' = borrar la elección. */
export function parseUiParam(search: string): UiOverride | 'auto' | undefined {
  const v = new URLSearchParams(search).get('ui');
  if (v === 'mobile' || v === 'desktop' || v === 'auto') return v;
  return undefined;
}

export interface Pt {
  x: number;
  y: number;
}

export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export interface PinchStep {
  /** Cuánto cambió la distancia entre los dedos (>1 = se separan: acercar). */
  factor: number;
  /** Centro de los dedos antes y después. */
  from: Pt;
  to: Pt;
}

/** Calcula el cambio de un gesto de dos dedos entre dos instantes. */
export function pinchStep(prev: [Pt, Pt], cur: [Pt, Pt]): PinchStep {
  const d0 = dist(prev[0], prev[1]);
  const d1 = dist(cur[0], cur[1]);
  return { factor: d0 > 0.5 && d1 > 0.5 ? d1 / d0 : 1, from: mid(prev[0], prev[1]), to: mid(cur[0], cur[1]) };
}
