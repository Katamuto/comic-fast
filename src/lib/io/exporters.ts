import { zipSync, zlibSync, type Zippable } from 'fflate';
import type { Asset, ComicDoc, ID } from '../model/types';
import { buildPdf, type PdfPage } from './pdf';
import { canvasToBytes, renderPageCanvas } from './render';
import { renderPlan, resolveLayout, type RenderPlan } from '../model/layout';
import { pngWithDpi } from './pngmeta';
import { buildTiffCmyk, clampCmyk, cropMarksPdf, rgbaToCmyk, type CmykOptions } from './cmyk';

/** Un px de página = 1/150 de pulgada = 72/150 puntos. */
const PT_PER_PX = 72 / 150;

export type Progress = (done: number, total: number) => void;

export interface ExportOptions {
  /** PPI de salida (por omisión el del documento). */
  ppi?: number;
  /** Incluir el sangrado del documento alrededor de la página. */
  bleed?: boolean;
  /** Marcas de corte (solo PDF de imprenta). */
  marks?: boolean;
  /** Conversión a CMYK (imprenta). */
  cmyk?: Partial<CmykOptions>;
  /** Páginas (índices) a exportar; por omisión todas. */
  pages?: number[];
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Plan de render (escala, tamaño real, sangrado) para un documento y unas opciones. */
export function planFor(doc: ComicDoc, opts: ExportOptions = {}): RenderPlan {
  const l = resolveLayout(doc.layout);
  return renderPlan(doc.pageW, doc.pageH, opts.ppi ?? l.ppi, opts.bleed ? l.bleed : 0);
}

const indices = (doc: ComicDoc, opts: ExportOptions) => (opts.pages && opts.pages.length ? opts.pages : doc.pages.map((_, i) => i));

export async function exportPagePng(
  doc: ComicDoc,
  pageIndex: number,
  assets: Record<ID, Asset>,
  opts: ExportOptions = {}
): Promise<Uint8Array> {
  const plan = planFor(doc, opts);
  const canvas = await renderPageCanvas(doc, doc.pages[pageIndex], assets, plan.scale, plan.bleed);
  return pngWithDpi(await canvasToBytes(canvas, 'image/png'), plan.effectivePpi);
}

export async function exportPdf(
  doc: ComicDoc,
  assets: Record<ID, Asset>,
  title: string,
  onProgress: Progress = () => {},
  opts: ExportOptions = {}
): Promise<Uint8Array> {
  const plan = planFor(doc, opts);
  const list = indices(doc, opts);
  const pages: PdfPage[] = [];
  const bl = plan.bleed * PT_PER_PX;
  for (let n = 0; n < list.length; n++) {
    onProgress(n, list.length);
    await tick();
    const canvas = await renderPageCanvas(doc, doc.pages[list[n]], assets, plan.scale, plan.bleed);
    const w = (doc.pageW + 2 * plan.bleed) * PT_PER_PX;
    const h = (doc.pageH + 2 * plan.bleed) * PT_PER_PX;
    pages.push({
      jpeg: await canvasToBytes(canvas, 'image/jpeg', 0.95),
      pxW: canvas.width,
      pxH: canvas.height,
      ptW: w,
      ptH: h,
      ...(bl > 0 ? { trim: [bl, bl, w - bl, h - bl] as [number, number, number, number], bleedBox: [0, 0, w, h] as [number, number, number, number] } : {})
    });
  }
  onProgress(list.length, list.length);
  await tick(); // deja pintar «Creando el archivo…» antes del trabajo final, que no cede el control
  return buildPdf(pages, title);
}

/** Convierte un lienzo ya pintado a CMYK entrelazado. */
function canvasToCmyk(canvas: HTMLCanvasElement, o: CmykOptions): Uint8Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return rgbaToCmyk(data, o);
}

/**
 * PDF para imprenta en CMYK: sangrado en el BleedBox, formato final en el TrimBox y, si se pide,
 * marcas de corte en una hoja algo mayor. La imagen va comprimida sin pérdida (Flate).
 */
export async function exportPrintPdf(
  doc: ComicDoc,
  assets: Record<ID, Asset>,
  title: string,
  onProgress: Progress = () => {},
  opts: ExportOptions = {}
): Promise<Uint8Array> {
  const o = clampCmyk(opts.cmyk ?? {});
  const plan = planFor(doc, { ...opts, bleed: opts.bleed ?? true });
  const list = indices(doc, opts);
  const bl = plan.bleed * PT_PER_PX;
  const trimW = doc.pageW * PT_PER_PX;
  const trimH = doc.pageH * PT_PER_PX;
  // Las marcas necesitan espacio: separación (3 pt) + longitud (14 pt) por fuera del sangrado.
  const slug = opts.marks ? Math.max(0, 17 - bl) : 0;
  const pad = bl + slug;
  const pages: PdfPage[] = [];
  for (let n = 0; n < list.length; n++) {
    onProgress(n, list.length);
    await tick();
    const canvas = await renderPageCanvas(doc, doc.pages[list[n]], assets, plan.scale, plan.bleed);
    const cmyk = canvasToCmyk(canvas, o);
    const W = trimW + 2 * pad;
    const H = trimH + 2 * pad;
    const trim: [number, number, number, number] = [pad, pad, pad + trimW, pad + trimH];
    pages.push({
      jpeg: zlibSync(cmyk, { level: 6 }),
      cmyk: true,
      pxW: canvas.width,
      pxH: canvas.height,
      ptW: trimW + 2 * bl,
      ptH: trimH + 2 * bl,
      media: { w: W, h: H },
      image: { x: pad - bl, y: pad - bl, w: trimW + 2 * bl, h: trimH + 2 * bl },
      trim,
      bleedBox: [pad - bl, pad - bl, pad + trimW + bl, pad + trimH + bl],
      marks: opts.marks ? cropMarksPdf(trim, bl, 14) : undefined
    });
  }
  onProgress(list.length, list.length);
  await tick();
  return buildPdf(pages, title);
}

/** TIFF CMYK por página, en un ZIP (las imprentas y Photoshop/InDesign los abren directamente). */
export async function exportTiffZip(
  doc: ComicDoc,
  assets: Record<ID, Asset>,
  onProgress: Progress = () => {},
  opts: ExportOptions = {}
): Promise<Uint8Array> {
  const o = clampCmyk(opts.cmyk ?? {});
  const plan = planFor(doc, { ...opts, bleed: opts.bleed ?? true });
  const list = indices(doc, opts);
  const files: Zippable = {};
  const digits = Math.max(3, String(doc.pages.length).length);
  for (let n = 0; n < list.length; n++) {
    onProgress(n, list.length);
    await tick();
    const canvas = await renderPageCanvas(doc, doc.pages[list[n]], assets, plan.scale, plan.bleed);
    const tiff = buildTiffCmyk(canvasToCmyk(canvas, o), canvas.width, canvas.height, plan.effectivePpi, true);
    files[`${String(list[n] + 1).padStart(digits, '0')}.tif`] = [tiff, { level: 0 }];
  }
  onProgress(list.length, list.length);
  await tick();
  return zipSync(files);
}

/** CBZ: un ZIP de imágenes numeradas, el formato estándar de lectores de cómics. */
export async function exportCbz(
  doc: ComicDoc,
  assets: Record<ID, Asset>,
  onProgress: Progress = () => {},
  opts: ExportOptions = {}
): Promise<Uint8Array> {
  const files: Zippable = {};
  const digits = Math.max(3, String(doc.pages.length).length);
  // Un CBZ es para leer en pantalla: con el PPI del documento y sin sangrado (salvo que se pida).
  const plan = planFor(doc, { ...opts, ppi: opts.ppi });
  for (let i = 0; i < doc.pages.length; i++) {
    onProgress(i, doc.pages.length);
    await tick();
    const canvas = await renderPageCanvas(doc, doc.pages[i], assets, plan.scale, plan.bleed);
    files[`${String(i + 1).padStart(digits, '0')}.jpg`] = [await canvasToBytes(canvas, 'image/jpeg', 0.92), { level: 0 }];
  }
  onProgress(doc.pages.length, doc.pages.length);
  await tick();
  return zipSync(files);
}
