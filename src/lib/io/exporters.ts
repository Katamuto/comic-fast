import { zipSync, type Zippable } from 'fflate';
import type { Asset, ComicDoc, ID } from '../model/types';
import { buildPdf, type PdfPage } from './pdf';
import { canvasToBytes, renderPageCanvas } from './render';
import { exportScale } from '../model/units';

/** Preferido: 2 = 300 dpi (las páginas se definen a 150 dpi). Se reduce en páginas muy grandes. */
export const EXPORT_SCALE = 2;
const scaleOf = (doc: ComicDoc) => exportScale(doc.pageW, doc.pageH, EXPORT_SCALE);
const PX_PER_POINT = 150 / 72;

export type Progress = (done: number, total: number) => void;

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export async function exportPagePng(doc: ComicDoc, pageIndex: number, assets: Record<ID, Asset>): Promise<Uint8Array> {
  const canvas = await renderPageCanvas(doc, doc.pages[pageIndex], assets, scaleOf(doc));
  return canvasToBytes(canvas, 'image/png');
}

export async function exportPdf(
  doc: ComicDoc,
  assets: Record<ID, Asset>,
  title: string,
  onProgress: Progress = () => {}
): Promise<Uint8Array> {
  const pages: PdfPage[] = [];
  for (let i = 0; i < doc.pages.length; i++) {
    onProgress(i, doc.pages.length);
    await tick();
    const canvas = await renderPageCanvas(doc, doc.pages[i], assets, scaleOf(doc));
    pages.push({
      jpeg: await canvasToBytes(canvas, 'image/jpeg', 0.92),
      pxW: canvas.width,
      pxH: canvas.height,
      ptW: doc.pageW / PX_PER_POINT,
      ptH: doc.pageH / PX_PER_POINT
    });
  }
  onProgress(doc.pages.length, doc.pages.length);
  await tick(); // deja pintar «Creando el archivo…» antes del trabajo final, que no cede el control
  return buildPdf(pages, title);
}

/** CBZ: un ZIP de imágenes numeradas, el formato estándar de lectores de cómics. */
export async function exportCbz(
  doc: ComicDoc,
  assets: Record<ID, Asset>,
  onProgress: Progress = () => {}
): Promise<Uint8Array> {
  const files: Zippable = {};
  const digits = Math.max(3, String(doc.pages.length).length);
  for (let i = 0; i < doc.pages.length; i++) {
    onProgress(i, doc.pages.length);
    await tick();
    const canvas = await renderPageCanvas(doc, doc.pages[i], assets, scaleOf(doc));
    files[`${String(i + 1).padStart(digits, '0')}.jpg`] = [await canvasToBytes(canvas, 'image/jpeg', 0.92), { level: 0 }];
  }
  onProgress(doc.pages.length, doc.pages.length);
  await tick();
  return zipSync(files);
}
