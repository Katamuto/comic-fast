/**
 * Acciones de archivo de alto nivel (nuevo, abrir, guardar, importar, exportar).
 * Une el editor con la capa de IO y muestra errores al usuario.
 */
import { editor } from '../model/store.svelte';
import type { Asset } from '../model/types';
import { decodeProject, encodeProject } from './cfast';
import { exportCbz, exportPagePng, exportPdf } from './exporters';
import { IMAGE_EXTENSIONS, mimeFromName } from './images';
import { t, errorText, i18n } from '../i18n/index.svelte';
import { userFonts } from '../render/userFonts.svelte';
import { FONT_EXTENSIONS } from '../render/fontFiles';
import { readTemplate, templateName, type TemplateDef } from './templates';
import { alertDialog, confirmDialog, openFiles, readDroppedFile, saveFile, takeOpenedFiles, type FileFilter } from './platform';

const cfastFilter = (): FileFilter[] => [{ name: t('file.filter.project'), extensions: ['cfast'] }];
const imagesFilter = (): FileFilter[] => [{ name: t('file.filter.images'), extensions: IMAGE_EXTENSIONS }];

async function guarded(fn: () => Promise<void>): Promise<void> {
  if (editor.busy) return;
  editor.busy = true;
  try {
    await fn();
  } catch (err) {
    editor.status = '';
    await alertDialog(errorText(err));
  } finally {
    editor.busy = false;
  }
}

async function confirmDiscard(): Promise<boolean> {
  return !editor.dirty || confirmDialog(t('confirm.discard'));
}

const baseTitle = () => editor.doc.title.trim() || t('doc.untitled');

export async function newProject(): Promise<void> {
  if (await confirmDiscard()) editor.newProject();
}

/** Proyecto nuevo a partir de una plantilla: se abre sin guardar (Guardar pedirá nombre). */
export function newFromTemplate(tpl: TemplateDef): Promise<void> {
  return guarded(async () => {
    if (!(await confirmDiscard())) return;
    const { doc, assets, fonts } = await readTemplate(tpl);
    const name = templateName(tpl, i18n.lang);
    doc.title = name;
    editor.loadProject(doc, assets, null, name, fonts);
    editor.status = t('tpl.created', { name });
  });
}

export function openProject(): Promise<void> {
  return guarded(async () => {
    if (!(await confirmDiscard())) return;
    const [file] = await openFiles(cfastFilter(), false);
    if (!file) return;
    const { doc, assets, fonts } = decodeProject(file.bytes);
    editor.loadProject(doc, assets, file.path, file.name, fonts);
    editor.status = t('status.opened', { name: file.name });
  });
}

const isProject = (name: string) => /\.cfast$/i.test(name);
const fileName = (p: string) => p.split(/[\\/]/).pop() ?? p;

/** Abre un proyecto ya leído, avisando si hay cambios sin guardar. */
async function openProjectBytes(name: string, bytes: Uint8Array, path: string | null): Promise<void> {
  if (!(await confirmDiscard())) return;
  const { doc, assets, fonts } = decodeProject(bytes);
  editor.loadProject(doc, assets, path, name, fonts);
  editor.status = t('status.opened', { name });
}

/** Un .cfast soltado sobre la ventana: ofrece abrirlo para editarlo. */
export function offerOpenProject(name: string, read: () => Promise<Uint8Array>, path: string | null): Promise<void> {
  return guarded(async () => {
    if (!(await confirmDialog(t('drop.openProject', { name })))) return;
    await openProjectBytes(name, await read(), path);
  });
}

/** Abre los proyectos con los que el sistema lanzó la app (doble clic en el archivo). Abre el primero. */
export function openLaunchedProjects(): Promise<void> {
  return guarded(async () => {
    const [path] = await takeOpenedFiles();
    if (!path) return;
    await openProjectBytes(fileName(path), await readDroppedFile(path), path);
  });
}

export function saveProject(saveAs = false): Promise<void> {
  return guarded(async () => {
    const bytes = encodeProject(editor.snapshot(), editor.assets, userFonts.list);
    const res = await saveFile(bytes, `${baseTitle()}.cfast`, cfastFilter(), saveAs ? null : editor.filePath);
    if (!res) return;
    editor.markSaved(res.path, res.name);
    editor.status = t('status.saved', { name: res.name });
  });
}

export async function importImages(): Promise<Asset[]> {
  let result: Asset[] = [];
  await guarded(async () => {
    const files = await openFiles(imagesFilter(), true);
    if (files.length === 0) return;
    result = await editor.importImages(
      files.map((f) => ({ name: f.name, bytes: f.bytes, mime: mimeFromName(f.name) }))
    );
    if (result.length > 0) editor.status = t('status.imported', { n: result.length });
  });
  return result;
}

/** Importa archivos de imagen soltados desde el sistema (ignora los demás). Devuelve los recursos creados. */
export async function importDroppedFiles(files: File[]): Promise<Asset[]> {
  const project = files.find((f) => isProject(f.name));
  if (project) {
    await offerOpenProject(project.name, async () => new Uint8Array(await project.arrayBuffer()), null);
    return [];
  }
  const images = files.filter((f) => (f.type || mimeFromName(f.name)).startsWith('image/'));
  if (images.length === 0) {
    if (files.length > 0) editor.status = t('status.dropNoImages');
    return [];
  }
  let result: Asset[] = [];
  await guarded(async () => {
    const loaded = await Promise.all(
      images.map(async (f) => ({ name: f.name, mime: f.type || mimeFromName(f.name), bytes: new Uint8Array(await f.arrayBuffer()) }))
    );
    result = await editor.importImages(loaded);
    if (result.length > 0) editor.status = t('status.imported', { n: result.length });
  });
  return result;
}

/** Importa imágenes soltadas como rutas (escritorio Linux/macOS). Ignora lo que no sea imagen. */
export async function importDroppedPaths(paths: string[]): Promise<Asset[]> {
  const projectPath = paths.find((p) => isProject(p));
  if (projectPath) {
    await offerOpenProject(fileName(projectPath), () => readDroppedFile(projectPath), projectPath);
    return [];
  }
  const images = paths.filter((p) => mimeFromName(p).startsWith('image/'));
  if (images.length === 0) {
    if (paths.length > 0) editor.status = t('status.dropNoImages');
    return [];
  }
  let result: Asset[] = [];
  await guarded(async () => {
    const loaded = await Promise.all(
      images.map(async (p) => ({ name: p.split(/[\\/]/).pop() ?? p, mime: mimeFromName(p), bytes: await readDroppedFile(p) }))
    );
    result = await editor.importImages(loaded);
    if (result.length > 0) editor.status = t('status.imported', { n: result.length });
  });
  return result;
}

/** Importa fuentes (TTF, OTF, WOFF, WOFF2) y las añade al proyecto. */
export async function importFonts(): Promise<void> {
  await guarded(async () => {
    const files = await openFiles([{ name: t('file.filter.fonts'), extensions: FONT_EXTENSIONS }], true);
    if (files.length === 0) return;
    const { added, failed } = await userFonts.add(files.map((f) => ({ name: f.name, bytes: f.bytes })));
    if (added.length > 0) {
      editor.dirty = true;
      editor.status = t('status.fontsAdded', { n: added.length });
    }
    if (failed.length > 0) await alertDialog(t('fonts.badFile', { name: failed.join(', ') }));
  });
}

/** Importa imágenes y rellena con la primera la viñeta indicada. */
export async function importImageInto(panelId: string): Promise<void> {
  const [first] = await importImages();
  if (first) editor.fillPanel(panelId, first.id);
}

/** Muestra la ventana de progreso mientras dura `work`; se cierra siempre, aunque falle. */
async function withProgress<T>(label: string, work: (set: (done: number, total: number, label?: string) => void) => Promise<T>): Promise<T> {
  editor.progress = { label, done: 0, total: 0 };
  try {
    return await work((done, total, l) => {
      editor.progress = { label: l ?? label, done, total };
    });
  } finally {
    editor.progress = null;
  }
}

export function exportCurrentPng(): Promise<void> {
  return guarded(async () => {
    editor.status = t('status.exportingPage');
    const bytes = await withProgress(t('progress.page'), () => exportPagePng(editor.snapshot(), editor.pageIndex, editor.assets));
    const name = `${baseTitle()}-${t('export.pageWord')}-${editor.pageIndex + 1}.png`;
    const res = await saveFile(bytes, name, [{ name: t('file.filter.png'), extensions: ['png'] }], null);
    editor.status = res ? t('status.exported', { name: res.name }) : '';
  });
}

export function exportAllPdf(): Promise<void> {
  return guarded(async () => {
    const bytes = await withProgress(t('progress.pdf'), (set) =>
      exportPdf(editor.snapshot(), editor.assets, baseTitle(), (d, total) => {
        editor.status = t('status.exportingPdf', { d, total });
        set(d, total, d >= total ? t('progress.assembling') : t('progress.pageOf', { d: d + 1, total }));
      })
    );
    const res = await saveFile(bytes, `${baseTitle()}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }], null);
    editor.status = res ? t('status.exported', { name: res.name }) : '';
  });
}

export function exportAllCbz(): Promise<void> {
  return guarded(async () => {
    const bytes = await withProgress(t('progress.cbz'), (set) =>
      exportCbz(editor.snapshot(), editor.assets, (d, total) => {
        editor.status = t('status.exportingCbz', { d, total });
        set(d, total, d >= total ? t('progress.assembling') : t('progress.pageOf', { d: d + 1, total }));
      })
    );
    const res = await saveFile(bytes, `${baseTitle()}.cbz`, [{ name: t('file.filter.cbz'), extensions: ['cbz'] }], null);
    editor.status = res ? t('status.exported', { name: res.name }) : '';
  });
}
