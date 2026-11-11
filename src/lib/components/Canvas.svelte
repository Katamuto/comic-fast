<script lang="ts">
  import { t, i18n } from '../i18n/index.svelte';
  import { onMount, tick } from 'svelte';
  import { editor } from '../model/store.svelte';
  import { pickUrl } from '../imageedit/proxy';
  import { applyGlobals, textForced } from '../model/globals';
  import { pageInfo } from '../model/style';
  import { resourceDrag, type DragPayload } from '../app/resourceDrag.svelte';
  import { fileDrop } from '../app/fileDrop';
  import { importDroppedFiles } from '../io/fileActions';
  import { device } from '../app/device.svelte';
  import { pinchStep, dist, type Pt } from '../app/device';
  import PageContent from './PageContent.svelte';
  import {
    aabb,
    center,
    clamp,
    normalizeAngle,
    normalizeRect,
    rectsIntersect,
    resizeBox,
    scaleLayers,
    snapTo,
    toLocal,
    toPage,
    type Point,
    type Rotated
  } from '../model/geometry';
  import { nearestEdge, panelWithPoints, pointsPx } from '../model/panelGeometry';
  import { panelPath } from '../render/panelShape';
import type { Box, Change, ID, PageObject, PanelLayer, Patch } from '../model/types';
  import { fitObjectText, textRegion } from '../render/objectText';
  import { TAIL_STYLES, curveFromPoint, curveHandle, tailWidthFromPoint, tailWidthHandle } from '../render/balloon';
  import { needsRegion } from '../render/patterns';
  import { gradientGuides, moveGuide } from '../render/paint';
  import { parseColor } from '../render/color';
  import { contextMenu } from '../app/contextMenu.svelte';
  import { gridLines } from '../model/grid';
  import { actionEntries, contextEntries } from '../app/actions';
  import { fontState } from '../render/fonts.svelte';
  import { familyCss } from '../render/textLayout';
  import { findItem } from '../resources/registry';
  import { findStock } from '../resources/stock';
  import { NEUTRAL_FX } from '../render/imageFx';
  import { importImageInto } from '../io/fileActions';
  import { mimeFromName } from '../io/images';

  // --- Referencias y estado de vista -----------------------------------------
  let viewport = $state<HTMLDivElement>();
  let sheet = $state<HTMLDivElement>();
  let marquee = $state<Box | null>(null);
  let spaceDown = $state(false);
  let panning = $state(false);

  // --- Gestos ----------------------------------------------------------------
  interface PatchDrag {
    label: string;
    /** Propiedades que modifica el gesto (para registrar antes/después). */
    keys: string[];
    before: Record<ID, Patch>;
  }
  type Dir = -1 | 0 | 1;
  type Drag =
    | { kind: 'cut'; a: Point; b: Point }
    | (PatchDrag & { kind: 'move'; start: Point; ids: ID[]; origin: Point })
    | (PatchDrag & { kind: 'resize'; id: ID; hx: Dir; hy: Dir; orig: Rotated })
    | (PatchDrag & { kind: 'rotate'; id: ID; center: Point; startAngle: number; origRot: number })
    | (PatchDrag & { kind: 'tail'; id: ID })
    | (PatchDrag & { kind: 'tailo'; id: ID })
    | (PatchDrag & { kind: 'twidth'; id: ID })
    | (PatchDrag & { kind: 'tcurve'; id: ID })
    | (PatchDrag & { kind: 'vertex'; id: ID; index: number })
    | (PatchDrag & { kind: 'layermove'; id: ID; layerId: ID; start: Point; orig: Point })
    | (PatchDrag & { kind: 'layerrot'; id: ID; layerId: ID; center: Point; startAngle: number; origRot: number })
    | (PatchDrag & { kind: 'layerscale'; id: ID; layerId: ID; center: Point; startDist: number; origScale: number; lo: number; hi: number })
    | (PatchDrag & { kind: 'grad'; id: ID; which: 'p1' | 'p2'; layerId: ID | null })
    | { kind: 'marquee'; start: Point; additive: boolean; base: ID[] }
    | { kind: 'pan'; sx: number; sy: number; left: number; top: number };

  let drag: Drag | null = null;
  /** Recta de corte que se está dibujando (modo cortar viñetas). */
  let cutLine = $state<{ a: Point; b: Point } | null>(null);
  let lastDown = { t: 0, id: '' };

  /** Propiedades que cambian al mover un vértice (la caja se reajusta a la forma). */
  const VERTEX_KEYS = ['x', 'y', 'w', 'h', 'points', 'layers'];
  const LCORNERS = [
    { id: 'nw', sx: -1, sy: -1, cursor: 'nwse-resize' },
    { id: 'ne', sx: 1, sy: -1, cursor: 'nesw-resize' },
    { id: 'se', sx: 1, sy: 1, cursor: 'nwse-resize' },
    { id: 'sw', sx: -1, sy: 1, cursor: 'nesw-resize' }
  ];

  const HANDLES: { id: string; hx: Dir; hy: Dir; cursor: string }[] = [
    { id: 'nw', hx: -1, hy: -1, cursor: 'nwse-resize' },
    { id: 'n', hx: 0, hy: -1, cursor: 'ns-resize' },
    { id: 'ne', hx: 1, hy: -1, cursor: 'nesw-resize' },
    { id: 'e', hx: 1, hy: 0, cursor: 'ew-resize' },
    { id: 'se', hx: 1, hy: 1, cursor: 'nwse-resize' },
    { id: 's', hx: 0, hy: 1, cursor: 'ns-resize' },
    { id: 'sw', hx: -1, hy: 1, cursor: 'nesw-resize' },
    { id: 'w', hx: -1, hy: 0, cursor: 'ew-resize' }
  ];

  // --- Derivados -------------------------------------------------------------
  const single = $derived(editor.single);
  const hs = $derived((device.mobile ? 18 : 9) / editor.zoom); // tamaño de los tiradores en unidades de página
  const rotOffset = $derived((device.mobile ? 44 : 28) / editor.zoom);
  /** Globos con cola: el origen de la cola se puede mover; la punta solo si no está enlazada a otro globo. */
  const hasTailStyle = $derived(
    single !== null && single.type === 'balloon' && TAIL_STYLES.includes(single.style)
  );
  const showTail = $derived(hasTailStyle && !(single?.type === 'balloon' && single.link?.mode === 'tail'));

  /** Capa de imagen activa de la viñeta seleccionada (para el modo "editar imagen"). */
  const imgGeo = $derived.by(() => {
    const s = single;
    const l = editor.activeLayer;
    if (!editor.layerMode || !s || s.type !== 'panel' || !l || l.type !== 'image') return null;
    const a = editor.assets[l.assetId];
    return a ? { l, url: pickUrl(a, editor.zoom > 0.9 ? 'full' : 'view'), w: a.w * l.scale, h: a.h * l.scale } : null;
  });
  /** Capa de trama activa (modo «editar en el lienzo»): se gira y escala con un mando. */
  const patGeo = $derived.by(() => {
    const s = single;
    const l = editor.activeLayer;
    if (!editor.layerMode || !s || s.type !== 'panel' || !l || l.type !== 'pattern' || !needsRegion(l.kind)) return null;
    return { l };
  });
  const gizmoR = $derived(80 / editor.zoom);
  /**
   * Degradado que se está editando (relleno de la viñeta/globo o capa de degradado activa):
   * sus dos guías se dibujan y se arrastran en el lienzo.
   */
  const gradTarget = $derived.by(() => {
    const s = single;
    if (!s || !editor.showGuides || editor.editingId || s.locked || editor.layerMode) return null;
    const l = editor.activeLayer;
    if (s.type === 'panel' && l && l.type === 'gradient') return { layerId: l.id, g: l.gradient };
    if ((s.type === 'panel' || s.type === 'balloon') && typeof s.fill === 'object') return { layerId: null, g: s.fill };
    return null;
  });
  const gradView = $derived.by(() => {
    const s = single;
    const tg = gradTarget;
    if (!s || !tg) return null;
    const { p1, p2 } = gradientGuides(tg.g, s.w, s.h);
    const a = { x: p1.x * s.w, y: p1.y * s.h };
    const b = { x: p2.x * s.w, y: p2.y * s.h };
    return { a, b, r: Math.hypot(b.x - a.x, b.y - a.y), radial: tg.g.kind === 'radial', c1: parseColor(tg.g.c1).hex, c2: parseColor(tg.g.c2).hex };
  });
  /** Tirador de curvatura de la cola del globo seleccionado. */
  const gridV = $derived(editor.showGrid ? gridLines(editor.doc.pageW, editor.doc.pageH, editor.grid) : { x: [], y: [] });
  const widthPt = $derived(single && single.type === 'balloon' && showTail ? tailWidthHandle(single) : null);
  const curvePt = $derived(single && single.type === 'balloon' && showTail ? curveHandle(single) : null);
  const polyPx = $derived(
    single && single.type === 'panel' && single.shape === 'poly' ? pointsPx(single.points, single.w, single.h) : []
  );
  const angleOf = (p: Point, c: Point) => (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;

  /** Página de estilo, número y total que corresponden a la página actual (según lo que excluya). */
  const info = $derived(pageInfo(editor.doc, editor.pageIndex));

  const editingObj = $derived.by(() => {
    const id = editor.editingId;
    if (!id) return null;
    const o = editor.find(id);
    return o && (o.type === 'balloon' || o.type === 'text') ? o : null;
  });

  const edit = $derived.by(() => {
    const raw = editingObj;
    if (!raw) return null;
    void fontState.ready;
    const o = applyGlobals(raw, info.globals);
    const region = textRegion(o);
    const fit = fitObjectText(o, textForced(info.globals));
    const padTop = o.type === 'balloon' && !o.vertical ? Math.max(0, (region.h - fit.lines.length * fit.lineHeight) / 2) : 0;
    return { o, region, fit, padTop };
  });

  const transformOf = (o: Box & { rotation: number }) =>
    `rotate(${o.rotation} ${o.x + o.w / 2} ${o.y + o.h / 2}) translate(${o.x} ${o.y})`;

  // --- Utilidades ------------------------------------------------------------
  function toPagePoint(e: { clientX: number; clientY: number }): Point {
    const r = sheet!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / editor.zoom, y: (e.clientY - r.top) / editor.zoom };
  }

  /** Copia plana de un valor (los objetos y arrays del estado son proxies). */
  const flat = (v: unknown): unknown => (typeof v === 'object' && v !== null ? $state.snapshot(v) : v);
  const sameValue = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

  function snapshotOf(ids: ID[], keys: string[]): Record<ID, Patch> {
    const out: Record<ID, Patch> = {};
    for (const id of ids) {
      const o = editor.find(id) as unknown as Record<string, unknown> | undefined;
      if (!o) continue;
      const p: Patch = {};
      for (const k of keys) p[k] = flat(o[k]);
      out[id] = p;
    }
    return out;
  }

  /** Cambia propiedades de una capa de una viñeta durante un gesto (sin historial). */
  function liveLayer(panelId: ID, layerId: ID, patch: Patch) {
    const o = editor.find(panelId);
    if (!o || o.type !== 'panel') return;
    editor.live(panelId, { layers: o.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)) });
  }

  function finishPatchDrag(d: PatchDrag) {
    const pageId = editor.page.id;
    const changes: Change[] = [];
    for (const [id, before] of Object.entries(d.before)) {
      const o = editor.find(id) as unknown as Record<string, unknown> | undefined;
      if (!o) continue;
      const after: Patch = {};
      let changed = false;
      for (const k of d.keys) {
        after[k] = flat(o[k]);
        if (!sameValue(after[k], before[k])) changed = true;
      }
      if (changed) changes.push({ pageId, id, before, after });
    }
    editor.commit(d.label, changes);
  }

  function capture(e: PointerEvent) {
    try {
      viewport?.setPointerCapture(e.pointerId);
    } catch {
      /* el puntero ya no está activo */
    }
  }

  function isTyping(t: EventTarget | null): boolean {
    const el = t as HTMLElement | null;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  }

  // --- Gestos táctiles -------------------------------------------------------
  // Un dedo en un objeto lo mueve; un dedo en el fondo desplaza la vista; dos dedos = pellizco
  // (zoom + desplazamiento) en cualquier parte.
  const touches = new Map<number, Pt>();
  let pinchPrev: [Pt, Pt] | null = null;
  let pinchBusy = false;
  let touchPanMoved = false;

  function twoTouches(): [Pt, Pt] | null {
    const v = [...touches.values()];
    return v.length >= 2 ? [v[0], v[1]] : null;
  }

  function beginPinch(e: PointerEvent) {
    // Un arrastre empezado con el primer dedo se da por terminado tal como está.
    if (drag && 'before' in drag) finishPatchDrag(drag);
    drag = null;
    marquee = null;
    panning = false;
    pinchPrev = twoTouches();
    capture(e);
  }

  async function updatePinch() {
    const cur = twoTouches();
    if (!cur || !pinchPrev || pinchBusy || !sheet || !viewport) return;
    const step = pinchStep(pinchPrev, cur);
    pinchBusy = true;
    pinchPrev = cur;
    try {
      await zoomAround(step.factor, step.from, step.to);
    } finally {
      pinchBusy = false;
    }
  }

  /** Cambia el zoom manteniendo el punto de la página que estaba en `from` justo bajo `to`. */
  async function zoomAround(factor: number, from: Pt, to: Pt) {
    if (!sheet || !viewport) return;
    const before = sheet.getBoundingClientRect();
    const px = (from.x - before.left) / editor.zoom;
    const py = (from.y - before.top) / editor.zoom;
    editor.zoomBy(factor);
    await tick();
    if (!sheet || !viewport) return;
    const after = sheet.getBoundingClientRect();
    viewport.scrollLeft += after.left + px * editor.zoom - to.x;
    viewport.scrollTop += after.top + py * editor.zoom - to.y;
  }

  // --- Puntero ---------------------------------------------------------------
  function startPan(e: PointerEvent) {
    if (!viewport) return;
    drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    panning = true;
    capture(e);
    e.preventDefault();
  }

  /** Clic derecho: selecciona lo que hay bajo el puntero y abre el menú propio (no el del navegador). */
  function onContextMenu(e: MouseEvent) {
    if (isTyping(e.target) || (e.target as Element).closest('.edit-box')) return; // el texto conserva su menú
    e.preventDefault();
    if (editor.editingId) editor.stopEditing();
    const id = (e.target as Element).closest('[data-oid]')?.getAttribute('data-oid');
    if (id) {
      if (!editor.selection.includes(id)) editor.select([id]);
    } else if (!(e.target as Element).closest('[data-handle]')) {
      editor.select([]);
    }
    contextMenu.show(e.clientX, e.clientY, actionEntries(contextEntries));
  }

  function onPointerDown(e: PointerEvent) {
    const target = e.target as Element;
    if (target.closest('.edit-box')) return; // clic dentro del cuadro de texto
    if (editor.editingId) editor.stopEditing();

    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        beginPinch(e);
        return;
      }
      if (touches.size > 2) return;
      touchPanMoved = false;
    }

    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      startPan(e);
      return;
    }
    if (e.button !== 0 || !sheet) return;

    const p = toPagePoint(e);
    const s = editor.single;

    // Modo «cortar viñetas»: se arrastra una recta que parte la viñeta.
    if (editor.cutMode) {
      drag = { kind: 'cut', a: p, b: p };
      cutLine = { a: p, b: p };
      capture(e);
      return;
    }

    // Tiradores de la selección.
    const handleEl = target.closest('[data-handle]');
    const guideId = handleEl?.getAttribute('data-handle');
    if (s && gradTarget && (guideId === 'g1' || guideId === 'g2')) {
      const layerId = gradTarget.layerId;
      const keys = layerId ? ['layers'] : ['fill'];
      drag = { kind: 'grad', id: s.id, which: guideId === 'g1' ? 'p1' : 'p2', layerId, label: t('drag.gradient'), keys, before: snapshotOf([s.id], keys) };
      capture(e);
      return;
    }
    if (handleEl && s) {
      const h = handleEl.getAttribute('data-handle')!;
      const layer = editor.activeLayer;
      if (
        s.type === 'panel' &&
        layer &&
        (layer.type === 'image' || layer.type === 'pattern') &&
        (h === 'lrot' || h === 'psc' || h.startsWith('ls:'))
      ) {
        // Tiradores de la imagen o trama dentro de la viñeta (modo "editar en el lienzo").
        const c = toPage(s, { x: layer.x, y: layer.y });
        const base = { id: s.id, layerId: layer.id, center: c, keys: ['layers'], before: snapshotOf([s.id], ['layers']) };
        if (h === 'lrot') {
          drag = { kind: 'layerrot', ...base, label: t('drag.layerRotate'), startAngle: angleOf(p, c), origRot: layer.rotation };
        } else {
          drag = {
            kind: 'layerscale',
            ...base,
            label: t('drag.layerScale'),
            startDist: Math.max(1, Math.hypot(p.x - c.x, p.y - c.y)),
            origScale: layer.scale,
            lo: layer.type === 'pattern' ? 0.2 : 0.005,
            hi: layer.type === 'pattern' ? 12 : 60
          };
        }
      } else if (h.startsWith('v:') && s.type === 'panel') {
        const index = Number(h.slice(2));
        const key = `v:${s.id}:${index}`;
        const now = Date.now();
        if (now - lastDown.t < 350 && lastDown.id === key) {
          // Doble clic en un vértice: lo quita.
          lastDown = { t: 0, id: '' };
          editor.removeVertex(s.id, index);
          return;
        }
        lastDown = { t: now, id: key };
        drag = { kind: 'vertex', id: s.id, index, label: t('drag.vertex'), keys: VERTEX_KEYS, before: snapshotOf([s.id], VERTEX_KEYS) };
      } else if (h === 'rot') {
        const c = center(s);
        drag = {
          kind: 'rotate',
          id: s.id,
          center: c,
          startAngle: (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI,
          origRot: s.rotation,
          label: t('drag.rotate'),
          keys: ['rotation'],
          before: snapshotOf([s.id], ['rotation'])
        };
      } else if (h === 'tcurve') {
        drag = { kind: 'tcurve', id: s.id, label: t('drag.tailCurve'), keys: ['tailCurve'], before: snapshotOf([s.id], ['tailCurve']) };
      } else if (h === 'twidth') {
        drag = { kind: 'twidth', id: s.id, label: t('drag.tailWidth'), keys: ['tailWidth'], before: snapshotOf([s.id], ['tailWidth']) };
      } else if (h === 'tailo') {
        drag = { kind: 'tailo', id: s.id, label: t('drag.tailOrigin'), keys: ['tailOx', 'tailOy'], before: snapshotOf([s.id], ['tailOx', 'tailOy']) };
      } else if (h === 'tail') {
        drag = { kind: 'tail', id: s.id, label: t('drag.tailMove'), keys: ['tailX', 'tailY'], before: snapshotOf([s.id], ['tailX', 'tailY']) };
      } else {
        const dir = HANDLES.find((x) => x.id === h);
        if (!dir) return;
        // En las viñetas, sus capas de imagen se redimensionan con ella (con Alt, solo el marco).
        const rkeys = s.type === 'panel' ? ['x', 'y', 'w', 'h', 'layers'] : ['x', 'y', 'w', 'h'];
        drag = {
          kind: 'resize',
          id: s.id,
          hx: dir.hx,
          hy: dir.hy,
          orig: { x: s.x, y: s.y, w: s.w, h: s.h, rotation: s.rotation },
          label: t('drag.resize'),
          keys: rkeys,
          before: snapshotOf([s.id], rkeys)
        };
      }
      capture(e);
      return;
    }

    // Objetos.
    const oidEl = target.closest('[data-oid]');
    if (oidEl) {
      const id = oidEl.getAttribute('data-oid')!;
      const now = Date.now();
      const isDouble = now - lastDown.t < 350 && lastDown.id === id;
      lastDown = { t: now, id };

      if (e.shiftKey) {
        editor.toggleSelect(id);
        if (!editor.selection.includes(id)) return;
      } else if (!editor.selection.includes(id)) {
        editor.select([id]);
      }

      const o = editor.find(id);
      if (!o) return;

      if (isDouble) {
        lastDown = { t: 0, id: '' };
        if (o.type === 'balloon' || o.type === 'text') {
          // Se retrasa para que el foco no se pierda con el propio clic.
          setTimeout(() => editor.startEditing(id), 30);
        } else if (o.type === 'panel') {
          if (o.shape === 'poly' && !editor.layerMode) {
            // Doble clic cerca de un borde: añade un vértice.
            const l = toLocal(o, p);
            const hit = nearestEdge(pointsPx(o.points, o.w, o.h), { x: l.x + o.w / 2, y: l.y + o.h / 2 });
            if (hit && hit.dist <= 12 / editor.zoom) {
              editor.insertVertex(o.id, hit.index, hit.point);
              return;
            }
          }
          const topImage = [...o.layers].reverse().find((l) => l.type === 'image');
          if (topImage) {
            if (editor.activeLayer?.type !== 'image') editor.activeLayerId = topImage.id;
            editor.layerMode = !editor.layerMode;
          } else if (o.layers.length === 0) {
            void importImageInto(o.id);
          }
        }
        return;
      }

      const al = o.type === 'panel' && editor.single?.id === id ? editor.activeLayer : null;
      const layerEditable = al !== null && (al.type === 'image' || (al.type === 'pattern' && needsRegion(al.kind)));
      if (al && al.type !== 'gradient' && (e.altKey || (editor.layerMode && layerEditable))) {
        // Mover la capa activa dentro de la viñeta.
        drag = {
          kind: 'layermove',
          id,
          layerId: al.id,
          start: p,
          orig: { x: al.x, y: al.y },
          label: t('drag.layerMove'),
          keys: ['layers'],
          before: snapshotOf([id], ['layers'])
        };
      } else {
        // Los objetos bloqueados no se mueven (siguen pudiéndose seleccionar).
        const own = editor.selection.filter((sid) => !editor.find(sid)?.locked);
        // Los globos y textos metidos en una viñeta la acompañan.
        const ids = [...own, ...editor.childrenOf(own).filter((cid) => !editor.find(cid)?.locked)];
        if (own.length === 0) {
          editor.status = t('status.locked');
          return;
        }
        drag = {
          kind: 'move',
          start: p,
          ids,
          origin: { x: o.x, y: o.y },
          label: t('drag.move'),
          keys: ['x', 'y'],
          before: snapshotOf(ids, ['x', 'y'])
        };
      }
      capture(e);
      return;
    }

    // Táctil: arrastrar el fondo desplaza la vista (tocar sin mover deselecciona, al soltar).
    if (e.pointerType === 'touch') {
      startPan(e);
      return;
    }
    // Fondo: deselecciona e inicia el rectángulo de selección.
    if (!e.shiftKey) editor.select([]);
    drag = { kind: 'marquee', start: p, additive: e.shiftKey, base: [...editor.selection] };
    capture(e);
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchPrev) {
        void updatePinch();
        return;
      }
      if (touches.size >= 2) return;
    }
    if (!drag) return;

    if (drag.kind === 'cut') {
      let q = toPagePoint(e);
      if (e.shiftKey) {
        // Mayús: ángulos de 15°
        const ang = Math.round(Math.atan2(q.y - drag.a.y, q.x - drag.a.x) / (Math.PI / 12)) * (Math.PI / 12);
        const len = Math.hypot(q.x - drag.a.x, q.y - drag.a.y);
        q = { x: drag.a.x + Math.cos(ang) * len, y: drag.a.y + Math.sin(ang) * len };
      }
      drag = { ...drag, b: q };
      cutLine = { a: drag.a, b: q };
      return;
    }

    if (drag.kind === 'pan') {
      if (e.pointerType === 'touch' && drag.sx !== undefined && dist({ x: drag.sx, y: drag.sy }, { x: e.clientX, y: e.clientY }) > 8) touchPanMoved = true;
      if (viewport) {
        viewport.scrollLeft = drag.left - (e.clientX - drag.sx);
        viewport.scrollTop = drag.top - (e.clientY - drag.sy);
      }
      return;
    }

    const p = toPagePoint(e);
    switch (drag.kind) {
      case 'move': {
        let dx = p.x - drag.start.x;
        let dy = p.y - drag.start.y;
        if (editor.snap) {
          dx = snapTo(drag.origin.x + dx, editor.gridSize) - drag.origin.x;
          dy = snapTo(drag.origin.y + dy, editor.gridSize) - drag.origin.y;
        }
        for (const id of drag.ids) {
          const b = drag.before[id];
          if (b) editor.live(id, { x: (b.x as number) + dx, y: (b.y as number) + dy });
        }
        break;
      }
      case 'resize': {
        const o = editor.find(drag.id);
        if (!o) break;
        // Las imágenes mantienen la proporción; Mayús invierte el comportamiento.
        const keep = (o.type === 'image') !== e.shiftKey;
        // Con el imán activo, el borde que se arrastra salta a la cuadrícula
        // (solo si el objeto no está girado: los bordes girados no siguen la cuadrícula).
        let q = p;
        const turn = Math.abs(drag.orig.rotation) % 90;
        if (editor.snap && (turn < 0.01 || turn > 89.99)) {
          q = {
            x: drag.hx !== 0 ? snapTo(p.x, editor.gridSize) : p.x,
            y: drag.hy !== 0 ? snapTo(p.y, editor.gridSize) : p.y
          };
        }
        const box = resizeBox(drag.orig, drag.hx, drag.hy, toLocal(drag.orig, q), keep);
        const before = drag.before[drag.id]?.layers as PanelLayer[] | undefined;
        if (o.type === 'panel' && before && !e.altKey) {
          editor.live(drag.id, { ...box, layers: scaleLayers(before, box.w / drag.orig.w, box.h / drag.orig.h) });
        } else {
          editor.live(drag.id, { ...box });
        }
        break;
      }
      case 'rotate': {
        const a = (Math.atan2(p.y - drag.center.y, p.x - drag.center.x) * 180) / Math.PI;
        let rot = normalizeAngle(drag.origRot + a - drag.startAngle);
        if (e.shiftKey) rot = Math.round(rot / 15) * 15;
        editor.live(drag.id, { rotation: rot });
        break;
      }
      case 'tail': {
        const o = editor.find(drag.id);
        if (!o) break;
        const l = toLocal(o, p);
        editor.live(drag.id, { tailX: l.x, tailY: l.y });
        break;
      }
      case 'twidth': {
        const o = editor.find(drag.id);
        if (!o || o.type !== 'balloon') break;
        const l = toLocal(o, p);
        const w = tailWidthFromPoint(o, { x: l.x + o.w / 2, y: l.y + o.h / 2 });
        if (w !== null) editor.live(drag.id, { tailWidth: w });
        break;
      }
      case 'tailo': {
        const o = editor.find(drag.id);
        if (!o || o.type !== 'balloon') break;
        const l = toLocal(o, p);
        // dentro del cuerpo del globo: se limita a una elipse algo más pequeña que su caja
        const rx = Math.max(1, o.w / 2 - o.strokeWidth) * 0.9;
        const ry = Math.max(1, o.h / 2 - o.strokeWidth) * 0.9;
        const k = Math.hypot(l.x / rx, l.y / ry);
        const u = k > 1 ? 1 / k : 1;
        editor.live(drag.id, { tailOx: Math.round(l.x * u), tailOy: Math.round(l.y * u) });
        break;
      }
      case 'tcurve': {
        const o = editor.find(drag.id);
        if (!o || o.type !== 'balloon') break;
        const l = toLocal(o, p);
        const c = curveFromPoint(o, { x: l.x + o.w / 2, y: l.y + o.h / 2 });
        if (c !== null) editor.live(drag.id, { tailCurve: Math.round(c * 100) / 100 });
        break;
      }
      case 'layermove': {
        const o = editor.find(drag.id);
        if (!o || o.type !== 'panel') break;
        const l0 = toLocal(o, drag.start);
        const l1 = toLocal(o, p);
        liveLayer(drag.id, drag.layerId, { x: drag.orig.x + l1.x - l0.x, y: drag.orig.y + l1.y - l0.y });
        break;
      }
      case 'layerrot': {
        let rot = normalizeAngle(drag.origRot + angleOf(p, drag.center) - drag.startAngle);
        if (e.shiftKey) rot = Math.round(rot / 15) * 15;
        liveLayer(drag.id, drag.layerId, { rotation: rot });
        break;
      }
      case 'layerscale': {
        const dist = Math.max(1, Math.hypot(p.x - drag.center.x, p.y - drag.center.y));
        liveLayer(drag.id, drag.layerId, { scale: clamp(drag.origScale * (dist / drag.startDist), drag.lo, drag.hi) });
        break;
      }
      case 'vertex': {
        const o = editor.find(drag.id);
        if (!o || o.type !== 'panel') break;
        const pp = editor.snap ? { x: snapTo(p.x, editor.gridSize), y: snapTo(p.y, editor.gridSize) } : p;
        const l = toLocal(o, pp);
        const px = pointsPx(o.points, o.w, o.h);
        px[drag.index] = { x: l.x + o.w / 2, y: l.y + o.h / 2 };
        editor.live(drag.id, panelWithPoints(o, px));
        break;
      }
      case 'grad': {
        const o = editor.find(drag.id);
        if (!o || (o.type !== 'panel' && o.type !== 'balloon')) break;
        const l = toLocal(o, p);
        const pt = {
          x: clamp((l.x + o.w / 2) / Math.max(1, o.w), -1, 2),
          y: clamp((l.y + o.h / 2) / Math.max(1, o.h), -1, 2)
        };
        const lid = drag.layerId;
        if (lid && o.type === 'panel') {
          const layer = o.layers.find((x) => x.id === lid);
          if (layer && layer.type === 'gradient') liveLayer(drag.id, lid, { gradient: moveGuide(layer.gradient, drag.which, pt, o.w, o.h) });
        } else if (typeof o.fill === 'object') {
          editor.live(drag.id, { fill: moveGuide(o.fill, drag.which, pt, o.w, o.h) });
        }
        break;
      }
      case 'marquee': {
        const r = normalizeRect(drag.start, p);
        marquee = r;
        const hit = editor.page.objects.filter((o) => rectsIntersect(aabb(o), r)).map((o) => o.id);
        editor.selection = drag.additive ? [...new Set([...drag.base, ...hit])] : hit;
        break;
      }
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinchPrev = null;
    }
    if (!drag) return;
    const d = drag;
    if (d.kind === 'cut') {
      drag = null;
      cutLine = null;
      if (Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) > 6 / editor.zoom) editor.cutPanels(d.a, d.b);
      try {
        viewport?.releasePointerCapture(e.pointerId);
      } catch {
        /* ya liberado */
      }
      return;
    }
    if (d.kind === 'pan' && e.pointerType === 'touch' && !touchPanMoved && e.type === 'pointerup') editor.select([]);
    drag = null;
    marquee = null;
    panning = false;
    if ('before' in d) {
      finishPatchDrag(d);
      // Un objeto soltado por completo fuera de la página no se vería: se elimina.
      if (d.kind === 'move') editor.removeOutside(d.ids);
      else if (d.kind === 'resize' || d.kind === 'rotate') editor.removeOutside([d.id]);
    }
    try {
      viewport?.releasePointerCapture(e.pointerId);
    } catch {
      /* ya liberado */
    }
  }

  // --- Zoom y desplazamiento -------------------------------------------------
  function fit() {
    if (!viewport) return;
    const pad = 72;
    const z = Math.min(
      (viewport.clientWidth - pad) / editor.doc.pageW,
      (viewport.clientHeight - pad) / editor.doc.pageH
    );
    editor.setZoom(z > 0 ? z : 0.5);
  }

  onMount(() => {
    editor.fitView = fit;
    fit();
    return () => {
      if (editor.fitView === fit) editor.fitView = null;
    };
  });

  // Ctrl/⌘ + rueda (o pellizco del trackpad) = zoom centrado en el puntero.
  $effect(() => {
    const el = viewport;
    if (!el) return;
    const onWheel = async (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !sheet) return;
      e.preventDefault();
      const p = { x: e.clientX, y: e.clientY };
      await zoomAround(Math.exp(-e.deltaY * 0.0015), p, p);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  function onWindowKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && editor.cutMode) {
      editor.cutMode = false;
      return;
    }
    if (e.code === 'Space' && !isTyping(e.target)) {
      spaceDown = true;
      e.preventDefault();
    }
  }
  function onWindowKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') spaceDown = false;
  }

  // --- Arrastrar y soltar ----------------------------------------------------
  function onDragOver(e: DragEvent) {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  /** Coloca un recurso del panel (arrastrado con el puntero, ver app/resourceDrag.svelte.ts). */
  async function dropResource(d: DragPayload, p: Point) {
    if (d.kind === 'asset') {
      editor.dropAsset(d.id, p);
    } else if (d.kind === 'stock') {
      const st = findStock(d.id);
      if (st) {
        const a = await editor.assetFromUrl(st.id, st.url, st.name);
        if (a) editor.dropAsset(a.id, p, st.tint ? { ...NEUTRAL_FX, tint: '#222222' } : undefined);
      }
    } else {
      const item = findItem(d.tab, d.id);
      if (item) {
        // Tramas, texturas y degradados soltados sobre una viñeta entran como capa.
        const panel = item.layer ? editor.hitTest(p, 'panel') : undefined;
        if (panel && item.layer) {
          editor.select([panel.id]);
          editor.addLayer(panel.id, item.layer());
        } else {
          editor.addObjects(item.build({ pageW: editor.doc.pageW, pageH: editor.doc.pageH, cx: p.x, cy: p.y }));
        }
      }
    }
  }

  onMount(() => {
    resourceDrag.handler = (d, x, y) => void dropResource(d, toPagePoint({ clientX: x, clientY: y }));
    fileDrop.place = (assets, x, y) => {
      const p = toPagePoint({ clientX: x, clientY: y });
      assets.forEach((a, i) => {
        if (i === 0) editor.dropAsset(a.id, p);
        else editor.placeImage(a.id, { x: p.x + i * 30, y: p.y + i * 30 });
      });
    };
    return () => {
      resourceDrag.handler = null;
      fileDrop.place = null;
    };
  });

  /** Archivos de imagen soltados sobre la página: se importan y se colocan donde se soltaron. */
  async function onDrop(e: DragEvent) {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt || !sheet) return;
    const p = toPagePoint(e);
    const assets = await importDroppedFiles(Array.from(dt.files));
    assets.forEach((a, i) => {
      if (i === 0) editor.dropAsset(a.id, p);
      else editor.placeImage(a.id, { x: p.x + i * 30, y: p.y + i * 30 });
    });
  }

  function autofocus(node: HTMLTextAreaElement) {
    node.focus();
    node.select();
  }
</script>

<svelte:window onkeydown={onWindowKeyDown} onkeyup={onWindowKeyUp} />

<div
  class="viewport"
  class:space={spaceDown}
  class:panning
  bind:this={viewport}
  data-dropzone
  role="application"
  aria-label={t('canvas.label')}
  onpointerdown={onPointerDown}
  oncontextmenu={onContextMenu}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  ondragover={onDragOver}
  ondrop={onDrop}
>
  <div class="stage">
    <div
      class="sheet"
      bind:this={sheet}
      style:width="{editor.doc.pageW * editor.zoom}px"
      style:height="{editor.doc.pageH * editor.zoom}px"
    >
      <svg
        class="page"
        viewBox="0 0 {editor.doc.pageW} {editor.doc.pageH}"
        width={editor.doc.pageW * editor.zoom}
        height={editor.doc.pageH * editor.zoom}
      >
        <!-- Contenido recortado al borde de la página -->
        <svg x="0" y="0" width={editor.doc.pageW} height={editor.doc.pageH} overflow="hidden">
          <PageContent
            w={editor.doc.pageW}
            h={editor.doc.pageH}
            page={editor.page}
            assets={editor.assets}
            scope="main"
            quality={editor.zoom > 0.9 ? 'full' : 'view'}
            interactive
            editingId={editor.editingId}
            style={editor.styleMode ? null : info.style}
            pageNo={info.pageNo}
            pageCount={info.pageCount}
            globals={info.globals}
            styleEdit={editor.styleMode}
            underlay={editor.doc.pages[editor.pageIndex]?.background}
          />
        </svg>

        {#if editor.showGrid}
          <g pointer-events="none" fill="none" vector-effect="non-scaling-stroke">
            {#each gridV.x as l}
              <line x1={l.at} y1="0" x2={l.at} y2={editor.doc.pageH} stroke={l.major ? 'rgb(47 125 246 / 0.5)' : 'rgb(47 125 246 / 0.2)'} stroke-width="1" vector-effect="non-scaling-stroke" />
            {/each}
            {#each gridV.y as l}
              <line x1="0" y1={l.at} x2={editor.doc.pageW} y2={l.at} stroke={l.major ? 'rgb(47 125 246 / 0.5)' : 'rgb(47 125 246 / 0.2)'} stroke-width="1" vector-effect="non-scaling-stroke" />
            {/each}
          </g>
        {/if}

        {#if cutLine}
          <line x1={cutLine.a.x} y1={cutLine.a.y} x2={cutLine.b.x} y2={cutLine.b.y} stroke="#e5342d" stroke-width="2.5" stroke-dasharray="8 5" vector-effect="non-scaling-stroke" pointer-events="none" />
        {/if}

        <!-- Contornos de selección -->
        {#each editor.selected as o (o.id)}
          <g transform={transformOf(o)} pointer-events="none">
            <rect
              width={o.w}
              height={o.h}
              fill="none"
              stroke="var(--sel)"
              stroke-width="1.5"
              vector-effect="non-scaling-stroke"
            />
            {#if o.type === 'panel' && o.shape !== 'rect'}
              <path
                d={panelPath(o)}
                fill="none"
                stroke="var(--sel)"
                stroke-width="2"
                vector-effect="non-scaling-stroke"
              />
            {/if}
          </g>
        {/each}

        <!-- Tiradores (solo con un objeto seleccionado) -->
        {#if single && !editor.editingId && imgGeo}
          <!-- Modo "editar imagen": la imagen activa, también fuera de la viñeta -->
          <g transform={transformOf(single)}>
            <g
              transform="translate({single.w / 2 + imgGeo.l.x} {single.h / 2 + imgGeo.l.y}) rotate({imgGeo.l.rotation})"
            >
              <image
                href={imgGeo.url}
                x={-imgGeo.w / 2}
                y={-imgGeo.h / 2}
                width={imgGeo.w}
                height={imgGeo.h}
                preserveAspectRatio="none"
                opacity="0.28"
                pointer-events="none"
              />
              <rect
                x={-imgGeo.w / 2}
                y={-imgGeo.h / 2}
                width={imgGeo.w}
                height={imgGeo.h}
                fill="none"
                stroke="#ff8a3d"
                stroke-width="2"
                stroke-dasharray="6 4"
                vector-effect="non-scaling-stroke"
                pointer-events="none"
              />
              {#each LCORNERS as c (c.id)}
                <rect
                  data-handle={`ls:${c.id}`}
                  x={(c.sx * imgGeo.w) / 2 - hs / 2}
                  y={(c.sy * imgGeo.h) / 2 - hs / 2}
                  width={hs}
                  height={hs}
                  fill="#ffffff"
                  stroke="#ff8a3d"
                  stroke-width="2"
                  vector-effect="non-scaling-stroke"
                  style:cursor={c.cursor}
                />
              {/each}
              <line
                x1="0"
                y1={imgGeo.h / 2}
                x2="0"
                y2={imgGeo.h / 2 + rotOffset}
                stroke="#ff8a3d"
                stroke-width="2"
                vector-effect="non-scaling-stroke"
                pointer-events="none"
              />
              <circle
                data-handle="lrot"
                cx="0"
                cy={imgGeo.h / 2 + rotOffset}
                r={hs * 0.65}
                fill="#ff8a3d"
                stroke="#ffffff"
                stroke-width="1.5"
                vector-effect="non-scaling-stroke"
                style:cursor="grab"
              />
            </g>
          </g>
        {:else if single && !editor.editingId && patGeo}
          <!-- Modo "editar en el lienzo" de una trama: círculo = girar, cuadrado = escalar -->
          <g transform={transformOf(single)}>
            <g transform="translate({single.w / 2 + patGeo.l.x} {single.h / 2 + patGeo.l.y}) rotate({patGeo.l.rotation})">
              <circle r={gizmoR} fill="none" stroke="#ff8a3d" stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none" />
              <line x1="0" y1="0" x2={gizmoR} y2="0" stroke="#ff8a3d" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none" />
              <line x1="0" y1="0" x2="0" y2={-gizmoR} stroke="#ff8a3d" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none" />
              <circle r={hs * 0.5} fill="#ff8a3d" pointer-events="none" />
              <rect
                data-handle="psc"
                x={gizmoR - hs / 2}
                y={-hs / 2}
                width={hs}
                height={hs}
                fill="#ffffff"
                stroke="#ff8a3d"
                stroke-width="2"
                vector-effect="non-scaling-stroke"
                style:cursor="nesw-resize"
              />
              <circle
                data-handle="lrot"
                cx="0"
                cy={-gizmoR}
                r={hs * 0.65}
                fill="#ff8a3d"
                stroke="#ffffff"
                stroke-width="1.5"
                vector-effect="non-scaling-stroke"
                style:cursor="grab"
              />
            </g>
          </g>
        {:else if single && !editor.editingId && single.locked}
          <!-- Bloqueado: sin tiradores, solo una insignia con el candado -->
          <g transform={transformOf(single)} pointer-events="none">
            <g transform="translate({single.w - hs * 2.2} {-hs * 2.2}) scale({(hs * 1.8) / 24})">
              <rect x="-2" y="-2" width="28" height="28" rx="6" fill="#ff8a3d" />
              <rect x="5" y="11" width="14" height="9" rx="1.5" fill="none" stroke="#fff" stroke-width="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2" />
            </g>
          </g>
        {:else if single && !editor.editingId}
          <g transform={transformOf(single)}>
            {#each HANDLES as h (h.id)}
              <rect
                data-handle={h.id}
                x={((h.hx + 1) / 2) * single.w - hs / 2}
                y={((h.hy + 1) / 2) * single.h - hs / 2}
                width={hs}
                height={hs}
                fill="#ffffff"
                stroke="var(--sel)"
                stroke-width="1.5"
                vector-effect="non-scaling-stroke"
                style:cursor={h.cursor}
              />
            {/each}
            <line
              x1={single.w / 2}
              y1="0"
              x2={single.w / 2}
              y2={-rotOffset}
              stroke="var(--sel)"
              stroke-width="1.5"
              vector-effect="non-scaling-stroke"
              pointer-events="none"
            />
            <circle
              data-handle="rot"
              cx={single.w / 2}
              cy={-rotOffset}
              r={hs * 0.65}
              fill="#ffffff"
              stroke="var(--sel)"
              stroke-width="1.5"
              vector-effect="non-scaling-stroke"
              style:cursor="grab"
            />
            {#each polyPx as pt, i}
              <circle
                data-handle={`v:${i}`}
                cx={pt.x}
                cy={pt.y}
                r={hs * 0.7}
                fill="var(--sel)"
                stroke="#ffffff"
                stroke-width="1.5"
                vector-effect="non-scaling-stroke"
                style:cursor="crosshair"
              />
            {/each}
            {#if gradView}
              <g class="gradguides">
                {#if gradView.radial}
                  <circle cx={gradView.a.x} cy={gradView.a.y} r={gradView.r} fill="none" stroke="#fff" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none" />
                  <circle cx={gradView.a.x} cy={gradView.a.y} r={gradView.r} fill="none" stroke="#111" stroke-width="1.2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" pointer-events="none" />
                {/if}
                <line x1={gradView.a.x} y1={gradView.a.y} x2={gradView.b.x} y2={gradView.b.y} stroke="#fff" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none" />
                <line x1={gradView.a.x} y1={gradView.a.y} x2={gradView.b.x} y2={gradView.b.y} stroke="#111" stroke-width="1.2" vector-effect="non-scaling-stroke" pointer-events="none" />
                <circle data-handle="g1" cx={gradView.a.x} cy={gradView.a.y} r={hs * 0.8} fill={gradView.c1} stroke="#fff" stroke-width="2.5" vector-effect="non-scaling-stroke" style:cursor="move" />
                <circle data-handle="g1" cx={gradView.a.x} cy={gradView.a.y} r={hs * 0.8} fill="none" stroke="#111" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none" />
                <circle data-handle="g2" cx={gradView.b.x} cy={gradView.b.y} r={hs * 0.8} fill={gradView.c2} stroke="#fff" stroke-width="2.5" vector-effect="non-scaling-stroke" style:cursor="move" />
                <circle data-handle="g2" cx={gradView.b.x} cy={gradView.b.y} r={hs * 0.8} fill="none" stroke="#111" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none" />
              </g>
            {/if}
            {#if curvePt}
              <circle
                data-handle="tcurve"
                cx={curvePt.x}
                cy={curvePt.y}
                r={hs * 0.6}
                fill="#ffffff"
                stroke="#ff8a3d"
                stroke-width="2"
                vector-effect="non-scaling-stroke"
                style:cursor="move"
              />
            {/if}
            {#if widthPt && single.type === 'balloon'}
              <rect
                data-handle="twidth"
                x={widthPt.x - hs * 0.5}
                y={widthPt.y - hs * 0.5}
                width={hs}
                height={hs}
                fill="#ffffff"
                stroke="#ff8a3d"
                stroke-width="2"
                vector-effect="non-scaling-stroke"
                style:cursor="ew-resize"
              />
            {/if}
            {#if hasTailStyle && single.type === 'balloon'}
              <circle
                data-handle="tailo"
                cx={single.w / 2 + (single.tailOx ?? 0)}
                cy={single.h / 2 + (single.tailOy ?? 0)}
                r={hs * 0.6}
                fill="#ffffff"
                stroke="#ff8a3d"
                stroke-width="2"
                stroke-dasharray="3 2"
                vector-effect="non-scaling-stroke"
                style:cursor="move"
              />
            {/if}
            {#if showTail && single.type === 'balloon'}
              <circle
                data-handle="tail"
                cx={single.w / 2 + single.tailX}
                cy={single.h / 2 + single.tailY}
                r={hs * 0.75}
                fill="#ff8a3d"
                stroke="#ffffff"
                stroke-width="1.5"
                vector-effect="non-scaling-stroke"
                style:cursor="crosshair"
              />
            {/if}
          </g>
        {/if}

        {#if marquee}
          <rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.w}
            height={marquee.h}
            fill="rgb(47 125 246 / 0.12)"
            stroke="var(--sel)"
            stroke-width="1"
            stroke-dasharray="4 3"
            vector-effect="non-scaling-stroke"
            pointer-events="none"
          />
        {/if}
      </svg>

      <!-- Edición de texto in situ -->
      {#if edit}
        <div
          class="edit-box"
          style:left="{edit.o.x * editor.zoom}px"
          style:top="{edit.o.y * editor.zoom}px"
          style:width="{edit.o.w * editor.zoom}px"
          style:height="{edit.o.h * editor.zoom}px"
          style:transform="rotate({edit.o.rotation}deg)"
        >
          <textarea
            use:autofocus
            aria-label={t('canvas.text')}
            spellcheck="true"
            lang={editor.doc.textLang || i18n.lang}
            autocorrect="on"
            autocapitalize="sentences"
            value={edit.o.text}
            style:left="{edit.region.x * editor.zoom}px"
            style:top="{edit.region.y * editor.zoom}px"
            style:width="{edit.region.w * editor.zoom}px"
            style:height="{edit.region.h * editor.zoom}px"
            style:padding-top="{edit.padTop * editor.zoom}px"
            style:font-family={familyCss(edit.o.fontFamily)}
            style:font-size="{edit.fit.fontSize * editor.zoom}px"
            style:line-height="{edit.fit.lineHeight * editor.zoom}px"
            style:font-weight={edit.o.bold ? 700 : 400}
            style:font-style={edit.o.italic ? 'italic' : 'normal'}
            style:text-align={edit.o.vertical ? (edit.o.align === 'left' || edit.o.align === 'justify' ? 'start' : edit.o.align === 'right' ? 'end' : 'center') : edit.o.align}
            style:writing-mode={edit.o.vertical ? 'vertical-rl' : undefined}
            style:color={edit.o.color}
            oninput={(e) => {
              editor.patch([edit.o.id], { text: e.currentTarget.value }, `text:${edit.o.id}`);
              editor.textSel = { id: edit.o.id, from: e.currentTarget.selectionStart, to: e.currentTarget.selectionEnd };
            }}
            onselect={(e) => (editor.textSel = { id: edit.o.id, from: e.currentTarget.selectionStart, to: e.currentTarget.selectionEnd })}
            onkeyup={(e) => (editor.textSel = { id: edit.o.id, from: e.currentTarget.selectionStart, to: e.currentTarget.selectionEnd })}
            onmouseup={(e) => (editor.textSel = { id: edit.o.id, from: e.currentTarget.selectionStart, to: e.currentTarget.selectionEnd })}
            onblur={() => editor.stopEditing()}
            onkeydown={(e) => {
              const k = e.key.toLowerCase();
              const flag = (e.ctrlKey || e.metaKey) && !e.altKey ? (k === 'b' ? 'bold' : k === 'i' ? 'italic' : k === 'u' ? 'underline' : null) : null;
              if (flag) {
                e.preventDefault();
                editor.textSel = { id: edit.o.id, from: e.currentTarget.selectionStart, to: e.currentTarget.selectionEnd };
                editor.formatText({ toggle: flag });
                return;
              }
              if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                editor.stopEditing();
              }
            }}
          ></textarea>
        </div>
      {/if}
    </div>
  </div>
  {#if editor.cutMode}
    <div class="cutbar" role="toolbar" aria-label={t('cut.title')} onpointerdown={(e) => e.stopPropagation()}>
      <span>{t('cut.hint')}</span>
      <label>{t('cut.gap')} <input type="number" min="0" max="200" step="1" value={editor.cutGap} oninput={(e) => (editor.cutGap = Math.max(0, Number(e.currentTarget.value) || 0))} /></label>
      <button type="button" onclick={() => (editor.cutMode = false)}>{t('cut.done')}</button>
    </div>
  {/if}
</div>

<style>
  .cutbar {
    position: fixed;
    bottom: 3.2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.4rem 0.8rem;
    background: var(--panel);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 6px 18px rgb(0 0 0 / 0.3);
  }
  .cutbar input {
    width: 4rem;
  }
  .viewport {
    position: relative;
    height: 100%;
    overflow: auto;
    display: flex;
    background: var(--canvas);
    outline: none;
    touch-action: none;
  }
  .viewport.space {
    cursor: grab;
  }
  .viewport.panning {
    cursor: grabbing;
  }
  .stage {
    margin: auto;
    padding: 36px;
    flex: none;
  }
  .sheet {
    position: relative;
    background: #fff;
    box-shadow: 0 4px 22px rgb(0 0 0 / 0.35);
  }
  .page {
    position: absolute;
    inset: 0;
    display: block;
    overflow: visible;
  }
  .edit-box {
    position: absolute;
    transform-origin: center center;
    pointer-events: none;
  }
  .edit-box textarea {
    position: absolute;
    pointer-events: auto;
    margin: 0;
    border: 1px dashed var(--sel);
    background: transparent;
    outline: none;
    resize: none;
    overflow: hidden;
    user-select: text;
    -webkit-user-select: text;
    white-space: pre-wrap;
    box-sizing: border-box;
    padding-left: 0;
    padding-right: 0;
    padding-bottom: 0;
  }
</style>
