/**
 * Rasterización de páginas para exportar.
 *
 * Se reutiliza el MISMO componente que dibuja el lienzo (PageSvg), así lo
 * exportado coincide con lo que se ve. Pasos:
 *   1. Montar PageSvg fuera de pantalla y serializar el <svg>.
 *   2. Incrustar imágenes (data:) y fuentes (@font-face base64): un SVG que
 *      se carga como <img> no puede ver recursos de la página.
 *   3. Cargar ese SVG como imagen y dibujarlo en un canvas.
 */
import { TKError } from '../i18n/core';
import { flushSync, mount, unmount } from 'svelte';
import PageSvg from '../components/PageSvg.svelte';
import { FONT_FACES, loadFonts } from '../render/fonts.svelte';
import { userFonts } from '../render/userFonts.svelte';
import { pageInfo } from '../model/style';
import { bytesToBase64, mimeFromName } from './images';
import { IMAGE_TEXTURES } from '../resources/patternLib';
import type { Asset, ComicDoc, ID, Page } from '../model/types';

const dataUrlCache = new Map<string, string>();

function assetDataUrl(a: Asset): string {
  let url = dataUrlCache.get(a.url);
  if (!url) {
    url = `data:${a.mime};base64,${bytesToBase64(a.bytes)}`;
    dataUrlCache.set(a.url, url);
  }
  return url;
}

/** Incrusta una imagen de la app (p. ej. una textura de la carpeta) como data: para poder exportarla. */
async function resourceDataUrl(url: string): Promise<string> {
  let out = dataUrlCache.get(url);
  if (!out) {
    const res = await fetch(url);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const mime = res.headers.get('content-type')?.split(';')[0] || mimeFromName(url.split('?')[0]) || 'image/png';
    out = `data:${mime};base64,${bytesToBase64(bytes)}`;
    dataUrlCache.set(url, out);
  }
  return out;
}

const userCss = new Map<string, string>();

/** @font-face de las fuentes importadas (con los datos incrustados). */
function userFontCss(): { family: string; css: string }[] {
  return userFonts.list.map((f) => {
    let css = userCss.get(f.id);
    if (!css) {
      const fmt = f.mime === 'font/woff2' ? 'woff2' : f.mime === 'font/woff' ? 'woff' : f.mime === 'font/otf' ? 'opentype' : 'truetype';
      css =
        `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:${f.style};` +
        `src:url("data:${f.mime};base64,${bytesToBase64(f.bytes)}") format("${fmt}");}`;
      userCss.set(f.id, css);
    }
    return { family: f.family, css };
  });
}

const faceCssCache = new Map<string, { family: string; css: string }>();

/** Solo descarga e incrusta las fuentes que el SVG usa (las CJK pesan varios MB). */
async function fontFaceCss(markup: string): Promise<{ family: string; css: string }[]> {
  const out: { family: string; css: string }[] = [];
  for (const def of FONT_FACES) {
    if (!markup.includes(def.family)) continue;
    const key = `${def.family}|${def.weight}|${def.style}`;
    let hit = faceCssCache.get(key);
    if (!hit) {
      const res = await fetch(def.url);
      const b64 = bytesToBase64(new Uint8Array(await res.arrayBuffer()));
      hit = {
        family: def.family,
        css:
          `@font-face{font-family:"${def.family}";font-weight:${def.weight};font-style:${def.style};` +
          `src:url("data:${def.mime};base64,${b64}") format("${def.format}");}`
      };
      faceCssCache.set(key, hit);
    }
    out.push(hit);
  }
  return out;
}

export async function pageToSvgString(
  doc: ComicDoc,
  page: Page,
  assets: Record<ID, Asset>,
  scale: number
): Promise<string> {
  await loadFonts();
  const host = document.createElement('div');
  const info = pageInfo(doc, Math.max(0, doc.pages.findIndex((p) => p.id === page.id)));
  const comp = mount(PageSvg, {
    target: host,
    props: {
      w: doc.pageW,
      h: doc.pageH,
      page,
      assets,
      scope: 'export',
      ...info
    }
  });
  flushSync();

  const svg = host.querySelector('svg');
  if (!svg) throw new TKError('err.pageGen', 'No se pudo generar la página');
  svg.setAttribute('width', String(Math.round(doc.pageW * scale)));
  svg.setAttribute('height', String(Math.round(doc.pageH * scale)));
  let markup = new XMLSerializer().serializeToString(svg);
  unmount(comp);

  for (const a of Object.values(assets)) {
    if (markup.includes(a.url)) markup = markup.split(a.url).join(assetDataUrl(a));
  }

  for (const tex of IMAGE_TEXTURES.values()) {
    if (markup.includes(tex.url)) markup = markup.split(tex.url).join(await resourceDataUrl(tex.url));
  }

  const faces = [...(await fontFaceCss(markup)), ...userFontCss()].filter((f) => markup.includes(f.family));
  if (faces.length > 0) {
    const css = faces.map((f) => f.css).join('');
    markup = markup.replace(/<svg[^>]*>/, (open) => `${open}<style>${css}</style>`);
  }
  return markup;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function renderPageCanvas(
  doc: ComicDoc,
  page: Page,
  assets: Record<ID, Asset>,
  scale: number
): Promise<HTMLCanvasElement> {
  const markup = await pageToSvgString(doc, page, assets, scale);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new TKError('err.pageRender', 'No se pudo renderizar la página'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(doc.pageW * scale);
    canvas.height = Math.round(doc.pageH * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new TKError('err.canvas', 'No se pudo crear el lienzo de exportación');

    // Calentamiento: las fuentes incrustadas pueden tardar un instante en
    // estar listas la primera vez que se pinta el SVG.
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    await sleep(40);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function canvasToBytes(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality = 0.92): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new TKError('err.encode', 'No se pudo codificar la imagen'))), type, quality)
  );
  return new Uint8Array(await blob.arrayBuffer());
}
