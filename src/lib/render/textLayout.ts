import type { TextStyle } from '../model/types';
import type { RichWrap, Seg } from './richText';

/** Ajuste de línea con formato por partes (ver richText.ts). */
export type RichFn = (size: number, maxWidth: number | ((lineIndex: number) => number)) => RichWrap;

/** Función que mide el ancho (en px) de una cadena con una fuente CSS dada. */
export type Measure = (font: string) => (text: string) => number;

const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']);

/** Familia lista para CSS: las genéricas sin comillas, las demás entrecomilladas. */
export function familyCss(family: string): string {
  const f = GENERIC_FAMILIES.has(family) ? family : `"${family}"`;
  return `${f}, sans-serif`;
}

/** Valor para ctx.font de canvas. */
export function fontCss(style: Pick<TextStyle, 'fontFamily' | 'bold' | 'italic'>, size: number): string {
  return `${style.italic ? 'italic ' : ''}${style.bold ? '700' : '400'} ${size}px ${familyCss(style.fontFamily)}`;
}

/** Parte una palabra demasiado larga en trozos que quepan en maxW. */
function breakWord(word: string, width: (s: string) => number, maxW: number): string[] {
  const pieces: string[] = [];
  let cur = '';
  for (const ch of word) {
    if (cur && width(cur + ch) > maxW) {
      pieces.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) pieces.push(cur);
  return pieces;
}

/** Ajuste de línea por palabras. Respeta los saltos de línea del texto. */
export function wrapText(text: string, maxW: number, width: (s: string) => number): string[] {
  return wrapParagraphs(text, maxW, width).lines;
}

/** Como wrapText, y además indica qué líneas cierran un párrafo (esas no se justifican). */
export function wrapParagraphs(text: string, maxWidth: number | ((lineIndex: number) => number), width: (s: string) => number): { lines: string[]; last: boolean[] } {
  const out: string[] = [];
  const last: boolean[] = [];
  const limit = () => Math.max(1, typeof maxWidth === 'number' ? maxWidth : maxWidth(out.length));
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      last.push(true);
      continue;
    }
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (width(test) <= limit()) {
        line = test;
        continue;
      }
      if (line) {
        out.push(line);
        last.push(false);
      }
      if (width(word) > limit()) {
        const pieces = breakWord(word, width, limit());
        out.push(...pieces.slice(0, -1));
        pieces.slice(0, -1).forEach(() => last.push(false));
        line = pieces.at(-1) ?? '';
      } else {
        line = word;
      }
    }
    out.push(line);
    last.push(true);
  }
  return { lines: out, last };
}

/**
 * Espacio extra (px) que hay que añadir a cada hueco entre palabras para que la línea
 * ocupe todo el ancho. 0 si no hay huecos, la línea ya llena la caja o no debe justificarse.
 */
export function justifySpacing(line: string, boxW: number, width: (s: string) => number): number {
  const gaps = (line.trim().match(/\s+/g) ?? []).length;
  if (gaps === 0) return 0;
  const extra = boxW - width(line);
  return extra > 0 ? extra / gaps : 0;
}

export interface FittedText {
  lines: string[];
  fontSize: number;
  /** Alto de línea en px. */
  lineHeight: number;
  /** Por línea: true si cierra un párrafo (solo horizontal). */
  last?: boolean[];
  /** Texto con formato: palabras de cada línea (posiciones en `text`), anchos reales y segmentos para dibujar. */
  words?: { from: number; to: number }[][];
  lineWidths?: number[];
  segs?: Seg[][];
  /** Por línea: posición y ancho disponibles (globos que siguen su contorno). `y` = arriba de la línea. */
  lineRects?: { x: number; w: number; y: number }[];
  /** El texto no cabe en la caja (solo con tamaño forzado, que no lo reduce). */
  overflow?: boolean;
}

/**
 * Reduce el tamaño de fuente (desde style.fontSize) hasta que el texto quepa
 * en la caja. Nunca baja de minSize.
 */
export function fitText(
  text: string,
  box: { w: number; h: number },
  style: TextStyle,
  measure: Measure,
  lineHeightRatio = 1.2,
  minSize = 8,
  force = false,
  rich?: RichFn
): FittedText {
  let size = force ? Math.max(1, style.fontSize) : Math.max(minSize, style.fontSize);
  for (;;) {
    const wr = rich ? rich(size, Math.max(1, box.w)) : null;
    const { lines, last } = wr ?? wrapParagraphs(text, Math.max(1, box.w), measure(fontCss(style, size)));
    const lineHeight = size * lineHeightRatio;
    const fits = lines.length * lineHeight <= box.h;
    if (force || fits || size <= minSize) {
      return { lines, last, fontSize: size, lineHeight, overflow: !fits, words: wr?.words, lineWidths: wr?.widths };
    }
    size = Math.max(minSize, Math.floor(size * 0.94 * 10) / 10);
  }
}

/**
 * Ajuste en columnas para escritura vertical: cada columna tiene como máximo maxH de alto.
 * Los caracteres se apilan uno bajo otro (el navegador gira las letras latinas). Respeta
 * los saltos de línea; devuelve las columnas en orden de lectura (la primera es la de la derecha).
 */
export function wrapVertical(text: string, maxH: number, width: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let col = '';
    let used = 0;
    for (const ch of para) {
      const adv = Math.max(1, width(ch));
      if (col && used + adv > maxH) {
        out.push(col);
        col = '';
        used = 0;
      }
      col += ch;
      used += adv;
    }
    out.push(col);
  }
  return out;
}

/** Como fitText, pero en vertical: lineHeight es el ancho de cada columna. */
export function fitTextVertical(
  text: string,
  box: { w: number; h: number },
  style: TextStyle,
  measure: Measure,
  columnRatio = 1.25,
  minSize = 8,
  force = false
): FittedText {
  let size = force ? Math.max(1, style.fontSize) : Math.max(minSize, style.fontSize);
  for (;;) {
    const lines = wrapVertical(text, Math.max(1, box.h), measure(fontCss(style, size)));
    const lineHeight = size * columnRatio;
    const fits = lines.length * lineHeight <= box.w;
    if (force || fits || size <= minSize) {
      return { lines, fontSize: size, lineHeight, overflow: !fits };
    }
    size = Math.max(minSize, Math.floor(size * 0.94 * 10) / 10);
  }
}

/** Posición x (centro) de la columna i. Las columnas crecen hacia la izquierda desde el borde derecho del bloque. */
export function columnX(region: { x: number; w: number }, lineHeight: number, count: number, i: number, centered: boolean): number {
  const total = count * lineHeight;
  const right = centered ? region.x + (region.w + total) / 2 : region.x + region.w;
  return right - (i + 0.5) * lineHeight;
}
