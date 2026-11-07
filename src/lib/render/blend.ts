/**
 * Modos de fusión. Se dibujan con la propiedad CSS `mix-blend-mode`, que entienden el lienzo,
 * las miniaturas y la exportación (el SVG se rasteriza con el mismo motor).
 *
 * Nota: CSS no tiene «Dividir». El más parecido es «color-dodge» (sobreexponer color), que
 * aclara el fondo según el color de la capa: con una capa gris da casi el mismo efecto.
 */
import type { BlendMode } from '../model/types';

/** En el orden en que se muestran (los habituales primero). */
export const BLEND_MODES: readonly BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity'
];

export function isBlendMode(v: unknown): v is BlendMode {
  return typeof v === 'string' && (BLEND_MODES as readonly string[]).includes(v);
}

/** Valor para `mix-blend-mode`, o undefined si no hay mezcla (así no se añade nada al SVG). */
export function blendCss(mode: BlendMode | string | undefined | null): string | undefined {
  return isBlendMode(mode) && mode !== 'normal' ? mode : undefined;
}
