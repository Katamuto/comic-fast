/**
 * Operaciones de píxeles del editor de imágenes. Todo es puro (sin DOM) para poder probarlo:
 * trabajan sobre un `Raster` (RGBA sin premultiplicar, como ImageData) y máscaras de selección
 * (un byte por píxel: 0 = fuera, 255 = dentro).
 */

export interface Raster {
  w: number;
  h: number;
  /** RGBA, 4 bytes por píxel. */
  data: Uint8ClampedArray;
}

export type Mask = Uint8Array;
export type SelectMode = 'replace' | 'add' | 'sub';

export const newRaster = (w: number, h: number): Raster => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });
export const cloneRaster = (r: Raster): Raster => ({ w: r.w, h: r.h, data: new Uint8ClampedArray(r.data) });
export const newMask = (w: number, h: number): Mask => new Uint8Array(w * h);

const clampInt = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

// --- Selecciones ------------------------------------------------------------

export function rectMask(w: number, h: number, x0: number, y0: number, x1: number, y1: number): Mask {
  const m = newMask(w, h);
  const xa = clampInt(Math.min(x0, x1), 0, w);
  const xb = clampInt(Math.max(x0, x1), 0, w);
  const ya = clampInt(Math.min(y0, y1), 0, h);
  const yb = clampInt(Math.max(y0, y1), 0, h);
  for (let y = ya; y < yb; y++) m.fill(255, y * w + xa, y * w + xb);
  return m;
}

/** Relleno de un polígono (regla par-impar), tomando el centro de cada píxel. */
export function polygonMask(w: number, h: number, pts: { x: number; y: number }[]): Mask {
  const m = newMask(w, h);
  if (pts.length < 3) return m;
  for (let y = 0; y < h; y++) {
    const cy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a.y <= cy && b.y > cy) || (b.y <= cy && a.y > cy)) {
        xs.push(a.x + ((cy - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const from = clampInt(Math.ceil(xs[i] - 0.5), 0, w);
      const to = clampInt(Math.ceil(xs[i + 1] - 0.5), 0, w);
      if (to > from) m.fill(255, y * w + from, y * w + to);
    }
  }
  return m;
}

export function combineMask(base: Mask | null, next: Mask, mode: SelectMode): Mask {
  if (mode === 'replace' || !base) return mode === 'sub' ? new Uint8Array(next.length) : next;
  const out = new Uint8Array(base.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = mode === 'add' ? (base[i] || next[i] ? 255 : 0) : base[i] && !next[i] ? 255 : 0;
  }
  return out;
}

export function invertMask(m: Mask): Mask {
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = m[i] ? 0 : 255;
  return out;
}

export function maskBounds(m: Mask, w: number, h: number): { x: number; y: number; w: number; h: number } | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (m[y * w + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export const maskEmpty = (m: Mask | null): boolean => !m || !m.some((v) => v);

/**
 * Varita mágica: píxeles parecidos al de (x, y). La diferencia entre dos píxeles es la mayor de las
 * diferencias de sus canales R, G, B y A; `tol` (0–255) es el máximo permitido. Dos píxeles totalmente
 * transparentes son iguales aunque su color oculto sea distinto. `contiguous`: solo la región conectada.
 */
export function magicWand(r: Raster, x: number, y: number, tol: number, contiguous: boolean): Mask {
  const { w, h, data } = r;
  const m = newMask(w, h);
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return m;
  const o = (y * w + x) * 4;
  const tr = data[o];
  const tg = data[o + 1];
  const tb = data[o + 2];
  const ta = data[o + 3];
  const like = (i: number) => {
    const p = i * 4;
    const a = data[p + 3];
    if (a === 0 && ta === 0) return true;
    return Math.max(Math.abs(data[p] - tr), Math.abs(data[p + 1] - tg), Math.abs(data[p + 2] - tb), Math.abs(a - ta)) <= tol;
  };
  if (!contiguous) {
    for (let i = 0; i < w * h; i++) if (like(i)) m[i] = 255;
    return m;
  }
  // Relleno por líneas (rápido y sin recursión).
  const stack: number[] = [x, y];
  while (stack.length) {
    const cy = stack.pop()!;
    let cx = stack.pop()!;
    while (cx >= 0 && !m[cy * w + cx] && like(cy * w + cx)) cx--;
    cx++;
    let up = false;
    let down = false;
    while (cx < w && !m[cy * w + cx] && like(cy * w + cx)) {
      m[cy * w + cx] = 255;
      if (cy > 0) {
        const ok = !m[(cy - 1) * w + cx] && like((cy - 1) * w + cx);
        if (ok && !up) stack.push(cx, cy - 1);
        up = ok;
      }
      if (cy < h - 1) {
        const ok = !m[(cy + 1) * w + cx] && like((cy + 1) * w + cx);
        if (ok && !down) stack.push(cx, cy + 1);
        down = ok;
      }
      cx++;
    }
  }
  return m;
}

// --- Edición ----------------------------------------------------------------

/** Deja transparentes los píxeles de la selección. */
export function clearMask(r: Raster, m: Mask): void {
  for (let i = 0; i < m.length; i++) if (m[i]) r.data[i * 4 + 3] = 0;
}

/** Deja transparente todo lo que NO está en la selección. */
export function clearOutside(r: Raster, m: Mask): void {
  for (let i = 0; i < m.length; i++) if (!m[i]) r.data[i * 4 + 3] = 0;
}

export function fillMask(r: Raster, m: Mask, rgba: [number, number, number, number]): void {
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    r.data[i * 4] = rgba[0];
    r.data[i * 4 + 1] = rgba[1];
    r.data[i * 4 + 2] = rgba[2];
    r.data[i * 4 + 3] = rgba[3];
  }
}

export function cropRaster(r: Raster, x: number, y: number, w: number, h: number): Raster {
  x = clampInt(x, 0, r.w - 1);
  y = clampInt(y, 0, r.h - 1);
  w = clampInt(w, 1, r.w - x);
  h = clampInt(h, 1, r.h - y);
  const out = newRaster(w, h);
  for (let row = 0; row < h; row++) {
    const from = ((y + row) * r.w + x) * 4;
    out.data.set(r.data.subarray(from, from + w * 4), row * w * 4);
  }
  return out;
}

export function cropMask(m: Mask, mw: number, x: number, y: number, w: number, h: number): Mask {
  const out = newMask(w, h);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) out[row * w + col] = m[(y + row) * mw + x + col];
  }
  return out;
}

export interface ColorToAlphaOpts {
  /** 0–1: por debajo de este valor de opacidad nueva, el píxel queda del todo transparente. */
  transparencyThreshold?: number;
  /** 0–1: por encima de (1 − este valor), el píxel queda del todo opaco. */
  opacityThreshold?: number;
}

/**
 * «Color a alfa» (como el de GIMP): el color elegido pasa a ser transparente y los píxeles que se le
 * parecen, semitransparentes, de modo que al poner de nuevo ese color debajo se recupera la imagen
 * original. Respeta la transparencia que ya hubiera. Con selección, solo actúa dentro de ella.
 */
export function colorToAlpha(r: Raster, rgb: [number, number, number], mask: Mask | null, opts: ColorToAlphaOpts = {}): void {
  const tt = Math.min(0.99, Math.max(0, opts.transparencyThreshold ?? 0));
  const ot = Math.min(0.99 - tt, Math.max(0, opts.opacityThreshold ?? 0));
  const cr = rgb[0] / 255;
  const cg = rgb[1] / 255;
  const cb = rgb[2] / 255;
  const chan = (s: number, c: number) => (s > c ? (s - c) / (1 - c) : s < c ? (c - s) / c : 0);
  const d = r.data;
  for (let i = 0; i < r.w * r.h; i++) {
    if (mask && !mask[i]) continue;
    const p = i * 4;
    const sa = d[p + 3] / 255;
    if (sa === 0) continue;
    const sr = d[p] / 255;
    const sg = d[p + 1] / 255;
    const sb = d[p + 2] / 255;
    let a = Math.max(chan(sr, cr), chan(sg, cg), chan(sb, cb));
    if (a <= tt) a = 0;
    else if (a >= 1 - ot) a = 1;
    else if (tt > 0 || ot > 0) a = (a - tt) / (1 - tt - ot);
    if (a < 1e-4) {
      d[p + 3] = 0;
      continue;
    }
    d[p] = Math.round(((sr - cr) / a + cr) * 255);
    d[p + 1] = Math.round(((sg - cg) / a + cg) * 255);
    d[p + 2] = Math.round(((sb - cb) / a + cb) * 255);
    d[p + 3] = Math.round(a * sa * 255);
  }
}

// --- Pincel y borrador ------------------------------------------------------

export interface BrushOpts {
  /** Diámetro en píxeles de la imagen. */
  size: number;
  /** 0 = muy suave, 1 = borde duro. */
  hardness: number;
  /** 0–1. La opacidad es de todo el trazo: pasar varias veces por el mismo sitio no oscurece. */
  opacity: number;
  color: [number, number, number];
  /** true: borra (baja la opacidad de los píxeles) en lugar de pintar. */
  erase: boolean;
  /** Punta de pincel de imagen (de los assets). Falta = redonda con dureza. */
  tip?: Tip | null;
  /** Separación entre sellos como fracción del tamaño (por defecto 0.15). */
  spacing?: number;
  /** Giro aleatorio de la punta en cada sello (0–1 = hasta una vuelta). */
  angleJitter?: number;
  /** Tableta: la presión controla el tamaño (min = fracción del tamaño con presión 0). */
  pressureSize?: PressureRange | null;
  /** Tableta: la presión controla la opacidad (min = fracción de la opacidad con presión 0). */
  pressureOpacity?: PressureRange | null;
}

/** Rango con el que la presión escala una magnitud: de `min` (presión 0) a 1 (presión máxima). */
export interface PressureRange {
  min: number;
}

/** Punta de pincel: máscara cuadrada n × n de opacidades 0–1. */
export interface Tip {
  n: number;
  alpha: Float32Array;
}

/**
 * Convierte los píxeles RGBA de una imagen cuadrada en una punta: la opacidad es la del canal alfa;
 * si la imagen no tiene nada de transparencia, la da su oscuridad (negro = pinta).
 */
export function tipFromRgba(data: Uint8ClampedArray | Uint8Array, n: number): Tip {
  let minA = 255;
  for (let i = 3; i < n * n * 4; i += 4) if (data[i] < minA) minA = data[i];
  const alpha = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const p = i * 4;
    if (minA < 255) alpha[i] = data[p + 3] / 255;
    else alpha[i] = (1 - (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255) * (data[p + 3] / 255);
  }
  return { n, alpha };
}

/** Factor 0–1 que aplica la presión a una magnitud (1 si no hay rango activo). */
export function pressureFactor(p: number, range: PressureRange | null | undefined): number {
  if (!range) return 1;
  const min = Math.min(1, Math.max(0, range.min));
  return min + (1 - min) * Math.min(1, Math.max(0, p));
}

/** Opacidad de la punta en (u, v) ∈ [0,1]² con interpolación bilineal; 0 fuera. */
export function tipAt(tip: Tip, u: number, v: number): number {
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return 0;
  const n = tip.n;
  const fx = u * n - 0.5;
  const fy = v * n - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const g = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? 0 : tip.alpha[y * n + x]);
  return (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
}

/** Un trazo en curso. Se parte de una copia de la imagen para que la opacidad sea del trazo entero. */
export class Stroke {
  private base: Uint8ClampedArray;
  private cover: Float32Array;
  /** Zona modificada (para refrescar solo eso en pantalla). */
  dirty = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  private last: { x: number; y: number; p: number } | null = null;

  constructor(
    private r: Raster,
    private opts: BrushOpts,
    private mask: Mask | null
  ) {
    this.base = new Uint8ClampedArray(r.data);
    this.cover = new Float32Array(r.w * r.h);
  }

  /** Punto nuevo (con la presión 0–1 de la tableta; 1 con ratón): une con el anterior con una línea de sellos. */
  add(x: number, y: number, pressure = 1): void {
    const { size } = this.opts;
    const spacing = this.opts.spacing ?? 0.15;
    if (!this.last) {
      this.stamp(x, y, pressure);
    } else {
      const dx = x - this.last.x;
      const dy = y - this.last.y;
      const dist = Math.hypot(dx, dy);
      const step = Math.max(0.5, size * pressureFactor(pressure, this.opts.pressureSize) * spacing);
      const n = Math.floor(dist / step);
      for (let i = 1; i <= n; i++) {
        const f = i / n;
        this.stamp(this.last.x + dx * f, this.last.y + dy * f, this.last.p + (pressure - this.last.p) * f);
      }
      if (n === 0 && dist > 0) this.stamp(x, y, pressure);
    }
    this.last = { x, y, p: pressure };
  }

  private seed = 12345;
  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private stamp(cx: number, cy: number, pressure: number): void {
    const { r, opts } = this;
    const R = Math.max(0.5, (opts.size * pressureFactor(pressure, opts.pressureSize)) / 2);
    const op = pressureFactor(pressure, opts.pressureOpacity);
    const tip = opts.tip ?? null;
    const ang = tip && opts.angleJitter ? this.rand() * Math.PI * 2 * opts.angleJitter : 0;
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const inner = R * Math.min(1, Math.max(0, opts.hardness));
    const E = tip ? R * 1.5 : R; // la punta girada puede salirse del círculo
    const x0 = Math.max(0, Math.floor(cx - E - 1));
    const x1 = Math.min(r.w - 1, Math.ceil(cx + E + 1));
    const y0 = Math.max(0, Math.floor(cy - E - 1));
    const y1 = Math.min(r.h - 1, Math.ceil(cy + E + 1));
    if (x0 > x1 || y0 > y1) return;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        let c: number;
        if (tip) {
          // La punta ocupa el cuadrado de lado 2R centrado en el sello (girado ang).
          const ox = x + 0.5 - cx;
          const oy = y + 0.5 - cy;
          const rx = ox * cosA + oy * sinA;
          const ry = -ox * sinA + oy * cosA;
          c = tipAt(tip, rx / (2 * R) + 0.5, ry / (2 * R) + 0.5);
        } else {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d <= inner) c = 1;
          else if (R - inner < 1) c = Math.min(1, Math.max(0, R - d + 0.5)); // borde duro con suavizado de 1 px
          else c = Math.max(0, 1 - (d - inner) / (R - inner));
        }
        c *= op;
        if (c <= 0) continue;
        const i = y * r.w + x;
        if (c > this.cover[i]) this.cover[i] = c;
        this.paint(i);
      }
    }
    this.dirty.x0 = Math.min(this.dirty.x0, x0);
    this.dirty.y0 = Math.min(this.dirty.y0, y0);
    this.dirty.x1 = Math.max(this.dirty.x1, x1);
    this.dirty.y1 = Math.max(this.dirty.y1, y1);
  }

  /** Recompone un píxel a partir de la copia original y la cobertura acumulada del trazo. */
  private paint(i: number): void {
    const { base, r, opts } = this;
    const m = this.mask ? this.mask[i] / 255 : 1;
    const a = this.cover[i] * opts.opacity * m;
    const p = i * 4;
    const dr = base[p];
    const dg = base[p + 1];
    const db = base[p + 2];
    const da = base[p + 3] / 255;
    if (opts.erase) {
      r.data[p] = dr;
      r.data[p + 1] = dg;
      r.data[p + 2] = db;
      r.data[p + 3] = Math.round(da * (1 - a) * 255);
      return;
    }
    const oa = a + da * (1 - a);
    if (oa <= 0) return;
    r.data[p] = Math.round((opts.color[0] * a + dr * da * (1 - a)) / oa);
    r.data[p + 1] = Math.round((opts.color[1] * a + dg * da * (1 - a)) / oa);
    r.data[p + 2] = Math.round((opts.color[2] * a + db * da * (1 - a)) / oa);
    r.data[p + 3] = Math.round(oa * 255);
  }
}

// --- Historial --------------------------------------------------------------

/** Pila de deshacer/rehacer con copias completas de la imagen y un tope de memoria. */
export class RasterHistory {
  private undoStack: Raster[] = [];
  private redoStack: Raster[] = [];
  constructor(private maxBytes = 256 * 1024 * 1024) {}

  private bytes(list: Raster[]) {
    return list.reduce((n, r) => n + r.data.length, 0);
  }

  /** Guarda el estado ANTERIOR a un cambio. */
  push(before: Raster): void {
    this.undoStack.push(cloneRaster(before));
    this.redoStack = [];
    while (this.undoStack.length > 1 && this.bytes(this.undoStack) > this.maxBytes) this.undoStack.shift();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(current: Raster): Raster | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(cloneRaster(current));
    return prev;
  }

  redo(current: Raster): Raster | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(cloneRaster(current));
    return next;
  }
}


// --- Gota (difuminar) y dedo (esparcir) -------------------------------------

export interface FingerOpts {
  mode: 'blur' | 'smudge';
  size: number;
  /** 0–1: cuánto difumina o cuánto arrastra la pintura. */
  strength: number;
  hardness: number;
  tip?: Tip | null;
  spacing?: number;
  pressureSize?: PressureRange | null;
  /** La presión modula la fuerza (en los dos modos). */
  pressureStrength?: PressureRange | null;
}

/**
 * Herramientas que no «pintan» un color sino que mueven o mezclan lo que ya hay.
 * Trabajan en alfa premultiplicado para que las transparencias no manchen de negro.
 */
export class FingerStroke {
  dirty = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  private last: { x: number; y: number; p: number } | null = null;
  /** Dedo: lo que lleva el dedo, indexado por posición dentro del sello (cuadrado de lado `side`). */
  private carry: Float32Array | null = null;
  private side = 0;

  constructor(
    private r: Raster,
    private opts: FingerOpts,
    private mask: Mask | null
  ) {}

  add(x: number, y: number, pressure = 1): void {
    const spacing = this.opts.spacing ?? 0.12;
    if (!this.last) {
      this.stamp(x, y, pressure);
    } else {
      const dx = x - this.last.x;
      const dy = y - this.last.y;
      const dist = Math.hypot(dx, dy);
      const step = Math.max(0.75, this.opts.size * pressureFactor(pressure, this.opts.pressureSize) * spacing);
      const n = Math.floor(dist / step);
      for (let i = 1; i <= n; i++) {
        const f = i / n;
        this.stamp(this.last.x + dx * f, this.last.y + dy * f, this.last.p + (pressure - this.last.p) * f);
      }
      if (n === 0 && dist > 0.5) this.stamp(x, y, pressure);
    }
    this.last = { x, y, p: pressure };
  }

  private weight(dx: number, dy: number, R: number): number {
    const { opts } = this;
    if (opts.tip) return tipAt(opts.tip, dx / (2 * R) + 0.5, dy / (2 * R) + 0.5);
    const d = Math.hypot(dx, dy);
    const inner = R * Math.min(1, Math.max(0, opts.hardness));
    if (d <= inner) return 1;
    if (d >= R) return 0;
    return 1 - (d - inner) / (R - inner);
  }

  private stamp(cx: number, cy: number, pressure: number): void {
    const { r, opts } = this;
    const R = Math.max(1, (opts.size * pressureFactor(pressure, opts.pressureSize)) / 2);
    const k0 = opts.strength * pressureFactor(pressure, opts.pressureStrength);
    const ix = Math.round(cx);
    const iy = Math.round(cy);
    const half = Math.ceil(R);
    const side = half * 2 + 1;
    const x0 = Math.max(0, ix - half);
    const x1 = Math.min(r.w - 1, ix + half);
    const y0 = Math.max(0, iy - half);
    const y1 = Math.min(r.h - 1, iy + half);
    if (x0 > x1 || y0 > y1) return;

    // Copia premultiplicada de la zona antes de tocarla.
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const src = new Float32Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = ((y0 + y) * r.w + (x0 + x)) * 4;
        const a = r.data[p + 3] / 255;
        const q = (y * w + x) * 4;
        src[q] = (r.data[p] / 255) * a;
        src[q + 1] = (r.data[p + 1] / 255) * a;
        src[q + 2] = (r.data[p + 2] / 255) * a;
        src[q + 3] = a;
      }
    }

    if (opts.mode === 'smudge' && (!this.carry || this.side !== side)) {
      // El primer sello solo recoge: el dedo empieza «mojado» con lo que hay debajo.
      this.side = side;
      this.carry = new Float32Array(side * side * 4);
      this.fillCarry(src, x0, y0, w, h, ix, iy, half);
      return;
    }

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const wgt = this.weight(x + 0.5 - cx, y + 0.5 - cy, R);
        if (wgt <= 0) continue;
        const m = this.mask ? this.mask[y * r.w + x] / 255 : 1;
        const k = Math.min(1, wgt * k0) * m;
        if (k <= 0) continue;
        const q = ((y - y0) * w + (x - x0)) * 4;
        let tr: number, tg: number, tb: number, ta: number;
        if (opts.mode === 'blur') {
          // Media de los vecinos (radio 2) como destino.
          let sr = 0, sg = 0, sb = 0, sa = 0, cnt = 0;
          for (let dy = -2; dy <= 2; dy++) {
            const yy = y + dy - y0;
            if (yy < 0 || yy >= h) continue;
            for (let dx = -2; dx <= 2; dx++) {
              const xx = x + dx - x0;
              if (xx < 0 || xx >= w) continue;
              const qq = (yy * w + xx) * 4;
              sr += src[qq]; sg += src[qq + 1]; sb += src[qq + 2]; sa += src[qq + 3];
              cnt++;
            }
          }
          tr = sr / cnt; tg = sg / cnt; tb = sb / cnt; ta = sa / cnt;
        } else {
          const c = this.carry!;
          const ci = ((y - iy + half) * side + (x - ix + half)) * 4;
          tr = c[ci]; tg = c[ci + 1]; tb = c[ci + 2]; ta = c[ci + 3];
        }
        const or = src[q] + (tr - src[q]) * k;
        const og = src[q + 1] + (tg - src[q + 1]) * k;
        const ob = src[q + 2] + (tb - src[q + 2]) * k;
        const oa = src[q + 3] + (ta - src[q + 3]) * k;
        const p = (y * r.w + x) * 4;
        if (oa <= 0.0001) {
          r.data[p + 3] = 0;
        } else {
          r.data[p] = Math.round(Math.min(1, or / oa) * 255);
          r.data[p + 1] = Math.round(Math.min(1, og / oa) * 255);
          r.data[p + 2] = Math.round(Math.min(1, ob / oa) * 255);
          r.data[p + 3] = Math.round(oa * 255);
        }
      }
    }

    if (opts.mode === 'smudge') {
      // El dedo recoge de lo que tocó (antes de cambiarlo) y conserva parte de lo que ya llevaba.
      this.fillCarry(src, x0, y0, w, h, ix, iy, half, opts.strength);
    }
    this.dirty.x0 = Math.min(this.dirty.x0, x0);
    this.dirty.y0 = Math.min(this.dirty.y0, y0);
    this.dirty.x1 = Math.max(this.dirty.x1, x1);
    this.dirty.y1 = Math.max(this.dirty.y1, y1);
  }

  /** carry = mezcla(lo que hay bajo el sello, lo que ya llevaba); keep = cuánto conserva de lo anterior. */
  private fillCarry(src: Float32Array, x0: number, y0: number, w: number, h: number, ix: number, iy: number, half: number, keep = 0): void {
    const c = this.carry!;
    const side = this.side;
    for (let sy = 0; sy < side; sy++) {
      for (let sx = 0; sx < side; sx++) {
        const x = ix - half + sx;
        const y = iy - half + sy;
        const ci = (sy * side + sx) * 4;
        const inside = x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
        for (let ch = 0; ch < 4; ch++) {
          const under = inside ? src[((y - y0) * w + (x - x0)) * 4 + ch] : 0;
          c[ci + ch] = keep > 0 ? under + (c[ci + ch] - under) * keep : under;
        }
      }
    }
  }
}

// --- Bote de pintura --------------------------------------------------------

/** Rellena la zona de color parecido (tolerancia) con el color y la opacidad dados, respetando la selección. */
export function bucketFill(
  r: Raster,
  x: number,
  y: number,
  tol: number,
  contiguous: boolean,
  rgb: [number, number, number],
  opacity: number,
  sel: Mask | null,
  grow = 1
): void {
  let m = magicWand(r, x, y, tol, contiguous);
  if (grow > 0) m = dilate(m, r.w, r.h, grow);
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const s = sel ? sel[i] / 255 : 1;
    const a = opacity * s;
    if (a <= 0) continue;
    const p = i * 4;
    const da = r.data[p + 3] / 255;
    const oa = a + da * (1 - a);
    r.data[p] = Math.round((rgb[0] * a + r.data[p] * da * (1 - a)) / oa);
    r.data[p + 1] = Math.round((rgb[1] * a + r.data[p + 1] * da * (1 - a)) / oa);
    r.data[p + 2] = Math.round((rgb[2] * a + r.data[p + 2] * da * (1 - a)) / oa);
    r.data[p + 3] = Math.round(oa * 255);
  }
}

/** Engorda una máscara `n` píxeles (tapa el halo de antialias en los bordes). */
export function dilate(m: Mask, w: number, h: number, n: number): Mask {
  let cur = m;
  for (let k = 0; k < n; k++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cur[i]) continue;
        if ((x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1]) || (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) next[i] = 255;
      }
    }
    cur = next;
  }
  return cur;
}
