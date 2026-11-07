<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../i18n/index.svelte';
  import { editor } from '../model/store.svelte';
  import PageSvg from './PageSvg.svelte';
  import ViewToggle from './ViewToggle.svelte';
  import { actionEntries } from '../app/actions';
  import { contextMenu } from '../app/contextMenu.svelte';
  import { pointerDrag } from '../app/resourceDrag.svelte';
  import type { Page } from '../model/types';
  import { pageInfo } from '../model/style';
  import { pageView } from '../app/viewMode.svelte';

  /** Interfaz móvil: sin botones propios (los pone el panel) y, con el teléfono en vertical, en forma de carrusel horizontal. */
  let { mobile = false }: { mobile?: boolean } = $props();

  let dragFrom = $state<number | null>(null);
  let dragOver = $state<number | null>(null);

  // En el carrusel no hay vista de lista.
  const view = $derived(mobile && pageView.value === 'list' ? 'm' : pageView.value);

  // La miniatura de la página que se está editando se redibuja con retraso (≈250 ms tras el último cambio):
  // así arrastrar o escribir no repinta dos veces cada objeto en cada movimiento.
  let snap = $state.raw<Page | null>(null);
  $effect(() => {
    const cur = editor.page;
    void JSON.stringify($state.snapshot(cur)); // suscribe a cualquier cambio de la página
    const have = untrack(() => snap);
    if (!have || have.id !== cur.id) {
      snap = $state.snapshot(cur) as Page;
      return;
    }
    const id = setTimeout(() => (snap = $state.snapshot(cur) as Page), 250);
    return () => clearTimeout(id);
  });
  const shown = (p: Page): Page => (snap && snap.id === p.id && p.id === editor.page.id ? snap : p);

  /** Clic derecho: añadir o borrar página. Sobre una miniatura, actúa respecto a esa página. */
  function onContextMenu(e: MouseEvent, i?: number) {
    e.preventDefault();
    e.stopPropagation();
    if (i !== undefined) editor.gotoPage(i);
    contextMenu.show(e.clientX, e.clientY, actionEntries(['page.add', 'page.delete', '-', 'page.noStyle', 'page.noNumber', 'page.noGlobals', 'page.reorganize']));
  }

  /** Índice de la miniatura que hay bajo un elemento (para reordenar arrastrando). */
  function indexAt(el: Element | null): number | null {
    const v = el?.closest('[data-page-index]')?.getAttribute('data-page-index');
    return v == null ? null : Number(v);
  }
</script>

<aside class="pagelist" class:mobile data-view={view} aria-label={t('pages.list')} oncontextmenu={(e) => onContextMenu(e)}>
  <div class="viewbar"><ViewToggle pref={pageView} /></div>
  <div class="items">
    {#each editor.doc.pages as page, i (page.id)}
      {@const info = pageInfo(editor.doc, i)}
      <div
        class="item"
        class:current={i === editor.pageIndex}
        class:over={dragOver === i && dragFrom !== i}
        role="button"
        tabindex="0"
        data-page-index={i}
        aria-label={t('pages.n', { n: i + 1 })}
        onclick={() => editor.gotoPage(i)}
        oncontextmenu={(e) => onContextMenu(e, i)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            editor.gotoPage(i);
          }
        }}
        use:pointerDrag={() => ({
          onStart: () => (dragFrom = i),
          onMove: (_x, _y, el) => (dragOver = indexAt(el)),
          onDrop: (_x, _y, el) => {
            const to = indexAt(el);
            if (to !== null && to !== i) editor.movePage(i, to);
          },
          onEnd: () => {
            dragFrom = null;
            dragOver = null;
          }
        })}
      >
        <div class="thumb" style:aspect-ratio="{editor.doc.pageW} / {editor.doc.pageH}">
          <PageSvg
            w={editor.doc.pageW}
            h={editor.doc.pageH}
            page={shown(page)}
            quality="thumb"
            assets={editor.assets}
            scope={`thumb-${page.id}`}
            style={info.style}
            pageNo={info.pageNo}
            pageCount={info.pageCount}
            globals={info.globals}
          />
        </div>
        <span class="num">{i + 1}</span>
        <span class="label">{t('pages.n', { n: i + 1 })}</span>
      </div>
    {/each}
  </div>

  {#if !mobile}
    <div class="actions">
      <button type="button" title={t('pages.add')} onclick={() => editor.addPage()}>＋</button>
      <button type="button" title={t('pages.duplicate')} onclick={() => editor.duplicatePage()}>⧉</button>
      <button
        type="button"
        title={t('pages.remove')}
        disabled={editor.doc.pages.length <= 1}
        onclick={() => editor.removePage()}
      >
        🗑
      </button>
    </div>
  {/if}
</aside>

<style>
  .pagelist {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--panel);
    border-right: 1px solid var(--border);
  }
  .items {
    flex: 1;
    overflow-y: auto;
    padding: 0.7692rem;
    display: flex;
    flex-direction: column;
    gap: 0.7692rem;
  }
  .viewbar {
    flex: none;
    padding: 0.3rem 0.5rem 0;
  }
  .label {
    display: none;
  }
  /* Miniaturas pequeñas: dos columnas. */
  .pagelist[data-view='s'] .items {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    align-content: start;
    gap: 0.4rem;
  }
  /* Lista: miniatura diminuta y nombre. */
  .pagelist[data-view='list'] .items {
    gap: 0.2rem;
  }
  .pagelist[data-view='list'] .item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  .pagelist[data-view='list'] .thumb {
    flex: none;
    width: 2.3rem;
  }
  .pagelist[data-view='list'] .num {
    display: none;
  }
  .pagelist[data-view='list'] .label {
    display: inline;
  }
  .item {
    position: relative;
    padding: 0.3077rem;
    border: 2px solid transparent;
    border-radius: var(--radius);
    cursor: pointer;
  }
  .item:hover {
    background: var(--panel-2);
  }
  .item.current {
    border-color: var(--sel);
  }
  .item.over {
    border-top-color: var(--accent);
  }
  .thumb {
    width: 100%;
    background: #fff;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.3);
    pointer-events: none;
  }
  .thumb :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
  .num {
    position: absolute;
    left: 0.6154rem;
    bottom: 0.6154rem;
    font-size: 0.9231rem;
    padding: 0 0.3846rem;
    border-radius: 0.6154rem;
    background: rgb(0 0 0 / 0.65);
    color: #fff;
  }
  /* Teléfono en vertical: las páginas pasan en horizontal, como un carrusel. */
  @media (orientation: portrait) {
    .pagelist.mobile .viewbar {
      display: none;
    }
    .pagelist.mobile[data-view] .items {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      overflow: auto hidden;
      gap: 0.6rem;
      padding: 0.6rem 0.8rem;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
    }
    .pagelist.mobile[data-view] .item {
      flex: none;
      display: block;
      width: 6.5rem;
      scroll-snap-align: center;
    }
    .pagelist.mobile[data-view='s'] .item {
      width: 4.6rem;
    }
    .pagelist.mobile[data-view] .thumb {
      width: 100%;
    }
    .pagelist.mobile[data-view] .num {
      display: inline;
    }
    .pagelist.mobile[data-view] .label {
      display: none;
    }
  }
  .actions {
    display: flex;
    gap: 0.4615rem;
    padding: 0.6154rem;
    border-top: 1px solid var(--border);
  }
  .actions button {
    flex: 1;
    padding: 0.3077rem 0;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 0.3077rem;
  }
</style>
