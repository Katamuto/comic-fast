<script lang="ts">
  /** Ventana de reorganización: todas las páginas en una cuadrícula; se arrastran para cambiarlas de sitio. */
  import { editor } from '../model/store.svelte';
  import { t } from '../i18n/index.svelte';
  import { pointerDrag } from '../app/resourceDrag.svelte';
  import { pageInfo } from '../model/style';
  import type { Page } from '../model/types';
  import Dialog from './Dialog.svelte';
  import PageSvg from './PageSvg.svelte';

  let size = $state(150); // ancho de cada miniatura en px
  let dragFrom = $state<number | null>(null);
  let dragOver = $state<number | null>(null);

  function close() {
    editor.showReorg = false;
  }

  function indexAt(el: Element | null): number | null {
    const v = el?.closest('[data-reorg-index]')?.getAttribute('data-reorg-index');
    return v == null ? null : Number(v);
  }

  const flag = (page: Page, key: 'noStyle' | 'noNumber' | 'noGlobals') => !!page[key];
</script>

<Dialog onclose={close} label={t('reorg.title')} width="64rem">
  <h2>{t('reorg.title')}</h2>
  <p class="intro">{t('reorg.intro')}</p>
  <label class="zoom">
    <span>{t('reorg.size')}</span>
    <input type="range" min="90" max="280" step="10" bind:value={size} />
  </label>

  <div class="grid" style:--w="{size}px">
    {#each editor.doc.pages as page, i (page.id)}
      {@const info = pageInfo(editor.doc, i)}
      <div class="cell">
        <div
          class="item"
          class:current={i === editor.pageIndex}
          class:over={dragOver === i && dragFrom !== i}
          class:dragging={dragFrom === i}
          role="button"
          tabindex="0"
          data-reorg-index={i}
          aria-label={t('pages.n', { n: i + 1 })}
          onclick={() => editor.gotoPage(i)}
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
              {page}
              assets={editor.assets}
              scope={`reorg-${page.id}`}
              style={info.style}
              pageNo={info.pageNo}
              pageCount={info.pageCount}
              globals={info.globals}
              quality="thumb"
            />
          </div>
          <span class="num">{i + 1}</span>
        </div>
        <div class="flags">
          <label title={t('reorg.styleHint')}>
            <input type="checkbox" checked={!flag(page, 'noStyle')} onchange={(e) => editor.setPageFlag(i, 'noStyle', !e.currentTarget.checked)} />
            {t('reorg.style')}
          </label>
          <label title={t('reorg.numberHint')}>
            <input type="checkbox" checked={!flag(page, 'noNumber')} onchange={(e) => editor.setPageFlag(i, 'noNumber', !e.currentTarget.checked)} />
            {t('reorg.number')}
          </label>
          <label title={t('reorg.globalsHint')}>
            <input type="checkbox" checked={!flag(page, 'noGlobals')} onchange={(e) => editor.setPageFlag(i, 'noGlobals', !e.currentTarget.checked)} />
            {t('reorg.globals')}
          </label>
        </div>
      </div>
    {/each}
  </div>

  <div class="foot"><button type="button" onclick={close}>{t('dialog.close')}</button></div>
</Dialog>

<style>
  h2 {
    margin: 0 0 0.4rem;
  }
  .intro {
    margin: 0 0 0.6rem;
    color: var(--muted);
  }
  .zoom {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    margin-bottom: 0.7rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--w), 1fr));
    gap: 0.9rem;
    max-height: 60vh;
    overflow-y: auto;
    padding: 0.4rem;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .item {
    position: relative;
    padding: 0.3rem;
    border: 2px solid transparent;
    border-radius: var(--radius);
    background: var(--panel);
    cursor: grab;
  }
  .item.current {
    border-color: var(--sel);
  }
  .item.over {
    outline: 3px dashed var(--accent);
    outline-offset: 2px;
  }
  .item.dragging {
    opacity: 0.4;
  }
  .thumb {
    width: 100%;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
    pointer-events: none;
  }
  .thumb :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
  .num {
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    min-width: 1.4rem;
    padding: 0 0.3rem;
    text-align: center;
    font-weight: 700;
    font-size: 0.8rem;
    color: #fff;
    background: rgb(0 0 0 / 0.65);
    border-radius: 0.7rem;
  }
  .flags {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
    font-size: 0.8rem;
    color: var(--muted);
  }
  .flags label {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  .foot {
    margin-top: 0.9rem;
    text-align: right;
  }
</style>
