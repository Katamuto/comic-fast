import { getContext, setContext } from 'svelte';
import type { Quality } from '../imageedit/proxy';

const KEY = Symbol('quality');

/** Fija la calidad con la que los descendientes eligen la versión de cada imagen. */
export function provideQuality(get: () => Quality): void {
  setContext(KEY, get);
}

/** Calidad vigente (función para ser reactiva); 'full' si nadie la fijó. */
export function useQuality(): () => Quality {
  return getContext<(() => Quality) | undefined>(KEY) ?? (() => 'full');
}

const TEXT_KEY = Symbol('textMode');
export interface TextMode {
  /** Tamaño forzado: el texto no se reduce. */
  force: boolean;
  /** Marcar en rojo el texto que no cabe (solo editor). */
  warn: boolean;
}
export function provideTextMode(get: () => TextMode): void {
  setContext(TEXT_KEY, get);
}
export function useTextMode(): () => TextMode {
  return getContext<(() => TextMode) | undefined>(TEXT_KEY) ?? (() => ({ force: false, warn: false }));
}
