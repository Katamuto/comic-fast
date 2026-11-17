<svelte:options namespace="svg" />

<script lang="ts">
  /**
   * Contenido de una página, de abajo hacia arriba:
   *   fondo → estilo «por debajo» → objetos de la página → estilo «por encima».
   * Los objetos de estilo (página de estilo, ver model/style.ts) se dibujan sin interacción.
   * En modo `styleEdit` la página que se muestra ES la de estilo: sus objetos son editables y en
   * medio aparece la referencia del contenido de las páginas.
   * Los textos admiten {n} (número de página) y {total} (cuántas páginas hay).
   */
  import type { Asset, Globals, ID, Page, PageObject, PanelObj } from '../model/types';
  import type { Side } from '../model/layout';
  import type { Spill } from '../model/style';
  import { applyGlobals, textForced } from '../model/globals';
  import { provideTextMode } from '../app/quality';
  import { pageTokens, styleSplit } from '../model/style';
  import { shiftSpans } from '../render/richText';
  import { renderPlan, withLinkedTail } from '../model/balloonLinks';
  import { t } from '../i18n/index.svelte';
  import ObjectView from './ObjectView.svelte';
  import { provideQuality } from '../app/quality';
  import type { Quality } from '../imageedit/proxy';

  interface Props {
    w: number;
    h: number;
    page: Page;
    assets: Record<ID, Asset>;
    scope: string;
    interactive?: boolean;
    editingId?: ID | null;
    /** Página de estilo que se superpone a esta página. */
    style?: Page | null;
    /** Número de esta página y total de páginas (para {n} y {total}). */
    pageNo?: number | null;
    pageCount?: number;
    /** `page` es la página de estilo en edición. */
    styleEdit?: boolean;
    /** Color de fondo que se ve bajo la página de estilo en edición. */
    underlay?: string;
    /** Qué versión de las imágenes usar: 'full' (original, exportar), 'view' (lienzo) o 'thumb' (miniaturas). */
    quality?: Quality;
    /** Parámetros globales del cómic. */
    globals?: Globals | null;
    /** Lado de la página en el libro: filtra los objetos de estilo con `only`. */
    side?: Side | null;
    /** Sangrado (px de página): el fondo se extiende esa distancia por fuera de los bordes. */
    bleed?: number;
    /** Contenido de la página vecina que se mete en esta (arte a doble página). */
    spill?: Spill | null;
  }
  let {
    w,
    h,
    page,
    assets,
    scope,
    interactive = false,
    editingId = null,
    style = null,
    pageNo = 1,
    pageCount = 1,
    styleEdit = false,
    underlay = '#ffffff',
    quality = 'full',
    globals = null,
    side = null,
    bleed = 0,
    spill = null
  }: Props = $props();
  // Los textos saben si el tamaño es forzado y si deben marcar con rojo lo que no cabe (solo en el editor).
  provideTextMode(() => ({ force: textForced(globals), warn: interactive }));
  provideQuality(() => quality);

  /** Los textos de globos y cuadros de texto con {n} / {total} sustituidos. */
  const byId = $derived(new Map<ID, PageObject>(page.objects.map((o) => [o.id, o])));
  /** Viñeta que contiene al objeto (solo si fue metido a propósito y aún existe). */
  function parentPanel(o: PageObject): PanelObj | null {
    if ((o.type !== 'balloon' && o.type !== 'text') || !o.parent) return null;
    const p = byId.get(o.parent);
    return p && p.type === 'panel' ? p : null;
  }
  const plan = $derived(styleEdit ? [] : renderPlan(page.objects));

  function tokWith(o: PageObject, ids: Map<ID, PageObject>, no: number | null, count: number, g: Globals | null): PageObject {
    if (o.type === 'balloon' && o.link?.mode === 'tail') o = withLinkedTail(o, ids);
    if ((o.type === 'text' || o.type === 'balloon') && o.text.includes('{')) {
      const text = pageTokens(o.text, no, count);
      o = { ...o, text, spans: shiftSpans(o.spans, o.text, text) };
    }
    return applyGlobals(o, g);
  }
  const tok = (o: PageObject) => tokWith(o, byId, pageNo, pageCount, globals);

  /** Vecina: sus objetos se dibujan desplazados; lo que cae fuera de esta página lo recorta el borde. */
  const spillById = $derived(new Map<ID, PageObject>((spill?.page.objects ?? []).map((o) => [o.id, o])));
  const spillPlan = $derived(spill ? renderPlan(spill.page.objects) : []);
  const spillParent = (o: PageObject): PanelObj | null => {
    if ((o.type !== 'balloon' && o.type !== 'text') || !o.parent) return null;
    const p = spillById.get(o.parent);
    return p && p.type === 'panel' ? p : null;
  };

  const split = $derived.by(() => {
    const sp = styleSplit(styleEdit ? page : style);
    if (styleEdit) return sp;
    const ok = (o: PageObject) => !o.only || o.only === side;
    return { below: sp.below.filter(ok), above: sp.above.filter(ok) };
  });
</script>

<rect x={-bleed} y={-bleed} width={w + 2 * bleed} height={h + 2 * bleed} fill={styleEdit ? underlay : page.background} />

{#if styleEdit}
  {#each split.below as obj (obj.id)}
    <ObjectView obj={tok(obj)} {assets} {scope} {interactive} hideText={obj.id === editingId} />
  {/each}
  <!-- Referencia del contenido de las páginas: no se puede seleccionar, editar ni borrar -->
  <g pointer-events="none">
    <rect
      width={w}
      height={h}
      fill="rgb(47 125 246 / 0.07)"
      stroke="rgb(47 125 246 / 0.85)"
      stroke-width="2"
      stroke-dasharray="10 7"
      vector-effect="non-scaling-stroke"
    />
    <text x={w / 2} y={h / 2} text-anchor="middle" font-family="sans-serif" font-size={Math.max(24, w * 0.04)} fill="rgb(47 125 246 / 0.55)">
      {t('style.contentRef')}
    </text>
  </g>
  {#each split.above as obj (obj.id)}
    <ObjectView obj={tok(obj)} {assets} {scope} {interactive} hideText={obj.id === editingId} />
  {/each}
{:else}
  {#if style}
    <g pointer-events="none">
      {#each split.below as obj (obj.id)}
        <ObjectView obj={tok(obj)} {assets} scope={`${scope}-st`} />
      {/each}
    </g>
  {/if}
  {#if spill}
    <g transform={`translate(${spill.dx} 0)`} pointer-events="none">
      {#each spillPlan as item (`${item.obj.id}-${item.phase}`)}
        <ObjectView
          obj={tokWith(item.obj, spillById, spill.pageNo, spill.pageCount, spill.globals)}
          {assets}
          scope={`${scope}-sp`}
          phase={item.phase}
          clipTo={spillParent(item.obj)}
        />
      {/each}
    </g>
  {/if}
  {#each plan as item (`${item.obj.id}-${item.phase}`)}
    <ObjectView obj={tok(item.obj)} {assets} {scope} {interactive} hideText={item.obj.id === editingId} phase={item.phase} clipTo={parentPanel(item.obj)} />
  {/each}
  {#if style}
    <g pointer-events="none">
      {#each split.above as obj (obj.id)}
        <ObjectView obj={tok(obj)} {assets} scope={`${scope}-st`} />
      {/each}
    </g>
  {/if}
{/if}
