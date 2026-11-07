import type { Names } from '../i18n/core';
import type { PatternKind } from '../model/types';
import { IMAGE_TEXTURES, IMG_PREFIX, SVG_PATTERNS, listImageTextures, listSvgPatterns } from '../resources/patternLib';

export interface PatternInfo {
  /** Valor de `kind` en el documento. */
  kind: PatternKind;
  /** Nombre de reserva (el de archivo, o el español de las procedurales). */
  label: string;
  /** Nombres traducidos (names.json de la carpeta), si los hay. */
  names?: Names;
  /** true = se repite como mosaico dentro de su rectángulo. */
  tiled: boolean;
}

/**
 * Texturas procedurales (ver textures.ts), siempre disponibles.
 * Las tramas vienen de `src/assets/patterns/*.svg` y las texturas de imagen de
 * `src/assets/textures/` (ver resources/patternLib.ts).
 */
export const PROCEDURAL: { kind: PatternKind; label: string; cls: 'noise' | 'cells' }[] = [
  { kind: 'grain', label: 'Grano (ruido fino)', cls: 'noise' },
  { kind: 'clouds', label: 'Nubes (ruido suave)', cls: 'noise' },
  { kind: 'streaks', label: 'Vetas', cls: 'noise' },
  { kind: 'blots', label: 'Manchas', cls: 'noise' },
  { kind: 'voronoi', label: 'Celdas (Voronoi)', cls: 'cells' },
  { kind: 'cracks', label: 'Grietas (bordes Voronoi)', cls: 'cells' }
];

/** Tramas SVG de la carpeta. */
export function listPatterns(): PatternInfo[] {
  return listSvgPatterns().map((p) => ({ kind: p.id, label: p.label, names: p.names, tiled: p.tileable }));
}

/** Texturas: procedurales + imágenes de la carpeta. */
export function listTextures(): PatternInfo[] {
  return [
    ...PROCEDURAL.map((p) => ({ kind: p.kind, label: p.label, tiled: false })),
    ...listImageTextures().map((t) => ({ kind: IMG_PREFIX + t.id, label: t.label, names: t.names, tiled: true }))
  ];
}

export type PatternClass = 'tile' | 'figure' | 'noise' | 'cells' | 'image' | 'none';

export function patternClass(kind: PatternKind): PatternClass {
  const proc = PROCEDURAL.find((p) => p.kind === kind);
  if (proc) return proc.cls;
  if (kind.startsWith(IMG_PREFIX)) return IMAGE_TEXTURES.has(kind.slice(IMG_PREFIX.length)) ? 'image' : 'none';
  const svg = SVG_PATTERNS.get(kind);
  if (!svg) return 'none';
  return svg.tileable ? 'tile' : 'figure';
}

export function isTiled(kind: PatternKind): boolean {
  const c = patternClass(kind);
  return c === 'tile' || c === 'image';
}

/** Información de una trama o textura (o undefined si ya no existe el archivo). */
export function patternInfo(kind: PatternKind): PatternInfo | undefined {
  return [...listPatterns(), ...listTextures()].find((p) => p.kind === kind);
}

/** Nombre de reserva de cualquier trama o textura. */
export function patternLabel(kind: PatternKind): string {
  return patternInfo(kind)?.label ?? kind.replace(IMG_PREFIX, '');
}

/** ¿Usa la «semilla» (botón Variar)? Solo las texturas procedurales. */
export function usesSeed(kind: PatternKind): boolean {
  const c = patternClass(kind);
  return c === 'noise' || c === 'cells';
}

/**
 * ¿Hace falta una región cuadrada y girable para dibujarla dentro de una viñeta?
 * Las de ruido y las de celdas son iguales en todas direcciones: basta la caja.
 */
export function needsRegion(kind: PatternKind): boolean {
  const c = patternClass(kind);
  return c === 'tile' || c === 'figure' || c === 'image';
}

/** Tamaño de un mosaico (unidades de página): el del viewBox / de la imagen × escala. */
export function tileDims(kind: PatternKind, scale: number): { w: number; h: number } {
  const s = Math.max(0.05, scale);
  if (kind.startsWith(IMG_PREFIX)) {
    const t = IMAGE_TEXTURES.get(kind.slice(IMG_PREFIX.length));
    return { w: Math.max(4, (t?.w ?? 256) * s), h: Math.max(4, (t?.h ?? 256) * s) };
  }
  const p = SVG_PATTERNS.get(kind);
  return { w: Math.max(4, (p?.vb.w ?? 20) * s), h: Math.max(4, (p?.vb.h ?? 20) * s) };
}

/** PRNG determinista (mulberry32): el mismo objeto se dibuja siempre igual. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const f = (n: number) => Math.round(n * 10) / 10;

/** Rayos que salen del centro (líneas de velocidad / concentración). */
export function speedRadialPath(w: number, h: number, scale: number, seed: number): string {
  const rand = rng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const count = Math.round(Math.min(220, Math.max(24, 90 / Math.max(0.25, scale))));
  const outer = Math.hypot(w, h) / 2 + 2;
  const minSide = Math.min(w, h);
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.04;
    const half = (Math.PI / count) * (0.15 + rand() * 0.55);
    const r0 = minSide * (0.2 + rand() * 0.14);
    d +=
      `M ${f(cx + r0 * Math.cos(a))} ${f(cy + r0 * Math.sin(a))} ` +
      `L ${f(cx + outer * Math.cos(a - half))} ${f(cy + outer * Math.sin(a - half))} ` +
      `L ${f(cx + outer * Math.cos(a + half))} ${f(cy + outer * Math.sin(a + half))} Z `;
  }
  return d;
}

/** Líneas horizontales que se afinan hacia la derecha (sensación de velocidad). */
export function speedHorizPath(w: number, h: number, scale: number, seed: number): string {
  const rand = rng(seed);
  const step = 14 * Math.max(0.25, scale);
  let d = '';
  for (let y = step / 2; y < h; y += step * (0.6 + rand() * 0.9)) {
    const t = step * (0.12 + rand() * 0.45);
    const xs = rand() * w * 0.45;
    d += `M ${f(xs)} ${f(y - t / 2)} L ${f(w)} ${f(y)} L ${f(xs)} ${f(y + t / 2)} Z `;
  }
  return d;
}
