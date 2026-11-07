<script lang="ts">
  /**
   * Editor de imágenes incorporado (ventana tipo «Paint»): pinceles, borrador, selecciones
   * (rectángulo, libre y varita mágica), recortar, color a alfa y compatibilidad con transparencias.
   * La lógica de píxeles está en imageedit/pixels.ts (con pruebas); aquí solo hay interfaz.
   * Siempre guarda un recurso NUEVO: la imagen original no se modifica.
   */
  import { onMount, tick } from 'svelte';
  import { imageEditor } from '../app/imageEditor.svelte';
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import { confirmDialog } from '../io/platform';
  import Icon from './Icon.svelte';
  import { BRUSHES, brushName, loadTip, type BrushDef } from '../imageedit/brushes';
  import { i18n } from '../i18n/index.svelte';
  import {
    FingerStroke, bucketFill, newRaster, pressureFactor, type Tip,
    RasterHistory, Stroke, clearMask, clearOutside, cloneRaster, colorToAlpha, combineMask, cropMask, cropRaster,
    fillMask, invertMask, magicWand, maskBounds, maskEmpty, polygonMask, rectMask, type Mask, type Raster, type SelectMode
  } from '../imageedit/pixels';

  type Tool = 'brush' | 'eraser' | 'fill' | 'blur' | 'smudge' | 'picker' | 'rect' | 'lasso' | 'wand' | 'pan';
  const TOOLS: { id: Tool; icon: string }[] = [
    { id: 'brush', icon: 'brush' },
    { id: 'eraser', icon: 'eraser' },
    { id: 'fill', icon: 'bucket' },
    { id: 'blur', icon: 'drop' },
    { id: 'smudge', icon: 'finger' },
    { id: 'picker', icon: 'picker' },
    { id: 'rect', icon: 'selRect' },
    { id: 'lasso', icon: 'lasso' },
    { id: 'wand', icon: 'wand' },
    { id: 'pan', icon: 'hand' }
  ];

  const target = imageEditor.target!;
  const asset = target.kind === 'new' ? null : editor.assets[target.assetId];
  const prefs = imageEditor.prefs;
  const displayName = target.kind === 'new' ? t('img.newName') : (asset?.name ?? '');

  // --- Estado -----------------------------------------------------------------
  let raster: Raster | null = null;
  let imgData: ImageData | null = null;
  let mask: Mask | null = null;
  let selCanvas: HTMLCanvasElement | null = null;
  const history = new RasterHistory();

  let ready = $state(false);
  let failed = $state(false);
  let imgW = $state(0);
  let imgH = $state(0);
  let rev = $state(0); // sube con cada cambio: habilita Deshacer/Rehacer y marca «modificada»
  let modified = $state(false);
  let hasSel = $state(false);
  let zoom = $state(1);

  let tool = $state<Tool>('brush');
  let color = $state('#000000');
  let size = $state(24);
  let hardness = $state(0.8);
  let opacity = $state(1);
  let tolerance = $state(32);
  let contiguous = $state(true);
  let selMode = $state<SelectMode>('replace');
  let cropClear = $state(true);
  let a2Color = $state('#ffffff');
  let a2Tt = $state(0);
  let a2Ot = $state(0);
  let a2Pick = $state(false);
  let showA2 = $state(false);
  let strength = $state(0.5);
  let tipId = $state<string | null>(null);
  let tip = $state.raw<Tip | null>(null);
  const tipDef = $derived<BrushDef | null>(BRUSHES.find((b) => b.id === tipId) ?? null);
  $effect(() => {
    const d = tipDef;
    if (!d) {
      tip = null;
      return;
    }
    let live = true;
    void loadTip(d).then((tp) => {
      if (live) tip = tp;
    });
    return () => {
      live = false;
    };
  });
  let cursor = $state<{ x: number; y: number; on: boolean }>({ x: 0, y: 0, on: false });

  let baseEl = $state<HTMLCanvasElement>();
  let overEl = $state<HTMLCanvasElement>();
  let wrap = $state<HTMLDivElement>();

  const hexToRgb = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16) || 0,
    parseInt(h.slice(3, 5), 16) || 0,
    parseInt(h.slice(5, 7), 16) || 0
  ];
  const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

  // --- Carga y dibujo ---------------------------------------------------------
  async function load() {
    try {
      if (target.kind === 'new') {
        const w = Math.max(1, Math.min(8192, target.w));
        const h = Math.max(1, Math.min(8192, target.h));
        const r = newRaster(w, h);
        if (target.bg !== 'transparent') {
          const c = hexToRgb(target.bg);
          for (let i = 0; i < w * h; i++) r.data.set([c[0], c[1], c[2], 255], i * 4);
        }
        attach(r);
        ready = true;
        await tick();
        sizeCanvases();
        redrawAll();
        fit();
        return;
      }
      if (!asset) throw new Error('asset');
      const im = new Image();
      im.src = asset.url;
      await im.decode();
      const w = asset.w || im.naturalWidth || 1024;
      const h = asset.h || im.naturalHeight || 1024;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(im, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h);
      raster = { w, h, data: d.data };
      attach(raster);
      ready = true;
      await tick();
      sizeCanvases();
      redrawAll();
      fit();
    } catch {
      failed = true;
      editor.status = t('img.cantLoad');
    }
  }

  /** Enlaza un raster (nuevo o restaurado) con el ImageData que se pinta en pantalla. */
  function attach(r: Raster) {
    raster = r;
    imgData = new ImageData(r.data as never, r.w, r.h);
    imgW = r.w;
    imgH = r.h;
  }

  function sizeCanvases() {
    if (!baseEl || !overEl || !raster) return;
    baseEl.width = overEl.width = raster.w;
    baseEl.height = overEl.height = raster.h;
  }

  function redrawAll() {
    if (!baseEl || !imgData) return;
    baseEl.getContext('2d')!.putImageData(imgData, 0, 0);
    drawOverlay();
  }

  function redrawRect(x0: number, y0: number, x1: number, y1: number) {
    if (!baseEl || !imgData) return;
    const x = Math.max(0, x0);
    const y = Math.max(0, y0);
    const w = Math.min(imgData.width, x1 + 1) - x;
    const h = Math.min(imgData.height, y1 + 1) - y;
    if (w > 0 && h > 0) baseEl.getContext('2d')!.putImageData(imgData, 0, 0, x, y, w, h);
  }

  /** Dibuja la selección: tinte azul y borde punteado (blanco/negro alternados). */
  function buildSelection() {
    selCanvas = null;
    if (!mask || !raster || maskEmpty(mask)) return;
    const { w, h } = raster;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    const out = ctx.createImageData(w, h);
    const o = out.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w];
        const p = i * 4;
        if (edge) {
          const v = ((x + y) >> 2) & 1 ? 255 : 0;
          o[p] = o[p + 1] = o[p + 2] = v;
          o[p + 3] = 255;
        } else {
          o[p] = 40;
          o[p + 1] = 120;
          o[p + 2] = 255;
          o[p + 3] = 70;
        }
      }
    }
    ctx.putImageData(out, 0, 0);
    selCanvas = c;
  }

  function drawOverlay(live?: () => void) {
    if (!overEl || !raster) return;
    const ctx = overEl.getContext('2d')!;
    ctx.clearRect(0, 0, raster.w, raster.h);
    if (selCanvas) ctx.drawImage(selCanvas, 0, 0);
    live?.();
  }

  function setSelection(m: Mask | null) {
    mask = m && !maskEmpty(m) ? m : null;
    hasSel = mask !== null;
    buildSelection();
    drawOverlay();
  }

  // --- Zoom -------------------------------------------------------------------
  function fit() {
    if (!wrap || !raster) return;
    const z = Math.min((wrap.clientWidth - 40) / raster.w, (wrap.clientHeight - 40) / raster.h);
    zoom = Math.max(0.05, Math.min(z, 4));
  }
  const zoomBy = (f: number) => (zoom = Math.max(0.05, Math.min(32, zoom * f)));

  // --- Historial --------------------------------------------------------------
  function commit() {
    if (!raster) return;
    rev++;
    modified = true;
  }

  /** Aplica un cambio sobre toda la imagen guardando antes el estado para Deshacer. */
  function change(fn: (r: Raster) => void) {
    if (!raster) return;
    history.push(raster);
    fn(raster);
    redrawAll();
    commit();
  }

  function undo() {
    if (!raster) return;
    const prev = history.undo(raster);
    if (prev) restore(prev);
  }
  function redo() {
    if (!raster) return;
    const next = history.redo(raster);
    if (next) restore(next);
  }
  async function restore(r: Raster) {
    const sizeChanged = !raster || r.w !== raster.w || r.h !== raster.h;
    attach(r);
    if (sizeChanged) {
      mask = null;
      hasSel = false;
      selCanvas = null;
      await tick();
      sizeCanvases();
    }
    redrawAll();
    commit();
  }

  // --- Herramientas -----------------------------------------------------------
  type Pt = { x: number; y: number };
  let stroke: Stroke | FingerStroke | null = null;
  let dragStart: Pt | null = null;
  let lassoPts: Pt[] = [];
  let panFrom: { x: number; y: number; left: number; top: number } | null = null;

  function toImg(e: { clientX: number; clientY: number }): Pt {
    const r = overEl!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * raster!.w, y: ((e.clientY - r.top) / r.height) * raster!.h };
  }

  function modeOf(e: PointerEvent): SelectMode {
    return e.shiftKey ? 'add' : e.altKey ? 'sub' : selMode;
  }

  function sample(p: Pt): [number, number, number, number] | null {
    const r = raster!;
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= r.w || y >= r.h) return null;
    const i = (y * r.w + x) * 4;
    return [r.data[i], r.data[i + 1], r.data[i + 2], r.data[i + 3]];
  }

  /** Presión 0–1 de la tableta; con ratón o dedo siempre 1 (el navegador inventa valores para ellos). */
  function pressureOf(e: PointerEvent): number {
    return e.pointerType === 'pen' ? Math.max(0.02, e.pressure || 0) : 1;
  }
  const pressureSize = $derived(prefs.size ? { min: prefs.sizeMin } : null);
  const pressureOpacity = $derived(prefs.opacity ? { min: prefs.opacityMin } : null);

  function onDown(e: PointerEvent) {
    if (!raster || (e.button !== 0 && e.pointerType === 'mouse')) return;
    overEl!.setPointerCapture(e.pointerId);
    const p = toImg(e);

    if (a2Pick || tool === 'picker') {
      const c = sample(p);
      if (c) {
        const hex = rgbToHex(c[0], c[1], c[2]);
        if (a2Pick) a2Color = hex;
        else color = hex;
      }
      a2Pick = false;
      return;
    }
    switch (tool) {
      case 'brush':
      case 'eraser':
        history.push(raster);
        stroke = new Stroke(
          raster,
          {
            size, hardness, opacity, color: hexToRgb(color), erase: tool === 'eraser',
            tip, spacing: tipDef?.spacing, angleJitter: tipDef?.angleJitter, pressureSize, pressureOpacity
          },
          mask
        );
        stroke.add(p.x, p.y, pressureOf(e));
        flush();
        break;
      case 'blur':
      case 'smudge':
        history.push(raster);
        stroke = new FingerStroke(
          raster,
          { mode: tool, size, strength, hardness, pressureSize, pressureStrength: pressureOpacity },
          mask
        );
        stroke.add(p.x, p.y, pressureOf(e));
        flush();
        break;
      case 'fill': {
        const c = hexToRgb(color);
        const m = mask;
        change((r) => bucketFill(r, p.x, p.y, tolerance, contiguous, c, opacity, m));
        break;
      }
      case 'rect':
      case 'lasso':
        dragStart = p;
        lassoPts = [p];
        break;
      case 'wand': {
        const m = magicWand(raster, p.x, p.y, tolerance, contiguous);
        setSelection(combineMask(mask, m, modeOf(e)));
        break;
      }
      case 'pan':
        if (wrap) panFrom = { x: e.clientX, y: e.clientY, left: wrap.scrollLeft, top: wrap.scrollTop };
        break;
    }
  }

  function flush() {
    if (!stroke) return;
    const d = stroke.dirty;
    if (d.x1 >= d.x0) redrawRect(Math.floor(d.x0), Math.floor(d.y0), Math.ceil(d.x1), Math.ceil(d.y1));
    stroke.dirty = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  }

  function dashed(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = 1.5 / zoom;
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.strokeStyle = '#000';
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.stroke();
  }

  function onMove(e: PointerEvent) {
    if (!raster) return;
    const p = toImg(e);
    cursor = { x: p.x, y: p.y, on: true };
    if (stroke) {
      // La tableta manda más puntos de los que dibuja el navegador: se usan todos para un trazo suave.
      const evs = e.pointerType === 'pen' && e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      if (evs.length > 1) {
        for (const ce of evs) {
          const q = toImg(ce);
          stroke.add(q.x, q.y, pressureOf(ce));
        }
      } else {
        stroke.add(p.x, p.y, pressureOf(e));
      }
      flush();
    } else if (dragStart && tool === 'rect') {
      const s = dragStart;
      drawOverlay(() => {
        const ctx = overEl!.getContext('2d')!;
        ctx.beginPath();
        ctx.rect(s.x, s.y, p.x - s.x, p.y - s.y);
        dashed(ctx);
      });
    } else if (dragStart && tool === 'lasso') {
      lassoPts.push(p);
      drawOverlay(() => {
        const ctx = overEl!.getContext('2d')!;
        ctx.beginPath();
        lassoPts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        dashed(ctx);
      });
    } else if (panFrom && wrap) {
      wrap.scrollLeft = panFrom.left - (e.clientX - panFrom.x);
      wrap.scrollTop = panFrom.top - (e.clientY - panFrom.y);
    }
  }

  function onUp(e: PointerEvent) {
    if (!raster) return;
    if (stroke) {
      flush();
      stroke = null;
      commit();
    } else if (dragStart) {
      const p = toImg(e);
      const m =
        tool === 'rect'
          ? rectMask(raster.w, raster.h, dragStart.x, dragStart.y, p.x, p.y)
          : polygonMask(raster.w, raster.h, lassoPts);
      const empty = maskEmpty(m);
      // Un clic sin arrastrar quita la selección (como en otros editores).
      setSelection(empty && modeOf(e) === 'replace' ? null : combineMask(mask, m, modeOf(e)));
    }
    dragStart = null;
    lassoPts = [];
    panFrom = null;
    try {
      overEl!.releasePointerCapture(e.pointerId);
    } catch {
      /* ya liberado */
    }
  }

  // --- Acciones ---------------------------------------------------------------
  const selectAll = () => raster && setSelection(rectMask(raster.w, raster.h, 0, 0, raster.w, raster.h));
  const deselect = () => setSelection(null);
  const invert = () => raster && setSelection(mask ? invertMask(mask) : rectMask(raster.w, raster.h, 0, 0, raster.w, raster.h));

  function deleteSel() {
    const m = mask;
    if (m) change((r) => clearMask(r, m));
  }
  function fillSel() {
    const m = mask;
    if (m) change((r) => fillMask(r, m, [...hexToRgb(color), Math.round(opacity * 255)]));
  }

  function crop() {
    if (!raster || !mask) return;
    const b = maskBounds(mask, raster.w, raster.h);
    if (!b) return;
    history.push(raster);
    const before = raster;
    const m = mask;
    const cropped = cropRaster(before, b.x, b.y, b.w, b.h);
    const sub = cropMask(m, before.w, b.x, b.y, b.w, b.h);
    if (cropClear) clearOutside(cropped, sub);
    mask = null;
    hasSel = false;
    selCanvas = null;
    void restoreCropped(cropped);
  }
  async function restoreCropped(r: Raster) {
    attach(r);
    await tick();
    sizeCanvases();
    redrawAll();
    fit();
    commit();
  }

  function applyAlpha() {
    const m = mask;
    change((r) => colorToAlpha(r, hexToRgb(a2Color), m, { transparencyThreshold: a2Tt, opacityThreshold: a2Ot }));
  }

  // --- Guardar y cerrar -------------------------------------------------------
  let saving = $state(false);

  async function save(useInComic: boolean) {
    if (!baseEl || saving) return;
    saving = true;
    try {
      const blob = await new Promise<Blob | null>((res) => baseEl!.toBlob(res, 'image/png'));
      if (!blob) throw new Error('png');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const name =
        target.kind === 'new'
          ? `${t('img.newName')}-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`
          : `${(asset?.name ?? 'imagen').replace(/\.[^.]+$/, '')}-${t('img.editedSuffix')}.png`;
      const [created] = await editor.importImages([{ name, bytes, mime: 'image/png' }]);
      if (!created) throw new Error('import');
      if (useInComic && target.kind === 'new') editor.placeImage(created.id);
      else if (useInComic && (target.kind === 'object' || target.kind === 'layer')) editor.useEditedImage(target, created);
      editor.status = t('img.saved', { name: created.name });
      imageEditor.close();
    } catch {
      editor.status = t('img.saveFailed');
    } finally {
      saving = false;
    }
  }

  async function cancel() {
    if (modified && !(await confirmDialog(t('img.discard')))) return;
    imageEditor.close();
  }

  function onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && ['text', 'number'].includes((el as HTMLInputElement).type)))) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') void cancel();
    else if (mod && k === 'z' && !e.shiftKey) undo();
    else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) redo();
    else if (mod && k === 'a') selectAll();
    else if (mod && k === 'd') deselect();
    else if (e.key === 'Delete' || e.key === 'Backspace') deleteSel();
    else if (e.key === '[') size = Math.max(1, Math.round(size * 0.85));
    else if (e.key === ']') size = Math.min(400, Math.round(size / 0.85) + 1);
    else return;
    e.preventDefault();
  }

  function onWheel(e: WheelEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoomBy(Math.exp(-e.deltaY * 0.0015));
  }

  onMount(() => {
    void load();
    wrap?.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap?.removeEventListener('wheel', onWheel);
  });

  const brushLike = $derived(tool === 'brush' || tool === 'eraser');
  const fingerLike = $derived(tool === 'blur' || tool === 'smudge');
  const sizeTool = $derived(brushLike || fingerLike);
  const selTool = $derived(tool === 'rect' || tool === 'lasso' || tool === 'wand');
</script>

<svelte:window onkeydown={onKey} />

<div class="ie" role="dialog" aria-modal="true" aria-label={t('img.title')}>
  <header class="top">
    <strong class="title">{t('img.title')}</strong>
    <span class="dim">{displayName}{imgW ? ` · ${imgW} × ${imgH} px` : ''}</span>
    <span class="grow"></span>
    <button type="button" class="b" title={t('act.edit.undo')} aria-label={t('act.edit.undo')} disabled={rev < 0 || !history.canUndo} onclick={undo}><Icon name="undo" size={18} /></button>
    <button type="button" class="b" title={t('act.edit.redo')} aria-label={t('act.edit.redo')} disabled={rev < 0 || !history.canRedo} onclick={redo}><Icon name="redo" size={18} /></button>
    <button type="button" class="b" title={t('act.view.zoomOut')} aria-label={t('act.view.zoomOut')} onclick={() => zoomBy(0.8)}><Icon name="zoomOut" size={18} /></button>
    <span class="dim zoom">{Math.round(zoom * 100)}%</span>
    <button type="button" class="b" title={t('act.view.zoomIn')} aria-label={t('act.view.zoomIn')} onclick={() => zoomBy(1.25)}><Icon name="zoomIn" size={18} /></button>
    <button type="button" class="b" title={t('act.view.fit')} aria-label={t('act.view.fit')} onclick={fit}><Icon name="fit" size={18} /></button>
    <button type="button" class="txt" onclick={cancel}>{t('dialog.cancel')}</button>
    {#if target.kind !== 'asset'}
      <button type="button" class="txt" disabled={!ready || saving} onclick={() => save(true)}>{target.kind === 'new' ? t('img.savePlace') : t('img.saveUse')}</button>
    {/if}
    <button type="button" class="txt primary" disabled={!ready || saving} onclick={() => save(false)}>{t('img.save')}</button>
  </header>

  <div class="main">
    <div class="tools" role="toolbar" aria-label={t('img.title')}>
      {#each TOOLS as tl (tl.id)}
        <button type="button" class:on={tool === tl.id} title={t(`img.tool.${tl.id}`)} aria-label={t(`img.tool.${tl.id}`)} aria-pressed={tool === tl.id} onclick={() => (tool = tl.id)}>
          <Icon name={tl.icon} size={20} />
        </button>
      {/each}
      <hr />
      <button type="button" title={t('img.crop')} aria-label={t('img.crop')} disabled={!hasSel} onclick={crop}><Icon name="crop" size={20} /></button>
      <button type="button" class:on={showA2} title={t('img.c2a.title')} aria-label={t('img.c2a.title')} onclick={() => (showA2 = !showA2)}><span class="a2">α</span></button>
    </div>

    <div class="side">
      <div class="opts">
        {#if sizeTool || tool === 'fill' || tool === 'wand' || selTool}
          {#if brushLike || tool === 'fill'}
            {#if tool !== 'eraser'}
              <label class="o"><span>{t('insp.color')}</span><input type="color" bind:value={color} /></label>
            {/if}
          {/if}
          {#if sizeTool}
            <label class="o"><span>{t('img.size')} <em>{size}</em></span><input type="range" min="1" max="400" bind:value={size} /></label>
            {#if !tip || fingerLike}
              <label class="o"><span>{t('img.hardness')} <em>{Math.round(hardness * 100)}</em></span><input type="range" min="0" max="1" step="0.01" bind:value={hardness} /></label>
            {/if}
          {/if}
          {#if brushLike || tool === 'fill'}
            <label class="o"><span>{t('insp.opacity')} <em>{Math.round(opacity * 100)}</em></span><input type="range" min="0.05" max="1" step="0.01" bind:value={opacity} /></label>
          {/if}
          {#if fingerLike}
            <label class="o"><span>{t('img.strength')} <em>{Math.round(strength * 100)}</em></span><input type="range" min="0.05" max="1" step="0.01" bind:value={strength} /></label>
          {/if}
          {#if brushLike}
            <div class="tips" role="listbox" aria-label={t('img.tip')}>
              <button type="button" class:on={tipId === null} role="option" aria-selected={tipId === null} onclick={() => (tipId = null)}>
                <span class="round"></span><small>{t('img.tip.round')}</small>
              </button>
              {#each BRUSHES as b (b.id)}
                <button type="button" class:on={tipId === b.id} role="option" aria-selected={tipId === b.id} title={brushName(b, i18n.lang)} onclick={() => (tipId = b.id)}>
                  <img src={b.url} alt="" draggable="false" /><small>{brushName(b, i18n.lang)}</small>
                </button>
              {/each}
            </div>
          {/if}
          {#if sizeTool}
            <div class="tablet">
              <h4>{t('img.tablet')}</h4>
              <label class="o chk"><input type="checkbox" bind:checked={prefs.size} onchange={() => imageEditor.savePrefs()} /> {t('img.pressSize')}</label>
              {#if prefs.size}
                <label class="o"><span>{t('img.pressMin')} <em>{Math.round(prefs.sizeMin * 100)}%</em></span><input type="range" min="0" max="0.95" step="0.01" bind:value={prefs.sizeMin} onchange={() => imageEditor.savePrefs()} /></label>
              {/if}
              <label class="o chk"><input type="checkbox" bind:checked={prefs.opacity} onchange={() => imageEditor.savePrefs()} /> {fingerLike ? t('img.pressStrength') : t('img.pressOpacity')}</label>
              {#if prefs.opacity}
                <label class="o"><span>{t('img.pressMin')} <em>{Math.round(prefs.opacityMin * 100)}%</em></span><input type="range" min="0" max="0.95" step="0.01" bind:value={prefs.opacityMin} onchange={() => imageEditor.savePrefs()} /></label>
              {/if}
              <p class="hint">{t('img.tabletHint')}</p>
            </div>
          {/if}
          {#if tool === 'wand' || tool === 'fill'}
            <label class="o"><span>{t('img.tolerance')} <em>{tolerance}</em></span><input type="range" min="0" max="255" bind:value={tolerance} /></label>
            <label class="o chk"><input type="checkbox" bind:checked={contiguous} /> {t('img.contiguous')}</label>
          {/if}
          {#if selTool}
            <label class="o">
              <span>{t('img.mode')}</span>
              <select bind:value={selMode}>
                <option value="replace">{t('img.mode.replace')}</option>
                <option value="add">{t('img.mode.add')}</option>
                <option value="sub">{t('img.mode.sub')}</option>
              </select>
            </label>
            <p class="hint">{t('img.selHint')}</p>
          {/if}
        {:else if tool === 'picker'}
          <label class="o"><span>{t('insp.color')}</span><input type="color" bind:value={color} /></label>
          <p class="hint">{t('img.pickerHint')}</p>
        {:else}
          <p class="hint">{t('img.panHint')}</p>
        {/if}
      </div>

      <div class="acts">
        <button type="button" onclick={selectAll}>{t('img.selectAll')}</button>
        <button type="button" disabled={!hasSel} onclick={deselect}>{t('img.deselect')}</button>
        <button type="button" onclick={invert}>{t('img.invert')}</button>
        <button type="button" disabled={!hasSel} onclick={deleteSel}>{t('img.delete')}</button>
        <button type="button" disabled={!hasSel} onclick={fillSel}>{t('img.fill')}</button>
        <button type="button" disabled={!hasSel} onclick={crop}>{t('img.crop')}</button>
        <label class="chk"><input type="checkbox" bind:checked={cropClear} /> {t('img.cropClear')}</label>
      </div>

      {#if showA2}
        <div class="c2a">
          <h4>{t('img.c2a.title')}</h4>
          <p class="hint">{t('img.c2a.hint')}</p>
          <div class="row">
            <label class="o"><span>{t('img.c2a.color')}</span><input type="color" bind:value={a2Color} /></label>
            <button type="button" class:on={a2Pick} onclick={() => (a2Pick = !a2Pick)}>{t('img.c2a.pick')}</button>
          </div>
          <label class="o"><span>{t('img.c2a.tt')} <em>{Math.round(a2Tt * 100)}</em></span><input type="range" min="0" max="0.9" step="0.01" bind:value={a2Tt} /></label>
          <label class="o"><span>{t('img.c2a.ot')} <em>{Math.round(a2Ot * 100)}</em></span><input type="range" min="0" max="0.9" step="0.01" bind:value={a2Ot} /></label>
          <button type="button" class="primary" disabled={!ready} onclick={applyAlpha}>{t('img.c2a.apply')}</button>
        </div>
      {/if}
    </div>

    <div class="wrap" bind:this={wrap}>
      {#if failed}
        <p class="msg">{t('img.cantLoad')}</p>
      {:else if !ready}
        <p class="msg">{t('progress.working')}</p>
      {/if}
      <div class="surface" class:hidden={!ready} style:width="{imgW * zoom}px" style:height="{imgH * zoom}px">
        <canvas bind:this={baseEl} class="layer" class:pix={zoom > 2}></canvas>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <canvas
          bind:this={overEl}
          class="layer over"
          class:pix={zoom > 2}
          class:grab={tool === 'pan'}
          onpointerdown={onDown}
          onpointermove={onMove}
          onpointerup={onUp}
          onpointercancel={onUp}
          onpointerleave={() => (cursor = { ...cursor, on: false })}
        ></canvas>
        {#if sizeTool && cursor.on}
          <div
            class="ring"
            style:left="{cursor.x * zoom}px"
            style:top="{cursor.y * zoom}px"
            style:width="{size * zoom}px"
            style:height="{size * zoom}px"
          ></div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .ie {
    position: fixed;
    inset: 0;
    z-index: 400;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    color: var(--text);
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  }
  .top {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.6rem;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    white-space: nowrap;
  }
  .title {
    margin-right: 0.4rem;
  }
  .dim {
    color: var(--muted);
    font-size: 0.9rem;
  }
  .zoom {
    min-width: 2.8rem;
    text-align: center;
  }
  .grow {
    flex: 1;
  }
  .b,
  .tools button {
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    padding: 0;
    background: none;
    border: 1px solid transparent;
    border-radius: 0.4rem;
    color: var(--text);
    flex: none;
  }
  .b:hover:not(:disabled),
  .tools button:hover:not(:disabled) {
    background: var(--panel-2);
    border-color: var(--border);
  }
  .tools button.on {
    background: var(--sel);
    border-color: var(--sel);
    color: #fff;
  }
  .txt,
  .acts button,
  .c2a button {
    padding: 0.4rem 0.8rem;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    flex: none;
  }
  .primary,
  .c2a button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 700;
  }
  .main {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .tools {
    flex: none;
    width: 3.2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0;
    background: var(--panel);
    border-right: 1px solid var(--border);
    overflow-y: auto;
  }
  .tools hr {
    width: 1.8rem;
    border: 0;
    border-top: 1px solid var(--border);
    margin: 0.2rem 0;
  }
  .a2 {
    font-size: 1.3rem;
    font-weight: 700;
    line-height: 1;
  }
  .side {
    flex: none;
    width: 15rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.6rem;
    background: var(--panel);
    border-right: 1px solid var(--border);
    overflow-y: auto;
  }
  .opts,
  .acts,
  .c2a {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
  }
  .o {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.9rem;
    color: var(--muted);
  }
  .o em {
    font-style: normal;
    color: var(--text);
  }
  .o input[type='color'] {
    width: 100%;
    height: 2rem;
    padding: 0;
  }
  .chk {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
  }
  .hint {
    margin: 0;
    font-size: 0.82rem;
    color: var(--muted);
  }
  h4 {
    margin: 0.4rem 0 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }
  .wrap {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    display: flex;
    background: var(--canvas);
  }
  .msg {
    margin: auto;
    color: var(--muted);
  }
  .surface {
    position: relative;
    margin: auto;
    flex: none;
    background-color: #fff;
    background-image:
      linear-gradient(45deg, #c9c9c9 25%, transparent 25%, transparent 75%, #c9c9c9 75%),
      linear-gradient(45deg, #c9c9c9 25%, transparent 25%, transparent 75%, #c9c9c9 75%);
    background-size: 16px 16px;
    background-position: 0 0, 8px 8px;
    box-shadow: 0 2px 14px rgb(0 0 0 / 0.4);
  }
  .surface.hidden {
    display: none;
  }
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .layer.pix {
    image-rendering: pixelated;
  }
  .over {
    cursor: crosshair;
    touch-action: none;
  }
  .over.grab {
    cursor: grab;
  }
  .tips {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(3.6rem, 1fr));
    gap: 0.3rem;
    margin: 0.3rem 0;
  }
  .tips button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    padding: 0.25rem;
    background: #3a3a3a;
    border: 1px solid var(--border);
    border-radius: 0.35rem;
    color: var(--text);
  }
  .tips button.on {
    border-color: var(--accent);
    outline: 2px solid var(--accent);
  }
  .tips img,
  .tips .round {
    width: 2.4rem;
    height: 2.4rem;
    object-fit: contain;
  }
  .tips .round {
    border-radius: 50%;
    background: radial-gradient(circle, #fff 55%, transparent 72%);
  }
  .tips small {
    font-size: 0.7rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tablet {
    margin-top: 0.4rem;
    padding-top: 0.4rem;
    border-top: 1px solid var(--border);
  }
  .tablet h4 {
    margin: 0 0 0.3rem;
    font-size: 0.85rem;
  }
  .ring {
    position: absolute;
    transform: translate(-50%, -50%);
    border: 1px solid #fff;
    outline: 1px solid #000;
    border-radius: 50%;
    pointer-events: none;
  }
  /* Teléfono en vertical: las herramientas pasan a una fila y las opciones se compactan. */
  @media (orientation: portrait) and (max-width: 700px) {
    .main {
      flex-direction: column;
    }
    .tools {
      width: auto;
      flex-direction: row;
      padding: 0.3rem 0.5rem;
      border-right: 0;
      border-bottom: 1px solid var(--border);
      overflow: auto hidden;
    }
    .tools hr {
      width: 0;
      height: 1.8rem;
      border-top: 0;
      border-left: 1px solid var(--border);
      margin: 0 0.2rem;
    }
    .side {
      width: auto;
      max-height: 34%;
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }
    .wrap {
      flex: 1;
    }
  }
</style>
