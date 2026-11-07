/**
 * Unidades de página. El documento guarda todo en píxeles a 150 dpi; aquí se
 * convierte desde/hacia unidades físicas para el diálogo de tamaño personalizado.
 */
export type Unit = 'px' | 'mm' | 'cm' | 'in';

export const PAGE_DPI = 150;
/** Límites del lado de una página, en px (a 150 dpi ≈ 17 mm … 42 cm). */
export const MIN_PAGE_PX = 100;
export const MAX_PAGE_PX = 6000;

export const UNITS: { id: Unit; label: string }[] = [
  { id: 'px', label: 'px (150 dpi)' },
  { id: 'mm', label: 'mm' },
  { id: 'cm', label: 'cm' },
  { id: 'in', label: 'pulgadas' }
];

const MM_PER_INCH = 25.4;

export function toPx(value: number, unit: Unit, dpi = PAGE_DPI): number {
  switch (unit) {
    case 'in':
      return value * dpi;
    case 'cm':
      return (value / 2.54) * dpi;
    case 'mm':
      return (value / MM_PER_INCH) * dpi;
    default:
      return value;
  }
}

export function fromPx(px: number, unit: Unit, dpi = PAGE_DPI): number {
  switch (unit) {
    case 'in':
      return px / dpi;
    case 'cm':
      return (px / dpi) * 2.54;
    case 'mm':
      return (px / dpi) * MM_PER_INCH;
    default:
      return px;
  }
}

/** Redondea a píxeles enteros dentro de los límites; null si el valor no es un número. */
export function clampPagePx(px: number): number | null {
  if (!Number.isFinite(px)) return null;
  return Math.min(MAX_PAGE_PX, Math.max(MIN_PAGE_PX, Math.round(px)));
}

/** Decimales razonables para mostrar cada unidad. */
export function formatUnit(v: number, unit: Unit): string {
  const d = unit === 'px' ? 0 : unit === 'mm' ? 1 : 2;
  return String(Math.round(v * 10 ** d) / 10 ** d);
}

/** Tamaños habituales (en px a 150 dpi) para el selector del diálogo. */
export interface SizePreset {
  id: string;
  label: string;
  w: number;
  h: number;
}

const inch = (w: number, h: number) => ({ w: Math.round(w * PAGE_DPI), h: Math.round(h * PAGE_DPI) });
const mm = (w: number, h: number) => ({ w: Math.round(toPx(w, 'mm')), h: Math.round(toPx(h, 'mm')) });

export const COMMON_SIZES: SizePreset[] = [
  { id: 'a3', label: 'A3 (297 × 420 mm)', ...mm(297, 420) },
  { id: 'a4', label: 'A4 (210 × 297 mm)', ...mm(210, 297) },
  { id: 'a5', label: 'A5 (148 × 210 mm)', ...mm(148, 210) },
  { id: 'a6', label: 'A6 (105 × 148 mm)', ...mm(105, 148) },
  { id: 'letter', label: 'Carta (8.5 × 11 in)', ...inch(8.5, 11) },
  { id: 'tabloid', label: 'Tabloide (11 × 17 in)', ...inch(11, 17) },
  { id: 'us', label: 'Cómic EE.UU. (6.625 × 10.25 in)', ...inch(6.625, 10.25) },
  { id: 'digest', label: 'Digest (5.5 × 8.5 in)', ...inch(5.5, 8.5) },
  { id: 'manga', label: 'Manga B5 (182 × 257 mm)', ...mm(182, 257) },
  { id: 'tankobon', label: 'Tankōbon (127 × 188 mm)', ...mm(127, 188) },
  { id: 'euro', label: 'Álbum europeo (230 × 300 mm)', ...mm(230, 300) },
  { id: 'webtoon', label: 'Webtoon (800 × 1280 px)', w: 800, h: 1280 },
  { id: 'ig-square', label: 'Instagram cuadrado (1080 × 1080 px)', w: 1080, h: 1080 },
  { id: 'ig-portrait', label: 'Instagram vertical (1080 × 1350 px)', w: 1080, h: 1350 },
  { id: 'story', label: 'Historia vertical (1080 × 1920 px)', w: 1080, h: 1920 },
  { id: 'hd', label: 'Horizontal 16:9 (1920 × 1080 px)', w: 1920, h: 1080 }
];

/** Escala de exportación: 2 (300 dpi) salvo que el lienzo resultante sea demasiado grande. */
export const MAX_EXPORT_SIDE = 9000;
export function exportScale(pageW: number, pageH: number, preferred = 2): number {
  return Math.max(0.25, Math.min(preferred, MAX_EXPORT_SIDE / Math.max(pageW, pageH)));
}
