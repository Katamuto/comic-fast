/**
 * Estado global del editor (Svelte 5 runes).
 *
 * - `doc` contiene SOLO datos del documento.
 * - Toda modificación que el usuario pueda deshacer pasa por `history`
 *   (patrón Command). Los gestos continuos (arrastrar) mutan en vivo con
 *   `live()` y registran UN comando al terminar con `commit()`.
 */
import { t } from '../i18n/index.svelte';
import { History, type Command } from './history';
import { newDoc, newPage, newStyle, STYLE_ID } from './defaults';
import { reorderIds, type ReorderMode } from './order';
import { drawOrder, reorderStyle } from './style';
import { uid } from './ids';
import { clamp, fitInside, outsidePage, toLocal } from './geometry';
import { cloneWithNewIds, scalePages, usedAssetIds } from './scale';
import {
  coverScale,
  ellipsePoints,
  panelContains,
  panelWithPoints,
  pointsPx,
  unitSquare
} from './panelGeometry';
import { imageLayer } from './defaults';
import { distribute, readingOrder } from './distribute';
import { scaleGlobals } from './globals';
import { userFonts } from '../render/userFonts.svelte';
import { makeProxy, VIEW_MAX, THUMB_MAX } from '../imageedit/proxy';
import { bytesToBlob, imageSize, mimeFromName, svgIntrinsicSize } from '../io/images';
import { scallopPoly } from '../render/balloonShapes';
import { applyFormat, shiftSpans, toggleFlag, type FmtKey } from '../render/richText';
import { DEFAULT_GRID, gridStep, type GridSpec } from './grid';
import { combinePanels, cutPolys, gridCuts, panelLike, panelPolyPage } from './panelOps';
import type {
  Asset,
  AssetData,
  Change,
  FontData,
  Globals,
  ComicDoc,
  ID,
  LayerInit,
  ObjectInit,
  Span,
  TextObj,
  BalloonObj,
  Page,
  PageObject,
  PanelLayer,
  PanelObj,
  PanelShape,
  Patch,
  ImageFx,
  Pt
} from './types';

interface ChangeCommand extends Command {
  changes: Change[];
}

export type { ReorderMode };

function insertIndex(p: Page, o: PageObject): number {
  // Las viñetas se agrupan debajo del resto de objetos.
  if (o.type !== 'panel') return p.objects.length;
  let last = -1;
  p.objects.forEach((x, i) => {
    if (x.type === 'panel') last = i;
  });
  return last + 1;
}

function plain<T>(v: T): T {
  return $state.snapshot(v) as T;
}

/** Igualdad de valores de propiedades (primitivos, arrays y objetos simples). */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

class Editor {
  // --- documento -----------------------------------------------------------
  doc = $state<ComicDoc>(newDoc(t('doc.untitled')));
  assets = $state.raw<Record<ID, Asset>>({});

  // --- vista / selección -----------------------------------------------------
  pageIndex = $state(0);
  selection = $state<ID[]>([]);
  editingId = $state<ID | null>(null);
  /** Capa activa de la viñeta seleccionada (si no es válida se usa la de arriba). */
  activeLayerId = $state<ID | null>(null);
  /** Modo "editar contenido": mover/girar/escalar la imagen activa dentro de la viñeta. */
  layerMode = $state(false);
  /** Dibuja en el lienzo las dos guías del degradado seleccionado. */
  showGuides = $state(true);
  zoom = $state(0.5);
  showGrid = $state(false);
  snap = $state(false);
  /** Cuadrícula relativa al ancho de la página (ver model/grid.ts). */
  grid = $state<GridSpec>({ ...DEFAULT_GRID });
  showGridDialog = $state(false);
  /** Modo «cortar viñetas»: arrastrar una recta sobre una viñeta la parte en dos. */
  cutMode = $state(false);
  /** Separación (unidades de página) que queda entre las dos piezas de un corte. */
  cutGap = $state(0);
  showSplit = $state(false);
  /** Última selección en un cuadro de texto (para dar formato a una parte del texto aunque el foco cambie). */
  textSel = $state<{ id: ID; from: number; to: number } | null>(null);
  /** Paso del imán (unidades de página). */
  get gridSize(): number {
    return gridStep(this.doc.pageW, this.grid);
  }

  // --- archivo -------------------------------------------------------------
  filePath = $state<string | null>(null);
  fileName = $state(t('doc.untitled'));
  dirty = $state(false);

  // --- interfaz ------------------------------------------------------------
  status = $state('');
  /** Tarea larga en curso (exportar…): la interfaz muestra una ventana con barra. total 0 = sin porcentaje. */
  progress = $state<{ label: string; done: number; total: number } | null>(null);
  busy = $state(false);
  showAbout = $state(false);
  showSplash = $state(false);
  showPageSize = $state(false);
  showHelp = $state(false);
  showEula = $state(false);
  showNotice = $state(false);
  showDownload = $state(false);
  showFonts = $state(false);
  showGlobals = $state(false);
  showTemplates = $state(false);
  showReorg = $state(false);
  showDistribute = $state(false);
  /** La persona ya aceptó, en esta sesión, la responsabilidad sobre las licencias de las fuentes. */
  fontsAccepted = $state(false);
  /** Se edita la página de estilo en vez de la página actual (ver model/style.ts). */
  styleMode = $state(false);

  /** Lo registra el lienzo para que el menú pueda pedir "ajustar a la ventana". */
  fitView: (() => void) | null = null;

  private revision = $state(0);
  private history = new History(() => {
    this.revision++;
    this.dirty = true;
  });
  private clipboard: PageObject[] = [];
  private pasteCount = 0;

  // ===========================================================================
  // Consultas
  // ===========================================================================

  /** La página que se edita: la actual o, en modo estilo, la página de estilo. */
  get page(): Page {
    if (this.styleMode && this.doc.style) return this.doc.style;
    return this.doc.pages[this.pageIndex];
  }

  /** Todas las páginas que pueden usar imágenes (incluida la de estilo). */
  get allPages(): Page[] {
    return this.doc.style ? [...this.doc.pages, this.doc.style] : this.doc.pages;
  }

  /** Ids de las imágenes que usa el proyecto (las demás no se guardan). */
  usedAssets = $derived(usedAssetIds(this.allPages));

  get selected(): PageObject[] {
    const ids = new Set(this.selection);
    return this.page.objects.filter((o) => ids.has(o.id));
  }

  get single(): PageObject | null {
    if (this.selection.length !== 1) return null;
    return this.page.objects.find((o) => o.id === this.selection[0]) ?? null;
  }

  /** Capa activa de la viñeta seleccionada, o null. */
  get activeLayer(): PanelLayer | null {
    const s = this.single;
    if (!s || s.type !== 'panel') return null;
    return s.layers.find((l) => l.id === this.activeLayerId) ?? s.layers[s.layers.length - 1] ?? null;
  }

  get canUndo(): boolean {
    void this.revision;
    return this.history.canUndo;
  }
  get canRedo(): boolean {
    void this.revision;
    return this.history.canRedo;
  }
  get undoLabel(): string | null {
    void this.revision;
    return this.history.undoLabel;
  }
  get redoLabel(): string | null {
    void this.revision;
    return this.history.redoLabel;
  }
  get canPaste(): boolean {
    return this.clipboard.length > 0;
  }

  pageById(id: ID): Page | undefined {
    if (id === STYLE_ID) return this.doc.style;
    return this.doc.pages.find((p) => p.id === id);
  }

  find(id: ID): PageObject | undefined {
    return this.page.objects.find((o) => o.id === id);
  }

  private findIn(pageId: ID, id: ID): PageObject | undefined {
    return this.pageById(pageId)?.objects.find((o) => o.id === id);
  }

  /** Objeto más alto (en z) bajo un punto de página, opcionalmente filtrado por tipo. */
  hitTest(p: { x: number; y: number }, type?: PageObject['type']): PageObject | undefined {
    const objs = drawOrder(this.page, this.styleMode);
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      if (type && o.type !== type) continue;
      const l = toLocal(o, p);
      if (o.type === 'panel') {
        if (panelContains(o, l)) return o;
      } else if (Math.abs(l.x) <= o.w / 2 && Math.abs(l.y) <= o.h / 2) return o;
    }
    return undefined;
  }

  // ===========================================================================
  // Selección y vista
  // ===========================================================================

  select(ids: ID[]): void {
    if (ids.length !== 1 || ids[0] !== this.selection[0]) {
      this.layerMode = false;
      this.activeLayerId = null;
    }
    this.selection = ids;
    if (this.editingId && !ids.includes(this.editingId)) this.editingId = null;
    this.history.seal();
  }

  toggleSelect(id: ID): void {
    this.select(this.selection.includes(id) ? this.selection.filter((x) => x !== id) : [...this.selection, id]);
  }

  selectAll(): void {
    this.select(this.page.objects.map((o) => o.id));
  }

  startEditing(id: ID): void {
    const o = this.find(id);
    if (o && (o.type === 'balloon' || o.type === 'text')) {
      this.selection = [id];
      this.editingId = id;
    }
  }

  stopEditing(): void {
    this.editingId = null;
  }

  setZoom(z: number): void {
    this.zoom = clamp(z, 0.1, 4);
  }

  zoomBy(factor: number): void {
    this.setZoom(this.zoom * factor);
  }

  /** Cambia entre editar la página actual y editar la página de estilo. */
  setStyleMode(on: boolean): void {
    if (on === this.styleMode) return;
    if (on && !this.doc.style) this.doc.style = newStyle();
    this.styleMode = on;
    this.selection = [];
    this.editingId = null;
    this.layerMode = false;
    this.activeLayerId = null;
    this.status = on ? t('status.styleOn') : '';
    queueMicrotask(() => this.fitView?.());
  }

  gotoPage(i: number): void {
    const idx = clamp(i, 0, this.doc.pages.length - 1);
    if (idx === this.pageIndex) return;
    this.pageIndex = idx;
    this.selection = [];
    this.editingId = null;
    this.layerMode = false;
  }

  // ===========================================================================
  // Objetos
  // ===========================================================================

  addObjects(inits: ObjectInit[], select = true): PageObject[] {
    // Lo que caería por completo fuera de la página no se vería: no se crea.
    const inside = inits.filter((i) => !outsidePage(i, this.doc.pageW, this.doc.pageH));
    if (inside.length < inits.length) this.status = t('status.outside');
    inits = inside;
    if (inits.length === 0) return [];
    const pageId = this.page.id;
    // En la página de estilo lo nuevo queda por encima del contenido (se puede bajar después).
    const objs = inits.map((i) => {
      const o = { ...i, id: uid() } as PageObject;
      if (this.styleMode) o.over ??= true;
      else delete o.over;
      return o;
    });
    const ids = objs.map((o) => o.id);
    // Un enlace «@n» apunta al objeto n de este mismo lote (los recursos no conocen los ids todavía).
    for (const o of objs) {
      if (o.type === 'balloon' && o.link && o.link.to.startsWith('@')) {
        const target = ids[Number(o.link.to.slice(1))];
        if (target) o.link = { ...o.link, to: target };
        else delete o.link;
      }
      if ((o.type === 'balloon' || o.type === 'text') && o.parent?.startsWith('@')) {
        const target = ids[Number(o.parent.slice(1))];
        if (target) o.parent = target;
        else delete o.parent;
      }
    }
    this.history.run({
      label: t('hist.add'),
      redo: () => {
        const p = this.pageById(pageId);
        if (!p) return;
        for (const o of objs) p.objects.splice(insertIndex(p, o), 0, structuredClone(o));
      },
      undo: () => {
        const p = this.pageById(pageId);
        if (!p) return;
        p.objects = p.objects.filter((o) => !ids.includes(o.id));
        this.selection = this.selection.filter((id) => !ids.includes(id));
        if (this.editingId && ids.includes(this.editingId)) this.editingId = null;
      }
    });
    if (select) this.selection = ids;
    return objs;
  }

  removeObjects(ids: ID[]): void {
    const pageId = this.page.id;
    const removed = this.page.objects
      .map((o, index) => ({ o: plain(o), index }))
      .filter((r) => ids.includes(r.o.id));
    if (removed.length === 0) return;
    const rids = removed.map((r) => r.o.id);
    this.history.run({
      label: t('hist.delete'),
      redo: () => {
        const p = this.pageById(pageId);
        if (!p) return;
        p.objects = p.objects.filter((o) => !rids.includes(o.id));
        this.selection = this.selection.filter((id) => !rids.includes(id));
        if (this.editingId && rids.includes(this.editingId)) this.editingId = null;
      },
      undo: () => {
        const p = this.pageById(pageId);
        if (!p) return;
        for (const r of removed) p.objects.splice(r.index, 0, structuredClone(r.o));
      }
    });
  }

  /** Quita (de forma deshacible) los objetos indicados que han quedado por completo fuera de la página. */
  removeOutside(ids: ID[]): void {
    const out = ids.filter((id) => {
      const o = this.find(id);
      return o && !o.locked && outsidePage(o, this.doc.pageW, this.doc.pageH);
    });
    if (out.length === 0) return;
    this.removeObjects(out);
    this.status = t('status.outside');
  }

  removeSelected(): void {
    const ids = this.selection.filter((id) => !this.find(id)?.locked);
    if (ids.length < this.selection.length) this.status = t('status.lockedNoDelete');
    this.removeObjects(ids);
  }

  /** ¿Todos los objetos seleccionados están bloqueados? (false si no hay selección). */
  get selectionLocked(): boolean {
    return this.selection.length > 0 && this.selected.every((o) => o.locked === true);
  }

  /** Bloquea o desbloquea objetos. */
  setLocked(ids: ID[], locked: boolean): void {
    this.patch(ids, { locked });
  }

  /** Alterna el candado de la selección: si todos están bloqueados los libera; si no, los bloquea. */
  toggleLock(): void {
    if (this.selection.length === 0) return;
    this.setLocked([...this.selection], !this.selectionLocked);
  }

  /** Cambia propiedades de uno o varios objetos como una sola acción deshacible. */
  patch(ids: ID[], p: Patch, mergeKey?: string): void {
    const pageId = this.page.id;
    const changes: Change[] = [];
    for (const id of ids) {
      const o = this.find(id) as unknown as Record<string, unknown> | undefined;
      if (!o) continue;
      const before: Patch = {};
      const after: Patch = {};
      // Al cambiar el texto, el formato por partes se reubica solo.
      let pp = p;
      if (typeof p.text === 'string' && !('spans' in p) && Array.isArray(o.spans) && typeof o.text === 'string') {
        pp = { ...p, spans: shiftSpans(o.spans as Span[], o.text, p.text) ?? [] };
      }
      for (const k of Object.keys(pp)) {
        const cur = plain(o[k]);
        const next = plain(pp[k]);
        if (!same(cur, next)) {
          before[k] = cur;
          after[k] = next;
        }
      }
      if (Object.keys(after).length > 0) changes.push({ pageId, id, before, after });
    }
    if (changes.length === 0) return;
    this.history.run(this.changeCommand(t('hist.edit'), changes, mergeKey));
  }

  /** Mutación en vivo durante un gesto (sin historial). Termina con commit(). */
  live(id: ID, p: Patch): void {
    const o = this.find(id);
    if (o) Object.assign(o, p);
  }

  /** Registra un gesto ya aplicado con live() como una única acción deshacible. */
  commit(label: string, changes: Change[]): void {
    if (changes.length === 0) return;
    this.history.push(this.changeCommand(label, changes));
  }

  private changeCommand(label: string, changes: Change[], mergeKey?: string): ChangeCommand {
    const apply = (which: 'before' | 'after') => {
      for (const c of changes) {
        const o = this.findIn(c.pageId, c.id);
        if (o) Object.assign(o, structuredClone(c[which]));
      }
    };
    return {
      label,
      mergeKey,
      changes,
      redo: () => apply('after'),
      undo: () => apply('before'),
      merge: (next) => {
        const incoming = (next as ChangeCommand).changes;
        if (!incoming) return false;
        for (const n of incoming) {
          const mine = changes.find((c) => c.pageId === n.pageId && c.id === n.id);
          if (!mine) {
            changes.push(n);
            continue;
          }
          Object.assign(mine.after, n.after);
          for (const k of Object.keys(n.before)) {
            if (!(k in mine.before)) mine.before[k] = n.before[k];
          }
        }
        return true;
      }
    };
  }

  nudge(dx: number, dy: number): void {
    const ids = [...this.selection];
    for (const id of ids) {
      const o = this.find(id);
      if (o && !o.locked) this.patch([id], { x: o.x + dx, y: o.y + dy }, 'nudge');
    }
    for (const id of this.childrenOf(ids)) {
      const o = this.find(id);
      if (o && !o.locked) this.patch([id], { x: o.x + dx, y: o.y + dy }, 'nudge');
    }
  }

  reorder(mode: ReorderMode): void {
    const pageId = this.page.id;
    const sel = new Set(this.selection);
    if (sel.size === 0) return;
    const page = this.page;
    const beforeOrder = page.objects.map((o) => o.id);
    const beforeOver: Record<ID, boolean> = Object.fromEntries(page.objects.map((o) => [o.id, o.over === true]));
    let afterOrder: ID[];
    let afterOver: Record<ID, boolean> | null = null;
    if (this.styleMode) {
      // La referencia del contenido es un elemento más de la pila: se puede subir o bajar por encima o debajo de ella.
      const r = reorderStyle(page, sel, mode);
      afterOrder = r.order;
      afterOver = r.over;
    } else {
      afterOrder = reorderIds(beforeOrder, sel, mode);
    }
    const sameOver = !afterOver || beforeOrder.every((id) => beforeOver[id] === afterOver![id]);
    if (sameOver && afterOrder.every((id, i) => id === beforeOrder[i])) return;
    const apply = (order: ID[], over: Record<ID, boolean> | null) => {
      const p = this.pageById(pageId);
      if (!p) return;
      const map = new Map(p.objects.map((o) => [o.id, o]));
      p.objects = order.map((id) => map.get(id)).filter((o): o is PageObject => o !== undefined);
      if (over) {
        for (const o of p.objects) {
          if (over[o.id]) o.over = true;
          else delete o.over;
        }
      }
    };
    this.history.run({
      label: t('hist.reorder'),
      redo: () => apply(afterOrder, afterOver),
      undo: () => apply(beforeOrder, pageId === STYLE_ID ? beforeOver : null)
    });
  }

  copy(): void {
    this.clipboard = this.selected.map((o) => plain(o));
    this.pasteCount = 0;
  }

  paste(): void {
    if (this.clipboard.length === 0) return;
    this.pasteCount++;
    const off = 24 * this.pasteCount;
    const inits = this.clipboard.map((o) => {
      const { id: _id, ...rest } = structuredClone(o);
      const init = { ...rest, x: o.x + off, y: o.y + off } as ObjectInit;
      if ((init.type === 'balloon' || init.type === 'text') && init.parent) {
        const k = this.clipboard.findIndex((c) => c.id === init.parent);
        if (k >= 0) init.parent = `@${k}`;
        else delete init.parent;
      }
      if (init.type === 'balloon' && init.link) {
        const k = this.clipboard.findIndex((c) => c.id === init.link!.to);
        if (k >= 0) init.link = { ...init.link, to: `@${k}` };
        else delete init.link;
      }
      return init;
    });
    this.addObjects(inits);
  }

  duplicate(): void {
    if (this.selection.length === 0) return;
    this.copy();
    this.paste();
  }

  // ===========================================================================
  // Páginas
  // ===========================================================================

  addPage(afterIndex = this.pageIndex, template: Page = newPage()): void {
    this.styleMode = false;
    const idx = clamp(afterIndex + 1, 0, this.doc.pages.length);
    const tpl = plain(template);
    const prev = this.pageIndex;
    this.history.run({
      label: t('hist.addPage'),
      redo: () => {
        this.doc.pages.splice(idx, 0, structuredClone(tpl));
        this.pageIndex = idx;
        this.selection = [];
        this.editingId = null;
      },
      undo: () => {
        this.doc.pages.splice(idx, 1);
        this.pageIndex = clamp(prev, 0, this.doc.pages.length - 1);
        this.selection = [];
        this.editingId = null;
      }
    });
  }

  duplicatePage(i = this.pageIndex): void {
    const src = this.doc.pages[i];
    if (src) this.addPage(i, cloneWithNewIds(plain(src)));
  }

  removePage(i = this.pageIndex): void {
    this.styleMode = false;
    if (this.doc.pages.length <= 1) return;
    const removed = plain(this.doc.pages[i]);
    if (!removed) return;
    this.history.run({
      label: t('hist.deletePage'),
      redo: () => {
        this.doc.pages.splice(i, 1);
        this.pageIndex = clamp(i, 0, this.doc.pages.length - 1);
        this.selection = [];
        this.editingId = null;
      },
      undo: () => {
        this.doc.pages.splice(i, 0, structuredClone(removed));
        this.pageIndex = i;
        this.selection = [];
      }
    });
  }

  movePage(from: number, to: number): void {
    const n = this.doc.pages.length;
    if (from === to || from < 0 || to < 0 || from >= n || to >= n) return;
    const move = (a: number, b: number) => {
      const [pg] = this.doc.pages.splice(a, 1);
      this.doc.pages.splice(b, 0, pg);
      this.pageIndex = b;
    };
    this.history.run({
      label: t('hist.movePage'),
      redo: () => move(from, to),
      undo: () => move(to, from)
    });
  }

  // ===========================================================================
  // Viñetas: cortar, dividir y combinar
  // ===========================================================================

  /** Cambia unos objetos por otros en un solo paso deshacible (los nuevos ocupan el sitio del primero quitado). */
  private replaceObjects(label: string, removeIds: ID[], adds: PageObject[]): void {
    const pageId = this.page.id;
    const page = this.page;
    const removed = page.objects.map((o, i) => ({ o: structuredClone(plain(o)) as PageObject, i })).filter((x) => removeIds.includes(x.o.id));
    if (removed.length === 0) return;
    const at = Math.min(...removed.map((r) => r.i));
    const addIds = adds.map((a) => a.id);
    // Lo que estaba metido en una viñeta quitada pasa a la primera pieza nueva (o queda libre).
    const heir = adds.find((a) => a.type === 'panel')?.id;
    const orphans = page.objects.filter((o) => (o.type === 'balloon' || o.type === 'text') && !!o.parent && removeIds.includes(o.parent))
      .map((o) => ({ id: o.id, parent: (o as BalloonObj | TextObj).parent }));
    this.history.run({
      label,
      redo: () => {
        const p = this.pageById(pageId);
        if (!p) return;
        p.objects = p.objects.filter((o) => !removeIds.includes(o.id));
        p.objects.splice(Math.min(at, p.objects.length), 0, ...adds.map((a) => structuredClone(plain(a))));
        for (const k of orphans) {
          const o = p.objects.find((x) => x.id === k.id);
          if (o && (o.type === 'balloon' || o.type === 'text')) o.parent = heir;
        }
        this.selection = addIds;
      },
      undo: () => {
        const p = this.pageById(pageId);
        if (!p) return;
        p.objects = p.objects.filter((o) => !addIds.includes(o.id));
        for (const r of [...removed].sort((a, b) => a.i - b.i)) p.objects.splice(Math.min(r.i, p.objects.length), 0, structuredClone(r.o));
        for (const k of orphans) {
          const o = p.objects.find((x) => x.id === k.id);
          if (o && (o.type === 'balloon' || o.type === 'text')) o.parent = k.parent;
        }
        this.selection = removeIds;
      }
    });
  }

  private panelsSelected(): PanelObj[] {
    return this.page.objects.filter((o): o is PanelObj => o.type === 'panel' && this.selection.includes(o.id));
  }

  canCombine(): boolean {
    return this.panelsSelected().length >= 2;
  }

  canSplit(): boolean {
    return this.panelsSelected().length >= 1;
  }

  /** Une, intersecta o resta las viñetas seleccionadas (la de más abajo es la base y da el estilo). */
  combinePanelsOp(op: 'union' | 'intersect' | 'difference' | 'exclude'): void {
    const ps = this.panelsSelected();
    if (ps.length < 2) return;
    const base = ps[0];
    let polys: Pt[][];
    if (op === 'exclude') {
      // Excluir: lo que está en una u otra pero no en las dos = (A − B) + (B − A)
      const a = combinePanels('difference', [ps[0], ...ps.slice(1)]);
      const b = combinePanels('difference', [ps[1], ps[0]]);
      polys = [...a.polys, ...b.polys];
      if (a.holes + b.holes > 0) {
        this.status = t('status.panelHole');
        return;
      }
    } else {
      const r = combinePanels(op, ps);
      if (r.holes > 0) {
        this.status = t('status.panelHole');
        return;
      }
      if (op === 'union' && (r.unchanged || r.polys.length > 1)) {
        this.status = t('status.panelNoTouch');
        return;
      }
      polys = r.polys;
    }
    if (polys.length === 0) {
      this.status = t('status.panelEmpty');
      return;
    }
    const adds = polys.map((poly) => ({ ...panelLike(base, poly), id: uid() }) as PageObject);
    this.replaceObjects(t(`hist.panel.${op}`), ps.map((p) => p.id), adds);
  }

  /** Corta con la recta a→b las viñetas seleccionadas o, si no hay, la de más arriba que la recta parta. */
  cutPanels(a: Pt, b: Pt): void {
    let targets = this.panelsSelected();
    if (targets.length === 0) {
      const all = this.page.objects.filter((o): o is PanelObj => o.type === 'panel');
      const hit = [...all].reverse().find((p) => cutPolys([panelPolyPage(p)], a, b, 0).length >= 2);
      targets = hit ? [hit] : [];
    }
    this.cutPanelList(targets, [[a, b]]);
  }

  /** Divide las viñetas seleccionadas en cols × rows partes con una separación entre ellas. */
  splitPanels(cols: number, rows: number, gap: number): void {
    const targets = this.panelsSelected();
    for (const p of targets) this.cutPanelList([p], gridCuts(p, cols, rows), gap, true);
  }

  private cutPanelList(targets: PanelObj[], lines: [Pt, Pt][], gap = this.cutGap, keepGoing = false): void {
    let done = false;
    for (const p of targets) {
      let polys = [panelPolyPage(p)];
      for (const [q, r] of lines) polys = cutPolys(polys, q, r, gap);
      if (polys.length < 2) continue;
      const adds = polys.map((poly) => ({ ...panelLike(p, poly), id: uid() }) as PageObject);
      this.replaceObjects(t('hist.panel.split'), [p.id], adds);
      done = true;
    }
    if (!done && !keepGoing) this.status = t('status.cutMiss');
  }

  /**
   * Formato por partes del texto del objeto seleccionado: se aplica a la selección recordada en
   * `textSel` o, si no hay, a todo el texto.
   */
  formatText(op: { toggle: 'bold' | 'italic' | 'underline' | 'strike' } | { set: Partial<Record<FmtKey, unknown>> } | { clear: true }): void {
    const o = this.single;
    if (!o || (o.type !== 'balloon' && o.type !== 'text')) return;
    const len = o.text.length;
    const sel = this.textSel;
    const from = sel && sel.id === o.id && sel.to > sel.from ? Math.min(sel.from, len) : 0;
    const to = sel && sel.id === o.id && sel.to > sel.from ? Math.min(sel.to, len) : len;
    let spans: Span[];
    if ('toggle' in op) spans = toggleFlag(o.spans, len, o, from, to, op.toggle);
    else if ('set' in op) spans = applyFormat(o.spans, len, o, from, to, op.set);
    else spans = applyFormat(o.spans, len, o, from, to, { bold: undefined, italic: undefined, underline: undefined, strike: undefined, color: undefined, fontFamily: undefined });
    this.patch([o.id], { spans }, undefined);
  }

  /** Globos y textos que viven dentro de las viñetas dadas (se mueven con ellas). */
  childrenOf(ids: ID[]): ID[] {
    const set = new Set(ids);
    return this.page.objects
      .filter((o) => (o.type === 'balloon' || o.type === 'text') && o.parent && set.has(o.parent) && !set.has(o.id))
      .map((o) => o.id);
  }

  /** Viñeta que se usará para «meter en viñeta»: la seleccionada o, si no, la de más arriba bajo el centro del objeto. */
  private panelFor(o: PageObject): PanelObj | null {
    const sel = this.selected.find((x): x is PanelObj => x.type === 'panel');
    if (sel) return sel;
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    for (let i = this.page.objects.length - 1; i >= 0; i--) {
      const p = this.page.objects[i];
      if (p.type === 'panel' && cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h) return p;
    }
    return null;
  }

  private putable(): (BalloonObj | TextObj)[] {
    return this.selected.filter((o): o is BalloonObj | TextObj => o.type === 'balloon' || o.type === 'text');
  }

  canPutInPanel(): boolean {
    return this.putable().some((o) => !!this.panelFor(o) && this.panelFor(o)!.id !== o.parent);
  }

  canTakeOutOfPanel(): boolean {
    return this.putable().some((o) => !!o.parent);
  }

  /** Mete los globos/textos seleccionados en una viñeta (solo cuando la persona lo pide). */
  putInPanel(): void {
    const pageId = this.page.id;
    const changes: Change[] = [];
    for (const o of this.putable()) {
      const p = this.panelFor(o);
      if (p && p.id !== o.parent) changes.push({ pageId, id: o.id, before: { parent: o.parent }, after: { parent: p.id } });
    }
    if (changes.length === 0) {
      this.status = t('status.noPanelFor');
      return;
    }
    this.history.run(this.changeCommand(t('hist.intoPanel'), changes));
  }

  takeOutOfPanel(): void {
    const pageId = this.page.id;
    const changes: Change[] = [];
    for (const o of this.putable()) if (o.parent) changes.push({ pageId, id: o.id, before: { parent: o.parent }, after: { parent: undefined } });
    if (changes.length > 0) this.history.run(this.changeCommand(t('hist.outOfPanel'), changes));
  }

  /** Globos seleccionados, en el orden en que se seleccionaron. */
  private selectedBalloons(): BalloonObj[] {
    return this.selection.map((id) => this.find(id)).filter((o): o is BalloonObj => !!o && o.type === 'balloon');
  }

  canLink(): boolean {
    return this.selectedBalloons().length >= 2;
  }

  canUnlink(): boolean {
    return this.selectedBalloons().some((b) => !!b.link);
  }

  /**
   * Encadena los globos seleccionados en el orden de selección (1.º → 2.º → 3.º…):
   * 'tail' hace que la cola de cada uno apunte al siguiente; 'merge' funde sus cuerpos.
   */
  linkBalloons(mode: 'tail' | 'merge'): void {
    const bs = this.selectedBalloons();
    if (bs.length < 2) return;
    const pageId = this.page.id;
    const changes: Change[] = [];
    for (let i = 0; i < bs.length - 1; i++) {
      const b = bs[i];
      changes.push({ pageId, id: b.id, before: { link: plain(b.link) }, after: { link: { to: bs[i + 1].id, mode } } });
    }
    this.history.run(this.changeCommand(t('hist.link'), changes));
  }

  /** Quita el enlace de los globos seleccionados (y de los que apuntan a ellos). */
  unlinkBalloons(): void {
    const sel = new Set(this.selection);
    const pageId = this.page.id;
    const changes: Change[] = [];
    for (const o of this.page.objects) {
      if (o.type !== 'balloon' || !o.link) continue;
      if (sel.has(o.id) || sel.has(o.link.to)) changes.push({ pageId, id: o.id, before: { link: plain(o.link) }, after: { link: undefined } });
    }
    if (changes.length > 0) this.history.run(this.changeCommand(t('hist.unlink'), changes));
  }

  /** ¿Hay algo que reflejar? Imágenes sueltas seleccionadas o, si no, la capa de imagen activa de una viñeta. */
  canFlip(): boolean {
    const hasImg = this.selection.some((id) => this.find(id)?.type === 'image');
    if (hasImg) return true;
    const l = this.activeLayer;
    return !!this.single && this.single.type === 'panel' && !!l && l.type === 'image';
  }

  /** Refleja horizontal ('h') o verticalmente ('v') las imágenes seleccionadas o la capa de imagen activa. Un solo paso. */
  flip(axis: 'h' | 'v'): void {
    const key = axis === 'h' ? 'flipH' : 'flipV';
    const pageId = this.page.id;
    const changes: Change[] = [];
    for (const id of this.selection) {
      const o = this.find(id);
      if (!o || o.type !== 'image') continue;
      const cur = !!(o as unknown as Record<string, unknown>)[key];
      changes.push({ pageId, id, before: { [key]: cur || undefined }, after: { [key]: !cur || undefined } });
    }
    if (changes.length > 0) {
      this.history.run(this.changeCommand(t(axis === 'h' ? 'hist.flipH' : 'hist.flipV'), changes));
      return;
    }
    const s = this.single;
    const l = this.activeLayer;
    if (s && s.type === 'panel' && l && l.type === 'image') {
      const cur = !!(l as unknown as Record<string, unknown>)[key];
      this.updateLayer(s.id, l.id, { [key]: !cur || undefined }, `flip-${axis}`);
    }
  }

  /** Excluye (o vuelve a incluir) una página de la página de estilo o de la numeración. */
  setPageFlag(index: number, flag: 'noStyle' | 'noNumber' | 'noGlobals', value: boolean): void {
    const pg = this.doc.pages[index];
    if (!pg || !!pg[flag] === value) return;
    const id = pg.id;
    const set = (v: boolean) => {
      const p = this.pageById(id);
      if (!p) return;
      if (v) p[flag] = true;
      else delete p[flag];
    };
    this.history.run({
      label: t(flag === 'noStyle' ? 'hist.pageNoStyle' : flag === 'noNumber' ? 'hist.pageNoNumber' : 'hist.pageNoGlobals'),
      redo: () => set(value),
      undo: () => set(!value)
    });
  }

  /** Cambia parámetros globales (un valor undefined lo quita). Los cambios seguidos se fusionan en un paso. */
  setGlobals(patch: Partial<Globals>): void {
    const before = plain(this.doc.globals ?? {}) as Globals;
    const after: Globals = { ...before, ...patch };
    for (const k of Object.keys(after) as (keyof Globals)[]) if (after[k] === undefined) delete after[k];
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    const apply = (g: Globals) => {
      if (Object.keys(g).length > 0) this.doc.globals = structuredClone(g);
      else delete this.doc.globals;
    };
    let target = after;
    const cmd: Command & { target: () => Globals } = {
      label: t('hist.globals'),
      mergeKey: 'globals',
      target: () => target,
      redo: () => apply(target),
      undo: () => apply(before),
      merge: (next) => {
        target = (next as Command & { target: () => Globals }).target();
        return true;
      }
    };
    this.history.run(cmd);
  }

  /**
   * Distribuidor: reparte las imágenes y cuadros de texto (los seleccionados o, si no hay, todos
   * los de la página) por la página, en orden de lectura. Un solo paso de historial. Devuelve cuántos movió.
   */
  distribute(opts: { margin: number; gap: number }): number {
    const movable = (o: PageObject) => (o.type === 'image' || o.type === 'text') && !o.locked;
    const sel = this.selection.map((id) => this.find(id)).filter((o): o is PageObject => !!o && movable(o));
    const targets = sel.length >= 1 ? sel : this.page.objects.filter(movable);
    if (targets.length === 0) return 0;
    const ordered = readingOrder(targets);
    const m = Math.max(0, opts.margin);
    const placed = distribute(
      ordered.map((o) => ({ id: o.id, w: o.w, h: o.h })),
      { x: m, y: m, w: this.doc.pageW - 2 * m, h: this.doc.pageH - 2 * m },
      Math.max(0, opts.gap)
    );
    const pageId = this.page.id;
    const changes: Change[] = [];
    for (const p of placed) {
      const o = this.find(p.id);
      if (!o) continue;
      changes.push({
        pageId,
        id: p.id,
        before: { x: o.x, y: o.y, w: o.w, h: o.h, rotation: o.rotation },
        after: { x: p.x, y: p.y, w: p.w, h: p.h, rotation: 0 }
      });
    }
    if (changes.length === 0) return 0;
    this.history.run(this.changeCommand(t('hist.distribute'), changes));
    return changes.length;
  }

  /** Idioma del texto del cómic para el corrector ortográfico ('' = el de la interfaz). No entra en el historial. */
  setTextLang(lang: string): void {
    if ((this.doc.textLang ?? '') === lang) return;
    if (lang) this.doc.textLang = lang;
    else delete this.doc.textLang;
    this.dirty = true;
  }

  setBackground(color: string): void {
    const pageId = this.page.id;
    const before = this.page.background;
    if (before === color) return;
    let after = color;
    const set = (c: string) => {
      const p = this.pageById(pageId);
      if (p) p.background = c;
    };
    const cmd: Command & { target: () => string } = {
      label: t('hist.background'),
      mergeKey: `bg:${pageId}`,
      target: () => after,
      redo: () => set(after),
      undo: () => set(before),
      merge: (next) => {
        after = (next as Command & { target: () => string }).target();
        return true;
      }
    };
    this.history.run(cmd);
  }

  /**
   * Cambia el tamaño de página. Con `scaleContent` (por defecto) todo el contenido se
   * escala en proporción al ancho; sin él, los objetos se quedan donde están.
   */
  setPageSize(w: number, h: number, scaleContent = true): void {
    if (w === this.doc.pageW && h === this.doc.pageH) return;
    const before = {
      w: this.doc.pageW,
      h: this.doc.pageH,
      pages: plain(this.doc.pages) as Page[],
      style: plain(this.doc.style) as Page | undefined,
      globals: plain(this.doc.globals) as Globals | undefined
    };
    const sc = w / before.w;
    const after = {
      w,
      h,
      pages: scaleContent ? scalePages(before.pages, sc) : (structuredClone(before.pages) as Page[]),
      style: before.style ? (scaleContent ? scalePages([before.style], sc)[0] : structuredClone(before.style)) : undefined,
      globals: scaleContent ? scaleGlobals(before.globals, sc) : before.globals
    };
    const apply = (s: { w: number; h: number; pages: Page[]; style?: Page; globals?: Globals }) => {
      this.doc.pageW = s.w;
      this.doc.pageH = s.h;
      this.doc.pages = structuredClone(s.pages);
      if (s.style) this.doc.style = structuredClone(s.style);
      if (s.globals) this.doc.globals = structuredClone(s.globals);
      else delete this.doc.globals;
    };
    this.history.run({
      label: t('hist.pageSize'),
      redo: () => apply(after),
      undo: () => apply(before)
    });
    this.fitView?.();
  }

  // ===========================================================================
  // Imágenes (assets)
  // ===========================================================================

  /** Registra una imagen ya conocida (p. ej. al abrir un proyecto). */
  registerAsset(data: AssetData): Asset {
    const url = URL.createObjectURL(bytesToBlob(data.bytes, data.mime));
    const asset: Asset = { ...data, url };
    this.assets = { ...this.assets, [asset.id]: asset };
    void this.buildProxies(asset);
    return asset;
  }

  /** Genera (sin bloquear) las versiones reducidas de una imagen grande y las añade a su registro. */
  async buildProxies(asset: Asset): Promise<void> {
    const blob = bytesToBlob(asset.bytes, asset.mime);
    const viewUrl = await makeProxy(blob, asset.w, asset.h, VIEW_MAX, asset.mime);
    const thumbUrl = await makeProxy(blob, asset.w, asset.h, THUMB_MAX, asset.mime);
    if (!viewUrl && !thumbUrl) return;
    const cur = this.assets[asset.id];
    if (!cur) {
      if (viewUrl) URL.revokeObjectURL(viewUrl);
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
      return;
    }
    this.assets = { ...this.assets, [asset.id]: { ...cur, viewUrl: viewUrl ?? undefined, thumbUrl: thumbUrl ?? undefined } };
  }

  /** Importa archivos de imagen nuevos. Ignora los que no se puedan leer. */
  async importImages(files: { name: string; bytes: Uint8Array; mime: string }[]): Promise<Asset[]> {
    const out: Asset[] = [];
    for (const f of files) {
      const url = URL.createObjectURL(bytesToBlob(f.bytes, f.mime));
      try {
        const { w, h } = (f.mime === 'image/svg+xml' ? svgIntrinsicSize(f.bytes) : null) ?? (await imageSize(url));
        const asset: Asset = { id: uid(), name: f.name, mime: f.mime, w, h, bytes: f.bytes, url };
        this.assets = { ...this.assets, [asset.id]: asset };
        void this.buildProxies(asset);
        out.push(asset);
      } catch {
        URL.revokeObjectURL(url);
        this.status = t('status.cantRead', { name: f.name });
      }
    }
    return out;
  }

  /**
   * Hace que un objeto de imagen o una capa de viñeta use `asset` (la versión editada de la que
   * tenían). Si cambió el tamaño (recorte), el objeto conserva la escala y el centro.
   */
  useEditedImage(target: { kind: 'object'; objectId: ID; assetId: ID } | { kind: 'layer'; panelId: ID; layerId: ID; assetId: ID }, asset: Asset): void {
    const old = this.assets[target.assetId];
    const rx = old ? asset.w / old.w : 1;
    const ry = old ? asset.h / old.h : 1;
    if (target.kind === 'object') {
      const o = this.find(target.objectId);
      if (!o || o.type !== 'image') return;
      const w = o.w * rx;
      const h = o.h * ry;
      this.patch([o.id], { assetId: asset.id, w, h, x: o.x + (o.w - w) / 2, y: o.y + (o.h - h) / 2 }, `imgedit:${o.id}`);
    } else {
      this.updateLayer(target.panelId, target.layerId, { assetId: asset.id }, 'imgedit');
    }
  }

  /** Marca (o desmarca) una imagen para guardarla en el proyecto aunque no se use. */
  setKeep(assetId: ID, keep: boolean): void {
    const a = this.assets[assetId];
    if (!a || !!a.keep === keep) return;
    this.assets = { ...this.assets, [assetId]: { ...a, keep: keep || undefined } };
    this.dirty = true;
  }

  /** Cuántas veces se usa una imagen en el cómic (objetos de imagen y capas de viñeta, incluida la página de estilo). */
  assetUses(assetId: ID): number {
    let n = 0;
    for (const p of this.allPages) {
      for (const o of p.objects) {
        if (o.type === 'image' && o.assetId === assetId) n++;
        else if (o.type === 'panel') n += o.layers.filter((l) => l.type === 'image' && l.assetId === assetId).length;
      }
    }
    return n;
  }

  /**
   * Quita una imagen del proyecto. Si se usa, se quitan también los objetos y capas que la
   * muestran. Todo es una sola acción deshacible.
   */
  removeAsset(assetId: ID): void {
    const asset = this.assets[assetId];
    if (!asset) return;
    const uses = this.assetUses(assetId);
    this.status = uses > 0 ? t('status.assetRemovedUsed', { n: uses }) : t('status.assetRemoved');
    const strip = (p: Page) => {
      p.objects = p.objects
        .filter((o) => !(o.type === 'image' && o.assetId === assetId))
        .map((o) => {
          if (o.type === 'panel') o.layers = o.layers.filter((l) => !(l.type === 'image' && l.assetId === assetId));
          return o;
        });
    };
    const touched = this.allPages.filter((p) =>
      p.objects.some((o) => (o.type === 'image' && o.assetId === assetId) || (o.type === 'panel' && o.layers.some((l) => l.type === 'image' && l.assetId === assetId)))
    );
    const saved = touched.map((p) => ({ id: p.id, objects: plain(p.objects) as PageObject[] }));
    this.history.run({
      label: t('hist.removeAsset'),
      redo: () => {
        for (const sp of saved) {
          const p = this.pageById(sp.id);
          if (p) strip(p);
        }
        const rest = { ...this.assets };
        delete rest[assetId];
        this.assets = rest; // la URL no se libera: Deshacer la necesita
        this.selection = [];
        this.editingId = null;
        this.activeLayerId = null;
      },
      undo: () => {
        for (const sp of saved) {
          const p = this.pageById(sp.id);
          if (p) p.objects = structuredClone(sp.objects);
        }
        this.assets = { ...this.assets, [assetId]: asset };
      }
    });
  }

  // ===========================================================================
  // Forma de la viñeta
  // ===========================================================================

  /** Cambia entre rectángulo, elipse y polígono (al pasar a polígono se parte de la forma actual). */
  setShape(panelId: ID, shape: PanelShape): void {
    const o = this.panelById(panelId);
    if (!o || o.shape === shape) return;
    const p: Patch = { shape };
    if (shape === 'poly') p.points = o.shape === 'ellipse' ? ellipsePoints(16) : unitSquare();
    this.patch([panelId], p);
  }

  /** Cambia el contorno de la viñeta por uno de arcos de nube (ajustado a su caja actual). */
  panelToCloud(panelId: ID): void {
    const o = this.panelById(panelId);
    if (!o) return;
    const px = scallopPoly(o.w / 2, o.h / 2, o.w / 2, o.h / 2, 5);
    this.patch([panelId], { ...panelWithPoints(o, px), shape: 'poly' });
  }

  /** Inserta un vértice en la arista `edge` (entre `edge` y `edge + 1`), en px de la viñeta. */
  insertVertex(panelId: ID, edge: number, at: Pt): void {
    const o = this.panelById(panelId);
    if (!o || o.shape !== 'poly') return;
    const px = pointsPx(o.points, o.w, o.h);
    px.splice(edge + 1, 0, at);
    this.patch([panelId], panelWithPoints(o, px));
  }

  /** Quita un vértice (un polígono necesita al menos 3). */
  removeVertex(panelId: ID, index: number): void {
    const o = this.panelById(panelId);
    if (!o || o.shape !== 'poly' || o.points.length <= 3) return;
    const px = pointsPx(o.points, o.w, o.h);
    px.splice(index, 1);
    this.patch([panelId], panelWithPoints(o, px));
  }

  // ===========================================================================
  // Capas de viñeta
  // ===========================================================================

  private panelById(id: ID): PanelObj | null {
    const o = this.find(id);
    return o && o.type === 'panel' ? o : null;
  }

  /** Añade una capa encima de las demás y la deja activa. */
  addLayer(panelId: ID, init: LayerInit): void {
    const o = this.panelById(panelId);
    if (!o) return;
    const layer = { ...structuredClone(init), id: uid() } as PanelLayer;
    this.patch([panelId], { layers: [...plain(o.layers), layer] });
    this.activeLayerId = layer.id;
  }

  /** Cambia propiedades de una capa. Los cambios seguidos de un mismo campo se fusionan. */
  updateLayer(panelId: ID, layerId: ID, p: Patch, field = 'l'): void {
    const o = this.panelById(panelId);
    if (!o) return;
    const layers = plain(o.layers).map((l) => (l.id === layerId ? ({ ...l, ...p } as PanelLayer) : l));
    this.patch([panelId], { layers }, `layer:${layerId}:${field}`);
  }

  removeLayer(panelId: ID, layerId: ID): void {
    const o = this.panelById(panelId);
    if (!o) return;
    this.patch([panelId], { layers: plain(o.layers).filter((l) => l.id !== layerId) });
    if (this.activeLayerId === layerId) this.activeLayerId = null;
    if (o.layers.length === 0) this.layerMode = false;
  }

  /** Sube (+1) o baja (-1) una capa en la pila. */
  moveLayer(panelId: ID, layerId: ID, dir: 1 | -1): void {
    const o = this.panelById(panelId);
    if (!o) return;
    const layers = plain(o.layers);
    const i = layers.findIndex((l) => l.id === layerId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layers.length) return;
    [layers[i], layers[j]] = [layers[j], layers[i]];
    this.patch([panelId], { layers });
  }

  /** Capa de imagen que cubre justo la viñeta. */
  imageLayerFor(assetId: ID, panel: PanelObj, fx?: ImageFx): LayerInit | null {
    const a = this.assets[assetId];
    if (!a) return null;
    return imageLayer(assetId, coverScale(a.w, a.h, panel.w, panel.h), fx ? { fx } : {});
  }

  /** Pone una imagen como nueva capa de la viñeta. */
  fillPanel(panelId: ID, assetId: ID, fx?: ImageFx): void {
    const o = this.panelById(panelId);
    const init = o && this.imageLayerFor(assetId, o, fx);
    if (init) this.addLayer(panelId, init);
  }

  /** Añade una imagen suelta centrada en `at` (o en el centro de la página). */
  placeImage(assetId: ID, at?: { x: number; y: number }, fx?: ImageFx): void {
    const a = this.assets[assetId];
    if (!a) return;
    const size = fitInside(a.w, a.h, this.doc.pageW * 0.7, this.doc.pageH * 0.7);
    const cx = at?.x ?? this.doc.pageW / 2;
    const cy = at?.y ?? this.doc.pageH / 2;
    this.addObjects([
      {
        type: 'image',
        x: cx - size.w / 2,
        y: cy - size.h / 2,
        w: size.w,
        h: size.h,
        rotation: 0,
        assetId,
        opacity: 1,
        ...(fx ? { fx } : {})
      }
    ]);
  }

  /** Clic en una miniatura: rellena la viñeta seleccionada o añade la imagen. */
  useAsset(assetId: ID, fx?: ImageFx): void {
    const s = this.single;
    if (s && s.type === 'panel') this.fillPanel(s.id, assetId, fx);
    else this.placeImage(assetId, undefined, fx);
  }

  /** Soltar una imagen sobre la página: rellena la viñeta que haya debajo o la coloca suelta. */
  dropAsset(assetId: ID, at: { x: number; y: number }, fx?: ImageFx): void {
    const panel = this.hitTest(at, 'panel');
    if (panel) {
      this.selection = [panel.id];
      this.fillPanel(panel.id, assetId, fx);
    } else {
      this.placeImage(assetId, at, fx);
    }
  }

  /** Imágenes ya traídas de una URL (p. ej. las incluidas con la app), por clave → id de asset. */
  private urlAssets = new Map<string, ID>();

  /**
   * Convierte una imagen de la app (URL) en un asset del proyecto. Se reutiliza si ya se
   * trajo antes, así usar 20 veces la misma silueta no multiplica el tamaño del archivo.
   */
  async assetFromUrl(key: string, url: string, name: string): Promise<Asset | null> {
    const known = this.urlAssets.get(key);
    if (known && this.assets[known]) return this.assets[known];
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const bytes = new Uint8Array(await res.arrayBuffer());
      const [asset] = await this.importImages([{ name, bytes, mime: mimeFromName(name) }]);
      if (!asset) return null;
      this.urlAssets.set(key, asset.id);
      return asset;
    } catch {
      this.status = t('status.cantLoad', { name });
      return null;
    }
  }

  // ===========================================================================
  // Proyecto
  // ===========================================================================

  /** Copia plana del documento (sin proxies) lista para serializar. */
  snapshot(): ComicDoc {
    return plain(this.doc);
  }

  private releaseAssets(): void {
    for (const a of Object.values(this.assets)) {
      URL.revokeObjectURL(a.url);
      if (a.viewUrl) URL.revokeObjectURL(a.viewUrl);
      if (a.thumbUrl) URL.revokeObjectURL(a.thumbUrl);
    }
    this.assets = {};
  }

  loadProject(doc: ComicDoc, assets: AssetData[], filePath: string | null, fileName: string, fonts: FontData[] = []): void {
    this.releaseAssets();
    void userFonts.replaceAll(fonts);
    for (const a of assets) this.registerAsset(a);
    this.doc = doc.pages.length > 0 ? doc : { ...doc, pages: [newPage()] };
    if (!this.doc.style) this.doc.style = newStyle();
    this.styleMode = false;
    this.pageIndex = 0;
    this.selection = [];
    this.editingId = null;
    this.history.clear();
    this.revision++;
    this.filePath = filePath;
    this.fileName = fileName;
    this.dirty = false;
    this.clipboard = [];
    queueMicrotask(() => this.fitView?.());
  }

  newProject(): void {
    this.loadProject(newDoc(t('doc.untitled')), [], null, t('doc.untitled'));
  }

  markSaved(filePath: string | null, fileName: string): void {
    this.filePath = filePath;
    this.fileName = fileName;
    this.doc.title = fileName.replace(/\.cfast$/i, '');
    this.dirty = false;
  }

  undo(): void {
    this.history.undo();
    this.selection = this.selection.filter((id) => this.find(id));
  }

  redo(): void {
    this.history.redo();
    this.selection = this.selection.filter((id) => this.find(id));
  }
}

export const editor = new Editor();
