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
  gridSize = 20;

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
      for (const k of Object.keys(p)) {
        const cur = plain(o[k]);
        const next = plain(p[k]);
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
      return { ...rest, x: o.x + off, y: o.y + off } as ObjectInit;
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
