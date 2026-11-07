/**
 * Texturas procedurales sencillas.
 *  - Ruido (grano, nubes): filtro SVG feTurbulence, sin dependencias.
 *  - Celdas (Voronoi, grietas): se calculan aquí como polígonos y se dibujan como trazados.
 * Todo es determinista: la misma semilla da siempre el mismo resultado.
 */
import type { Pt } from '../model/types';
import { rng } from './patterns';
import { colorAlpha, colorRgb } from './color';

// --- Ruido -----------------------------------------------------------------

/** [r, g, b] de un color '#rgb', '#rrggbb' o '#rrggbbaa'. */
export function hexToRgb(hex: string): [number, number, number] {
  return colorRgb(hex);
}

export interface NoiseParams {
  baseFrequency: number | string;
  octaves: number;
  /** Matriz de feColorMatrix: color fijo y opacidad sacada del ruido. */
  matrix: string;
  seed: number;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export type NoiseKind = 'grain' | 'clouds' | 'streaks' | 'blots';

export function noiseParams(kind: NoiseKind, color: string, scale: number, seed: number, amount = 0.5): NoiseParams {
  const [r, g, b] = colorRgb(color).map((v) => r3(v / 255));
  const a = colorAlpha(color);
  const s = Math.max(0.1, scale);
  // `amount` (0…1, por defecto 0.5): cuánto del dibujo se cubre. Con 0.5 es el aspecto de siempre.
  const k = Math.min(1, Math.max(0, amount)) - 0.5;
  const base = {
    grain: { freq: r3(0.8 / s) as number | string, octaves: 2, gain: 3.2, bias: -1.4 },
    clouds: { freq: r3(0.006 / s), octaves: 5, gain: 2.6, bias: -0.85 },
    // Vetas horizontales (pincel seco, líneas de velocidad suaves).
    streaks: { freq: `${r3(0.004 / s)} ${r3(0.3 / s)}`, octaves: 3, gain: 2.8, bias: -1.15 },
    // Manchas de bordes duros (tinta, humedad).
    blots: { freq: r3(0.012 / s), octaves: 3, gain: 9, bias: -4.4 }
  }[kind];
  return {
    baseFrequency: base.freq,
    octaves: base.octaves,
    matrix: `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${r3(base.gain * a)} 0 0 0 ${r3((base.bias + k * 1.6 * (base.gain / 3)) * a)}`,
    seed: Math.floor(seed % 9973)
  };
}

// --- Voronoi ---------------------------------------------------------------

/** Recorta un polígono con el semiplano a·x + b·y ≤ c (Sutherland–Hodgman). */
function clip(poly: Pt[], a: number, b: number, c: number): Pt[] {
  const out: Pt[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const cur = poly[i];
    const prev = poly[(i + n - 1) % n];
    const dc = a * cur.x + b * cur.y - c;
    const dp = a * prev.x + b * prev.y - c;
    if (dc <= 0) {
      if (dp > 0) out.push(cross(prev, cur, dp, dc));
      out.push(cur);
    } else if (dp <= 0) {
      out.push(cross(prev, cur, dp, dc));
    }
  }
  return out;
}

function cross(p: Pt, q: Pt, dp: number, dq: number): Pt {
  const t = dp / (dp - dq);
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

export interface VoronoiCell {
  d: string;
  /** 0..1, tono aleatorio de la celda. */
  shade: number;
}

const f = (n: number) => Math.round(n * 10) / 10;

/** Celdas de Voronoi sobre una cuadrícula con puntos desplazados al azar, recortadas a w × h. */
export function voronoiCells(w: number, h: number, cell: number, seed: number): VoronoiCell[] {
  let size = Math.max(8, cell);
  // Tope de celdas para que el dibujo siga siendo ligero.
  const area = Math.max(1, w * h);
  if (area / (size * size) > 2500) size = Math.sqrt(area / 2500);

  const cols = Math.ceil(w / size);
  const rows = Math.ceil(h / size);
  const pts = new Map<string, Pt & { shade: number }>();
  const point = (i: number, j: number) => {
    const key = `${i},${j}`;
    let p = pts.get(key);
    if (!p) {
      const r = rng(((i + 4099) * 73856093) ^ ((j + 4099) * 19349663) ^ (seed >>> 0));
      p = { x: (i + 0.15 + 0.7 * r()) * size, y: (j + 0.15 + 0.7 * r()) * size, shade: r() };
      pts.set(key, p);
    }
    return p;
  };

  const out: VoronoiCell[] = [];
  // También se calculan las celdas de la fila/columna de fuera: sus puntos pueden quedar cerca del borde.
  for (let j = -1; j <= rows; j++) {
    for (let i = -1; i <= cols; i++) {
      const p = point(i, j);
      const R = size * 3;
      let poly: Pt[] = [
        { x: p.x - R, y: p.y - R },
        { x: p.x + R, y: p.y - R },
        { x: p.x + R, y: p.y + R },
        { x: p.x - R, y: p.y + R }
      ];
      for (let dj = -2; dj <= 2 && poly.length > 2; dj++) {
        for (let di = -2; di <= 2 && poly.length > 2; di++) {
          if (di === 0 && dj === 0) continue;
          const q = point(i + di, j + dj);
          poly = clip(poly, 2 * (q.x - p.x), 2 * (q.y - p.y), q.x * q.x + q.y * q.y - p.x * p.x - p.y * p.y);
        }
      }
      // Recorte a la caja.
      poly = clip(poly, -1, 0, 0);
      poly = clip(poly, 1, 0, w);
      poly = clip(poly, 0, -1, 0);
      poly = clip(poly, 0, 1, h);
      if (poly.length < 3) continue;
      out.push({ d: poly.map((v, k) => `${k ? 'L' : 'M'} ${f(v.x)} ${f(v.y)}`).join(' ') + ' Z', shade: p.shade });
    }
  }
  return out;
}
