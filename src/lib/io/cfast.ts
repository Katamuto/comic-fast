/**
 * Formato de proyecto .cfast = archivo ZIP con:
 *   project.json        documento (páginas, objetos, tamaño) + índice de imágenes
 *   assets/<id>.<ext>   imágenes originales sin recomprimir
 *   fonts/<id>.<ext>    fuentes importadas por la persona (opcional)
 *
 * Usa fflate (≈8 kB). Para añadir campos nuevos: sube FORMAT_VERSION y
 * agrega un paso en migrate().
 */
import { TKError } from '../i18n/core';
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { AssetData, ComicDoc, FontData, ID } from '../model/types';
import { usedAssetIds } from '../model/scale';
import { unitSquare } from '../model/panelGeometry';
import { uid } from '../model/ids';
import { extFromMime } from './images';

export const FORMAT = 'comicfast';
export const FORMAT_VERSION = 2;

interface AssetMeta {
  id: ID;
  name: string;
  mime: string;
  w: number;
  h: number;
  file: string;
  keep?: boolean;
}

interface FontMeta {
  id: ID;
  name: string;
  family: string;
  weight: '400' | '700';
  style: 'normal' | 'italic';
  mime: string;
  file: string;
}

interface ProjectFile {
  format: typeof FORMAT;
  version: number;
  doc: ComicDoc;
  assets: AssetMeta[];
  /** Fuentes importadas (opcional: los proyectos anteriores no lo tienen). */
  fonts?: FontMeta[];
}

const FONT_EXT: Record<string, string> = { 'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf' };

export function encodeProject(doc: ComicDoc, assets: Record<ID, AssetData>, fonts: FontData[] = []): Uint8Array {
  const files: Zippable = {};
  const metas: AssetMeta[] = [];

  // Se guardan las imágenes que alguna página usa y las marcadas «guardar siempre».
  const ids = new Set<ID>(usedAssetIds(doc.style ? [...doc.pages, doc.style] : doc.pages));
  for (const a of Object.values(assets)) if (a.keep) ids.add(a.id);
  for (const id of ids) {
    const a = assets[id];
    if (!a) continue;
    const file = `assets/${a.id}.${extFromMime(a.mime)}`;
    files[file] = [a.bytes, { level: 0 }];
    metas.push({ id: a.id, name: a.name, mime: a.mime, w: a.w, h: a.h, file, ...(a.keep ? { keep: true } : {}) });
  }

  // Las fuentes importadas se guardan todas (suelen pesar poco y sin ellas el texto cambiaría de aspecto).
  const fontMetas: FontMeta[] = [];
  for (const f of fonts) {
    const file = `fonts/${f.id}.${FONT_EXT[f.mime] ?? 'ttf'}`;
    files[file] = [f.bytes, { level: 0 }];
    fontMetas.push({ id: f.id, name: f.name, family: f.family, weight: f.weight, style: f.style, mime: f.mime, file });
  }

  const project: ProjectFile = { format: FORMAT, version: FORMAT_VERSION, doc, assets: metas, fonts: fontMetas };
  files['project.json'] = strToU8(JSON.stringify(project));
  return zipSync(files);
}

type Loose = Record<string, unknown>;

/** v1 → v2: la imagen de la viñeta pasa a ser una capa; las tramas ganan `seed`. */
function migrateV1(project: ProjectFile): void {
  const sizes = new Map((project.assets ?? []).map((a) => [a.id, a]));
  const pages = (project.doc as unknown as { pages?: { objects?: Loose[] }[] }).pages ?? [];
  for (const page of pages) {
    for (const o of page.objects ?? []) {
      if (o.type === 'panel') {
        const asset = typeof o.assetId === 'string' ? sizes.get(o.assetId) : undefined;
        const w = Number(o.w);
        const h = Number(o.h);
        const zoom = Math.max(1, Number(o.imgZoom) || 1);
        o.layers = asset
          ? [
              {
                id: uid(),
                type: 'image',
                assetId: asset.id,
                x: Number(o.imgX) || 0,
                y: Number(o.imgY) || 0,
                rotation: 0,
                scale: Math.max(w / asset.w, h / asset.h) * zoom,
                opacity: 1
              }
            ]
          : [];
        o.shape = 'rect';
        o.points = unitSquare();
        delete o.assetId;
        delete o.imgZoom;
        delete o.imgX;
        delete o.imgY;
      } else if (o.type === 'pattern') {
        o.seed = 0;
      }
    }
  }
}

function migrate(project: ProjectFile): ProjectFile {
  if (project.version < 2) {
    migrateV1(project);
    project.version = 2;
  }
  // Versión 3 en adelante: añadir aquí `if (project.version < 3) { ...; project.version = 3; }`
  return project;
}

function validate(doc: unknown): asserts doc is ComicDoc {
  const d = doc as Partial<ComicDoc> | null;
  const ok =
    d !== null &&
    typeof d === 'object' &&
    Number.isFinite(d.pageW) &&
    Number.isFinite(d.pageH) &&
    Array.isArray(d.pages) &&
    d.pages.every((p) => p && typeof p.id === 'string' && Array.isArray(p.objects));
  if (!ok) throw new TKError('err.projectCorrupt', 'El proyecto está dañado o tiene un formato inesperado');
}

export function decodeProject(bytes: Uint8Array): { doc: ComicDoc; assets: AssetData[]; fonts: FontData[] } {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new TKError('err.notProject', 'El archivo no es un proyecto de Comic Fast válido');
  }

  const raw = files['project.json'];
  if (!raw) throw new TKError('err.notProject', 'El archivo no es un proyecto de Comic Fast válido');

  let project: ProjectFile;
  try {
    project = JSON.parse(strFromU8(raw)) as ProjectFile;
  } catch {
    throw new TKError('err.projectJson', 'El proyecto está dañado (JSON ilegible)');
  }
  if (project.format !== FORMAT) throw new TKError('err.notProject', 'El archivo no es un proyecto de Comic Fast válido');
  if (typeof project.version !== 'number' || project.version > FORMAT_VERSION) {
    throw new TKError('err.projectNewer', 'Este proyecto fue creado con una versión más nueva de Comic Fast');
  }

  project = migrate(project);
  validate(project.doc);

  const assets: AssetData[] = [];
  for (const m of project.assets ?? []) {
    const data = files[m.file];
    if (!data) continue;
    assets.push({ id: m.id, name: m.name, mime: m.mime, w: m.w, h: m.h, bytes: data, ...(m.keep ? { keep: true } : {}) });
  }
  const fonts: FontData[] = [];
  for (const m of project.fonts ?? []) {
    const data = files[m.file];
    if (!data || typeof m.family !== 'string') continue;
    fonts.push({ id: m.id, name: m.name, family: m.family, weight: m.weight === '700' ? '700' : '400', style: m.style === 'italic' ? 'italic' : 'normal', mime: m.mime, bytes: data });
  }
  return { doc: project.doc, assets, fonts };
}
