/**
 * Texto con formato por partes. El texto sigue siendo una cadena (`text`); el formato va aparte
 * en `spans` (rangos [from, to) con solo lo que cambia respecto al objeto). Todo puro y probado.
 */
import type { Span } from '../model/types';
import { fontCss, type Measure } from './textLayout';

export interface BaseStyle {
  bold: boolean;
  italic: boolean;
  color: string;
  fontFamily: string;
}

/** Formato resuelto de un carácter. */
export interface Fmt {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
  fontFamily: string;
}
export type FmtKey = keyof Fmt;
type Over = Partial<Fmt>;

const KEYS: FmtKey[] = ['bold', 'italic', 'underline', 'strike', 'color', 'fontFamily'];

const baseOf = (b: BaseStyle): Fmt => ({ bold: b.bold, italic: b.italic, underline: false, strike: false, color: b.color, fontFamily: b.fontFamily });

export const hasSpans = (o: { spans?: Span[] }): boolean => !!o.spans && o.spans.length > 0;

/** Diferencias de cada carácter respecto a la base (aplica los spans en orden). */
function overrides(spans: Span[], len: number, base: BaseStyle): Over[] {
  const b = baseOf(base);
  const out: Over[] = Array.from({ length: len }, () => ({}));
  for (const s of spans) {
    const from = Math.max(0, s.from);
    const to = Math.min(len, s.to);
    for (let i = from; i < to; i++) {
      for (const k of KEYS) {
        const v = s[k];
        if (v === undefined) continue;
        if (v === b[k]) delete out[i][k];
        else (out[i] as Record<string, unknown>)[k] = v;
      }
    }
  }
  return out;
}

const sameOver = (a: Over, b: Over) => KEYS.every((k) => a[k] === b[k]);
const emptyOver = (a: Over) => KEYS.every((k) => a[k] === undefined);

/** Compacta las diferencias por carácter en spans mínimos. */
function toSpans(over: Over[]): Span[] {
  const out: Span[] = [];
  let i = 0;
  while (i < over.length) {
    if (emptyOver(over[i])) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < over.length && sameOver(over[i], over[j])) j++;
    out.push({ from: i, to: j, ...over[i] });
    i = j;
  }
  return out;
}

/** Spans canónicos: ordenados, sin solapes, sin valores iguales a la base ni tramos vacíos. */
export function normalizeSpans(spans: Span[] | undefined, len: number, base: BaseStyle): Span[] {
  if (!spans || spans.length === 0 || len === 0) return [];
  return toSpans(overrides(spans, len, base));
}

/** Formato resuelto del carácter i. */
export function fmtAt(over: Over[], base: BaseStyle, i: number): Fmt {
  return { ...baseOf(base), ...(over[i] ?? {}) } as Fmt;
}

/** Aplica un cambio de formato al rango [from, to). `undefined` en una clave = volver al valor del objeto. */
export function applyFormat(spans: Span[] | undefined, len: number, base: BaseStyle, from: number, to: number, patch: Partial<Record<FmtKey, unknown>>): Span[] {
  const over = overrides(spans ?? [], len, base);
  const b = baseOf(base);
  for (let i = Math.max(0, from); i < Math.min(len, to); i++) {
    for (const k of KEYS) {
      if (!(k in patch)) continue;
      const v = patch[k];
      if (v === undefined || v === b[k]) delete over[i][k];
      else (over[i] as Record<string, unknown>)[k] = v;
    }
  }
  return toSpans(over);
}

/** Valor común de una clave en el rango (undefined si hay mezcla o el rango está vacío). */
export function commonValue<K extends FmtKey>(spans: Span[] | undefined, len: number, base: BaseStyle, from: number, to: number, key: K): Fmt[K] | undefined {
  const over = overrides(spans ?? [], len, base);
  let val: Fmt[K] | undefined;
  for (let i = Math.max(0, from); i < Math.min(len, to); i++) {
    const v = fmtAt(over, base, i)[key];
    if (val === undefined) val = v;
    else if (val !== v) return undefined;
  }
  return val;
}

/** Activa o quita negrita/cursiva/subrayado/tachado en el rango: si todo ya lo tiene, se quita; si no, se pone. */
export function toggleFlag(spans: Span[] | undefined, len: number, base: BaseStyle, from: number, to: number, key: 'bold' | 'italic' | 'underline' | 'strike'): Span[] {
  const all = commonValue(spans, len, base, from, to, key) === true;
  return applyFormat(spans, len, base, from, to, { [key]: !all });
}

/**
 * Reubica los spans cuando el texto cambia (se calcula la zona modificada comparando prefijo y sufijo).
 * Lo que se escribe al final de un tramo hereda su formato.
 */
export function shiftSpans(spans: Span[] | undefined, oldText: string, newText: string): Span[] | undefined {
  if (!spans || spans.length === 0 || oldText === newText) return spans;
  const oldLen = oldText.length;
  const newLen = newText.length;
  let p = 0;
  while (p < oldLen && p < newLen && oldText[p] === newText[p]) p++;
  let s = 0;
  while (s < oldLen - p && s < newLen - p && oldText[oldLen - 1 - s] === newText[newLen - 1 - s]) s++;
  const oldEnd = oldLen - s;
  const newEnd = newLen - s;
  const delta = newLen - oldLen;
  const insertion = p === oldEnd;
  const start = (x: number) => (x < p ? x : x >= oldEnd ? x + delta : p);
  const end = (x: number) => {
    if (x < p) return x;
    if (x > oldEnd) return x + delta;
    if (insertion) return x + delta;
    return x === p ? p : newEnd;
  };
  const out: Span[] = [];
  for (const sp of spans) {
    const from = Math.max(0, Math.min(newLen, start(sp.from)));
    const to = Math.max(0, Math.min(newLen, end(sp.to)));
    if (to > from) out.push({ ...sp, from, to });
  }
  return out;
}

// --- Medida, ajuste de línea y segmentos -------------------------------------------

export interface Seg extends Fmt {
  text: string;
}

const sameFmt = (a: Fmt, b: Fmt) => KEYS.every((k) => a[k] === b[k]);

export interface RichCtx {
  text: string;
  base: BaseStyle;
  over: Over[];
}

export function richCtx(text: string, spans: Span[], base: BaseStyle): RichCtx {
  return { text, base, over: overrides(spans, text.length, base) };
}

/** Trozos [from, to) con formato uniforme. */
function runs(ctx: RichCtx, from: number, to: number): { from: number; to: number; fmt: Fmt }[] {
  const out: { from: number; to: number; fmt: Fmt }[] = [];
  let i = from;
  while (i < to) {
    const f = fmtAt(ctx.over, ctx.base, i);
    let j = i + 1;
    while (j < to && sameOver(ctx.over[j] ?? {}, ctx.over[i] ?? {})) j++;
    out.push({ from: i, to: j, fmt: f });
    i = j;
  }
  return out;
}

const fontFor = (f: Fmt, size: number) => fontCss({ fontFamily: f.fontFamily, bold: f.bold, italic: f.italic }, size);

/** Ancho de text[from, to) con el formato de cada trozo. */
export function richWidth(ctx: RichCtx, size: number, measure: Measure): (from: number, to: number) => number {
  const cache = new Map<string, (t: string) => number>();
  const m = (f: Fmt) => {
    const font = fontFor(f, size);
    let fn = cache.get(font);
    if (!fn) {
      fn = measure(font);
      cache.set(font, fn);
    }
    return fn;
  };
  return (from, to) => runs(ctx, from, to).reduce((w, r) => w + m(r.fmt)(ctx.text.slice(r.from, r.to)), 0);
}

export interface Word {
  from: number;
  to: number;
}

export interface RichWrap {
  lines: string[];
  last: boolean[];
  words: Word[][];
  widths: number[];
}

/** Ajuste de línea por palabras como wrapParagraphs, pero conservando de dónde sale cada palabra. */
export function wrapRich(text: string, maxWidth: number | ((lineIndex: number) => number), width: (from: number, to: number) => number, spaceW: number): RichWrap {
  const lines: string[] = [];
  const last: boolean[] = [];
  const words: Word[][] = [];
  const widths: number[] = [];
  const limit = () => Math.max(1, typeof maxWidth === 'number' ? maxWidth : maxWidth(lines.length));
  let offset = 0;
  for (const para of text.split('\n')) {
    const ws: Word[] = [];
    for (const m of para.matchAll(/\S+/g)) ws.push({ from: offset + m.index!, to: offset + m.index! + m[0].length });
    offset += para.length + 1;
    if (ws.length === 0) {
      lines.push('');
      last.push(true);
      words.push([]);
      widths.push(0);
      continue;
    }
    let cur: Word[] = [];
    let curW = 0;
    const push = (isLast: boolean) => {
      lines.push(cur.map((w) => text.slice(w.from, w.to)).join(' '));
      last.push(isLast);
      words.push(cur);
      widths.push(curW);
    };
    for (const w of ws) {
      const ww = width(w.from, w.to);
      const test = cur.length ? curW + spaceW + ww : ww;
      if (test <= limit()) {
        cur.push(w);
        curW = test;
        continue;
      }
      if (cur.length) {
        push(false);
        cur = [];
        curW = 0;
      }
      if (ww > limit()) {
        // palabra más ancha que la línea: se parte por caracteres
        let from = w.from;
        let i = w.from + 1;
        while (i <= w.to) {
          if (i < w.to && width(from, i + 1) > limit() && i > from) {
            cur = [{ from, to: i }];
            curW = width(from, i);
            push(false);
            cur = [];
            from = i;
          }
          i++;
        }
        cur = [{ from, to: w.to }];
        curW = width(from, w.to);
      } else {
        cur = [w];
        curW = ww;
      }
    }
    push(true);
  }
  return { lines, last, words, widths };
}

/** Segmentos con formato de una línea (palabras unidas por un espacio con el formato de la palabra anterior). */
export function lineSegments(ctx: RichCtx, words: Word[]): Seg[] {
  const out: Seg[] = [];
  const add = (text: string, fmt: Fmt) => {
    const prev = out[out.length - 1];
    if (prev && sameFmt(prev, fmt)) prev.text += text;
    else out.push({ ...fmt, text });
  };
  words.forEach((w, k) => {
    if (k > 0) add(' ', fmtAt(ctx.over, ctx.base, words[k - 1].to - 1));
    for (const r of runs(ctx, w.from, w.to)) add(ctx.text.slice(r.from, r.to), r.fmt);
  });
  return out;
}

/** Función de ajuste de línea para fitText/fitContourText cuando el texto tiene formato. */
export function richWrapper(text: string, spans: Span[], base: BaseStyle, measure: Measure) {
  const ctx = richCtx(text, spans, base);
  return {
    ctx,
    wrap: (size: number, maxWidth: number | ((i: number) => number)): RichWrap => {
      const space = measure(fontFor(baseOf(base), size))(' ');
      return wrapRich(text, maxWidth, richWidth(ctx, size, measure), space);
    }
  };
}
