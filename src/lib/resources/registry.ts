/**
 * Registro de recursos del panel derecho.
 *
 * Cada pestaña es una lista de ítems, y cada ítem sabe construir los objetos
 * que añade a la página (`build`). Para agregar un globo, una trama o una
 * plantilla de página basta con añadir un ítem aquí.
 *
 * Futuro: cargar paquetes externos (carpetas con manifest.json) y volcar sus
 * ítems en estas mismas listas, sin tocar el resto del código.
 */
import type { BalloonObj, LayerInit, ObjectInit, Pt, TextObj } from '../model/types';
import { balloon, gradientLayer, panel, pattern, patternLayer, polyPanel, textBox } from '../model/defaults';
import './patternFiles'; // registra las tramas SVG y texturas de imagen de las carpetas
import { listPatterns, listTextures, patternClass } from '../render/patterns';
import { GRADIENT_PRESETS } from '../render/paint';

export interface ResourceCtx {
  pageW: number;
  pageH: number;
  /** Punto (en página) donde se colocará el recurso. */
  cx: number;
  cy: number;
}

export interface ResourceItem {
  id: string;
  label: string;
  group?: string;
  build(ctx: ResourceCtx): ObjectInit[];
  /**
   * Si existe, el recurso también puede soltarse DENTRO de una viñeta como capa
   * (tramas, texturas y degradados).
   */
  layer?(): LayerInit;
}

export interface ResourceTab {
  id: string;
  label: string;
  /** 'assets' = imágenes importadas por la persona; 'items' = lista del registro. */
  kind: 'assets' | 'items' | 'stock';
  items: ResourceItem[];
}

/** Contexto para dibujar las miniaturas de los ítems. */
export const PREVIEW_CTX: ResourceCtx = { pageW: 300, pageH: 450, cx: 150, cy: 225 };

// --- Globos ------------------------------------------------------------------

interface BalloonSpec {
  id: string;
  label: string;
  /** Ancho como fracción de 300 unidades por cada 1000 de ancho de página. */
  hr: number;
  tail: [number, number];
  over: Partial<Omit<BalloonObj, 'type' | 'id' | 'x' | 'y' | 'w' | 'h'>>;
  wide?: number;
}

function balloonItem(s: BalloonSpec): ResourceItem {
  return {
    id: s.id,
    label: s.label,
    build: (ctx) => {
      const u = ctx.pageW / 1000;
      const w = (s.wide ?? 300) * u;
      const h = w * s.hr;
      return [
        balloon(
          { x: ctx.cx - w / 2, y: ctx.cy - h / 2, w, h },
          {
            fontSize: Math.round(30 * u),
            strokeWidth: Math.max(2, Math.round(4 * u)),
            tailX: w * s.tail[0],
            tailY: h * s.tail[1],
            ...s.over
          }
        )
      ];
    }
  };
}

const balloons: ResourceItem[] = [
  balloonItem({ id: 'speech', label: 'Diálogo', hr: 0.6, tail: [-0.22, 0.85], over: { style: 'speech', text: '¡Hola!' } }),
  balloonItem({ id: 'speech-r', label: 'Diálogo (cola der.)', hr: 0.6, tail: [0.22, 0.85], over: { style: 'speech', text: '¿Qué tal?' } }),
  balloonItem({ id: 'speech-n', label: 'Óvalo sin cola', hr: 0.6, tail: [0, 0], over: { style: 'speech', text: 'Mmm…' } }),
  balloonItem({ id: 'thought', label: 'Pensamiento', hr: 0.62, tail: [-0.3, 0.95], over: { style: 'thought', text: 'Qué raro…', bold: false } }),
  balloonItem({
    id: 'shout',
    label: 'Grito',
    hr: 0.78,
    tail: [0, 0],
    wide: 340,
    over: { style: 'shout', text: '¡AAAH!', fontFamily: 'Bangers', bold: false, fontSize: 44 }
  }),
  balloonItem({
    id: 'whisper',
    label: 'Susurro',
    hr: 0.55,
    tail: [0.2, 0.85],
    over: { style: 'whisper', text: 'psst…', italic: true, bold: false }
  }),
  balloonItem({
    id: 'jagged',
    label: 'Dentado',
    hr: 0.6,
    tail: [0, 0],
    wide: 320,
    over: { style: 'jagged', text: '¡Alerta!', bold: true }
  }),
  balloonItem({ id: 'rounded', label: 'Cuadrado redondeado', hr: 0.6, tail: [-0.22, 0.85], over: { style: 'rounded', text: '¡Hola!' } }),
  balloonItem({ id: 'scallop', label: 'Nube suave', hr: 0.62, tail: [-0.22, 0.85], over: { style: 'scallop', text: 'Pues…' } }),
  balloonItem({ id: 'blob', label: 'Óvalo irregular', hr: 0.6, tail: [0.22, 0.85], over: { style: 'blob', text: 'Bueno…' } }),
  balloonItem({ id: 'angular', label: 'Óvalo con esquinas', hr: 0.6, tail: [-0.22, 0.85], over: { style: 'angular', text: '¡Oye!' } }),
  balloonItem({
    id: 'impact',
    label: 'Impacto',
    hr: 0.8,
    tail: [0, 0],
    wide: 340,
    over: { style: 'impact', text: '¡BAM!', fontFamily: 'Bangers', bold: false, fontSize: 44 }
  }),
  {
    id: 'chain',
    label: 'Dos globos seguidos',
    build: (ctx) => {
      const u = ctx.pageW / 1000;
      const w = 260 * u;
      const h = w * 0.55;
      const common = { fontSize: Math.round(28 * u), strokeWidth: Math.max(2, Math.round(4 * u)) };
      const a = balloon({ x: ctx.cx - w * 0.95, y: ctx.cy - h * 0.9, w, h }, { ...common, style: 'speech', text: 'Primero…', tailX: -w * 0.2, tailY: h * 0.9 });
      // La cola del segundo apunta al primero (para enlazarlos de verdad: Inspector → Encadenar).
      const b = balloon({ x: ctx.cx - w * 0.1, y: ctx.cy - h * 0.1, w, h }, { ...common, style: 'speech', text: '…y luego.', tailX: -w * 0.62, tailY: -h * 0.62 });
      return [a, b];
    }
  },
  balloonItem({
    id: 'caption',
    label: 'Narración',
    hr: 0.3,
    tail: [0, 0],
    wide: 380,
    over: { style: 'caption', text: 'Mientras tanto…', fill: '#fff3b0', bold: false, align: 'left' }
  })
];

// --- Viñetas y plantillas de página ---------------------------------------------

interface Row {
  /** Alto relativo de la fila. */
  h: number;
  /** Anchos relativos de las columnas. */
  cols: number[];
}

function gridLayout(ctx: ResourceCtx, rows: Row[]): ObjectInit[] {
  const margin = ctx.pageW * 0.04;
  const gutter = ctx.pageW * 0.022;
  const W = ctx.pageW - 2 * margin;
  const H = ctx.pageH - 2 * margin - gutter * (rows.length - 1);
  const sumH = rows.reduce((a, r) => a + r.h, 0);
  const strokeWidth = Math.max(2, Math.round((6 * ctx.pageW) / 1000));
  const out: ObjectInit[] = [];
  let y = margin;
  for (const r of rows) {
    const rh = (H * r.h) / sumH;
    const sumC = r.cols.reduce((a, c) => a + c, 0);
    const rw = W - gutter * (r.cols.length - 1);
    let x = margin;
    for (const c of r.cols) {
      const w = (rw * c) / sumC;
      out.push(panel({ x, y, w, h: rh }, { strokeWidth }));
      x += w + gutter;
    }
    y += rh + gutter;
  }
  return out;
}

function layoutItem(id: string, label: string, rows: Row[]): ResourceItem {
  return { id, label, group: 'Plantillas de página', build: (ctx) => gridLayout(ctx, rows) };
}

const one = { h: 1, cols: [1] };

function singlePanel(id: string, label: string, fw: number, fh: number): ResourceItem {
  return {
    id,
    label,
    group: 'Viñeta suelta',
    build: (ctx) => {
      const w = ctx.pageW * fw;
      const h = ctx.pageH * fh;
      return [panel({ x: ctx.cx - w / 2, y: ctx.cy - h / 2, w, h }, { strokeWidth: Math.max(2, Math.round((6 * ctx.pageW) / 1000)) })];
    }
  };
}

const strokeFor = (ctx: ResourceCtx) => Math.max(2, Math.round((6 * ctx.pageW) / 1000));

/** Viñeta con forma (elipse o polígono con vértices en fracciones de su caja). */
function shapePanel(id: string, label: string, fw: number, fh: number, shape: 'ellipse' | Pt[]): ResourceItem {
  return {
    id,
    label,
    group: 'Formas',
    build: (ctx) => {
      const w = ctx.pageW * fw;
      const h = ctx.pageH * fh;
      const b = { x: ctx.cx - w / 2, y: ctx.cy - h / 2, w, h };
      if (shape === 'ellipse') return [panel(b, { shape: 'ellipse', strokeWidth: strokeFor(ctx) })];
      return [
        polyPanel(
          shape.map((p) => ({ x: b.x + p.x * w, y: b.y + p.y * h })),
          { strokeWidth: strokeFor(ctx) }
        )
      ];
    }
  };
}

/** Páginas con viñetas apiladas separadas por cortes en diagonal. */
function diagLayout(id: string, label: string, n: number, slant: number): ResourceItem {
  return {
    id,
    label,
    group: 'Plantillas de página',
    build: (ctx) => {
      const m = ctx.pageW * 0.04;
      const g = ctx.pageW * 0.022;
      const L = m;
      const R = ctx.pageW - m;
      const T = m;
      const B = ctx.pageH - m;
      const s = ctx.pageW * slant;
      // Corte k (1..n-1): sube hacia la izquierda y baja hacia la derecha.
      const cut = (k: number) => {
        const y = T + ((B - T) * k) / n;
        return { l: y - s / 2, r: y + s / 2 };
      };
      const out: ObjectInit[] = [];
      for (let i = 0; i < n; i++) {
        const top = i === 0 ? { l: T, r: T } : { l: cut(i).l + g / 2, r: cut(i).r + g / 2 };
        const bot = i === n - 1 ? { l: B, r: B } : { l: cut(i + 1).l - g / 2, r: cut(i + 1).r - g / 2 };
        out.push(
          polyPanel(
            [
              { x: L, y: top.l },
              { x: R, y: top.r },
              { x: R, y: bot.r },
              { x: L, y: bot.l }
            ],
            { strokeWidth: strokeFor(ctx) }
          )
        );
      }
      return out;
    }
  };
}

const panels: ResourceItem[] = [
  layoutItem('l-1', 'Página completa', [one]),
  layoutItem('l-2r', '2 filas', [one, one]),
  layoutItem('l-2c', '2 columnas', [{ h: 1, cols: [1, 1] }]),
  layoutItem('l-3r', '3 filas', [one, one, one]),
  layoutItem('l-22', '2 × 2', [{ h: 1, cols: [1, 1] }, { h: 1, cols: [1, 1] }]),
  layoutItem('l-23', '2 × 3', [{ h: 1, cols: [1, 1] }, { h: 1, cols: [1, 1] }, { h: 1, cols: [1, 1] }]),
  layoutItem('l-big2', 'Grande + 2', [{ h: 2, cols: [1] }, { h: 1, cols: [1, 1] }]),
  layoutItem('l-2big', '2 + grande', [{ h: 1, cols: [1, 1] }, { h: 2, cols: [1] }]),
  layoutItem('l-zig', 'Escalonada', [{ h: 1, cols: [2, 1] }, { h: 1, cols: [1, 2] }, { h: 1, cols: [2, 1] }]),
  layoutItem('l-3top', '3 arriba + grande', [{ h: 1, cols: [1, 1, 1] }, { h: 2, cols: [1] }]),
  singlePanel('p-h', 'Viñeta horizontal', 0.8, 0.26),
  singlePanel('p-v', 'Viñeta vertical', 0.42, 0.42),
  singlePanel('p-s', 'Viñeta cuadrada', 0.5, 0.33),
  diagLayout('l-diag2', 'Diagonal × 2', 2, 0.22),
  diagLayout('l-diag3', 'Diagonal × 3', 3, 0.16),
  shapePanel('s-circle', 'Viñeta redonda', 0.42, 0.273, 'ellipse'),
  shapePanel('s-ellipse', 'Elipse', 0.6, 0.26, 'ellipse'),
  shapePanel('s-para', 'Paralelogramo', 0.6, 0.26, [
    { x: 0.2, y: 0 },
    { x: 1, y: 0 },
    { x: 0.8, y: 1 },
    { x: 0, y: 1 }
  ]),
  shapePanel('s-trap', 'Trapecio', 0.6, 0.26, [
    { x: 0.14, y: 0 },
    { x: 0.86, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ]),
  shapePanel('s-tri', 'Triángulo', 0.5, 0.33, [
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ]),
  shapePanel('s-diamond', 'Rombo', 0.42, 0.273, [
    { x: 0.5, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 }
  ]),
  shapePanel('s-hex', 'Hexágono', 0.46, 0.26, [
    { x: 0.25, y: 0 },
    { x: 0.75, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0.75, y: 1 },
    { x: 0.25, y: 1 },
    { x: 0, y: 0.5 }
  ])
];

// --- Tramas -----------------------------------------------------------------

const patterns: ResourceItem[] = listPatterns().map((p) => ({
  id: `pat-${p.kind}`,
  label: p.label,
  build: (ctx) => {
    const radial = p.kind === 'speedRadial';
    const w = ctx.pageW * (radial ? 0.6 : 0.5);
    const h = ctx.pageH * (radial ? 0.4 : 0.22);
    return [
      pattern(
        { x: ctx.cx - w / 2, y: ctx.cy - h / 2, w, h },
        { kind: p.kind, scale: 1, color: '#111111', bg: 'none' }
      )
    ];
  },
  layer: () => patternLayer({ kind: p.kind })
}));

// --- Texturas ----------------------------------------------------------------

const textures: ResourceItem[] = listTextures().map((t) => {
  const soft = t.kind === 'clouds';
  const image = patternClass(t.kind) === 'image';
  const color = soft ? '#5b7fa6' : '#111111';
  return {
    id: `tex-${t.kind}`,
    label: t.label,
    build: (ctx) => {
      const w = ctx.pageW * 0.5;
      const h = ctx.pageH * 0.25;
      return [pattern({ x: ctx.cx - w / 2, y: ctx.cy - h / 2, w, h }, { kind: t.kind, color: image ? '#ffffff' : color })];
    },
    layer: () => patternLayer({ kind: t.kind, color: image ? '#ffffff' : color })
  };
});

// --- Degradados ----------------------------------------------------------------

const gradients: ResourceItem[] = GRADIENT_PRESETS.map((g) => ({
  id: `grad-${g.id}`,
  label: g.label,
  // Suelto: una viñeta sin borde con ese relleno.
  build: (ctx) => {
    const w = ctx.pageW * 0.5;
    const h = ctx.pageH * 0.25;
    return [panel({ x: ctx.cx - w / 2, y: ctx.cy - h / 2, w, h }, { fill: { ...g.gradient }, strokeWidth: 0 })];
  },
  layer: () => gradientLayer(g.gradient)
}));

// --- Texto y onomatopeyas ------------------------------------------------------

interface TextSpec {
  id: string;
  label: string;
  group: string;
  w: number;
  h: number;
  over: Partial<Omit<TextObj, 'type' | 'id' | 'x' | 'y' | 'w' | 'h'>>;
}

function textItem(s: TextSpec): ResourceItem {
  return {
    id: s.id,
    label: s.label,
    group: s.group,
    build: (ctx) => {
      const u = ctx.pageW / 1000;
      const w = s.w * u;
      const h = s.h * u;
      const base = s.over.fontSize ?? 36;
      const outline = s.over.outlineWidth ?? 0;
      return [
        textBox(
          { x: ctx.cx - w / 2, y: ctx.cy - h / 2, w, h },
          { ...s.over, fontSize: Math.round(base * u), outlineWidth: outline * u }
        )
      ];
    }
  };
}

const sfx = (id: string, text: string, color: string): TextSpec => ({
  id,
  label: text,
  group: 'Onomatopeyas',
  w: 520,
  h: 190,
  over: {
    text,
    role: 'sfx',
    fontFamily: 'Bangers',
    fontSize: 130,
    color,
    outline: '#111111',
    outlineWidth: 12,
    align: 'center',
    bold: false
  }
});

const texts: ResourceItem[] = [
  textItem({ id: 't-box', label: 'Cuadro de texto', group: 'Texto', w: 320, h: 90, over: { text: 'Texto', fontSize: 36 } }),
  textItem({
    id: 't-title',
    label: 'Título',
    group: 'Texto',
    w: 760,
    h: 170,
    over: {
      text: 'TÍTULO',
      role: 'title',
      fontFamily: 'Bangers',
      fontSize: 110,
      color: '#ffd400',
      outline: '#111111',
      outlineWidth: 10,
      align: 'center',
      bold: false
    }
  }),
  // Se verá como el número real de cada página. Pensado para la página de estilo (pie o encabezado).
  textItem({
    id: 't-pageno',
    label: 'Número de página',
    group: 'Texto',
    w: 160,
    h: 70,
    over: { text: '{n}', fontSize: 34, bold: true }
  }),
  textItem(sfx('sfx-boom', '¡BOOM!', '#e53935')),
  textItem(sfx('sfx-pow', '¡POW!', '#ffd400')),
  textItem(sfx('sfx-crash', '¡CRASH!', '#fb8c00')),
  textItem(sfx('sfx-splash', '¡SPLASH!', '#29b6f6')),
  textItem(sfx('sfx-zzz', 'ZZZ…', '#7e57c2'))
];

export const TABS: ResourceTab[] = [
  { id: 'images', label: 'Imágenes', kind: 'assets', items: [] },
  { id: 'stock', label: 'Incluidas', kind: 'stock', items: [] },
  { id: 'balloons', label: 'Globos', kind: 'items', items: balloons },
  { id: 'panels', label: 'Viñetas', kind: 'items', items: panels },
  { id: 'patterns', label: 'Tramas', kind: 'items', items: patterns },
  { id: 'textures', label: 'Texturas', kind: 'items', items: textures },
  { id: 'gradients', label: 'Degradados', kind: 'items', items: gradients },
  { id: 'text', label: 'Texto', kind: 'items', items: texts }
];

export function findItem(tabId: string, itemId: string): ResourceItem | undefined {
  return TABS.find((t) => t.id === tabId)?.items.find((i) => i.id === itemId);
}

/** Tipo de arrastre usado entre el panel de recursos y el lienzo. */
export const DRAG_TYPE = 'application/x-comicfast';
