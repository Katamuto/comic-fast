/**
 * Filtros de imagen (brillo, contraste, saturación, tono, sepia, invertir,
 * desenfoque y tinte) como un único <filter> de SVG.
 *
 * Sin librerías: el mismo filtro lo entienden el lienzo, las miniaturas y la
 * exportación (el SVG se rasteriza tal cual). Esta función solo calcula
 * NÚMEROS (es lo que se prueba); el dibujo está en ImageFxDefs.svelte.
 *
 * Orden de aplicación: tinte → brillo/contraste → saturación → tono → sepia
 * → invertir → desenfoque.
 */
import type { ImageFx } from '../model/types';

export const NEUTRAL_FX: ImageFx = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  sepia: 0,
  blur: 0,
  invert: false,
  tint: null
};

/** Completa un filtro parcial/ausente con los valores neutros. */
export function fxOf(fx: Partial<ImageFx> | undefined): ImageFx {
  return { ...NEUTRAL_FX, ...fx };
}

/** ¿Hace algo este filtro? (false = no hace falta crear el <filter>). */
export function hasFx(fx: Partial<ImageFx> | undefined): boolean {
  if (!fx) return false;
  const f = fxOf(fx);
  return (
    f.brightness !== 0 ||
    f.contrast !== 0 ||
    f.saturation !== 0 ||
    f.hue !== 0 ||
    f.sepia !== 0 ||
    f.blur > 0 ||
    f.invert ||
    f.tint !== null
  );
}

export interface FxParams {
  /** Función lineal por canal: salida = pendiente × entrada + desplazamiento. */
  slope: number;
  intercept: number;
  /** Valor de feColorMatrix type="saturate" (1 = igual, 0 = grises, 2 = doble). */
  saturate: number;
  hue: number;
  /** Matriz 5×4 de sepia mezclada con la identidad, o null. */
  sepiaMatrix: string | null;
  blur: number;
  invert: boolean;
  tint: string | null;
  /** Qué pasos de la cadena hacen falta. */
  steps: { transfer: boolean; saturate: boolean; hue: boolean; sepia: boolean; invert: boolean; blur: boolean; tint: boolean };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function fxParams(input: Partial<ImageFx>): FxParams {
  const f = fxOf(input);
  const brightness = clamp(f.brightness, -100, 100);
  const contrast = clamp(f.contrast, -100, 100);
  const saturation = clamp(f.saturation, -100, 100);
  const sepia = clamp(f.sepia, 0, 100) / 100;

  // Contraste como en CSS: salida = k·(entrada − ½) + ½. Con −100 todo queda gris medio.
  const slope = contrast >= 0 ? 1 + contrast / 50 : 1 + contrast / 100;
  const intercept = 0.5 - 0.5 * slope + (brightness / 100) * 0.5;

  const inv = 1 - sepia;
  const r = (n: number) => +n.toFixed(4);
  const sepiaMatrix =
    sepia > 0
      ? [
          0.393 + 0.607 * inv, 0.769 - 0.769 * inv, 0.189 - 0.189 * inv, 0, 0,
          0.349 - 0.349 * inv, 0.686 + 0.314 * inv, 0.168 - 0.168 * inv, 0, 0,
          0.272 - 0.272 * inv, 0.534 - 0.534 * inv, 0.131 + 0.869 * inv, 0, 0,
          0, 0, 0, 1, 0
        ]
          .map(r)
          .join(' ')
      : null;

  return {
    slope: r(slope),
    intercept: r(intercept),
    saturate: r(1 + saturation / 100),
    hue: clamp(f.hue, -180, 180),
    sepiaMatrix,
    blur: Math.max(0, f.blur),
    invert: f.invert,
    tint: f.tint,
    steps: {
      transfer: brightness !== 0 || contrast !== 0,
      saturate: saturation !== 0,
      hue: f.hue !== 0,
      sepia: sepia > 0,
      invert: f.invert,
      blur: f.blur > 0,
      tint: f.tint !== null
    }
  };
}

/** Ajustes rápidos que se ofrecen como botones en el Inspector. */
export const FX_PRESETS: { id: string; label: string; fx: Partial<ImageFx> }[] = [
  { id: 'none', label: 'Original', fx: {} },
  { id: 'bw', label: 'Blanco y negro', fx: { saturation: -100, contrast: 15 } },
  { id: 'sepia', label: 'Sepia', fx: { sepia: 85, contrast: 5 } },
  { id: 'pop', label: 'Cómic vivo', fx: { saturation: 45, contrast: 30 } },
  { id: 'faded', label: 'Desvaído', fx: { saturation: -35, contrast: -20, brightness: 12 } },
  { id: 'noir', label: 'Noir', fx: { saturation: -100, contrast: 60, brightness: -10 } },
  { id: 'negative', label: 'Negativo', fx: { invert: true } }
];
