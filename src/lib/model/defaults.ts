import type {
  BalloonObj,
  Box,
  ComicDoc,
  Gradient,
  GradientLayer,
  ImageLayer,
  LayerInit,
  ObjectInit,
  PanelObj,
  Page,
  PatternLayer,
  PatternObj,
  Pt,
  TextObj,
  ID
} from './types';
import { uid } from './ids';
import { unitSquare } from './panelGeometry';
import { DEFAULT_GRADIENT } from '../render/paint';

export interface PagePreset {
  id: string;
  label: string;
  w: number;
  h: number;
}

/** Tamaños en píxeles a 150 dpi. */
export const PAGE_PRESETS: PagePreset[] = [
  { id: 'us', label: 'Cómic EE.UU. (6.625 × 10.25 in)', w: 994, h: 1538 },
  { id: 'manga', label: 'Manga B5 (7.2 × 10.1 in)', w: 1080, h: 1515 },
  { id: 'a4', label: 'A4 (210 × 297 mm)', w: 1240, h: 1754 },
  { id: 'square', label: 'Cuadrado (1200 × 1200)', w: 1200, h: 1200 },
  { id: 'strip', label: 'Tira horizontal (1800 × 600)', w: 1800, h: 600 }
];

export const DEFAULT_PRESET = PAGE_PRESETS[0];

export function newPage(): Page {
  return { id: uid(), background: '#ffffff', objects: [] };
}

/** Id de la página de estilo (no choca con los ids aleatorios de las demás). */
export const STYLE_ID = 'style';

/** Página de estilo vacía (en blanco, sin fondo propio). */
export function newStyle(): Page {
  return { id: STYLE_ID, background: 'none', objects: [] };
}

export function newDoc(title = 'Sin título'): ComicDoc {
  return { title, pageW: DEFAULT_PRESET.w, pageH: DEFAULT_PRESET.h, pages: [newPage()], style: newStyle() };
}

type Rest<T extends { type: string; id: string }, K extends keyof T = never> = Partial<Omit<T, 'type' | 'id' | K>>;

export function panel(b: Box, o: Rest<PanelObj, keyof Box> = {}): ObjectInit {
  return {
    type: 'panel',
    ...b,
    rotation: 0,
    shape: 'rect',
    points: unitSquare(),
    fill: '#ffffff',
    stroke: '#111111',
    strokeWidth: 6,
    layers: [],
    ...o
  };
}

/** Viñeta poligonal a partir de vértices en coordenadas de página. */
export function polyPanel(abs: Pt[], o: Rest<PanelObj, keyof Box> = {}): ObjectInit {
  const xs = abs.map((p) => p.x);
  const ys = abs.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(1, Math.max(...xs) - x);
  const h = Math.max(1, Math.max(...ys) - y);
  return panel(
    { x, y, w, h },
    { shape: 'poly', points: abs.map((p) => ({ x: (p.x - x) / w, y: (p.y - y) / h })), ...o }
  );
}

// --- Capas de viñeta ---------------------------------------------------------

export function imageLayer(assetId: ID, scale: number, o: Partial<Omit<ImageLayer, 'type' | 'id'>> = {}): LayerInit {
  return { type: 'image', assetId, x: 0, y: 0, rotation: 0, scale, opacity: 1, ...o };
}

export function patternLayer(o: Partial<Omit<PatternLayer, 'type' | 'id'>> = {}): LayerInit {
  return {
    type: 'pattern',
    kind: 'dots',
    color: '#111111',
    bg: 'none',
    scale: 1,
    seed: 0,
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 1,
    ...o
  };
}

export function gradientLayer(gradient: Gradient = DEFAULT_GRADIENT, o: Partial<Omit<GradientLayer, 'type' | 'id'>> = {}): LayerInit {
  return { type: 'gradient', gradient: { ...gradient }, opacity: 1, ...o };
}

export function balloon(b: Box, o: Rest<BalloonObj, keyof Box> = {}): ObjectInit {
  return {
    type: 'balloon',
    ...b,
    rotation: 0,
    style: 'speech',
    tailX: -b.w * 0.2,
    tailY: b.h * 0.85,
    text: '',
    fontFamily: 'Comic Neue',
    fontSize: 28,
    color: '#111111',
    bold: true,
    italic: false,
    align: 'center',
    fill: '#ffffff',
    stroke: '#111111',
    strokeWidth: 4,
    ...o
  };
}

export function textBox(b: Box, o: Rest<TextObj, keyof Box> = {}): ObjectInit {
  return {
    type: 'text',
    ...b,
    rotation: 0,
    text: 'Texto',
    fontFamily: 'Comic Neue',
    fontSize: 32,
    color: '#111111',
    bold: false,
    italic: false,
    align: 'left',
    outline: '#000000',
    outlineWidth: 0,
    ...o
  };
}

export function pattern(b: Box, o: Rest<PatternObj, keyof Box> = {}): ObjectInit {
  return {
    type: 'pattern',
    ...b,
    rotation: 0,
    kind: 'dots',
    color: '#111111',
    bg: 'none',
    scale: 1,
    seed: 0,
    opacity: 1,
    ...o
  };
}
