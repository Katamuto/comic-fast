/**
 * Biblioteca de tramas y texturas que vienen de CARPETAS (sin tocar código):
 *
 *   src/assets/patterns/   SVG vectoriales (tramas)
 *   src/assets/textures/   imágenes tileables (texturas de imagen)
 *
 * Este módulo es lógica pura (se prueba con vitest): interpreta los nombres de
 * archivo y el contenido de los SVG. La lectura de los archivos está en
 * patternFiles.ts, que registra aquí lo que encuentra.
 *
 * Los negros explícitos del SVG (típicos de Inkscape) pasan a `currentColor`, así que el color de
 * la trama se puede cambiar en el Inspector (ver recolorBlack).
 *
 * Código al comienzo del nombre del SVG (no se muestra en la interfaz):
 *   t_Puntos.svg   → «t» = tileable: se repite como mosaico dentro de su rectángulo
 *   n_Rayos.svg    → «n» = no tileable: una sola figura que llena el rectángulo
 *   Puntos.svg     → sin código = tileable
 */
import type { Names } from '../i18n/core';

export interface SvgPattern {
  /** Nombre sin código ni extensión: es lo que se guarda en el proyecto (`kind`). */
  id: string;
  label: string;
  names?: Names;
  tileable: boolean;
  /** viewBox del SVG: en un mosaico, su tamaño es el del mosaico a escala 1 (unidades de página). */
  vb: { x: number; y: number; w: number; h: number };
  /** Valor de preserveAspectRatio de la figura (solo no tileables). */
  par: string;
  /** Contenido del SVG (sin la etiqueta <svg> exterior). */
  inner: string;
}

export interface ImageTexture {
  /** Nombre sin extensión; en el proyecto se guarda como `img:<id>`. */
  id: string;
  label: string;
  names?: Names;
  url: string;
  /** Tamaño natural en píxeles (se rellena al cargar la imagen). */
  w: number;
  h: number;
}

export const SVG_PATTERNS = new Map<string, SvgPattern>();
export const IMAGE_TEXTURES = new Map<string, ImageTexture>();

/** Prefijo de las texturas de imagen en `PatternKind`. */
export const IMG_PREFIX = 'img:';

const natural = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

/** «03-puntos_grandes» → «Puntos grandes». */
export function prettyName(raw: string): string {
  const s = raw
    .replace(/^\d+[-_. ]+/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : raw;
}

/** Separa el código del nombre: «t_dots.svg» → { tileable: true, id: 'dots' }. */
export function parsePatternName(fileName: string): { id: string; tileable: boolean } {
  const base = fileName.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '');
  const m = /^([tn])_(.+)$/i.exec(base);
  if (!m) return { id: base, tileable: true };
  return { id: m[2], tileable: m[1].toLowerCase() === 't' };
}

/** Quita lo que un SVG de la carpeta no debería ejecutar (scripts y manejadores de eventos). */
export function cleanSvgInner(inner: string): string {
  return inner
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '');
}

/** ¿Es un negro (o casi)? Reconoce #000, #000000, black y rgb(0,0,0), con un pequeño margen. */
function isBlack(v: string): boolean {
  const s = v.trim().toLowerCase();
  if (s === 'black') return true;
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join('') : m[1];
    return [0, 2, 4].every((i) => parseInt(h.slice(i, i + 2), 16) <= 40);
  }
  m = /^rgb\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)\s*\)$/.exec(s);
  return !!m && [m[1], m[2], m[3]].every((n) => Number(n) <= 40);
}

const COLOR_VALUE = '#[0-9a-fA-F]{3,6}\\b|black\\b|rgb\\([^)]*\\)';

/**
 * Los SVG hechos con Inkscape (u otros editores) escriben el negro de forma explícita
 * (`style="fill:#000000"`), y eso impide cambiarles el color desde el Inspector. Aquí todo
 * lo que es negro (relleno o trazo) pasa a `currentColor`, que es el color de la trama.
 * Los demás colores del archivo se respetan.
 */
export function recolorBlack(inner: string): string {
  const asAttr = new RegExp(`(\\b(?:fill|stroke)\\s*=\\s*)(["'])(${COLOR_VALUE})\\2`, 'gi');
  const asCss = new RegExp(`(\\b(?:fill|stroke)\\s*:\\s*)(${COLOR_VALUE})`, 'gi');
  return inner
    .replace(asAttr, (all, pre: string, q: string, v: string) => (isBlack(v) ? `${pre}${q}currentColor${q}` : all))
    .replace(asCss, (all, pre: string, v: string) => (isBlack(v) ? `${pre}currentColor` : all));
}

const num = (s: string | undefined) => {
  const n = s === undefined ? NaN : parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};

/** Interpreta el texto de un SVG: viewBox, preserveAspectRatio y contenido. */
export function parseSvg(text: string): { vb: SvgPattern['vb']; par: string; inner: string } | null {
  const m = /<svg\b([^>]*)>([\s\S]*)<\/svg\s*>/i.exec(text);
  if (!m) return null;
  const attrs = m[1];
  const attr = (name: string) => new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(attrs)?.slice(1).find((v) => v !== undefined);
  let vb = { x: 0, y: 0, w: 100, h: 100 };
  const v = attr('viewBox')?.trim().split(/[\s,]+/).map(num);
  if (v && v.length === 4 && v.every(Number.isFinite) && v[2] > 0 && v[3] > 0) vb = { x: v[0], y: v[1], w: v[2], h: v[3] };
  else {
    const w = num(attr('width'));
    const h = num(attr('height'));
    if (w > 0 && h > 0) vb = { x: 0, y: 0, w, h };
  }
  return { vb, par: attr('preserveAspectRatio') ?? 'xMidYMid slice', inner: recolorBlack(cleanSvgInner(m[2])) };
}

/** Crea la entrada de biblioteca de un archivo SVG de tramas, o null si no es un SVG válido. */
export function patternFromFile(path: string, text: string, names?: Names): SvgPattern | null {
  const parsed = parseSvg(text);
  if (!parsed) return null;
  const { id, tileable } = parsePatternName(path);
  return { id, label: prettyName(id), names, tileable, ...parsed };
}

/** Id y nombre de una textura de imagen a partir de su archivo. */
export function textureFromFile(path: string, url: string, names?: Names): ImageTexture {
  const id = path.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '');
  return { id, label: prettyName(id), names, url, w: 256, h: 256 };
}

export function registerPattern(p: SvgPattern): void {
  SVG_PATTERNS.set(p.id, p);
}
export function registerTexture(t: ImageTexture): void {
  IMAGE_TEXTURES.set(t.id, t);
}
export function clearLibrary(): void {
  SVG_PATTERNS.clear();
  IMAGE_TEXTURES.clear();
}

/** Tramas SVG ordenadas por id (orden natural). */
export const listSvgPatterns = (): SvgPattern[] => [...SVG_PATTERNS.values()].sort((a, b) => natural(a.id, b.id));
export const listImageTextures = (): ImageTexture[] => [...IMAGE_TEXTURES.values()].sort((a, b) => natural(a.id, b.id));
